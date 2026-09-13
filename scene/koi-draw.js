// scene/koi-draw.js — every mark scene 1 makes. Thin light lines on near-black,
// so a koi is an outline with a dark body behind it rather than a shape with a
// value, and colour never enters it — everything here is one grayscale ink at
// a varying brightness.
//
// TWO FILLS CARRY TONE, ON PURPOSE, AND BOTH ARE KEPT DELIBERATELY FAINT: a
// fixed grain over the whole frame (GRAIN_MAX_A) so open water between ripples
// does not read as one flat value, and a soft wash under each ripple's own
// front (WASH_MAX_A) so disturbed water reads as very slightly brighter than
// the still water around it. Neither is a light source, a reflection or a
// colour — both are the same INK the lines are, at a low, capped alpha — so
// the "no colour, no shading" identity holds; only "no fill carries tone" is
// the one rule this pair narrowly overrides, and it does so by a few percent
// of full white at most.
//
// THE SQUASH IS APPLIED TO POINTS, NEVER TO THE CANVAS. A ctx.scale(1, squash)
// would be one line shorter and would also squash the STROKE — every line would
// come out thinner across the fish than along it, which is exactly the thing a
// line-art piece cannot afford. So every plane point is projected by hand at
// the moment it is drawn and all stroking happens in screen space, where a
// 1.1 px line is 1.1 px in every direction. The grain and the wash are filled
// circles on the same water plane, so they go through the same `surface.ellipse`
// every ripple does — a wash is exactly as "on the water" as the ring above it.
//
// THE ORDER IS PHYSICAL AND IT IS THE ONLY DEPTH CUE HERE: water (the ground,
// the vignette, the grain and the ripple wash — all of it the surface itself),
// then the fish (which are UNDER the surface), then the ripples (which are ON
// it, and so cross over a koi that passes beneath), then the rain (which is in
// the air in front of all of it), then the flash. A fish drawn over its own
// ripples reads as a paper cut-out immediately, and nothing else in this scene
// says which side of the water anything is on.
//
// ALPHA IS BUCKETED AND STROKED IN BATCHES. A downpour is several hundred rings
// and a hundred streaks; giving each its own strokeStyle string is several
// hundred allocations and state changes a frame. Each family is binned into a
// fixed number of alpha levels and each bin strokes (or fills) once, so the
// cost is a dozen state changes whatever the weather.

export const INK = [226, 232, 238];       // ripples: the brightest thing here
export const INK_FISH = [214, 221, 228];
export const INK_RAIN = [198, 208, 219];
export const GROUND = '#08090b';

const RIPPLE_BINS = 12;
const RAIN_BINS = 6;
const RIPPLE_MIN_A = 0.014;

// The wash under a ripple's own front: a flat, batched fill (never a per-
// ripple gradient — hundreds of those would cost real time) so it reads as a
// soft brightening rather than a hard coin, its ceiling is kept low enough
// that the edge is not the thing anyone notices.
const WASH_BINS = 5;
const WASH_MAX_A = 0.05;

// The grain: a fixed field of single-pixel points, jittered off a grid so it
// does not read as a lattice, cached per canvas size exactly like the
// vignette below. It is chrome, not simulation — deterministic off its own
// cell coordinates rather than the seeded stream, because it never needs to
// be reproducible from `?seed=` and never varies frame to frame (a twinkling
// version would cost a rebuild of the path every frame for an effect nobody
// asked to be louder than "not flat").
const GRAIN_CELL = 20;      // px between points, before jitter
const GRAIN_MAX_A = 0.05;

function hash01(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// A KOI FROM DIRECTLY ABOVE, and the proportions matter more than anything
// else here: the first version was a fifth as wide as it was long with a broad
// triangular tail, and it read unmistakably as a paper aeroplane. A carp is
// BLUNT at the snout, barely narrower across the head than across the body,
// widest just behind the gills at roughly a quarter of its length, and then
// tapers a long way to a slim wrist before the tail. Fractions of body length,
// one per spine joint; the widest full width is about L/4.4.
// THE SQUASH IS WHY THESE ARE WIDER THAN A KOI. Seen from directly above a
// carp is about 4.5 to 1; seen through a 0.60 squash, a fish swimming left to
// right has its WIDTH foreshortened and its length untouched, so a true 4.5:1
// draws as 7.5:1 and reads as a pike. These are the plane-space widths that
// land near 5:1 on a horizontal fish — and correspondingly stubby on one
// swimming away, which is what foreshortening is and what the single-squash
// rule buys. Judged from a rendered rig at three headings, not derived.
const WIDTH_PROFILE = [0.084, 0.118, 0.131, 0.126, 0.112, 0.092, 0.068, 0.043, 0.020];
const NOSE_LEAD = 0.030;     // how far the snout reaches past the first joint
const FISH_ALPHA = 1;       // see drawFish — a koi never fades
const EYE_R = 1.15;          // screen px — a koi's eye is tiny and it reads

// THE BODY BENDS NOW, AND THE BEND IS ONE MEASURED SCALAR, NOT NINE
// INDEPENDENT JOINTS (see the comment above headDir in drawFish for the
// mechanism and why it is one number rather than a per-joint frame — that
// second thing is exactly what the single-rigid-frame rewrite fixed, and
// this does not undo it). BEND_MAX_RAD caps how far the tail's own current
// direction is allowed to have fallen behind the nose's before the drawn
// body stops opening the difference any further — a real koi caught mid
// startle curls close to this; past it the clamp is what keeps a noisy
// reading (a fish an instant after spawning, say) from folding the body
// through itself. BEND_EPS is where "nearly straight" is treated as exactly
// straight, so the arc formula never has to divide by a near-zero angle.
const BEND_MAX_RAD = 2.6;             // ~149 degrees, tail to nose, over the body's length
const BEND_EPS = 1e-4;
// TWO APPENDAGES ARE ALSO CAPPED AGAINST THE LOCAL BEND RADIUS, AND FOR A
// DIFFERENT REASON THAN THE SHARED-FRAME FIX ABOVE THEM SOLVES A DIFFERENT
// FAILURE — this one has nothing to do with fins disagreeing with each
// other and everything to do with a fixed-length appendage extending in a
// STRAIGHT LINE off a body that is no longer straight. The dorsal's peak
// reaches several half-widths off the surface and the tail's own paddle
// reaches OVER HALF THE BODY'S LENGTH off its root — both sized for a body
// whose local radius of curvature is effectively infinite (straight). On a
// tightly curled body that radius can fall to the same order as either
// reach, and extending a straight segment PAST the radius it is curling
// around does not read as "a fin off the surface" — it reads as a shape
// flung out into open space, past the curl, which for the tail measured as
// a wedge torn sideways across the body's own silhouette (found by
// disabling each appendage in turn until the wedge disappeared: the dorsal
// alone did not explain it, the tail alone did). Both fractions cap the
// relevant reach at this share of |rr|, the local arc radius; a straight
// body has no radius to cap against and neither is affected. Tuned
// separately by eye (a peak and a paddle are different shapes reaching off
// a curl, and 0.55 alone left the tail's own wedge largely unchanged) —
// TAIL_REACH_RADIUS_FRAC is not "the same idea, smaller number" so much as
// the number this particular appendage needed.
const DORSAL_PEAK_RADIUS_FRAC = 0.55;
const TAIL_REACH_RADIUS_FRAC = 0.35;

// EVERY APPENDAGE IS A FRACTION ALONG (u, 0 nose -> 1 tail) AND A FRACTION
// ACROSS (a multiplier on the body's own half-width at that u), through the
// ONE frame drawFish builds — never a per-joint tangent. Named here, not
// buried in the function, so a fin that is in the wrong place is a number to
// change rather than a path to re-derive.
//
// EVERY FIN BELOW IS BUILT FROM CURVES, NEVER STRAIGHT EDGES MEETING AT A
// POINT. The reference this pass was drawn against — a flat, iconic koi
// illustration — has no sharp corners anywhere: the tail is a soft flared
// paddle, the pectoral a rounded blade rooted under the body, the dorsal a
// low blended swell rather than a spike. A shape built from line segments
// reads as folded paper against that; one built from curves reads as a fish.
const EYE_U = 0.09;
const BARBEL_U = 0.03;
const DORSAL_U0 = 0.46, DORSAL_U1 = 0.74, DORSAL_PEAK_U = 0.58;
const DORSAL_PEAK_K = 3.2;              // a quadratic curve undershoots its own control point
const PECT_U = 0.16;                    // where along the body the fin roots — right behind the
                                         // head, and clear of the dorsal's own u-range below
const PECT_ANGLE = 0.45;                // radians the fin's long axis sweeps back from straight-out
const PECT_LEN = 0.30;                  // of body length — the fin's own long axis
const PECT_WIDTH = 0.13;                // of body length — the fin's own short axis
const PECT_ROOT_T = 0.15;               // fraction of PECT_LEN the oval's centre sits ahead of the
                                         // root, along its own axis — so (0.5 - this) of the fin's
                                         // length sits behind the root, hidden under the body
const TAIL_ROOT_U = 0.97;               // pulled forward of u=1 so the root hides under the body
const TAIL_SPREAD = 0.50;               // radians each lobe swings out from the body's own axis
const TAIL_LEN = 0.54;                  // of body length, root to a lobe tip
const TAIL_NOTCH_LEN = 0.20;            // of body length, root to the fork curve's control point —
                                         // shallow, so the corner at each tip stays soft
const TAIL_BOW = 0.17;                  // of body length, how far each lobe's edge bows past its
                                         // own straight chord — the thing that makes it a paddle

// VOLUME CUES — the body is a flat oval by construction (surfacePoint has no
// height), so a rounded cross-section is IMPLIED, never modelled: a fixed
// world direction stands in for "the way the tilted view leans", and each
// fish's two flanks read as nearer or farther by how much that fish's OWN
// heading turns its width axis (R) toward or away from it. This is NOT the
// position-based perspective surface.js's own header rules out — nothing
// here depends on WHERE a fish is on the plane, only on which way it faces,
// which is exactly what an orthographic view still shows for a curved
// surface (a normal facing the light reads bright regardless of distance).
// NEAR_DIR = world +Y is an arbitrary but fixed pick, applied the same way
// to every fish; VOL_ALIGN is |cos(heading)| because a fish whose R is
// aligned with world X (heading pi/2 or 3pi/2) presents both flanks equally
// edge-on to a Y-tilted view, and every effect below must fall to exactly
// zero there rather than flip sides with a visible pop.
const BODY_FILL_RGB = [14, 16, 19];     // close to the old flat fill's own [13,15,18]
const BODY_FILL_A = 0.86;               // the flat body fill this replaces
const BODY_FILL_TONE_SPAN = 15;         // max +/- PER CHANNEL at full alignment
const FAR_FIN_COMPRESS = 0.16;          // max shrink on the far pectoral's own reach
const DORSAL_VOL_SPAN = 0.16;           // max +/- on the dorsal's own peak reach
const RIDGE_U0 = 0.12, RIDGE_U1 = 0.86; // the spine highlight's own span
const RIDGE_ALPHA = 0.24;               // its peak alpha, at full alignment

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

// Smooth a closed polygon by curving through the midpoints of its edges. Cheap,
// stable, and it rounds a snout without anyone having to place a control point.
function closedSmooth(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  const a0 = pts[n - 1], b0 = pts[0];
  ctx.moveTo((a0.x + b0.x) / 2, (a0.y + b0.y) / 2);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.closePath();
}

export function createRenderer(ctx, surface) {
  const sq = surface.squash;
  const P = (x, y) => ({ x, y: y * sq });

  // Reused bins — allocating these per frame is the one place this renderer
  // could put pressure on the collector, and a garbage pause in an ambient
  // piece is the whole of what the viewer would notice.
  const rippleBins = Array.from({ length: RIPPLE_BINS }, () => []);
  const rainBins = Array.from({ length: RAIN_BINS }, () => []);
  const washBins = Array.from({ length: WASH_BINS }, () => []);
  let vignette = null, vigKey = '';
  let grain = null, grainKey = '';

  function groundFor(w, h) {
    const key = `${w}x${h}`;
    if (key !== vigKey) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18,
                                         w / 2, h / 2, Math.hypot(w, h) * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      vignette = g; vigKey = key;
    }
    return vignette;
  }

  // Built once per canvas size, like the vignette: a Path2D of single-pixel
  // points on a jittered grid, filled whole every frame at one flat alpha.
  // Cheap because it is ONE fill of a cached path — the point positions never
  // move, so there is nothing to recompute after the first frame at a size.
  function grainFor(w, h) {
    const key = `${w}x${h}`;
    if (key !== grainKey) {
      const path = new Path2D();
      const cols = Math.ceil(w / GRAIN_CELL), rows = Math.ceil(h / GRAIN_CELL);
      for (let gy = 0; gy <= rows; gy++) {
        for (let gx = 0; gx <= cols; gx++) {
          const x = gx * GRAIN_CELL + hash01(gx, gy) * GRAIN_CELL;
          const y = gy * GRAIN_CELL + hash01(gx + 97, gy + 61) * GRAIN_CELL;
          path.rect(x, y, 1, 1);
        }
      }
      grain = path; grainKey = key;
    }
    return grain;
  }

  // --- one fish -----------------------------------------------------------
  function drawFish(f) {
    // NO FADE, ON PURPOSE. A koi is either in the pond at full ink or it is not
    // in the pond: it swims in from outside the frame and swims out again, so
    // there is never a moment where one is half-there in view (see the note at
    // the top of scene/koi-fish.js). The constant is kept because every mark
    // below is already written against it, so the day a scene wants a koi to
    // fade for some other reason it is one line rather than six.
    const a = FISH_ALPHA;
    const L = f.len;

    // THE BODY BENDS, AND THE BEND IS ONE MEASURED SCALAR — NOT NINE
    // INDEPENDENTLY WOBBLING JOINTS, WHICH IS WHAT THE SINGLE-RIGID-FRAME
    // REWRITE WAS BUILT TO AVOID (its own comment, restated because it still
    // applies): the previous per-joint renderer threaded each fin's own
    // tangent and normal off a slice of a spine that was ALSO being
    // distorted by a swim wave, so a dorsal fin, a pectoral and the tail fin
    // each reasoned about "which way is sideways" from a slightly different,
    // NOISY frame, and the three disagreed with each other and with the eye.
    // A rigid oval built straight from f.heading fixed that disagreement but
    // threw away real information along with the noise: it reads as a
    // compass needle, the whole body swinging in lockstep with wherever the
    // fish steers NOW, rather than a body a head has to visibly drag around
    // — a real koi's spine genuinely curves along its length mid-turn, the
    // head already round while the tail is still travelling roughly where
    // the head just was. f.spine (koi-fish.js's own lagged chase chain)
    // measures exactly that lag every frame, but reading it PER JOINT is the
    // noisy path back to the old defect. What is read instead is ONE number:
    // headDir is the nose's true, instantaneous direction (f.heading, not
    // lagged — the nose is exactly where the fish points right now); the
    // spine's LAST segment (sp[N-2] to sp[N-1], the freshest evidence of
    // where the body pointed a moment ago) gives tailFwd, its own local
    // "toward the nose" direction — the reverse of the segment itself,
    // because each joint is laid down BEHIND the one before it. The signed
    // angle from headDir to tailFwd (BEND, clamped) is then swept smoothly
    // along the body as a circular arc: Fu(u) rotates headDir by BEND*u, so
    // every station's local frame is a DETERMINISTIC function of u — a
    // smooth curve, not a ninth independent sample — which is what lets fins
    // root on a bending body without reopening the old disagreement. Fu(0)
    // is exactly headDir and pos/Fu reduce to the old straight, single-frame
    // formulas exactly when BEND is ~0 (straight swimming), so an
    // undisturbed fish is unaffected down to the last bit.
    const sp = f.spine;
    const headDir = { x: Math.cos(f.heading), y: Math.sin(f.heading) };
    const tA = sp[sp.length - 2], tB = sp[sp.length - 1];
    let ttx = tB.x - tA.x, tty = tB.y - tA.y;
    const ttm = Math.hypot(ttx, tty) || 1;
    ttx /= ttm; tty /= ttm;
    const tailFwd = { x: -ttx, y: -tty };
    // perp90CCW(headDir) — the axis Fu(u) sweeps toward as u leaves 0.
    const N0 = { x: -headDir.y, y: headDir.x };
    const rawBend = Math.atan2(
      headDir.x * tailFwd.y - headDir.y * tailFwd.x,
      headDir.x * tailFwd.x + headDir.y * tailFwd.y,
    );
    const BEND = Math.max(-BEND_MAX_RAD, Math.min(BEND_MAX_RAD, rawBend));
    const straight = Math.abs(BEND) < BEND_EPS;
    const rr = straight ? 0 : L / BEND;      // signed arc radius; unused while straight
    const Fu = (u) => {
      const ang = BEND * u, c = Math.cos(ang), s = Math.sin(ang);
      return { x: headDir.x * c + N0.x * s, y: headDir.y * c + N0.y * s };
    };
    const Ru = (u) => { const d = Fu(u); return { x: -d.y, y: d.x }; };
    const pos = (u) => {
      if (straight) return { x: f.x - headDir.x * u * L, y: f.y - headDir.y * u * L };
      const ang = BEND * u, s = Math.sin(ang), c = Math.cos(ang);
      return {
        x: f.x - rr * s * headDir.x - rr * (1 - c) * N0.x,
        y: f.y - rr * s * headDir.y - rr * (1 - c) * N0.y,
      };
    };
    // See "VOLUME CUES" above the constants: this is a property of the
    // WHOLE FISH's facing (which way the fixed tilt leans it), not of any
    // one station along a body that may now be curved, so it reads the
    // true, unlagged heading — exactly cos(heading), same as before any of
    // this shipped — rather than a station-dependent Fu(u).
    const nearAlign = headDir.x;
    const nearSide = nearAlign >= 0 ? 1 : -1;
    const volMag = Math.abs(nearAlign);
    const widthAt = (u) => {
      const n = WIDTH_PROFILE.length;
      const fi = Math.max(0, Math.min(n - 1, u * (n - 1)));
      const i0 = Math.min(n - 2, Math.floor(fi)), fr = fi - i0;
      return (WIDTH_PROFILE[i0] + (WIDTH_PROFILE[i0 + 1] - WIDTH_PROFILE[i0]) * fr) * L;
    };
    // Every appendage's own "sideways" now comes from Ru AT ITS OWN STATION,
    // not a fish-wide constant — which is safe here (see above) because Fu
    // is a smooth analytic function of u rather than a per-joint sample.
    const edge = (u, side, k = 1) => {
      const c = pos(u), r_ = Ru(u), w = widthAt(u) * k;
      return { x: c.x + r_.x * side * w, y: c.y + r_.y * side * w };
    };
    const sEdge = (u, side, k = 1) => { const e = edge(u, side, k); return P(e.x, e.y); };

    const SAMPLES = WIDTH_PROFILE.length;
    // Fu(0) === headDir exactly (angle 0), so the nose still extends in the
    // fish's true current heading — the leading point of a bending body is
    // still exactly where the fish points right now.
    const nose = P(pos(0).x + headDir.x * NOSE_LEAD * L, pos(0).y + headDir.y * NOSE_LEAD * L);

    const outline = [nose];
    for (let i = 0; i < SAMPLES; i++) { const e = edge(i / (SAMPLES - 1), 1); outline.push(P(e.x, e.y)); }
    for (let i = SAMPLES - 1; i >= 0; i--) { const e = edge(i / (SAMPLES - 1), -1); outline.push(P(e.x, e.y)); }

    // Body: a dark fill so the koi reads as a solid under the water and the
    // vignette does not show through it, then the outline over the top. The
    // fill is a gradient across the SHORT axis, not a flat colour — the near
    // flank a touch less dense (catching the tilt), the far flank a touch
    // more (receding from it) — which is what implies the flat oval has a
    // rounded belly-to-back cross-section rather than reading as a disc.
    // Both stops converge on BODY_FILL_A itself as volMag -> 0, so a fish
    // caught edge-on to the tilt (heading pi/2 or 3pi/2) fills flat rather
    // than showing a gradient with nothing left for it to mean.
    {
      // TONE, NOT ALPHA. The ground behind a koi is near-black and the flat
      // fill was already close to it ([13,15,18] on [8,9,11]), so swinging
      // the fill's ALPHA barely moved the composited pixel — the two colours
      // were too close to begin with for transparency to separate them.
      // Swinging the RGB channels themselves (still both dark, still within
      // the same restrained range) is what actually reads as one flank
      // catching a little light and the other receding from it.
      const farPt = sEdge(0.45, -nearSide, 1), nearPt = sEdge(0.45, nearSide, 1);
      const swing = volMag * BODY_FILL_TONE_SPAN;
      const nearRGB = BODY_FILL_RGB.map((c) => c + swing);
      const farRGB = BODY_FILL_RGB.map((c) => Math.max(0, c - swing));
      const grad = ctx.createLinearGradient(farPt.x, farPt.y, nearPt.x, nearPt.y);
      grad.addColorStop(0, rgba(farRGB, BODY_FILL_A * a));
      grad.addColorStop(1, rgba(nearRGB, BODY_FILL_A * a));
      ctx.beginPath(); closedSmooth(ctx, outline);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = rgba(INK_FISH, 0.70 * a);
      ctx.stroke();
    }

    // THE SPINE RIDGE — one light stroke along the near flank, standing in
    // for a rounded back distinct from the belly. It rides the same nearSide
    // the fill gradient uses (so the two cues never disagree about which
    // edge is "up") and the same volMag fade (so it has nothing left to draw
    // at the crossover heading rather than hopping to the other side). Kept
    // to a single thin stroke, well inside the body's own outline (0.72 of
    // the half-width), because this is the one cue most likely to clutter
    // the smallest koi in the pond (79px) — checked at that size before
    // shipping, not assumed safe from the formula alone.
    {
      const ridgeA = RIDGE_ALPHA * volMag * a;
      if (ridgeA > 0.004) {
        const steps = 6;
        const pts = [];
        for (let i = 0; i <= steps; i++) {
          const u = RIDGE_U0 + (RIDGE_U1 - RIDGE_U0) * (i / steps);
          pts.push(sEdge(u, nearSide, 0.72));
        }
        // Curved through midpoints, the same technique closedSmooth uses, so
        // a light spine line reads as smoothly as the outline it sits inside
        // rather than as a faceted polyline.
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const a0 = pts[i], b0 = pts[i + 1];
          const mx = (a0.x + b0.x) / 2, my = (a0.y + b0.y) / 2;
          ctx.quadraticCurveTo(a0.x, a0.y, mx, my);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = rgba(INK_FISH, ridgeA);
        ctx.stroke();
      }
    }

    // NO GILL LINE. The reference this pass was drawn against reads the head
    // and body as ONE continuous smooth silhouette — nothing marks a seam
    // between them — and a light arc across the shoulder (the previous
    // version's attempt at a head cue) fought that directly: it was the one
    // hard edge on an otherwise soft fish. The eyes are the head cue now, the
    // same way the reference uses only the patch pattern and the taper.

    // Markings. Drawn in the body's own LOCAL frame at the patch's own
    // station (u along, Ru(u) across), so a patch stays put on the fish —
    // and rides the bend with the surface it sits on — however it turns.
    if (f.patches.length) {
      ctx.lineWidth = 0.75;
      for (const pt of f.patches) {
        const c = pos(pt.s), halfW = widthAt(pt.s), fLocal = Fu(pt.s), rLocal = Ru(pt.s);
        const ox = c.x + rLocal.x * pt.t * halfW, oy = c.y + rLocal.y * pt.t * halfW;
        const ca = Math.cos(pt.rot), sa = Math.sin(pt.rot);
        const ax = fLocal.x * ca - fLocal.y * sa, ay = fLocal.x * sa + fLocal.y * ca;   // patch long axis
        const bx = -ay, by = ax;
        // ACROSS THE BODY A PATCH IS MEASURED IN HALF-WIDTHS, NOT IN BODY
        // LENGTHS. Sized off L in both axes, a marking came out wider than the
        // fish it sat on — two dark discs overhanging the outline, which is
        // most of what made the first koi unreadable. Along the body L is the
        // right unit; across it, it is not.
        const blob = [];
        for (let k = 0; k < 10; k++) {
          const th = (k / 10) * Math.PI * 2;
          const u = Math.cos(th) * pt.rx * L, v = Math.sin(th) * pt.ry * halfW;
          blob.push(P(ox + ax * u + bx * v, oy + ay * u + by * v));
        }
        ctx.beginPath(); closedSmooth(ctx, blob);
        ctx.fillStyle = rgba(INK_FISH, 0.13 * a);
        ctx.fill();
        ctx.strokeStyle = rgba(INK_FISH, 0.34 * a);
        ctx.stroke();
      }
    }

    // THE DORSAL FIN IS ONE CURVE, NOT TWO STRAIGHT LEGS MEETING AT A POINT —
    // a single quadraticCurveTo from one base point to the other, with the
    // peak as its CONTROL point rather than a vertex the outline passes
    // through. A quadratic curve undershoots its own control point (at
    // t=0.5 the curve sits only halfway from the base chord toward it), so
    // the result is a low, rounded swell blended into the body's own edge at
    // both ends — never a spike — which is why DORSAL_PEAK_K is taller than
    // the old triangle's. Which flank it sits on is a stable per-fish choice
    // (the fish's own id, not a coin flipped every frame), so the school
    // does not all lean the same way.
    {
      const side = (f.id % 2 === 0) ? 1 : -1;
      // The same volume cue as the body and fins: whichever flank the dorsal
      // happens to sit on this heading reads a little fuller when it is the
      // near one and a little lower when it is the far one, so the fin's own
      // apparent width turns WITH the fish rather than staying fixed while
      // everything around it implies rotation. side * nearAlign is already
      // signed (+ when this fin's side matches nearSide, - otherwise) and
      // magnitude-bounded by volMag, so it needs no separate near/far branch.
      const peakK = DORSAL_PEAK_K * (1 + DORSAL_VOL_SPAN * side * nearAlign);
      // ONE LOCAL FRAME FOR THE WHOLE FIN — at its own midpoint station,
      // not one Ru(u) per point the way the outline itself reads it. Read
      // per-point, a hard bend rotates Ru across the fin's own span (U0
      // 0.46 to U1 0.74) by tens of degrees and the three points disagree
      // about which way is outward — the exact disagreement the
      // single-rigid-frame rewrite exists to prevent, reopened WITHIN one
      // fin instead of between fins. `pos(u)` still tracks each point along
      // the true curved centreline; only the "which way is outward"
      // direction is shared.
      const dorsalR = Ru(DORSAL_PEAK_U);
      const baseAc = pos(DORSAL_U0), baseBc = pos(DORSAL_U1), peakC = pos(DORSAL_PEAK_U);
      const wA = widthAt(DORSAL_U0), wB = widthAt(DORSAL_U1);
      // See DORSAL_PEAK_RADIUS_FRAC above the constants: the shared frame
      // fixes WHICH WAY the peak reaches, but not HOW FAR — a big reach off
      // a tight curl still flings the point past its own bend, which is the
      // OTHER failure the first version of this shipped with.
      let wP = widthAt(DORSAL_PEAK_U) * peakK;
      if (!straight) wP = Math.min(wP, DORSAL_PEAK_RADIUS_FRAC * Math.abs(rr));
      const baseA = P(baseAc.x + dorsalR.x * side * wA, baseAc.y + dorsalR.y * side * wA);
      const baseB = P(baseBc.x + dorsalR.x * side * wB, baseBc.y + dorsalR.y * side * wB);
      const peak = P(peakC.x + dorsalR.x * side * wP, peakC.y + dorsalR.y * side * wP);
      ctx.beginPath();
      ctx.moveTo(baseA.x, baseA.y);
      ctx.quadraticCurveTo(peak.x, peak.y, baseB.x, baseB.y);
      ctx.fillStyle = rgba(INK_FISH, 0.20 * a);
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = rgba(INK_FISH, 0.52 * a);
      // THE BASE ITSELF IS NOT STROKED — it is exactly the body's own edge,
      // so drawing it again would only double a line already there.
      ctx.beginPath();
      ctx.moveTo(baseA.x, baseA.y);
      ctx.quadraticCurveTo(peak.x, peak.y, baseB.x, baseB.y);
      ctx.stroke();
    }

    // THE CAUDAL FIN IS A SOFT FLARED PADDLE, NOT A KITE — every edge a
    // curve, none of them a straight line meeting another at a point. `back`
    // is the body's own LOCAL -Fu AT THE TAIL ROOT (not a fish-wide
    // constant, so the fin flicks off wherever a bending body's own end
    // actually points), and rotating it by ±TAIL_SPREAD gives the two
    // lobes' directions exactly as before; what changed is how the three
    // points between them are connected. Each lobe's leading edge (root to
    // its tip) BOWS outward past its own straight chord — `bow()` is the
    // chord's midpoint pushed out along the lobe's own direction — so the
    // paddle has a convex belly instead of a flat side. The fork between the
    // two tips is ONE quadratic curve with NOTCH as its control point rather
    // than a vertex: a quadratic curve does not reach its control point, so
    // the fork dips TOWARD where the old fork's point was without ever
    // sharpening into it — a scallop, not a V.
    {
      const root = pos(TAIL_ROOT_U);
      const tailTip = pos(1);
      const tailDir = Fu(TAIL_ROOT_U);
      const back = { x: -tailDir.x, y: -tailDir.y };
      const rot = (v, ang) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
      };
      const dirUp = rot(back, TAIL_SPREAD), dirDown = rot(back, -TAIL_SPREAD);
      // See TAIL_REACH_RADIUS_FRAC above the constants: TAIL_LEN reaches
      // over half the body's own length in a straight line off the root,
      // which on a tightly curled body overshoots past the curl itself.
      // `reach` scales TAIL_LEN, TAIL_NOTCH_LEN and TAIL_BOW down TOGETHER
      // so the paddle shrinks as one shape rather than losing its own
      // proportions — never grows past 1, so a straight body is unaffected.
      const reach = straight ? 1 : Math.min(1, (TAIL_REACH_RADIUS_FRAC * Math.abs(rr)) / (TAIL_LEN * L));
      const tipUp = { x: tailTip.x + dirUp.x * TAIL_LEN * L * reach, y: tailTip.y + dirUp.y * TAIL_LEN * L * reach };
      const tipDown = { x: tailTip.x + dirDown.x * TAIL_LEN * L * reach, y: tailTip.y + dirDown.y * TAIL_LEN * L * reach };
      const notch = { x: tailTip.x + back.x * TAIL_NOTCH_LEN * L * reach, y: tailTip.y + back.y * TAIL_NOTCH_LEN * L * reach };
      const bow = (p0, p1, dir) => ({
        x: (p0.x + p1.x) / 2 + dir.x * TAIL_BOW * L * reach,
        y: (p0.y + p1.y) / 2 + dir.y * TAIL_BOW * L * reach,
      });
      const bowUp = bow(root, tipUp, dirUp), bowDown = bow(root, tipDown, dirDown);
      const rootP = P(root.x, root.y), tipUpP = P(tipUp.x, tipUp.y),
            tipDownP = P(tipDown.x, tipDown.y), notchP = P(notch.x, notch.y),
            bowUpP = P(bowUp.x, bowUp.y), bowDownP = P(bowDown.x, bowDown.y);
      // FILL CLOSES THE SHAPE WITH ITS OWN CURVE BACK TO THE ROOT; THE
      // STROKE MUST NOT DRAW THAT SEGMENT. The root sits just inside the
      // body outline (TAIL_ROOT_U < 1) so the seam hides under it — stroking
      // it would draw that seam as a visible line across the peduncle.
      ctx.beginPath();
      ctx.moveTo(rootP.x, rootP.y);
      ctx.quadraticCurveTo(bowUpP.x, bowUpP.y, tipUpP.x, tipUpP.y);
      ctx.quadraticCurveTo(notchP.x, notchP.y, tipDownP.x, tipDownP.y);
      ctx.quadraticCurveTo(bowDownP.x, bowDownP.y, rootP.x, rootP.y);
      ctx.fillStyle = rgba(INK_FISH, 0.16 * a);
      ctx.fill();
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = rgba(INK_FISH, 0.42 * a);
      ctx.beginPath();
      ctx.moveTo(rootP.x, rootP.y);
      ctx.quadraticCurveTo(bowUpP.x, bowUpP.y, tipUpP.x, tipUpP.y);
      ctx.quadraticCurveTo(notchP.x, notchP.y, tipDownP.x, tipDownP.y);
      ctx.stroke();
    }

    // Pectorals — a ROUNDED PADDLE on the LEFT and RIGHT edges, just behind
    // the nose, not a triangle. Two straight legs meeting at a tip read as a
    // shark fin or, worse, a hook once the tip is small; the reference's
    // pectoral is a soft blade rooted under the body and tapering to a blunt
    // rounded end. Built exactly the way a marking is — a closed ellipse of
    // points run through closedSmooth — and rooted so only its outward
    // PECT_ROOT_T-to-1 stretch shows past the body's own edge, PECT_ROOT_T
    // of it sitting back under the body fill: that partial hiding is what
    // makes it read as growing OUT of the fish instead of floating beside
    // it. On its own slower clock (`finPhase`) so it reads as alive without
    // the spine's help.
    {
      const flap = 0.72 + Math.sin(f.finPhase) * 0.28;
      for (const side of [1, -1]) {
        const root = edge(PECT_U, side, 0.92);
        const fLocal = Fu(PECT_U), rLocal = Ru(PECT_U);
        const ca = Math.cos(PECT_ANGLE), sa = Math.sin(PECT_ANGLE);
        // Long axis: straight outward (Ru(PECT_U)*side), swept back toward
        // the tail (-Fu(PECT_U)) by PECT_ANGLE — the fin's own station's
        // local frame, not a fish-wide constant. Short axis is just the
        // long one turned a quarter turn.
        const axX = rLocal.x * side * ca - fLocal.x * sa, axY = rLocal.y * side * ca - fLocal.y * sa;
        const bxX = -axY, bxY = axX;
        // THE FAR FIN READS SMALLER, NEVER THE NEAR ONE. Two mirrored ovals
        // of identical size is exactly the flat-cutout look this pass is
        // meant to break; max(0, -side*nearAlign) is 0 on the near side
        // (side===nearSide) at any heading and rises to volMag on the far
        // side, so the near fin is always drawn at its full, undiminished
        // reach and only the far one compresses.
        const compress = 1 - FAR_FIN_COMPRESS * Math.max(0, -side * nearAlign);
        const len = PECT_LEN * L * flap * compress, wid = PECT_WIDTH * L * compress;
        const cx = root.x + axX * len * PECT_ROOT_T, cy = root.y + axY * len * PECT_ROOT_T;
        const blob = [];
        for (let k = 0; k < 12; k++) {
          const th = (k / 12) * Math.PI * 2;
          const u = Math.cos(th) * len * 0.5, v = Math.sin(th) * wid * 0.5;
          blob.push(P(cx + axX * u + bxX * v, cy + axY * u + bxY * v));
        }
        ctx.beginPath(); closedSmooth(ctx, blob);
        ctx.fillStyle = rgba(INK_FISH, 0.20 * a);
        ctx.fill();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = rgba(INK_FISH, 0.50 * a);
        ctx.stroke();
      }
    }

    // Barbels — two of them, which is what makes a carp a koi at a glance.
    {
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba(INK_FISH, 0.30 * a);
      const wig = Math.sin(f.finPhase * 1.4) * 0.012;
      const c = pos(BARBEL_U), baseW = widthAt(BARBEL_U);
      const fLocal = Fu(BARBEL_U), rLocal = Ru(BARBEL_U);
      for (const side of [1, -1]) {
        const base = sEdge(BARBEL_U, side, 0.5);
        const tip = P(c.x + rLocal.x * side * (baseW * 0.5 + 0.085 * L) + fLocal.x * (0.02 + wig) * L,
                      c.y + rLocal.y * side * (baseW * 0.5 + 0.085 * L) + fLocal.y * (0.02 + wig) * L);
        const ctrl = P(c.x + rLocal.x * side * (baseW * 0.5 + 0.03 * L) + fLocal.x * 0.06 * L,
                       c.y + rLocal.y * side * (baseW * 0.5 + 0.03 * L) + fLocal.y * 0.06 * L);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
        ctx.stroke();
      }
    }

    // Two eyes. A koi's eye is about a pixel across at this size and it is the
    // cheapest mark on the fish by far — it is also the one that settles which
    // end is the head, which nothing else here does at a glance.
    {
      ctx.fillStyle = rgba(INK_FISH, 0.55 * a);
      for (const side of [1, -1]) {
        const e = sEdge(EYE_U, side, 0.72);
        ctx.beginPath();
        ctx.arc(e.x, e.y, EYE_R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- the whole frame -----------------------------------------------------
  function draw({ width, height, fish, ripples, drops, fallDir, storm, reducedMotion, ripplePhase }) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, width, height);

    // The jolt. The rain and the flash ride it too, so the whole picture moves
    // rather than the water sliding under a static sky.
    const shake = reducedMotion ? 0 : storm.shake;
    ctx.save();
    if (shake > 0) {
      const k = shake * 9;
      ctx.translate(Math.sin(ripplePhase * 47) * k, Math.cos(ripplePhase * 39) * k * 0.6);
    }

    ctx.fillStyle = groundFor(width, height);
    ctx.fillRect(0, 0, width, height);

    // The grain: one fill of a cached path, so open water carries a fixed,
    // faint texture instead of reading as a single flat value between rings.
    ctx.fillStyle = rgba(INK, GRAIN_MAX_A);
    ctx.fill(grainFor(width, height));

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const f of fish) drawFish(f);

    // Ripples, binned by alpha and stroked a bin at a time. A wash rides
    // under them at a fraction of the alpha, one fill per bin, off the SAME
    // pass over the list — the disturbed water reading very slightly
    // brighter than the still water around it, never a second read of
    // `ripples`.
    for (const b of rippleBins) b.length = 0;
    for (const b of washBins) b.length = 0;
    for (const rip of ripples) {
      const u = rip.age / rip.life;
      if (u <= 0 || u >= 1) continue;
      const attack = u < 0.06 ? u / 0.06 : 1;
      const base = attack * ((1 - u) * 0.6 + Math.pow(1 - u, 3) * 0.4) * (0.30 + 0.70 * rip.strength);
      if (rip.r > 1 && base > 0.02) {
        const wbin = Math.min(WASH_BINS - 1, Math.floor(base * WASH_BINS));
        washBins[wbin].push(rip.x, rip.y, rip.r);
      }
      for (let k = 0; k < rip.rings; k++) {
        const uk = u - k * 0.13;
        if (uk <= 0) continue;
        const rk = rip.maxR * (1 - (1 - uk) * (1 - uk));
        const ak = base * (1 - k * 0.34);
        if (ak < RIPPLE_MIN_A || rk < 0.6) continue;
        const bin = Math.min(RIPPLE_BINS - 1, Math.floor(ak * RIPPLE_BINS));
        rippleBins[bin].push(rip.x, rip.y, rk);
      }
    }
    for (let b = 0; b < WASH_BINS; b++) {
      const bin = washBins[b];
      if (!bin.length) continue;
      ctx.beginPath();
      for (let i = 0; i < bin.length; i += 3) surface.ellipse(ctx, bin[i], bin[i + 1], bin[i + 2]);
      ctx.fillStyle = rgba(INK, ((b + 0.5) / WASH_BINS) * WASH_MAX_A);
      ctx.fill();
    }
    ctx.lineWidth = 1.05;
    for (let b = 0; b < RIPPLE_BINS; b++) {
      const bin = rippleBins[b];
      if (!bin.length) continue;
      ctx.beginPath();
      for (let i = 0; i < bin.length; i += 3) surface.ellipse(ctx, bin[i], bin[i + 1], bin[i + 2]);
      ctx.strokeStyle = rgba(INK, (b + 0.5) / RIPPLE_BINS);
      ctx.stroke();
    }

    // Rain, same trick. A streak is a straight line in the air, so it is drawn
    // in screen space and the squash never touches it.
    for (const b of rainBins) b.length = 0;
    for (const d of drops) {
      const back = (1 - d.p) * d.dist;
      const x = d.lx - fallDir.x * back, y = d.ly - fallDir.y * back;
      if (y < -d.len - 4 || y > height + 4 || x < -d.len - 4 || x > width + d.len + 4) continue;
      const bin = Math.min(RAIN_BINS - 1, Math.floor(d.alpha * RAIN_BINS));
      rainBins[bin].push(x, y, x - fallDir.x * d.len, y - fallDir.y * d.len);
    }
    ctx.lineWidth = 0.95;
    for (let b = 0; b < RAIN_BINS; b++) {
      const bin = rainBins[b];
      if (!bin.length) continue;
      ctx.beginPath();
      for (let i = 0; i < bin.length; i += 4) {
        ctx.moveTo(bin[i], bin[i + 1]);
        ctx.lineTo(bin[i + 2], bin[i + 3]);
      }
      ctx.strokeStyle = rgba(INK_RAIN, (b + 0.5) / RAIN_BINS * 0.9);
      ctx.stroke();
    }

    ctx.restore();

    // PLACEHOLDER LIGHTNING. A white wash over the frame, capped hard under
    // prefers-reduced-motion, which also drops the jolt entirely above.
    if (storm.flash > 0) {
      const cap = reducedMotion ? 0.26 : 0.82;
      ctx.fillStyle = `rgba(238,243,250,${(storm.flash * cap).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  return { draw, drawFish };
}
