// scene/beach-draw.js — every mark scene 3 makes. Nothing here decides
// anything: it is handed the shore, the two boundaries and the fields, and it
// draws them. All the laws live beside it in beach-swash.js, beach-sets.js and
// beach-water.js, DOM-free, so the gate can run them without a browser.
//
// ONE INK AND ONE GROUND, AND THE INVERSION IS WHICH END IS OPEN. The section
// declares one ink and one ground (scene.css) and this scene keeps that count
// — but the ground is the SAND and the ink accumulates seaward, so the water is
// the darkest region and the dry sand is bare paper. That is what the brief
// means by "the value structure inverts relative to scene 1".
//
// TONE IS CARRIED BY WEIGHT AND DUTY ON A CONSTANT PITCH, NOT BY SPACING, and
// that is the whole difference between water and plaid. The first cut packed
// the rows tighter where the tone was darker; two things went wrong and both
// are visible from across the room. Varying pitch MOIRES against itself — the
// eye reads the spacing gradient as banding rather than as tone — and rows a
// few pixels apart drew their breaks from nearly the same seed, so every break
// landed at the same along-shore position and the water came out as a plaid of
// vertical columns. Constant pitch with a per-row PHASE fixes both: the lattice
// is even, the breaks are scattered, and tone is the ink's weight and how much
// of each row carries it.
export const ROW_PITCH_PX = 3.6;   // one lattice over the whole frame
// AT TONE 1 THE WEIGHT MUST CLOSE THE PITCH, or the darkest water is a mid
// grey however dark the ink is. 2.6 on a 3.6 pitch is 72% coverage before the
// duty takes its cut, which measured out at about 60% — a solid-looking sea is
// not reachable from there. Slightly OVER the pitch, so the darkest rows
// genuinely meet and the deep water is a mass rather than a stripe pattern.
export const WEIGHT_MAX = 4.6;
export const WEIGHT_MIN = 0.32;
export const WEIGHT_BUCKETS = 10;  // segments batched by weight: ten strokes, not one per row

// THE TONE LADDER IS MEASURED OFF THE REFERENCE CLIPS, normalised as
// (194 - L) / (194 - 47) from row-median luminances: deep water 47, water at
// the shore 118, glossy wet sand 125, wet sand 152-161, dry sand 186-194.
//
// THE DRY SAND IS BARE PAPER AND THE FOAM READS BRIGHTER THAN IT BY LOCAL
// CONTRAST, NOT BY BEING LIGHTER IN ABSOLUTE TERMS. The reference's foam (197)
// really is brighter than its dry sand (186-194), and the first cut took that
// literally — it gave the dry sand a tone so the foam had somewhere brighter
// to go, and inked forty percent of the frame to buy three luminance levels.
// A drawing does not work that way: the foam is a white gap inside the dark
// water, so it reads as the brightest thing in the frame while being the same
// paper the dry sand is. The dry sand is left open, which is also what the
// brief asks for in as many words.
// THE CONSTANTS ARE SET FROM DELIVERED COVERAGE, NOT BY EYE, because tone is
// not ink: the weight buckets, the duty law and the pitch compose, and what a
// tone of 0.5 actually puts on the paper cannot be read off the code. Forced
// through the shipped draw path at a constant tone (the `__flatTone` hook
// below) this lattice delivers
//
//   tone      1.00  0.90  0.80  0.70  0.60  0.50  0.40  0.30  0.20  0.10
//   coverage  1.00  1.00  0.99  0.90  0.76  0.62  0.48  0.36  0.25  0.15
//
// — and it is worth knowing that this table MOVED once, hard, when the row
// walk's wrap was fixed. Before that the lattice saturated at 0.78 and these
// constants were set against THAT, so they were silently compensating for a
// defect. Re-derive them from a fresh run of the hook if the lattice ever
// changes; do not carry these numbers across a change to the walk.
//
// Each entry is the reference's own measured ink coverage — taken against ITS
// dry sand, so the two media's contrast does not enter — inverted through the
// table above.
export const TONE = {
  foam: 0.00,      // L 191-197 -> coverage 0.04; bare paper, and BRIGHTER THAN THE WET SAND
  dry: 0.00,       // L 185-194 -> coverage 0.03; no sand marking this session
  wet: 0.235,      // L 152-161 -> coverage 0.23
  gloss: 0.355,    // L 125     -> coverage 0.43
  shallow: 0.45,   // L 118-121 -> coverage 0.47
  deep: 0.78,      // L 47      -> coverage 0.84
};

// THE PALETTE IS ONE DECLARATION AND THE POLARITY IS ONE CONSTANT. The brief
// says the dry sand is "the open white", which is only literally true on a
// light ground, and the reference is a high-key subject — so this ships dark
// ink on warm paper. `invert` draws the identical marks and inverts the frame
// at the end: a PHOTOGRAPHIC NEGATIVE of the same drawing rather than a second
// mark plan, so the choice can be made in front of both.
export const PALETTE = { ground: '#f1ede6', ink: '#16181c' };

import { WATERLINE_S } from './beach-shore.js';

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;

// A cheap deterministic hash in [0,1). MARK PLACEMENT ONLY — every simulation
// quantity draws from the seeded stream in rng.js.
function hash2(a, b) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h ^= h >>> 9;
  return (h >>> 0) / 4294967296;
}

// THE FOAM BAND IS STRUCTURAL: THE WATER'S OWN TONE FALLS TO BARE PAPER AT THE
// EDGE. The first cut painted the foam over the finished water in the ground
// colour, and it disappeared — a 7 px band of ground-coloured strokes laid over
// a 3.6 px lattice half-erases it and reads as a smudge. It is also the wrong
// way round: in the reference the foam band is the widest single feature at the
// shore, about a TENTH of frame height, and it is bare paper with dark speckle
// in it rather than white paint over grey. So the ramp ends at zero and the
// foam is what is left when the ink stops; the speckle is added in INK on top.
//
// The break at the back of frame is the same construction at the other end — a
// second place the ink opens out — so the two bright bands cannot disagree
// about what foam looks like.
export const FOAM_BAND_S = 0.085;   // the band at the shore, in frame heights
export const BREAK_BAND_S = 0.055;  // the broken water at the back
export const FOAM_RAMP = 0.32;      // the seaward fraction of the foam band that is a ramp; the rest is paper

// Deepest at the top of frame, lightening toward the shore. Squared, because
// 47 at the top against 118 at the shore is not a linear fall — the darkness
// concentrates at the back the way the reference's does.
// THE RUN-UP SHEET IS NOT DEEP WATER, AND ANCHORING THE RAMP ON THE MOVING
// EDGE MADE IT ONE. With the ramp normalised on `edge`, a swash running up the
// beach STRETCHED the whole ocean gradient over the sand it had just covered —
// so an overrun came out as four-fifths of the frame in near-solid ink, when
// what is actually there is a thin sheet you can see the sand through. The
// ramp is anchored at the WATERLINE instead, which does not move; above it the
// tone falls away toward the sheet's own value, so a run-up reads as water
// arriving over sand rather than as the sea rising.
export const SHEET_TONE = 0.42;     // a thin sheet over wet sand, between shallow water and gloss

export function waterTone(s, edge, foamW, breakS, breakW, breakE) {
  const u = clamp01(s / WATERLINE_S);
  // THE RAMP IS A SMOOTHSTEP, AND NO SINGLE POWER FITS. Converted to tone, the
  // reference's water reads 1.00 · 1.00 · 0.96 · 0.91 · 0.85 · 0.74 · 0.69 ·
  // 0.62 · 0.59 across its depth: it holds near-solid for the first quarter,
  // then falls steeply, then flattens again at the shore. Fitting a power to
  // that gives p = 0.64 at one end of the water and 1.66 at the other — it is
  // an S, not a power, and both of the first two cuts (u-squared, then a cube)
  // were wrong in opposite directions for that reason. The smoothstep is
  // within 0.05 of the measured tone at every sample but one.
  const ss = u * u * (3 - 2 * u);
  let t = TONE.shallow + (TONE.deep - TONE.shallow) * (1 - ss);
  // Past the waterline there is sand under the water, and the sheet thins the
  // further it has run.
  if (s > WATERLINE_S) {
    const over = clamp01((s - WATERLINE_S) / Math.max(1e-4, edge - WATERLINE_S));
    t = TONE.shallow + (SHEET_TONE - TONE.shallow) * (over * over * (3 - 2 * over));
  }
  // THE FOAM BAND IS A PLATEAU OF BARE PAPER, NOT A RAMP TO ONE. A smooth fall
  // across the whole band averages about half the water's tone over it, which
  // measured out at 0.44 ink coverage where the reference's foam is 0.04 — and
  // it put the foam DARKER THAN THE WET SAND, inverting the one ordering that
  // has to hold. The reference's own profile is a plateau: L 175 · 191 · 168
  // across the band, brighter in the middle than at either edge and brighter
  // than the dry sand. So the ink ramps out over the band's seaward part and
  // the rest is paper.
  const fw = Math.max(1e-4, foamW === undefined ? FOAM_BAND_S : foamW);
  const into = clamp01((s - (edge - fw)) / fw) / FOAM_RAMP;
  const ir = clamp01(into);
  t *= (1 - ir * ir * (3 - 2 * ir));
  // The break: a dip, not a cut, so the water closes over again behind it.
  // ITS DEPTH AND WIDTH BOTH SCALE WITH SET ENERGY. Fixed at a 0.92 cut and a
  // width of 8% of frame it was, at REST, the brightest thing in the top of the
  // picture — measured against the reference, which is at its DARKEST there
  // (ink coverage 0.81 against this drawing's 0.41). A break is a wave; with no
  // energy behind it there is very little to see.
  if (breakW > 0) {
    const d = Math.abs(s - breakS) / breakW;
    if (d < 1) {
      const f = (1 - d * d) * (1 - d * d);
      t *= 1 - (0.30 + 0.62 * clamp01(breakE || 0)) * f;
    }
  }
  return clamp01(t);
}

// THE WATER UNDULATES; IT DOES NOT FLICKER. The sea has to carry variation
// along the shore or it comes out in flat horizontal stripes — but a
// MULTIPLIER on the tone was the wrong way to get it. Tone is already capped
// at 1 in the deep water, so a symmetric multiplier can only ever lighten
// there: at ±0.46 it took the solid dark at the top of frame down to 0.54 in
// patches and the sea stopped reading as deep at all.
//
// What varies instead is the RAMP'S OWN POSITION. `swell` displaces the s the
// ramp is evaluated at, so the tone bands and the foam band WAVE along the
// shore the way a real surface does, and the deep water stays as deep as it
// was. A small multiplicative term is kept for grain, an order of magnitude
// under the one that failed.
export const SWELL_S = 0.022;      // how far the bands wave, in frame heights

// THE SWELL FADES OUT IN THE DEEP WATER, and it has to. Near the top of frame
// the tone ramp is at its steepest, so a displacement of a couple of percent
// of frame height swings the tone by a fifth — measured, the rendered row
// profile oscillated 0.26 / 0.70 / 0.45 down the deep water where the
// reference's is smooth at 0.74-0.90. It is also the right thing physically:
// a swell is legible where it is shoaling, not out in flat water.
export function swell(u, s, drift, depth) {
  const d = clamp01(depth === undefined ? 1 : depth);
  const fade = d * d * (3 - 2 * d);
  return SWELL_S * fade * (
    0.62 * Math.sin(u * 6.3 - drift * 5.2) +
    0.26 * Math.sin(u * 14.7 + s * 9 + drift * 8.1 + 2.1) +
    0.12 * Math.sin(u * 31.0 - drift * 13.0 + 1.3));
}

export function grain(u, s, drift) {
  return 1 + 0.10 * Math.sin(u * 23.0 + s * 37 - drift * 11.0);
}

export function createRenderer(ctx, shore) {
  // TONE IS EVALUATED PER SEGMENT AT (u, s), NOT PER ROW. A row spans the whole
  // frame and both boundaries are SCALLOPED, so a row near one is water at some
  // along-shore positions and sand at others — evaluating at the row's midpoint
  // drew every boundary straight and made the scallops unreachable, and it also
  // made the water bandable only in horizontal stripes. Segments are bucketed by
  // weight individually, which costs nothing extra: the same segments are drawn,
  // sorted into ten paths instead of one per row.
  const buckets = [];
  for (let i = 0; i < WEIGHT_BUCKETS; i++) buckets.push([]);

  const r = {
    rows: 0,
    segments: 0,

    draw(st) {
      const { width: w, height: h } = st;
      const pal = st.palette || PALETTE;
      for (const b of buckets) b.length = 0;
      r.rows = 0; r.segments = 0;

      // THE SHELL ALREADY SET THE TRANSFORM, and a renderer that sets its own
      // OVERWRITES it. scene.js's sizeCanvas() puts a dpr scale on every canvas
      // it hands out so a scene draws in CSS pixels and never has to know what
      // a device pixel is — so setting `dpr` here unconditionally drew the whole
      // beach at half scale into one corner of the buffer on any 2x display.
      // `st.dpr` is passed ONLY by the mockup tool, which makes its own canvas
      // and therefore owns its own transform.
      ctx.save();
      if (st.dpr !== undefined) ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'butt';

      const be = clamp01(st.breakEnergy || 0);
      const thick = clamp01(st.frontFoam !== undefined ? st.frontFoam : 0.5);
      const foamW = FOAM_BAND_S * (0.45 + 0.75 * thick);
      const breakS = 0.055 + 0.045 * be;
      const breakW = BREAK_BAND_S * (0.24 + 1.05 * be);
      const gloss = Math.max(1e-4, st.glossDepth || 0.008);
      const drift = st.drift || 0;
      const pitch = ROW_PITCH_PX / h;
      const sTop = -shore.shearPx / h - 0.03;
      const sBot = 1 + shore.shearPx / h + 0.03;

      // The one place a point on the beach becomes a tone.
      // A CALIBRATION HOOK, and it is test chrome in the spirit of /plot's
      // setView: there is no control on this page, and "what coverage does
      // tone T actually deliver" cannot be answered by reading the code — the
      // weight buckets, the duty law and the pitch compose. Nothing in the
      // scene ever sets it.
      const flat = st.__flatTone;
      const toneAt = flat !== undefined ? () => flat : (u, s) => {
        const edge = st.swashAt(u);
        if (s < edge) {
          const sw = s + swell(u, s, drift, s / Math.max(1e-4, edge));
          return clamp01(waterTone(sw, edge, foamW, breakS, breakW, be) * grain(u, s, drift));
        }
        const wet = st.wetAt(u);
        if (s < wet) {
          const behind = (s - edge) / gloss;
          const g = behind < 1 ? lerp(TONE.gloss, TONE.wet, behind) : TONE.wet;
          // The wet sand's FAR edge is a gradient, not a line: sand dries from
          // the high-water mark down, so the tone fades over the last stretch.
          const toDry = (wet - s) / Math.max(1e-4, (wet - edge) * 0.42);
          return clamp01(lerp(TONE.dry, g, clamp01(toDry)));
        }
        return TONE.dry;
      };

      let idx = 0;
      for (let s = sTop; s < sBot; s += pitch, idx++) {
        const seed = (idx * 2654435761) % 100003;
        // Only the WATER's texture drifts; sand does not move.
        //
        // THE PHASE IS WRAPPED, AND IT HAS TO BE. `drift` accumulates without
        // bound — it is a distance travelled, not an angle — so after a minute
        // it is past 4, every segment lands outside [0,1] at all three of the
        // wrap repeats below, and the sea is simply NOT DRAWN. The static
        // mockup could not have caught it because a frozen state has drift 0;
        // it took the real thing running for the water to disappear.
        const phase = (drift * (0.4 + 0.6 * hash2(idx, 91))) % 1;
        // THE WALK STARTS BEFORE THE LEFT EDGE AND WRAPS PROPERLY. The first
        // cut folded the start position with `a - Math.floor(a)` and then
        // clipped, which THREW AWAY the wrapped-around piece: a row starting at
        // -0.10 emitted [0.90,1.0] and then [0.17,0.44] onward, leaving a
        // seventeen-percent hole at the left of every row. It capped the
        // lattice's deliverable coverage at about 0.78 and put a pale wedge in
        // the top corner, and only measuring ink coverage against the reference
        // found it. Each segment is now emitted at its own position AND one
        // period either side, each clipped to the frame, so a segment crossing
        // an edge appears on both.
        let u = -0.4 - hash2(seed, 1) * 0.3;
        let k = 0;
        while (u < 1 && k < 26) {
          const t0 = toneAt(clamp01(u + 0.05), s);
          const len = (0.10 + hash2(seed, k * 2 + 3) * 0.34) * (0.28 + 0.72 * t0);
          const gap = (0.010 + hash2(seed, k * 2 + 4) * 0.030) * Math.max(0, 2.20 - 2.24 * t0);
          const a0 = u + phase, b0 = a0 + len;
          u += len + gap; k++;
          for (let rep = -1; rep <= 1; rep++) {
            const a = Math.max(0, a0 + rep), b = Math.min(1, b0 + rep);
            if (b <= a) continue;
            const t = toneAt((a + b) / 2, s);
            if (t <= 0.006) continue;
            const bk = Math.min(WEIGHT_BUCKETS - 1, Math.floor(t * WEIGHT_BUCKETS));
            buckets[bk].push(a, b, s);
            r.segments++;
          }
        }
        r.rows++;
      }

      ctx.strokeStyle = pal.ink;
      for (let b = 0; b < WEIGHT_BUCKETS; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        const t = (b + 0.5) / WEIGHT_BUCKETS;
        ctx.lineWidth = lerp(WEIGHT_MIN, WEIGHT_MAX, Math.pow(t, 1.25));
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 3) {
          const a = list[i], bb = list[i + 1], ss = list[i + 2];
          ctx.moveTo(a * w, shore.yAt(a * w, ss));
          ctx.lineTo(bb * w, shore.yAt(bb * w, ss));
        }
        ctx.stroke();
      }

      // --- the foam, which is the paper ------------------------------------
      ctx.strokeStyle = pal.ground;
      r.drawFoam(st, w, h);

      ctx.restore();

      if (st.invert) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      }
    },

    // THE BRIGHT BANDS ARE ALREADY THERE — the water's own tone fell to bare
    // paper at the shore and dipped at the break. What this pass adds is what
    // lives INSIDE them: the streaks lying on the water, and the dark speckle
    // that makes a band of paper read as foam rather than as a gap.
    drawFoam(st, w, h) {
      const pal = st.palette || PALETTE;
      const edgeAt = (u) => st.swashAt(u);
      const be = clamp01(st.breakEnergy || 0);
      const thick = clamp01(st.frontFoam !== undefined ? st.frontFoam : 0.5);
      const foamW = FOAM_BAND_S * (0.45 + 0.75 * thick);
      const breakS = 0.055 + 0.045 * be;
      const breakW = BREAK_BAND_S * (0.24 + 1.05 * be);

      // THE STREAKS, in PAPER, over the water. Persistent records drifting
      // shoreward — the broken foam lines the reference is full of, and the
      // main texture on the open water. They are handed in already advanced;
      // nothing is placed here.
      ctx.strokeStyle = pal.ground;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (const f of (st.streaks || [])) {
        if (f.s >= edgeAt(f.u) - foamW) continue;   // inside the foam band it has nothing to mark
        const half = f.len / 2;
        const a = clamp01(f.u - half), b = clamp01(f.u + half);
        if (b <= a) continue;
        ctx.moveTo(a * w, shore.yAt(a * w, f.s));
        ctx.lineTo(b * w, shore.yAt(b * w, f.s));
      }
      ctx.stroke();

      // THE SPECKLE, in INK, inside the two bright bands. Short broken marks
      // scattered through the paper: densest at the band's shoreward edge where
      // the foam piles up, thinning seaward, so the band has a hard inner
      // boundary and a soft outer one — which is the way round a real foam edge
      // reads. Without it a band of bare paper is a gap in the drawing.
      ctx.strokeStyle = pal.ink;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      const N = 190;
      for (let k = 0; k < N; k++) {
        const u0 = k / N, u1 = (k + 0.80) / N;
        const um = (u0 + u1) / 2;
        // the shore band
        const e = edgeAt(um);
        for (let b = 0; b < 9; b++) {
          const f = b / 9;
          if (hash2(k * 7 + b, (st.frontSeed | 0) + 3) > 0.945 + f * 0.05) {
            const s2 = e - foamW * f + (hash2(k, b + 31) - 0.5) * foamW * 0.22;
            ctx.moveTo(u0 * w, shore.yAt(u0 * w, s2));
            ctx.lineTo(u1 * w, shore.yAt(u1 * w, s2));
          }
        }
        // the break at the back
        for (let b = 0; b < 8; b++) {
          const f = (b / 8) * 2 - 1;
          if (hash2(k * 11 + b, 29) > 0.78 + Math.abs(f) * 0.20 * (1.25 - be)) {
            const s2 = breakS + f * breakW * 0.85 + (hash2(k, b + 71) - 0.5) * breakW * 0.20;
            ctx.moveTo(u0 * w, shore.yAt(u0 * w, s2));
            ctx.lineTo(u1 * w, shore.yAt(u1 * w, s2));
          }
        }
      }
      ctx.stroke();

      // THE FRONT ITSELF. One ragged broken line at the swash edge, in ink:
      // the only place in the drawing where the two boundaries are stated
      // rather than implied, and the thing a viewer's eye actually follows.
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      const F = 220;
      for (let k = 0; k < F; k++) {
        const u0 = k / F, u1 = (k + 0.86) / F;
        if (hash2(k, (st.frontSeed | 0) + 17) < 0.22) continue;   // broken, never ruled
        const e0 = edgeAt(u0), e1 = edgeAt(u1);
        ctx.moveTo(u0 * w, shore.yAt(u0 * w, e0));
        ctx.lineTo(u1 * w, shore.yAt(u1 * w, e1));
      }
      ctx.stroke();
    },
  };
  return r;
}
