/**
 * beach-brush.js — the drawing layer for scene 3.
 *
 * Nothing here is traced. Every mark is generated: a crest curve, a curling
 * lip, a scalloped foam edge, a few bubbles, some marks in the sand. The
 * reference footage decided WHERE things sit and HOW fast they move; this
 * file decides what marks exist.
 *
 * Pure of scene state: `draw()` takes a plain object and a 2D context and
 * renders one frame. It owns no timing, no simulation and no input. The
 * caller supplies where the wave is, how far the break has peeled and where
 * the swash front sits.
 *
 * All vertical quantities are fractions of canvas height, all horizontal
 * quantities fractions of canvas width, so the scene is resolution and
 * aspect independent.
 *
 * ---------------------------------------------------------------------------
 * WIRED, AND ONLY WIRED. Everything a mark is made of below is as it arrived:
 * the same constants, the same curves, the same order. What changed is where
 * the numbers COME FROM, in four places, and each one is a thing the caller
 * now owns:
 *
 *   the shear      `state.shear`, so the shore that answers swashYAt(x) and the
 *                  drawing that draws it cannot disagree about the slope. The
 *                  module's own SHEAR stays as the standalone default.
 *   the front      `state.frontAt(u)` — THE PUBLISHED SWASH EDGE. The scallops
 *                  that used to be generated here (`lobes` at the shore) are
 *                  generated in beach-swash.js now and arrive through this,
 *                  because a bird has to be able to stand on the line that is
 *                  drawn. Without it the module generates its own, as before.
 *   the high water `state.wetAt(u)` for the strand line at 0.755.
 *   the waves      `state.waves`, one entry per live record, each carrying its
 *                  own per-column band position and break phase, its own seed,
 *                  and its lobes and bubbles DRAWN ONCE AT BIRTH rather than
 *                  per frame. With no list the two defaults are drawn, so the
 *                  standalone picture is unchanged and is the control.
 *
 * Nothing here holds state, reads a clock or knows what a wave record is.
 * ---------------------------------------------------------------------------
 */

export const PALETTE = {
  paper: '#f3f0e8',
  ink: '#16181a',
  sea: '#565c60',
  seaDeep: '#3e4347',
  wet: '#c6c6c0',
};

/** Shoreline tilt, as a fraction of canvas height dropped across the width. */
export const SHEAR = -0.1167;

/**
 * Where in `b` — the break phase below — foam first exists at all. Read off
 * `foamw`'s own smoothstep rather than restated: it is the number a caller
 * needs in order to line its own break clock up with this drawing, and two
 * copies of it would let the label and the picture disagree about when a
 * column has broken.
 */
export const FOAM_ONSET_B = 0.28;

/** Deterministic PRNG. Same seed -> same wave, every frame, every machine. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (t) => {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Screen y for band position s (0 = far water, 1 = bottom of dry sand).
 *
 * THE SHEAR IS AN ARGUMENT BECAUSE IT HAS AN OWNER ELSEWHERE. beach-shore.js
 * declares the shoreline's tilt and every published query goes through it, so
 * a second copy here would put the drawn edge on a different slope from the
 * one a bird is told to stand on. The module's own SHEAR is what a standalone
 * call gets; note it is a fraction of HEIGHT dropped across the WIDTH, so the
 * angle it draws moves with the aspect ratio, where the shore's is an angle.
 */
function yOf(x, s, W, H, shear = SHEAR) {
  return s * H + (x / W - 0.5) * shear * H;
}

/** Low-frequency wander. Never a single sine — that reads as machinery. */
function bumps(xs, r, amp, k, phase, scale = 1.3, W = 1) {
  const ph = [];
  for (let i = 0; i < k; i++) ph.push(r() * 6.283);
  return xs.map((x) => {
    let y = 0;
    for (let i = 0; i < k; i++) {
      y += (amp / (i + 1.5)) *
        Math.sin((2 * Math.PI * (i + 1) * scale * x) / W + phase * (i + 1) + ph[i]);
    }
    return y;
  });
}

/**
 * Union of half-discs — the scalloped edge every cartoon foam line has.
 * Irregular spacing and a centre-weighted radius are what stop it reading
 * as a row of identical bumps.
 */
export function lobeParams(r, n, rlo, rhi, jitter = 0.85) {
  const step = 1.17 / n;
  const cen = [], rad = [];
  for (let i = 0; i < n; i++) {
    cen.push(-0.083 + step * (i + (r() * 2 - 1) * jitter));
    rad.push(rlo + (rhi - rlo) * ((r() + r()) / 2));   // centre-weighted
  }
  return { cen, rad };
}

/**
 * THE PARAMETERS ARE DRAWN ONCE AND THE FIELD IS EVALUATED PER FRAME. They
 * used to be the same call, which is fine for one frozen frame and wrong in
 * motion: every `r()` upstream shifts every draw after it, and the bubble loop
 * and the brush's own pass cuts both take a VARIABLE number of them, so a
 * second wave's scallops re-drew themselves every frame — the foam boils.
 * `cen` and `rad` are fractions of the width, so a stored set survives a
 * resize.
 */
export function lobesFrom(xs, p, W, gate = null, squash = 0.45) {
  const n = p.cen.length;
  return xs.map((x, i) => {
    let b = 0;
    for (let j = 0; j < n; j++) {
      const c = p.cen[j] * W, rr = p.rad[j] * W;
      const d = rr * rr - (x - c) * (x - c);
      if (d > 0) b = Math.max(b, Math.sqrt(d) * squash);
    }
    return gate ? b * gate[i] : b;
  });
}

function lobes(xs, r, n, rlo, rhi, W, gate = null, squash = 0.45, jitter = 0.85) {
  return lobesFrom(xs, lobeParams(r, n, rlo / W, rhi / W, jitter), W, gate, squash);
}

function fillBand(ctx, xs, top, bot, colour) {
  ctx.beginPath();
  ctx.moveTo(xs[0], top[0]);
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], top[i]);
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], bot[i]);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/**
 * A stroke laid down the way a brush lays one down: width swells at three
 * frequencies along the length, the ends lift, and a long stroke is laid
 * in two or three overlapping passes rather than one continuous line.
 */
export function brush(ctx, xs, ys, width, r, {
  colour = PALETTE.ink, gate = null, passes = true, vary = 0.42,
} = {}) {
  let runs = [];
  if (gate) {
    let cur = [];
    for (let i = 0; i < xs.length; i++) {
      if (gate[i] > 0.03) cur.push(i);
      else { if (cur.length > 3) runs.push(cur); cur = []; }
    }
    if (cur.length > 3) runs.push(cur);
  } else {
    runs = [xs.map((_, i) => i)];
  }

  for (const run of runs) {
    if (run.length < 4) continue;
    let segs = [run];
    if (passes && run.length > 90) {
      const k = 2 + Math.floor(r() * 2);
      const cuts = [];
      for (let i = 0; i < k - 1; i++) cuts.push(0.2 + r() * 0.6);
      cuts.sort((a, b) => a - b);
      const idx = [0, ...cuts.map((c) => Math.floor(c * run.length)), run.length];
      segs = [];
      for (let j = 0; j < idx.length - 1; j++) {
        segs.push(run.slice(Math.max(0, idx[j] - 6), idx[j + 1]));
      }
    }
    for (const seg of segs) {
      const m = seg.length;
      if (m < 4) continue;
      const fs = [[1.7, 0.55], [3.3, 0.30], [6.1, 0.15]];
      const ph = fs.map(() => r() * 6.283);
      const up = [], dn = [];
      for (let i = 0; i < m; i++) {
        const t = i / (m - 1);
        let wob = 1;
        for (let f = 0; f < fs.length; f++) {
          wob += vary * fs[f][1] * Math.sin(2 * Math.PI * fs[f][0] * t + ph[f]);
        }
        const prof = Math.pow(Math.sin(Math.PI * t), 0.30); // full most of the way
        const w = Math.max(0.35, (width * prof * wob) / 2);
        const a = seg[Math.max(0, i - 1)], b = seg[Math.min(m - 1, i + 1)];
        const dx = xs[b] - xs[a], dy = ys[b] - ys[a];
        const L = Math.hypot(dx, dy) || 1e-6;
        const nx = -dy / L * w, ny = dx / L * w;
        up.push([xs[seg[i]] + nx, ys[seg[i]] + ny]);
        dn.push([xs[seg[i]] - nx, ys[seg[i]] - ny]);
      }
      ctx.beginPath();
      ctx.moveTo(up[0][0], up[0][1]);
      for (let i = 1; i < up.length; i++) ctx.lineTo(up[i][0], up[i][1]);
      for (let i = dn.length - 1; i >= 0; i--) ctx.lineTo(dn[i][0], dn[i][1]);
      ctx.closePath();
      ctx.fillStyle = colour;
      ctx.fill();
    }
  }
}

/** A wave's bubbles, drawn once. Same three draws, same order, as the loop. */
export function bubbleParams(r, n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push({ fx: r(), dy: r() * 23 - 5, rad: 2.5 + r() * 5.5 });
  return out;
}

function bubble(ctx, x, y, rad) {
  ctx.beginPath();
  ctx.ellipse(x, y, rad, rad * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.paper;
  ctx.fill();
  ctx.lineWidth = Math.max(1, rad * 0.30);
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
}

/**
 * One wave.
 *
 * `peel` sweeps the break across the frame. Break progress b(x) runs 0 at
 * the unbroken end to 1 at the collapsed end, so a single frame shows swell,
 * curl and spent foam at once — which is both what the footage shows and how
 * a cartoon wave is built. A wave is never drawn breaking all at once along
 * its length.
 */
export function wave(ctx, xs, r, {
  s, peel, height, phase, W, H, big = true, shear = SHEAR,
  sAt = null, bAt = null, seed, scalA = null, scalB = null, bubbles = null,
}) {
  const n = xs.length;
  // A PER-CALL STREAM PER MARK, so a stroke's own width wobble is a property of
  // WHICH WAVE this is and not of how many bubbles the wave before it happened
  // to draw. Without it every `r()` a frame takes shifts everything after it,
  // and in motion the strokes crawl. With no seed the caller's stream is used,
  // which is the standalone path and is unchanged.
  const sub = seed === undefined ? () => r : (k) => rng((seed ^ (k * 0x9e3779b1)) >>> 0);

  // WHERE THE WAVE IS: the caller's per-column band position when it has one
  // (the live record's own crest, carrying its own along-shore wobble), the
  // module's own wander when it does not.
  const base = sAt
    ? xs.map((x) => yOf(x, sAt(x / W), W, H, shear))
    : bumps(xs, r, 0.009 * H, 3, phase, 1.3, W)
      .map((d, i) => yOf(xs[i], s, W, H, shear) + d);

  // HOW FAR THROUGH THE BREAK EACH COLUMN IS. `b` runs 0 at the unbroken end to
  // 1 at the spent end and everything below is a function of it, so this is the
  // ONE place the peel enters the drawing. Wired, it comes from the record's
  // own clock (beach-wave.js's drawPhaseAt, which reads the same `brokenAt` the
  // stage labels do, so the picture and the label cannot disagree); standalone
  // it is the module's own sweep across the frame.
  const b = bAt ? xs.map((x) => bAt(x / W)) : xs.map((x) => smoothstep((x / W - (peel - 0.34)) / 0.50));

  const crest = new Array(n), h = new Array(n), curl = new Array(n);
  const foamw = new Array(n), g = new Array(n), spent = new Array(n);
  for (let i = 0; i < n; i++) {
    const rise = Math.pow(Math.sin(Math.PI * Math.pow(clamp(b[i], 0, 1), 0.8)), 0.7);
    let along = 1
      + 0.42 * Math.sin((2 * Math.PI * 1.7 * xs[i]) / W + phase * 1.3)
      + 0.22 * Math.sin((2 * Math.PI * 3.1 * xs[i]) / W + phase * 2.1);
    // a wave that has become foam no longer has a crest to vary
    along = 1 + (along - 1) * (1 - 0.75 * b[i]);
    h[i] = height * H * (0.45 + 0.55 * rise) * clamp(along, 0.55, 1.55);
    crest[i] = base[i] - h[i];
    curl[i] = Math.exp(-Math.pow((b[i] - 0.50) / 0.13, 2));   // a travelling event
    foamw[i] = smoothstep((b[i] - FOAM_ONSET_B) / 0.42) * (0.022 + 0.052 * b[i]) * H;
    g[i] = smoothstep((b[i] - 0.32) / 0.32);
    spent[i] = 1 - smoothstep((b[i] - 0.72) / 0.28);
  }

  const lobeA = scalA ? lobesFrom(xs, scalA, W, g, 0.44) : lobes(xs, r, 9, 0.035 * W, 0.096 * W, W, g, 0.44);
  const lobeB = scalB ? lobesFrom(xs, scalB, W, g, 0.55) : lobes(xs, r, 22, 0.010 * W, 0.031 * W, W, g, 0.55);

  const faceBot = base.map((v, i) =>
    v + (0.040 + 0.030 * (1 - b[i])) * H + 0.22 * h[i]);
  fillBand(ctx, xs, crest, faceBot, PALETTE.ink);

  const lipTop = crest.map((v, i) => v - 0.30 * h[i] * curl[i] * spent[i]);
  const lipBot = crest.map((v, i) => v + (0.42 * h[i] + 0.5 * foamw[i])
    * Math.max(curl[i], 0.30 * smoothstep((b[i] - 0.28) / 0.3)) * spent[i]);
  fillBand(ctx, xs, lipTop, lipBot, PALETTE.paper);

  const lipGate = spent.map((v, i) => v * (curl[i] + 0.25 * g[i]));
  brush(ctx, xs, lipBot, (big ? 3.4 : 2.4) * H / 720, sub(1), { gate: lipGate });
  brush(ctx, xs, crest, (big ? 3.2 : 2.2) * H / 720, sub(2),
    { gate: spent.map((v) => 0.15 + v) });

  // the hook: the lip thrown forward, heavy and short
  const hookGate = curl.map((v) => (v > 0.42 ? 1 : 0));
  if (hookGate.some(Boolean)) {
    brush(ctx, xs, lipBot.map((v, i) => v + 0.30 * h[i]),
      (big ? 4.6 : 3.0) * H / 720, sub(3), { gate: hookGate, passes: false, vary: 0.55 });
    brush(ctx, xs, lipTop.map((v, i) => v - 0.10 * h[i]),
      2.4 * H / 720, sub(4), { gate: hookGate, passes: false });
  }

  const fbTop = crest.map((v, i) => v + 0.26 * h[i]);
  const fbBot = fbTop.map((v, i) => v + foamw[i] + lobeA[i] + lobeB[i]);
  fillBand(ctx, xs, fbTop, fbBot, PALETTE.paper);
  brush(ctx, xs, fbBot, (big ? 3.6 : 2.6) * H / 720, sub(5), { gate: g });

  // The bubbles are DRAWN ONCE AT BIRTH too, for the same reason the lobes are
  // — and it is the `continue` that makes it necessary rather than tidy: it
  // takes a VARIABLE number of draws off the stream, so on the frame's own
  // stream a wave's bubbles move every frame and move everything after them
  // as well. The standalone branch keeps the original loop, draw for draw, so
  // the picture the module was verified at is the control for the wiring.
  const kn = big ? 16 : 6;
  for (let k = 0; k < kn; k++) {
    const x = (bubbles ? bubbles[k].fx : r()) * W;
    const i = Math.min(n - 1, Math.max(0, Math.round(((x - xs[0]) / (xs[n - 1] - xs[0])) * (n - 1))));
    if (g[i] < 0.55) continue;
    bubble(ctx, x, fbBot[i] + (bubbles ? bubbles[k].dy : r() * 23 - 5) * H / 720,
      (bubbles ? bubbles[k].rad : 2.5 + r() * 5.5) * H / 720);
  }
}

/**
 * Draw one frame.
 *
 * state: { peel, phase, heroS, swashS, farS, seed }
 *   peel   sweeps the break across the frame, roughly -0.3 -> 1.7
 *   phase  drifts the surface wander; any slowly increasing number
 *   heroS  band position of the breaking wave
 *   swashS band position of the swash front on the sand
 *   farS   band position of the wave behind it
 */
export function draw(ctx, W, H, state) {
  const {
    peel = 0.5, phase = 0, heroS = 0.375, swashS = 0.60, farS = 0.20, seed = 6,
    shear = SHEAR, waves = null, frontAt = null, wetAt = null, hwS = 0.755,
  } = state || {};
  const r = rng(seed);
  const N = 520;
  const xs = [];
  for (let i = 0; i < N; i++) xs.push(-0.042 * W + (1.084 * W * i) / (N - 1));

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, W, H);

  const horizon = bumps(xs, r, 0.005 * H, 2, phase, 1.3, W)
    .map((d, i) => yOf(xs[i], 0.155, W, H, shear) + d);
  fillBand(ctx, xs, xs.map(() => -0.08 * H), horizon, PALETTE.seaDeep);
  const mid = bumps(xs, r, 0.006 * H, 2, phase * 0.8, 1.3, W)
    .map((d, i) => yOf(xs[i], farS + 0.10, W, H, shear) + d);
  fillBand(ctx, xs, horizon, mid, PALETTE.sea);

  for (const s of [0.06, 0.105]) {
    const sy = bumps(xs, r, 0.007 * H, 3, phase * 0.6, 1.3, W)
      .map((d, i) => yOf(xs[i], s, W, H, shear) + d);
    brush(ctx, xs, sy, 2.6 * H / 720, r, { colour: PALETTE.paper });
  }

  // THE WAVES. One call per live record, in the order the caller hands them —
  // which is seaward first, so a nearer band of foam covers the water behind
  // it. With no list, the two the module was written with, unchanged, so the
  // standalone picture is the control for the wiring.
  if (waves) for (const w of waves) wave(ctx, xs, r, { ...w, phase, W, H, shear });
  else {
    wave(ctx, xs, r, { s: farS, peel: peel + 0.80, height: 0.048, phase: phase * 1.1, W, H, big: false, shear });
    wave(ctx, xs, r, { s: heroS, peel, height: 0.082, phase, W, H, big: true, shear });
  }

  // THE SWASH FRONT, AND IT IS THE ONE CURVE. `frontAt` is the PUBLISHED swash
  // edge — scallops and all, generated in the simulation from each wave's own
  // seed at birth. Generating them here as well is what would put a bird on a
  // line that is not the line that is drawn, so the fallback below exists only
  // for a standalone call with no simulation behind it.
  let front;
  if (frontAt) {
    front = xs.map((x) => yOf(x, frontAt(x / W), W, H, shear));
  } else {
    const sy = bumps(xs, r, 0.007 * H, 3, phase * 1.6, 1.3, W)
      .map((d, i) => yOf(xs[i], swashS, W, H, shear) + d);
    const la = lobes(xs, r, 11, 0.025 * W, 0.069 * W, W, null, 0.32);
    const lb = lobes(xs, r, 26, 0.008 * W, 0.025 * W, W, null, 0.5);
    front = sy.map((v, i) => v + la[i] + lb[i]);
  }
  const sheetTop = frontAt
    ? xs.map((x) => yOf(x, frontAt(x / W) - 0.085, W, H, shear))
    : xs.map((x) => yOf(x, swashS - 0.085, W, H, shear));
  fillBand(ctx, xs, sheetTop, front, PALETTE.wet);
  brush(ctx, xs, front, 3.8 * H / 720, r);
  for (let k = 0; k < 11; k++) {
    const x = r() * W;
    const i = Math.round(((x - xs[0]) / (xs[N - 1] - xs[0])) * (N - 1));
    bubble(ctx, x, front[i] + (r() * 16 - 3) * H / 720, (2 + r() * 4) * H / 720);
  }

  // The strand line: the HIGH-WATER MARK, the second of the two lines the
  // simulation keeps, when the caller publishes one.
  const wy = wetAt
    ? xs.map((x) => yOf(x, wetAt(x / W), W, H, shear))
    : bumps(xs, r, 0.004 * H, 2, phase * 0.3, 1.3, W)
      .map((d, i) => yOf(xs[i], hwS, W, H, shear) + d);
  brush(ctx, xs, wy, 2.0 * H / 720, r);

  // sand marks are fixed in screen space, not regenerated per frame
  const sr = rng(99);
  for (let k = 0; k < 30; k++) {
    const x = -0.02 * W + sr() * 1.04 * W;
    const s = 0.80 + sr() * 0.23;
    const y = yOf(x, s, W, H, shear);
    const L = (16 + sr() * 34) * W / 960;
    const a = (sr() * 0.30 - 0.15);
    const mx = [], my = [];
    for (let j = 0; j < 14; j++) {
      const px = x - L / 2 + (L * j) / 13;
      mx.push(px);
      my.push(y + (px - x) * (a + shear * H / W) + (sr() * 2 - 1) * 0.7);
    }
    brush(ctx, mx, my, 1.9 * H / 720, sr, { passes: false, vary: 0.3 });
  }
}
