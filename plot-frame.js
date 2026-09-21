// plot-frame.js — the composition's boundary, and nothing else.
//
// WHAT A FRAME IS HERE. A crop region for the PICTURE, so it lives in the
// viewport's own pixel space and not in the world: an aspect ratio is a
// property of an output image, and a boundary defined in grid millimetres
// would change shape every time the camera turned. Everything in this file is
// therefore a function of the canvas size in CSS pixels, the ratio, and the
// margin — nothing here knows what a bloom is.
//
// TWO SHAPES, NOT FOUR. Rectangle and ellipse; the ratio is its own control, so
// a square is a rectangle at 1:1 and a circle is an ellipse at 1:1, reachable
// exactly rather than as a fourth named type that could disagree with the
// ratio control about what it means.
//
// THE MARGIN INSETS FROM THE SHORTER SIDE, so "6%" means the same visual gap on
// a wide window and a tall one. Inset first, then fit the largest box of the
// asked-for ratio into what is left, centred: that ordering is what makes the
// margin a property of the SCREEN (how much of it is not the picture) rather
// than of the frame, which is the only reading under which margin 0 puts the
// boundary on the viewport edge at every ratio.
//
// THE BOUNDARY IS A DRAWN LINE AND THE EXTERIOR IS NOT VEILED, which is a
// choice and not an omission — see plot.js's FRAME section for the reasoning
// (on a black ground under additive ink, a veil or a letterbox is invisible
// wherever the ink is not, which is most of the frame's edge).
//
// WHAT A NON-RECTANGULAR FRAME COSTS DOWNSTREAM, recorded here so the export
// session does not rediscover it:
//   * RASTER export of an ellipse needs alpha outside the boundary, or a fill
//     in the ground colour — a PNG has no notion of "outside the shape", and
//     cropping to the bounding box keeps the four corners.
//   * SVG export needs a real <clipPath> on the ellipse, applied to every
//     stroked path; clipping by bounding box is not the same picture.
//   * BACKGROUND SHAPES, when they land, have to clip AT this boundary rather
//     than at the viewport — which means the boundary stops being an overlay
//     and becomes a clip region that other things read.
// None of that is built. This session draws the boundary and saves it.

// The shapes, and the ratios the control offers. Ratios are stored and read as
// their own `w:h` string: self-describing in a saved file, exact at 1:1, and
// one-to-one with the option the select shows.
export const FRAME_SHAPES = ['rect', 'ellipse'];

export const FRAME_RATIOS = [
  { value: '1:1',  w: 1,  h: 1,  label: '1:1 square' },
  { value: '4:5',  w: 4,  h: 5,  label: '4:5 portrait' },
  { value: '3:4',  w: 3,  h: 4,  label: '3:4 portrait' },
  { value: '2:3',  w: 2,  h: 3,  label: '2:3 portrait' },
  { value: '9:16', w: 9,  h: 16, label: '9:16 tall' },
  { value: '5:4',  w: 5,  h: 4,  label: '5:4 landscape' },
  { value: '4:3',  w: 4,  h: 3,  label: '4:3 landscape' },
  { value: '3:2',  w: 3,  h: 2,  label: '3:2 landscape' },
  { value: '16:9', w: 16, h: 9,  label: '16:9 wide' },
];

export const DEFAULT_RATIO = '2:3';
export const MIN_MARGIN_PCT = 0;
export const MAX_MARGIN_PCT = 40;

// How finely an ellipse is drawn. A rectangle is four segments whatever this
// is; the ellipse is the only consumer.
export const ELLIPSE_SEGMENTS = 160;

/* `w:h` -> w/h, or null. Any well-formed pair parses — a hand-edited 7:5 in a
   saved file is a meaningful ratio — but only the listed values can be SHOWN,
   so the file reader is the thing that decides what to do with one the select
   cannot display (see plot-file.js: it reports and falls back, rather than
   leaving the control showing a ratio the drawing is not using). */
export function parseRatio(v) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(String(v ?? ''));
  if (!m) return null;
  const w = +m[1], h = +m[2];
  if (!(w > 0) || !(h > 0)) return null;
  return w / h;
}

export const isListedRatio = v => FRAME_RATIOS.some(r => r.value === v);

/* THE ONE OWNER OF WHERE THE BOUNDARY IS. Everything that needs the frame —
   the overlay's own vertices, the camera fit, the read-out's pixel figures and
   the saved file's report — reads this and computes nothing of its own.
   Returned in CSS pixels with y measured DOWN from the top, which is the
   convention the overlay's orthographic camera and every screen coordinate on
   this page already use. */
export function frameRect(canvasW, canvasH, ratio, marginPct) {
  const W = Math.max(1, canvasW || 1), H = Math.max(1, canvasH || 1);
  const A = ratio > 0 ? ratio : W / H;
  const pct = Math.min(MAX_MARGIN_PCT, Math.max(MIN_MARGIN_PCT, Number(marginPct) || 0));
  const inset = pct / 100 * Math.min(W, H);
  // A margin can never eat the whole frame: at the top of its range on a
  // square canvas the inset is 40% a side, so 20% of the shorter dimension is
  // always left. The max() is a floor against a degenerate canvas, not a clamp
  // on the control.
  const aw = Math.max(1, W - 2 * inset), ah = Math.max(1, H - 2 * inset);
  let width, height;
  if (aw / ah > A) { height = ah; width = height * A; }
  else { width = aw; height = width / A; }
  return { x: (W - width) / 2, y: (H - height) / 2, width, height,
           cx: W / 2, cy: H / 2, inset, ratio: A, canvasW: W, canvasH: H };
}

/* THE OUTLINE, AS A CLOSED LOOP OF POINTS IN THE SAME PIXEL SPACE — last point
   equal to the first, so the caller pairs consecutive points and gets a closed
   boundary with no special case for the join. z is 0 throughout: the overlay is
   flat by construction, and giving it a depth would make the boundary
   something the camera could get behind.

   THE ELLIPSE IS INSCRIBED IN THE VERY SAME RECT — semi-axes are half the box's
   own width and height — so switching the shape moves no edge and a circle is
   exactly what 1:1 gives. */
export function frameOutline(shape, rect, segments = ELLIPSE_SEGMENTS) {
  const pts = [];
  if (shape === 'ellipse') {
    const a = rect.width / 2, b = rect.height / 2;
    const n = Math.max(8, segments | 0);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      pts.push(rect.cx + a * Math.cos(th), rect.cy + b * Math.sin(th), 0);
    }
    pts.push(pts[0], pts[1], 0);
  } else {
    const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.width, y1 = rect.y + rect.height;
    pts.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0, x0, y0, 0);
  }
  const points = new Float32Array(pts);
  return { points, count: points.length / 3, segments: points.length / 3 - 1 };
}

/* HOW THE FRAME CHANGES A CAMERA FIT, and the one expression both the framed
   and the unframed case go through. The perspective camera's vertical field of
   view spans the whole viewport height H, so a drawing that must fit inside a
   box `height` pixels tall has to fit inside the fraction `height / H` of it;
   the horizontal half-angle is `tanY * W / H`, so the same fraction of it is
   `tanY * width / H`.

   WITH NO FRAME THIS IS THE EXPRESSION /plot SHIPPED, term for term: pass the
   canvas's own size as the box and `tanX` comes back `tanY * W / H`, which is
   `tanY * camera.aspect` — the identity is by construction, not by tolerance,
   and the gate asserts it by fitting an unframed view against a frame at the
   viewport's own ratio and margin 0. */
export function fitTangents(tanY, box, canvasH) {
  const H = Math.max(1, canvasH || 1);
  return { tanY: tanY * (box.height / H), tanX: tanY * (box.width / H) };
}
