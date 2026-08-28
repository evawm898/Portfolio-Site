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

   The profile is a single continuous curve with four intuitive knobs:
     P.W           : overall max half-width (world units)
     P.taper       : 0 = broad/paddle-like, 1 = slender. Also moves the
                     widest point toward the base as it increases.
     P.tip         : 0 = round/blunt tip, 1 = sharp point.
     P.tipFineness : 0 (default, exact no-op) -> 1 extends how SHARP a sharp
                     tip can get, RELATIVE to how narrow the petal already is
                     (see tipNarrowness). It never rounds a tip off further —
                     it only raises the ceiling at the P.tip = 1 end, and only
                     in proportion to narrowness, so a broad petal stays put
                     even at full fineness (no needle out of a paddle) while a
                     quilled strap can close to a genuinely fine point.

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
// CROSS-SECTION: rolls the flat (v * halfWidth) cross-section into a genuine arc —
// flat -> a shallow U channel -> a closed quill — instead of the parabolic v^2
// approximation cup/edgeProfile use. Capped just under a full turn so the two
// margins (v = -1 / +1) never exactly coincide: that keeps surfaceNormalAt's
// finite-difference stencil non-degenerate at the seam and leaves a persistent
// sliver gap (also how a real rolled paper quill's seam reads). CROSS_SECTION_TAPER
// varies the roll along u (see crossSectionEnvelope) so a tube can open into a
// spoon near the tip (or the mirror: open at the base). CROSS_SECTION_CUP_DAMP
// scales petalCup's own lift down as the roll tightens — the two displace the
// same (lift, across) plane, and summing them unscaled at max cup + max quill can
// over-curve one side of the tube past its own seam.
const CROSS_SECTION_MAX_ANGLE = 2 * Math.PI * 0.975;   // ~351 deg turn at |crossSection| = 1
const CROSS_SECTION_CUP_DAMP = 0.85;   // fraction of petalCup's lift removed at |crossSection| = 1
// TWIST + SKEW: contorted aestivation (bud spiral) + lateral midrib bend. Twist is
// a progressive rotation of the cross-section about the midrib tangent; skew swings
// the midrib sideways. Both intentionally break bilateral symmetry (chirality).
const TWIST_MAX = 1.15;         // max cross-section rotation at |twist| = 1 (radians, tip)
const SKEW_MAX  = 0.7;          // max lateral midrib swing at |skew| = 1 (fraction of W, tip)
const EDGE_NOISE_SIDE_PHASE = 13.7; // edge-noise phase offset applied to the -v side when asymmetric
// TIP FINENESS: how far the P.tip=1 exponent ceiling can be pushed past 1.0
// (a genuinely fine needle point), and the P.W band over which "how narrow is
// this petal already" ramps from 0 (broad paddle) to 1 (quilled strap). A
// control whose visual effect depends on another control's value must be
// expressed RELATIVE to it (see tipNarrowness) — this is that fix: tip
// sharpness used to be an absolute exponent range regardless of width, so a
// narrow petal's tip never refined past the same mild taper a broad one got.
const TIP_FINE_EXP_MAX = 5;      // tipExp ceiling at P.tip=1, full narrowness, full fineness
const TIP_FINE_W_NARROW = 0.18;  // P.W at/below which a petal counts as fully narrow (quill-thin)
const TIP_FINE_W_BROAD  = 0.70;  // P.W at/above which fineness has no extra effect (~default width)

// 0 (broad) .. 1 (already slender/quilled), purely a function of the petal's
// own max half-width — the "local width it's tapering from" the fineness
// ratio needs, independent of any other control.
function tipNarrowness(W) {
  const t = clamp((W - TIP_FINE_W_NARROW) / (TIP_FINE_W_BROAD - TIP_FINE_W_NARROW), 0, 1);
  return 1 - smootherstep(t);
}

export function petalHalfWidth(u, P) {
  u = clamp(u, 0, 1);   // guard the tip boundary: a fractional tipExp turns a
                        // marginally-negative cos() (u just past 1) into NaN
  const T = clamp(P.taper, 0, 1);
  const tip = clamp(P.tip, 0, 1);
  const fineness = clamp(P.tipFineness || 0, 0, 1);

  const peak    = lerp(0.48, 0.34, T);   // where the petal is widest
  const riseExp = lerp(1.0, 1.7, T);     // base sharpness
  // Fall-off exponent for the tip segment (cos^tipExp). Below 1 the outline
  // meets the apex with a vertical tangent -> a genuinely rounded/domed tip;
  // at 1 it meets linearly -> a sharp leaf point. Exponents above 1 draw the
  // tip out into a genuine needle — TIP FINENESS unlocks that range, but only
  // in proportion to how narrow the petal already is (tipNarrowness), so a
  // broad petal can't be driven into a needle and fineness=0 is an exact
  // no-op (tipExpMax collapses to 1.0, reproducing the old lerp(0.5,1.0,tip)).
  const tipExpMax = lerp(1.0, TIP_FINE_EXP_MAX, tipNarrowness(P.W) * fineness);
  const tipExp  = lerp(0.5, tipExpMax, tip);   // 0 = round dome -> 1 = sharp point (or needle)

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

       phi(u) = bloom + curl * smootherstep(u) + spineCurlAngle(u, P)

     - `bloom` (radians) is the launch angle: 0 = straight up (closed bud),
       ~pi/2 = straight out (fully open / flat flower). This is the "bloom
       angle" slider and is deliberately independent of petal shape.
     - `curl` (legacy, radians) adds a gentle progressive outward bend toward
       the tip so even a bud reads as an organic teardrop rather than a stiff
       spike. Only leaves and sepals still set this directly (see
       buildLeafInto / sepal construction in flower.js) — the outer petal's
       "Center curve" slider was retired in favour of SPINE CURL below, so
       P.curl is 0 (a no-op) for every petal built through resolveParams.
     - `spineCurlAngle` is SPINE CURL: a from-scratch axis, independent of the
       legacy `curl` term, that bends the spine along its LENGTH into a
       fiddlehead/crozier (see below). Summing it with the legacy term is
       safe because in practice exactly one of the two is ever non-zero for
       a given part (petals set curlAmount/curlBias and leave P.curl at 0;
       leaves/sepals set P.curl and leave curlAmount at 0).

   Because the curve is parameterised so that |dP/du| = L (constant speed),
   the arc length from the base is exactly L*u. That identity is what lets
   the flattened lattice space use X = L*u with no arc-length inversion. This
   holds for ANY phi(u), so SPINE CURL doesn't disturb it.

   Each sample stores the spine position (s, y), the inward-pointing surface
   normal (nx, ny) used for cupping, and u. Normal = tangent rotated +90deg:
       tangent = (sin phi, cos phi)   ->   normal = (-cos phi, sin phi)
   which points up-and-inward, so cupping opens toward the flower's centre.
   ------------------------------------------------------------------- */

// SPINE CURL: bends the spine along its LENGTH (as opposed to CROSS-SECTION
// ROLL, which bends it across its WIDTH into a tube) — flat -> gentle arc ->
// full circle -> a tight multi-turn fiddlehead/crozier. Three controls:
//   P.curlAmount (signed, -1..1): total curl strength; sign picks direction.
//   P.curlBias    (0..1): where the curvature concentrates.
//     0 = UNIFORM  — constant curvature along the whole length, i.e. a true
//         circular arc (a real hoop at |curlAmount| = 1).
//     1 = TIP-LOADED — curvature is near zero through the base and rises
//         sharply toward the tip: a logarithmic-spiral-like crozier, tight at
//         the tip and opening out toward the base, per the botanical
//         fiddlehead this models (NOT a constant-curvature hoop).
//   P.curlStart   (0..1, default 0): where along u the curl BEGINS. 0 = the
//     whole petal is eligible to curl (today's behaviour, unchanged). Above
//     0, u < curlStart is held dead straight (Phi stays 0) and the SAME total
//     turn (spineCurlTotal, unaffected by curlStart) is squeezed into the
//     u >= curlStart remainder — so higher curlStart reads as "only the outer
//     portion curls," not as a weaker curl.
//     NOT redundant with curlBias: curlBias reshapes how curvature is
//     DISTRIBUTED but never zeroes it before u=1 (kappa(u)>0 for any u>0 once
//     bias<1, and even at bias=1 kappa is merely SMALL near the base, not
//     exactly 0) — it can taper but can't produce a genuinely straight base
//     segment. curlStart imposes a hard threshold: an actual straight run
//     from u=0 to curlStart, then curl turns on. start=0.5/bias=0 gives a
//     straight base half then a true circular arc through the tip half (one
//     visible kink at the threshold); start=0/bias=1 curves smoothly
//     everywhere with no straight segment, just concentrated near the tip.
//     Different shapes, kept as two honest, non-cancelling controls.
// Implementation: cumulative turning angle Phi(u) = total * u^(p+1), so
// curvature kappa(u) = dPhi/du = total*(p+1)*u^p — constant at p=0 (bias=0)
// and strictly increasing in u for p>0 (bias>0), which is exactly the
// "increasing curvature toward the tip" a crozier needs. The exponent form
// also gives an exact closed-form integral (no numerical integration needed)
// and Phi(0)=0 always, so the spine still launches at exactly the bloom
// angle regardless of curl. curlStart remaps u onto [0,1] over [curlStart,1]
// before this formula runs, so Phi(curlStart)=0 and Phi(1) is still exactly
// spineCurlTotal(P) — curlStart changes WHERE the turn happens, never how
// much total turn there is.
//   TOTAL_MAX interpolates 360 deg (bias=0, so |curlAmount|=1 closes a single
// full circle) up to 720 deg (bias=1, so |curlAmount|=1 winds a ~2-turn
// crozier) — the range this feature was asked to cover.
const SPINE_CURL_TURNS_UNIFORM = 2 * Math.PI;   // 360 deg: |curlAmount|=1, curlBias=0 -> one closed circle
const SPINE_CURL_TURNS_TIPLOAD = 4 * Math.PI;   // 720 deg: |curlAmount|=1, curlBias=1 -> ~2-turn crozier
const SPINE_CURL_BIAS_POWER    = 4;              // exponent p at curlBias=1

// Total signed cumulative turn (radians) SPINE CURL contributes by u=1 — the
// magnitude other code (adaptive spine sampling, vein/blade densification)
// needs to know how tightly this petal is going to coil.
export function spineCurlTotal(P) {
  const amount = clamp(P.curlAmount || 0, -1, 1);
  if (!amount) return 0;
  const bias = clamp(P.curlBias != null ? P.curlBias : 0, 0, 1);
  const totalMax = lerp(SPINE_CURL_TURNS_UNIFORM, SPINE_CURL_TURNS_TIPLOAD, bias);
  return amount * totalMax;
}

// CURL START: where along u the curl begins (0..1, default 0 = whole petal,
// unchanged behaviour). u below curlStart maps to uu=0 (dead straight); u in
// [curlStart, 1] remaps linearly onto [0, 1] so the existing bias formula
// still runs Phi(1)=total exactly — curlStart only relocates the turn, one
// owner (this function) for both curlAmount/curlBias and curlStart together
// so no consumer can compute Phi with the axes half-applied. Capped at 0.95,
// short of 1, so the remapped domain never divides by zero.
function curlStartRemap(u, P) {
  const start = clamp(P.curlStart || 0, 0, 0.95);
  if (!start) return clamp(u, 0, 1);
  return clamp((u - start) / (1 - start), 0, 1);
}

// Cumulative SPINE CURL turning angle at station u (radians, signed). 0 at
// u=0 (base tangent stays exactly at the bloom angle) rising to
// spineCurlTotal(P) at u=1.
export function spineCurlAngle(u, P) {
  const total = spineCurlTotal(P);
  if (!total) return 0;
  const bias = clamp(P.curlBias != null ? P.curlBias : 0, 0, 1);
  const p = SPINE_CURL_BIAS_POWER * bias;
  return total * Math.pow(curlStartRemap(u, P), p + 1);
}

// Worst-case local turn rate dPhi/du (radians per unit u), always at u=1 since
// curvature is constant (bias=0) or strictly increasing toward the tip
// (bias>0). Callers outside this module (vein/blade densification in
// flower.js) read this instead of re-deriving SPINE_CURL_BIAS_POWER
// themselves — one owner for the curve's shape, per the registration rule.
// curlStart compresses the active turn into a shorter u-range, which raises
// this peak rate by 1/(1-curlStart) — accounted for here so adaptive spine
// sampling stays smooth for a late, tight curl start same as it does for a
// tip-loaded bias.
export function spineCurlPeakRate(P) {
  const total = Math.abs(spineCurlTotal(P));
  if (!total) return 0;
  const bias = clamp(P.curlBias != null ? P.curlBias : 0, 0, 1);
  const p = SPINE_CURL_BIAS_POWER * bias;
  const start = clamp(P.curlStart || 0, 0, 0.95);
  const compress = start ? 1 / (1 - start) : 1;
  return total * (p + 1) * compress;
}

// How many spine samples buildSpine needs to stay smooth: enough that no
// segment turns through more than ~8 degrees, the same faceting bar the
// tube cross-section (RADIAL_SEGMENTS) already ships at. A tight, tip-loaded
// crozier turns fastest right at the tip (kappa(1) = total*(p+1)), so that's
// the worst-case segment to protect. buildSpine's own cost is negligible
// (a polyline, not triangles), so it's fine to size generously.
const SPINE_SAMPLE_DEG_PER_SEG = 8;
const SPINE_SAMPLES_MIN = 64;    // unchanged from the old fixed default
const SPINE_SAMPLES_MAX = 480;   // generous cap; cost here is just polyline points
export function spineSampleCount(P) {
  const peakTurnRate = spineCurlPeakRate(P);       // dPhi/du at u=1, the steepest point
  if (!peakTurnRate) return SPINE_SAMPLES_MIN;
  const maxRad = SPINE_SAMPLE_DEG_PER_SEG * Math.PI / 180;
  const needed = Math.ceil(peakTurnRate / maxRad) + 1;
  return clamp(Math.max(SPINE_SAMPLES_MIN, needed), SPINE_SAMPLES_MIN, SPINE_SAMPLES_MAX);
}

export function buildSpine(P, n) {
  if (!n) n = spineSampleCount(P);
  const samples = [];
  const du = 1 / (n - 1);
  let s = P.r0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const u = i * du;
    const phi = P.bloom + (P.curl || 0) * smootherstep(u) + spineCurlAngle(u, P);
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
  // Bilateral by default (uses |v|, both margins mirror). But once TWIST or SKEW
  // has made the petal asymmetric, a perfectly mirrored crinkle reads as a render
  // bug, so we desync the two margins: the -v side gets a phase offset. Gated on
  // asymmetry so symmetric petals stay byte-identical.
  const asym = (P.petalTwist || P.petalSkew) ? (v < 0 ? EDGE_NOISE_SIDE_PHASE : 0) : 0;
  const n = fbm1D(u * freq + asym) * 0.8 + fbm1D(av * freq * 1.7 + 5 + asym) * 0.4;
  return amt * EDGE_NOISE_AMP * band * n;
}

// How much of the roll angle applies at u, so CROSS-SECTION TAPER can open the
// tube into a spoon near one end. taper = 0: uniform along the whole length
// (channelled / quilled read the same everywhere). taper > 0: full roll at the
// base (u=0) easing to flat by the tip (u=1) — a quill opening into a spoon.
// taper < 0: the mirror — flat at the base, full roll by the tip. Exact 1 at
// taper = 0, so CROSS SECTION alone (taper untouched) rolls uniformly.
function crossSectionEnvelope(u, taper) {
  const t = clamp(taper || 0, -1, 1);
  if (Math.abs(t) < 1e-4) return 1;
  const uu = t > 0 ? clamp(u, 0, 1) : clamp(1 - u, 0, 1);
  return 1 - Math.abs(t) * smootherstep(uu);
}

// Roll the flat cross-section (across = v * hw) into an arc of angle Θ(u), by
// bending the flat strip WITHOUT stretching it: the strip's half-width hw(u) is
// exactly the arc length from the midrib to the margin, so a strip bent through
// angle Θ sits on a circle of radius r = hw / (Θ/2) and a point at v lands at the
// angle φ = v·Θ/2 around it — the same isometric roll a real strip of paper or
// paper-quilling makes; every infill point maps through this same substitution,
// so it curls with the sheet at no extra cost (see surfacePoint).
//   Θ = 0 (flat)     : r -> infinity, but r·sin(φ) -> hw·v and r·(1-cos(φ)) -> 0 —
//                      the two limits below are exact, not just close, at Θ = 0.
//   |Θ| = MAX (quill): margins land ~351° apart, not exactly coincident (see
//                      CROSS_SECTION_MAX_ANGLE) — always a hairline seam gap.
// `dir` (the sign of P.crossSection) picks which way the tube opens — toward the
// flower centre (+, matching petalCup's convention) or away (-) — independent of
// Θ's magnitude, since 1 - cos(φ) is the same for +φ and -φ.
function crossSectionRoll(u, v, hw, P) {
  const mag = Math.abs(P.crossSection || 0);
  if (mag <= 1e-4 || hw <= 1e-6) return { across: v * hw, lift: 0 };
  const dir = Math.sign(P.crossSection);
  const theta = mag * CROSS_SECTION_MAX_ANGLE * crossSectionEnvelope(u, P.crossSectionTaper);
  const K = theta / 2;
  if (K <= 1e-4) return { across: v * hw, lift: 0 };
  const r = hw / K;
  const phi = v * K;
  return { across: r * Math.sin(phi), lift: dir * r * (1 - Math.cos(phi)) };
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
  if (P.petalCup) {
    // Auto-dampen: CROSS SECTION rolls the same (lift, across) plane cup does, so
    // an un-damped sum at max cup + max quill over-curves one side of the tube
    // past its own seam. Fades cup toward (not to) zero as the roll tightens.
    const cupDamp = 1 - CROSS_SECTION_CUP_DAMP * clamp(Math.abs(P.crossSection || 0), 0, 1);
    normalLift += P.petalCup * PETAL_CUP_AMP * hw * v * v * cupDamp;
  }
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
  // The cross-section spans two axes: `lift` along the spine normal (nx, ny) and
  // `across` along the width (world z). TWIST rotates that section about the midrib
  // tangent, progressively from base to tip; SKEW swings the whole section sideways
  // (a lateral midrib bend). Both break bilateral symmetry on purpose. With twist =
  // skew = 0 this is exactly `z = v*hw + dz` and `lift = normalLift` — an exact no-op.
  let lift = normalLift;
  let across;
  if (P.crossSection) {
    const roll = crossSectionRoll(u, v, hw, P);
    across = roll.across + dz;
    lift += roll.lift;
  } else {
    across = v * hw + dz;
  }
  const tw = P.petalTwist || 0;
  if (tw) {
    const th = tw * TWIST_MAX * smootherstep(clamp(u, 0, 1));
    const c = Math.cos(th), s = Math.sin(th);
    const nl = lift * c - across * s;
    across = lift * s + across * c;
    lift = nl;
  }
  if (P.petalSkew) across += P.petalSkew * SKEW_MAX * P.W * smootherstep(clamp(u, 0, 1));
  return {
    x: sp.s + sp.nx * lift,
    y: sp.y + sp.ny * lift,
    z: across,
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
  // ONE PRODUCER: where the petal edge is, is decided by ribPath(P) (below) —
  // the marching-squares contour of the material mask when the petal is clefted,
  // the analytic +-w(u) loop when it is not. This wrapper only exists because
  // much of the codebase asks for the outline by this name; it adds nothing of
  // its own, so there is no second definition here to drift from that one.
  return ribPath(P).loop(n);
}

/* -------------------------------------------------------------------
   4a. THE MARGIN RIB — the ONE curve every infill pattern must register
   against, shared with the actual tube the rib renders as.

   Previously every infill pattern invented its own clip boundary — a
   constant inward offset (Voronoi), a constant field-distance threshold
   (Growth), zero inset (Veins termination, Strands), a proportional cap
   (Lattice) — none of them derived from where the rib tube actually sits.
   Under CONTINUOUS MARGIN (the Standard default) the rib isn't even a
   constant-radius hoop on the true outline: it's a tapered strand (fat at
   the base, thin at the tip) that itself bundles toward the axis near the
   foot instead of riding the outline at all (see marginStrands). A fixed
   inset can't track that, which is exactly why the gap varied around the
   perimeter and the rib crossed over the infill near the base.

   These functions are the single source of truth for the rib's WEIGHT and its
   inner edge; ribPath(P) below owns the CURVE they sit on. marginStrands()
   (flower.js) — what actually gets lofted into a tube — asks ribPath for that
   curve rather than re-deriving it, so the rendered rib and the boundary every
   infill clips to CANNOT diverge: it's the same producer, not a second copy
   that happens to agree today.
   ------------------------------------------------------------------- */

// The bundle/flare smoothstep: 0 (on-axis, bundled with the midrib) near
// the foot, ramping to 1 (exactly on the true outline) by `flareEnd`. Used by
// ribPath to blend each marginal strand off the axis and onto the boundary,
// and by ribCenterline for the scalar form — the identical curve both places.
export function marginFlareFactor(u, bundleTight, flareRate) {
  const bt = clamp(bundleTight != null ? bundleTight : 0.5, 0, 1);
  const fr = clamp(flareRate != null ? flareRate : 0.5, 0, 1);
  const flareStart = lerp(0.02, 0.20, bt);
  const flareEnd = Math.min(0.96, flareStart + lerp(0.55, 0.12, fr));
  const t = clamp((u - flareStart) / ((flareEnd - flareStart) || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

// Rim-hoop line weight (non-continuous-margin) and the continuous-margin
// strand's base/tip radii. Canonical here; flower.js imports these instead
// of keeping its own copies, so the render and the boundary check can never
// drift apart by editing one and forgetting the other.
// A Voronoi cell below this area (world units squared) is geometrically DEGENERATE, not
// merely small: a ring with perimeter and no interior. The smallest LEGITIMATE cell the
// geometry-quality matrix produces is 0.069 mm^2 (chrysanthemum, dense by design) — about
// 1.0e-4 u^2 at 26 mm/unit — so this sits five orders of magnitude below it and can only
// ever catch a collapse, never a real cell.
// (An earlier draft of this comment cited 14.9 mm^2, taken from a run where the minCellSize
// floor was temporarily un-gated and had already removed every small cell. Measuring the
// wrong configuration and quoting it as the shipping one is the mistake this file keeps
// finding elsewhere; recorded here rather than silently corrected.)
export const DEGENERATE_CELL_AREA = 1e-9;

export const RIM_WIDTH = 0.34;      // constant hoop radius, relative to tubeRadius
export const MARGIN_W_BASE = 0.62;  // continuous-margin strand radius at the foot
export const MARGIN_W_TIP = 0.12;   // continuous-margin strand radius at the tip

// The rib's physical tube radius at u — exactly what addTube renders it at
// (continuous margin: linear taper base->tip; otherwise: the constant hoop
// radius). Approximation note: addTube tapers linearly by ARC LENGTH along
// the strand, this taper is linear in u; the two differ only inside the
// base bundle/flare transition (see marginFlareFactor), where the strand's
// arc-length-to-u relationship is non-linear. Negligible outside that band.
export function ribRadius(u, P, contMargin) {
  const gThick = clamp(P.thickScale != null ? P.thickScale : 1, 0.4, 2.5);
  if (!contMargin) return P.tubeRadius * RIM_WIDTH * gThick;
  return lerp(P.tubeRadius * MARGIN_W_BASE, P.tubeRadius * MARGIN_W_TIP, clamp(u, 0, 1)) * gThick;
}

// Where the rib's tube is CENTRED at u, before subtracting its own radius:
// the boundary's outer envelope under a constant-radius hoop, or that envelope
// bundled/flared under continuous margin. The pointwise scalar form of what
// ribPath lofts — same producer, so the two cannot describe different edges.
export function ribCenterline(u, P, contMargin) {
  // outerAt is ribPath's own outer envelope — the analytic w(u) verbatim on a
  // smooth petal, the contour's binned envelope on a clefted one. Reading it
  // (rather than petalHalfWidth directly) is what keeps the scalar bound every
  // infill clips to and the polyline the rim is lofted along the same curve.
  const hw = ribPath(P).outerAt(clamp(u, 0, 1));
  if (!contMargin) return hw;
  return hw * marginFlareFactor(u, P.bundleTightness, P.flareRate);
}

// THE inner edge of the rib as actually drawn: every infill pattern should
// terminate flush against this, by construction, not by coincidence. Floored
// at 0 (the axis) — near the foot, under continuous margin, the bundled
// strand's centerline can sit closer to the axis than its own radius.
export function ribInnerEdge(u, P) {
  const contMargin = !!P.continuousMargin && !P.solidBlade;
  return Math.max(0, ribCenterline(u, P, contMargin) - ribRadius(u, P, contMargin));
}

// A closed polyline tracing ribInnerEdge(u) on both sides, same format as
// buildSilhouette (base(+Y) -> tip -> base(-Y)) — for callers that need a
// clip polygon or a termination target (Voronoi's cell clip, terminateEdges'
// rim) rather than a pointwise half-width test.
export function ribMarginPolyline(P, n = 56) {
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, X = P.L * u, r = ribInnerEdge(u, P);
    right.push({ x: X, y: r });
    left.push({ x: X, y: -r });
  }
  const outline = [];
  for (let i = 0; i < right.length; i++) outline.push(right[i]);
  for (let i = left.length - 1; i >= 0; i--) outline.push(left[i]);
  return dedupePolygon(outline);
}

// The same curve as ribMarginPolyline, TRIMMED to where it actually has width.
//
// ribInnerEdge is floored at 0 (see above), and under continuous margin that floor
// engages over a run at the foot and, on clefted petals, a second run at the tip: the
// bundled strand is wider there than the petal, so the rib owns the full width and the
// "inner edge" is the axis on both sides. ribMarginPolyline emits those runs faithfully
// — as a zero-width neck where the +Y and -Y walls lie on top of each other.
//
// That is correct as a TERMINATION TARGET (an infill strand at u = 0.05 should stop at
// y = 0; there is no room), and wrong as a CLIP POLYGON. Sutherland-Hodgman clipping a
// cell against a polygon that doubles back on itself yields a cell that doubles back on
// itself, and no amount of seed culling fixes it: remove the seed owning the neck and its
// region passes to a neighbour, which inherits the same spike. Measured over the six
// voronoi configs: the neck spans 12.5-18.1% of the petal at the foot and up to 22.2% at
// the tip, 1-2 folds in the bound, 1-4 escaping cells (#74, #77).
//
// So Voronoi clips against the positive-width span only. Nothing is lost: the trimmed
// runs have zero material width by construction, so no cell belongs there. The endpoints
// are placed at the true crossings by bisection rather than snapped to a station, so the
// bound closes to a point at each end instead of a short zero-width stub.
export function ribClipPolygon(P, n = 72) {
  const positive = (u) => ribInnerEdge(clamp(u, 0, 1), P) > 1e-9;
  // The LONGEST run of positive-width stations, not merely the first-to-last: measured,
  // the zero runs are always one at the foot and one at the tip, but taking the outermost
  // pair would silently span an interior neck if one ever appeared, which is the exact
  // defect this function exists to remove. (The gate's clipFolds census is the backstop
  // for a neck narrower than one station.)
  let bestA = -1, bestB = -1, runA = -1;
  for (let i = 0; i <= n; i++) {
    const p = positive(i / n);
    if (p && runA < 0) runA = i;
    if ((!p || i === n) && runA >= 0) {
      const end = p ? i : i - 1;
      if (end - runA > bestB - bestA) { bestA = runA; bestB = end; }
      runA = -1;
    }
  }
  if (bestA < 0) return null;
  const crossing = (uIn, uOut) => {          // uIn has width, uOut does not
    let a = uIn, b = uOut;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (positive(m)) a = m; else b = m; }
    return b;                                 // the zero side, so the bound closes to a point
  };
  const u0 = bestA === 0 ? 0 : crossing(bestA / n, (bestA - 1) / n);
  const u1 = bestB === n ? 1 : crossing(bestB / n, (bestB + 1) / n);
  if (!(u1 > u0)) return null;
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const u = u0 + (u1 - u0) * (i / n), X = P.L * u, r = ribInnerEdge(u, P);
    right.push({ x: X, y: r });
    left.push({ x: X, y: -r });
  }
  const outline = [];
  for (let i = 0; i < right.length; i++) outline.push(right[i]);
  for (let i = left.length - 1; i >= 0; i--) outline.push(left[i]);
  return dedupePolygon(outline);
}


/* -------------------------------------------------------------------
   4a-iii. ribInsetBound(P) — THE PETAL'S MATERIAL BOUNDARY, INSET BY THE RIB.

   The third boundary, and the one that did not exist. The other two each answer
   half the question:

     buildSilhouette  the material outline — cleft-aware, no rib inset
     ribClipPolygon   the rib's inner edge — inset, no cleft awareness

   Voronoi needs BOTH at once: the material, inside the rib. Clipping cells to
   ribClipPolygon lets them span every sinus (the void-crossing defect); clipping
   them to buildSilhouette instead lets them run out past the margin rib (measured
   at 13.643 mm of overshoot against a threshold of 3). Intersecting the two
   polygons is a non-convex-against-non-convex clip, which is the general clipper
   this file has deliberately never acquired.

   So it is not built by intersecting them. It is traced, the way buildSilhouette
   is traced, as the zero contour of a scalar field — SECOND USE of contourField
   above, not a second copy of it:

     m(x, y) = petalMask(x, y / f(x)) * f(x) - ribRadius(u)

   where f = marginFlareFactor is the y-SCALE continuous margin applies to the
   boundary (ribCenterline = outerAt * f), so scaling the mask's y by it puts the
   zero contour of the first two terms exactly on the rib's centreline; subtracting
   the rib's own radius insets to its inner edge. With continuous margin off f = 1
   and the field is plainly petalMask - ribRadius. On the axis it reduces to
   w(u)*f - r(u), which IS ribInnerEdge(u) — so this is the pointwise scalar
   boundary generalised to two dimensions, not a parallel construction.

   TWO EVALUATION STRATEGIES FOR ONE CURVE, exactly as ribPath does it: with no
   clefts the analytic answer is exact and ribClipPolygon is returned VERBATIM,
   so every non-clefted design is byte-identical and pays nothing. The level set
   runs only where no analytic answer exists.

   WHAT THIS IS NOT, stated because it would otherwise be assumed: petalMask is
   NOT a signed distance field. |grad| over the material runs 0.04 to 1.68, so a
   level set of it is not an exact offset, and this bound is not an exact inset.
   Measured against ribClipPolygon on SMOOTH petals — where the two describe the
   same curve and any disagreement is purely this approximation — the error is
   mean 0.105 mm, max 0.298 mm (37% of the 0.8 mm minimum feature). That is the
   reason the smooth path returns the analytic polygon instead of the level set:
   the approximation is confined to clefted petals, where the alternative is not
   a more accurate bound but no bound at all. The gate asserts the smooth-petal
   agreement so the error cannot grow unnoticed.
   ------------------------------------------------------------------- */

// Douglas-Peucker tolerance for the traced bound, in world units. A marching-squares
// contour carries ~1.3-1.9k vertices where the analytic band carries 480, and cells
// INHERIT boundary vertices (cellAnnulus emits SUB samples per cell edge), so the
// triangle cost of not simplifying lands on every cell. Set at a quarter of the
// printable minimum feature — 0.8 mm at the file's 26 mm/unit convention — so
// simplification cannot move the boundary by a printable amount.
const RIB_BOUND_SIMPLIFY_TOL = (0.8 / 26) * 0.25;

// Douglas-Peucker, then REPAIRED so no chord leaves the material. Plain DP bounds the
// perpendicular distance from the ORIGINAL POLYLINE, which is not the same as staying
// inside the shape: around the rounded sinus floor the inset contour is a tight convex
// arc, and a chord across it cuts the corner OUTWARD, into the slot. Measured with plain
// DP at the same tolerance: 0.447 mm of the bound sitting in removed material on 5 lobes
// at cleftDepth 0.6, which the cells then inherited and doubled to 0.878 mm.
//
// The repair is not a smaller tolerance — that pays vertices everywhere for a problem
// that occurs at a few corners. Each retained chord is sampled, and any chord that leaves
// the material gives its span's original vertices back. Simplification is therefore free
// where the contour is straight (which is most of it) and absent where it would cost
// correctness.
function simplifyMaterialSafe(pts, tol, mask) {
  const simp = simplifyPath(pts, tol);
  if (simp.length < 2) return simp;
  // index of each retained point in the original, so a bad span can be restored verbatim
  const idx = [];
  for (let i = 0, k = 0; i < pts.length && k < simp.length; i++) {
    if (pts[i] === simp[k]) { idx.push(i); k++; }
  }
  if (idx.length !== simp.length) return simp;      // identity-matching failed; leave as-is
  const SAMPLES = 8;
  const out = [];
  for (let k = 0; k < simp.length; k++) {
    out.push(simp[k]);
    const kn = (k + 1) % simp.length;
    const a = simp[k], b = simp[kn];
    let bad = false;
    for (let t = 1; t < SAMPLES; t++) {
      const f = t / SAMPLES;
      if (mask(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f) <= 0) { bad = true; break; }
    }
    if (!bad) continue;
    const i0 = idx[k], i1 = k + 1 < simp.length ? idx[kn] : pts.length;
    for (let i = i0 + 1; i < i1; i++) out.push(pts[i]);
  }
  return out;
}

const _ribInsetCache = new Map();

// Returns the bound's CONNECTED PIECES, largest first — always an array, one element in
// every ordinary case. It is not always one: measured over 192 clefted configs, six trace
// as two or three separate islands, all of them continuous margin with cleftDepth >= 0.55
// AND cleftWidth >= 0.7, where the slots are wide enough at the sinus floor that the rib
// inset pinches through and each lobe's interior stands alone. The MATERIAL is still one
// piece there (maskContours returns a single loop on every one of them) — it is the INSET
// that separates, which is real geometry and not a tracing failure. Returning only the
// largest would silently drop up to 50% of the petal's interior on those designs, so the
// contract is the list and every consumer clips against each piece.
//
// opts.trace forces the traced path on a petal that has no clefts, where ribClipPolygon
// is exact. That is the ONLY way to measure this producer's approximation error against a
// known-correct reference — on a clefted petal there is nothing to compare it to — so the
// positive control in verify-geometry-quality.mjs is its one caller. Nothing in the render
// or export path passes it.
export function ribInsetBound(P, opts = {}) {
  const cfg = cleftConfig(P);
  // No clefts: the analytic inner edge IS the material's inner edge, exactly. Returned
  // verbatim so smooth designs are untouched by this producer existing.
  if (!cfg && !opts.trace) { const cp = ribClipPolygon(P, 72); return cp ? [cp] : []; }

  const contMargin = !!P.continuousMargin && !P.solidBlade;
  const k = [P.L, P.W, P.taper, P.tip, P.edgeCurve, P.clawLength || 0, P.clawWidth || 0, P.shoulder || 0,
    P.cleftDepth || 0, P.cleftLobes || 0, P.cleftWidth || 0,
    contMargin ? 1 : 0, P.tubeRadius, P.thickScale || 1, P.bundleTightness, P.flareRate,
    opts.trace ? 'T' : '', opts.simplifyTol != null ? opts.simplifyTol : ''].join('|');
  const hit = _ribInsetCache.get(k);
  if (hit !== undefined) return hit;

  const L = Math.max(P.L, 1e-4);
  const uAt = (x) => clamp(x / L, 0, 1);
  const rAt = (x) => ribRadius(uAt(x), P, contMargin);
  // Floored away from 0: under continuous margin the flare vanishes at the foot, and
  // dividing y by it there would send every off-axis sample to -Infinity rather than
  // simply leaving the field negative (which the -rAt term already guarantees).
  const flareAt = (x) => (contMargin
    ? Math.max(1e-3, marginFlareFactor(uAt(x), P.bundleTightness, P.flareRate))
    : 1);
  // TWO constraints, not one. petalMask(x, y/f)*f is where the RIB is: the boundary with
  // continuous margin's y-scale applied, which is exactly what cleftStrands lofts. But the
  // flare pulls the whole contour toward the axis, INCLUDING the cleft walls, and a slot is
  // a fixed hole that does not move with it — so near the foot that curve passes over
  // removed material. (That is the shipped rib's own behaviour, not something introduced
  // here; the rib strand really does bundle across the sinus down at the bundle.) Reading
  // it alone as the bound let the contour sit 0.720 mm inside a slot on 5 lobes at
  // cleftDepth 0.6, and the cells inherited it — the exact defect this whole change exists
  // to remove. So the bound is inside the flared curve AND inside the MATERIAL, inset by
  // the rib in both. Where f = 1 the two terms are identical and this costs nothing; on a
  // petal with no clefts the flared term is the smaller one everywhere, so the smooth
  // positive control is untouched.
  const field = (x, y) => {
    const f = flareAt(x);
    return Math.min(petalMask(x, y / f, P, cfg) * f, petalMask(x, y, P, cfg)) - rAt(x);
  };

  // 240, against maskContours' 200: this contour is an INSET one, so it runs through the
  // narrow material between a slot wall and the rib where the coarser lattice loses the
  // gap entirely. The cost is paid once per shape (cached) and simplified away below.
  //
  // Marching squares also emits a handful of 3-5 vertex loops wherever the field grazes
  // the lattice tangentially. Those are not islands, and counting them as such would
  // misreport the inset's topology. The floor separating them from real islands is not a
  // tuned threshold: measured, noise loops come to <= 0.0027 mm^2 and the smallest genuine
  // island to 11.44 mm^2, so anything narrower than the printable minimum feature square
  // (0.8 mm)^2 = 0.64 mm^2 sits four orders of magnitude clear of both. An island that
  // small could not hold one printable strut in any case.
  const NOISE_AREA = (0.8 / 26) * (0.8 / 26);
  let loops = contourField(field, flatContourBox(P, 240), 240)
    .filter((l) => l.length >= 3 && Math.abs(polyArea(l)) > NOISE_AREA);

  // opts.simplifyTol is the positive control's second knob: measuring at tol 0 separates
  // this producer's LEVEL-SET approximation from the deliberate simplification on top of
  // it, so a change in either is attributable. Shipped callers pass neither.
  const tol = opts.simplifyTol != null ? opts.simplifyTol : RIB_BOUND_SIMPLIFY_TOL;
  const out = [];
  for (let piece of loops) {
    if (tol > 0) piece = simplifyMaterialSafe(piece, tol, (x, y) => petalMask(x, y, P, cfg));
    if (piece.length < 3) continue;
    // Match ribClipPolygon's winding (clockwise / negative shoelace), which every
    // downstream orientation convention — cell rings, slab faces — is built on.
    if (polyArea(piece) > 0) piece = piece.slice().reverse();
    piece = dedupePolygon(piece);
    if (piece.length >= 3) out.push(piece);
  }
  out.sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)));
  if (_ribInsetCache.size > 24) _ribInsetCache.delete(_ribInsetCache.keys().next().value);
  _ribInsetCache.set(k, out);
  return out;
}

/* -------------------------------------------------------------------
   4a-ii. ribPath(P) — THE SINGLE PRODUCER of the petal boundary.

   ribInnerEdge() unified the CONSUMERS of the boundary. This unifies the
   PRODUCERS, which is where the cleft-margin defect actually lived (PR #50):
   there were two producers, and the
   second one was private to continuous margin. The hoop rim traced
   buildSilhouette (the real material outline, cleft-aware), while the
   continuous-margin strands were sampled straight off the analytic envelope
   +-petalHalfWidth(u) x flare. A cleft petal has no single w(u), so those
   strands sailed over every sinus and the margin never sealed around a lobe:
   watertight, and the wrong shape.

   Everything that needs to know where the petal edge is now asks this:
     .loop(n)     closed flattened boundary, base(+Y) -> tip -> base(-Y).
                  buildSilhouette() is a thin alias for it.
     .sides       the boundary split into a +Y half and a -Y half, base->tip
                  (null when the split is degenerate; see .diag).
     .strands(n)  what CONTINUOUS MARGIN lofts: each side rooted at the foot
                  and blended onto the boundary by marginFlareFactor.
     .outerAt(u)  the boundary's outer envelope at u — what ribCenterline, and
                  therefore ribInnerEdge, derives from.
     .diag        the split invariants, for the gates to assert on.

   TWO EVALUATION STRATEGIES FOR ONE CURVE, not two curves. With no clefts the
   analytic envelope IS the boundary, and is used verbatim (so smooth petals
   stay byte-identical); with clefts the marching-squares contour is. Adding a
   third strategy (a rim treatment) means adding it HERE, not beside this.
   ------------------------------------------------------------------- */

// Douglas-Peucker, on flattened points. A cleft contour is ~1k vertices of
// which most lie on nearly straight runs; lofting all of them would multiply
// the rim's triangle count for nothing. Corner-preserving, so sinus floors and
// lobe tips survive at any tolerance coarse enough to flatten the straights.
function simplifyPath(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (stack.length) {
    const [i0, i1] = stack.pop();
    if (i1 <= i0 + 1) continue;
    const a = pts[i0], b = pts[i1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let best = -1, bestD = 0;
    for (let k = i0 + 1; k < i1; k++) {
      const p = pts[k];
      let d2;
      if (len2 < 1e-18) { const ex = p.x - a.x, ey = p.y - a.y; d2 = ex * ex + ey * ey; }
      else {
        const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
        const ex = p.x - (a.x + dx * t), ey = p.y - (a.y + dy * t);
        d2 = ex * ex + ey * ey;
      }
      if (d2 > bestD) { bestD = d2; best = k; }
    }
    if (bestD > t2 && best > 0) { keep[best] = 1; stack.push([i0, best], [best, i1]); }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

// Split any segment longer than `step` — the rib is mapped onto a cupped,
// rolled, possibly crozier-curled surface downstream, and a long chord across
// real curvature facets visibly (the same reason veins are densified).
function densifyFlat(pts, step) {
  if (!(step > 0) || pts.length < 2) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.ceil(d / step);
    for (let j = 1; j < k; j++) out.push({ x: lerp(a.x, b.x, j / k), y: lerp(a.y, b.y, j / k) });
    out.push(b);
  }
  return out;
}

// The boundary's own two y = 0 crossings. A bilaterally symmetric petal outline
// meets its axis exactly twice: once on the base edge, once in the tip region
// (a lobe tip when the lobe count is odd, a sinus floor when it is even).
// Found by walking the loop's OWN edge sequence and interpolating the sign
// change — NOT by a nearest-point search against the base and apex, which picks
// the wrong vertex at high lobe counts where sinus floors come near the axis.
function axisCrossings(loop) {
  const out = [];
  const n = loop.length;
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    const up = a.y <= 0 && b.y > 0, dn = a.y >= 0 && b.y < 0;
    if (!up && !dn) continue;
    const t = a.y / (a.y - b.y);
    out.push({ i, x: a.x + (b.x - a.x) * t });
  }
  return out;
}

// Cut the closed boundary into a +Y half and a -Y half at those two crossings.
// Returns { sides, diag }; sides is null when the loop is degenerate (crossing
// count != 2), in which case the caller falls back to the analytic envelope and
// diag says so rather than shipping a silently wrong rim.
function splitLoopAtAxis(loop) {
  const cr = axisCrossings(loop);
  const diag = { crossings: cr.length, coverage: false, sidePure: false };
  if (cr.length !== 2) return { sides: null, diag };
  const n = loop.length;
  const [c0, c1] = cr[0].x <= cr[1].x ? [cr[0], cr[1]] : [cr[1], cr[0]];   // base cut, apex cut
  // vertices strictly after edge `from`, walked forward to and including the
  // start vertex of edge `to` — the loop's own ordering, no geometry involved.
  const arc = (from, to) => {
    const out = [];
    for (let k = (from.i + 1) % n; ; k = (k + 1) % n) { out.push(loop[k]); if (k === to.i) break; }
    return out;
  };
  const pBase = { x: Math.max(0, c0.x), y: 0 };       // the foot, exactly on the axis
  const pApex = { x: c1.x, y: 0 };
  const A = [pBase, ...arc(c0, c1), pApex];
  const B = [pBase, ...arc(c1, c0).reverse(), pApex];
  // INVARIANT: the two halves cover the loop exactly once — every vertex in
  // exactly one interior, nothing shared but the two cuts. A gap or an overlap
  // here renders convincingly and prints as a seam, so it is asserted, not eyeballed.
  diag.coverage = (A.length + B.length) === (n + 4);
  const span = (arr) => { let lo = Infinity, hi = -Infinity; for (let i = 1; i < arr.length - 1; i++) { if (arr[i].y < lo) lo = arr[i].y; if (arr[i].y > hi) hi = arr[i].y; } return { lo, hi }; };
  const sa = span(A), sb = span(B);
  diag.sidePure = (sa.lo >= -1e-9 && sb.hi <= 1e-9) || (sb.lo >= -1e-9 && sa.hi <= 1e-9);
  if (!diag.coverage || !diag.sidePure) return { sides: null, diag };
  const plus = sa.hi >= sb.hi ? A : B;
  const minus = plus === A ? B : A;
  return { sides: [{ side: 1, points: plus }, { side: -1, points: minus }], diag };
}

const _ribPathCache = new WeakMap();   // keyed on the resolved P object (never mutated in place)

export function ribPath(P) {
  let v = _ribPathCache.get(P);
  if (!v) { v = buildRibPath(P); _ribPathCache.set(P, v); }
  return v;
}

function buildRibPath(P) {
  const L = Math.max(P.L, 1e-4);
  const flareAt = (x) => marginFlareFactor(clamp(x / L, 0, 1), P.bundleTightness, P.flareRate);

  // The SMOOTH boundary: the analytic envelope, sampled the way it always was.
  const analyticLoop = (n) => {
    const right = [], left = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, X = P.L * u, hw = petalHalfWidth(u, P);
      right.push({ x: X, y: hw });
      left.push({ x: X, y: -hw });
    }
    const outline = [];
    for (let i = 0; i < right.length; i++) outline.push(right[i]);
    for (let i = left.length - 1; i >= 0; i--) outline.push(left[i]);
    return dedupePolygon(outline);
  };
  const analyticStrands = (n) => [1, -1].map((side) => {
    const points = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      points.push({ x: P.L * u, y: side * petalHalfWidth(clamp(u, 0, 1), P) * marginFlareFactor(u, P.bundleTightness, P.flareRate) });
    }
    return { points, side };
  });

  const cc = getCleftContour(P);
  const raw = cc && cc.loops.length ? cc.loops[0] : null;
  if (!raw) {
    return {
      clefted: false,
      loop: analyticLoop,
      sides: null,
      strands: analyticStrands,
      outerAt: (u) => petalHalfWidth(clamp(u, 0, 1), P),
      diag: { clefted: false, crossings: 2, coverage: true, sidePure: true, fallback: false },
    };
  }

  // CLEFT: the marching-squares contour of the material mask is the boundary.
  // Match the analytic outline's winding (clockwise / negative shoelace area) so
  // every downstream orientation convention — rim tube, Voronoi cell rings, blade
  // top/bottom faces — stays consistent (outward normals, positive solid volume).
  let loop = raw;
  if (polyArea(loop) > 0) loop = loop.slice().reverse();
  const { sides, diag } = splitLoopAtAxis(loop);
  // A degenerate split falls back to the analytic envelope — which is the OLD
  // pre-#50 behaviour — a rim that skips every sinus — so it must never be
  // silent. Nothing in the shipped cleft
  // range (depth <= 0.6, 2..7 lobes) hits this; if a future outline does, this
  // is the line that says the rim stopped tracing the material.
  if (!sides && typeof console !== 'undefined') {
    console.warn('ribPath: cleft contour split degenerate (crossings=' + diag.crossings
      + ', coverage=' + diag.coverage + ', sidePure=' + diag.sidePure + ') — margin fell back to the envelope');
  }

  // Outer envelope of the ACTUAL boundary, binned in u. For a clefted petal this
  // is what ribCenterline/ribInnerEdge read, so the infill's cap comes from the
  // same curve the rim is lofted along instead of a parallel analytic guess.
  // Binned per EDGE, not per vertex: a marching-squares contour puts a vertex
  // roughly every grid cell, which is coarser than a bin, so per-vertex binning
  // leaves bins whose only vertex sits on a sinus WALL — reporting the envelope
  // there as the sinus depth and clipping the whole lobe away. Spanning each
  // edge across every bin it crosses is resolution-independent.
  const NB = 256;
  const tab = new Float64Array(NB + 1).fill(-1);
  const binOf = (x) => Math.round(clamp(x / L, 0, 1) * NB);
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const ay = Math.max(Math.abs(a.y), Math.abs(b.y));
    let b0 = binOf(a.x), b1 = binOf(b.x);
    if (b0 > b1) { const t = b0; b0 = b1; b1 = t; }
    for (let k = b0; k <= b1; k++) if (ay > tab[k]) tab[k] = ay;
  }
  for (let b = 0; b <= NB; b++) {                       // fill empty bins by linear interpolation
    if (tab[b] >= 0) continue;
    let lo = b - 1; while (lo >= 0 && tab[lo] < 0) lo--;
    let hi = b + 1; while (hi <= NB && tab[hi] < 0) hi++;
    if (lo < 0 && hi > NB) tab[b] = 0;
    else if (lo < 0) tab[b] = tab[hi];
    else if (hi > NB) tab[b] = 0;                       // past the last material: no boundary
    else tab[b] = lerp(tab[lo], tab[hi], (b - lo) / (hi - lo));
  }
  const outerAt = (u) => {
    const f = clamp(u, 0, 1) * NB, i0 = Math.min(NB - 1, Math.floor(f));
    return lerp(tab[i0], tab[i0 + 1], f - i0);
  };

  const cleftStrands = (n) => sides.map(({ side, points }) => {
    const flared = points.map((p) => ({ x: Math.max(0, p.x), y: p.y * flareAt(p.x) }));
    const simp = simplifyPath(flared, L / 400);
    return { points: densifyFlat(simp, L / Math.max(8, n)), side };
  });

  return {
    clefted: true,
    loop: () => loop,                    // the contour's own resolution; n is not a knob here
    sides,
    strands: sides ? cleftStrands : analyticStrands,
    outerAt,
    diag: { clefted: true, ...diag, fallback: !sides },
  };
}

/* -------------------------------------------------------------------
   4b. LOBED / CLEFT petals — a GENERIC scalar mask + marching squares.

   The whole pipeline elsewhere assumes one span of material per height,
   v in [-w(u), +w(u)]. A cleft petal (Silene, Dianthus superbus) breaks that:
   a bifid petal has TWO spans with a gap on the midline. That is topological,
   not an amplitude — so we stop describing the boundary as a function w(u) and
   describe the MATERIAL as a scalar field m(x, y) > 0, then recover the outline
   by marching squares. This machinery is deliberately generic: the mask is any
   scalar field, so the later fused-corolla work unions petal envelopes through
   the SAME contourer and the SAME masked-blade triangulator, written once.

   m(x, y) = min( envelope , min_k cleftGap_k ):
     envelope  = w(u) - |y|                        (>0 inside the smooth outline)
     cleftGap  = signed distance outside a cleft slot: a wedge from a ROUNDED
                 sinus floor at u = 1 - cleftDepth up to (past) the tip, flaring
                 wider toward the tip as cleft depth rises so deep lobes come to
                 points (the "antlers not doily" guard rail).
   Clefts never pass u = 0.4 (depth capped at 0.6), so the petal stays one piece
   joined at the base and the 0-contour is a single closed re-entrant loop. When
   cleftDepth <= 0 none of this runs and the analytic path above is used verbatim
   (byte-identical), so lobing costs nothing until a petal actually has clefts.
   ------------------------------------------------------------------- */

const CLEFT_DEPTH_MAX = 0.6;
const LOBE_MIN = 2, LOBE_MAX = 7;

// Bisect the mask 0-crossing between an inside point a and outside point b.
function maskCrossing(a, b, P, cfg) {
  let lo = a, hi = b;
  for (let it = 0; it < 12; it++) {
    const m = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
    if (petalMask(m.x, m.y, P, cfg) > 0) lo = m; else hi = m;
  }
  return { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
}

/* Clip tube-infill polylines (veins / bone / space-colonization / strands) to the
   material mask, so no strut crosses a cleft. Generic: every infill returns
   { veins:[{points,w0,w1,rad}], nodes }, so one pass handles them all. Each
   polyline is split into the runs that stay inside the mask, with a boundary point
   inserted at each crossing (so a vein ends exactly on the cleft edge, ready for
   edge termination to capture it onto the margin rib). A clipped ribbon is still a
   sealed solid, so watertightness is unaffected. Off (cfg null) returns the input. */
export function clipVeinsToMask(veins, P, cfg) {
  if (!cfg || !veins) return veins;
  const out = [];
  for (const v of veins) {
    const pts = v.points;
    if (!pts || pts.length < 2) continue;
    const n = pts.length;
    const w0 = v.w0 != null ? v.w0 : 1, w1 = v.w1 != null ? v.w1 : w0;
    const wAt = (i) => (n <= 1 ? w0 : lerp(w0, w1, i / (n - 1)));
    let run = [], rw = [];
    const flush = () => {
      if (run.length >= 2) out.push({ points: run, w0: rw[0], w1: rw[rw.length - 1], rad: v.rad });
      run = []; rw = [];
    };
    let prevIn = null;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const inside = petalMask(p.x, p.y, P, cfg) > 0;
      if (inside) {
        if (prevIn === false) { const c = maskCrossing(p, pts[i - 1], P, cfg); run.push(c); rw.push(wAt(i)); }
        run.push(p); rw.push(wAt(i));
      } else {
        if (prevIn === true) { const c = maskCrossing(pts[i - 1], p, P, cfg); run.push(c); rw.push(wAt(i - 1)); flush(); }
      }
      prevIn = inside;
    }
    flush();
  }
  return out;
}

// Resolved cleft geometry (with the guard rails baked in), or null when off.
export function cleftConfig(P) {
  const depth = clamp(P.cleftDepth || 0, 0, CLEFT_DEPTH_MAX);
  if (depth <= 1e-4) return null;
  const count = Math.round(clamp(P.cleftLobes || 2, LOBE_MIN, LOBE_MAX));   // 2..7 lobes
  const width = clamp(P.cleftWidth != null ? P.cleftWidth : 0.3, 0.05, 1);
  // widest half-width (clefts are placed relative to the blade width).
  let Wpeak = 1e-4;
  for (let i = 0; i <= 32; i++) { const w = petalHalfWidth(i / 32, P); if (w > Wpeak) Wpeak = w; }
  const lobePitch = (2 * Wpeak) / count;                 // width budget per lobe
  const halfW0 = clamp(width * lobePitch * 0.45, 0.02, lobePitch * 0.46);   // slot half-width at the floor
  const uFloor = 1 - depth;
  // n-1 cleft centres, spread across the width, bilaterally symmetric.
  const centers = [];
  for (let k = 1; k < count; k++) centers.push(Wpeak * (-1 + (2 * k) / count));
  // Guard rail: lobe tips pointed at high cleft depth. Flare (slot widening toward
  // the tip) grows with both `tip` (a pointed tip => pointed lobes) and cleft depth
  // (deep => forced pointed regardless of tip).
  const tip = clamp(P.tip != null ? P.tip : 0.5, 0, 1);
  const depthNorm = depth / CLEFT_DEPTH_MAX;
  const flare = lerp(lerp(0.15, 1.1, tip), 2.6, depthNorm);
  return { depth, count, centers, halfW0, uFloor, flare, Wpeak, L: Math.max(P.L, 1e-4) };
}

// Signed "outside this cleft slot" distance: >0 kept, <0 removed.
function cleftGap(x, y, c, cfg) {
  const dy = Math.abs(y - c);
  const xFloor = cfg.uFloor * cfg.L;
  if (x <= xFloor) return Math.hypot(xFloor - x, dy) - cfg.halfW0;   // rounded sinus floor
  const t = clamp((x - xFloor) / Math.max(cfg.L * 1.05 - xFloor, 1e-6), 0, 1);
  const hwSlot = cfg.halfW0 * (1 + cfg.flare * t);                    // wedge, wide toward the tip
  return dy - hwSlot;
}

// The material mask in flattened (x = L*u, y = lateral) space. >0 inside material.
export function petalMask(x, y, P, cfg) {
  const u = x / Math.max(P.L, 1e-4);
  let m = petalHalfWidth(clamp(u, 0, 1), P) - Math.abs(y);   // envelope
  if (u < 0) m = Math.min(m, x);                             // base edge
  if (u > 1) m = Math.min(m, P.L - x);                       // tip edge
  if (cfg) for (const c of cfg.centers) { const g = cleftGap(x, y, c, cfg); if (g < m) m = g; }
  return m;
}

// Marching squares over the flattened bbox -> ordered closed loop(s) of the
// m = 0 contour. Returns loops as arrays of {x, y}. For cleft petals (one
// connected region) this is a single re-entrant loop; the generic multi-loop
// return is what the fused-corolla work will use.
// The bbox every flattened-space contour is traced over: the petal's envelope plus a
// pad, so no contour touches the grid edge. Shared by every caller so two contours of
// the same petal are sampled on the SAME lattice (and therefore agree vertex-for-vertex
// where their fields agree), rather than on two independently-derived boxes.
function flatContourBox(P, nu) {
  const L = Math.max(P.L, 1e-4);
  let Wmax = 1e-4;
  for (let i = 0; i <= 64; i++) { const w = petalHalfWidth(i / 64, P); if (w > Wmax) Wmax = w; }
  const padY = Wmax * 0.08 + L / nu;
  return { x0: -L / nu, x1: L + L / nu, y0: -Wmax - padY, y1: Wmax + padY, L, Wmax };
}

// Marching squares over ANY scalar field on a flattened bbox -> ordered closed loop(s)
// of its zero contour, largest first. This is the file's one contourer: maskContours
// passes petalMask (the material outline) and ribInsetBound passes the rib-inset level
// set (section 4a-iii). Adding a THIRD contour means passing a third field here, not
// writing a third marching-squares loop beside this one.
function contourField(field, box, nu) {
  const { x0, x1, y0, y1 } = box;
  const dx = (x1 - x0) / nu;
  const nv = Math.max(8, Math.round((y1 - y0) / dx));
  const dy = (y1 - y0) / nv;
  const gx = (i) => x0 + i * dx, gy = (j) => y0 + j * dy;
  // sample the field on the (nu+1) x (nv+1) lattice
  const val = new Float64Array((nu + 1) * (nv + 1));
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) val[j * (nu + 1) + i] = field(gx(i), gy(j));
  const V = (i, j) => val[j * (nu + 1) + i];
  // interpolated zero-crossing on a cell edge between corners a (va) and b (vb)
  const lerpEdge = (xa, ya, va, xb, yb, vb) => {
    const t = va / (va - vb);
    return { x: xa + (xb - xa) * t, y: ya + (yb - ya) * t };
  };
  const segs = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const x0c = gx(i), x1c = gx(i + 1), y0c = gy(j), y1c = gy(j + 1);
    const v00 = V(i, j), v10 = V(i + 1, j), v11 = V(i + 1, j + 1), v01 = V(i, j + 1);
    let code = 0;
    if (v00 > 0) code |= 1; if (v10 > 0) code |= 2; if (v11 > 0) code |= 4; if (v01 > 0) code |= 8;
    if (code === 0 || code === 15) continue;
    // edge midpoints (interpolated): bottom, right, top, left
    const eB = () => lerpEdge(x0c, y0c, v00, x1c, y0c, v10);
    const eR = () => lerpEdge(x1c, y0c, v10, x1c, y1c, v11);
    const eT = () => lerpEdge(x1c, y1c, v11, x0c, y1c, v01);
    const eL = () => lerpEdge(x0c, y1c, v01, x0c, y0c, v00);
    const push = (a, b) => segs.push([a, b]);
    switch (code) {
      case 1: case 14: push(eL(), eB()); break;
      case 2: case 13: push(eB(), eR()); break;
      case 3: case 12: push(eL(), eR()); break;
      case 4: case 11: push(eR(), eT()); break;
      case 6: case 9:  push(eB(), eT()); break;
      case 7: case 8:  push(eT(), eL()); break;
      case 5:  push(eL(), eT()); push(eB(), eR()); break;   // saddle
      case 10: push(eL(), eB()); push(eR(), eT()); break;   // saddle
    }
  }
  // Stitch segments into ordered loops by endpoint welding. Adjacency stores segment
  // INDICES (not references), so the walk is O(1) per step -> O(n) overall (an earlier
  // segs.indexOf here made it O(n^2) and stalled fringed petals).
  const key = (p) => `${Math.round(p.x / (dx * 0.25))}_${Math.round(p.y / (dy * 0.25))}`;
  const adj = new Map();
  const add = (k, si, endIsA) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push({ si, endIsA }); };
  for (let si = 0; si < segs.length; si++) { add(key(segs[si][0]), si, true); add(key(segs[si][1]), si, false); }
  const used = new Uint8Array(segs.length);
  const loops = [];
  for (let start = 0; start < segs.length; start++) {
    if (used[start]) continue;
    const loop = [];
    let curIdx = start, fromA = true;
    while (curIdx >= 0 && !used[curIdx]) {
      used[curIdx] = 1;
      const cur = segs[curIdx];
      const a = fromA ? cur[0] : cur[1], b = fromA ? cur[1] : cur[0];
      loop.push(a);
      const nbrs = adj.get(key(b)) || [];
      let nextIdx = -1, nextFromA = true;
      for (const e of nbrs) { if (!used[e.si]) { nextIdx = e.si; nextFromA = e.endIsA; break; } }
      curIdx = nextIdx; fromA = nextFromA;
    }
    if (loop.length >= 3) loops.push(dedupePolygon(loop));
  }
  loops.sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)));
  return loops;
}

export function maskContours(P, cfg, nu = 160) {
  return contourField((x, y) => petalMask(x, y, P, cfg), flatContourBox(P, nu), nu);
}

// Memoized contour + config accessor, so a multi-petal whorl of the same shape
// solves the mask/marching-squares once, not per petal (buildSilhouette, the field
// solve, and the vein clip all share it). Keyed on the outline params.
const _cleftCache = new Map();
export function getCleftContour(P) {
  const cfg = cleftConfig(P);
  if (!cfg) return null;
  const k = [P.L, P.W, P.taper, P.tip, P.edgeCurve, P.clawLength || 0, P.clawWidth || 0, P.shoulder || 0,
    P.cleftDepth || 0, P.cleftLobes || 0, P.cleftWidth || 0].join('|');
  let v = _cleftCache.get(k);
  if (!v) {
    v = { cfg, loops: maskContours(P, cfg, 200) };
    _cleftCache.set(k, v);
    if (_cleftCache.size > 24) _cleftCache.delete(_cleftCache.keys().next().value);
  }
  return v;
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

/* Laplace flow field for LOBED petals (dependency the analytic T stub named at
   ~L550). A lobed petal has no single w(u), so the analytic outline-slope T is
   undefined — instead solve a harmonic scalar h on the material mask:
     Dirichlet  h = 0 on the base edge, h = 1 on every lobe tip;
     Neumann    no-flux on every side boundary, INCLUDING cleft walls (enforced by
                relaxing only inside cells against inside neighbours);
     T = normalize(grad h)  -> fans up each lobe independently, tangent along the
                              cleft walls. SOR on a coarse grid (h is smooth), then
                              bilinearly sampled. Built only when clefts are present. */
function solveLaplaceT(P, cfg) {
  const L = Math.max(P.L, 1e-4);
  let Wmax = 1e-4;
  for (let i = 0; i <= 64; i++) { const w = petalHalfWidth(i / 64, P); if (w > Wmax) Wmax = w; }
  const NX = 150;
  const dx = L / (NX - 1);
  const NY = Math.max(12, Math.round((2 * Wmax) / dx) + 1);
  const dy = (2 * Wmax) / (NY - 1);
  const N = NX * NY;
  const X = (i) => i * dx, Y = (j) => -Wmax + j * dy;
  const inside = new Uint8Array(N), fixed = new Uint8Array(N);
  const h = new Float64Array(N);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = X(i), y = Y(j);
    if (petalMask(x, y, P, cfg) > 0) {
      inside[k] = 1;
      const u = x / L;
      if (u <= 0.02) { fixed[k] = 1; h[k] = 0; }
      else if (u >= 0.985) { fixed[k] = 1; h[k] = 1; }
      else h[k] = u;                                   // initial guess
    }
  }
  const omega = 1.85;
  for (let it = 0; it < 800; it++) {
    let maxd = 0;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      if (!inside[k] || fixed[k]) continue;
      const hc = h[k];
      const nR = (i + 1 < NX && inside[k + 1]) ? h[k + 1] : hc;      // Neumann: mirror -> zero flux
      const nL = (i - 1 >= 0 && inside[k - 1]) ? h[k - 1] : hc;
      const nU = (j + 1 < NY && inside[k + NX]) ? h[k + NX] : hc;
      const nD = (j - 1 >= 0 && inside[k - NX]) ? h[k - NX] : hc;
      const nv = hc + omega * ((nR + nL + nU + nD) / 4 - hc);
      const d = Math.abs(nv - hc); if (d > maxd) maxd = d;
      h[k] = nv;
    }
    if (maxd < 1e-5) break;
  }
  const hAt = (i, j) => { const k = j * NX + i; return inside[k] ? h[k] : null; };
  return {
    sample(x, y) {
      const fi = clamp(x / dx, 0, NX - 1.001), fj = clamp((y + Wmax) / dy, 0, NY - 1.001);
      const i0 = Math.floor(fi), j0 = Math.floor(fj);
      const hc = hAt(i0, j0);
      const c = hc != null ? hc : (x / L);
      const gx = ((hAt(Math.min(i0 + 1, NX - 1), j0) ?? c) - (hAt(Math.max(i0 - 1, 0), j0) ?? c)) / (2 * dx);
      const gy = ((hAt(i0, Math.min(j0 + 1, NY - 1)) ?? c) - (hAt(i0, Math.max(j0 - 1, 0)) ?? c)) / (2 * dy);
      const l = Math.hypot(gx, gy) || 1;
      return { tx: gx / l, ty: gy / l };
    },
  };
}

export function computePetalFields(P) {
  const L = Math.max(P.L, 1e-4);
  const cc = getCleftContour(P);              // LOBED: mask-aware inside / d / T when present
  const cfg = cc ? cc.cfg : null;
  const lap = cfg ? solveLaplaceT(P, cfg) : null;
  const cleftLoop = cc ? (cc.loops[0] || null) : null;
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
  if (cleftLoop) {
    // LOBED: the true material boundary (margins + base + every cleft wall) is the
    // mask contour, so d measures distance to the nearest lobe/cleft edge.
    for (const p of cleftLoop) pushSite(p.x, p.y);
  } else {
    for (let i = 0; i <= NU; i++) {
      pushSite(env[i].x,  env[i].y);   // +Y margin
      pushSite(env[i].x, -env[i].y);   // -Y margin (mirror)
    }
    const hw0 = petalHalfWidth(0, P);
    for (let j = 0; j <= 24; j++) pushSite(0, lerp(-hw0, hw0, j / 24));  // base edge
  }

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
      inside[j * NX + i] = cfg
        ? (petalMask(x, y, P, cfg) > 0 ? 1 : 0)                        // LOBED: mask
        : ((u >= 0 && u <= 1 && Math.abs(y) <= petalHalfWidth(clamp(u, 0, 1), P)) ? 1 : 0);
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
      // T: analytic outline-slope for a plain petal; the Laplace solve for a lobed
      // one (the analytic form needs a single w(u), which a lobed petal lacks).
      const t = lap ? lap.sample(x, y) : petalFlowDirection(y, x / L, P);
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
    P.cleftDepth || 0, P.cleftLobes || 0, P.cleftWidth || 0,                    // outline (lobed/cleft)
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
    // ribInnerEdge, not petalHalfWidth: under continuous margin the rib's real inner
    // edge sits well inside the true outline (a tapering, base-bundled strand, not a
    // hoop on the outline) — growing veins out to the raw outline overshot past where
    // the rib tube actually sits, the same class of mismatch Voronoi/Growth had.
    const marg = ribInnerEdge(clamp(x / L, 0, 1), P);
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

  // CONTINUOUS MARGIN: root the whole tree at the FOOT node (u=0, y=0) so the midrib
  // and both marginal strands leave the same point as a bundle, instead of the midrib
  // starting a little up the blade with a separate closed-loop rim hooped around it.
  const cont = !!opts.continuousMargin;

  // --- 1. MIDRIB — the single dominant vein, on the axis, thickest, tapering
  //         strongly base -> tip. Added once, never mirrored. In continuous mode it is
  //         rooted at the foot (u=0) so it reaches the junction. ---
  const uBase = cont ? 0.0 : 0.02, uApex = 0.985, nMid = 30;
  const midrib = [];
  for (let i = 0; i <= nMid; i++) midrib.push({ x: L * lerp(uBase, uApex, i / nMid), y: 0 });
  veins.push({ points: midrib, w0: VEIN_MIDRIB_BASE, w1: VEIN_MIDRIB_TIP });
  nodes.push({ x: midrib[0].x, y: 0, width: VEIN_MIDRIB_BASE });
  nodes.push({ x: midrib[nMid].x, y: 0, width: VEIN_MIDRIB_TIP });

  // NOTE: the continuous MARGINAL STRANDS (the two edge traces rooted at the foot, the
  // replacement for the closed-loop rim) are generated in the render layer's
  // marginStrands() helper — see flower.js — because they must ride the SAME surface
  // mapping as the rim they replace and hand their foot roots to the receptacle. They
  // trace the outline y = ±halfWidth(u), so LOOP arcades still fuse onto them exactly as
  // they fused onto the old rim. Here we only re-root the midrib at the foot.

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
  // inside the blade, kept off the rim so branches stop short and the margin
  // rib / termination owns the edge: the real bound is ribInnerEdge(u, P) — the
  // rib's actual inner edge, the same curve Voronoi/Veins-termination clip to —
  // not a flat 0.05-world-unit band (which was constant regardless of how fat
  // or thin the rib tube actually is at that u). `d` (Euclidean distance to the
  // nearest true-outline/cleft-wall site) is kept only for its original job —
  // staying off a cleft wall on lobed petals — at a small epsilon now that the
  // margin band itself is owned by ribInnerEdge.
  const inside = (x, y) => {
    const u = x / L; if (u <= 0.012 || u >= 0.99) return false;
    if (Math.abs(y) >= ribInnerEdge(u, P)) return false;
    return fields.sample(x, y).d > 1e-3;
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
  // Hard cap on this ONE petal's network — the only sub-step whose output can't be
  // known ahead of time (it's a simulation, not a formula), so it can only be bounded
  // by interrupting it, not by predicting it. flower.js derives this from the actual
  // live/export triangle budget (#44) via a fixed nodes->triangles conversion; the
  // 60000 fallback below only matters for a caller that doesn't pass one.
  const nodeBudget = opts.nodeBudget || 60000;
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
    P.cleftDepth || 0, P.cleftLobes || 0, P.cleftWidth || 0,
    P.petalCup || 0, P.edgeProfile || 0, P.bloom, P.curl,
    P.tipStyle, P.tipLength || 0, P.tipFrequency || 0, P.edgeNoise || 0, P.edgeNoiseScale || 0,
    // nodeBudget is IN the key (not just a perf knob): flower.js now derives it from
    // the live/export triangle budget (#44), so the same shape+seed+sourceCount can
    // legitimately resolve to two different networks depending on which budget is
    // asking — caching past that would silently hand one path the other's result.
    seed, opts.mode, opts.sourceCount, opts.birthDist, opts.killDist, opts.growthStep, opts.seedPattern, opts.nodeBudget,
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
      // Terminates at the rib's actual inner edge (ribInnerEdge), not the true
      // outline (hw) — otherwise the strand tip runs out past where the rib
      // tube actually sits under continuous margin.
      y: lerp(side * ribInnerEdge(uE, P), 0, cz),           // pulled onto the axis at the apex
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
      const room = ribInnerEdge(u, P);   // keep inside the rib's actual inner edge, not the raw outline
      if (Math.abs(y) > room * 0.999) y = Math.sign(y) * room * 0.999;
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
  const apexR = Math.min(rBase, ribInnerEdge(uApex, P) * 0.7);
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
        // `reach` and the safety cap are fractions of ribInnerEdge, not the raw
        // half-width: the rib's real inner edge tapers/bundles independently of
        // hw(u) under continuous margin, so a hw-relative reach drifted from it
        // exactly like Voronoi's old constant inset did.
        const cap = ribInnerEdge(uu, P);
        const y = s * reach * f * cap;
        pts[i] = { x: L * uu, y: Math.abs(y) > cap ? s * cap : y };
      }
      veins.push({ points: pts, w0: ribW, w1: wTip });
    }
    nodes.push({ x: L * uk, y: 0, width: ribW * 1.05 });   // welded joint where the ribs meet the spine
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
// The seed's anisotropy metric is a symmetric 2x2 M = {m00, m01, m11}. The cell is
// clipped by the bisector under that metric: 2 M (t-s) . p = tᵀMt - sᵀMs. For the
// isotropic/global case M = diag(1, a2) this reduces EXACTLY to the original y-weighted
// formula (byte-identical). For a lobed petal M is built per seed from the LOCAL flow
// T (see anisoMetric), so cells elongate along each lobe's own direction — the fix for
// the global-axis approximation that expired once one petal points several ways.
function voronoiCell(s, seeds, sil, M) {
  const m00 = M.m00, m01 = M.m01, m11 = M.m11;
  const sMs = m00 * s.x * s.x + 2 * m01 * s.x * s.y + m11 * s.y * s.y;
  let cell = sil;
  for (const t of seeds) {
    if (t === s) continue;
    const dxs = t.x - s.x, dys = t.y - s.y;
    const tMt = m00 * t.x * t.x + 2 * m01 * t.x * t.y + m11 * t.y * t.y;
    cell = clipHalfPlane(cell, 2 * (m00 * dxs + m01 * dys), 2 * (m01 * dxs + m11 * dys), sMs - tMt);
    if (cell.length < 3) return null;
  }
  return cell;
}

// Anisotropy metric M = T Tᵀ + a2 N Nᵀ (T unit flow dir, N its perpendicular):
// weight 1 ALONG the flow, a2 ACROSS it, so cells elongate along T. T = (1,0)
// gives diag(1, a2), the original global-axis behaviour.
function anisoMetric(Tx, Ty, a2) {
  const c = Tx, s = Ty;
  return { m00: c * c + a2 * s * s, m01: c * s * (1 - a2), m11: s * s + a2 * c * c };
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


/* -------------------------------------------------------------------
   VORONOI'S PARTITION — one diagram per lobe, over the material inside the rib.

   On a smooth petal the cells are one Voronoi diagram over one bound and this
   whole section is inert: buildPartition returns a single region whose subject is
   ribClipPolygon, which is what buildVoronoi clipped against before it existed.

   On a CLEFTED petal one diagram over one bound is the defect. The bound Voronoi
   used spans every sinus, so a cell reaches across a slot and the printed blade
   carries a strut through the gap between two lobes (17 such cells on `lobed`).
   Clipping harder does not fix it — the cell is legitimately the nearest region to
   its seed; it is the DIAGRAM that has to stop at the lobe.

   THE DIVIDERS RUN WITH THE STRUCTURE, NOT ACROSS IT. Each divider follows its
   cleft slot down to that slot's own sinus floor, then continues as a ray from the
   petal's foot through the floor point:

     y_k(x) = centers[k]                     for x >= xFloor   (along the slot)
            = centers[k] * x / xFloor        for x <  xFloor   (ray from the foot)

   Continuous at xFloor by construction, and radial everywhere — so there is no
   separate basal region to invent: each lobe owns its own wedge of the base. A
   straight cut was measured first and rejected (18 crossings against today's 17);
   it runs across a radial structure.

   EXACTLY TWO CONVEX PIECES PER REGION, and this is derived rather than chosen.
   y_k is min(c*x/xFloor, c), a min of two linear functions, hence CONCAVE. Keeping
   BELOW one is `y <= L1 AND y <= L2` — an intersection of half-planes, convex.
   Keeping ABOVE one is `y >= L1 OR y >= L2` — a union, with exactly ONE reflex
   corner, at x = xFloor. Splitting there yields two pieces that are pure half-plane
   intersections, so clipHalfPlane — already in this file, and exact — suffices and
   no bisecting divider-clip is needed. An earlier attempt wrote one; it was not
   merely unnecessary but wrong, because it assumes a subject edge crosses the
   divider once and a straight edge can cross a piecewise-linear divider twice.

   This is also why NO GENERAL POLYGON CLIPPER is pulled in. Sutherland-Hodgman
   constrains the CLIP, not the SUBJECT — voronoiCell already relies on that, since
   every clip it applies is a half-plane — so the subject may be as concave as the
   traced bound is.

   HALF-SPACE MIRRORING. The partition is built on the +Y half and mirrored. This
   is not an optimisation: it is what makes the result bilaterally symmetric. For an
   EVEN lobe count cleftConfig places a cleft centre at exactly y = 0, and a strict
   `p.y > dividerY(...)` test drops every axis seed (pinned to y = 0) to one side —
   measured on the prototype as 13 seeds against 7 on the shipped default, a visibly
   denser pattern on one half of a petal whose own relaxation block promises
   symmetry. Mirroring does not HANDLE that case; the y = 0 divider becomes the
   half-space boundary and the case stops existing. Measured skew: exactly 0.

   Its cost, which is a LOOK question and not a correctness one: a cell that used to
   straddle y = 0 as one cell becomes two cells meeting at the midline, so each axis
   seed gains a short wall down the blade's midline. Off-axis cells already met their
   mirrors there, so nothing else changes.
   ------------------------------------------------------------------- */

// Rejoin one cell's two convex pieces across the split line x = xSplit. They are not
// arbitrary polygons: both are Sutherland-Hodgman outputs of the SAME subject under the
// SAME half-planes, and the two regions' constraints coincide exactly on the line
// (c * xFloor / xFloor = c), so the pieces share an identical edge there by construction.
// That is what makes this a splice rather than a union: walk one from just past the shared
// edge all the way round, then the other likewise. Returns null when the pieces do not
// present exactly one matching edge each — the caller counts that and keeps both pieces
// rather than dropping either, so a fallback costs a seam, never material.
function touchesSplit(poly, xSplit, eps) {
  for (const p of poly) if (Math.abs(p.x - xSplit) < eps) return true;
  return false;
}

function rejoinAtSplit(A, B, xSplit, eps) {
  const edgesOn = (poly) => {
    const hits = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (Math.abs(a.x - xSplit) < eps && Math.abs(b.x - xSplit) < eps
          && Math.abs(a.y - b.y) > eps) hits.push(i);
    }
    return hits;
  };
  const ea = edgesOn(A), eb = edgesOn(B);
  if (ea.length !== 1 || eb.length !== 1) return null;
  const ia = ea[0], ib = eb[0];
  const a0 = A[ia], a1 = A[(ia + 1) % A.length];
  let Bw = B, jb = ib;
  let b0 = Bw[jb], b1 = Bw[(jb + 1) % Bw.length];
  // The shared edge is traversed in OPPOSITE directions when both pieces carry the same
  // winding. If it is traversed the same way the pieces wind oppositely, so reverse one.
  if (!(Math.abs(a0.y - b1.y) < eps && Math.abs(a1.y - b0.y) < eps)) {
    if (Math.abs(a0.y - b0.y) < eps && Math.abs(a1.y - b1.y) < eps) {
      Bw = B.slice().reverse();
      const eb2 = edgesOn(Bw);
      if (eb2.length !== 1) return null;
      jb = eb2[0]; b0 = Bw[jb]; b1 = Bw[(jb + 1) % Bw.length];
      if (!(Math.abs(a0.y - b1.y) < eps && Math.abs(a1.y - b0.y) < eps)) return null;
    } else return null;
  }
  const out = [];
  for (let k = 1; k <= A.length; k++) out.push(A[(ia + k) % A.length]);
  for (let k = 1; k <= Bw.length; k++) out.push(Bw[(jb + k) % Bw.length]);
  const joined = dedupePolygon(out);
  return joined.length >= 3 ? joined : null;
}

// Resolve the partition for one petal: which region each seed belongs to, and the convex
// subject pieces each region is clipped against. ONE definition of "this seed's cell",
// read by relaxation, both culls and emission alike — those were three near-copies of the
// same voronoiCell call, and a partition that only the emission step knew about would
// relax seeds across dividers it was built to respect.
function buildPartition(P, cfg) {
  const islands = ribInsetBound(P);
  // ribClipPolygon returns null when the rib covers the entire petal; the untrimmed
  // polyline is the same fallback buildVoronoi used before, and every cell is culled as
  // zero-area there either way.
  const bounds = islands.length ? islands
    : (() => { const f = ribMarginPolyline(P, 72); return f ? [f] : []; })();

  if (!cfg) {
    return {
      clefted: false, mirrorAll: false, regionCount: 1, bounds,
      regionOf: () => 0,
      pieces: () => bounds.map((b) => [b, null]),
      diag: { regions: 1, islands: bounds.length, fallbacks: 0, skew: 0 },
    };
  }

  const xFloor = cfg.uFloor * cfg.L;
  // Only the +Y dividers exist in the half-space build; the y = 0 one (even lobe counts)
  // IS the half-space boundary. Ascending, so region j sits between div j-1 and div j.
  const pos = cfg.centers.filter((c) => c > 1e-12).sort((a, b) => a - b);
  const regionCount = pos.length + 1;
  const dividerY = (c, x) => (x >= xFloor ? c : c * x / Math.max(xFloor, 1e-9));
  const regionOf = (p) => {
    let k = 0;
    for (const c of pos) if (p.y > dividerY(c, p.x)) k++;
    return k;
  };
  // Region j clipped to the +Y half and split at x = xFloor into its two convex pieces.
  //   piece A (x <= xFloor): between two rays through the foot — both linear
  //   piece B (x >= xFloor): between two horizontals            — both linear
  //
  // CLIP ORDER IS LOAD-BEARING, and it is the one thing about this route that reading
  // could not settle. THE WHOLE SENTENCE, because the half of it that circulates is the
  // half that misleads: "Sutherland-Hodgman constrains the CLIP, not the SUBJECT" is true
  // of the clip's convexity — a concave subject really is fine — and NOT of the result: SH returns a single vertex ring, so
  // when the intersection is genuinely DISCONNECTED it comes back with the components
  // joined by degenerate bridge edges running along the clip line. `bound ∩ {x >= xFloor}`
  // is exactly that case — it is the n lobes, n separate pieces — and clipping in that
  // order laid a bridge along x = xFloor straight across every slot. Measured before the
  // reorder: region polygons reaching 1.716 mm into removed material, every offending
  // vertex at exactly u = uFloor, while the bound itself measured 0.000 mm.
  //
  // So each piece applies the constraint that ISOLATES ONE LOBE first, and only then the
  // split. A takes x <= xFloor first (the base, one piece) and then its rays; B takes its
  // horizontal band first (lobe j plus the base below it, one piece) and then x >= xFloor.
  // Both intersections are connected at every step, so no bridge is ever created.
  const pieces = (j) => bounds.map((b) => {
    const lo = j > 0 ? pos[j - 1] : 0;                 // lower divider (0 = the midline)
    const hi = j < pos.length ? pos[j] : null;         // upper divider, or the outer edge
    let A = clipHalfPlane(b, 1, 0, -xFloor);           // x <= xFloor  (the base: connected)
    if (lo > 0) A = clipHalfPlane(A, lo / xFloor, -1, 0); else A = clipHalfPlane(A, 0, -1, 0);
    if (hi != null) A = clipHalfPlane(A, -hi / xFloor, 1, 0);
    let B = clipHalfPlane(b, 0, -1, lo);               // y >= lo  (the band: connected)
    if (hi != null) B = clipHalfPlane(B, 0, 1, -hi);   // y <= hi
    B = clipHalfPlane(B, -1, 0, xFloor);               // x >= xFloor, last
    return [A && A.length >= 3 ? A : null, B && B.length >= 3 ? B : null];
  });

  return {
    clefted: true, mirrorAll: true, regionCount, bounds, xFloor,
    regionOf, pieces,
    diag: { regions: regionCount, islands: bounds.length, fallbacks: 0, skew: 0 },
  };
}

export function buildVoronoi(P, rng, opts = {}) {
  const density = clamp(Math.round(opts.density || 7), 3, 12);
  const perHalf = Math.round(lerp(9, 34, (density - 3) / 9));   // off-axis seeds in the +Y half
  const sil = buildSilhouette(P, 72);
  const margin = (u) => petalHalfWidth(clamp(u, 0, 1), P);
  // ONE definition of "is this point in the material", read by BOTH seed samplers.
  //
  // They used to disagree. The off-axis sampler tested this silhouette, which is
  // cleft-aware; the axis sampler tested `margin(x/P.L)` — petalHalfWidth, the ENVELOPE,
  // which has no cleft term and spans every sinus. For an EVEN lobe count cleftConfig
  // places a cleft centre at exactly y = 0, a slot down the midline, and the axis seeds
  // are pinned to y = 0 — straight down the middle of it. Measured before this fix:
  // 5 of 8 axis seeds inside removed material on both LOBED 2 and LOBED 4 (the shipped
  // default), masks reaching -0.398; LOBED 7, odd, had none.
  //
  // `margin(...) < minHW` stays in both samplers, but it is a WIDTH FLOOR, not a material
  // test, and it was never able to answer the question the axis sampler was asking it.
  const inMaterial = (x, y) => pointInPoly(x, y, sil);
  const xLo = P.L * 0.05, xHi = P.L * 0.96;
  const minHW = 0.06;
  const axisGap = 0.05 * P.W;                       // min |y| for an off-axis seed

  // Shared-grammar controls — every one defaults to the ORIGINAL isotropic/uniform
  // look, so a design that omits them is byte-identical.
  const aniso     = clamp(opts.anisotropy != null ? opts.anisotropy : 1, 1, 4);
  const a2        = aniso * aniso;                       // y-weight in the Voronoi metric
  // Per-seed anisotropy metric. Plain petal (or isotropic): the global diag(1, a2)
  // for every seed (byte-identical to the original). LOBED + anisotropic: the metric
  // is built from the LOCAL Laplace flow T at each seed, so cells elongate along each
  // lobe's own direction instead of one global axis (dependency 2, per-point T-metric).
  const cleftCfg  = cleftConfig(P);
  const flowField = (cleftCfg && aniso > 1) ? getPetalFields(P) : null;
  const globalM   = anisoMetric(1, 0, a2);
  const metricFor = (s) => { if (!flowField) return globalM; const t = flowField.sample(s.x, s.y); return anisoMetric(t.Tx, t.Ty, a2); };
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
        if (!inMaterial(x, 0)) continue;                 // the cleft slot, on an even lobe count
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
        if (!inMaterial(x, y)) continue;
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
  //     Every pass — including lloyd = 0's single pass — clips cells to
  //     ribMarginPolyline(P): the rib's ACTUAL inner edge (see flower-geometry.js's
  //     "THE MARGIN RIB" section), not a guessed inward offset. lloyd >= 1 additionally
  //     relaxes site -> centroid against that same boundary that many times, so outer
  //     cells align their edges with it instead of just being severed by it once.
  //     Previously this was `offsetPolygonInward(sil, VORONOI_MARGIN_INSET*2*Wmax)` —
  //     a constant inset unrelated to the rib's actual (tapering, base-bundled) radius,
  //     which is why the gap between rib and cells varied around the perimeter and
  //     the rib crossed over the cells near the base. Symmetry-preserving — axis seeds
  //     pinned to y = 0, +Y seeds stay off-axis, -Y twins rebuilt from the +Y set each
  //     pass. ---
  const lloyd = clamp(Math.round(opts.lloyd != null ? opts.lloyd : 0), 0, 20);
  // THE PARTITION (see buildPartition above). On a smooth petal this is one region whose
  // subject is ribClipPolygon — exactly what this line used to read — so nothing below
  // changes for a design without clefts. On a clefted one it is a diagram per lobe over
  // the material INSIDE the rib, built on the +Y half and mirrored.
  const part = buildPartition(P, cleftCfg);
  let rejoinFallbacks = 0, disjointPieces = 0;
  // Seeds grouped by region: a cell's neighbours are its own region's seeds, which is
  // what makes this a partition rather than a harder clip. Rebuilt each time the seed set
  // moves, so relaxation and the culls read the same grouping emission does.
  const groupSeeds = () => {
    const g = new Map();
    for (const s of axis) { const r = part.regionOf(s); if (!g.has(r)) g.set(r, []); g.get(r).push(s); }
    for (const s of half) { const r = part.regionOf(s); if (!g.has(r)) g.set(r, []); g.get(r).push(s); }
    return g;
  };
  // ONE definition of this seed's cell(s). Returns a list because a region can be clipped
  // against more than one island (a deeply-lobed petal's rib-inset material separates —
  // see ribInsetBound) and because a rejoin fallback keeps both pieces rather than losing
  // material. On a smooth petal it is a single voronoiCell call against a single polygon,
  // byte-identical to what the three call sites below each did separately.
  const SPLIT_EPS = 1e-9;
  const cellsFor = (s, peers) => {
    const M = metricFor(s);
    const out = [];
    for (const [A, B] of part.pieces(part.regionOf(s))) {
      if (!part.clefted) { const c = A ? voronoiCell(s, peers, A, M) : null; if (c) out.push(c); continue; }
      const cA = A ? voronoiCell(s, peers, A, M) : null;
      const cB = B ? voronoiCell(s, peers, B, M) : null;
      if (cA && cB) {
        const j = rejoinAtSplit(cA, cB, part.xFloor, SPLIT_EPS);
        if (j) out.push(j);
        else {
          // A cell that touches the split line on BOTH sides and still would not splice is
          // a real failure. One that does not touch it on both sides is two genuinely
          // disjoint parts of one cell — the traced bound is concave, so a cell can be
          // disconnected — and keeping both is correct, not a fallback.
          if (touchesSplit(cA, part.xFloor, SPLIT_EPS) && touchesSplit(cB, part.xFloor, SPLIT_EPS)) rejoinFallbacks++;
          else disjointPieces++;
          out.push(cA); out.push(cB);
        }
      } else if (cA) out.push(cA);
      else if (cB) out.push(cB);
    }
    return out;
  };
  // The cell used where a single polygon is wanted (relaxation's centroid, the area
  // culls): the largest piece, which on every non-fallback config IS the whole cell.
  const cellOf = (s, peers) => {
    const cs = cellsFor(s, peers);
    if (!cs.length) return null;
    let best = cs[0], bestA = Math.abs(polyArea(cs[0]));
    for (let i = 1; i < cs.length; i++) { const a = Math.abs(polyArea(cs[i])); if (a > bestA) { bestA = a; best = cs[i]; } }
    return best;
  };
  const passes = lloyd === 0 ? 1 : lloyd;
  //     CONSTRAINED TO THE MATERIAL, not merely to the bound. The clip polygon is the
  //     rib's inner edge, an envelope band that spans every sinus, so a cell's centroid can
  //     sit in REMOVED material and relaxation would move the seed there. That is a second,
  //     independent route to the same defect as the axis sampler's envelope test, and it
  //     reaches configs the sampler fix cannot: LOBED 7 is odd, has no slot on the axis, and
  //     placed no seed in the void — yet ended with 6 there, all of them relaxed in. It
  //     applies at lloyd = 0 too, because that is still one relaxation pass. A move that
  //     leaves the material is refused and the seed stays where it was. ---
  for (let iter = 0; iter < passes; iter++) {
    // ONE snapshot per pass, not one per seed. fullSeeds() rebuilds each -Y twin as a
    // fresh object from its +Y seed's CURRENT position, so calling it per seed would let a
    // twin see moves made earlier in the same pass while the +Y seeds (live references)
    // always did — turning a Jacobi pass into a half-Gauss-Seidel one. Measured as a
    // 1.1e-14 vertex drift on 10 of 96 smooth configs, which is small and is still a
    // change to relaxation that nothing asked for.
    const G = groupSeeds();
    const snapshot = fullSeeds();
    const peers = (s) => (part.clefted ? (G.get(part.regionOf(s)) || [s]) : snapshot);
    for (const s of axis) {
      const cell = cellOf(s, peers(s));
      if (!cell) continue;
      const c = polyCentroid(cell), nx = clamp(c.x, xLo, xHi);
      if (inMaterial(nx, 0)) { s.x = nx; s.y = 0; }
    }
    for (const s of half) {
      const cell = cellOf(s, peers(s));
      if (!cell) continue;
      const c = polyCentroid(cell), nx = clamp(c.x, xLo, xHi), ny = Math.max(axisGap, c.y);
      if (inMaterial(nx, ny)) { s.x = nx; s.y = ny; }
    }
  }

  // --- TWO CULLS, DELIBERATELY SEPARATE. Conflating them destroys designs.
  //
  //     (a) DEGENERATE CELLS — unconditional, and the actual defect. buildVoronoi emits
  //     cells whose ring has signedArea EXACTLY 0: on a plain ROUNDED petal at defaults, a
  //     21-edge polyline collapsed onto y = 0. cellAnnulus lofts each into zero-area
  //     triangles and its hole cannot be inside a cell with no inside. Whatever produces
  //     one (an axis-seed artifact, here) is a separate question from whether zero-area
  //     geometry should reach the exporter. It should not, under any cause, so this floor
  //     is not conditional on anything. The threshold is geometric degeneracy, not a
  //     printability judgement: the smallest legitimate cell in the matrix is 0.069 mm^2
  //     and these are exactly 0, so there is no boundary to tune.
  //
  //     (b) THE MINIMUM CELL SIZE floor — a printability feature for the density law and
  //     anisotropy, which can drive cells thin enough to be fragile. It stays gated on
  //     those two, and here is why, measured rather than assumed: un-gating it takes
  //     `chrysanthemum__voronoi` from 42 cells to 4, culling 24. That is not a floor
  //     catching noise (every other config culls 1-5), it is the floor eating the design —
  //     a dense bloom's cells are legitimately small, and `minCellSize` is sized for
  //     struts, not for them. Un-gating this was the obvious reading of "the guard is off
  //     where it is needed" and it is the wrong one; only (a) was ever the defect.
  //
  //     `culled` is returned and reported per config by the gate, so both stay visible as
  //     numbers rather than as a claim in a comment.
  //     Mirrored seeds are culled with their +Y twin. ---
  let culled = 0, culledDegenerate = 0;
  const minCell = opts.minCellSize || 0;
  const peersOf = (s) => (part.clefted ? (groupSeeds().get(part.regionOf(s)) || [s]) : fullSeeds());
  // A partitioned cell's area is its pieces summed: a cell split across two islands, or
  // kept as two on a rejoin fallback, is not a small cell and must not be culled as one.
  const cellAreaOf = (s) => { let a = 0; for (const c of cellsFor(s, peersOf(s))) a += Math.abs(polyArea(c)); return a; };
  for (let i = half.length - 1; i >= 0; i--) if (cellAreaOf(half[i]) < DEGENERATE_CELL_AREA) { half.splice(i, 1); culledDegenerate++; }
  for (let i = axis.length - 1; i >= 0; i--) if (axis.length > 1 && cellAreaOf(axis[i]) < DEGENERATE_CELL_AREA) { axis.splice(i, 1); culledDegenerate++; }
  if (minCell > 0 && (cellLaw > 0 || aniso > 1)) {
    const tooSmall = (s) => {
      const a = cellAreaOf(s);
      if (!(a > 0)) return true;
      return 2 * Math.sqrt(a / Math.PI) < minCell;
    };
    for (let i = half.length - 1; i >= 0; i--) if (tooSmall(half[i])) { half.splice(i, 1); culled++; }
    for (let i = axis.length - 1; i >= 0; i--) if (axis.length > 1 && tooSmall(axis[i])) { axis.splice(i, 1); culled++; }
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
  // Under the partition every cell is a +Y half-cell and gets its -Y mirror, AXIS SEEDS
  // INCLUDED — their cells no longer straddle y = 0, which is exactly what makes the
  // result symmetric and is where the midline wall comes from. Without the partition an
  // axis cell is self-symmetric and is emitted once, as before.
  const groups = groupSeeds();
  const peersFor = (s) => (part.clefted ? (groups.get(part.regionOf(s)) || [s]) : seeds);
  for (const s of axis) for (const cell of cellsFor(s, peersFor(s))) emit(cell, part.mirrorAll);
  for (const s of half) for (const cell of cellsFor(s, peersFor(s))) emit(cell, true);
  // SEEDS ARE RETURNED, so a diagnostic never has to reimplement the sampler. The
  // measurement harness used to carry its own copy of this placement logic, and when the
  // axis sampler's material test was fixed here the copy silently kept the old behaviour —
  // it went on reporting 5 seeds in the cleft void that the shipped builder no longer
  // places. Its replica-vs-real assertion caught the divergence, but the right repair is
  // to remove the second derivation rather than to keep two in step. The post-cull set, in
  // the same order cells were emitted.
  // REGIONS ARE RETURNED so the gate can measure the partition rather than infer it —
  // tile's denominator is the union of these (#80), and voidCrossing is measured against
  // them. Empty on a smooth petal, where the bound path is the right denominator.
  const regions = [];
  if (part.clefted) {
    for (let r = 0; r < part.regionCount; r++) {
      for (const [A, B] of part.pieces(r)) {
        // The +Y HALF ONLY. The diagram is mirrored, so a consumer measuring coverage
        // doubles this rather than being handed the mirrors — the convention tile's
        // denominator already landed on (#80).
        if (A && A.length >= 3) regions.push(A);
        if (B && B.length >= 3) regions.push(B);
      }
    }
  }
  return { veins: [], nodes: [], slabs, culled, culledDegenerate, seeds: fullSeeds(),
           regions, rejoinFallbacks, disjointPieces, partitionRegions: part.regionCount };
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
  // A clipped cell can carry COINCIDENT vertices — Sutherland-Hodgman emits one wherever
  // the clip boundary passes exactly through a vertex of the cell. Each zero-length edge
  // between them would then be subdivided into SUB coincident ring samples below, and a
  // ring with a dozen identical points doubles back on itself by construction: the
  // duplicates lie on their own non-adjacent edges. Measured on chrysanthemum__voronoi,
  // where two such corners on the axis put 22 of 55 ring points on top of each other
  // (#74). Zero-length edges carry no shape, so dropping them changes nothing else.
  poly = dedupePolygon(poly);
  if (poly.length < 3) return null;
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
  // Backward difference at the v = +1 margin: a forward step there used to clamp
  // right back to v (pv === p), so the cross product degenerated to a zero normal
  // exactly on the boundary — harmless while the margin was gently curved, but
  // CROSS SECTION can make the margin the tightest-curvature seam of the whole
  // surface, so a real (non-zero) normal there now matters. Sampling backward
  // flips which side the tangent estimate is taken from, so `sign` flips the
  // delta back — bx/by/bz still approximate the +v tangent (not -v), so the
  // normal's outward orientation is unchanged at the boundary.
  const vFwd = v + 0.02 <= 1;
  const pv = surfacePoint(u, clamp(v + (vFwd ? 0.02 : -0.02), -1, 1), P, spine);
  const sign = vFwd ? 1 : -1;
  const ax = pu.x - p.x, ay = pu.y - p.y, az = pu.z - p.z;
  const bx = (pv.x - p.x) * sign, by = (pv.y - p.y) * sign, bz = (pv.z - p.z) * sign;
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
     teethVeins : [ { points: [{x,y,z}...], u } ]  one mid-vein per tooth, TAGGED with
                  the station its tooth sits at. The tag is not decoration: the mid-vein
                  only belongs in the model where its TOOTH does, and under continuous
                  margin that is decided by rimCoversStation(). A vein whose tooth the rim
                  discarded is a free-standing spike — see rimCoversStation's own note.
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
  // Dual-written. `rim` is the closed hoop, built exactly as before (byte-identical).
  // `half[+1]` / `half[-1]` collect the SAME points per side, each tagged with the u it
  // was taken at, so CONTINUOUS MARGIN can splice its two strands onto this one walk
  // instead of a second tooth generator. Nothing is recomputed for them: a tooth exists
  // once, and both rim styles read it. Issue #53 was two producers for the petal edge;
  // this is the same lesson one level in — the treatment gets one producer too.
  const rim = [];
  const half = { 1: [], '-1': [] };
  const uBase = 0.004;
  const push = (p, u, s) => { rim.push(p); if (s) half[s].push({ p, u }); };
  const edgeTo = (from, to, s) => {              // append edge samples for u in (from, to]
    const steps = Math.max(1, Math.round(Math.abs(to - from) * nEdge));
    for (let i = 1; i <= steps; i++) {
      const uu = clamp(lerp(from, to, i / steps), 0, 0.9995);
      push(surfacePoint(uu, s, P, spine), uu, s);
    }
  };

  push(surfacePoint(uBase, 1, P, spine), uBase, 1);    // +Y base, then base -> tip
  let cur = uBase;
  for (const t of plus) {
    edgeTo(cur, t.uc - hb, 1);                    // smooth edge up to the near foot
    for (const p of toothRim(t.nearFoot, t.peak, t.farFoot)) push(p, t.uc, 1);
    push(t.farFoot, t.uc + hb, 1);                // ...and back down to the far foot
    cur = t.uc + hb;
  }
  edgeTo(cur, uEnd, 1);                           // +Y edge up to the apex tooth's foot
  for (const p of toothRim(apF0, apexPeak, apF1)) push(p, uEnd, 1);   // wrap the very tip
  rim.push(apF1);                                 // down onto the -Y side
  half['-1'].push({ p: apF1, u: uEnd });
  cur = uEnd;
  for (let i = minus.length - 1; i >= 0; i--) {   // -Y side, tip -> base (descending)
    const t = minus[i];
    edgeTo(cur, t.uc + hb, -1);                   // down to the far foot first
    const seg = toothRim(t.nearFoot, t.peak, t.farFoot);  // built near->far; walk it far->near
    for (let j = seg.length - 1; j >= 0; j--) push(seg[j], t.uc, -1);
    push(t.nearFoot, t.uc - hb, -1);
    cur = t.uc - hb;
  }
  edgeTo(cur, uBase, -1);                         // smooth edge back to the base
  half['-1'].reverse();                           // -Y was walked tip -> base; store base -> tip

  // ---- a fine mid-vein running from inside the petal into each tooth's peak --
  // TAGGED with its tooth's station. The vein exists to fill a tooth, so it belongs in the
  // model exactly where the tooth does and nowhere else; the consumer decides that by
  // asking rimCoversStation(u), the same function the rim itself asks. The tag is taken
  // from the tooth that was actually built (t.uc) rather than re-derived from
  // tipRegionRange + TIP FREQUENCY, so it cannot drift from where the tooth is.
  const teethVeins = [];
  for (const t of [...plus, ...minus]) teethVeins.push({ points: [t.footInner, t.peak], u: t.uc });
  // The apex tooth wraps the very tip at uEnd — always the tip-most station on the rim, so
  // it survives any splice. Its vein is tagged uEnd for the same reason the others are:
  // so the consumer never has to special-case it.
  teethVeins.push({ points: [surfacePoint(0.9, 0, P, spine), apexPeak], u: uEnd });

  return { rim, teethVeins, half, uStart };
}

/* The one place a rim treatment is spliced onto a marginal strand.

   CONTINUOUS MARGIN replaces the closed hoop with two strands, so a treatment that
   lives in the rim polyline has to ride them instead. Above the flare the strand IS
   the outline — marginFlareFactor reaches 1, so v = side and the strand point equals
   surfacePoint(u, side) — which makes the seam exact; below it the strand is bundled
   toward the axis for the receptacle junction and must stay there, or a tooth lands as
   a spike off the neck. The splice station is FOUND by scanning marginFlareFactor
   rather than re-deriving its formula, so it cannot drift from the curve ribPath uses.

   This function exists so the renderer and the geometry-quality gate assemble the
   treated strand the SAME way. The gate previously modelled the rendered margin as the
   bare strands, which is how a fixed renderer can still read as broken (or a broken one
   as fixed) — the gate measuring its own copy instead of the real path.  */
export function rimSpliceU(P, treat) {
  let u = 1;
  for (let i = 0; i <= 1000; i++) {
    const uu = i / 1000;
    if (marginFlareFactor(uu, P.bundleTightness, P.flareRate) >= 1 - 1e-9) { u = uu; break; }
  }
  return (treat && treat.half) ? Math.max(u, treat.uStart) : u;
}

/* IS THE TREATED RIM PRESENT AT STATION u? — ONE OWNER, every consumer reads it.

   A rim treatment has more than one consumer: the margin itself (the hoop, or the two
   strands under continuous margin) and the geometry that FILLS the treatment — today the
   tooth mid-veins, tomorrow whatever a scallop or a fringe gets. Those consumers have to
   agree about which stations carry the treatment, and for months they did not: the strand
   applied `q.u >= rimSpliceU` and the mid-vein loop applied nothing, so every tooth the
   splice discarded left its mid-vein behind — a Ø1.0 mm needle up to 16 mm long with a
   free end, pointing at a tooth that was never built. Reachable from the panel, and the
   export gate cannot see it: the tube is capped, so `boundary === 0` throughout. The
   project's own connectedness gate reads 19 and 37 detached components on it.

   That is the registration rule pointed at a FILTER rather than at a boundary. The answer
   lives here once; `treatedStrandPoints` and the mid-vein consumer in flower.js both ask,
   and neither re-derives it. Adding the same `>= rimSpliceU` test at the second call site
   would have fixed today's symptom and left two consumers each deciding for themselves
   what the splice means — which is the defect in miniature.

   Under a closed hoop (continuous margin OFF, or no treatment at all) every station is on
   the treated rim, so the answer is unconditionally true and every tooth keeps its vein.
   That asymmetry is a gate row in verify-connectedness.mjs, not just this note.

   NOTE this says where the rim IS, not where teeth SHOULD reach. Below the splice the
   margin is deliberately the bundled strands — that is what continuous margin is for —
   so teeth do not exist down there and their veins must not either. Wanting teeth all the
   way to the base is a margin-design change with a contact sheet, not a change here.  */
export function rimCoversStation(u, P, treat) {
  const contMargin = !!P.continuousMargin && !P.solidBlade;
  if (!contMargin || !treat || !treat.half) return true;
  return u >= rimSpliceU(P, treat);
}

// Ordered LOCAL-frame points for one treated strand: the bundled stretch of the strand
// (the stations the treated rim does NOT cover, mapped through `mapFlat`), then the
// treatment's own half over the stations it does. The two halves are complementary by
// construction because they ask rimCoversStation the same question.
export function treatedStrandPoints(strandPoints, side, treat, P, mapFlat) {
  if (!treat || !treat.half) return strandPoints.map(mapFlat);
  const out = [];
  for (const p of strandPoints) if (!rimCoversStation(p.x / Math.max(P.L, 1e-6), P, treat)) out.push(mapFlat(p));
  for (const q of treat.half[String(side)]) if (rimCoversStation(q.u, P, treat)) out.push(q.p);
  return out;
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
  // The two halves, base -> tip, each point tagged with the u it was taken at — the same
  // points the hoop above is made of, so CONTINUOUS MARGIN splices its strands onto this
  // one walk rather than running a second scallop generator. See buildJaggedEdge.
  const tagged = (arr) => arr.map((q, i) => ({ p: q, u: lerp(uBase, uApex, i / Math.max(1, arr.length - 1)) }));
  return { rim, teethVeins: [], half: { 1: tagged(plusRim), '-1': tagged(minusRim) }, uStart: uBase };
}
