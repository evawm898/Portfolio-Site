// scene/koi-draw.js — every mark scene 1 makes. Thin light lines on near-black:
// no fills that carry tone, no colour, no shading. The identity is line art, so
// a koi is an outline with a dark body behind it rather than a shape with a
// value, and the only thing that varies is how brightly a line is drawn.
//
// THE SQUASH IS APPLIED TO POINTS, NEVER TO THE CANVAS. A ctx.scale(1, squash)
// would be one line shorter and would also squash the STROKE — every line would
// come out thinner across the fish than along it, which is exactly the thing a
// line-art piece cannot afford. So every plane point is projected by hand at
// the moment it is drawn and all stroking happens in screen space, where a
// 1.1 px line is 1.1 px in every direction.
//
// THE ORDER IS PHYSICAL AND IT IS THE ONLY DEPTH CUE HERE: water, then the
// fish (which are UNDER the surface), then the ripples (which are ON it, and so
// cross over a koi that passes beneath), then the rain (which is in the air in
// front of all of it), then the flash. A fish drawn over its own ripples reads
// as a paper cut-out immediately, and nothing else in this scene says which
// side of the water anything is on.
//
// ALPHA IS BUCKETED AND STROKED IN BATCHES. A downpour is several hundred rings
// and a hundred streaks; giving each its own strokeStyle string is several
// hundred allocations and state changes a frame. Each family is binned into a
// fixed number of alpha levels and each bin strokes once, so the cost is a
// dozen state changes whatever the weather.

export const INK = [226, 232, 238];       // ripples: the brightest thing here
export const INK_FISH = [214, 221, 228];
export const INK_RAIN = [198, 208, 219];
export const GROUND = '#08090b';

const RIPPLE_BINS = 12;
const RAIN_BINS = 6;
const RIPPLE_MIN_A = 0.014;

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
  let vignette = null, vigKey = '';

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

    // ONE RIGID FRAME FOR THE WHOLE FISH, AND EVERY APPENDAGE GOES THROUGH IT.
    // The previous version threaded each fin's own tangent and normal off a
    // per-joint slice of a spine that was also being distorted by a swim
    // wave — so a dorsal fin, a pectoral and the tail fin each reasoned about
    // "which way is sideways" from a slightly different, curving frame, and
    // the three disagreed with each other and with the eye (a dorsal fused
    // into the head's own curve; pectorals that read as nearer the tail than
    // the head). F is the fish's forward (nose) direction and R its right,
    // both fixed for the whole fish this frame; `pos(u)` walks from the nose
    // (u=0) to the tail (u=1) along F, and `edge(u, side, k)` is the point k
    // half-widths out from that station, on the given flank. Nothing here
    // reads the spine at all — the body is a rigid tapered oval carried by
    // heading, the koi-fish.js note's own "static tail is fine" extended to
    // the whole fish, not only the tail.
    const F = { x: Math.cos(f.heading), y: Math.sin(f.heading) };
    const R = { x: -F.y, y: F.x };
    const pos = (u) => ({ x: f.x - F.x * u * L, y: f.y - F.y * u * L });
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
    const sEdge = (u, side, k = 1) => { const e = edge(u, side, k); return P(e.x, e.y); };

    const SAMPLES = WIDTH_PROFILE.length;
    const nose = P(pos(0).x + F.x * NOSE_LEAD * L, pos(0).y + F.y * NOSE_LEAD * L);

    const outline = [nose];
    for (let i = 0; i < SAMPLES; i++) { const e = edge(i / (SAMPLES - 1), 1); outline.push(P(e.x, e.y)); }
    for (let i = SAMPLES - 1; i >= 0; i--) { const e = edge(i / (SAMPLES - 1), -1); outline.push(P(e.x, e.y)); }

    // Body: a dark fill so the koi reads as a solid under the water and the
    // vignette does not show through it, then the outline over the top.
    ctx.beginPath(); closedSmooth(ctx, outline);
    ctx.fillStyle = `rgba(13,15,18,${(0.86 * a).toFixed(3)})`;
    ctx.fill();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = rgba(INK_FISH, 0.70 * a);
    ctx.stroke();

    // NO GILL LINE. The reference this pass was drawn against reads the head
    // and body as ONE continuous smooth silhouette — nothing marks a seam
    // between them — and a light arc across the shoulder (the previous
    // version's attempt at a head cue) fought that directly: it was the one
    // hard edge on an otherwise soft fish. The eyes are the head cue now, the
    // same way the reference uses only the patch pattern and the taper.

    // Markings. Drawn in the body's own frame (u along, R across), so a
    // patch stays put on the fish however it turns.
    if (f.patches.length) {
      ctx.lineWidth = 0.75;
      for (const pt of f.patches) {
        const c = pos(pt.s), halfW = widthAt(pt.s);
        const ox = c.x + R.x * pt.t * halfW, oy = c.y + R.y * pt.t * halfW;
        const ca = Math.cos(pt.rot), sa = Math.sin(pt.rot);
        const ax = F.x * ca - F.y * sa, ay = F.x * sa + F.y * ca;   // patch long axis
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
      const baseA = sEdge(DORSAL_U0, side, 1);
      const baseB = sEdge(DORSAL_U1, side, 1);
      const peak = sEdge(DORSAL_PEAK_U, side, DORSAL_PEAK_K);
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
    // is the body's own -F, and rotating it by ±TAIL_SPREAD gives the two
    // lobes' directions exactly as before; what changed is how the three
    // points between them are connected. Each lobe's leading edge (root to
    // its tip) BOWS outward past its own straight chord — `bow()` is the
    // chord's midpoint pushed out along the lobe's own direction — so the
    // paddle has a convex belly instead of a flat side. The fork between the
    // two tips is ONE quadratic curve with NOTCH as its control point rather
    // than a vertex: a quadratic curve does not reach its control point, so
    // the fork dips TOWARD where the old fork's point was without ever
    // sharpening into it — a scallop, not a V. Static and rigid with the
    // body, per the brief for this pass.
    {
      const root = pos(TAIL_ROOT_U);
      const tailTip = pos(1);
      const back = { x: -F.x, y: -F.y };
      const rot = (v, ang) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
      };
      const dirUp = rot(back, TAIL_SPREAD), dirDown = rot(back, -TAIL_SPREAD);
      const tipUp = { x: tailTip.x + dirUp.x * TAIL_LEN * L, y: tailTip.y + dirUp.y * TAIL_LEN * L };
      const tipDown = { x: tailTip.x + dirDown.x * TAIL_LEN * L, y: tailTip.y + dirDown.y * TAIL_LEN * L };
      const notch = { x: tailTip.x + back.x * TAIL_NOTCH_LEN * L, y: tailTip.y + back.y * TAIL_NOTCH_LEN * L };
      const bow = (p0, p1, dir) => ({
        x: (p0.x + p1.x) / 2 + dir.x * TAIL_BOW * L,
        y: (p0.y + p1.y) / 2 + dir.y * TAIL_BOW * L,
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
        const ca = Math.cos(PECT_ANGLE), sa = Math.sin(PECT_ANGLE);
        // Long axis: straight outward (R*side), swept back toward the tail
        // (-F) by PECT_ANGLE. Short axis is just the long one turned a
        // quarter turn.
        const axX = R.x * side * ca - F.x * sa, axY = R.y * side * ca - F.y * sa;
        const bxX = -axY, bxY = axX;
        const len = PECT_LEN * L * flap, wid = PECT_WIDTH * L;
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
      for (const side of [1, -1]) {
        const base = sEdge(BARBEL_U, side, 0.5);
        const tip = P(c.x + R.x * side * (baseW * 0.5 + 0.085 * L) + F.x * (0.02 + wig) * L,
                      c.y + R.y * side * (baseW * 0.5 + 0.085 * L) + F.y * (0.02 + wig) * L);
        const ctrl = P(c.x + R.x * side * (baseW * 0.5 + 0.03 * L) + F.x * 0.06 * L,
                       c.y + R.y * side * (baseW * 0.5 + 0.03 * L) + F.y * 0.06 * L);
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

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const f of fish) drawFish(f);

    // Ripples, binned by alpha and stroked a bin at a time.
    for (const b of rippleBins) b.length = 0;
    for (const rip of ripples) {
      const u = rip.age / rip.life;
      if (u <= 0 || u >= 1) continue;
      const attack = u < 0.06 ? u / 0.06 : 1;
      const base = attack * ((1 - u) * 0.6 + Math.pow(1 - u, 3) * 0.4) * (0.30 + 0.70 * rip.strength);
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
