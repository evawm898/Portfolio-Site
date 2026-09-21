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
 * EVERY PER-FRAME ARRAY IS A VIEW INTO A SCRATCH POOL, AND THAT IS THE WHOLE
 * OF THE SECOND CHANGE. This file used to allocate its way through a frame —
 * `bumps` returned a fresh array seven times over, `lobesFrom` twice a wave,
 * `wave` built fifteen arrays of N, `brush` sliced its run and built two
 * arrays of two-element arrays per stroke, and `draw` rebuilt `xs` though it
 * depends only on W. A fixed volume of garbage per draw means a collection at
 * a fixed DRAW COUNT, and on an ambient scene that pause is the whole defect.
 * The pool below is allocated once at the largest count any caller asks for
 * and reused across calls and across frames.
 *
 * TWO POOLS, NOT ONE, AND THE SPLIT IS LOAD-BEARING. `ensureField` grows the
 * N-length buffers the frame's curves live in; `ensureStroke` grows only the
 * four a single stroke needs. They are separate because `brush` is exported
 * and may be handed a plain array longer than anything `draw` has asked for —
 * growing the pool there would REALLOCATE the very buffers its caller passed
 * in as `xs` and `ys`, which is a use-after-free with extra steps.
 *
 * AND THE `r()` CALL ORDER IS UNTOUCHED, WHICH IS WHAT MAKES THIS MECHANICAL.
 * Every draw off the stream happens in the same place, the same number of
 * times, in the same order; the only thing that moved is where the result is
 * written. The control is that the standalone picture does not move a single
 * pixel — if it moves, the consumption order changed and the change is wrong.
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

/* ------------------------------------------------------------------------ *
 * THE SCRATCH POOL
 *
 * One buffer per role rather than a heap of anonymous temporaries, because a
 * shared temporary is only safe while nobody reads it across a call, and the
 * lip, the crest and the hook all do exactly that. Named, the lifetimes are
 * readable; anonymous, they are a bug waiting for a reordering.
 * ------------------------------------------------------------------------ */

/** `draw()`'s own column count. The pool is sized from this on first use. */
const NCOL = 520;

/** The per-frame curves, all of them N long. */
const FIELD = [
  'xs', 'base', 'b', 'crest', 'h', 'curl', 'foamw', 'g', 'spent',
  'lobeA', 'lobeB', 'faceBot', 'lipTop', 'lipBot', 'fbTop', 'fbBot',
  'lipGate', 'crestGate', 'hookGate', 'tmpA', 'tmpB',
  'horizon', 'mid', 'flatTop', 'sy', 'front', 'sheetTop', 'wy', 'la', 'lb',
  'mx', 'my',
];

const P = {
  /** the standalone path's own lobe parameters, at most 26 of each */
  cenA: new Float64Array(32), radA: new Float64Array(32),
  cenB: new Float64Array(32), radB: new Float64Array(32),
  /** a brush pass's three phase offsets, and its at-most-two cut positions */
  ph: new Float64Array(4),
  cuts: new Float64Array(4),
  idx: new Int32Array(8),
  segs: new Int32Array(16),
};

let FIELD_CAP = 0;
let STROKE_CAP = 0;
/** invalidated whenever the pool moves, so a cached `xs` can never be stale */
let xsW = -1;

function ensureField(n) {
  if (n <= FIELD_CAP) return;
  FIELD_CAP = Math.max(n, NCOL);
  for (const k of FIELD) P[k] = new Float64Array(FIELD_CAP);
  P.runs = new Int32Array(FIELD_CAP + 2);
  xsW = -1;
}

function ensureStroke(n) {
  if (n <= STROKE_CAP) return;
  STROKE_CAP = Math.max(n, NCOL);
  P.upx = new Float64Array(STROKE_CAP); P.upy = new Float64Array(STROKE_CAP);
  P.dnx = new Float64Array(STROKE_CAP); P.dny = new Float64Array(STROKE_CAP);
  if (!P.runs || P.runs.length < STROKE_CAP + 2) P.runs = new Int32Array(STROKE_CAP + 2);
}

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

/**
 * Low-frequency wander. Never a single sine — that reads as machinery.
 *
 * Writes into `out` and takes an explicit count, because a pooled buffer's
 * `length` is the pool's capacity rather than the frame's column count.
 */
function bumpsInto(out, xs, n, r, amp, k, phase, scale = 1.3, W = 1) {
  const ph = P.ph;
  for (let i = 0; i < k; i++) ph[i] = r() * 6.283;
  for (let j = 0; j < n; j++) {
    let y = 0;
    for (let i = 0; i < k; i++) {
      y += (amp / (i + 1.5)) *
        Math.sin((2 * Math.PI * (i + 1) * scale * xs[j]) / W + phase * (i + 1) + ph[i]);
    }
    out[j] = y;
  }
  return out;
}

/**
 * Union of half-discs — the scalloped edge every cartoon foam line has.
 * Irregular spacing and a centre-weighted radius are what stop it reading
 * as a row of identical bumps.
 */
function lobeParamsInto(cen, rad, r, n, rlo, rhi, jitter = 0.85) {
  const step = 1.17 / n;
  for (let i = 0; i < n; i++) {
    cen[i] = -0.083 + step * (i + (r() * 2 - 1) * jitter);
    rad[i] = rlo + (rhi - rlo) * ((r() + r()) / 2);   // centre-weighted
  }
}

/**
 * The allocating form, kept exactly as it was because beach-wave.js and
 * beach-swash.js call it AT BIRTH and STORE the result — the one place in
 * this file where a fresh array is the point rather than the cost.
 */
export function lobeParams(r, n, rlo, rhi, jitter = 0.85) {
  const cen = new Array(n), rad = new Array(n);
  lobeParamsInto(cen, rad, r, n, rlo, rhi, jitter);
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
function lobesInto(out, xs, n, cen, rad, m, W, gate, squash) {
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    let b = 0;
    for (let j = 0; j < m; j++) {
      const c = cen[j] * W, rr = rad[j] * W;
      const d = rr * rr - (x - c) * (x - c);
      if (d > 0) {
        const v = Math.sqrt(d) * squash;
        if (v > b) b = v;
      }
    }
    out[i] = gate ? b * gate[i] : b;
  }
  return out;
}

/**
 * The allocating form. beach-swash.js calls this once per wave at birth to
 * build the scallop it will publish, so the array it returns is kept.
 */
export function lobesFrom(xs, p, W, gate = null, squash = 0.45) {
  const n = xs.length;
  return lobesInto(new Array(n), xs, n, p.cen, p.rad, p.cen.length, W, gate, squash);
}

function fillBand(ctx, xs, n, top, bot, colour) {
  ctx.beginPath();
  ctx.moveTo(xs[0], top[0]);
  for (let i = 1; i < n; i++) ctx.lineTo(xs[i], top[i]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], bot[i]);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

/** A brush pass's three width frequencies and their weights, flat and fixed. */
const BRUSH_FS = new Float64Array([1.7, 0.55, 3.3, 0.30, 6.1, 0.15]);

/**
 * A stroke laid down the way a brush lays one down: width swells at three
 * frequencies along the length, the ends lift, and a long stroke is laid
 * in two or three overlapping passes rather than one continuous line.
 *
 * A RUN AND A SEGMENT ARE BOTH CONTIGUOUS, so each is two integers rather
 * than an array of indices. The run loop only ever pushes consecutive `i`
 * and resets on a gap, and `Array.slice` of a contiguous range is contiguous
 * — so nothing is given up by carrying (start, length) instead.
 */
export function brush(ctx, xs, ys, width, r, {
  n = xs.length, colour = PALETTE.ink, gate = null, passes = true, vary = 0.42,
} = {}) {
  ensureStroke(n);
  const runs = P.runs, segs = P.segs, cuts = P.cuts, idx = P.idx, ph = P.ph;
  const upx = P.upx, upy = P.upy, dnx = P.dnx, dny = P.dny;

  let nruns = 0;
  if (gate) {
    let st = -1;
    for (let i = 0; i < n; i++) {
      if (gate[i] > 0.03) { if (st < 0) st = i; }
      else {
        if (st >= 0 && i - st > 3) { runs[nruns * 2] = st; runs[nruns * 2 + 1] = i - st; nruns++; }
        st = -1;
      }
    }
    if (st >= 0 && n - st > 3) { runs[nruns * 2] = st; runs[nruns * 2 + 1] = n - st; nruns++; }
  } else { runs[0] = 0; runs[1] = n; nruns = 1; }

  for (let ri = 0; ri < nruns; ri++) {
    const runStart = runs[ri * 2], runLen = runs[ri * 2 + 1];
    if (runLen < 4) continue;
    let nsegs = 0;
    if (passes && runLen > 90) {
      const k = 2 + Math.floor(r() * 2);
      for (let i = 0; i < k - 1; i++) cuts[i] = 0.2 + r() * 0.6;
      // at most two entries, so an insertion sort is the same answer as
      // `.sort((a, b) => a - b)` without the comparator closure
      for (let i = 1; i < k - 1; i++) {
        const v = cuts[i]; let j = i - 1;
        while (j >= 0 && cuts[j] > v) { cuts[j + 1] = cuts[j]; j--; }
        cuts[j + 1] = v;
      }
      idx[0] = 0;
      for (let i = 0; i < k - 1; i++) idx[i + 1] = Math.floor(cuts[i] * runLen);
      idx[k] = runLen;
      for (let j = 0; j < k; j++) {
        const a = idx[j] - 6 < 0 ? 0 : idx[j] - 6;
        const e = idx[j + 1];
        segs[nsegs * 2] = runStart + a;
        segs[nsegs * 2 + 1] = e - a < 0 ? 0 : e - a;
        nsegs++;
      }
    } else { segs[0] = runStart; segs[1] = runLen; nsegs = 1; }

    for (let si = 0; si < nsegs; si++) {
      const segStart = segs[si * 2], m = segs[si * 2 + 1];
      if (m < 4) continue;
      for (let f = 0; f < 3; f++) ph[f] = r() * 6.283;
      for (let i = 0; i < m; i++) {
        const t = i / (m - 1);
        let wob = 1;
        for (let f = 0; f < 3; f++) {
          wob += vary * BRUSH_FS[f * 2 + 1] * Math.sin(2 * Math.PI * BRUSH_FS[f * 2] * t + ph[f]);
        }
        const prof = Math.pow(Math.sin(Math.PI * t), 0.30); // full most of the way
        const w = Math.max(0.35, (width * prof * wob) / 2);
        const a = segStart + (i - 1 < 0 ? 0 : i - 1);
        const bi = segStart + (i + 1 > m - 1 ? m - 1 : i + 1);
        const dx = xs[bi] - xs[a], dy = ys[bi] - ys[a];
        const L = Math.hypot(dx, dy) || 1e-6;
        const nx = -dy / L * w, ny = dx / L * w;
        upx[i] = xs[segStart + i] + nx; upy[i] = ys[segStart + i] + ny;
        dnx[i] = xs[segStart + i] - nx; dny[i] = ys[segStart + i] - ny;
      }
      ctx.beginPath();
      ctx.moveTo(upx[0], upy[0]);
      for (let i = 1; i < m; i++) ctx.lineTo(upx[i], upy[i]);
      for (let i = m - 1; i >= 0; i--) ctx.lineTo(dnx[i], dny[i]);
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
 *
 * `n` is explicit because `xs` is a pooled buffer whose length is the pool's
 * capacity. Nothing outside this file calls it.
 */
export function wave(ctx, xs, n, r, {
  s, peel, height, phase, W, H, big = true, shear = SHEAR,
  sAt = null, bAt = null, seed, scalA = null, scalB = null, bubbles = null,
}) {
  // A PER-CALL STREAM PER MARK, so a stroke's own width wobble is a property of
  // WHICH WAVE this is and not of how many bubbles the wave before it happened
  // to draw. Without it every `r()` a frame takes shifts everything after it,
  // and in motion the strokes crawl. With no seed the caller's stream is used,
  // which is the standalone path and is unchanged.
  const sub = seed === undefined ? () => r : (k) => rng((seed ^ (k * 0x9e3779b1)) >>> 0);

  // WHERE THE WAVE IS: the caller's per-column band position when it has one
  // (the live record's own crest, carrying its own along-shore wobble), the
  // module's own wander when it does not.
  const base = P.base;
  if (sAt) {
    for (let i = 0; i < n; i++) base[i] = yOf(xs[i], sAt(xs[i] / W), W, H, shear);
  } else {
    bumpsInto(base, xs, n, r, 0.009 * H, 3, phase, 1.3, W);
    for (let i = 0; i < n; i++) base[i] = yOf(xs[i], s, W, H, shear) + base[i];
  }

  // HOW FAR THROUGH THE BREAK EACH COLUMN IS. `b` runs 0 at the unbroken end to
  // 1 at the spent end and everything below is a function of it, so this is the
  // ONE place the peel enters the drawing. Wired, it comes from the record's
  // own clock (beach-wave.js's drawPhaseAt, which reads the same `brokenAt` the
  // stage labels do, so the picture and the label cannot disagree); standalone
  // it is the module's own sweep across the frame.
  const b = P.b;
  if (bAt) for (let i = 0; i < n; i++) b[i] = bAt(xs[i] / W);
  else for (let i = 0; i < n; i++) b[i] = smoothstep((xs[i] / W - (peel - 0.34)) / 0.50);

  const crest = P.crest, h = P.h, curl = P.curl;
  const foamw = P.foamw, g = P.g, spent = P.spent;
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

  const lobeA = P.lobeA, lobeB = P.lobeB;
  if (scalA) lobesInto(lobeA, xs, n, scalA.cen, scalA.rad, scalA.cen.length, W, g, 0.44);
  else {
    lobeParamsInto(P.cenA, P.radA, r, 9, 0.035, 0.096);
    lobesInto(lobeA, xs, n, P.cenA, P.radA, 9, W, g, 0.44);
  }
  if (scalB) lobesInto(lobeB, xs, n, scalB.cen, scalB.rad, scalB.cen.length, W, g, 0.55);
  else {
    lobeParamsInto(P.cenB, P.radB, r, 22, 0.010, 0.031);
    lobesInto(lobeB, xs, n, P.cenB, P.radB, 22, W, g, 0.55);
  }

  const faceBot = P.faceBot;
  for (let i = 0; i < n; i++) {
    faceBot[i] = base[i] + (0.040 + 0.030 * (1 - b[i])) * H + 0.22 * h[i];
  }
  fillBand(ctx, xs, n, crest, faceBot, PALETTE.ink);

  const lipTop = P.lipTop, lipBot = P.lipBot;
  for (let i = 0; i < n; i++) {
    lipTop[i] = crest[i] - 0.30 * h[i] * curl[i] * spent[i];
    lipBot[i] = crest[i] + (0.42 * h[i] + 0.5 * foamw[i])
      * Math.max(curl[i], 0.30 * smoothstep((b[i] - 0.28) / 0.3)) * spent[i];
  }
  fillBand(ctx, xs, n, lipTop, lipBot, PALETTE.paper);

  const lipGate = P.lipGate, crestGate = P.crestGate;
  for (let i = 0; i < n; i++) {
    lipGate[i] = spent[i] * (curl[i] + 0.25 * g[i]);
    crestGate[i] = 0.15 + spent[i];
  }
  brush(ctx, xs, lipBot, (big ? 3.4 : 2.4) * H / 720, sub(1), { n, gate: lipGate });
  brush(ctx, xs, crest, (big ? 3.2 : 2.2) * H / 720, sub(2), { n, gate: crestGate });

  // the hook: the lip thrown forward, heavy and short
  const hookGate = P.hookGate;
  let anyHook = false;
  for (let i = 0; i < n; i++) {
    hookGate[i] = curl[i] > 0.42 ? 1 : 0;
    if (hookGate[i]) anyHook = true;
  }
  if (anyHook) {
    const tmpA = P.tmpA, tmpB = P.tmpB;
    for (let i = 0; i < n; i++) tmpA[i] = lipBot[i] + 0.30 * h[i];
    brush(ctx, xs, tmpA, (big ? 4.6 : 3.0) * H / 720, sub(3),
      { n, gate: hookGate, passes: false, vary: 0.55 });
    for (let i = 0; i < n; i++) tmpB[i] = lipTop[i] - 0.10 * h[i];
    brush(ctx, xs, tmpB, 2.4 * H / 720, sub(4), { n, gate: hookGate, passes: false });
  }

  const fbTop = P.fbTop, fbBot = P.fbBot;
  for (let i = 0; i < n; i++) {
    fbTop[i] = crest[i] + 0.26 * h[i];
    fbBot[i] = fbTop[i] + foamw[i] + lobeA[i] + lobeB[i];
  }
  fillBand(ctx, xs, n, fbTop, fbBot, PALETTE.paper);
  brush(ctx, xs, fbBot, (big ? 3.6 : 2.6) * H / 720, sub(5), { n, gate: g });

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

/** The two open-water brush lines' band positions, hoisted out of the frame. */
const WATER_LINES = [0.06, 0.105];

/**
 * How deep the wet sheet is drawn behind the swash front. Named rather than
 * written twice, because its SEAWARD end is now clamped and a second copy
 * would let the two branches disagree about where the sheet starts.
 */
const SHEET_DEPTH_S = 0.085;

/**
 * The options one live record is drawn with, reused across waves and frames.
 * A `{ ...w, phase, W, H, shear }` spread is one object per wave per frame;
 * every field `wave()` destructures is written here instead. `big` carries
 * its own default rather than leaning on the destructure, because a record
 * that omits it must still read `true` the way the spread made it.
 */
const WOPTS = {
  s: 0, peel: 0, height: 0, big: true, shear: 0, phase: 0, W: 0, H: 0,
  sAt: null, bAt: null, seed: undefined, scalA: null, scalB: null, bubbles: null,
};

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
    waterlineS = null,
  } = state || {};
  const r = rng(seed);
  const n = NCOL;
  ensureField(n);
  ensureStroke(n);
  const xs = P.xs;
  // THE COLUMNS DEPEND ONLY ON W, so they are laid out once and kept. The
  // guard is on W rather than on "have we run before", because a resize is
  // the one thing that moves them.
  if (xsW !== W) {
    for (let i = 0; i < n; i++) xs[i] = -0.042 * W + (1.084 * W * i) / (n - 1);
    xsW = W;
  }

  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, W, H);

  const horizon = P.horizon, mid = P.mid, flatTop = P.flatTop;
  bumpsInto(horizon, xs, n, r, 0.005 * H, 2, phase, 1.3, W);
  for (let i = 0; i < n; i++) {
    horizon[i] = yOf(xs[i], 0.155, W, H, shear) + horizon[i];
    flatTop[i] = -0.08 * H;
  }
  fillBand(ctx, xs, n, flatTop, horizon, PALETTE.seaDeep);
  bumpsInto(mid, xs, n, r, 0.006 * H, 2, phase * 0.8, 1.3, W);
  for (let i = 0; i < n; i++) mid[i] = yOf(xs[i], farS + 0.10, W, H, shear) + mid[i];
  fillBand(ctx, xs, n, horizon, mid, PALETTE.sea);

  const sy = P.sy;
  for (const s of WATER_LINES) {
    bumpsInto(sy, xs, n, r, 0.007 * H, 3, phase * 0.6, 1.3, W);
    for (let i = 0; i < n; i++) sy[i] = yOf(xs[i], s, W, H, shear) + sy[i];
    brush(ctx, xs, sy, 2.6 * H / 720, r, { n, colour: PALETTE.paper });
  }

  // THE WAVES. One call per live record, in the order the caller hands them —
  // which is seaward first, so a nearer band of foam covers the water behind
  // it. With no list, the two the module was written with, unchanged, so the
  // standalone picture is the control for the wiring.
  if (waves) {
    for (const w of waves) {
      WOPTS.s = w.s; WOPTS.peel = w.peel; WOPTS.height = w.height;
      WOPTS.big = w.big === undefined ? true : w.big;
      WOPTS.sAt = w.sAt; WOPTS.bAt = w.bAt; WOPTS.seed = w.seed;
      WOPTS.scalA = w.scalA; WOPTS.scalB = w.scalB; WOPTS.bubbles = w.bubbles;
      WOPTS.phase = phase; WOPTS.W = W; WOPTS.H = H; WOPTS.shear = shear;
      wave(ctx, xs, n, r, WOPTS);
    }
  } else {
    wave(ctx, xs, n, r, { s: farS, peel: peel + 0.80, height: 0.048, phase: phase * 1.1, W, H, big: false, shear });
    wave(ctx, xs, n, r, { s: heroS, peel, height: 0.082, phase, W, H, big: true, shear });
  }

  // THE SWASH FRONT, AND IT IS THE ONE CURVE. `frontAt` is the PUBLISHED swash
  // edge — scallops and all, generated in the simulation from each wave's own
  // seed at birth. Generating them here as well is what would put a bird on a
  // line that is not the line that is drawn, so the fallback below exists only
  // for a standalone call with no simulation behind it.
  const front = P.front, sheetTop = P.sheetTop;
  if (frontAt) {
    // two passes rather than one, because the two used to be two separate
    // maps and a query with any state of its own would notice the difference
    for (let i = 0; i < n; i++) front[i] = yOf(xs[i], frontAt(xs[i] / W), W, H, shear);
    // THE SHEET'S SEAWARD END IS THE WATERLINE, AND THAT IS WHAT STOPS IT
    // SWALLOWING AN ARRIVING WAVE. `front - SHEET_DEPTH_S` is a fixed band
    // hung off the front, so whenever the swash is within that depth of the
    // waterline the band is drawn ON THE SEA — measured, 52% of frames, and
    // up to the full 0.085 of frame height. A wave is handed to the swash
    // exactly when its crest crosses the waterline, so a sheet that stops
    // there cannot cover a wave that is still arriving: it ate one from the
    // bottom up while it was still 0.08 of the frame from the shore.
    //
    // The DEPTH is unchanged and is now a maximum. With no waterline — the
    // standalone path, which has no simulation behind it — nothing clamps and
    // the picture is the one the module was verified at.
    for (let i = 0; i < n; i++) {
      const top = frontAt(xs[i] / W) - SHEET_DEPTH_S;
      sheetTop[i] = yOf(xs[i], waterlineS === null ? top : Math.max(waterlineS, top), W, H, shear);
    }
  } else {
    const la = P.la, lb = P.lb;
    bumpsInto(front, xs, n, r, 0.007 * H, 3, phase * 1.6, 1.3, W);
    for (let i = 0; i < n; i++) front[i] = yOf(xs[i], swashS, W, H, shear) + front[i];
    lobeParamsInto(P.cenA, P.radA, r, 11, 0.025, 0.069, 0.85);
    lobesInto(la, xs, n, P.cenA, P.radA, 11, W, null, 0.32);
    lobeParamsInto(P.cenB, P.radB, r, 26, 0.008, 0.025, 0.85);
    lobesInto(lb, xs, n, P.cenB, P.radB, 26, W, null, 0.5);
    for (let i = 0; i < n; i++) {
      front[i] = front[i] + la[i] + lb[i];
      sheetTop[i] = yOf(xs[i], swashS - SHEET_DEPTH_S, W, H, shear);
    }
  }
  fillBand(ctx, xs, n, sheetTop, front, PALETTE.wet);
  brush(ctx, xs, front, 3.8 * H / 720, r, { n });
  for (let k = 0; k < 11; k++) {
    const x = r() * W;
    const i = Math.round(((x - xs[0]) / (xs[n - 1] - xs[0])) * (n - 1));
    bubble(ctx, x, front[i] + (r() * 16 - 3) * H / 720, (2 + r() * 4) * H / 720);
  }

  // The strand line: the HIGH-WATER MARK, the second of the two lines the
  // simulation keeps, when the caller publishes one.
  const wy = P.wy;
  if (wetAt) {
    for (let i = 0; i < n; i++) wy[i] = yOf(xs[i], wetAt(xs[i] / W), W, H, shear);
  } else {
    bumpsInto(wy, xs, n, r, 0.004 * H, 2, phase * 0.3, 1.3, W);
    for (let i = 0; i < n; i++) wy[i] = yOf(xs[i], hwS, W, H, shear) + wy[i];
  }
  brush(ctx, xs, wy, 2.0 * H / 720, r, { n });

  // sand marks are fixed in screen space, not regenerated per frame
  const sr = rng(99);
  const mx = P.mx, my = P.my;
  for (let k = 0; k < 30; k++) {
    const x = -0.02 * W + sr() * 1.04 * W;
    const s = 0.80 + sr() * 0.23;
    const y = yOf(x, s, W, H, shear);
    const L = (16 + sr() * 34) * W / 960;
    const a = (sr() * 0.30 - 0.15);
    for (let j = 0; j < 14; j++) {
      const px = x - L / 2 + (L * j) / 13;
      mx[j] = px;
      my[j] = y + (px - x) * (a + shear * H / W) + (sr() * 2 - 1) * 0.7;
    }
    brush(ctx, mx, my, 1.9 * H / 720, sr, { n: 14, passes: false, vary: 0.3 });
  }
}
