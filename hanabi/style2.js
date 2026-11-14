// hanabi/style2.js — STYLE 2, "Paper & Thread": a second renderer over the one
// firework spec (schema version 8; docs/hanabi.md, "Styles").
//
// A style changes how a firework is DRAWN and nothing else: the suit, its type,
// colours, count, Detail, rotation, size, arrangement, per-firework styles and
// centring are the spec's, exactly as under Style 1 ('line'). Style 2 starts from
// the same geometry — a type's primitives and their fit (firework.js typeLayout),
// a catalogue burst's Style 1 drawing (style1Body) — and DRESSES it in a blend of
// three vocabularies:
//   shapes  stars made of shapes, not hairlines: dots, five-point stars, diamonds,
//           teardrops, petals, confetti, in rings that may mix shapes (ref 1)
//   disc    a filled, slightly translucent colour disc behind each firework, with a
//           fine paper grain, and a soft glow on the tips (ref 2)
//   thread  hand-made line: strokes of irregular width that wobble, some as
//           stitch-like dashes, bold lollipop spokes, a spoke wheel (ref 3)
// The settings are one flat table (PAPER_PARAMS), deck-wide (design.style2) with a
// per-suit override (suit.style2, any subset); fireworkSpec carries them resolved
// as spec.paper. Every random choice is seeded from the spec's seed on a stream of
// its own, so Style 2 is a pure function of the spec: preview, board and export are
// one drawing.
//
// MARKUP. A firework is three groups, in this order:
//   <g class="hb-disc">    the disc and its grain (behind; layout moves every disc of
//                          a card ahead of every firework, so discs overlap discs)
//   <g class="hb-glow2">   the soft glow under the tips
//   <g class="hb-firework" data-motif data-style="paper">  the marks
// Only the marks are the firework's extent (centring, the box contracts); every
// mark is an absolute circle or an M/L/Z path, and every node of a MAIN element
// (the count's unit: a star, a spoke, a trail, an arm, a petal, a spark, a rosette)
// carries data-m="i", so a count is read off the markup.

import { typeLayout, style1Body, withColours, rng, pick, scatter, fieldRect,
  catalogueCountAt, CATALOGUE_COUNT, TYPES, FIELD_MOTIFS, MOTIFS } from './firework.js';

export const STYLES = {
  line:  { label: 'Line', note: 'Style 1: the fine line drawing' },
  paper: { label: 'Paper & Thread', note: 'Style 2: shapes, a paper disc behind each firework, and hand-made line' },
};
export const STYLE_IDS = Object.keys(STYLES);

export const SHAPES = {
  dot: 'Dots', star: 'Stars', diamond: 'Diamonds', teardrop: 'Teardrops', petal: 'Petals', confetti: 'Confetti',
};
export const SHAPE_IDS = Object.keys(SHAPES);
export const DISC_TONES = { light: 'Lighter', dark: 'Darker', secondary: 'Secondary colour' };

// The dials. [min, max, step] for a slider; the editor and deck.js read this table.
export const PAPER_PARAMS = {
  disc:        { label: 'Disc', kind: 'bool', group: 'Disc' },
  discOpacity: { label: 'Opacity', min: 0, max: 1, step: 0.05, group: 'Disc' },
  discSize:    { label: 'Size', min: 0.6, max: 1.6, step: 0.05, group: 'Disc', note: 'the disc radius over the burst’s reach' },
  discTone:    { label: 'Colour', kind: 'tone', group: 'Disc', note: 'the suit colour lighter or darker, or the suit’s secondary colour' },
  grain:       { label: 'Grain', min: 0, max: 1, step: 0.05, group: 'Disc', note: 'a fine paper grain in the disc' },
  wobble:      { label: 'Wobble', min: 0, max: 1, step: 0.05, group: 'Line', note: '0: clean vector; 1: a brush pen' },
  stitch:      { label: 'Stitch', min: 0, max: 1, step: 0.05, group: 'Line', note: 'the share of strokes drawn as stitch-like dashes' },
  weight:      { label: 'Weight', min: 0.5, max: 2, step: 0.05, group: 'Line', note: 'stroke weight' },
  shapes:      { label: 'Shapes', kind: 'shapes', group: 'Shapes', note: 'the tip shapes allowed' },
  mix:         { label: 'Mixing', min: 0, max: 1, step: 0.05, group: 'Shapes', note: '0: one shape per firework; 1: every ring its own shape' },
  glow:        { label: 'Glow', min: 0, max: 1, step: 0.05, group: 'Glow', note: 'a soft glow on dot tips' },
};
export const PAPER_KEYS = Object.keys(PAPER_PARAMS);
// The balanced blend (Eva's to rule from the style sheet).
export const PAPER_DEFAULTS = {
  disc: true, discOpacity: 0.5, discSize: 1.1, discTone: 'dark', grain: 0.35,
  wobble: 0.4, stitch: 0.3, weight: 1,
  shapes: [...SHAPE_IDS], mix: 0.5,
  glow: 0.4,
};
// Three chips that show the dials' range. Each sets every dial.
export const PAPER_PRESETS = {
  flat:   { label: 'Flat', note: 'crisp shapes, mixed rings, no disc (ref 1)',
            values: { disc: false, discOpacity: 0.35, discSize: 1.15, discTone: 'light', grain: 0, wobble: 0, stitch: 0, weight: 1, shapes: [...SHAPE_IDS], mix: 1, glow: 0 } },
  paper:  { label: 'Paper', note: 'a deep grained colour disc, round tips that glow (ref 2)',
            values: { disc: true, discOpacity: 0.85, discSize: 1.3, discTone: 'dark', grain: 0.7, wobble: 0.1, stitch: 0, weight: 0.9, shapes: ['dot', 'teardrop', 'petal'], mix: 0.3, glow: 0.8 } },
  thread: { label: 'Thread', note: 'hand-drawn, stitched line (ref 3)',
            values: { disc: false, discOpacity: 0.35, discSize: 1.15, discTone: 'dark', grain: 0, wobble: 0.85, stitch: 0.75, weight: 1.3, shapes: ['dot', 'teardrop', 'petal', 'confetti'], mix: 0.35, glow: 0 } },
};
export const defaultPaper = () => ({ ...PAPER_DEFAULTS, shapes: [...PAPER_DEFAULTS.shapes] });

// One value read against its row; undefined when it is not understood.
export function readPaperValue(k, v) {
  const P = PAPER_PARAMS[k];
  if (!P) return undefined;
  if (P.kind === 'bool') return typeof v === 'boolean' ? v : undefined;
  if (P.kind === 'tone') return DISC_TONES[v] ? v : undefined;
  if (P.kind === 'shapes') {
    if (!Array.isArray(v)) return undefined;
    const ok = SHAPE_IDS.filter((s) => v.includes(s));
    return ok.length ? ok : undefined;
  }
  const n = typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(P.max, Math.max(P.min, n));
}
// A partial table (deck or suit) read key by key; every key not understood is told.
export function readPaper(raw, note, partial = false) {
  const out = partial ? {} : defaultPaper();
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    const r = readPaperValue(k, v);
    if (r === undefined) note(`Style 2 setting ${k}=${JSON.stringify(v)} not understood — dropped`);
    else out[k] = Array.isArray(r) ? [...r] : r;
  }
  return out;
}
// The settings a suit draws with: the defaults <- the deck's <- the suit's own.
export function resolvePaper(design, suit) {
  const out = { ...PAPER_DEFAULTS, ...(design.style2 || {}), ...((suit && suit.style2) || {}) };
  out.shapes = [...(out.shapes && out.shapes.length ? out.shapes : PAPER_DEFAULTS.shapes)];
  out.suitColors = suit ? [suit.primary, suit.secondary] : null;
  return out;
}

// ---------------------------------------------------------------- helpers
const f = (v) => +v.toFixed(3);
const TAU = Math.PI * 2;
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return hexOf(A.map((v, i) => v + (B[i] - v) * t)); };
const HEXRE = /^#[0-9A-Fa-f]{6}$/;
// arm i of n is in the share d (0..1), evenly spread (firework.js keeps())
const share = (i, d) => Math.floor((i + 1) * d + 1e-9) > Math.floor(i * d + 1e-9);
// group g of a firework draws in a shape other than its own when its golden-ratio
// stamp falls under the mixing (the outer group only from 0.9): the same rings mix
// on every firework of a design, so a deck stays one deck
const groupMixes = (g, m) => (g === 0 ? m >= 0.9 : (((g - 1) * 0.6180339887) % 1) < m);
function shapeFor(P, g, i, primary) {
  const allowed = P.shapes.length ? P.shapes : ['dot'];
  const prim = allowed.includes(primary) ? primary : allowed[0];
  if (allowed.length < 2 || P.mix <= 0) return prim;
  const others = allowed.filter((s) => s !== prim);
  let s = groupMixes(g, P.mix) ? others[(g + others.length - 1) % others.length] : prim;
  // at high mixing a ring alternates two shapes (ref 1's mixed rings)
  if (P.mix > 0.66 && i % 2) s = s === prim ? others[g % others.length] : prim;
  return s;
}
// a teardrop in a local frame: its head a circle of radius h centred at (u0, v0) on
// the axis, its point L behind the head's centre
function dropPts(u0, v0, h, L) {
  const b = Math.acos(Math.min(0.99, h / L)), out = [[u0 - L, v0]];
  for (let i = 0; i <= 10; i++) { const t = Math.PI - b - (i / 10) * 2 * (Math.PI - b); out.push([u0 + h * Math.cos(t), v0 + h * Math.sin(t)]); }
  return out;
}
// smooth noise on t in [0, 1], about [-1, 1]
function noise(rnd) {
  const a = rnd() * TAU, b = rnd() * TAU, c = 1 + rnd() * 0.8, d = 2.3 + rnd() * 1.4;
  return (t) => 0.62 * Math.sin(TAU * c * t + a) + 0.38 * Math.sin(TAU * d * t + b);
}
const lenOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
// resample a polyline into n + 1 points evenly along its length
function resample(pts, n) {
  if (pts.length < 2) return pts.map((p) => p.slice());
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1] || 1e-9, out = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const s = (L * k) / n;
    while (j < pts.length - 1 && cum[j] < s) j++;
    const t = (s - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1e-9);
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t]);
  }
  return out;
}
// the part of a polyline between arc lengths s0 and s1
function slice(pts, s0, s1) {
  const out = []; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const at = (s) => { const t = l ? (s - acc) / l : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    if (acc + l >= s0 && acc <= s1) {
      if (!out.length) out.push(at(Math.max(s0, acc)));
      out.push(at(Math.min(s1, acc + l)));
    }
    acc += l;
  }
  return out;
}
const cubicPts = (p0, p1, p2, p3, n = 10) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
});

// ---------------------------------------------------------------- the drawing kit
// Style 2 is BOLDER than the line drawing it dresses: a star becomes a shape
// SHAPE_K times its dot's radius, a stroke STROKE_K times its width (then the
// Weight dial). The fit afterwards keeps every mark inside the burst's reach.
export const SHAPE_K = 1.7, STROKE_K = 1.9;
// A Kit collects ITEMS in card mm — c (circle), p (filled polygon), s (open
// stroke) — and the glows under them, and emits them once fitted.
function Kit(P, seed) {
  const rnd = rng((seed ^ 0x5bd1e995) >>> 0);
  const items = [], glows = [];
  const W = P.wobble, weight = P.weight;
  let mi = 0;
  const K = {
    P, rnd, items, glows,
    main() { return mi++; },
    get mains() { return mi; },
    circle(x, y, r, col, o = {}) { items.push({ t: 'c', x, y, r, col, ...o }); },
    poly(pts, col, o = {}) { items.push({ t: 'p', pts, col, ...o }); },
    // a hand-made stroke along a polyline: width w at the start (x taper[0]) to
    // the end (x taper[1]), its centreline and width wobbling; filled, round ends
    brush(pts, w, col, o = {}) {
      const L = lenOf(pts);
      if (L < 1e-6) return;
      const n = Math.max(3, Math.min(18, Math.ceil(L / Math.max(0.6, w * 2.2))));
      const q = resample(pts, n), n1 = noise(rnd), n2 = noise(rnd);
      const amp = W * Math.min(0.45 * w + 0.12, 0.05 * L), [t0, t1] = o.taper || [1, 1];
      const ww = Array.isArray(o.ws) ? o.ws : null;
      const left = [], right = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = q[Math.max(0, i - 1)], b = q[Math.min(n, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
        const off = amp * n1(t) * Math.min(1, t * 3);
        const base = ww ? ww[Math.min(ww.length - 1, Math.round(t * (ww.length - 1)))] * 2 : w;
        const hw = Math.max(0.05, (base / 2) * (t0 + (t1 - t0) * t) * (1 + 0.42 * W * n2(t)));
        const cxx = q[i][0] + nx * off, cyy = q[i][1] + ny * off;
        left.push([cxx + nx * hw, cyy + ny * hw, hw, nx, ny, dx / dl, dy / dl]); right.push([cxx - nx * hw, cyy - ny * hw]);
      }
      const cap = (p, dirx, diry, nx, ny, hw) => [45, 90, 135].map((d) => { const r = (d * Math.PI) / 180; return [p[0] + hw * (nx * Math.cos(r) + dirx * Math.sin(r)), p[1] + hw * (ny * Math.cos(r) + diry * Math.sin(r))]; });
      const e = left[n], s0 = left[0];
      const ec = [e[0] - e[3] * e[2], e[1] - e[4] * e[2]], sc = [s0[0] - s0[3] * s0[2], s0[1] - s0[4] * s0[2]];
      const pts2 = [...left.map((p) => [p[0], p[1]]), ...cap(ec, e[5], e[6], e[3], e[4], e[2]), ...right.reverse(), ...cap(sc, -s0[5], -s0[6], -s0[3], -s0[4], s0[2])];
      items.push({ t: 'p', pts: pts2, col, ...o.attrs });
    },
    // a stroke as a run of stitches: short dashes along the path, each a touch
    // askew; one dash when the path is short
    stitches(pts, w, col, o = {}) {
      const L = lenOf(pts), d = Math.max(w * 2.6, 0.9), gap = d * 0.55;
      if (L < d * 1.6) { K.brush(pts, w, col, o); return; }
      const k = Math.max(2, Math.round((L + gap) / (d + gap))), step = (L + gap) / k, dl = step - gap;
      for (let j = 0; j < k; j++) {
        let seg = slice(pts, j * step, j * step + dl);
        if (seg.length < 2) continue;
        const mx = (seg[0][0] + seg[seg.length - 1][0]) / 2, my = (seg[0][1] + seg[seg.length - 1][1]) / 2;
        const ang = (rnd() - 0.5) * 0.5 * (0.3 + W), cs = Math.cos(ang), sn = Math.sin(ang);
        seg = seg.map(([x, y]) => [mx + (x - mx) * cs - (y - my) * sn, my + (x - mx) * sn + (y - my) * cs]);
        K.brush(seg, w * 0.86, col, o);
      }
    },
    line(pts, w, col, stitched, o = {}) { (stitched ? K.stitches : K.brush)(pts, w * weight * STROKE_K, col, o); },
    // a tip / star SHAPE centred at (x, y), size s (the round star's radius it
    // stands for), its axis at angle a (outward)
    shape(kind, x, y, s0, a, col, o = {}) {
      const s = s0 * SHAPE_K;
      const jit = () => (rnd() - 0.5) * 0.18 * W * s;
      const at = (u, v) => [x + u * Math.cos(a) - v * Math.sin(a) + jit(), y + u * Math.sin(a) + v * Math.cos(a) + jit()];
      if (o.glow !== false && P.glow > 0) glows.push({ x, y, r: s, col });
      const attrs = o.attrs || {};
      if (kind === 'dot') { items.push({ t: 'c', x, y, r: s, col, ...attrs }); return; }
      let pts;
      if (kind === 'star') {
        const R = s * 1.35, r = R * 0.45;
        pts = Array.from({ length: 10 }, (_, i) => { const t = (i * Math.PI) / 5, rr = i % 2 ? r : R; return at(Math.cos(t) * rr, Math.sin(t) * rr); });
      } else if (kind === 'diamond') pts = [at(s * 1.4, 0), at(0, s * 0.75), at(-s * 1.4, 0), at(0, -s * 0.75)];
      else if (kind === 'teardrop') pts = dropPts(0.35 * s, 0, s * 0.95, s * 2.1).map(([u, v]) => at(u, v));   // the head outward, the point inward
      else if (kind === 'petal') {
        pts = Array.from({ length: 12 }, (_, i) => { const t = (i / 12) * TAU, sn = Math.sin(t); return at(Math.cos(t) * s * 1.5, Math.sign(sn) * Math.abs(sn) ** 1.25 * s * 0.62); });
      } else {   // confetti: a small turned slip of paper
        const b = a + (rnd() - 0.5) * 1.6, L = s * 1.45, Wd = s * 0.55;
        pts = [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]].map(([u, v]) => [x + u * Math.cos(b) - v * Math.sin(b) + jit(), y + u * Math.sin(b) + v * Math.cos(b) + jit()]);
      }
      items.push({ t: 'p', pts, col, ...attrs });
    },
  };
  return K;
}
const reachOf = (it, cx, cy) => {
  if (it.t === 'c') return Math.hypot(it.x - cx, it.y - cy) + it.r;
  const pad = it.t === 's' ? it.w / 2 : 0;
  return Math.max(...it.pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))) + pad;
};
// shrink everything about (cx, cy) until every BASE mark lies inside R; a detail
// mark that would then reach past R is left out (Style 1's rule)
function fitTo(K, cx, cy, R) {
  let reach = 0;
  for (const it of K.items) if (!it.det) reach = Math.max(reach, reachOf(it, cx, cy));
  const sc = reach > R ? R / reach : 1;
  const S = (x, y) => [cx + (x - cx) * sc, cy + (y - cy) * sc];
  if (sc !== 1) {
    for (const it of K.items) {
      if (it.t === 'c') { [it.x, it.y] = S(it.x, it.y); it.r *= sc; } else { it.pts = it.pts.map((p) => S(p[0], p[1])); if (it.w) it.w *= sc; }
    }
    for (const g of K.glows) { [g.x, g.y] = S(g.x, g.y); g.r *= sc; }
  }
  for (let i = K.items.length - 1; i >= 0; i--) if (K.items[i].det && reachOf(K.items[i], cx, cy) > R + 1e-9) K.items.splice(i, 1);
  return sc;
}
function rotate(K, cx, cy, deg) {
  const a = ((+deg || 0) * Math.PI) / 180;
  if (!a) return;
  const cs = Math.cos(a), sn = Math.sin(a), Rt = (x, y) => [cx + (x - cx) * cs - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * cs];
  for (const it of K.items) { if (it.t === 'c') [it.x, it.y] = Rt(it.x, it.y); else it.pts = it.pts.map((p) => Rt(p[0], p[1])); }
  for (const g of K.glows) [g.x, g.y] = Rt(g.x, g.y);
}
const P2 = (p) => `${f(p[0])} ${f(p[1])}`;
function emitItems(items) {
  return items.map((it) => {
    const m = it.m !== undefined ? ` data-m="${it.m}"` : '';
    const op = it.op !== undefined ? (it.t === 's' ? ` stroke-opacity="${f(it.op)}"` : ` fill-opacity="${f(it.op)}"`) : '';
    if (it.t === 'c') return `<circle cx="${f(it.x)}" cy="${f(it.y)}" r="${f(it.r)}" fill="${it.col}"${op}${m}/>`;
    if (it.t === 'p') return `<path d="M${it.pts.map(P2).join(' L')} Z" fill="${it.col}"${op}${m}/>`;
    return `<path d="M${it.pts.map(P2).join(' L')}" fill="none" stroke="${it.col}" stroke-width="${f(it.w)}" stroke-linecap="round" stroke-linejoin="round"${op}${m}/>`;
  }).join('');
}
function emitGlows(K) {
  if (!(K.P.glow > 0) || !K.glows.length) return '';
  const g = K.P.glow;
  return `<g class="hb-glow2">${K.glows.map((q) => `<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(q.r * 2.4)}" fill="${q.col}" fill-opacity="${f(0.13 * g)}"/><circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(q.r * 1.65)}" fill="${q.col}" fill-opacity="${f(0.24 * g)}"/>`).join('')}</g>`;
}

// ---- the disc: a filled translucent disc in the suit's colour and its grain
export function discColour(spec) {
  const P = spec.paper, sc = P.suitColors || [];
  const base = spec.outerColor || sc[0] || (spec.colors && spec.colors[0]) || '#FFFFFF';
  if (P.discTone === 'secondary') return spec.coreColor || sc[1] || base;
  return P.discTone === 'dark' ? mix(base, '#000000', 0.7) : mix(base, '#FFFFFF', 0.3);
}
export const GRAIN_PER_MM2 = 0.55, GRAIN_CAP = 700;
function disc(spec, cx, cy, Rd) {
  const P = spec.paper;
  if (!P.disc || !(P.discOpacity > 0) || !(Rd > 0)) return '';
  const col = discColour(spec);
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Rd)}" fill="${col}" fill-opacity="${f(P.discOpacity)}"/>`;
  const n = Math.min(GRAIN_CAP, Math.round(P.grain * Math.PI * Rd * Rd * GRAIN_PER_MM2));
  if (n > 0) {
    const rnd = rng((spec.seed ^ 0x2c1b3c6d) >>> 0), light = [], dark = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = Math.sqrt(rnd()) * Rd * 0.97, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, z = 0.12 + rnd() * 0.18;
      (i % 2 ? dark : light).push(`M${f(x)} ${f(y - z)} L${f(x + z)} ${f(y)} L${f(x)} ${f(y + z)} L${f(x - z)} ${f(y)} Z`);
    }
    out += `<path d="${light.join(' ')}" fill="#FFFFFF" fill-opacity="${f(0.16 + 0.1 * P.grain)}"/><path d="${dark.join(' ')}" fill="#000000" fill-opacity="${f(0.18 + 0.12 * P.grain)}"/>`;
  }
  return `<g class="hb-disc">${out}</g>`;
}

// ---------------------------------------------------------------- the nine types
// Each dresses the type's own primitives (typeLayout: the same count, geometry
// and fit as Style 1), transformed into card mm by T. `m` is set on the main
// elements, in order.
const near0 = (p) => Math.hypot(p[0], p[1]) < 1e-9;
const DRESS = {
  // concentric rings of stars, each ring its own shape as the mixing says
  peony(K, all, T, o, c, s) {
    const radii = [...new Set(all.filter((p) => p.k === 'dot' && !near0(p.p)).map((p) => +Math.hypot(p.p[0], p.p[1]).toFixed(6)))].sort((a, b) => b - a);
    const idx = new Map();
    for (const p of all) {
      if (p.k !== 'dot') continue;
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      const g = radii.indexOf(+Math.hypot(p.p[0], p.p[1]).toFixed(6)), i = idx.get(g) || 0; idx.set(g, i + 1);
      K.shape(shapeFor(K.P, g, i, 'dot'), q[0], q[1], p.r, Math.atan2(q[1] - T([0, 0])[1], q[0] - T([0, 0])[0]), s.colors && s.colors.length > 2 ? pick(s.colors, g + i) : p.col, { attrs: { m: K.main() } });
    }
  },
  // lollipop spokes: a hand-made spoke with a club at its end
  chrysanthemum(K, all, T, o, c, s) {
    let i = 0;
    for (const p of all) {
      if (p.k === 'line' && p.op) { K.line([T(p.a), T(p.b)], p.w, p.col, true, { attrs: { op: 0.45 } }); continue; }
      if (p.k === 'line') { K.line([T(p.a), T(p.b)], p.w, p.col, share(i, K.P.stitch), { attrs: { m: K.main() } }); i++; continue; }
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      const z = T([0, 0]), a = Math.atan2(q[1] - z[1], q[0] - z[0]);
      if (p.det) K.shape(shapeFor(K.P, 1, i, 'dot'), q[0], q[1], p.r, a, p.col, { attrs: { det: true } });
      else K.shape(shapeFor(K.P, 0, i, 'dot'), q[0], q[1], p.r * 1.25, a, p.col);
    }
  },
  // a dashed ring of stitches, inner rings in shapes
  ring(K, all, T, o, c, s) {
    const z = T([0, 0]);
    const outer = all.filter((p) => p.k === 'dot' && Math.abs(Math.hypot(p.p[0], p.p[1]) - 1) < 1e-6).length || 1;
    const radii = [...new Set(all.filter((p) => p.k === 'dot' && !near0(p.p)).map((p) => +Math.hypot(p.p[0], p.p[1]).toFixed(6)))].sort((a, b) => b - a);
    let i = 0;
    for (const p of all) {
      if (p.k !== 'dot') continue;
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      const a = Math.atan2(q[1] - z[1], q[0] - z[0]), rr = Math.hypot(q[0] - z[0], q[1] - z[1]);
      const g = radii.indexOf(+Math.hypot(p.p[0], p.p[1]).toFixed(6));
      if (g === 0) {
        // a stitch along the ring: as long as the gap to the next allows
        const half = Math.min(p.r * 2.4, (Math.PI * rr) / outer * 0.36), j = (K.rnd() - 0.5) * 0.35 * (0.3 + K.P.wobble);
        const ex = Math.cos(a + Math.PI / 2 + j), ey = Math.sin(a + Math.PI / 2 + j);
        K.brush([[q[0] - ex * half, q[1] - ey * half], [q[0] + ex * half, q[1] + ey * half]], p.r * 1.7 * K.P.weight, p.col, { attrs: { m: K.main() } });
        if (K.P.glow > 0) K.glows.push({ x: q[0], y: q[1], r: p.r * 0.9, col: p.col });
      } else K.shape(shapeFor(K.P, g, i, 'dot'), q[0], q[1], p.r, a, p.col, { attrs: { m: K.main(), det: p.det } });
      i++;
    }
  },
  // drooping hand-drawn trails, a teardrop hanging at each end
  willow(K, all, T, o, c, s) {
    let i = 0, last = null;
    for (const p of all) {
      if (p.k === 'cubic') {
        const pts = cubicPts(...p.pts.map(T), 12);
        if (p.op) { K.line(pts, p.w, p.col, true, { attrs: { op: 0.4 } }); continue; }
        K.line(pts, p.w, p.col, share(i, K.P.stitch), { taper: [1.15, 0.55], attrs: { m: K.main() } });
        last = pts; i++; continue;
      }
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      if (p.det) { K.shape(shapeFor(K.P, 1, i, 'dot'), q[0], q[1], p.r * 0.9, 0, p.col, { attrs: { det: true }, glow: false }); continue; }
      // the tip hangs along the trail's own last direction (its point up the trail)
      const a = last ? Math.atan2(last[last.length - 1][1] - last[last.length - 2][1], last[last.length - 1][0] - last[last.length - 2][0]) : Math.PI / 2;
      K.shape(shapeFor(K.P, 0, i, 'teardrop'), q[0], q[1], p.r * 1.1, a, p.col);
    }
  },
  // a few thick brushed fronds, a club at each tip
  palm(K, all, T, o, c, s) {
    for (const p of all) {
      if (p.k === 'ribbon') { const pts = p.pts.map(T); K.brush(pts, 1, p.col, { ws: p.hw, attrs: { m: K.main() } }); continue; }
      if (p.k === 'line') { K.line([T(p.a), T(p.b)], p.w, p.col, false, { attrs: { det: true } }); continue; }
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      K.shape(shapeFor(K.P, 0, 0, 'dot'), q[0], q[1], p.r, 0, p.col);
    }
  },
  // arms that split, each tine ending in a small star
  crossette(K, all, T, o, c, s) {
    let i = 0;
    const z = T([0, 0]);
    for (const p of all) {
      if (p.k === 'line') {
        if (p.det) { K.line([T(p.a), T(p.b)], p.w, p.col, true, { attrs: { det: true } }); continue; }
        if (Math.hypot(p.a[0], p.a[1]) < 0.1) { K.line([T(p.a), T(p.b)], p.w, p.col, share(i, K.P.stitch), { attrs: { m: K.main() } }); i++; }
        else K.line([T(p.a), T(p.b)], p.w, p.col, false);
        continue;
      }
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      const a = Math.atan2(q[1] - z[1], q[0] - z[0]);
      K.shape(p.det ? 'dot' : shapeFor(K.P, 0, i, 'star'), q[0], q[1], p.r * (p.det ? 1 : 1.1), a, p.col, p.det ? { attrs: { det: true }, glow: false } : {});
    }
  },
  // fat teardrop petals round a core of shapes
  dahlia(K, all, T, o, c, s) {
    const lines = all.filter((p) => p.k === 'line' && !p.det), Wmax = Math.max(...lines.map((p) => p.w));
    const z = T([0, 0]);
    let i = 0;
    for (const p of all) {
      if (p.k === 'line' && !p.det && p.w === Wmax) {
        // the petal a teardrop from the line's inner end (its point) to its outer
        // end (the round head), the line's own width across
        const a = T(p.a), b = T(p.b), L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        const hr = (p.w / 2) * 1.2, W = K.P.wobble, n1 = noise(K.rnd);
        const pts = dropPts(L - hr, 0, hr, L - hr).map(([u, v], k) => { const g = 1 + 0.08 * W * n1(k / 12); return [a[0] + (u * ux - v * uy) * (k ? g : 1), a[1] + (u * uy + v * ux) * (k ? g : 1)]; });
        K.poly(pts, p.col, { m: K.main() });
        i++; continue;
      }
      if (p.k === 'line') { K.line([T(p.a), T(p.b)], p.w, p.col, true, { attrs: { det: true } }); continue; }
      const q = T(p.p);
      if (near0(p.p)) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      K.shape(shapeFor(K.P, 1, i++, 'dot'), q[0], q[1], p.r * 1.1, Math.atan2(q[1] - z[1], q[0] - z[0]), p.col);
    }
  },
  // a confetti scatter: every spark a slip of paper, every round star a dot
  glitter(K, all, T, o, c, s) {
    let i = 0;
    const multi = s.colors && s.colors.length > 2 ? s.colors : null;   // a multicolour suit: every colour
    for (let j = 0; j < all.length; j++) {
      const p = all[j];
      if (p.k === 'line') {
        const nx = all[j + 1];
        const mid = [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2], q = T(mid), z = Math.hypot(T(p.b)[0] - T(p.a)[0], T(p.b)[1] - T(p.a)[1]) / 2;
        K.shape(shapeFor(K.P, 0, i, 'confetti'), q[0], q[1], Math.max(p.w * 0.4, z * 0.26), K.rnd() * Math.PI, multi ? pick(multi, i) : p.col, { attrs: { m: K.main(), det: p.det } });
        if (nx && nx.k === 'line') j++;
        i++; continue;
      }
      const q = T(p.p);
      if (near0(p.p) && j === all.length - 1 && s.core) { K.shape('dot', q[0], q[1], p.r, 0, p.col); continue; }
      K.shape(shapeFor(K.P, 1, i, 'dot'), q[0], q[1], p.r, 0, multi ? pick(multi, i) : p.col, { attrs: { m: K.main(), det: p.det } });
      i++;
    }
  },
  // hand-cut petals, stitched veins, lollipop stamens
  blossom(K, all, T, o, c, s) {
    for (const p of all) {
      if (p.k === 'petal') {
        const g = p.segs, pts = [T(g[0]), ...cubicPts(T(g[0]), ...g[1].map(T), 8).slice(1), T(g[2]), T(g[3]), ...cubicPts(T(g[3]), ...g[4].map(T), 8).slice(1)];
        const W = K.P.wobble, sz = Math.hypot(pts[0][0] - pts[9][0], pts[0][1] - pts[9][1]) || 1;
        K.poly(pts.map(([x, y]) => [x + (K.rnd() - 0.5) * 0.025 * W * sz, y + (K.rnd() - 0.5) * 0.025 * W * sz]), p.col, { m: K.main() });
        continue;
      }
      if (p.k === 'line') { K.line([T(p.a), T(p.b)], p.w, p.col, !!p.det, { attrs: { det: p.det } }); continue; }
      const q = T(p.p);
      K.shape(near0(p.p) ? 'dot' : shapeFor(K.P, 1, 0, 'dot'), q[0], q[1], p.r, 0, p.col);
    }
  },
};

function renderType(spec, box) {
  const { cx, cy, r } = box, P = spec.paper;
  const R = r * Math.max(0.05, Math.min(1, spec.size)), w = Math.max(0.26, r * 0.022);
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const { all, k } = typeLayout(spec, R, w, rng(spec.seed), colors);
  const rot = ((+spec.rotation || 0) * Math.PI) / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const T = (q) => [cx + (q[0] * cs - q[1] * sn) * k, cy + (q[0] * sn + q[1] * cs) * k];
  const K = Kit(P, spec.seed);
  const s = { ...TYPES[spec.motif].defaults, ...spec };
  DRESS[spec.motif](K, all.filter((p) => !p.ghost), T, colors[0], pick(colors, 1), s);
  fitTo(K, cx, cy, R);
  return disc(spec, cx, cy, R * P.discSize) + emitGlows(K) + `<g class="hb-firework" data-motif="${spec.motif}" data-style="paper">${emitItems(K.items)}</g>`;
}

// ---------------------------------------------------------------- the catalogue
// The four counted motifs have Style 2 drawings of their own (their count is
// exact); every other catalogue and phase-1 burst is its Style 1 drawing dressed.
const CATALOGUE2 = {
  // a spoke wheel: the spokes, and rungs of short strokes between them
  spoke(K, s, cx, cy, R, w, rand, core = 0.05) {
    const n = s.count, ph = rand() * TAU, col = s.colors[0], c2 = pick(s.colors, 1), sw = Math.max(0.18, w * 0.6);
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * TAU, L = R * (0.94 + rand() * 0.06);
      const e = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
      K.line([[cx + Math.cos(a) * R * core, cy + Math.sin(a) * R * core], e], sw, col, share(i, K.P.stitch), { attrs: { m: K.main() } });
      K.shape(shapeFor(K.P, 0, i, 'dot'), e[0], e[1], Math.max(0.14, w * 0.75), a, col);
    }
    for (const rr of [0.48, 0.66, 0.82]) {
      const chord = 2 * R * rr * Math.sin(Math.PI / n);
      if (chord < sw * 4 || rr * R < R * core * 2) continue;
      for (let i = 0; i < n; i++) {
        const a = ph + ((i + 0.5) / n) * TAU, m = [cx + Math.cos(a) * R * rr, cy + Math.sin(a) * R * rr], h = chord * 0.3, tx = -Math.sin(a), ty = Math.cos(a);
        K.line([[m[0] - tx * h, m[1] - ty * h], [m[0] + tx * h, m[1] + ty * h]], sw * 0.75, c2, false, { attrs: { det: true } });
      }
    }
  },
  spokecore(K, s, cx, cy, R, w, rand) {
    CATALOGUE2.spoke(K, s, cx, cy, R, w, rand, 0.36);
    const m = Math.round(6 + s.count / 8), rr = R * 0.3, h = Math.min(rr * Math.PI / m * 0.62, rr * 0.11) * 1.2, c2 = pick(s.colors, 1), ph = rand() * TAU;
    for (let i = 0; i < m; i++) { const a = ph + (i / m) * TAU; K.shape(shapeFor(K.P, 1, i, 'teardrop'), cx + Math.cos(a) * (rr - h), cy + Math.sin(a) * (rr - h), h, a, c2); }
  },
};
const FIELDS2 = {
  // rosettes: little flowers of lollipop petals, each on a disc of its own
  rosettes(K, rect, n, colors, w, rand) {
    const { pts, rho } = scatter(rect, n, rand);
    pts.forEach((p, i) => {
      const col = pick(colors, i), m = K.main(), sw = Math.max(0.14, w * 0.5);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, ux = Math.cos(a), uy = Math.sin(a);
        K.line([[p.x + ux * rho * 0.28, p.y + uy * rho * 0.28], [p.x + ux * rho * 0.56, p.y + uy * rho * 0.56]], sw, col, false, { attrs: { m } });
        K.shape(shapeFor(K.P, 0, k, 'dot'), p.x + ux * rho * 0.7, p.y + uy * rho * 0.7, rho * 0.11, a, col, { attrs: { m } });
      }
      K.circle(p.x, p.y, rho * 0.14, col, { m });
      K.discs.push({ x: p.x, y: p.y, r: rho * 0.98, col });
    });
  },
  // a field of five-point stars
  starfield(K, rect, n, colors, w, rand) {
    const { pts, rho } = scatter(rect, n, rand, 0.32);
    pts.forEach((p, i) => {
      const s = rho * (0.46 + rand() * 0.1);
      K.shape(shapeFor(K.P, 0, i, 'star'), p.x, p.y, s / 1.35, -Math.PI / 2 + (rand() - 0.5) * 0.5, pick(colors, i), { attrs: { m: K.main() } });
    });
  },
};

// the Style 1 markup a burst draws, read back as items (absolute M/L/Q/C/Z, circles
// and lines, by the renderers' contract)
function parseStyle1(svg) {
  const out = [];
  const attr = (s, k) => { const m = new RegExp(`${k}="([^"]+)"`).exec(s); return m ? m[1] : null; };
  for (const m of svg.matchAll(/<(circle|line|path)\b([^>]*)\/>/g)) {
    const a = m[2], op = attr(a, 'stroke-opacity') || attr(a, 'fill-opacity');
    if (m[1] === 'circle') { out.push({ t: 'c', x: +attr(a, 'cx'), y: +attr(a, 'cy'), r: +attr(a, 'r'), col: attr(a, 'fill'), op: op ? +op : undefined }); continue; }
    if (m[1] === 'line') { out.push({ t: 's', pts: [[+attr(a, 'x1'), +attr(a, 'y1')], [+attr(a, 'x2'), +attr(a, 'y2')]], w: +attr(a, 'stroke-width'), col: attr(a, 'stroke'), op: op ? +op : undefined, dash: false }); continue; }
    const d = attr(a, 'd'), filled = attr(a, 'fill') && attr(a, 'fill') !== 'none';
    const subs = []; let cur = null, start = null, pts = [];
    for (const sg of d.match(/[MLQCZ][^MLQCZ]*/g)) {
      const c = sg[0], n = (sg.slice(1).match(/-?[\d.]+/g) || []).map(Number);
      if (c === 'M') { if (pts.length) subs.push(pts); pts = []; cur = [n[0], n[1]]; start = cur; pts.push(cur); for (let i = 2; i < n.length; i += 2) { cur = [n[i], n[i + 1]]; pts.push(cur); } }
      else if (c === 'L') { for (let i = 0; i < n.length; i += 2) { cur = [n[i], n[i + 1]]; pts.push(cur); } }
      else if (c === 'Z') { if (start) pts.push(start); cur = start; }
      else {
        const per = c === 'Q' ? 4 : 6;
        for (let i = 0; i + per <= n.length; i += per) {
          const ctrl = [cur]; for (let j = 0; j < per; j += 2) ctrl.push([n[i + j], n[i + j + 1]]);
          for (let k = 1; k <= 8; k++) { const t = k / 8; let q = ctrl.map((p) => p.slice()); while (q.length > 1) q = q.slice(1).map((p, ii) => [q[ii][0] + (p[0] - q[ii][0]) * t, q[ii][1] + (p[1] - q[ii][1]) * t]); pts.push(q[0]); }
          cur = ctrl[ctrl.length - 1];
        }
      }
    }
    if (pts.length) subs.push(pts);
    for (const sp of subs) out.push(filled ? { t: 'p', pts: sp, col: attr(a, 'fill'), op: op ? +op : undefined } : { t: 's', pts: sp, w: +attr(a, 'stroke-width'), col: attr(a, 'stroke'), op: op ? +op : undefined, dash: /stroke-dasharray/.test(a) });
  }
  return out;
}
function renderCatalogue(spec, box) {
  const { cx, cy, r } = box, P = spec.paper, m = spec.motif;
  const R = r * Math.max(0.05, Math.min(1, spec.size)), w = Math.max(0.26, r * 0.022);
  const colors = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'];
  const K = Kit(P, spec.seed);
  K.discs = [];
  const s = { ...spec, colors };
  if (CATALOGUE_COUNT[m] && spec.rank) s.count = catalogueCountAt(m, spec.count, spec.rank);
  const head = (body) => `<g class="hb-firework" data-motif="${m}" data-style="paper">${body}</g>`;
  if (FIELDS2[m]) {
    const sz = Math.max(0.05, Math.min(1, spec.size)), rect = fieldRect(box, R, sz);
    FIELDS2[m](K, rect, s.count, colors, w, rng(spec.seed));
    const discs = P.disc && P.discOpacity > 0 ? K.discs.map((d) => disc({ ...spec, outerColor: spec.outerColor || d.col }, d.x, d.y, d.r * P.discSize).replace(/^<g class="hb-disc">|<\/g>$/g, '')).join('') : '';
    return (discs ? `<g class="hb-disc">${discs}</g>` : '') + emitGlows(K) + head(emitItems(K.items));
  }
  if (CATALOGUE2[m]) CATALOGUE2[m](K, s, cx, cy, R - w, w, rng(spec.seed));
  else {
    // dressed: dots become shapes, lines hand-made strokes, filled shapes keep
    // their outline with a hand-cut edge; fitted to the Style 1 drawing's own reach
    const src = parseStyle1(style1Body({ ...spec, rotation: 0 }, box));
    const reach0 = Math.max(0, ...src.map((it) => reachOf(it, cx, cy)));
    let i = 0;
    for (const it of src) {
      if (it.t === 'c') {
        const a = Math.atan2(it.y - cy, it.x - cx), centre = Math.hypot(it.x - cx, it.y - cy) < 1e-6;
        K.shape(centre ? 'dot' : shapeFor(P, it.r > w * 1.5 ? 1 : 0, i++, 'dot'), it.x, it.y, it.r, a, it.col, it.op !== undefined ? { attrs: { op: it.op }, glow: false } : {});
      } else if (it.t === 's') K.line(it.pts, it.w, it.col, it.dash || share(i++, P.stitch), { attrs: it.op !== undefined ? { op: it.op } : {} });
      else K.poly(it.pts.map(([x, y]) => [x + (K.rnd() - 0.5) * 0.08 * P.wobble, y + (K.rnd() - 0.5) * 0.08 * P.wobble]), it.col, it.op !== undefined ? { op: it.op } : {});
    }
    fitTo(K, cx, cy, Math.max(R, reach0));
    rotate(K, cx, cy, spec.rotation);
    return disc(spec, cx, cy, R * P.discSize) + emitGlows(K) + head(emitItems(K.items));
  }
  fitTo(K, cx, cy, R);
  rotate(K, cx, cy, spec.rotation);
  return disc(spec, cx, cy, R * P.discSize) + emitGlows(K) + head(emitItems(K.items));
}

export function renderPaper(spec, box) {
  spec = withColours(spec);
  if (!spec.paper) return '';
  if (TYPES[spec.motif]) return renderType(spec, box);
  return renderCatalogue({ ...spec, motif: MOTIFS[spec.motif] ? spec.motif : 'classic' }, box);
}
export { FIELD_MOTIFS };

// The spec's Style 2 block: the suit's resolved settings, its colours with them.
// The second tier (Scale, ranks 4-5) in Style 2: a rosette field in its rect.
export function renderPaperTier(spec, rect) {
  const P = spec.paper, colors0 = spec.colors && spec.colors.length ? spec.colors : ['#FFFFFF'], colors = [...colors0.slice(1), colors0[0]];
  const K = Kit(P, (spec.seed ^ 0x9e3779b9) >>> 0);
  K.discs = [];
  FIELDS2.rosettes(K, rect, spec.tier.count, colors, Math.max(0.26, Math.min(rect.w, rect.h) * 0.02), rng((spec.seed ^ 0x9e3779b9) >>> 0));
  const discs = P.disc && P.discOpacity > 0 ? K.discs.map((d) => disc({ ...spec, outerColor: d.col }, d.x, d.y, d.r * P.discSize).replace(/^<g class="hb-disc">|<\/g>$/g, '')).join('') : '';
  for (const it of K.items) delete it.m;
  return `<g class="hb-tier" data-tier="${spec.tier.motif}" data-style="paper">${discs}${emitGlows(K)}${emitItems(K.items)}</g>`;
}

// Every disc and glow of a card drawn ahead of every firework's marks, so discs
// overlap discs and never cover another firework's stars (layout.js).
export function discsFirst(parts) {
  const discs = [], glows = [], marks = [];
  for (const s of parts) {
    let rest = s;
    rest = rest.replace(/<g class="hb-disc">[\s\S]*?<\/g>/g, (g) => { discs.push(g); return ''; });
    rest = rest.replace(/<g class="hb-glow2">[\s\S]*?<\/g>/g, (g) => { glows.push(g); return ''; });
    marks.push(rest);
  }
  return discs.join('') + glows.join('') + marks.join('');
}

// ---- the paper ground (background, version 8): a faint grain over the art panel
export function paperGrain(amount, A, seed) {
  if (!(amount > 0)) return '';
  const n = Math.min(3000, Math.round(amount * A.w * A.h * 0.5)), rnd = rng((seed ^ 0x7f4a7c15) >>> 0), light = [], dark = [];
  for (let i = 0; i < n; i++) {
    const x = A.x + rnd() * A.w, y = A.y + rnd() * A.h, z = 0.1 + rnd() * 0.16;
    (i % 2 ? dark : light).push(`M${f(x)} ${f(y - z)} L${f(x + z)} ${f(y)} L${f(x)} ${f(y + z)} L${f(x - z)} ${f(y)} Z`);
  }
  return `<g class="hb-grain"><path d="${light.join(' ')}" fill="#FFFFFF" fill-opacity="${f(0.05 + 0.07 * amount)}"/><path d="${dark.join(' ')}" fill="#000000" fill-opacity="${f(0.12 + 0.12 * amount)}"/></g>`;
}
export const isHex = (v) => typeof v === 'string' && HEXRE.test(v);
