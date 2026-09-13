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
const WAVE_AMP = 0.052;      // of body length, at the tail
const WAVE_K = 0.72;         // radians of phase lag per joint
const NOSE_LEAD = 0.030;     // how far the snout reaches past the first joint
const EYE_R = 1.15;          // screen px — a koi's eye is tiny and it reads

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
    const a = f.fade;
    if (a <= 0.001) return;
    const N = f.spine.length, L = f.len;
    const speedF = Math.max(0.4, Math.min(1.7, f.speed / 38));

    // The spine with the swim wave laid over it: amplitude grows toward the
    // tail, and the phase lags down the body so the wave travels backwards.
    const cen = new Array(N);
    for (let i = 0; i < N; i++) {
      const p = f.spine[Math.max(0, i - 1)], q = f.spine[Math.min(N - 1, i + 1)];
      let tx = q.x - p.x, ty = q.y - p.y;
      const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      const amp = WAVE_AMP * L * Math.pow(i / (N - 1), 1.6) * speedF;
      const off = Math.sin(f.phase - i * WAVE_K) * amp;
      cen[i] = { x: f.spine[i].x - ty * off, y: f.spine[i].y + tx * off };
    }
    // Frames are taken along the WAVED centre line, not the raw spine, so the
    // body's width is perpendicular to the shape actually being drawn.
    const tan = new Array(N), nrm = new Array(N), hw = new Array(N);
    for (let i = 0; i < N; i++) {
      const p = cen[Math.max(0, i - 1)], q = cen[Math.min(N - 1, i + 1)];
      let tx = q.x - p.x, ty = q.y - p.y;
      const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      tan[i] = { x: tx, y: ty };
      nrm[i] = { x: -ty, y: tx };
      hw[i] = WIDTH_PROFILE[i] * L;
    }

    const nose = P(cen[0].x + tan[0].x * NOSE_LEAD * L, cen[0].y + tan[0].y * NOSE_LEAD * L);
    const tailBase = cen[N - 1];

    const outline = [nose];
    for (let i = 0; i < N; i++) outline.push(P(cen[i].x + nrm[i].x * hw[i], cen[i].y + nrm[i].y * hw[i]));
    for (let i = N - 1; i >= 0; i--) outline.push(P(cen[i].x - nrm[i].x * hw[i], cen[i].y - nrm[i].y * hw[i]));

    // Body: a dark fill so the koi reads as a solid under the water and the
    // vignette does not show through it, then the outline over the top.
    ctx.beginPath(); closedSmooth(ctx, outline);
    ctx.fillStyle = `rgba(13,15,18,${(0.86 * a).toFixed(3)})`;
    ctx.fill();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = rgba(INK_FISH, 0.70 * a);
    ctx.stroke();

    // NO DORSAL FIN IS DRAWN, AND THAT IS A DECISION RATHER THAN AN OMISSION.
    // A koi seen from above does have one, but at the shipped body length it
    // is one or two pixels of edge: drawn as a line along the spine it creased
    // the body like folded paper (which was most of why the first fish read as
    // an aeroplane), and drawn as a narrow lens it became a sliver crossing
    // the markings. Neither version added a fish; both added noise. Bring it
    // back the day a scene wants a koi three times this size.

    // Markings. Drawn in the body's own frame, so a patch bends with the fish
    // rather than sliding across it as the body flexes.
    if (f.patches.length) {
      ctx.lineWidth = 0.75;
      for (const pt of f.patches) {
        const fi = pt.s * (N - 1), i0 = Math.floor(fi), i1 = Math.min(N - 1, i0 + 1), fr = fi - i0;
        const cx = cen[i0].x + (cen[i1].x - cen[i0].x) * fr;
        const cy = cen[i0].y + (cen[i1].y - cen[i0].y) * fr;
        const tx = tan[i0].x, ty = tan[i0].y;
        const halfW = hw[i0] + (hw[i1] - hw[i0]) * fr;
        const ox = cx + (-ty) * pt.t * halfW, oy = cy + tx * pt.t * halfW;
        const ca = Math.cos(pt.rot), sa = Math.sin(pt.rot);
        const ax = tx * ca - ty * sa, ay = ty * ca + tx * sa;   // patch long axis
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

    ctx.lineWidth = 0.85;
    ctx.strokeStyle = rgba(INK_FISH, 0.42 * a);

    // THE CAUDAL FIN IS A FAN THAT TRAILS, NOT A DELTA WING. Two things fix
    // the aeroplane: the leading edges bow OUTWARD from a narrow root instead
    // of running straight to the tips, and the tips carry their own extra lag
    // — a fin is flexible, so it is still finishing the previous beat while
    // the wrist has started the next one. The fork is shallow; a koi's is.
    {
      const t = tan[N - 1];
      const sweep = Math.sin(f.phase - N * WAVE_K) * 0.19 * Math.min(1.3, speedF);
      const cs = Math.cos(sweep), sn = Math.sin(sweep);
      const bx = -(t.x * cs - t.y * sn), by = -(t.y * cs + t.x * sn);   // backwards
      const nx = -by, ny = bx;
      // THE WHIP IS SMALL OR THE FIN STOPS BEING A FIN. At 0.055 of a body
      // length the lateral lag was comparable to the tip span itself, so one
      // lobe stretched and the other collapsed and the fan read as a single
      // swept blade. Capped well under the span.
      const lag = Math.sin(f.phase - (N + 1.7) * WAVE_K) * 0.020 * Math.min(1.2, speedF);
      // THE ROOT IS TUCKED UNDER THE BODY, NOT BUTTED AGAINST IT. closedSmooth
      // curves the outline through the MIDPOINTS of its edges, so the drawn
      // body stops about half a segment short of its last spine joint — and a
      // fin anchored at that joint floated a visible gap behind the fish. The
      // anchor is pulled forward along the body so the fin's first millimetre
      // is inside the outline and the join disappears.
      const ax0 = tailBase.x - tan[N - 1].x * 0.035 * L;
      const ay0 = tailBase.y - tan[N - 1].y * 0.035 * L;
      const at = (fwd, side) => {
        const s = side + lag * (fwd / 0.255);     // the whip grows toward the tips
        return P(ax0 + bx * fwd * L + nx * s * L,
                 ay0 + by * fwd * L + ny * s * L);
      };
      // IT ATTACHES ALONG THE WRIST, NOT AT A POINT. Two leading edges bowing
      // out from a single vertex make a diamond, and a diamond on the back of
      // a fish is a kite — which is what this was. A caudal fin is rooted
      // across the whole peduncle and forked deeply enough to read as two
      // lobes rather than one blade.
      const rootU = at(0, 0.018), rootL = at(0, -0.018);
      const tipU = at(0.255, 0.128), tipL = at(0.255, -0.128);
      const notch = at(0.148, 0);
      const leadU = at(0.120, 0.092), leadL = at(0.120, -0.092);   // bowed out
      const trailU = at(0.235, 0.070), trailL = at(0.235, -0.070);
      ctx.beginPath();
      ctx.moveTo(rootU.x, rootU.y);
      ctx.quadraticCurveTo(leadU.x, leadU.y, tipU.x, tipU.y);
      ctx.quadraticCurveTo(trailU.x, trailU.y, notch.x, notch.y);
      ctx.quadraticCurveTo(trailL.x, trailL.y, tipL.x, tipL.y);
      ctx.quadraticCurveTo(leadL.x, leadL.y, rootL.x, rootL.y);
      ctx.stroke();
    }

    // Pectorals — SMALL and swept BACK, on their own slower clock. The first
    // pair reached nearly a third of a body length straight out to the side,
    // which is a wing. A koi's are about a tenth of its length and sit close
    // in behind the gills.
    {
      const i = 2, t = tan[i], n = nrm[i];
      const flap = 0.72 + Math.sin(f.finPhase) * 0.28;
      for (const side of [1, -1]) {
        const bxp = cen[i].x + n.x * side * hw[i] * 0.85;
        const byp = cen[i].y + n.y * side * hw[i] * 0.85;
        const out = 0.055 * flap, aft = 0.105;
        const base = P(bxp + t.x * 0.012 * L, byp + t.y * 0.012 * L);
        const back = P(bxp - t.x * 0.045 * L, byp - t.y * 0.045 * L);
        const tip = P(bxp + n.x * side * out * L - t.x * aft * L,
                      byp + n.y * side * out * L - t.y * aft * L);
        const ctrl = P(bxp + n.x * side * out * 1.25 * L - t.x * 0.03 * L,
                       byp + n.y * side * out * 1.25 * L - t.y * 0.03 * L);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(ctrl.x, ctrl.y, tip.x, tip.y);
        ctx.quadraticCurveTo((tip.x + back.x) / 2, (tip.y + back.y) / 2, back.x, back.y);
        ctx.stroke();
      }
    }

    // Barbels — two of them, which is what makes a carp a koi at a glance.
    {
      const t = tan[0], n = nrm[0];
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = rgba(INK_FISH, 0.30 * a);
      const wig = Math.sin(f.finPhase * 1.4) * 0.012;
      for (const side of [1, -1]) {
        const bxp = cen[0].x + n.x * side * hw[0] * 0.5 + t.x * 0.02 * L;
        const byp = cen[0].y + n.y * side * hw[0] * 0.5 + t.y * 0.02 * L;
        const base = P(bxp, byp);
        const tip = P(bxp + n.x * side * 0.085 * L + t.x * (0.02 + wig) * L,
                      byp + n.y * side * 0.085 * L + t.y * (0.02 + wig) * L);
        const ctrl = P(bxp + n.x * side * 0.03 * L + t.x * 0.06 * L,
                       byp + n.y * side * 0.03 * L + t.y * 0.06 * L);
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
      const i = 1, n = nrm[i];
      ctx.fillStyle = rgba(INK_FISH, 0.55 * a);
      for (const side of [1, -1]) {
        const e = P(cen[i].x + n.x * side * hw[i] * 0.72, cen[i].y + n.y * side * hw[i] * 0.72);
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
