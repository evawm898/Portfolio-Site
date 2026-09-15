// scene/koi-pads.js — the lily pads and the blooms among them. Placement, the
// outline law, and how a pad answers the water under it. NO DOM AND NO CANVAS:
// every mark is koi-draw.js's, and everything here is a function of (the field,
// dt, the ripple list, the viewport), so the gate runs whole minutes of pond in
// Node and asserts what the pads did.
//
// A PAD CANNOT TELL A CLICK FROM A RAINDROP, AND THAT IS STRUCTURAL RATHER THAN
// A RULE SOMEBODY KEEPS. `waveAt` below reads a ripple's x, y, r, age, life and
// strength and NOTHING ELSE — the same fields koi-fish.js reads, and the whole
// of what koi-ripples.js says a ripple is. There is no `source` in the record to
// branch on (see RIPPLE_FIELDS there), so "a pad answers any ripple the same
// way" is a property of the type. A bigger splash still rocks a pad harder;
// that is the physical size of the disturbance, which is the one thing about a
// ripple that a floating leaf can actually feel.
//
// THE WATER IS A HEIGHT FIELD AND A FLOATING DISC READS IT TWICE. This is the
// whole of the interaction and it is one law, not two mechanisms bolted
// together: a leaf on water sits AT THE WATER'S HEIGHT and lies ALONG ITS LOCAL
// TANGENT PLANE. So `waveAt` returns { h, gx, gy } — the height and its
// gradient — and the pad takes its BOB from the height and its ROCK from the
// gradient. Nothing here knows that a ripple is a ring; it asks the water where
// it is and how it is leaning, which is what a leaf does.
//
// HEIGHT HAS A REAL SCREEN MAPPING AND IT IS DERIVED, NOT TYPED. surface.js
// declares this view an oblique orthographic with sin(elevation) = squash, so
// cos(elevation) = sqrt(1 - squash^2) — `surface.lift` — and one plane unit of
// HEIGHT draws that many screen pixels UPWARD. Everything below reports a
// height in plane units and the renderer projects it with that one number, so a
// pad rides the same viewpoint the water does and no second camera is implied.
//
// THE ROCK IS SIGNED, AND A FORESHORTENING ALONE CANNOT BE. A disc tilted by
// theta about an axis perpendicular to t-hat draws foreshortened by cos(theta)
// along t-hat — and cos is EVEN, so a pure squash reads the same for a tilt
// either way and the pad appears to PULSE at twice the wave's frequency rather
// than rock. What makes it a rock is the height term beside it: a point at
// offset `a` along t-hat stands a*sin(theta) above the pad's centre, which is
// odd in theta, so one edge visibly lifts while the other drops. Both terms
// come out of `padPoint` below, which is the one place a local point becomes a
// place on the water.
//
// THE ROCK IS NOT DAMPED UNDER prefers-reduced-motion, AND THAT IS A DECISION
// RATHER THAN AN OVERSIGHT. What this scene damps for that preference is the
// whole-frame stuff — the storm's JOLT goes to zero and the lightning flash is
// capped — because those are the vestibular and photosensitive concerns. Object
// motion is not: the koi keep swimming, the rain keeps falling and the rings
// keep spreading, and a pad leaning seven degrees over half a second is far less
// motion than any of them. Damping it alone would be inconsistent with the three
// things beside it.
//
// A FIRST-ORDER LAG, AND NO SPRING. The forcing ALREADY oscillates: as a front
// crosses a pad the slope under it runs 0 -> + -> 0 -> - -> 0, because the
// crest arrives, passes the centre and leaves. So a plain lag on that target is
// a genuine rock with a phase delay behind the wave. A second-order response
// would add ringing AFTER the wave has gone, which is not what a leaf on water
// does — the water damps it. One tau, applied to the tilt VECTOR rather than to
// an angle, so nothing has to wrap.

import { createSurface } from './surface.js';

// ---------------------------------------------------------------- the shape
// A pad is a near-circle with a wedge cut out of one side where its stem comes
// up — the reference's own silhouette: gently organic rather than drawn with a
// compass, and cut from rim to centre. How WIDE that cut is varies from pad to
// pad, from a slit to a bite; how lumpy the rim is does not vary much at all.

export const PAD_R = [15, 58];        // plane px, the radius before the lumps
export const PAD_R_SKEW = 1.7;        // >1 biases the draw small; see makePad
export const LOBES = [2, 3, 5];       // harmonics that make the rim organic
// ROUNDER THAN THE FIRST CUT, BY RULING (Eva: "make the lily pads rounder").
// These were [0.048, 0.034, 0.018] and drew rims varying 7-16% of their own
// radius, which reads as lumpy rather than as a leaf — the lumps were the
// loudest thing about a pad. Halved, with a tighter per-pad multiplier so the
// lumpiest pad in a field sits nearer the quietest. The rim is still not a
// compass circle, which is what keeps it organic; it is just no longer what
// you notice first.
export const LOBE_AMP = [0.024, 0.017, 0.009];
export const LOBE_VARY = [0.65, 1.30];
// THE WEDGE'S WIDTH IS A PER-PAD DRAW (Eva: "the cut out a variety of angles
// ranging from 5 to 65"). The number is the INCLUDED angle — the whole wedge,
// flank to flank — drawn uniformly per pad, so one field carries everything
// from a slit you have to look for to a bite a sixth of the way round. The
// half-angle the geometry wants is that over two, and it is a property of the
// PAD rather than of the module: nothing below may read a module constant for
// it.
//
// SUPERSEDED NOTE, KEPT SO THE CHANGE IS CHECKABLE. This was ONE fixed width,
// set at the RIM as a fraction of the diameter (`NOTCH_GAP` 0.10, an included
// angle of 5.7 degrees), on the reasoning that a half-angle of 0.19 rad opens
// a gap of 0.38 of the diameter and "draws as a slice out of a pie". That
// reasoning is correct about a single width and is not an argument against a
// RANGE: the old value is now this range's own floor, and what the ceiling
// buys is that no two pads in a clump are cut the same way. The gap a given
// angle opens is still 2*sin(half) of the diameter — 0.09 at 5 degrees, 0.54
// at 65 — so the top of the range IS the pie slice, deliberately, as the far
// end of a variety rather than as every pad.
export const NOTCH_DEG = [5, 65];     // INCLUDED angle of the wedge, per pad
export const NOTCH_INNER = 0.05;      // how near the centre its apex reaches
export const OUTLINE_PTS = 96;        // around the rim, before the notch's own
export const NOTCH_PTS_MIN = 8;       // floor on the wedge's own samples

// Speckles: the reference's pads are freckled, and on near-black an ink speck
// is a LIGHT one. Deterministic per pad, in the pad's own local frame, so they
// ride the rock with everything else.
export const SPECKS = [6, 20];
export const SPECK_R = [0.012, 0.030];   // of the pad's own radius

// ONE VEIN, AND THE FIRST CUT HAD FIVE. A midrib with two pairs of laterals
// radiating off it drew a palm frond: five lines spraying from one point is the
// most detailed thing in a frame whose fish have no eyes, no barbels and no
// gill line. The reference's own pads show a single line from the notch across
// toward the far rim and essentially nothing else, which is also what the koi's
// level of detail admits.
//
// AND IT STOPS SHORT OF THE RIM. Run all the way to the edge it reads as a
// CRACK across the leaf rather than a vein in it — a straight bright line over
// a filled convex shape is a fold, and the larger the pad the more it looks
// like one. Ending it three quarters of the way out is what makes it anatomy.
export const RIB_REACH = 0.74;

// A FOLD IS AN ARC INSET FROM THE RIM, AND IT IS THE ONE PIECE OF INTERIOR
// DETAIL BESIDES THE VEIN. The reference's pads are not flat discs: their
// margins turn up, and the mark an illustrator makes for that is a line running
// just inside the edge over a stretch of it — the far side of the curl, seen
// across the leaf. NOT a crease across the middle, which is a different thing
// and reads as damage.
//
// AND NOT ON EVERY PAD. Five radiating veins already read as a palm frond once
// in this file; a fold on every leaf is the same mistake at the margin. Rather
// more than half carry one, so a clump has both kinds in it.
export const FOLD_CHANCE = 0.62;
export const FOLD_ARC = [0.9, 2.0];    // rad of rim the curl runs along
// INSET FAR ENOUGH TO SEPARATE FROM THE RIM. At 0.74-0.88 the arc ran close
// beside the outline, which is three times its weight, and it simply
// disappeared into it — a fold has to be visibly INSIDE the leaf to read as the
// far side of a curl rather than as a thick edge.
export const FOLD_INSET = [0.58, 0.78]; // of the local radius
export const FOLD_PTS = 12;

const TAU = Math.PI * 2;

// One pad's static geometry, in its OWN plane-space frame (centre at the
// origin, already rotated to its orientation so nothing downstream has to know
// the pad has one). Built once, at placement: only the transform moves.
export function makePad(rand, x, y, R) {
  const spin = rand.range(0, TAU);
  const phases = LOBES.map(() => rand.range(0, TAU));
  const amps = LOBE_AMP.map(a => a * rand.range(LOBE_VARY[0], LOBE_VARY[1]));
  const notch = rand.range(0, TAU);
  const notchDeg = rand.range(NOTCH_DEG[0], NOTCH_DEG[1]);
  const notchHalf = notchDeg * Math.PI / 360;   // included degrees -> half-angle

  const radiusAt = (t) => {
    let k = 1;
    for (let i = 0; i < LOBES.length; i++) k += amps[i] * Math.cos(LOBES[i] * t + phases[i]);
    // The wedge. A LINEAR ramp from the apex out to the wedge's own edge, which
    // is a straight-sided notch — the reference's is a slit with two straight
    // sides, and a smoothstep here rounds it into a bite.
    let d = t - notch;
    d = d - TAU * Math.round(d / TAU);
    const q = Math.abs(d) / notchHalf;
    if (q < 1) k *= NOTCH_INNER + (1 - NOTCH_INNER) * q;
    return R * k;
  };

  // Sampled densely inside the wedge, because an angular window sampled at the
  // rim's own spacing reads as a jagged bite rather than a cut — and the COUNT
  // IS DERIVED FROM THE WEDGE'S OWN WIDTH rather than fixed, because the width
  // is now a per-pad draw over a thirteenfold range. Eight samples is dense
  // across a five-degree slit and COARSER THAN THE RIM ITSELF across a
  // sixty-five degree one, which is precisely the jaggedness this pass exists
  // to remove. Half the rim's step, so the wedge is always the better resolved
  // of the two however wide it is cut.
  //
  // AND THE COUNT IS EVEN, WHICH IS NOT TIDINESS. The samples are laid from
  // one flank to the other, so the APEX is a sample only when the count is
  // even — an odd one steps over it and leaves the wedge with a small flat
  // where its point should be, at the one place the pad's own midrib starts.
  const rimStep = TAU / OUTLINE_PTS;
  const notchPts = 2 * Math.max(NOTCH_PTS_MIN / 2, Math.ceil(2 * notchHalf / rimStep));
  const angles = [];
  for (let i = 0; i < OUTLINE_PTS; i++) {
    const t = (i / OUTLINE_PTS) * TAU;
    let d = t - notch;
    d = d - TAU * Math.round(d / TAU);
    if (Math.abs(d) < notchHalf) continue;
    angles.push(t);
  }
  for (let i = 0; i <= notchPts; i++) {
    angles.push(notch - notchHalf + (i / notchPts) * 2 * notchHalf);
  }
  angles.sort((a, b) => a - b);

  const outline = angles.map(t => {
    const r = radiusAt(t);
    return { x: Math.cos(t + spin) * r, y: Math.sin(t + spin) * r };
  });

  // Speckles, rejected outside the rim so none floats in the notch or past the
  // edge. The rim is what the pad IS; a speck beyond it is a speck on water.
  const specks = [];
  const wantSpecks = rand.int(SPECKS[0], SPECKS[1]);
  for (let i = 0, tries = 0; i < wantSpecks && tries < wantSpecks * 8; tries++) {
    const t = rand.range(0, TAU);
    const rr = Math.sqrt(rand.unit()) * 0.92 * radiusAt(t);
    if (rr > radiusAt(t) * 0.94) continue;
    specks.push({
      x: Math.cos(t + spin) * rr, y: Math.sin(t + spin) * rr,
      r: R * rand.range(SPECK_R[0], SPECK_R[1]),
    });
    i++;
  }

  // The midrib runs from the notch's apex across to the far rim, which is where
  // a real one runs: the notch IS the stem, so the leaf's axis starts there.
  const apex = notch + spin, away = apex + Math.PI;
  const ribs = [[
    { x: Math.cos(apex) * R * NOTCH_INNER, y: Math.sin(apex) * R * NOTCH_INNER },
    { x: Math.cos(away) * radiusAt(notch + Math.PI) * RIB_REACH,
      y: Math.sin(away) * radiusAt(notch + Math.PI) * RIB_REACH },
  ]];

  // The fold, if this pad has one: an arc of the rim brought inward, clear of
  // the notch so it never reads as a second slit.
  const folds = [];
  if (rand.chance(FOLD_CHANCE)) {
    const span = rand.range(FOLD_ARC[0], FOLD_ARC[1]);
    const mid = notch + Math.PI + rand.range(-1.0, 1.0);
    const inset = rand.range(FOLD_INSET[0], FOLD_INSET[1]);
    const arc = [];
    for (let i = 0; i <= FOLD_PTS; i++) {
      const t = mid - span / 2 + (i / FOLD_PTS) * span;
      // Eased in at both ends, so the fold MEETS the rim rather than stopping
      // dead in the middle of the leaf — a line with two loose ends is a scratch.
      const q = Math.sin(Math.PI * (i / FOLD_PTS));
      const r = radiusAt(t) * (1 - (1 - inset) * q);
      arc.push({ x: Math.cos(t + spin) * r, y: Math.sin(t + spin) * r });
    }
    folds.push(arc);
  }

  return {
    kind: 'pad', x, y, R, outline, specks, ribs, folds,
    // The wedge, DECLARED: where its apex points in this pad's own drawn frame
    // and how wide it was cut. Nothing in the module reads these back — they
    // are here so an instrument can ask which stretch of the rim is the notch
    // instead of inferring it from a radius, which cannot be done once the
    // width varies (a wide wedge's own flank lands samples at every radius
    // between its apex and the rim).
    notchAt: ((notch + spin) % TAU + TAU) % TAU,
    notchHalf, notchDeg,
    // The rock, as a VECTOR whose magnitude is the tilt angle: lagging an angle
    // and a direction separately means wrapping, and a wrap in the middle of a
    // lag is a pad that snaps round.
    tx: 0, ty: 0, lift: 0,
  };
}

// ------------------------------------------------------------- the blooms
// The reference's flower, reduced to what the koi's own level of detail admits:
// two tiers of radiating petals and a ring of stamens. No stem is drawn — it is
// under the water, and this scene draws nothing under the water except koi.

export const BLOOM_R = [19, 28];         // plane px, the outer tier's reach
export const BLOOM_OUTER = [9, 12];      // petals in the outer tier
export const BLOOM_INNER_K = 0.62;       // inner tier's reach, of the outer's
export const BLOOM_PETAL_W = 0.30;       // half-width at its widest, of reach
export const BLOOM_STAMENS = [8, 11];
export const BLOOM_CENTRE = 0.20;        // of the outer reach
export const BLOOM_RIDE = 3.4;           // plane px it stands above the water

// One petal as a closed lens: out along one side, round the tip, back along the
// other. Widest a third of the way out, which is what makes it a petal rather
// than a leaf.
function petal(cx, cy, ang, reach, half) {
  const pts = [];
  const N = 9;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const w = (q) => Math.sin(Math.PI * Math.pow(q, 0.72)) * half * reach;
  for (let i = 0; i <= N; i++) { const q = i / N; pts.push({ q, s: 1 }); }
  for (let i = N; i >= 0; i--) { const q = i / N; pts.push({ q, s: -1 }); }
  return pts.map(({ q, s }) => ({
    x: cx + ux * q * reach - uy * s * w(q),
    y: cy + uy * q * reach + ux * s * w(q),
  }));
}

export function makeBloom(rand, x, y) {
  const R = rand.range(BLOOM_R[0], BLOOM_R[1]);
  const spin = rand.range(0, TAU);
  const nOuter = rand.int(BLOOM_OUTER[0], BLOOM_OUTER[1]);
  const petals = [];
  for (let i = 0; i < nOuter; i++) {
    const a = spin + (i / nOuter) * TAU;
    petals.push(petal(0, 0, a, R * rand.range(0.88, 1.0), BLOOM_PETAL_W));
  }
  const nInner = Math.max(5, Math.round(nOuter * 0.7));
  for (let i = 0; i < nInner; i++) {
    const a = spin + ((i + 0.5) / nInner) * TAU;
    petals.push(petal(0, 0, a, R * BLOOM_INNER_K * rand.range(0.88, 1.0), BLOOM_PETAL_W * 1.15));
  }
  const stamens = [];
  const nSt = rand.int(BLOOM_STAMENS[0], BLOOM_STAMENS[1]);
  for (let i = 0; i < nSt; i++) {
    const a = spin * 0.5 + (i / nSt) * TAU;
    const r0 = R * BLOOM_CENTRE * 0.30, r1 = R * BLOOM_CENTRE * rand.range(0.85, 1.15);
    stamens.push([
      { x: Math.cos(a) * r0, y: Math.sin(a) * r0 },
      { x: Math.cos(a) * r1, y: Math.sin(a) * r1 },
    ]);
  }
  return {
    kind: 'bloom', x, y, R, petals, stamens,
    centre: R * BLOOM_CENTRE * 0.34,
    ride: BLOOM_RIDE,
    tx: 0, ty: 0, lift: 0,
  };
}

// ------------------------------------------------------------- the water
// The ripple field read as a height field. ONE pass over the ripples answers
// both questions a floating thing asks, because they are the same question:
// where is the water here, and which way is it leaning?

export const WAVE_W = 30;          // plane px, the crest's own half-width
export const WAVE_AMP = 7.0;       // plane px of height at full strength
export const WAVE_REACH = 2.2;     // crest half-widths a ripple is felt across

export function waveAt(ripples, x, y, out = { h: 0, gx: 0, gy: 0 }) {
  let h = 0, gx = 0, gy = 0;
  const band = WAVE_W * WAVE_REACH;
  for (let i = 0; i < ripples.length; i++) {
    const rip = ripples[i];
    const dx = x - rip.x, dy = y - rip.y;
    const d2 = dx * dx + dy * dy;
    // Cheap reject before the sqrt: nothing outside the front's own band can
    // contribute, and during a downpour most of the field is outside it.
    const lo = rip.r - band, hi = rip.r + band;
    if (d2 > hi * hi || (lo > 0 && d2 < lo * lo)) continue;
    const d = Math.sqrt(d2);
    if (d < 1e-6) continue;
    const u = rip.age / rip.life;
    if (u <= 0 || u >= 1) continue;
    // The same attack-and-decay the renderer draws the ring at, so a crest
    // fades exactly as the ring above it does — one ripple, one envelope.
    const attack = u < 0.06 ? u / 0.06 : 1;
    const env = attack * ((1 - u) * 0.6 + Math.pow(1 - u, 3) * 0.4);
    const amp = WAVE_AMP * rip.strength * env;
    const s = (d - rip.r) / WAVE_W;
    const g = Math.exp(-s * s);
    h += amp * g;
    // d/dd of amp*exp(-s^2) is amp * (-2s/W) * exp(-s^2); the gradient points
    // along the outward radial, so the crest pulls a pad toward it from outside
    // and away from it once it has passed.
    const dhdd = amp * (-2 * s / WAVE_W) * g;
    gx += dhdd * (dx / d);
    gy += dhdd * (dy / d);
  }
  out.h = h; out.gx = gx; out.gy = gy;
  return out;
}

// ------------------------------------------------------------- the response
// SOFT SATURATION, NOT A CLAMP. A downpour puts several crests under one pad at
// once and a plain clamp would peg every pad at the ceiling for the whole
// storm — every leaf in the pond leaning the same amount, which is the one
// thing a field of them must not do. tanh keeps a small disturbance
// proportional, bounds a large one, and has no flat region in between.
export const TILT_MAX = 0.125;     // rad, about 7 degrees
export const TILT_REF = 0.16;      // slope at which the rock is ~76% of its cap
export const BOB_MAX = 5.0;        // plane px
export const BOB_REF = 6.0;
export const BLOOM_TILT_K = 0.35;  // a flower on a stem is anchored; a leaf is not
export const LAG_TAU = 0.20;       // seconds to 1/e, the leaf's own inertia

export function respond(item, wave, dt) {
  const slope = Math.hypot(wave.gx, wave.gy);
  const k = item.kind === 'bloom' ? BLOOM_TILT_K : 1;
  let wantX = 0, wantY = 0;
  if (slope > 1e-9) {
    const theta = TILT_MAX * k * Math.tanh(slope / TILT_REF);
    wantX = (wave.gx / slope) * theta;
    wantY = (wave.gy / slope) * theta;
  }
  const wantLift = BOB_MAX * k * Math.tanh(wave.h / BOB_REF);
  const a = Math.min(1, dt / LAG_TAU);
  item.tx += (wantX - item.tx) * a;
  item.ty += (wantY - item.ty) * a;
  item.lift += (wantLift - item.lift) * a;
  return item;
}

// THE ONE PLACE A LOCAL POINT BECOMES A PLACE ON THE WATER. Returns plane x, y
// and a HEIGHT in plane units; the renderer projects all three through the one
// viewpoint (see surface.lift). Both halves of the tilt are here — the
// foreshortening along the tilt direction and the height across it — so nothing
// can draw a pad's rim and its speckles under two different tilts.
export function padPoint(item, lx, ly, out = { x: 0, y: 0, z: 0 }) {
  const theta = Math.hypot(item.tx, item.ty);
  const base = (item.ride || 0) + item.lift;
  if (theta < 1e-9) {
    out.x = item.x + lx; out.y = item.y + ly; out.z = base;
    return out;
  }
  const ux = item.tx / theta, uy = item.ty / theta;
  const a = lx * ux + ly * uy;              // along the tilt, the rising way
  const b = -lx * uy + ly * ux;             // across it, the tilt's own axis
  const ac = a * Math.cos(theta);
  out.x = item.x + ac * ux - b * uy;
  out.y = item.y + ac * uy + b * ux;
  out.z = base + a * Math.sin(theta);
  return out;
}

// ---------------------------------------------------------------- the field
// PADS CLUMP. The brief asks for loose clusters with open water between them
// rather than a scatter, and a scatter is what an unstructured draw gives: a
// Poisson field over the viewport has no gaps of any size worth calling open
// water. So the field is built in TWO stages — cluster centres first, spread
// far apart, then pads around each one — and the clumping is the structure
// rather than a statistic somebody tuned toward.
//
// A CLUSTER HAS A SIZE CHARACTER. Each one draws a size multiplier once and
// every pad in it is drawn against that, so the pond has big-pad clumps and
// small-pad clumps rather than every clump being the same mixture. Rolling each
// pad independently gives a field whose clusters are statistically identical,
// which reads as one texture at one scale — the thing the reference is not.

export const CLUSTER_AREA = 2.6e5;       // plane px^2 of pond per cluster
export const CLUSTER_SEP = 210;          // plane px between cluster centres
export const CLUSTER_SPREAD = [55, 150]; // how far a cluster's pads reach
export const PER_CLUSTER = [2, 8];
export const CLUSTER_SIZE_K = [0.55, 1.25];
export const PAD_GAP = 0.56;             // of the two radii: below 1 they overlap
export const MAX_PADS = 120;
export const BLOOMS = [2, 3];
export const BLOOM_BESIDE = 1.9;   // a bloom must have a pad within this many of its radii
export const FIELD_MARGIN = 90;          // plane px of pond generated past the frame
export const PLACE_TRIES = 26;

// THE PADS DRAW FROM THEIR OWN STREAM, AND THAT IS NOT TIDINESS. koi-ripples.js
// says it in as many words: every draw on the shared stream shifts every number
// anything downstream reads for the rest of the run, the fish included. A pad
// field taking thirty draws at construction would hand the pond a different set
// of koi — so the pond Eva ruled on would have changed for a reason that has
// nothing to do with pads. A forked stream leaves every existing sequence
// exactly where it was and is still reproducible from `?seed=`.
export const PAD_SEED_SALT = 0x9e3779b9;

export function createPads({ rand, surface = createSurface(), width = 0, height = 0 } = {}) {
  const wave = { h: 0, gx: 0, gy: 0 };
  let covered = null;      // the plane box pads have been generated over

  const field = {
    pads: [],
    blooms: [],
    clusters: [],
    // Whether a bloom has been placed for each cluster is not tracked: the
    // count is capped for the FIELD, because "2-3 blooms" is a statement about
    // the picture rather than about the pond's area, and a resize that bred a
    // fourth would quietly stop the picture being the one that was ruled on.
    bloomsPlaced: 0,

    // Every pad and bloom, back to front. FURTHER UP THE SCREEN IS FURTHER
    // AWAY under this viewpoint, so ascending plane y is the painter's order
    // and a nearer pad's own ground fill covers a farther one's rim — which is
    // what the reference shows wherever two pads overlap. Blooms sort with the
    // pads rather than after them, so a pad genuinely in front of a flower
    // covers its near petals instead of the flower floating over the field.
    drawOrder: [],

    // Generate over whatever the viewport now shows and has not been covered
    // before. NOTHING EVER MOVES OR IS REMOVED: a pad is a thing in the pond,
    // not a thing in the viewport, so growing the window grows the field and
    // shrinking it leaves what is outside alone. A re-generation would make
    // every pad jump on a resize, which is the one thing a fixed object in a
    // scene must not do.
    ensure(w, h) {
      if (!(w > 0 && h > 0)) return field;
      const vis = surface.visible(w, h, FIELD_MARGIN);
      const want = { x0: vis.x0, y0: vis.y0, x1: vis.x1, y1: vis.y1 };
      if (covered
          && want.x0 >= covered.x0 && want.y0 >= covered.y0
          && want.x1 <= covered.x1 && want.y1 <= covered.y1) return field;

      const newArea = (want.x1 - want.x0) * (want.y1 - want.y0)
        - (covered ? overlapArea(want, covered) : 0);
      const nClusters = Math.max(1, Math.round(newArea / CLUSTER_AREA));

      for (let c = 0; c < nClusters && field.pads.length < MAX_PADS; c++) {
        const spot = placeCluster(want, covered);
        if (!spot) continue;
        const spread = rand.range(CLUSTER_SPREAD[0], CLUSTER_SPREAD[1]);
        const sizeK = rand.range(CLUSTER_SIZE_K[0], CLUSTER_SIZE_K[1]);
        const n = rand.int(PER_CLUSTER[0], PER_CLUSTER[1]);
        const cluster = { x: spot.x, y: spot.y, spread, sizeK, pads: [] };
        for (let i = 0; i < n && field.pads.length < MAX_PADS; i++) {
          // The first pad sits ON the centre; the rest are drawn around it with
          // sqrt so they fill the disc rather than crowding its rim.
          const put = i === 0
            ? { x: spot.x, y: spot.y }
            : null;
          const R = Math.min(PAD_R[1], padRadius() * sizeK);
          const at = put || scatter(spot, spread, R);
          if (!at) continue;
          const pad = makePad(rand, at.x, at.y, R);
          field.pads.push(pad);
          cluster.pads.push(pad);
        }
        if (!cluster.pads.length) continue;
        field.clusters.push(cluster);
      }

      // Blooms, once the pads they rise among exist. A bloom wants to be IN a
      // cluster and not ON a pad, so it is placed in a gap: rejected if it sits
      // well inside any pad's rim, which is what puts it between leaves rather
      // than on top of one.
      if (!covered) {
        const wantBlooms = rand.int(BLOOMS[0], BLOOMS[1]);
        const pool = field.clusters.slice();
        while (field.bloomsPlaced < wantBlooms && pool.length) {
          const ci = Math.floor(rand.unit() * pool.length) % pool.length;
          const cl = pool.splice(ci, 1)[0];
          const at = bloomSpot(cl);
          if (!at) continue;
          field.blooms.push(makeBloom(rand, at.x, at.y));
          field.bloomsPlaced++;
        }
      }

      covered = covered ? {
        x0: Math.min(covered.x0, want.x0), y0: Math.min(covered.y0, want.y0),
        x1: Math.max(covered.x1, want.x1), y1: Math.max(covered.y1, want.y1),
      } : want;
      resort();
      return field;
    },

    // What the water is doing under every pad, and what each pad does about it.
    advance(dt, { ripples = [] } = {}) {
      for (const p of field.pads) respond(p, waveAt(ripples, p.x, p.y, wave), dt);
      for (const b of field.blooms) respond(b, waveAt(ripples, b.x, b.y, wave), dt);
    },

    clear() {
      field.pads.length = 0; field.blooms.length = 0;
      field.clusters.length = 0; field.drawOrder.length = 0;
      field.bloomsPlaced = 0; covered = null;
    },

    coveredBox() { return covered ? { ...covered } : null; },
  };

  function resort() {
    field.drawOrder = [...field.pads, ...field.blooms].sort((a, b) => a.y - b.y);
  }

  // Skewed toward the small end, in ONE draw: the reference is many small pads
  // with a few large ones over them, and a uniform draw gives a crowd of
  // middling ones instead. Same trick koi-ripples.js uses on a ripple's reach.
  function padRadius() {
    const u = rand.unit();
    return PAD_R[0] + (PAD_R[1] - PAD_R[0]) * Math.pow(u, PAD_R_SKEW);
  }

  function placeCluster(want, old) {
    for (let t = 0; t < PLACE_TRIES; t++) {
      const x = rand.range(want.x0, want.x1), y = rand.range(want.y0, want.y1);
      // Only in the part that is NEW, or the top-up would pile a second field
      // on top of the one already there.
      if (old && x > old.x0 && x < old.x1 && y > old.y0 && y < old.y1) continue;
      let ok = true;
      for (const c of field.clusters) {
        if (Math.hypot(c.x - x, c.y - y) < CLUSTER_SEP) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return null;
  }

  function scatter(centre, spread, R) {
    for (let t = 0; t < PLACE_TRIES; t++) {
      const a = rand.range(0, TAU), rr = Math.sqrt(rand.unit()) * spread;
      const x = centre.x + Math.cos(a) * rr, y = centre.y + Math.sin(a) * rr;
      let ok = true;
      for (const p of field.pads) {
        if (Math.hypot(p.x - x, p.y - y) < PAD_GAP * (p.R + R)) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return null;
  }

  function bloomSpot(cl) {
    for (let t = 0; t < PLACE_TRIES; t++) {
      const a = rand.range(0, TAU), rr = rand.range(0.35, 1.0) * cl.spread;
      const x = cl.x + Math.cos(a) * rr, y = cl.y + Math.sin(a) * rr;
      // NEAR A PAD BUT NOT ON ONE. Rejecting only the pads' own interiors put
      // blooms in open water at the edge of a cluster, which is a flower on a
      // pond rather than the brief's "rising among the pad clusters": a bloom
      // has to have a leaf beside it to be among anything.
      let ok = true, beside = false;
      for (const p of field.pads) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < p.R * 0.80) { ok = false; break; }
        if (d < p.R * BLOOM_BESIDE) beside = true;
      }
      if (ok && beside) return { x, y };
    }
    return null;
  }

  field.ensure(width, height);
  return field;
}

function overlapArea(a, b) {
  const w = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const h = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  return w * h;
}
