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
const EDGE_CURVE_AMP = 0.6;  // max side billow / pinch from the (top-down) edge-curve slider
const EDGE_PROFILE_AMP = 0.85;  // max out-of-plane edge lift from the profile edge-curve slider
const PETAL_CUP_AMP = 0.5;   // max extra across-width cup/reflex from the Petal cup slider

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
  let w = P.W * shape * bulge;
  // CLAW / caryophyllaceous silhouette (Dianthus, Cleome, Capparis): hold a
  // narrow, near-constant STALK over the basal `clawLength` fraction of the
  // petal, then WIDEN into the taper blade above — abruptly (high SHOULDER, a
  // near-step) or gently (low SHOULDER, an hourglass/pandurate dip). The defining
  // feature is the sharpness of that shoulder, so SHOULDER drives the width of
  // the transition band, not just its presence. Layered strictly ON TOP of the
  // taper: `clawLength <= 0` skips the whole block, so w is byte-identical to the
  // pre-claw taper and every saved design renders exactly as before. The stalk is
  // a flat neck at `clawWidth` of the blade-width scale W; above the shoulder the
  // blend returns to the full taper·bulge width, so the blade shape is untouched.
  const clawLen = clamp(P.clawLength || 0, 0, 0.5);
  if (clawLen > 0) {
    const clawW = clamp(P.clawWidth != null ? P.clawWidth : 0.3, 0.05, 0.6);
    const shoulder = clamp(P.shoulder != null ? P.shoulder : 0.5, 0, 1);
    const wStalk = P.W * clawW;                       // flat narrow neck half-width
    const band = lerp(0.16, 0.01, shoulder);          // u-width of the shoulder: 0 -> gentle, 1 -> step
    const g = smootherstep(clamp((u - clawLen) / band, 0, 1));  // 0 in stalk, 1 in blade
    w = lerp(wStalk, w, g);
  }
  // LOBES: periodic margin cuts along the length — a pinnatifid outline (poppy leaf)
  // when deep, a serrated margin (rose leaflet) when shallow + frequent. Applied
  // symmetrically to both sides through the SAME width profile, so the solid blade
  // grid and its rim both follow the lobes and stay watertight. The cut envelope
  // vanishes at the base and tip so the blade stays one connected leaf. Off
  // (P.lobe falsy) leaves the outline exactly as before — petals/sepals unchanged.
  if (P.lobe) {
    const c = Math.max(1, Math.round(P.lobeCount || 5));
    const cut = Math.abs(Math.sin(u * c * Math.PI));      // c lobes along the length
    const env = Math.sin(Math.PI * u);                    // 0 at base & tip, 1 mid-blade
    w *= 1 - clamp(P.lobe, 0, 1) * 0.6 * cut * env;       // 0.6 cap keeps a printable neck at each sinus
  }
  return Math.max(0, w);
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

// The TIP FREQUENCY slider (1..40) is shared with JAGGED, where it is a literal
// tooth count. For the RUFFLE it is remapped through a power curve so the LOW end
// is finely resolved — about the first quarter of the slider covers 1..3 waves,
// where the subtle ruffles live — while the slider top caps at ~16 waves, the
// densest useful ruffle. Fractional (not rounded) so every slider step reads.
function ruffleWaveCount(P) {
  const s = clamp(P.tipFrequency || 1, 1, 40);
  return 1 + 15 * Math.pow((s - 1) / 39, 1.4);   // slider ~10 -> 3 waves, 40 -> 16 waves
}

// RUFFLED is a full-surface, differential-growth FLOUNCE, not a one-axis wave.
// A real ruffle's margin carries EXCESS length, so it cannot lie flat: it buckles
// out of the plane AND spreads sideways, the edge tracing a coil along the margin
// so it undulates in two axes at once (the fabric-ruffle spread). A second, finer
// scale frills the edge again. The whole deflection is strongest at the very edge
// and fades to nothing at the stiff mid-rib, eased in and out along the region so
// the apex never tears.
//
// Returns { dn, dz }: dn is the deflection along the spine normal (out of the
// plane), shared by both sides; dz is along the width axis (lateral spread),
// carrying sign(v) so the +Y and -Y halves stay exact mirrors.
function ruffleDisplace(u, v, P) {
  const out = { dn: 0, dz: 0 };
  if ((P.tipLength || 0) <= 1e-4) return out;
  const freq = ruffleWaveCount(P);                   // remapped: fine at the low end, caps ~16
  // Finer ruffles ride shallower: amplitude eases down with frequency so many
  // flutes read as fine fabric texture, not a row of tall spikes. TIP LENGTH is
  // the dominant amplitude control.
  const amp = (P.tipLength || 0) * RUFFLE_AMP_MAX * clamp(Math.pow(5 / freq, 0.4), 0.42, 1.3);
  const { uStart } = tipRegionRange(P);
  const uTip = 0.985;
  if (u <= uStart || u >= uTip) return out;
  const p = (u - uStart) / (uTip - uStart);          // 0 at region start -> 1 near the tip
  const RAMP = 0.14;
  const envU = smootherstep(p / RAMP) * smootherstep((1 - p) / RAMP);
  if (envU <= 1e-6) return out;
  const av = Math.abs(v);
  // Confine the flounce to the outer margin: the inner lamina stays calm (so the
  // infill doesn't spaghetti) and only the edge band gathers, waves and spreads —
  // as in a real ruffle, where the excess length lives at the hem.
  const radial = smootherstep(clamp((av - 0.42) / 0.58, 0, 1));
  const edge = radial * av;                           // extra growth concentrated at the very edge
  const k = lerp(1, 3, clamp(P.tip != null ? P.tip : 0.5, 0, 1));  // TIP SHAPE: sine -> gathered crest
  const phi = Math.PI * 2 * freq * p;
  const sgn = Math.sign(v) || 1;

  // Out-of-plane flute is the dominant, clean motion.
  const sN = Math.sin(phi);
  const waveN = Math.sign(sN) * Math.pow(Math.abs(sN), k);
  out.dn = amp * envU * radial * waveN;
  // Lateral: a steady outward GROWTH (the edge fans wider) plus a SLOW scallop at
  // half the flute frequency, so the outline undulates and spreads without the
  // lateral and out-of-plane swings tight-coiling into loops.
  out.dz = amp * envU * edge * sgn * (0.45 + 0.40 * Math.sin(phi * 0.5 + 0.6));
  // A subtle finer frill on the flute, near the very edge only.
  out.dn += amp * 0.22 * envU * edge * Math.sin(phi * 2.3 + 1.1);
  return out;
}


/* -------------------------------------------------------------------
   EDGE NOISE — organic, non-periodic crinkle layered on the petal margin, on top
   of whatever tip style is active (clean, jagged, ruffled, scallop). It is a
   surface displacement, so — like the ruffle and the cup — every rim / vein /
   infill point conforms to it automatically.
   ------------------------------------------------------------------- */

// Out-of-plane crinkle amplitude at EDGE NOISE = 1, in world units along the
// spine normal (the same axis the cup and ruffle lift along).
const EDGE_NOISE_AMP = 0.34;

// Value noise: an integer hash on a 1-D lattice, smootherstep-interpolated, then
// summed over a few octaves (fBm). This is real non-periodic noise — NOT a sine
// wave — so the crinkle never reads as a mechanical ripple.
function hashNoise(i) {
  let h = (Math.floor(i) | 0) * 374761393 + 668265263;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;          // [0, 1)
}
function valueNoise1D(x) {
  const i = Math.floor(x);
  return lerp(hashNoise(i), hashNoise(i + 1), smootherstep(x - i)) * 2 - 1;  // [-1, 1]
}
function fbm1D(x) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < 3; o++) { sum += amp * valueNoise1D(x * freq + o * 17.3); freq *= 2.03; amp *= 0.5; }
  return sum;                                              // ~[-0.9, 0.9]
}

// Crinkle lift at (u, v): concentrated at the margin (|v| -> 1), fading to the
// calm mid-rib so the infill stays legible; irregular along the edge length (u)
// with a finer cross-margin ripple so it reads as crumpled tissue rather than
// parallel corrugations. Uses |v|, so the two margins mirror (bilateral symmetry
// is preserved). EDGE NOISE SCALE sets the crinkle frequency.
function edgeNoiseDisplace(u, v, P) {
  const amt = P.edgeNoise || 0;
  if (amt <= 1e-4) return 0;
  const av = Math.abs(v);
  const band = smootherstep(clamp((av - 0.30) / 0.70, 0, 1));   // 0 at mid-rib, 1 at the edge
  if (band <= 1e-6) return 0;
  const freq = lerp(3, 40, clamp(P.edgeNoiseScale || 0, 0, 1)); // broad crinkles -> dense fine ones
  const n = fbm1D(u * freq) * 0.8 + fbm1D(av * freq * 1.7 + 5) * 0.4;
  return amt * EDGE_NOISE_AMP * band * n;
}

export function surfacePoint(u, v, P, spine) {
  const sp = sampleSpine(spine, u);
  const hw = petalHalfWidth(u, P);
  let normalLift = P.cup * hw * v * v;   // parabolic cup: 0 at mid-rib, max at edges
  // PETAL CUP: user-controlled across-width concavity, on the same axis as the
  // fixed cup and uniform along the length. +ve deepens the bowl (sides lift toward
  // the flower centre, like a rose/tulip); -ve reverses it convex (sides curl
  // down/out, like a reflexed lily). 0 leaves the surface exactly as before. Because
  // every vein / infill point is mapped through surfacePoint, they cup with it.
  if (P.petalCup) normalLift += P.petalCup * PETAL_CUP_AMP * hw * v * v;
  // Profile edge curve: an out-of-plane lift of the margins in the SAME plane the
  // centre curve bends (along the spine normal), growing from base toward the tip,
  // so the edges curl up (+) or down (-) along the length, independent of the
  // fixed cup and of the top-down width billow.
  if (P.edgeProfile) normalLift += P.edgeProfile * EDGE_PROFILE_AMP * hw * v * v * u;
  let dz = 0;
  if (P.tipStyle === 'ruffled') {
    const r = ruffleDisplace(u, v, P);   // full-surface flounce: out-of-plane + lateral spread
    normalLift += r.dn;
    dz = r.dz;
  }
  // EDGE NOISE: organic crinkle on top of ANY tip style (adds to the ruffle when
  // both are on). 0 leaves the surface untouched.
  if (P.edgeNoise) normalLift += edgeNoiseDisplace(u, v, P);
  return {
    x: sp.s + sp.nx * normalLift,
    y: sp.y + sp.ny * normalLift,
    z: v * hw + dz,
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

/* Solid blade — a filled lamina spanning the whole silhouette, sampled as a
   (uSteps+1) x (vSteps+1) grid of flattened points from base (u=0) to tip
   (u=1) and margin (v=-1) to margin (v=+1). The render layer maps each point
   onto the petal surface with its normal and stitches the quads into one
   double-sided membrane — used for SOLID sepals (a soft leaf blade instead of
   the wireframe skeleton). Reuses the same u/v flattened space as the
   silhouette and the Voronoi sheet, so it rides the identical cupped surface. */
export function buildBlade(P, opts = {}) {
  const uSteps = Math.max(2, opts.uSteps || 26);
  const vSteps = Math.max(2, opts.vSteps || 12);
  const rows = [];
  for (let i = 0; i <= uSteps; i++) {
    const u = i / uSteps;
    const X = P.L * clamp(u, 0, 0.9995);
    const hw = petalHalfWidth(u, P);
    const row = [];
    for (let j = 0; j <= vSteps; j++) {
      const v = -1 + (2 * j) / vSteps;
      row.push({ x: X, y: v * hw });
    }
    rows.push(row);
  }
  return { rows };
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
   4b. Per-petal scalar / vector FIELDS (s, d, T) — shared infill scaffolding.

   Computed ONCE per petal SHAPE in the flattened {x, y} layout space every
   infill generator already works in (x = arc length = L*u, y = lateral). This
   is prep only — nothing consumes these yet, so output is unchanged.

     s(p)  0 at base -> 1 at tip. s = x / L. The spine is constant-speed
           (|dP/du| = L), so x is already arc length and s is the normalized arc
           position with no inversion. Monotone; for thresholds / taper weighting.
     d(p)  0 on the outline -> 1 at the deepest interior point. Distance to the
           SMOOTH width envelope (petalHalfWidth: taper/tip/edgeCurve/lobe), via a
           dependency-free jump-flooding feature transform, normalized by the
           petal's own max interior depth.
     T(p)  a flow that fans with the shape — parallel to the midrib on the
           centerline, tangent to the margin near the edge. Built ANALYTICALLY
           from the outline slope at the SAME u (see petalFlowDirection), NOT from
           a nearest-boundary-point search: nearest-point tangent is degenerate on
           the midrib near the base (nearest point is the base edge) and flips
           sides across the centerline, which produced a dead patch + a seam. The
           analytic form is seam-free and exactly (0,1) on the midrib at every u.
           Deliberately NOT grad(s). If a globally smooth field is ever wanted the
           principled upgrade is a Laplace solve for a separate scalar h (Dirichlet
           h=0 base / h=1 tip, Neumann no-flux on the side margins), T =
           normalize(grad h) — Jacobi on this same grid, no dependency. Not built.

   Square grid resolved finer than the finest infill feature; bilinear sample().
   The SMOOTH envelope polyline is returned too; the ACTUAL serrated/ruffled rim
   is kept per-petal by the render layer (tooth positions are load-bearing for the
   later craspedodromous termination — they must snap to real rib geometry, not a
   d threshold).
   ------------------------------------------------------------------- */

const FIELD_LONG_AXIS = 512;      // grid cells along the petal length (square cells)
const FIELD_MAX_LAT   = 384;      // cap on cells across the width

// Analytic flow direction T at a flattened point (x = L*u longitudinal, y = v
// lateral). Returns a unit {tx, ty} in that SAME (x, y) frame — tx along the
// midrib (+x, tip-ward), ty lateral. Derived from the outline slope dW/du at u
// and signed by side; no nearest-point search, so it is seam-free and exactly
// midrib-aligned on the centerline. Verified properties (see tools/test-petal-flow.mjs):
//   - v = 0        -> exactly (tx,ty) = (1,0) at every u (midrib; no seam/patch)
//   - slope > 0    -> off-midrib arrows fan outward (below the widest point)
//   - slope = 0    -> (1,0) everywhere (vertical at the widest point)
//   - slope < 0    -> off-midrib arrows converge toward the tip (above it)
//   - T(-v,u) is the exact mirror of T(v,u)
export function petalFlowDirection(v, u, P) {
  const uu = clamp(u, 0, 1);
  const w = petalHalfWidth(uu, P);
  if (w < 1e-6) return { tx: 1, ty: 0 };            // degenerate width -> midrib
  const frac = clamp(Math.abs(v) / w, 0, 1);         // 0 midrib -> 1 margin
  const sgn = v < 0 ? -1 : 1;
  // analytic outline slope d(petalHalfWidth)/du at u (central diff on the analytic
  // envelope), clamped: halfWidth has near-infinite slope as u->0, and without the
  // clamp the bottom rows would go horizontal.
  const hh = 1e-3;
  let uA = uu - hh, uB = uu + hh, denom = 2 * hh;
  if (uA < 0) { uA = 0; denom = uB - uA; }
  if (uB > 1) { uB = 1; denom = uB - uA; }
  let slope = denom > 1e-9 ? (petalHalfWidth(uB, P) - petalHalfWidth(uA, P)) / denom : 0;
  slope = clamp(slope, -3, 3);
  // marginDir in (lateral a, longitudinal b), normalized; midrib is (0, 1)
  let ma = sgn * slope, mb = 1;
  const ml = Math.hypot(ma, mb) || 1; ma /= ml; mb /= ml;
  const k = Math.pow(frac, 1.4);
  const a = lerp(0, ma, k);                           // lateral component
  const b = lerp(1, mb, k);                           // longitudinal component
  const l = Math.hypot(a, b) || 1;
  return { tx: b / l, ty: a / l };                    // (longitudinal, lateral)
}

export function computePetalFields(P) {
  const L = Math.max(P.L, 1e-4);
  const NU = 256;                                   // envelope / boundary sampling
  const env = [];                                   // smooth +Y envelope, base->tip
  let Wmax = 1e-4;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const hw = petalHalfWidth(u, P);
    if (hw > Wmax) Wmax = hw;
    env.push({ x: L * u, y: hw });
  }
  // Boundary SITES for the d distance transform: the two side margins plus the
  // base edge. Positions only — T no longer uses a nearest-boundary tangent, so
  // the sites carry no tangent data.
  const sx = [], sy = [];
  const pushSite = (x, y) => { sx.push(x); sy.push(y); };
  for (let i = 0; i <= NU; i++) {
    pushSite(env[i].x,  env[i].y);   // +Y margin
    pushSite(env[i].x, -env[i].y);   // -Y margin (mirror)
  }
  const hw0 = petalHalfWidth(0, P);
  for (let j = 0; j <= 24; j++) pushSite(0, lerp(-hw0, hw0, j / 24));  // base edge

  // Square grid over the flattened bbox [0,L] x [-Wmax,+Wmax] (+ 1-cell pad).
  const h = L / FIELD_LONG_AXIS;
  const x0 = -h, y0 = -(Wmax + h);
  const NX = FIELD_LONG_AXIS + 2;
  const NY = Math.min(FIELD_MAX_LAT, Math.max(8, Math.round((2 * (Wmax + h)) / h) + 1));
  const N = NX * NY;
  const cellX = (i) => x0 + (i + 0.5) * h;
  const cellY = (j) => y0 + (j + 0.5) * ((2 * (Wmax + h)) / (NY - 1));   // span the padded height
  const dyc = (2 * (Wmax + h)) / (NY - 1);

  // inside mask: within the length and under the smooth envelope
  const inside = new Uint8Array(N);
  for (let j = 0; j < NY; j++) {
    const y = cellY(j);
    for (let i = 0; i < NX; i++) {
      const x = cellX(i);
      const u = x / L;
      inside[j * NX + i] = (u >= 0 && u <= 1 && Math.abs(y) <= petalHalfWidth(clamp(u, 0, 1), P)) ? 1 : 0;
    }
  }

  // Jump-flooding feature transform: each cell adopts the nearest boundary site.
  // seed[k] = index into the site arrays for the nearest boundary; -1 = unset.
  const seed = new Int32Array(N).fill(-1);
  const seedD2 = new Float64Array(N).fill(Infinity);
  const stamp = (i, j, siteIdx) => {
    if (i < 0 || i >= NX || j < 0 || j >= NY) return;
    const k = j * NX + i;
    const dx = cellX(i) - sx[siteIdx], dy = cellY(j) - sy[siteIdx];
    const dd = dx * dx + dy * dy;
    if (dd < seedD2[k]) { seedD2[k] = dd; seed[k] = siteIdx; }
  };
  for (let s = 0; s < sx.length; s++) {
    const i = Math.round((sx[s] - x0) / h - 0.5);
    const j = Math.round((sy[s] - y0) / dyc - 0.5);
    stamp(i, j, s);
  }
  let step = 1; while (step < Math.max(NX, NY)) step <<= 1; step >>= 1;
  for (; step >= 1; step >>= 1) {
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const s0 = seed[j * NX + i];
        if (s0 < 0) continue;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          stamp(i + ox * step, j + oy * step, s0);
        }
      }
    }
  }

  // Fields. s = normalized arc position; d = distance to the smooth envelope,
  // normalized by the max interior depth; T = the analytic outline-slope flow
  // (petalFlowDirection), defined everywhere so the bilinear sampler stays smooth
  // across the boundary.
  const sArr = new Float32Array(N), dArr = new Float32Array(N);
  const txArr = new Float32Array(N), tyArr = new Float32Array(N);
  let dMax = 1e-6;
  for (let k = 0; k < N; k++) if (inside[k] && seed[k] >= 0) { const dd = Math.sqrt(seedD2[k]); if (dd > dMax) dMax = dd; }
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const x = cellX(i), y = cellY(j);
      sArr[k] = clamp(x / L, 0, 1);
      const t = petalFlowDirection(y, x / L, P);
      txArr[k] = t.tx; tyArr[k] = t.ty;
      dArr[k] = (!inside[k] || seed[k] < 0) ? 0 : clamp(Math.sqrt(seedD2[k]) / dMax, 0, 1);
    }
  }

  const meta = { L, x0, y0, h, dyc, NX, NY, Wmax };
  const at = (arr, x, y) => {
    // bilinear sample in grid space (clamped to the grid)
    const fx = clamp((x - x0) / h - 0.5, 0, NX - 1.001);
    const fy = clamp((y - y0) / dyc - 0.5, 0, NY - 1.001);
    const i0 = Math.floor(fx), j0 = Math.floor(fy), tx = fx - i0, ty = fy - j0;
    const a = arr[j0 * NX + i0], b = arr[j0 * NX + i0 + 1];
    const c = arr[(j0 + 1) * NX + i0], e = arr[(j0 + 1) * NX + i0 + 1];
    return lerp(lerp(a, b, tx), lerp(c, e, tx), ty);
  };
  const sample = (x, y) => {
    const vx = at(txArr, x, y), vy = at(tyArr, x, y);
    const l = Math.hypot(vx, vy) || 1;
    return { s: at(sArr, x, y), d: at(dArr, x, y), Tx: vx / l, Ty: vy / l };
  };
  // full smooth outline polyline (base +Y edge -> tip -> back down -Y edge)
  const envelope = env.map((p) => ({ x: p.x, y: p.y })).concat(env.slice().reverse().map((p) => ({ x: p.x, y: -p.y })));
  return { meta, s: sArr, d: dArr, tx: txArr, ty: tyArr, envelope, sample };
}

// Memoized per-shape accessor. Key = the OUTLINE params the flattened fields
// depend on, plus the SURFACE-deformation params (per the invalidation spec: the
// fields recompute when the outline OR surface deforms) — and NEVER any infill
// param, so fiddling infill sliders reuses the cached fields.
const _fieldCache = new Map();
const FIELD_CACHE_MAX = 24;
export function getPetalFields(P) {
  const k = [
    P.L, P.W, P.taper, P.tip, P.edgeCurve, P.lobe || 0, P.lobeCount || 0,      // outline
    P.clawLength || 0, P.clawWidth || 0, P.shoulder || 0,                       // outline (claw)
    P.petalCup || 0, P.edgeProfile || 0, P.bloom, P.curl,                       // surface
    P.tipStyle, P.tipLength || 0, P.tipFrequency || 0,                          // ruffle (surface)
    P.edgeNoise || 0, P.edgeNoiseScale || 0,
  ].join('|');
  let f = _fieldCache.get(k);
  if (!f) {
    f = computePetalFields(P);
    _fieldCache.set(k, f);
    if (_fieldCache.size > FIELD_CACHE_MAX) _fieldCache.delete(_fieldCache.keys().next().value);
  }
  return f;
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
const VEIN_MIDRIB_TIP  = 0.32;   // strong base->tip taper so the midrib clearly dominates
// relative line-weight by branch order (0 = midrib, 1 = primary, 2 = secondary,
// 3 = tertiary, 4+ = capillary). Each generation is markedly finer than its parent
// so the hierarchy reads clearly; the deepest are hair-fine.
const VEIN_WIDTH_BY_ORDER = [1.00, 0.52, 0.32, 0.19, 0.12, 0.075];
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
  const { P, L, maxDepth, detail } = env;
  const ds = 0.07;
  const n = Math.max(2, Math.round(length / ds));
  const easeFrac = 0.28;                       // fixed gentle peel-off -> smooth forks
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
    if (y < 0.015) y = 0.015;                  // keep this half on its own side
    pts.push({ x, y });
  }
  if (pts.length < 2) return null;

  // Continuous taper ALONG this vein: from its own order's weight down toward the
  // next order's, so a vein thins over its length, not just at each junction.
  ctx.rightVeins.push({ points: pts, w0: widthOfOrder(order), w1: widthOfOrder(order + 1) });

  // Recurse into finer children — the branching hierarchy. Children spawn on the
  // OUTER part of this vein and sweep toward the margin, so the network densifies
  // outward (large cells near the midrib, fine cells toward the edge). `maxDepth`
  // (VEIN DETAIL) caps how many generations grow: low = midrib + primaries only,
  // high = down to hair-fine capillaries.
  if (order < maxDepth && length > 0.11) {
    const kids = order <= 1 ? 3 : 2;                          // primaries fan a little more
    // Higher VEIN DETAIL pushes the FIRST child EARLIER along the parent (toward its
    // base), so branching cascades through more of every vein's length — the network
    // densifies overall, not just finer near the tips. Low detail keeps children out
    // near the tip (sparse base). Applies at every generation (growBranch recurses).
    const fStart = lerp(0.58, 0.16, detail);
    for (let c = 0; c < kids; c++) {
      const f = kids === 1 ? lerp(0.7, 0.32, detail) : lerp(fStart, 0.92, c / (kids - 1));
      const { p, theta: h } = veinPointHeading(pts, f);
      const side = (c % 2 === 0) ? 1 : -1;                   // alternate sides
      const branchAngle = (50 - 5 * order + (rng() - 0.5) * 12) * D2R;
      const full = h + side * branchAngle;
      const launch = h + side * branchAngle * 0.4;           // launch near-tangent -> smooth fork
      growBranch(p, launch, full, length * (0.5 + rng() * 0.16), order + 1, env, rng, ctx);
    }
  }
  return pts;
}

export function buildVenation(P, rng, opts = {}) {
  const L = P.L;
  const primaryCount = clamp(Math.round(opts.secondaries || 6), 3, 12);  // DENSITY -> primaries off the midrib
  const maxDepth = clamp(Math.round(opts.maxDepth || 3), 1, 5);          // VEIN DETAIL -> branching generations
  const detail = clamp(opts.softness != null ? opts.softness : 0.75, 0, 1); // raw VEIN DETAIL (0..1)
  const branchStart = clamp(opts.branchStart != null ? opts.branchStart : 0.05, 0, 0.85); // first primary's u along the midrib
  const SMOOTH = 0.55;                     // FIXED gentle vein curvature (detail no longer controls smoothing)
  const env = { P, L, maxDepth, detail };

  const veins = [];
  const nodes = [];
  const ctx = { rightVeins: [], count: 0, maxCount: 1800 };

  // --- 1. MIDRIB — the single dominant vein, on the axis, thickest, tapering
  //         strongly base -> tip. Added once, never mirrored. ---
  const uBase = 0.02, uApex = 0.985, nMid = 30;
  const midrib = [];
  for (let i = 0; i <= nMid; i++) midrib.push({ x: L * lerp(uBase, uApex, i / nMid), y: 0 });
  veins.push({ points: midrib, w0: VEIN_MIDRIB_BASE, w1: VEIN_MIDRIB_TIP });
  nodes.push({ x: midrib[0].x, y: 0, width: VEIN_MIDRIB_BASE });
  nodes.push({ x: midrib[nMid].x, y: 0, width: VEIN_MIDRIB_TIP });

  // --- 2. PRIMARY veins off the midrib (pinnate). Each launches near-tangent to
  //         the axis (soft T-join) and recurses into secondary / tertiary /
  //         capillary generations (growBranch, capped by VEIN DETAIL). Stations are
  //         base-biased (a leaf fans densest off the lower midrib), the branch angle
  //         is wider near the base and shallower toward the apex, and the primary
  //         reaches farther where the petal is wide. No cross-vein ladder — the
  //         cells are the gaps the branching itself leaves, which shrink outward. ---
  const addPrimary = (u0, branchDeg) => {
    const branchHeading = branchDeg * D2R;
    const launchHeading = branchHeading * 0.45;              // soft junction on the axis
    const len = L * (0.94 - 0.5 * u0);
    const main = growBranch({ x: L * u0, y: 0 }, launchHeading, branchHeading, len, 1, env, rng, ctx);
    if (main) nodes.push({ x: L * u0, y: 0, width: widthOfOrder(1) });
  };
  // The FIRST primary's position along the midrib is a dedicated control
  // (`branchStart`, a proportion from the base), INDEPENDENT of DENSITY and VEIN
  // DETAIL: lower drops the whole primary fan down toward the base so it covers more
  // of the midrib's length. The fan spreads from there to the tip region; the count
  // is DENSITY and the sub-branch starts are VEIN DETAIL (growBranch), so moving this
  // changes neither.
  const baseU = branchStart;
  const biasExp = 1.2;                                       // fixed base-bias -> the control just translates the fan
  for (let i = 0; i < primaryCount; i++) {
    const frac = Math.pow((i + 0.5) / primaryCount, biasExp);
    const u0 = clamp(lerp(baseU, 0.94, frac) + (rng() - 0.5) * 0.02, 0.03, 0.95);
    addPrimary(u0, lerp(64, 44, u0) + (rng() - 0.5) * 6);
  }

  // --- 3. fixed gentle smoothing, then MIRROR each right-half vein to the left ---
  for (const v of ctx.rightVeins) {
    const soft = softenVein(v.points, SMOOTH);
    veins.push({ points: soft, w0: v.w0, w1: v.w1 });
    veins.push({ points: soft.map((p) => ({ x: p.x, y: -p.y })), w0: v.w0, w1: v.w1 });
  }

  return { veins, nodes };
}


/* -------------------------------------------------------------------
   5a2. SPACE COLONIZATION venation (Runions, Fuhrer, Lane, Federl,
        Rolland-Lagan & Prusinkiewicz, "Modeling and visualization of leaf
        venation patterns", SIGGRAPH 2005).

   A SIBLING to the fractal VEINS generator, not a replacement. Attraction
   SOURCES are seeded INSIDE the petal outline (so the network is generated by
   the shape, reaching the tip / future lobes for free — not clipped to it).
   Vein nodes grow from an explicit MID-RIB ROOT toward the sources; a source is
   consumed once a vein reaches within KILL DISTANCE.

     OPEN model    each source pulls only its single nearest node -> a pure tree.
     CLOSED model  a source pulls every node in its RELATIVE NEIGHBOURHOOD (no
                   other node lies in the source-node lune) -> veins converge on
                   shared sources and fuse, giving anastomoses / areoles / loops.

   Returns the SAME { veins, nodes } shape buildVenation does, so it reuses the
   whole thickening / termination / export path. Rib widths follow CANALIZATION:
   thicker where more sources drain through, i.e. width from subtree tip-count.
   Deterministic: the caller passes a seeded PRNG (mulberry32) derived from the
   design's stored seed — no Math.random on this path. Nearest-source / nearest-
   node queries use a uniform-grid spatial hash so it stays ~O(n).
   ------------------------------------------------------------------- */

const SC_GOLDEN = 137.508 * Math.PI / 180;

// uniform-grid spatial hash for 2D point queries (cell >= query radius so a 3x3
// neighbourhood covers it). Items are appended, never removed.
function scGrid(cell) {
  const map = new Map();
  const bk = (ix, iy) => ix + ',' + iy;
  return {
    add(x, y, item) {
      const k = bk(Math.floor(x / cell), Math.floor(y / cell));
      let b = map.get(k); if (!b) { b = []; map.set(k, b); } b.push(item);
    },
    // scan the (2r+1)^2 block of cells around (x,y). cell is sized to the query
    // radius (r rings) so neighbourhoods stay small even when nodes pack densely.
    near(x, y, r, fn) {
      const ix = Math.floor(x / cell), iy = Math.floor(y / cell);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        const b = map.get(bk(ix + dx, iy + dy)); if (!b) continue;
        for (const it of b) fn(it);
      }
    },
  };
}

export function buildSpaceColonization(P, rng, opts = {}) {
  const L = P.L;
  const closed = opts.mode === 'closed';
  const step  = clamp(opts.growthStep != null ? opts.growthStep : 0.04, 0.015, 0.15);
  const killD = clamp(opts.killDist   != null ? opts.killDist   : 0.055, step * 0.8, 0.2);
  const birthD = clamp(opts.birthDist != null ? opts.birthDist  : 0.09, 0.03, 0.3);
  const infl  = Math.max(2.2 * birthD, 4 * killD);         // attraction radius (a few source spacings)
  const inflRings = Math.max(1, Math.ceil(infl / killD));  // node-grid cell = killD, so query this many rings
  const fuseRings = Math.max(1, Math.ceil(step * 1.35 / killD));
  const target = Math.max(0, Math.round(opts.sourceCount != null ? opts.sourceCount : 500));
  const pattern = opts.seedPattern || 'phyllotactic';
  const fields = getPetalFields(P);
  const hw = (u) => petalHalfWidth(clamp(u, 0, 1), P);
  let Wmax = 0.01; for (let i = 0; i <= 64; i++) Wmax = Math.max(Wmax, hw(i / 64));
  // inside the blade, kept off the rim (leave a band, via d) so branches stop
  // short and the margin rib / termination owns the edge.
  const inside = (x, y) => {
    const u = x / L; if (u <= 0.012 || u >= 0.99) return false;
    if (Math.abs(y) >= hw(u)) return false;
    return fields.sample(x, y).d > 0.05;
  };

  // ---- 1. SOURCES (birth-distance rejection; d-gated; per SEED PATTERN) ----
  const srcGrid = scGrid(Math.max(birthD, 1e-3));
  const sources = [];
  const tryAdd = (x, y) => {
    if (!inside(x, y)) return false;
    let ok = true;
    srcGrid.near(x, y, 1, (o) => { if ((o.x - x) ** 2 + (o.y - y) ** 2 < birthD * birthD) ok = false; });
    if (!ok) return false;
    const s = { x, y, alive: true };
    sources.push(s); srcGrid.add(x, y, s); return true;
  };
  if (pattern === 'lattice') {
    const g = birthD;
    for (let x = g; x < L && sources.length < target; x += g) {
      for (let y = -Wmax; y <= Wmax && sources.length < target; y += g) {
        tryAdd(x + (rng() - 0.5) * g * 0.7, y + (rng() - 0.5) * g * 0.7);
      }
    }
  } else if (pattern === 'random') {
    let guard = 0;
    while (sources.length < target && guard < target * 60 + 400) {
      guard++; tryAdd(rng() * L, (rng() * 2 - 1) * Wmax);
    }
  } else {   // phyllotactic — golden-angle spiral centred at the BASE (0,0)
    const c = birthD * 0.9;               // Vogel spacing ~ birth distance
    // The golden angle itself is deterministic, so without a seeded PHASE every
    // NETWORK VARIANT (and every re-roll) would be identical. A per-seed rotation
    // (+ small radial offset) keeps the crisp golden-angle packing while making
    // each seed a distinct network.
    const phase = rng() * Math.PI * 2, n0 = 1 + Math.floor(rng() * 12);
    let n = n0, guard = 0;
    while (sources.length < target && guard < target * 40 + 400) {
      guard++;
      const r = c * Math.sqrt(n), th = n * SC_GOLDEN + phase; n++;
      if (r > L * 1.5) break;             // spiral outran the petal -> capacity reached
      tryAdd(r * Math.cos(th), r * Math.sin(th));
    }
  }

  // ---- 2. NODES: explicit mid-rib root chain (y = 0), base -> ~tip ----
  const nodes = [];
  const nodeGrid = scGrid(killD);        // small cells; queries scan `inflRings` rings
  const addNode = (x, y, parent) => {
    const i = nodes.length;
    nodes.push({ x, y, parent, children: [] });
    if (parent >= 0) nodes[parent].children.push(i);
    nodeGrid.add(x, y, i);
    return i;
  };
  let prev = addNode(0.02 * L, 0, -1);
  for (let x = 0.02 * L + step; x < 0.9 * L; x += step) prev = addNode(x, 0, prev);

  // ---- 3. GROW: attract -> add nodes (or fuse, in CLOSED) -> consume sources ----
  const links = [];                        // anastomoses: cross-edges that close loops
  const nodeBudget = opts.nodeBudget || 60000;   // hard cap (perf + safety); live uses a small one
  // enough iterations for the growth front to sweep the blade, then stop —
  // unreachable sources are abandoned rather than spun on forever.
  const maxIter = clamp(Math.ceil(L / step) * 3, 40, 500);
  for (let iter = 0; iter < maxIter; iter++) {
    if (nodes.length >= nodeBudget) break;
    const grow = new Map();                // nodeIdx -> {dx, dy}
    let anyAlive = false;
    for (const s of sources) {
      if (!s.alive) continue; anyAlive = true;
      let nearest = -1, nd = infl * infl;
      const cand = [];
      nodeGrid.near(s.x, s.y, inflRings, (ni) => {
        const n = nodes[ni];
        if (n.done || n.children.length >= 2) return;    // only nodes that can still branch grow
        const dd = (n.x - s.x) ** 2 + (n.y - s.y) ** 2;
        if (dd < infl * infl) { cand.push(ni); if (dd < nd) { nd = dd; nearest = ni; } }
      });
      if (nearest < 0) continue;
      let influenced;
      if (!closed) {
        influenced = [nearest];
      } else {
        // RELATIVE NEIGHBOUR test: v is influenced if no other candidate w is
        // closer to BOTH the source and v than v is to the source (empty lune).
        influenced = [];
        for (const vi of cand) {
          const v = nodes[vi]; const dsv = (v.x - s.x) ** 2 + (v.y - s.y) ** 2;
          let ok = true;
          for (const wi of cand) {
            if (wi === vi) continue; const w = nodes[wi];
            if ((w.x - s.x) ** 2 + (w.y - s.y) ** 2 < dsv && (w.x - v.x) ** 2 + (w.y - v.y) ** 2 < dsv) { ok = false; break; }
          }
          if (ok) influenced.push(vi);
        }
      }
      for (const vi of influenced) {
        const v = nodes[vi]; let dx = s.x - v.x, dy = s.y - v.y; const l = Math.hypot(dx, dy) || 1;
        let g = grow.get(vi); if (!g) { g = { dx: 0, dy: 0 }; grow.set(vi, g); }
        g.dx += dx / l; g.dy += dy / l;
      }
    }
    if (!anyAlive || grow.size === 0) break;
    let progressed = 0;                    // new nodes + fusions this iteration
    for (const [vi, g] of grow) {
      const l = Math.hypot(g.dx, g.dy) || 1;
      const nx = nodes[vi].x + (g.dx / l) * step, ny = nodes[vi].y + (g.dy / l) * step;
      if (!inside(nx, ny)) continue;       // a source pulling a node off the blade is unreachable
      if (closed) {
        // ANASTOMOSIS: if the advancing tip would land on an existing node of
        // ANOTHER branch, fuse to it (a cross-link) instead of forking — this is
        // what closes loops / areoles. Exclude self, parent and children so it
        // makes a real cycle, not a degenerate back-edge.
        let best = -1, bd = (step * 1.3) ** 2;
        nodeGrid.near(nx, ny, fuseRings, (ni) => {
          if (ni === vi || ni === nodes[vi].parent || nodes[ni].parent === vi) return;
          const dd = (nodes[ni].x - nx) ** 2 + (nodes[ni].y - ny) ** 2;
          if (dd < bd) { bd = dd; best = ni; }
        });
        if (best >= 0) { links.push([vi, best]); nodes[vi].done = true; progressed++; continue; }
      }
      addNode(nx, ny, vi); progressed++;
    }
    for (const s of sources) {
      if (!s.alive) continue;
      let hit = false;
      nodeGrid.near(s.x, s.y, 1, (ni) => { const n = nodes[ni]; if ((n.x - s.x) ** 2 + (n.y - s.y) ** 2 < killD * killD) hit = true; });
      if (hit) s.alive = false;
    }
    if (progressed === 0) break;            // stagnation: only unreachable sources remain
  }

  // ---- 4. WIDTHS by CANALIZATION structure -> Strahler order.
  // Subtree tip-count is the canalization signal (real veins thicken toward the
  // root because more sources drain through), but the raw radius~sqrt(tip-count)
  // rule lands the order-to-order ratio at ~0.37, reading as a THIRD grammar next
  // to the fractal veins' 0.60. So map the tip-count-derived Strahler order to
  // width stepping by exactly VEIN_ORDER_RATIO (0.6) — same ordering, veins' step.
  const ord = new Int32Array(nodes.length);
  for (let i = nodes.length - 1; i >= 0; i--) {                 // children always have a higher index
    if (!nodes[i].children.length) { ord[i] = 1; continue; }
    let mx = 0, cnt = 0;
    for (const c of nodes[i].children) { if (ord[c] > mx) { mx = ord[c]; cnt = 1; } else if (ord[c] === mx) cnt++; }
    ord[i] = mx + (cnt >= 2 ? 1 : 0);
  }
  let maxOrder = 1; for (let i = 0; i < nodes.length; i++) maxOrder = Math.max(maxOrder, ord[i]);
  const relW = (i) => Math.max(0.08, Math.pow(0.6, maxOrder - ord[i]));   // shares the fractal veins' 0.6 step

  let debugOrders = null;
  if (opts.debug) {
    const sum = {}, num = {};
    for (let i = 0; i < nodes.length; i++) { const o = ord[i]; sum[o] = (sum[o] || 0) + relW(i); num[o] = (num[o] || 0) + 1; }
    const orders = Object.keys(sum).map(Number).sort((a, b) => a - b);
    const means = orders.map((o) => sum[o] / num[o]);
    const ratios = []; for (let i = 1; i < means.length; i++) ratios.push(means[i - 1] / means[i]);
    debugOrders = { orders, means, ratioGeoMean: ratios.length ? Math.pow(ratios.reduce((s, x) => s * x, 1), 1 / ratios.length) : NaN };
  }

  // ---- trace maximal single-child runs into polylines (break at junctions) ----
  const veins = [], outNodes = [];
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].parent < 0) continue;
    const p = nodes[i].parent;
    const startsRun = nodes[p].parent < 0 || nodes[p].children.length !== 1;
    if (!startsRun) continue;
    const run = [p, i]; let cur = i;
    while (nodes[cur].children.length === 1) { cur = nodes[cur].children[0]; run.push(cur); }
    veins.push({ points: run.map((k) => ({ x: nodes[k].x, y: nodes[k].y })), w0: relW(p), w1: relW(cur) });
  }
  // anastomosis cross-links (CLOSED) as short veins — they close the loops
  for (const [a, b] of links) {
    veins.push({ points: [{ x: nodes[a].x, y: nodes[a].y }, { x: nodes[b].x, y: nodes[b].y }], w0: relW(a), w1: relW(b) });
  }
  for (let i = 0; i < nodes.length; i++) {
    const c = nodes[i].children.length;
    if (c === 0 || c >= 2 || nodes[i].parent < 0) outNodes.push({ x: nodes[i].x, y: nodes[i].y, width: relW(i) });
  }
  return { veins, nodes: outNodes, sourceCount: sources.length, nodeCount: nodes.length, linkCount: links.length, debugOrders };
}

// Memoized per (shape + seed + variant + opts) accessor — a petal shape solves a
// SMALL number of distinct networks (NETWORK VARIANTS) and cycles them across the
// whorl, so a 15-petal bloom is a few solves, not fifteen. Shape params are in the
// key, so changing the petal invalidates rather than reusing a stale network.
const _scCache = new Map();
const SC_CACHE_MAX = 24;
export function getSpaceColonization(P, seed, opts) {
  const k = [
    P.L, P.W, P.taper, P.tip, P.edgeCurve, P.lobe || 0, P.lobeCount || 0,
    P.clawLength || 0, P.clawWidth || 0, P.shoulder || 0,
    P.petalCup || 0, P.edgeProfile || 0, P.bloom, P.curl,
    P.tipStyle, P.tipLength || 0, P.tipFrequency || 0, P.edgeNoise || 0, P.edgeNoiseScale || 0,
    seed, opts.mode, opts.sourceCount, opts.birthDist, opts.killDist, opts.growthStep, opts.seedPattern,
  ].join('|');
  let v = _scCache.get(k);
  if (!v) {
    v = buildSpaceColonization(P, mulberry32(seed >>> 0), opts);
    _scCache.set(k, v);
    if (_scCache.size > SC_CACHE_MAX) _scCache.delete(_scCache.keys().next().value);
  }
  return v;
}


/* -------------------------------------------------------------------
   5b. Strand infill — a radial fan of strands from the petal base to the edge.

   Like the reference lily-pad / ginkgo leaves: every strand RADIATES from a
   single hub at the petal base and runs out to a point on the OUTER MARGIN —
   not just the apex, but the whole edge, from one side, around the tip, to the
   other side. The strand endpoints are spread by even arc-length along the
   margin, so the fan covers the rim uniformly. Between neighbouring strands the
   open negative space forms the elongated wedge / teardrop voids the reference
   shows, pinched to a point at the shared hub and widening toward the rim. The
   strands are the solid material (thick tapering tubes on the cupped surface);
   the gaps are left open.

   Controls (opts):
     count      : STRAND COUNT — number of strands fanned across the margin.
     width      : STRAND WIDTH — 0..1, strand thickness (low = thin lines / big
                  voids, high = thick strands / narrow slits).
     taper      : STRAND TAPER — extra narrowing from the hub out to the rim.
     curvature  : STRAND CURVATURE — 0 straight radial, 1 organic outward bow.

   Strands are placed symmetrically about the mid-rib (a strand at signed fan
   position q and its mirror at -q are exact reflections; an odd count puts one
   strand straight up the axis to the tip), so every petal stays bilaterally
   symmetric. Each strand ends ON the margin with its radius clamped to zero
   there, and is clamped inside the outline all along its length. Returns the
   same { veins, nodes } shape as the other infills — a polyline per strand with
   a t -> radius profile (`rad`) pre-divided by the tube radius so a strand's
   thickness follows STRAND WIDTH, not the global tube slider.
   ------------------------------------------------------------------- */
export function buildStrands(P, opts = {}) {
  const L = P.L;
  const count     = clamp(Math.round(opts.count != null ? opts.count : 20), 4, 44);
  const width     = clamp(opts.width     != null ? opts.width     : 0.5, 0, 1);
  const taper     = clamp(opts.taper     != null ? opts.taper     : 0.5, 0, 1);
  const curvature = clamp(opts.curvature != null ? opts.curvature : 0.4, 0, 1);
  const irregular = clamp(opts.irregularity != null ? opts.irregularity : 0, 0, 1);
  const seed = (opts.seed | 0);                             // per-petal variety for the irregularity
  const hw = (u) => petalHalfWidth(clamp(u, 0, 1), P);
  const tubeR = P.tubeRadius > 1e-6 ? P.tubeRadius : 0.02;   // render multiplies this back in

  const uOrigin = 0.035;               // fan hub, near the base claw
  const uStartEdge = 0.12;             // nearest-base endpoint on the margin
  const uTipEdge = 0.985;              // tip endpoint
  const uApex = 0.982;                 // apex-zone strands gather to this clean point (near the tip)
  const apexZone = 0.72;               // fan fraction above this is pulled toward the apex
  const nS = 32;                       // samples per strand
  const O = { x: L * uOrigin, y: 0 };
  const rBase = lerp(0.006, 0.05, width) * P.W;   // strand thickness scale (thin lines by default)

  // Even arc-length along the +Y margin (base -> tip) so endpoints spread evenly
  // around the rim instead of bunching where the outline is steep.
  const EM = 128;
  const edgeU = new Array(EM + 1), edgeCum = new Array(EM + 1);
  edgeCum[0] = 0;
  edgeU[0] = uStartEdge;
  let prevx = L * uStartEdge, prevy = hw(uStartEdge);
  for (let i = 1; i <= EM; i++) {
    const u = lerp(uStartEdge, uTipEdge, i / EM);
    const x = L * u, y = hw(u);
    edgeU[i] = u;
    edgeCum[i] = edgeCum[i - 1] + Math.hypot(x - prevx, y - prevy);
    prevx = x; prevy = y;
  }
  const edgeTotal = edgeCum[EM] || 1;
  const edgeUAt = (frac) => {           // arc fraction (0 = near base, 1 = tip) -> u_e
    const target = clamp(frac, 0, 1) * edgeTotal;
    let i = 1;
    while (i < EM && edgeCum[i] < target) i++;
    const f = (target - edgeCum[i - 1]) / ((edgeCum[i] - edgeCum[i - 1]) || 1);
    return lerp(edgeU[i - 1], edgeU[i], f);
  };

  const veins = [];
  const nodes = [];

  // The smallest |q| in the set: 0 when the count is odd (a strand up the axis),
  // else the innermost off-axis position. Endpoints are mapped so this innermost
  // strand lands on the tip, so the apex is always reached at any count.
  const aqMin = (count % 2 === 1) ? 0 : 1 / (count - 1);

  for (let j = 0; j < count; j++) {
    const q = count > 1 ? -1 + (2 * j) / (count - 1) : 0;   // signed fan position [-1,1], 0 = apex
    const aq = Math.abs(q);
    const side = Math.sign(q);                             // +1 / -1 margin; 0 = straight up the axis
    const frac = clamp(1 - (aq - aqMin) / (1 - aqMin), 0, 1);  // innermost -> tip(1), outer -> base(0)
    const uE = edgeUAt(frac);
    // Gather the apex-zone strands to one clean convergence point just inside the
    // tip, so their tapered tips meet neatly there instead of crossing and
    // overlapping into a tangle where the rim (and any ruffle crest) also gather.
    const cz = smootherstep(clamp((frac - apexZone) / (1 - apexZone), 0, 1));
    const E = {
      x: lerp(L * uE, L * uApex, cz),
      y: lerp(side * hw(uE), 0, cz),                       // pulled onto the axis at the apex
    };
    const dx = E.x - O.x, dy = E.y - O.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;                    // unit perpendicular
    // Outward bow, but faded to nothing for the near-axis strands (sin(pi*aq) is
    // 0 at aq=0) so they run straight to the apex instead of curving away and
    // leaving a bald wedge; the mid-fan strands carry the organic bow.
    const bowMag = curvature * 0.24 * len * Math.sign(q) * Math.sin(Math.PI * aq);

    // IRREGULARITY: vary each strand's thickness for a natural, hand-made look —
    // some strands run thicker, some thinner, with a gentle wobble along their
    // length. Keyed off the mirror-pair index (min(j, count-1-j)) so a strand and
    // its reflection get the SAME variation and the petal stays symmetric; the
    // per-petal seed keeps different petals from sharing one pattern.
    const pair = Math.min(j, count - 1 - j);
    const widthMul = 1 + irregular * (hash01(pair * 2654435761 + seed * 40503) * 2 - 1) * 0.8;
    const wobPhase = hash01(pair * 668265263 + seed * 374761393 + 17) * Math.PI * 2;
    const wobFreq = 2 + Math.floor(hash01(pair * 1103515245 + seed * 12345 + 3) * 3);   // 2..4 humps

    const pts = new Array(nS + 1);
    const rads = new Array(nS + 1);
    for (let i = 0; i <= nS; i++) {
      const s = i / nS;
      const b = bowMag * Math.sin(Math.PI * s);
      let x = O.x + dx * s + px * b;
      let y = O.y + dy * s + py * b;
      const u = clamp(x / L, 0, 1);
      const room = hw(u);
      if (Math.abs(y) > room * 0.999) y = Math.sign(y) * room * 0.999;   // keep inside the outline
      pts[i] = { x, y };
      // thin, ~uniform line with extra taper, tapering to a point where it meets
      // the rim (edgeRoom -> 0), so nothing crosses the outline.
      const wob = 1 + irregular * 0.35 * Math.sin(wobFreq * Math.PI * s + wobPhase);
      let r = rBase * Math.max(0.05, widthMul * wob) * (1 - 0.8 * taper * s);
      const edgeRoom = (room - Math.abs(y)) * 0.8;
      rads[i] = Math.max(0, Math.min(r, edgeRoom));
    }
    veins.push({ points: pts, rad: strandRadProfile(rads, tubeR) });
  }
  // welded beads cap the two convergences: the base hub and the apex gather,
  // so both ends read as clean nodes rather than a bundle of overlapping tips.
  const apexR = Math.min(rBase, hw(uApex) * 0.7);
  nodes.push({ x: O.x, y: 0, width: (rBase / tubeR) * 1.7 });
  nodes.push({ x: L * uApex, y: 0, width: (apexR / tubeR) * 1.5 });
  return { veins, nodes };
}

// Stable, well-mixed pseudo-random in [0,1) from an integer key (integer hash).
// Deterministic — used to give each strand a repeatable thickness variation.
function hash01(n) {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Turn a per-sample radius array (sampled uniformly along the strand) into a
// t -> radius function for addTube, divided by `denom` so the render layer's
// `tubeRadius * rad(t)` recovers the intended world radius.
function strandRadProfile(rads, denom) {
  const n = rads.length;
  return (t) => {
    const f = clamp(t, 0, 1) * (n - 1);
    const i0 = Math.floor(f);
    if (i0 >= n - 1) return rads[n - 1] / denom;
    return lerp(rads[i0], rads[i0 + 1], f - i0) / denom;
  };
}


/* -------------------------------------------------------------------
   5bb. Bone infill — a skeletal rib cage (Josh-Harker-style lace).

   Modelled on the reference: a central SPINE runs the length of the petal, and
   evenly-spaced RIBS branch off it in mirror-symmetric pairs, each rib sweeping
   forward (toward the tip) and curving out toward the margin — like a fish
   skeleton or a rib cage. Ribs from neighbouring stations interleave into the
   nested-arc, woven look; on the cupped surface they read as a curved basket.
   When several petals meet at the centre, their spines radiate out and the ribs
   weave together into the reference's radial lace.

   Controls (opts):
     count  : BONE COUNT  — number of rib pairs along the spine.
     width  : BONE WIDTH  — thickness of the spine and ribs.
     curve  : BONE CURVE  — 0 ribs branch straight out, 1 swept/curved to the tip.
     spread : BONE SPREAD — how far the ribs reach toward the margin.

   Ribs are mirror-symmetric (+side / -side share a station) so the petal stays
   bilaterally symmetric, and every rib is clamped inside the outline. Returns
   the same { veins, nodes } shape as the other tube infills (relative weights
   w0 -> w1, scaled by the tube slider in the render layer).
   ------------------------------------------------------------------- */
export function buildBone(P, opts = {}) {
  const L = P.L;
  const count  = clamp(Math.round(opts.count != null ? opts.count : 18), 4, 40);
  const width  = clamp(opts.width  != null ? opts.width  : 0.5, 0, 3);
  const curve  = clamp(opts.curve  != null ? opts.curve  : 0.55, -1, 1);  // +sweep to tip, -sweep to base
  const spread = clamp(opts.spread != null ? opts.spread : 0.85, 0, 1);
  const hw = (u) => petalHalfWidth(clamp(u, 0, 1), P);

  const uBase = 0.04, uTip = 0.985;
  // 0..1 runs fine -> heavy bones (the old range); 1..3 then scales that heaviest
  // bone up to 3x, so the slider's max is three times the old maximum thickness.
  const wLow = Math.min(1, width), mult = Math.max(1, width);
  const spineW = lerp(0.7, 1.7, wLow) * mult;    // spine relative weight
  const ribW   = lerp(0.26, 0.72, wLow) * mult;  // rib relative weight (thinner than the spine)
  const reach  = 0.62 + 0.32 * spread;           // rib reach as a fraction of the local half-width

  const veins = [];
  const nodes = [];

  // central spine, base -> tip, tapering
  const nSpine = 44;
  const spine = new Array(nSpine + 1);
  for (let i = 0; i <= nSpine; i++) spine[i] = { x: L * lerp(uBase, uTip, i / nSpine), y: 0 };
  veins.push({ points: spine, w0: spineW, w1: spineW * 0.34 });
  nodes.push({ x: spine[0].x, y: 0, width: spineW });
  nodes.push({ x: spine[nSpine].x, y: 0, width: spineW * 0.34 });

  // rib pairs along the spine
  const nRib = 16;
  for (let k = 0; k < count; k++) {
    const tk = (k + 0.5) / count;
    const uk = lerp(uBase + 0.015, uTip - 0.02, tk);
    // Sweep the ribs along the spine: forward toward the tip (curve > 0) or back
    // toward the base (curve < 0). The available room is measured in whichever
    // direction the sweep goes, so a rib never runs off the end of the spine.
    const room = curve >= 0 ? (uTip - uk) : (uk - uBase);
    const sweepU = curve * room * 0.8;
    const wTip = ribW * 0.22;
    for (let s = -1; s <= 1; s += 2) {
      const pts = new Array(nRib + 1);
      for (let i = 0; i <= nRib; i++) {
        const t = i / nRib;
        const uu = clamp(uk + sweepU * Math.pow(t, 1.3), uBase, uTip);
        const f = Math.sin(t * Math.PI / 2);      // lateral eases out to `reach`
        const y = s * reach * f * hw(uu);
        const cap = 0.97 * hw(uu);
        pts[i] = { x: L * uu, y: Math.abs(y) > cap ? s * cap : y };
      }
      veins.push({ points: pts, w0: ribW, w1: wTip });
    }
    nodes.push({ x: L * uk, y: 0, width: ribW * 1.05 });   // welded joint where the ribs meet the spine
  }
  return { veins, nodes };
}


/* -------------------------------------------------------------------
   5bc. Lace infill — a filigree field of scroll/swirl curls.

   Modelled on the bobbin-/needle-lace reference: a fine wire midrib and an inner
   border frame, with the two halves of the petal packed with little SPIRAL CURLS
   (scrolls) on a jittered grid, handedness alternating cell to cell so they read
   as dense, organic scrollwork. Everything is generated in the +Y half and
   MIRRORED to -Y, so each petal is bilaterally symmetric. Curls are clipped to
   sit inside the outline. Extruded as thin tubes (fine lace wire) by the render
   layer — returns the same { veins, nodes } shape as the other tube infills.

   Controls (opts):
     density : reuses the shared DENSITY slider — grid fineness (more, smaller curls).
     swirl   : LACE SWIRL — 0 loose open scrolls -> 1 tight coils.
   ------------------------------------------------------------------- */
export function buildLace(P, rng, opts = {}) {
  const L = P.L;
  const density = clamp(Math.round(opts.density || 7), 3, 12);
  const swirl = clamp(opts.swirl != null ? opts.swirl : 0.5, 0, 1);
  const hw = (u) => petalHalfWidth(clamp(u, 0, 1), P);

  const veins = [];
  const nodes = [];
  const W = 0.34;                       // fine lace-wire relative weight
  const uBase = 0.05, uTip = 0.965;
  const curlInset = 0.88;               // curl field, as a fraction of half-width
  // The border frame is the petal's edge line. With a SCALLOP edge it sits right
  // on the outline so the scallops spring straight off it (attached); otherwise
  // it is drawn a touch inside as a decorative inner frame.
  const frameInset = P.tipStyle === 'scallop' ? 0.995 : 0.9;
  const mirror = (pts) => pts.map((p) => ({ x: p.x, y: -p.y }));

  // 1. central midrib (on the axis, never mirrored)
  const nMid = 30, mid = new Array(nMid + 1);
  for (let i = 0; i <= nMid; i++) mid[i] = { x: L * lerp(uBase, uTip, i / nMid), y: 0 };
  veins.push({ points: mid, w0: W * 1.5, w1: W * 0.7 });
  nodes.push({ x: mid[0].x, y: 0, width: W * 1.5 });
  nodes.push({ x: mid[nMid].x, y: 0, width: W * 0.7 });

  // 2. border frame — the edge line (mirrored below); runs almost to the tip so it
  //    meets the scalloped margin all the way round.
  const uFrameTip = P.tipStyle === 'scallop' ? 0.99 : 0.965;
  const nF = 72, frame = new Array(nF + 1);
  for (let i = 0; i <= nF; i++) { const u = lerp(uBase, uFrameTip, i / nF); frame[i] = { x: L * u, y: frameInset * hw(u) }; }
  veins.push({ points: frame, w0: W, w1: W });
  veins.push({ points: mirror(frame), w0: W, w1: W });

  // 3. swirl field — spiral curls on a jittered grid in the +Y half, mirrored.
  const cols = density + 3;
  const rows = clamp(Math.round(density * 0.55), 2, 7);
  const turns = lerp(0.9, 2.0, swirl);
  const cellU = L * (uTip - uBase) / cols;
  const N = 16;
  for (let cx = 0; cx < cols; cx++) {
    const u = lerp(uBase + 0.02, uTip - 0.02, (cx + 0.5) / cols);
    const hwu = hw(u);
    if (hwu < 0.06) continue;
    const cellY = curlInset * hwu / rows;
    for (let ry = 0; ry < rows; ry++) {
      const centerU = clamp(u + (rng() - 0.5) * 0.5 * cellU / L, 0.02, 0.98);
      const centerY = clamp((ry + 0.5) * cellY + (rng() - 0.5) * 0.4 * cellY, 0.02, curlInset * hw(centerU));
      const size = Math.min(0.52 * cellU, 0.52 * cellY) * lerp(1.7, 1.05, swirl);
      const dir = ((cx + ry) % 2 === 0) ? 1 : -1;   // alternate handedness
      const th0 = rng() * Math.PI * 2;
      const curl = new Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const th = th0 + dir * turns * 2 * Math.PI * t;
        const r = size * (1 - 0.82 * t);            // spiral inward to a tight centre
        const x = L * centerU + r * Math.cos(th);
        const uu = clamp(x / L, 0, 1), m = 0.965 * hw(uu);
        let y = centerY + r * Math.sin(th);
        if (Math.abs(y) > m) y = Math.sign(y) * m;  // clip inside the outline
        curl[i] = { x, y };
      }
      veins.push({ points: curl, w0: W * 0.8, w1: W * 0.8 });
      veins.push({ points: mirror(curl), w0: W * 0.8, w1: W * 0.8 });
    }
  }

  return { veins, nodes };
}


/* -------------------------------------------------------------------
   5c. Voronoi infill — an alternative petal fill to the leaf venation.

   Seeds are generated ALREADY SYMMETRIC about the centre axis before the diagram
   is built — off-axis seeds live in the +Y half and are mirrored to -Y, PLUS a
   run of seeds sitting ON the axis (y = 0). The on-axis seeds own cells that
   straddle the centreline, so the pattern flows continuously across it with no
   reflect-a-finished-half seam; the mirror pairs keep the whole diagram bilaterally
   symmetric. A couple of Lloyd relaxation passes even the cells out (organic, no
   slivers), like the reference. Each cell is the petal silhouette clipped by its
   perpendicular-bisector half-planes; it becomes a solid ANNULUS (cell polygon
   outside — shared with neighbours, so the tiles fuse into one sheet — around a
   rounded hole), lofted by addSlab. SOFTNESS rounds the hole boundary (the visible
   wall) from the raw angular cell toward smoothly-flowing organic curves. Returns
   the same { veins, nodes, slabs } shape as buildVenation.
   ------------------------------------------------------------------- */

// One Voronoi cell: the silhouette clipped by the perpendicular bisector between
// seed `s` and every OTHER seed. `s` must be an element of `seeds` (skipped by
// identity). Returns the clipped polygon, or null if it collapsed.
// ANISOTROPY (a2 = anisotropy^2, y-weight in the distance metric). a2 = 1 is the
// isotropic case, byte-identical to the original. a2 > 1 weights lateral distance
// more, so cells compress across the petal and ELONGATE along its long axis — the
// bisector is computed in the weighted metric while the seeds stay in real
// coordinates (so the cell polygon comes out in real space, walls stay isotropic).
//
// APPROXIMATION (see buildVoronoi): the long axis stands in for the flow field T.
// That holds while a petal points one way. It EXPIRES the moment petals gain lobes
// or clefts — a lobed petal points in several directions at once and a single
// global axis is then badly wrong. Revisit this (per-region or per-point T metric)
// when lobed/cleft petals are added.
function voronoiCell(s, seeds, sil, a2 = 1) {
  let cell = sil;
  for (const t of seeds) {
    if (t === s) continue;
    cell = clipHalfPlane(cell, 2 * (t.x - s.x), 2 * a2 * (t.y - s.y),
      (s.x * s.x + a2 * s.y * s.y) - (t.x * t.x + a2 * t.y * t.y));
    if (cell.length < 3) return null;
  }
  return cell;
}

// Area (not vertex-average) centroid of a simple polygon; used for Lloyd
// relaxation and as the annulus centre. Falls back to the vertex mean if the
// polygon is degenerate (near-zero area).
function polyCentroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const cr = p.x * q.y - q.x * p.y;
    a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let vx = 0, vy = 0; for (const p of poly) { vx += p.x; vy += p.y; }
    return { x: vx / poly.length, y: vy / poly.length };
  }
  a *= 0.5;
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

const mirrorY = (p) => ({ x: p.x, y: -p.y });

// Signed area of a simple polygon (for the minimum-cell-size floor).
function polyArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p.x * q.y - q.x * p.y; }
  return a * 0.5;
}

// "Spine" score of a cell: how strongly it is elongated ALONG the flow T and how
// LONG it is — a long, T-aligned cell reads like a rib spine and earns extra wall
// weight, mirroring how VEINS thickens its midrib/primaries. 0 = round or short,
// 1 = a long strut running with the flow.
function spineScore(poly, c, T, L) {
  const tx = T.tx, ty = T.ty, px = -ty, py = tx;   // flow dir + perpendicular
  let tMin = Infinity, tMax = -Infinity, pMin = Infinity, pMax = -Infinity;
  for (const q of poly) {
    const dx = q.x - c.x, dy = q.y - c.y;
    const at = dx * tx + dy * ty, ap = dx * px + dy * py;
    if (at < tMin) tMin = at; if (at > tMax) tMax = at;
    if (ap < pMin) pMin = ap; if (ap > pMax) pMax = ap;
  }
  const spanT = tMax - tMin, spanP = (pMax - pMin) || 1e-6;
  const elong = clamp((spanT / spanP - 1) / 2, 0, 1);        // >= 2x elongated -> 1
  const longEnough = clamp(spanT / (0.2 * L), 0, 1);          // and a real fraction of the blade
  return elong * longEnough;
}

export function buildVoronoi(P, rng, opts = {}) {
  const density = clamp(Math.round(opts.density || 7), 3, 12);
  const perHalf = Math.round(lerp(9, 34, (density - 3) / 9));   // off-axis seeds in the +Y half
  const sil = buildSilhouette(P, 72);
  const margin = (u) => petalHalfWidth(clamp(u, 0, 1), P);
  const xLo = P.L * 0.05, xHi = P.L * 0.96;
  const minHW = 0.06;
  const axisGap = 0.05 * P.W;                       // min |y| for an off-axis seed

  // Shared-grammar controls — every one defaults to the ORIGINAL isotropic/uniform
  // look, so a design that omits them is byte-identical.
  const aniso     = clamp(opts.anisotropy != null ? opts.anisotropy : 1, 1, 4);
  const a2        = aniso * aniso;                       // y-weight in the Voronoi metric
  const cellLaw   = clamp(opts.cellDensityLaw != null ? opts.cellDensityLaw : 0, 0, 1);
  const wHier     = clamp(opts.weightHierarchy != null ? opts.weightHierarchy : 0, 0, 1);
  const wFall     = clamp(opts.weightFalloff != null ? opts.weightFalloff : 1.5, 0, 4);
  const slabTaper = clamp(opts.slabTaper != null ? opts.slabTaper : 0, 0, 1);
  let Wmax = minHW;
  for (let i = 0; i <= 100; i++) Wmax = Math.max(Wmax, margin(i / 100));
  // CELL DENSITY LAW: bias best-candidate spacing toward the LOCAL blade width so
  // cells shrink as the blade narrows (constant count across, no tip crowding).
  // law = 0 uses a constant reference width -> identical selection to the original.
  const spaceW = (x) => { const w = lerp(Wmax, margin(x / P.L), cellLaw); return w > 1e-3 ? w : 1e-3; };

  // --- SEEDS ON THE AXIS: best-candidate 1-D sampling along the centreline. Their
  //     cells straddle y = 0, so the pattern is continuous across it (no seam). ---
  const nAxis = clamp(Math.round(perHalf * 0.4), 2, 14);
  const axis = [];
  { let guard = 0;
    while (axis.length < nAxis && guard < nAxis * 400) {
      let best = null, bestD = -1;
      for (let c = 0; c < 12; c++) {
        guard++;
        const x = lerp(xLo, xHi, rng());
        if (margin(x / P.L) < minHW) continue;
        let d = 1e9;
        for (const s of axis) d = Math.min(d, (s.x - x) ** 2);
        const score = d / (spaceW(x) ** 2);          // width-scaled spacing (law=0: constant -> same pick)
        if (score > bestD) { bestD = score; best = { x, y: 0 }; }
      }
      if (best) axis.push(best);
    }
  }
  // --- OFF-AXIS +Y SEEDS: blue-noise, kept clear of the axis seeds (distance is
  //     measured to axis seeds too, whose mirror is themselves). Mirrored to -Y. ---
  const half = [];
  { let guard = 0;
    while (half.length < perHalf && guard < perHalf * 800) {
      let best = null, bestD = -1;
      for (let c = 0; c < 10; c++) {
        guard++;
        const x = lerp(xLo, xHi, rng());
        const hw = margin(x / P.L);
        if (hw < minHW) continue;
        const y = lerp(Math.max(axisGap, 0.02 * hw + 0.015), hw * 0.95, rng());
        if (!pointInPoly(x, y, sil)) continue;
        let d = 1e9;
        for (const s of half) d = Math.min(d, (s.x - x) ** 2 + (s.y - y) ** 2);
        for (const s of axis) d = Math.min(d, (s.x - x) ** 2 + y * y);
        const score = d / (spaceW(x) ** 2);          // width-scaled spacing (law=0: constant -> same pick)
        if (score > bestD) { bestD = score; best = { x, y }; }
      }
      if (best) half.push(best);
    }
  }

  // Assemble the full symmetric seed set: axis seeds once, each +Y seed with a
  // fresh -Y twin. The +Y / axis objects are the SAME references voronoiCell skips.
  const fullSeeds = () => {
    const arr = [];
    for (const s of axis) arr.push(s);
    for (const s of half) { arr.push(s); arr.push({ x: s.x, y: -s.y }); }
    return arr;
  };

  // --- CONSTRAINED LLOYD RELAXATION (VORONOI ITERATIONS).
  //     lloyd = 0 reproduces the LEGACY behaviour EXACTLY: one pass clipped to the
  //     raw silhouette (outer cells sliced by the outline). lloyd >= 1 clips every
  //     cell to the INWARD-OFFSET outline and relaxes site -> centroid that many
  //     times, so outer cells align their edges with the margin band instead of
  //     being severed by the rim. Symmetry-preserving — axis seeds pinned to y = 0,
  //     +Y seeds stay off-axis, -Y twins rebuilt from the +Y set each pass. ---
  const lloyd = clamp(Math.round(opts.lloyd != null ? opts.lloyd : 0), 0, 20);
  const clipPoly = lloyd === 0 ? sil : offsetPolygonInward(sil, VORONOI_MARGIN_INSET * 2 * Wmax);
  const passes = lloyd === 0 ? 1 : lloyd;
  for (let iter = 0; iter < passes; iter++) {
    const seeds = fullSeeds();
    for (const s of axis) {
      const cell = voronoiCell(s, seeds, clipPoly, a2);
      if (cell) { const c = polyCentroid(cell); s.x = clamp(c.x, xLo, xHi); s.y = 0; }
    }
    for (const s of half) {
      const cell = voronoiCell(s, seeds, clipPoly, a2);
      if (cell) { const c = polyCentroid(cell); s.x = clamp(c.x, xLo, xHi); s.y = Math.max(axisGap, c.y); }
    }
  }

  // --- MINIMUM CELL SIZE floor: cull seeds whose cell is thinner than a few rib
  //     widths (equivalent-circle diameter < minCellSize), so the density law /
  //     anisotropy can't emit fragile slivers — the region is absorbed by neighbours
  //     when the final cells re-solve. Off unless one of those features is on, so the
  //     default look is untouched. Mirrored seeds are culled with their +Y twin. ---
  let culled = 0;
  const minCell = opts.minCellSize || 0;
  if (minCell > 0 && (cellLaw > 0 || aniso > 1)) {
    const tooSmall = (s, seeds) => {
      const cell = voronoiCell(s, seeds, clipPoly, a2);
      if (!cell) return true;
      return 2 * Math.sqrt(Math.abs(polyArea(cell)) / Math.PI) < minCell;
    };
    for (let i = half.length - 1; i >= 0; i--) if (tooSmall(half[i], fullSeeds())) { half.splice(i, 1); culled++; }
    for (let i = axis.length - 1; i >= 0; i--) if (axis.length > 1 && tooSmall(axis[i], fullSeeds())) { axis.splice(i, 1); culled++; }
  }

  // --- SOLVE + BUILD ANNULI with the shared WEIGHT grammar. Each cell earns a wall
  //     weight from its base->tip position (w = (1-s)^k) and a spine boost (long,
  //     flow-aligned cells), stepped in the SAME 0.6 ratio VEINS uses; and a slab
  //     thickness taper by s. Both blend from the uniform default. Axis cells are
  //     self-symmetric (built once); each +Y cell gets its exact -Y mirror. ---
  const softness = clamp(opts.softness != null ? opts.softness : 0, 0, 5);
  const seeds = fullSeeds();
  const slabs = [];
  const emit = (cell, mirror) => {
    const c = polyCentroid(cell);
    const s = clamp(c.x / P.L, 0, 1);
    const T = petalFlowDirection(c.y, s, P);
    const raw = Math.max(Math.pow(1 - s, wFall), spineScore(cell, c, T, P.L));
    const tier = Math.round((1 - raw) * 3);                    // 0..3 discrete orders
    const wallMul = lerp(1, Math.pow(0.6, tier), wHier);       // shares the vein step size
    const thickMul = lerp(1, 1 - 0.7 * s, slabTaper);          // base thick -> tip thin (out-of-plane)
    const ann = cellAnnulus(cell, softness, wallMul);
    if (!ann) return;
    ann.thickMul = thickMul;
    slabs.push(ann);
    if (mirror) {
      slabs.push({ outer: ann.outer.map(mirrorY).reverse(), inner: ann.inner.map(mirrorY).reverse(), thickMul });
    }
  };
  for (const s of axis) { const cell = voronoiCell(s, seeds, clipPoly, a2); if (cell) emit(cell, false); }
  for (const s of half) { const cell = voronoiCell(s, seeds, clipPoly, a2); if (cell) emit(cell, true); }
  return { veins: [], nodes: [], slabs, culled };
}

// Build one cell's ANNULUS for the perforated sheet. The OUTER loop walks the cell
// polygon's EXACT edges (subdivided) — two neighbours subdivide their shared edge
// identically, so their outer boundaries coincide and the tiles fuse flush. That
// wall is interior/invisible; the visible wall is the HOLE rim (+ the petal edge).
// The INNER loop is the hole: the cell offset inward by a roughly CONSTANT margin
// (so the strut is a uniform width, not bulging at corners / pinching at edges),
// with its corners then rounded by SOFTNESS into smoothly-flowing curves. addSlab
// pairs outer[k] with inner[k] on the same ray from the centroid, so both are
// built radially from it.
function cellAnnulus(poly, softness, wallMul = 1) {
  const c = polyCentroid(poly);
  const cx = c.x, cy = c.y;
  const SUB = 5;                                    // samples per cell edge
  const outer = [], ux = [], uy = [], rawR = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    for (let s = 0; s < SUB; s++) {
      const t = s / SUB;
      const ox = lerp(A.x, B.x, t), oy = lerp(A.y, B.y, t);     // on the exact cell edge
      const dx = ox - cx, dy = oy - cy;
      const r = Math.hypot(dx, dy) || 1e-6;
      outer.push({ x: ox, y: oy });
      ux.push(dx / r); uy.push(dy / r); rawR.push(r);
    }
  }
  const M = outer.length;
  if (M < 3) return null;
  // Uniform strut: offset the boundary inward by a constant margin (a fraction of
  // the cell's mean radius). Floored so thin cells keep a hole.
  let mean = 0; for (const r of rawR) mean += r; mean /= M;
  const strut = mean * 0.22 * wallMul;              // wallMul (WEIGHT HIERARCHY) tapers walls base->tip / off-spine; 1 = the open, airy reference look
  let R = new Array(M);
  for (let k = 0; k < M; k++) R[k] = Math.max(rawR[k] - strut, 0.16 * mean);
  // SOFTNESS rounds the hole's corners by circularly smoothing its radial profile:
  // 0 passes = the raw (offset) angular cell; more passes = smoothly-flowing curves
  // with no sharp vertices (the reference look). The broad cell shape / elongation
  // survives because only the high-frequency corner spikes are averaged away.
  const passes = Math.round(clamp(softness, 0, 5) * 1.8);       // 0 .. ~9
  for (let p = 0; p < passes; p++) {
    const S = new Array(M);
    for (let k = 0; k < M; k++) S[k] = 0.25 * R[(k - 1 + M) % M] + 0.5 * R[k] + 0.25 * R[(k + 1) % M];
    R = S;
  }
  const inner = new Array(M);
  for (let k = 0; k < M; k++) {
    const hr = Math.min(R[k], rawR[k] * 0.9);       // keep the hole strictly inside the cell
    inner[k] = { x: cx + ux[k] * hr, y: cy + uy[k] * hr };
  }
  return { outer, inner };
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

// Inward offset of a simple polygon by `delta`, moving each vertex along its
// interior bisector (miter, centroid-oriented — stable for the convex-ish petal
// outline). Gives constrained Lloyd a margin band so outer cells stop short of the
// rim instead of being sliced by it.
const VORONOI_MARGIN_INSET = 0.05;   // margin band = 5% of blade width
function offsetPolygonInward(poly, delta) {
  const n = poly.length;
  if (n < 3 || delta <= 0) return poly.slice();
  const c = polyCentroid(poly);
  const unit = (ax, ay) => { const l = Math.hypot(ax, ay) || 1; return { x: ax / l, y: ay / l }; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n], cur = poly[i], next = poly[(i + 1) % n];
    const e1 = unit(cur.x - prev.x, cur.y - prev.y);
    const e2 = unit(next.x - cur.x, next.y - cur.y);
    let n1 = { x: -e1.y, y: e1.x }, n2 = { x: -e2.y, y: e2.x };
    if ((c.x - cur.x) * n1.x + (c.y - cur.y) * n1.y < 0) { n1.x = -n1.x; n1.y = -n1.y; }
    if ((c.x - cur.x) * n2.x + (c.y - cur.y) * n2.y < 0) { n2.x = -n2.x; n2.y = -n2.y; }
    let bx = n1.x + n2.x, by = n1.y + n2.y;
    const bl = Math.hypot(bx, by) || 1;
    out.push({ x: cur.x + (bx / bl) * delta, y: cur.y + (by / bl) * delta });
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
   5e. Rib graph + EDGE TERMINATION.

   The infill polylines (veins, bone ribs) form a TREE: branch tips fade in the
   blade interior, and the margin rib is a SEPARATE closed hoop (built in the
   render layer) with no connection to them. So the framework has almost no
   closed cycles — little shear stiffness — and the fine free ends are the first
   thing to snap when printed.

   buildRibGraph welds the polyline vertices into an explicit node/edge graph so
   the connectivity is measurable (cyclomatic number E - V + C, free-end count).
   terminateEdges consumes the vein-only graph to CLOSE the network onto the
   margin:
     MEET  free tips within CAPTURE DISTANCE of the margin extend to meet the
           margin rib (craspedodromous). Simpler, spikier.
     LOOP  neighbouring near-margin tips turn and fuse to EACH OTHER into arcades
           before touching the rim (brochidodromous). Closes cycles, so it is the
           structurally superior mode.
   Both return EXTRA flattened polylines (+ weld nodes) in the SAME shape as the
   infill veins, so the render layer thickens them through the identical
   tube/ribbon/bead path and the union stays watertight. v1 captures onto the
   SMOOTH outline; the actual serrated/ruffled rim (tooth positions) is left for a
   later real-tooth pass — MEET on a serrated petal will therefore approximate the
   teeth; LOOP never touches the rim so it is unaffected. Symmetry is preserved by
   generating +Y captures and mirroring them to -Y (axis tips meet the apex). */

const RIB_WELD_EPS = 0.09;   // flattened-space weld radius (a hair over the coarsest
                             // polyline sampling, so a branch root reliably reaches
                             // its parent chain; still far below the blade size).

// Weld the polyline vertices into an explicit graph. Each polyline is either a
// plain point array or { points, weld } where `weld` lists which endpoints are
// CONNECTORS that snap onto the nearest vertex of another polyline within eps
// (0 = start, 1 = end; default both). The infill builders append root-first, so
// a vein/rib is passed weld:[0] — its ROOT joins its parent but its TIP stays
// free until termination connects it. This makes the constructed network a clean
// tree (branch crossings are not junctions), so its only cycles are the ones
// termination and the margin hoop actually close — which is what the acceptance
// metric measures. A connector snaps to any vertex of the target (not only the
// target's endpoints), so a root lands on its parent mid-span regardless of the
// parent's sampling.
export function buildRibGraph(polylines, eps = RIB_WELD_EPS) {
  const V = [];                          // {x,y,conn,pl}
  const chain = [];                      // [i,j] vertex-index edges
  for (let pi = 0; pi < polylines.length; pi++) {
    const item = polylines[pi];
    const pts = Array.isArray(item) ? item : item.points;
    const weld = Array.isArray(item) ? [0, 1] : (item.weld || [0, 1]);
    const closed = !Array.isArray(item) && item.closed;
    const base = V.length, last = pts.length - 1;
    const wStart = weld.includes(0), wEnd = weld.includes(1);
    for (let i = 0; i < pts.length; i++) {
      V.push({ x: pts[i].x, y: pts[i].y, conn: (i === 0 && wStart) || (i === last && wEnd), pl: pi });
    }
    for (let i = 0; i < last; i++) chain.push([base + i, base + i + 1]);
    if (closed && last >= 2) chain.push([base + last, base]);   // wrap a closed loop
  }
  const parent = V.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const inv = 1 / eps, cells = new Map(), bkey = (ix, iy) => ix + ',' + iy;
  for (let i = 0; i < V.length; i++) {
    const k = bkey(Math.round(V[i].x * inv), Math.round(V[i].y * inv));
    if (!cells.has(k)) cells.set(k, []); cells.get(k).push(i);
  }
  for (let i = 0; i < V.length; i++) {
    if (!V[i].conn) continue;            // only flagged connectors initiate a weld
    const ix = Math.round(V[i].x * inv), iy = Math.round(V[i].y * inv);
    let bestJ = -1, bestD = eps * eps;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const b = cells.get(bkey(ix + dx, iy + dy));
      if (!b) continue;
      for (const j of b) {
        if (V[j].pl === V[i].pl || find(j) === find(i)) continue;   // other polyline only
        const d = (V[j].x - V[i].x) ** 2 + (V[j].y - V[i].y) ** 2;
        if (d <= bestD) { bestD = d; bestJ = j; }
      }
    }
    if (bestJ >= 0) union(i, bestJ);
  }
  const nodeOf = new Map(), nodes = [];
  const nid = (i) => {
    const r = find(i); let id = nodeOf.get(r);
    if (id == null) { id = nodes.length; nodes.push({ x: V[r].x, y: V[r].y, deg: 0 }); nodeOf.set(r, id); }
    return id;
  };
  const eset = new Set(), edges = [];
  for (const [a, b] of chain) {
    const na = nid(a), nb = nid(b);
    if (na === nb) continue;
    const ek = na < nb ? na + '_' + nb : nb + '_' + na;
    if (eset.has(ek)) continue;
    eset.add(ek); edges.push([na, nb]); nodes[na].deg++; nodes[nb].deg++;
  }
  return { nodes, edges };
}

// Cyclomatic number E - V + C (C = connected components) and free-end (degree-1)
// count for a rib graph — the acceptance metric for edge termination.
export function graphStats(graph) {
  const { nodes, edges } = graph;
  const V = nodes.length, E = edges.length;
  const parent = nodes.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const [a, b] of edges) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }
  let C = 0; for (let i = 0; i < V; i++) if (find(i) === i) C++;
  let deg1 = 0; for (const n of nodes) if (n.deg === 1) deg1++;
  return { V, E, C, cyclomatic: E - V + C, deg1 };
}

// Nearest point on a polyline: returns { x, y, param, d } where param = segIndex+t
// is a monotic arc position used to order captures along the rim.
function nearestOnPolyline(p, poly) {
  let best = { x: poly[0].x, y: poly[0].y, param: 0, d: Infinity };
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1e-12;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = a.x + abx * t, qy = a.y + aby * t;
    const d = Math.hypot(p.x - qx, p.y - qy);
    if (d < best.d) best = { x: qx, y: qy, param: i + t, d };
  }
  return best;
}

function quadBezier(A, C, B, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * A.x + 2 * u * t * C.x + t * t * B.x,
      y: u * u * A.y + 2 * u * t * C.y + t * t * B.y,
    });
  }
  return out;
}

const TERM_W0 = 0.16, TERM_W1 = 0.11;   // fine-veinlet relative weights for capture struts

export function terminateEdges(veins, rim, P, mode, captureFrac) {
  const extra = [], nodes = [];
  if ((mode !== 'meet' && mode !== 'loop') || !veins || !veins.length || !rim || rim.length < 2) {
    return { veins: extra, nodes };
  }
  let Wmax = 1e-4;
  for (let i = 0; i <= 100; i++) Wmax = Math.max(Wmax, petalHalfWidth(i / 100, P));
  const captureDist = clamp(captureFrac, 0, 1) * (2 * Wmax);
  const AXIS_EPS = Math.max(1e-3, 0.01 * Wmax);

  // Root-only weld (weld:[0]) so every branch TIP is a degree-1 node; roots join
  // their parents and so are not mistaken for tips.
  const tips = buildRibGraph(veins.map((v) => ({ points: v.points, weld: [0] }))).nodes.filter((n) => n.deg === 1);
  const mirror = (seg) => ({ points: seg.points.map((p) => ({ x: p.x, y: -p.y })), w0: seg.w0, w1: seg.w1 });
  const meet = (T, Q, mirrored) => {
    if (Math.hypot(Q.x - T.x, Q.y - T.y) < 1e-3) return;   // tip already on the rim
    const seg = { points: [{ x: T.x, y: T.y }, { x: Q.x, y: Q.y }], w0: TERM_W0, w1: TERM_W1 };
    extra.push(seg); nodes.push({ x: Q.x, y: Q.y, width: TERM_W1 });
    if (mirrored) { extra.push(mirror(seg)); nodes.push({ x: Q.x, y: -Q.y, width: TERM_W1 }); }
  };

  // AXIS tips (on the mid-rib, self-symmetric): meet the apex in both modes.
  for (const t of tips) {
    if (Math.abs(t.y) > AXIS_EPS) continue;
    const q = nearestOnPolyline(t, rim);
    if (q.d < captureDist) meet(t, q, false);
  }

  // +Y tips near the rim (their -Y twins are produced by mirroring, keeping the
  // network exactly bilaterally symmetric).
  const plus = tips
    .filter((t) => t.y > AXIS_EPS)
    .map((t) => ({ t, q: nearestOnPolyline(t, rim) }))
    .filter((o) => o.q.d < captureDist);

  if (mode === 'meet') {
    for (const o of plus) meet(o.t, o.q, true);
  } else {
    plus.sort((a, b) => a.q.param - b.q.param);   // order along the margin
    const BOW = 0.55;                              // how far the arcade bows toward the rim
    for (let i = 0; i < plus.length; i += 2) {
      if (i + 1 < plus.length && Math.hypot(plus[i + 1].t.x - plus[i].t.x, plus[i + 1].t.y - plus[i].t.y) > 1e-3) {
        const A = plus[i].t, B = plus[i + 1].t;
        const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
        const Mr = nearestOnPolyline(M, rim);
        const Ctrl = { x: lerp(M.x, Mr.x, BOW), y: lerp(M.y, Mr.y, BOW) };
        const seg = { points: quadBezier(A, Ctrl, B, 6), w0: TERM_W0, w1: TERM_W0 };
        extra.push(seg, mirror(seg));
        nodes.push({ x: A.x, y: A.y, width: TERM_W0 }, { x: B.x, y: B.y, width: TERM_W0 });
        nodes.push({ x: A.x, y: -A.y, width: TERM_W0 }, { x: B.x, y: -B.y, width: TERM_W0 });
      } else {
        meet(plus[i].t, plus[i].q, true);          // odd tip out -> meet the rim
      }
    }
  }
  return { veins: extra, nodes };
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

// Unit surface normal at a flattened point — used to give the Voronoi sheet its
// slab thickness (top/bottom offset along the normal). Cross product of the two
// surface tangents (∂/∂u × ∂/∂v), by finite difference.
export function surfaceNormalAt(pt, P, spine) {
  const u = clamp(pt.x / P.L, 0, 0.9995);
  const hw = petalHalfWidth(u, P);
  const v = hw > 1e-4 ? clamp(pt.y / hw, -1, 1) : 0;
  const p = surfacePoint(u, v, P, spine);
  const pu = surfacePoint(clamp(u + 0.004, 0, 0.9995), v, P, spine);
  const pv = surfacePoint(u, clamp(v + 0.02, -1, 1), P, spine);
  const ax = pu.x - p.x, ay = pu.y - p.y, az = pu.z - p.z;
  const bx = pv.x - p.x, by = pv.y - p.y, bz = pv.z - p.z;
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / l, y: ny / l, z: nz / l };
}

// Rotate a DIRECTION into the bloom the same way placePoint rotates a position
// (tilt about the width axis, then azimuth about the vertical) — no translation.
export function placeDir(d, az, tilt = 0) {
  let x = d.x, y = d.y;
  if (tilt !== 0) {
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const nx = x * ct - y * st; y = x * st + y * ct; x = nx;
  }
  const c = Math.cos(az), s = Math.sin(az);
  return { x: x * c + d.z * s, y, z: -x * s + d.z * c };
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
  // RUFFLED has no TIP REGION control — it always covers the whole tip region, so
  // the flounce reaches from the apex all the way down every time.
  const region = P.tipStyle === 'ruffled'
    ? 1
    : clamp(P.tipRegion != null ? P.tipRegion : 0.3, 0, 1);
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
  const Pflat = { ...P, cup: 0, edgeProfile: 0 };

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
   buckle itself lives in surfacePoint (ruffleDisplace), so the whole lamina —
   every vein and the margin alike — flounces (out of plane + lateral spread),
   strongest at the
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
  const freq = ruffleWaveCount(P);                   // remapped: fine at the low end, caps ~16
  const { uStart } = tipRegionRange(P);
  const uBase = 0.004, uApex = 0.9995;
  const nRuffle = clamp(Math.round(freq * 24) + 130, 240, 620);  // dense enough to trace the coiling margin + fine frills
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


/* -------------------------------------------------------------------
   Scallop edge — the petal OUTLINE becomes a row of convex arcs (scallops), the
   doily/picot border of the reference lace. It pairs only with the LACE infill.
   Each scallop bulges outward along the in-surface normal by SCALLOP HEIGHT and
   drops back to a cusp between neighbours; SCALLOP COUNT sets how many run along
   each side (and therefore how wide each one is). Generated per side and made
   exactly mirror-symmetric across the mid-rib. Returns { rim, teethVeins }.
   ------------------------------------------------------------------- */
const SCALLOP_MAX = 0.34;   // world reach of a scallop at SCALLOP HEIGHT = 1

export function buildScallopEdge(P, spine) {
  if (P.tipStyle !== 'scallop') return null;
  const count = clamp(Math.round(P.scallopCount || 8), 2, 30);
  const height = clamp(P.scallopHeight != null ? P.scallopHeight : 0.4, 0, 1) * SCALLOP_MAX;
  const uBase = 0.02, uApex = 0.9995;
  const Pflat = { ...P, cup: 0, edgeProfile: 0 };  // outward direction free of cup / profile splay
  const nPer = Math.max(6, Math.round(120 / count));  // samples per scallop

  // One side, base -> tip: `count` convex bumps meeting at cusps on the outline.
  const sideRim = (s) => {
    const pts = [];
    for (let k = 0; k < count; k++) {
      const uA = lerp(uBase, uApex, k / count), uB = lerp(uBase, uApex, (k + 1) / count);
      for (let i = (k === 0 ? 0 : 1); i <= nPer; i++) {
        const t = i / nPer;
        const u = clamp(lerp(uA, uB, t), 0, 0.9995);
        const { p, out } = edgeOutward(u, s, Pflat, spine);
        const bump = height * Math.sin(Math.PI * t);     // 0 at the cusps, max mid-scallop
        pts.push({ x: p.x + out.x * bump, y: p.y + out.y * bump, z: p.z + out.z * bump });
      }
    }
    return pts;
  };

  const plusRim = sideRim(1);                // +Y base -> tip
  const minusRim = sideRim(-1);              // -Y base -> tip (mirror of +Y by construction)
  const rim = [];
  for (const q of plusRim) rim.push(q);
  rim.push(surfacePoint(uApex, 0, P, spine));// the apex point
  for (let i = minusRim.length - 1; i >= 0; i--) rim.push(minusRim[i]);   // -Y tip -> base
  return { rim, teethVeins: [] };
}
