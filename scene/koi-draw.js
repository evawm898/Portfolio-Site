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
// FAINT RINGS ARE CULLED, AND THIS IS THE ONE LEVER THAT COST NOTHING TO PULL.
// At 0.014 a ring composites to about 4/255 over the ground — under the noise
// floor of the image — and at a couple of hundred live ripples, each drawing
// two rings, most of the stroke work in a frame was going into rings nobody can
// see. Measured on the real page during a downpour, 1280x800 headless:
//   0.014 -> 13.6 fps, 90% of the idle surface covered
//   0.035 -> 15.2 fps, 89%
//   0.060 -> 17.8 fps, 92%
// The size ceiling was tried first and is the WRONG lever — dropping the reach
// from 170 to 100 plane px takes idle coverage 94% -> 55% and buys 1.6 fps,
// because the large slow rings are most of what makes the surface read as
// covered. This drops invisible work instead, which is why the picture holds.
const RIPPLE_MIN_A = 0.06;

// The wash under a ripple's own front: a flat, batched fill (never a per-
// ripple gradient — hundreds of those would cost real time) so it reads as a
// soft brightening rather than a hard coin, its ceiling is kept low enough
// that the edge is not the thing anyone notices.
const WASH_BINS = 5;
const WASH_MAX_A = 0.05;
// THE WASH RIDES THE FRESH HALF OF A RIPPLE ONLY, AND THE DENSITY IS WHY. Its
// job is to make disturbed water read brighter than still water — but with the
// surface now better than 90% covered there IS no still water to read against,
// so a wash under every ring at every age is a flat brightening of the whole
// frame that happens to cost the most expensive thing in the renderer: a large
// translucent filled ellipse, hundreds of them a frame. Measured on the real
// page during a downpour, 1280x800 headless: 13.1 fps with the wash on every
// ripple against 15.1 with none at all, and the ripple CAP makes no difference
// at all to either (600, 450 and 340 all read 13). Keeping it to the fresh half
// is where it still says something — a ring that has just landed against the
// older ones spreading around it.
const WASH_UNTIL = 0.5;        // of a ripple's own life

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

// A KOI FROM DIRECTLY ABOVE, DRAWN AS ONE CONTINUOUS CONTOUR. The nose, both
// flanks and every strand of the tail are a SINGLE closed path, built once and
// stroked once, and that is the whole construction rather than a detail of it.
// What it replaces was a body oval with a tail, two pectorals and a dorsal
// swell composited over it as separate shapes — which is what let the tail read
// as a kite bolted to a dart, and what gave the reverted bend work somewhere to
// come apart. There is nothing here that can fall out of step with anything
// else, because there is only one path to be in step with.
//
// THE CONTOUR'S ORDER, every point of it in the fish's own rigid frame:
//   the right flank, nose (u=0) -> tail root (u=1)
//   the tail, rightmost strand to leftmost: out along each strand's right edge,
//     around its tip, back along its left edge
//   the left flank, tail root -> nose
//   the blunt snout, swept around the front to close
//
// THE STRANDS' ROOTS TILE THE TAIL ROOT'S OWN WIDTH EXACTLY — strand k's left
// edge at the root IS strand k-1's right edge, and the outermost strand's outer
// root edge IS the flank's last point. So the fork between two strands is this
// one path returning to the root and going out again: a notch, never a seam
// between two shapes, and there is no gap for a fill to leak through however
// the fish is turned or (later) bent.
//
// NOTHING HERE IMPLIES A CAMERA ANGLE OR A THIRD DIMENSION. The koi is a flat
// drawing: one ink, one line weight family, no gradient across the body, no
// highlight along a flank, no fin that shrinks because it is the far one, no
// quantity anywhere keyed on cos(heading). The water carries the viewpoint —
// that is what the squash in surface.js is for — and the fish does not repeat
// the claim. (This is a ruled direction, not a reading of it: see the session
// that removed the volume cues #226 had added.)

// Fractions of BODY LENGTH (nose to tail root), one per station, linearly
// interpolated between. BLUNT AT THE SNOUT: station 0 is a real width, not a
// point, and the nose is closed by a dome of its own rather than by running the
// outline into a vertex — a carp is barely narrower across the head than across
// the shoulders, and a pointed snout was most of what made the old silhouette
// read as a dart. Widest just behind the head, then a long even taper to a
// wrist that still has width in it for the tail to grow out of.
//
// AND THE SQUASH IS WHY THESE ARE WIDER THAN A CARP. Seen from directly above a
// koi is about 4.5 to 1; seen through a 0.60 squash, a fish swimming across the
// screen has its WIDTH foreshortened and its length untouched, so a true 4.5:1
// draws nearer 7.5:1 and reads as a pike. One squash means the apparent
// proportion has to change with heading — that is what an oblique orthographic
// view IS — so these are a compromise, landing near 5:1 across the screen and
// correspondingly stubby on a fish swimming away. Judged at the page's own 96px
// body, not at a magnification: at 2.6x every value here looked fine.
const WIDTH_PROFILE = [0.076, 0.114, 0.131, 0.125, 0.111, 0.095, 0.080, 0.064, 0.049];
const NOSE_ROUND = 0.062;     // how far the blunt snout domes past station 0
const NOSE_PTS = 7;           // points in that dome, endpoints excluded
const FISH_ALPHA = 1;         // see drawFish — a koi never fades

// THE TAIL IS ONE MEMBRANE WITH A SCALLOPED TRAILING EDGE. Its lobes are
// notches in a single envelope, never separate pieces sharing a root — see the
// note above fanPts for the construction that was tried first and why no value
// of its constants could have worked.
//
// TWO LOBES, DEEPLY FORKED, NOT A BROAD FOUR-LOBE FAN. The ink reference is a
// pair of long tapering streamers splayed about 35 degrees either side of the
// axis with the fork cutting most of the way back between them — not a paddle
// with a wavy edge. Same envelope, different numbers: TAIL_LOBES is what sets
// how many maxima the trailing edge has, and the scallop and fork depths are
// what carry the fork back.
const TAIL_LEN = 0.64;        // of body length, the outer tips' own reach
const TAIL_SPREAD = 0.62;     // rad, half-angle the fan covers
const TAIL_LOBES = 2;         // maxima across the trailing edge
const TAIL_SCALLOP = 0.46;    // how deep the notches between them cut
const TAIL_FORK = 0.26;       // the extra notch on the axis — the fork itself
const TAIL_FORK_W = 0.34;     // how wide that fork is, in fan fractions
const TAIL_TIP_SHORT = 0.06;  // how much the middle falls short of the tips
const TAIL_ROOT_U = 0.90;     // the fan's apex, pulled forward so it hides under
                              // the body — without this the tail converged on a
                              // single point and met the wrist as a hard V
const TAIL_PTS = 30;          // samples across the envelope
const TAIL_RAYS = 11;

// The paired fins, the same envelope at a smaller size. LONG, POINTED AND
// SWEPT WELL BACK — the ink reference's pectorals are streamers reaching about
// half the body length, not the short rounded blades that were here. `reach`
// is (1 - q^2)^FIN_TAPER: full length straight out along the fin's own axis,
// falling to nothing at either side, so the lobe comes to a point at its far
// end and is widest near its root. A rounded outer edge is what made these
// read as lily-pads; a taper is what makes them read as fins.
//
// AND THE PELVICS ARE PLAINLY SMALLER THAN THE PECTORALS. Four streamers of
// near-equal length around one body read as a rosette however well each single
// one is drawn — measured by looking at it. In the ink reference the pectorals
// carry the gesture and the pelvics are tucked and short.
const FIN_SPREAD = 0.25, FIN_TAPER = 0.62, FIN_RAYS = 4;
const PECT_U = 0.23, PECT_ANGLE = 1.00, PECT_LEN = 0.40, PECT_ROOT = 0.30;
const PELVIC_U = 0.60, PELVIC_ANGLE = 1.14, PELVIC_LEN = 0.17, PELVIC_ROOT = 0.35;

// The dorsal fin seen from directly above is a line down the spine, which is
// exactly what the reference draws. NOT the removed spine ridge: that sat on
// one FLANK and swung with the heading to imply a rounded back. This is on the
// axis, the same at every heading, and it is an edge of the fish rather than a
// shading cue.
const DORSAL_U0 = 0.20, DORSAL_U1 = 0.82, DORSAL_A = 0.22;

// THE BEND. One curvature for the whole animal: every point of the contour,
// both pectorals, both pelvics, the tail and every marking go through ONE
// mapping onto ONE spine. There is no per-part frame and no second oscillator.
//
// THE CURVATURE IS A FUNCTION OF (POSITION ALONG THE BODY, TIME) AND THE TURN,
// IN THAT ORDER OF IMPORTANCE. A travelling S-wave runs down the body ALWAYS —
// swimming dead straight included — and the turn is a BIAS added on top of it,
// never a replacement for it. Keyed on turn rate alone the fish was a rigid arc
// whenever it was not turning, and the bend appeared and vanished with the
// steering rather than flowing: that reads as choppy because a fish that is not
// undulating is not swimming, it is being dragged. So a turning koi shows the
// same wave skewed toward the turn, which is what a fish actually does.
//
// THE WAVE GROWS TOWARD THE TAIL. A koi's head barely leaves the line of travel
// while the tail sweeps widely, so the curvature amplitude is enveloped along
// the body rather than uniform — a uniform wave wags the snout, which is the
// one thing that never happens.
//
// THE PHASE IS THE FISH'S OWN SWIM CLOCK (`f.phase` in koi-fish.js), which
// already advances faster the faster it swims. So a koi driving hard beats
// faster than one drifting, with nothing here to keep in step.
//
// IT IS INTEGRATED, NOT CLOSED FORM, AND THAT IS THE COST OF THE WAVE. With a
// constant curvature the arc has an exact solution; with k varying along the
// body the heading is its integral and the spine is the integral of that, so
// the spine is walked once per fish per frame at BEND_SAMPLES steps and every
// drawn point interpolates between them. The buffers are hoisted to the
// renderer and reused, because per-fish allocation every frame is the one place
// this renderer could put pressure on the collector.
const BEND_WAVES = 1.15;         // wavelengths along the snout-to-tail-tip length
const BEND_WAVE_SWEEP = 1.60;    // rad of heading swing the wave imposes
// THE ENVELOPE HAS A FLOOR, AND WITHOUT IT THE BODY IS RIGID. A pure u^p
// envelope leaves the front two thirds of the fish with almost no curvature —
// measured, at u 0.5 it is 0.39 of full and at 0.25 it is 0.16 — so the S never
// forms along the BODY and only the tail flicks, which reads as a stiff fish
// with a loose tail rather than as swimming. The reference plate's curve runs
// the whole length: the head yaws a little, the middle bows, the tail sweeps
// most. A floor of about a fifth gives the head that much and no more.
const BEND_ENV_BASE = 0.22;      // the head's own share of the wave
const BEND_ENV_POW = 1.10;       // how fast the rest grows tailward
const BEND_SAMPLES = 28;         // spine steps; every drawn point lerps between
// THE TURN'S BIAS IS DELIBERATELY SMALLER THAN THE WAVE'S SWING, because a
// turning fish must still be seen to be SWIMMING. At 0.80 the bias swamped the
// wave at hard turns — measured, the tail tip's swing over a cycle collapsed
// from 77 px to 7 on a 96 px body — which is the wave disappearing in favour of
// a static turn-bend, exactly the failure this rebuild is for.
const BEND_MAX_TURN = 0.45;      // rad of turn BIAS, snout to tail tip, saturated
const BEND_OMEGA_REF = 1.6;      // rad/s — the turn rate that reaches ~0.76 of it
// Where along the snout-to-tail-tip length the spine is pinned, as a fraction
// of it. 0.20 of the 1.54 body lengths that span is about a third of a BODY
// back from the snout, which is roughly where a swimming fish's yaw pivot sits.
// 0.5 would minimise the worst excursion and is wrong: a head that swings as
// far as a tail does not read as a fish.
const BEND_ANCHOR_U = 0.20;

const BODY_FILL_A = 0.13;     // the koi as a solid under the water, flat
const OUTLINE_A = 0.42;       // softened: this was the hardest edge in the frame
const OUTLINE_W = 1.0;
const FIN_FILL_A = 0.09, FIN_LINE_A = 0.28, FIN_LINE_W = 0.75;
const RAY_A = 0.22;           // the fin rays, the reference's own detail
const PATCH_FILL_A = 0.11;    // no stroke — the reference's markings have no edge

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
  // The plain plane->screen projection. drawFish SHADOWS this with its own,
  // which carries the bend as well; everything else on the water is already
  // in plane coordinates and only needs the squash.
  const P = (x, y) => ({ x, y: y * sq });

  // Reused bins — allocating these per frame is the one place this renderer
  // could put pressure on the collector, and a garbage pause in an ambient
  // piece is the whole of what the viewer would notice.
  const rippleBins = Array.from({ length: RIPPLE_BINS }, () => []);
  const rainBins = Array.from({ length: RAIN_BINS }, () => []);
  const washBins = Array.from({ length: WASH_BINS }, () => []);
  // The spine, walked once per fish per frame and interpolated by every drawn
  // point. Hoisted and reused: allocating three arrays per fish per frame is
  // exactly the collector pressure this renderer's header warns about.
  const spineX = new Float64Array(BEND_SAMPLES + 1);
  const spineY = new Float64Array(BEND_SAMPLES + 1);
  const spineH = new Float64Array(BEND_SAMPLES + 1);
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
  // A FIN IS A POLAR ENVELOPE ABOUT ITS OWN ROOT, AND THAT IS THE WHOLE OF THE
  // FIN GEOMETRY HERE — the tail's, the pectorals', the pelvics'. `reach(u)` is
  // how far the fin gets at u across its own spread (+1 one side, -1 the other),
  // and the outline is simply that curve swept through the fan.
  //
  // WHAT THIS REPLACED, AND WHY IT COULD NOT BE TUNED INTO WORKING: the tail was
  // built as four separate STRANDS radiating out and back from the peduncle. A
  // caudal fin is not that. It is one broad membrane whose TRAILING EDGE is
  // scalloped, and four strands sharing a root produce, at every setting, the
  // same two failures — the roots crowd into a knot at the peduncle (they all
  // start within one root-width of each other) and the fish reads as pinched
  // then sprayed. Widening the fan separates the roots and splays the blades;
  // narrowing it tightens the knot. There is no value in between, because the
  // shape being asked for is not in the family. Here the lobes are notches in
  // ONE envelope, so there is no root to crowd.
  const rotUnit = (v, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  };

  // Sweep the envelope from +1 (the fish's RIGHT) to -1, pushing PLANE points.
  //
  // THE SIGN ON THE ANGLE IS LOAD-BEARING AND ITS ABSENCE LOOKED ALMOST RIGHT.
  // `axis` for the tail is -F, and rotating -F by a POSITIVE angle lands on the
  // fish's LEFT — so sweeping +1 to -1 with `+u * spread` entered the fan on the
  // wrong flank, and the contour crossed itself twice at the peduncle: once
  // going in, once coming out. A nonzero fill unions straight over that, so the
  // tail still looked like a tail; what gave it away was the STROKE, which drew
  // both crossings as a faint X on the wrist. Negated here, where both the tail
  // and the paired fins read it, rather than at either call site.
  function fanPts(out, origin, axis, spread, reach, samples) {
    for (let i = 0; i <= samples; i++) {
      const u = 1 - 2 * (i / samples);
      const d = rotUnit(axis, -u * spread), r = reach(u);
      out.push({ x: origin.x + d.x * r, y: origin.y + d.y * r });
    }
  }

  // The rays inside a fin: straight lines from just outside the root to just
  // short of the envelope. The reference draws a lot of these; a handful reads
  // as the same thing at the size a koi is on this page.
  function raysInto(P, origin, axis, spread, reach, count, inner, outer) {
    for (let k = 0; k < count; k++) {
      const u = count === 1 ? 0 : (k / (count - 1)) * 2 - 1;
      const d = rotUnit(axis, -u * spread), r = reach(u);
      const p0 = P(origin.x + d.x * r * inner, origin.y + d.y * r * inner);
      const p1 = P(origin.x + d.x * r * outer, origin.y + d.y * r * outer);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }
  }

  function drawFish(f) {
    // NO FADE, ON PURPOSE. A koi is either in the pond at full ink or it is not
    // in the pond: it swims in from outside the frame and swims out again, so
    // there is never a moment where one is half-there in view (see the note at
    // the top of scene/koi-fish.js).
    const a = FISH_ALPHA;
    const L = f.len;

    // ONE CANONICAL FRAME, AND ONE MAPPING OUT OF IT. Every shape below is
    // built with the nose at the origin pointing along +x — so `pos(u)` walks
    // straight back down the axis and `edge(u, side, k)` is k half-widths out
    // from it — and `P` is the single place that carries a canonical point onto
    // the bent spine, into the world, and through the squash. Nothing between
    // here and there knows the fish's heading, its position or its curvature,
    // which is what makes it impossible for two parts to disagree about them.
    const F = { x: 1, y: 0 };
    const R = { x: 0, y: 1 };
    const pos = (u) => ({ x: -u * L, y: 0 });

    const widthAt = (u) => {
      const n = WIDTH_PROFILE.length;
      const fi = Math.max(0, Math.min(n - 1, u * (n - 1)));
      const i0 = Math.min(n - 2, Math.floor(fi)), fr = fi - i0;
      return (WIDTH_PROFILE[i0] + (WIDTH_PROFILE[i0 + 1] - WIDTH_PROFILE[i0]) * fr) * L;
    };
    const edge = (u, side, k = 1) => {
      const c = pos(u), w = widthAt(u) * k;
      return { x: c.x + R.x * side * w, y: c.y + R.y * side * w };
    };

    // THE TAIL'S ENVELOPE. Three terms, each one shape the reference has:
    //   `outer` — the two outermost tips reach furthest
    //   `scallop` — TAIL_LOBES maxima across the fan, so the trailing edge
    //     waves instead of arcing; the lobes ARE these, not separate pieces
    //   `fork`  — one deeper notch on the axis, which is what makes it a
    //     forked tail rather than a scalloped paddle
    const back = { x: -F.x, y: -F.y };
    const tailReach = (u) => {
      const outer = 1 - TAIL_TIP_SHORT * (1 - u * u);
      const scallop = 1 - TAIL_SCALLOP * (0.5 - 0.5 * Math.cos((TAIL_LOBES - 1) * Math.PI * (u + 1)));
      const fork = 1 - TAIL_FORK * Math.exp(-(u / TAIL_FORK_W) * (u / TAIL_FORK_W));
      return TAIL_LEN * L * outer * scallop * fork;
    };

    // A paired fin: a fan about a root just inside the flank, swept back toward
    // the tail. Broad and rounded at its outer edge — a fin, not a leaf.
    const finAt = (u, side, ang, len, rootK) => {
      const bx = R.x * side * Math.cos(ang) - F.x * Math.sin(ang);
      const by = R.y * side * Math.cos(ang) - F.y * Math.sin(ang);
      const m = Math.hypot(bx, by) || 1;
      const base = { x: bx / m, y: by / m };
      return {
        origin: edge(u, side, rootK), axis: base, spread: FIN_SPREAD,
        reach: (q) => len * L * Math.pow(Math.max(0, 1 - q * q), FIN_TAPER),
      };
    };

    const fins = [
      finAt(PECT_U, 1, PECT_ANGLE, PECT_LEN, PECT_ROOT),
      finAt(PECT_U, -1, PECT_ANGLE, PECT_LEN, PECT_ROOT),
      finAt(PELVIC_U, 1, PELVIC_ANGLE, PELVIC_LEN, PELVIC_ROOT),
      finAt(PELVIC_U, -1, PELVIC_ANGLE, PELVIC_LEN, PELVIC_ROOT),
    ];

    // THE LAGGED PLACEMENT, NEVER f.x / f.heading — see koi-fish.js's own note.
    // The steering genuinely reverses frame to frame; this is where that stops
    // being something the eye can see.
    const h0 = f.drawHeading;
    // Guarded: a zero-length fish would make this 0 and every station would
    // divide by it.
    const reachBack = Math.max(1e-6, (TAIL_ROOT_U + TAIL_LEN) * L);   // snout to tail tip

    // The turn's contribution, as a constant bias across the whole body. tanh
    // rather than a clamp because it is monotone and C-infinity — a clamp puts
    // a visible corner in the motion at whatever value it binds. It is NOT the
    // physical omega/speed arc: measured over 90 s of the real pond, the median
    // |omega| would sweep the body 91 degrees and p90 would sweep it 417, since
    // the steering lets a koi turn well inside its own body length.
    // f.bend, not f.omega: the SECOND lag, so the curvature ramps in and out
    // over a short window instead of tracking the turn rate 1:1 each frame.
    const turnK = (BEND_MAX_TURN * Math.tanh((f.bend || 0) / BEND_OMEGA_REF)) / reachBack;

    // Curvature at arc length `a` behind the nose: the travelling wave, grown
    // toward the tail, plus the turn's bias.
    const waveK = BEND_WAVE_SWEEP / reachBack;
    const phase = f.phase || 0;
    const kAt = (a) => {
      const u = a < 0 ? 0 : (a > reachBack ? 1 : a / reachBack);
      const env = BEND_ENV_BASE + (1 - BEND_ENV_BASE) * Math.pow(u, BEND_ENV_POW);
      return waveK * env * Math.sin(Math.PI * 2 * u * BEND_WAVES - phase) + turnK;
    };

    // THE SPINE IS PINNED INSIDE THE BODY, NOT AT THE NOSE, so a change in
    // curvature is SHARED. Pinned at station 0 the nose cannot move and the
    // whole excursion lands on the tail — which is exactly the "pivots around
    // the nose" read: the head is the one part of the animal that never
    // participates. Pinned a fifth of the way back, the head takes its own
    // fifth of every bend and the tail's arm is 0.8 of what it was.
    //
    // TWO CHECKS, BOTH MEASURED RATHER THAN ARGUED. Pinned at station 0 this
    // walk reproduces the one-way walk it replaces EXACTLY — 0 of 4,105,360
    // emitted coordinates differ over a 20 s run — so the anchor is the whole
    // of the change and none of it is a rewrite artefact. And on a body forced
    // straight (both bend amplitudes 0) moving the anchor changes nothing the
    // eye could hold: worst 1.14e-12 px over the same run, which is summation
    // order and not geometry. It is NOT bit-identical there and must not be
    // claimed to be.
    const N = BEND_SAMPLES, da = reachBack / N;
    const iA = Math.round(BEND_ANCHOR_U * N);
    spineH[iA] = h0;
    spineX[iA] = f.drawX - Math.cos(h0) * (iA * da);
    spineY[iA] = f.drawY - Math.sin(h0) * (iA * da);
    for (let i = iA; i < N; i++) {          // tailward
      const kMid = kAt((i + 0.5) * da);
      const hMid = spineH[i] - kMid * da * 0.5;      // midpoint heading
      spineX[i + 1] = spineX[i] - Math.cos(hMid) * da;
      spineY[i + 1] = spineY[i] - Math.sin(hMid) * da;
      spineH[i + 1] = spineH[i] - kMid * da;
    }
    for (let i = iA; i > 0; i--) {          // headward, the same walk reversed
      const kMid = kAt((i - 0.5) * da);
      const hMid = spineH[i] + kMid * da * 0.5;
      spineX[i - 1] = spineX[i] + Math.cos(hMid) * da;
      spineY[i - 1] = spineY[i] + Math.sin(hMid) * da;
      spineH[i - 1] = spineH[i] + kMid * da;
    }

    // Canonical x runs FORWARD from the nose, so the distance back along the
    // body is -x; canonical y is the lateral offset on the fish's own right.
    // Outside [0, reachBack] the clamp on `i` makes this a linear EXTRAPOLATION
    // along the end segment, which is what carries the blunt snout's own dome
    // (it reaches forward of the nose) without a special case.
    const P = (x, y) => {
      const t = -x / da;
      let i = Math.floor(t);
      if (i < 0) i = 0; else if (i > N - 1) i = N - 1;
      const fr = t - i;
      const hh = spineH[i] + (spineH[i + 1] - spineH[i]) * fr;
      const cx = spineX[i] + (spineX[i + 1] - spineX[i]) * fr;
      const cy = spineY[i] + (spineY[i + 1] - spineY[i]) * fr;
      const tx = Math.cos(hh), ty = Math.sin(hh);
      return { x: cx - ty * y, y: (cy + tx * y) * sq };
    };

    // THE FINS GO DOWN FIRST, UNDER THE BODY. Their roots sit inside the flank
    // (PECT_ROOT / PELVIC_ROOT are fractions of the half-width there), so the
    // body fill that follows covers the attachment and each fin reads as
    // growing OUT of the fish. Drawn after it, a fin is a shape lying on top of
    // a fish, which is the cut-out look this construction exists to avoid.
    for (const fin of fins) {
      const fp = [fin.origin];
      fanPts(fp, fin.origin, fin.axis, fin.spread, fin.reach, 9);
      ctx.beginPath(); closedSmooth(ctx, fp.map(p => P(p.x, p.y)));
      ctx.fillStyle = rgba(INK_FISH, FIN_FILL_A * a);
      ctx.fill();
      ctx.lineWidth = FIN_LINE_W;
      ctx.strokeStyle = rgba(INK_FISH, FIN_LINE_A * a);
      ctx.stroke();
      ctx.beginPath();
      raysInto(P, fin.origin, fin.axis, fin.spread, fin.reach, FIN_RAYS, 0.30, 0.90);
      ctx.strokeStyle = rgba(INK_FISH, RAY_A * a);
      ctx.stroke();
    }

    // THE CONTOUR — one array, one path: right flank nose to tail root, the
    // tail's whole envelope, left flank back to the nose, then the blunt snout
    // swept around the front to close. The envelope's first and last points sit
    // at the outer tips, so the peduncle's own two corners join straight to
    // them: that pair of segments IS the tail's leading edge, and there is no
    // seam anywhere for a fill to leak through.
    const S = WIDTH_PROFILE.length;
    const c = [];
    for (let i = 0; i < S; i++) c.push(edge(i / (S - 1), 1));
    fanPts(c, pos(TAIL_ROOT_U), back, TAIL_SPREAD, tailReach, TAIL_PTS);
    for (let i = S - 1; i >= 0; i--) c.push(edge(i / (S - 1), -1));
    const nc = pos(0), nw = widthAt(0);
    for (let k = 1; k < NOSE_PTS; k++) {
      const th = -Math.PI / 2 + Math.PI * (k / NOSE_PTS);
      c.push({ x: nc.x + F.x * NOSE_ROUND * L * Math.cos(th) + R.x * nw * Math.sin(th),
               y: nc.y + F.y * NOSE_ROUND * L * Math.cos(th) + R.y * nw * Math.sin(th) });
    }

    // Body: a FLAT dark fill so the koi reads as a solid under the water and
    // the grain does not show through it, then the one outline over the top.
    // Flat, not a gradient across the flanks — see the header.
    ctx.beginPath(); closedSmooth(ctx, c.map(p => P(p.x, p.y)));
    ctx.fillStyle = rgba(INK_FISH, BODY_FILL_A * a);
    ctx.fill();
    ctx.lineWidth = OUTLINE_W;
    ctx.strokeStyle = rgba(INK_FISH, OUTLINE_A * a);
    ctx.stroke();

    // The tail's own rays, over its fill.
    ctx.beginPath();
    raysInto(P, pos(TAIL_ROOT_U), back, TAIL_SPREAD, tailReach, TAIL_RAYS, 0.26, 0.93);
    ctx.lineWidth = FIN_LINE_W;
    ctx.strokeStyle = rgba(INK_FISH, RAY_A * a);
    ctx.stroke();

    // The dorsal fin seen from directly above is a line down the spine.
    {
      const p0 = P(pos(DORSAL_U0).x, pos(DORSAL_U0).y);
      const p1 = P(pos(DORSAL_U1).x, pos(DORSAL_U1).y);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.lineWidth = FIN_LINE_W;
      ctx.strokeStyle = rgba(INK_FISH, DORSAL_A * a);
      ctx.stroke();
    }

    // Markings. In the body's own frame, so a patch stays put on the fish
    // however it turns. Soft fill, NO stroke: the reference's markings have no
    // edge, and an outlined blob read as a disc sitting on the koi.
    if (f.patches.length) {
      ctx.fillStyle = rgba(INK_FISH, PATCH_FILL_A * a);
      for (const pt of f.patches) {
        const pc = pos(pt.s), halfW = widthAt(pt.s);
        const ox = pc.x + R.x * pt.t * halfW, oy = pc.y + R.y * pt.t * halfW;
        const ca = Math.cos(pt.rot), sa = Math.sin(pt.rot);
        const ax = F.x * ca - F.y * sa, ay = F.x * sa + F.y * ca;
        const bx = -ay, by = ax;
        // ACROSS THE BODY A PATCH IS MEASURED IN HALF-WIDTHS, NOT BODY LENGTHS.
        const blob = [];
        for (let k = 0; k < 10; k++) {
          const th = (k / 10) * Math.PI * 2;
          const u = Math.cos(th) * pt.rx * L, v = Math.sin(th) * pt.ry * halfW;
          blob.push(P(ox + ax * u + bx * v, oy + ay * u + by * v));
        }
        ctx.beginPath(); closedSmooth(ctx, blob);
        ctx.fill();
      }
    }

    // NO EYES, NO BARBELS, NO GILL LINE. The reference spends its detail on the
    // body's curve and the flow of the fins and almost none on the face; what
    // settles which end is the head is the blunt snout against the tapering
    // wrist, which is how the reference settles it too.
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
      if (rip.r > 1 && base > 0.02 && u < WASH_UNTIL) {
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
