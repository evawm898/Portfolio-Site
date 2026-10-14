// plot-shapes.js — background shapes, and the knockout that makes them work.
//
// WHAT A SHAPE IS HERE. A graphic element composed against the PAGE, so it
// lives in FRAME SPACE and never in the world: a panel that orbited with the
// camera would stop being part of the layout the moment anyone re-angled a
// bloom inside a settled composition. Every coordinate a shape stores is a
// fraction of the frame's own box — the box `frameRect()` owns, or the whole
// viewport when the frame is off, which is the same box the exports crop to —
// so a resize, a ratio change or a 4x raster all carry the shapes with them and
// a camera move carries them nowhere.
//
// TWO KINDS, AND THEY ARE THE FRAME'S TWO. Rectangle and ellipse, imported from
// plot-frame.js rather than restated: two lists of boundary types is one of
// them being wrong, and "a square is a rectangle at 1:1" is already the frame's
// own reading.
//
// KNOCKOUT IS NOT POLARITY, AND THE TWO STACK. Polarity is the page-wide render
// mode (white additive ink on black, or black multiply ink on white). Knockout
// is local: where the drawing crosses a shape of the OPPOSITE tone, it
// reverses. The one rule, which holds in either polarity:
//
//     A panel is the opposite tone to the ground, and the drawing reverses
//     inside it.
//
// THE REVERSAL IS THE OTHER POLARITY, EXACTLY. Inside an opposite-tone panel
// the picture is drawn in the other polarity's regime — its ground is the
// panel's colour, its blend, its ink transfer at the SAME level and its fog —
// so nothing about either tone is a constant here. `toneRegime()` is the one
// place a tone becomes a regime and everything else (the panel's fill, the ink
// inside it, the fog the far lines fade into, the SVG's two strokes) reads it.
// A hardcoded black rectangle is the failure this is built against: in screen
// polarity it is black on a black ground, a panel nobody can see.
//
// A SHAPE ONLY PAINTS ITS MARKS. Solid paints the whole outline; stripes paint
// bands, halftone paints dots, outline paints a ring. Wherever a shape puts no
// mark, whatever is beneath it shows — the ground, or a lower shape — so
// shapes LAYER by z-order (list order, last on top) and a ground-tone shape
// over an opposite one cuts a hole in it. The knockout follows the painted
// tone pixel for pixel, which is why it cannot be a per-shape toggle or a
// per-line colour choice: a stroke crossing a striped panel changes ink at
// every stripe.
//
// THREE FINDINGS FROM THE DESIGN STUDY, EACH OF WHICH COST A WRONG RENDER, and
// what in the construction answers each:
//   1. THE DRAWING IS ALWAYS IN FRONT. A shape boundary changes ink colour and
//      nothing else. The shapes are a pass of their own drawn BEFORE the ink —
//      not a depth value, an ORDER — so no depth arithmetic can put a petal
//      behind a panel.
//   2. AN INVERSE CLIP, NOT DRAW-AND-COVER. The whole drawing is drawn twice:
//      once in the ground's ink clipped to everything the shapes did NOT paint
//      opposite, once in the panel's ink clipped to what they did. Drawing the
//      ground ink everywhere and covering it inside the panel leaves the ground
//      ink wherever nothing covered it — the stems especially. On the page the
//      clip is the stencil; in the SVG it is a pair of complementary masks.
//   3. NO FIXED Z FOR A SHAPE. The study's first build put the drawing's
//      petals across a z-range proportional to the petal count and the shapes
//      at fixed values inside it, so each bloom split at an arbitrary petal.
//      Here the shapes and the drawing never share a depth range at all: the
//      shape pass draws with depth testing off into its own scene, in the
//      picture plane, before the drawing exists in the frame. Z-order AMONG
//      shapes is list order and nothing else.
//
// THIS FILE IS PURE — no DOM, no three — so the gate drives every rule here in
// Node over shapes whose answer can be written down. On the real drawing a
// wrong stripe phase, a hole cut in the wrong place or a halftone ramp running
// the wrong way all still produce a perfectly plausible picture.

import { FRAME_SHAPES } from './plot-frame.js';
import { POLARITY, POLARITIES, polarityOf } from './plot-polarity.js';

export const SHAPE_KINDS = FRAME_SHAPES;
export const SHAPE_TONES = ['opposite', 'ground'];
export const SHAPE_FILLS = ['solid', 'stripes', 'halftone', 'outline'];

/* How many shapes a composition may hold. Not a rendering limit — eight solid
   panels cost nothing — but a halftone is thousands of dots, and the cap is
   what keeps the per-input rebuild of the shape pass inside a frame. */
export const MAX_SHAPES = 8;

/* THE MARK BUDGET, told rather than silently honoured. A halftone at the finest
   spacing across a full-bleed panel is ~15,000 dots; beyond this many polygons
   the shape is drawn with what fits and the panel says how many were dropped. */
export const MAX_MARKS_PER_SHAPE = 40000;

/* A NEW SHAPE'S VALUES. Every one is a control's own value, in the control's own
   units, so the file can store them verbatim (plot-file.js's rule 2):
     x, y        the centre, % of the frame box's width and height from its
                 top-left corner;
     w, h        the size, % of the frame box's width and height;
     rotationDeg about the centre, clockwise on screen;
     tone        'opposite' (the knockout panel) or 'ground';
     fill        solid / stripes / halftone / outline;
     angleDeg    the stripes' own direction, the halftone's ramp direction;
     spacing     the pattern's period, % of the frame box's SHORTER side (the
                 frame margin's own convention, so one number is the same
                 visual gap on a wide frame and a tall one);
     weight      % — a stripe's share of its period; a dot's diameter at the
                 ramp's dense end as a share of the dot pitch; an outline's
                 width as a share of the spacing.
   THE DEFAULT IS A BAND ACROSS THE LOWER HALF, which is the composition a first
   shape is most often for and puts its top edge across the middle of the frame,
   where a bloom is. */
export const SHAPE_DEFAULTS = Object.freeze({
  kind: 'rect', x: 50, y: 75, w: 100, h: 50, rotationDeg: 0,
  tone: 'opposite', fill: 'solid', angleDeg: 0, spacing: 3, weight: 50,
});

export const newShape = (o = {}) => ({ ...SHAPE_DEFAULTS, ...o });

/* ---- tone -> regime ------------------------------------------------------ */

/* THE OTHER POLARITY. Derived from the list rather than written as a pair, so a
   third polarity would make this a question (which one is "opposite"?) instead
   of a silent wrong answer. */
export function oppositeOf(polarity) {
  const id = polarityOf(polarity).id;
  const others = POLARITIES.filter(p => p !== id);
  if (others.length !== 1) throw new Error(`no single opposite of ${id} among ${POLARITIES.join(', ')}`);
  return others[0];
}

/* THE ONE PLACE A TONE BECOMES A REGIME. A ground-tone shape is drawn in the
   page's own polarity; an opposite-tone one in the other. */
export const toneRegime = (polarity, tone) =>
  (tone === 'opposite' ? oppositeOf(polarity) : polarityOf(polarity).id);

/* A SHAPE'S FILL COLOUR IS ITS REGIME'S GROUND, and nothing else: the panel is
   the paper the reversed drawing sits on. */
export const toneColor = (polarity, tone) => POLARITY[toneRegime(polarity, tone)].ground;

/* What the page's stencil holds for a tone, and so which ink pass draws there.
   0 is the cleared value, so wherever no shape paints, the ground's pass draws —
   which is what keeps a page with no shapes the page it was. */
export const TONE_STENCIL = Object.freeze({ ground: 0, opposite: 1 });

/* THE TWO INK PASSES, IN THE ORDER THEY ARE DRAWN — the panels' first, the
   ground's last. They cover complementary pixels so the order changes no ink;
   it is chosen so the page's handles, drawn by the ground's pass, sit over
   both. Each names the stencil value it is clipped to and the regime it draws
   in, so the page and the SVG walk one list and neither can pair a clip with
   the other pass's ink. */
export function knockoutPasses(polarity) {
  return SHAPE_TONES.map(tone => ({
    tone, stencil: TONE_STENCIL[tone], regime: toneRegime(polarity, tone),
  }));
}

/* ---- frame space -> pixels ----------------------------------------------- */

/* WHERE A SHAPE IS, in the same CSS-pixel space (y down) `frameRect` returns.
   `space` is that box — {x, y, width, height}. */
export function shapePlacement(shape, space) {
  const s = { ...SHAPE_DEFAULTS, ...shape };
  const short = Math.max(1e-9, Math.min(space.width, space.height));
  return {
    cx: space.x + (s.x / 100) * space.width,
    cy: space.y + (s.y / 100) * space.height,
    hw: Math.max(0, (s.w / 100) * space.width / 2),
    hh: Math.max(0, (s.h / 100) * space.height / 2),
    rot: (s.rotationDeg || 0) * Math.PI / 180,
    pitch: Math.max(1e-6, (s.spacing / 100) * short),
    angle: (s.angleDeg || 0) * Math.PI / 180,
    weight: Math.max(0, s.weight / 100),
    short,
  };
}

const ELLIPSE_SEGMENTS = 128;

/* THE OUTLINE, AS A CONVEX POLYGON, counter-clockwise in screen space (y down).
   Convex by construction — both kinds are — which is what lets every fill be
   built by clipping convex pieces against it exactly. */
export function shapeOutline(shape, space) {
  const P = shapePlacement(shape, space);
  const c = Math.cos(P.rot), s = Math.sin(P.rot);
  const out = [];
  const put = (lx, ly) => out.push(P.cx + lx * c - ly * s, P.cy + lx * s + ly * c);
  if (shape.kind === 'ellipse') {
    for (let i = 0; i < ELLIPSE_SEGMENTS; i++) {
      const t = (i / ELLIPSE_SEGMENTS) * Math.PI * 2;
      put(P.hw * Math.cos(t), P.hh * Math.sin(t));
    }
  } else {
    put(-P.hw, -P.hh); put(P.hw, -P.hh); put(P.hw, P.hh); put(-P.hw, P.hh);
  }
  return out;
}

/* ---- convex polygon arithmetic ------------------------------------------ */

export function polygonArea(p) {
  let a = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  return a / 2;
}

/* SUTHERLAND–HODGMAN, a convex subject against a convex clip. Exact for convex
   pieces, which is every piece this file makes. The clip's own winding is read
   off its signed area, so a caller cannot hand it a clockwise polygon and get
   the complement back. */
export function clipConvex(subject, clip) {
  const sign = polygonArea(clip) >= 0 ? 1 : -1;
  let poly = subject;
  const m = clip.length / 2;
  for (let e = 0; e < m && poly.length >= 6; e++) {
    const ax = clip[e * 2], ay = clip[e * 2 + 1];
    const bx = clip[((e + 1) % m) * 2], by = clip[((e + 1) % m) * 2 + 1];
    const side = (x, y) => sign * ((bx - ax) * (y - ay) - (by - ay) * (x - ax));
    const next = [];
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const px = poly[i * 2], py = poly[i * 2 + 1];
      const qx = poly[((i + 1) % n) * 2], qy = poly[((i + 1) % n) * 2 + 1];
      const sp = side(px, py), sq = side(qx, qy);
      if (sp >= 0) next.push(px, py);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        next.push(px + (qx - px) * t, py + (qy - py) * t);
      }
    }
    poly = next;
  }
  return poly.length >= 6 && Math.abs(polygonArea(poly)) > 1e-9 ? poly : null;
}

export function pointInConvex(x, y, p) {
  const n = p.length / 2;
  let pos = false, neg = false;
  for (let i = 0; i < n; i++) {
    const ax = p[i * 2], ay = p[i * 2 + 1];
    const bx = p[((i + 1) % n) * 2], by = p[((i + 1) % n) * 2 + 1];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c > 0) pos = true; else if (c < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

/* ---- the four fills ------------------------------------------------------ */

// The outline's extent along a unit direction, for the patterns that are laid
// out against it.
function extentAlong(poly, dx, dy) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    const v = poly[i] * dx + poly[i + 1] * dy;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { lo, hi };
}

/* STRIPES. Bands of the asked share of the period, running ALONG the stripe
   angle, laid out across it. PHASED ON THE SHAPE'S OWN CENTRE — a band is
   centred on the centre — so moving the shape moves its stripes with it rather
   than sliding them past a fixed screen lattice. */
function stripeMarks(outline, P, budget) {
  const dx = Math.cos(P.angle), dy = Math.sin(P.angle);   // along the stripe
  const nx = -dy, ny = dx;                                 // across it
  const w = Math.min(1, P.weight) * P.pitch;
  if (!(w > 0)) return { marks: [], dropped: 0 };
  const across = extentAlong(outline, nx, ny);
  const along = extentAlong(outline, dx, dy);
  const c0 = P.cx * nx + P.cy * ny;
  const kLo = Math.floor((across.lo - c0) / P.pitch) - 1;
  const kHi = Math.ceil((across.hi - c0) / P.pitch) + 1;
  const marks = [];
  let dropped = 0;
  const a0 = along.lo - 1, a1 = along.hi + 1;
  for (let k = kLo; k <= kHi; k++) {
    const s0 = c0 + k * P.pitch - w / 2, s1 = s0 + w;
    // A band is a rectangle: along [a0, a1] x across [s0, s1].
    const band = [
      a0 * dx + s0 * nx, a0 * dy + s0 * ny,
      a1 * dx + s0 * nx, a1 * dy + s0 * ny,
      a1 * dx + s1 * nx, a1 * dy + s1 * ny,
      a0 * dx + s1 * nx, a0 * dy + s1 * ny,
    ];
    const piece = clipConvex(band, outline);
    if (!piece) continue;
    if (marks.length >= budget) { dropped++; continue; }
    marks.push(piece);
  }
  return { marks, dropped };
}

/* THE HALFTONE RAMP, as a fraction 0..1 across the shape along the ramp angle —
   0 at the light end, 1 at the dense end. Exported because the gate drives the
   ramp's direction on its own: a ramp running the wrong way round is a
   perfectly good halftone. */
export function halftoneRamp(outline, angle, x, y) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const e = extentAlong(outline, dx, dy);
  const span = e.hi - e.lo;
  return span > 0 ? Math.min(1, Math.max(0, (x * dx + y * dy - e.lo) / span)) : 1;
}

/* HALFTONE. A square dot lattice rotated to the ramp angle and phased on the
   shape's centre, each dot's diameter `weight x pitch x ramp`. A DENSITY
   GRADIENT OVER A REGION — the idea /print's tonal fill is built on, re-derived
   here because /plot shares no code with /print. Dots under a third of a pixel
   across are not drawn at all; a dot crossing the outline is clipped to it, so
   the edge of a halftone panel is the panel's edge and not a ragged row. */
function halftoneMarks(outline, P, budget) {
  const dx = Math.cos(P.angle), dy = Math.sin(P.angle);
  const nx = -dy, ny = dx;
  const along = extentAlong(outline, dx, dy);
  const across = extentAlong(outline, nx, ny);
  const a0 = P.cx * dx + P.cy * dy, c0 = P.cx * nx + P.cy * ny;
  const span = along.hi - along.lo;
  const marks = [];
  let dropped = 0;
  const iLo = Math.floor((along.lo - a0) / P.pitch) - 1, iHi = Math.ceil((along.hi - a0) / P.pitch) + 1;
  const jLo = Math.floor((across.lo - c0) / P.pitch) - 1, jHi = Math.ceil((across.hi - c0) / P.pitch) + 1;
  for (let i = iLo; i <= iHi; i++) {
    const a = a0 + i * P.pitch;
    const t = span > 0 ? Math.min(1, Math.max(0, (a - along.lo) / span)) : 1;
    const r = 0.5 * P.weight * P.pitch * t;
    if (r < 1 / 6) continue;
    const segs = Math.max(10, Math.min(32, Math.round(r * 1.6)));
    for (let j = jLo; j <= jHi; j++) {
      const c = c0 + j * P.pitch;
      const ox = a * dx + c * nx, oy = a * dy + c * ny;
      const dot = [];
      for (let k = 0; k < segs; k++) {
        const th = (k / segs) * Math.PI * 2;
        dot.push(ox + r * Math.cos(th), oy + r * Math.sin(th));
      }
      const piece = clipConvex(dot, outline);
      if (!piece) continue;
      if (marks.length >= budget) { dropped++; continue; }
      marks.push(piece);
    }
  }
  return { marks, dropped };
}

/* OUTLINE. A ring of the asked width INSIDE the boundary, so the shape's outer
   edge is where the shape says it is whatever the weight. Built as convex quads
   between the outline and its inward parallel, sampled on the same vertices.
   THE WIDTH IS CLAMPED where the inward parallel would turn itself inside out —
   half the shorter side on a rectangle, the tightest radius of curvature on an
   ellipse — and the clamp is reported, never silent. */
function outlineMarks(outline, P, shape) {
  const want = P.weight * P.pitch;
  let w = want;
  let cap;
  if (shape.kind === 'ellipse') {
    const a = Math.max(P.hw, P.hh), b = Math.min(P.hw, P.hh);
    cap = a > 0 ? 0.95 * b * b / a : 0;
  } else cap = 0.5 * Math.min(P.hw, P.hh) * 0.999;
  const clamped = w > cap;
  if (clamped) w = cap;
  if (!(w > 0)) return { marks: [], dropped: 0, clamped, widthPx: 0, askedPx: want };
  const n = outline.length / 2;
  const inner = [];
  if (shape.kind === 'ellipse') {
    // The inward normal of the ellipse at each sampled point, from the
    // implicit form — the exact parallel curve, sampled.
    const c = Math.cos(P.rot), s = Math.sin(P.rot);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      const lx = P.hw * Math.cos(t), ly = P.hh * Math.sin(t);
      let gx = lx / (P.hw * P.hw || 1), gy = ly / (P.hh * P.hh || 1);
      const L = Math.hypot(gx, gy) || 1; gx /= L; gy /= L;
      const ix = lx - gx * w, iy = ly - gy * w;
      inner.push(P.cx + ix * c - iy * s, P.cy + ix * s + iy * c);
    }
  } else {
    const c = Math.cos(P.rot), s = Math.sin(P.rot);
    const hw = P.hw - w, hh = P.hh - w;
    for (const [lx, ly] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
      inner.push(P.cx + lx * c - ly * s, P.cy + lx * s + ly * c);
    }
  }
  const marks = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    marks.push([outline[i * 2], outline[i * 2 + 1], outline[j * 2], outline[j * 2 + 1],
                inner[j * 2], inner[j * 2 + 1], inner[i * 2], inner[i * 2 + 1]]);
  }
  return { marks, dropped: 0, clamped, widthPx: w, askedPx: want };
}

/* EVERYTHING ONE SHAPE PAINTS, as a list of convex polygons (flat [x,y,…]) in
   CSS pixels, with what the fill had to give up. */
export function shapeMarks(shape, space, budget = MAX_MARKS_PER_SHAPE) {
  const s = { ...SHAPE_DEFAULTS, ...shape };
  const outline = shapeOutline(s, space);
  const P = shapePlacement(s, space);
  const empty = { outline, marks: [], dropped: 0, clamped: false };
  if (!(P.hw > 0) || !(P.hh > 0)) return empty;
  switch (s.fill) {
    case 'stripes': return { outline, ...stripeMarks(outline, P, budget), clamped: false };
    case 'halftone': return { outline, ...halftoneMarks(outline, P, budget), clamped: false };
    case 'outline': return { outline, ...outlineMarks(outline, P, s) };
    case 'solid':
    default: return { outline, marks: [outline.slice()], dropped: 0, clamped: false };
  }
}

/* A FAN, per convex polygon — every polygon here is convex, so a fan is exact. */
export function marksToTriangles(marks) {
  let n = 0;
  for (const m of marks) n += Math.max(0, m.length / 2 - 2);
  const out = new Float32Array(n * 9);
  let o = 0;
  for (const m of marks) {
    const k = m.length / 2;
    for (let i = 1; i < k - 1; i++) {
      out[o++] = m[0]; out[o++] = m[1]; out[o++] = 0;
      out[o++] = m[i * 2]; out[o++] = m[i * 2 + 1]; out[o++] = 0;
      out[o++] = m[(i + 1) * 2]; out[o++] = m[(i + 1) * 2 + 1]; out[o++] = 0;
    }
  }
  return out;
}

/* THE TONE PAINTED AT A POINT, top shape first. The analytic statement of what
   the page's stencil holds, so the gate can say where a pixel SHOULD be
   reversed without asking the page. */
export function toneAt(shapes, space, x, y, cache = null) {
  for (let k = shapes.length - 1; k >= 0; k--) {
    const m = cache ? cache[k] : shapeMarks(shapes[k], space);
    if (!pointInConvex(x, y, m.outline)) continue;
    for (const poly of m.marks) if (pointInConvex(x, y, poly)) return shapes[k].tone;
  }
  return 'ground';
}

/* The painted area of one shape's marks, in px² — the share a fill actually
   covers, which the gate holds stripes and halftone to. */
export const marksArea = marks => marks.reduce((a, m) => a + Math.abs(polygonArea(m)), 0);
