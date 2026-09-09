// plot-export.js — the two artefacts, and the arithmetic that is not the page's.
//
// WHAT COMES OUT OF /plot. A RASTER, which is the picture exactly as rendered —
// the additive or multiply result survives because it IS the framebuffer — and
// an SVG for a pen plotter, which cannot be that picture and does not pretend
// to be. Both are cropped to `frameRect()`: the frame is what defines the
// output bounds, which is why the buttons live in the FRAME panel and not in a
// global export section.
//
// THE SVG IS AN HONESTLY DIFFERENT ARTEFACT AND THE UI SAYS SO. SVG has no
// additive and no multiply blending, so the crossing effect — most of what
// makes the screen picture read — cannot survive as vector. That is not a
// defect to engineer around with per-path opacity: a plotter draws UNIFORM
// strokes and gets its depth from line DENSITY, which is exactly what this
// geometry produces. So the strokes are flat and full strength, the ink level
// and the depth dim do NOT reach the file (a pen has one density), and the
// panel says both.
//
// ONE PATH PER LINE STRIP, NEVER ONE PER SEGMENT, and this is the difference
// between a plot that finishes and one that does not. The drawing is ~15,148
// grid segments plus ~40,040 inferred stem segments; emitted per segment a
// plotter lifts and re-places the pen fifty-five thousand times, where emitted
// per strip it is ~1,092 grid strips plus one continuation per drawn u-line.
// The strips are already polylines — `M … L L L` is the natural encoding and
// the per-segment version is the one that takes work to write.
//
// A STRIP IS SPLIT ONLY WHERE THE PROJECTION HAS NOTHING TO SAY. A point behind
// the camera or outside the depth range has no screen position, so a strip
// containing one becomes two paths rather than a path through a garbage
// coordinate. Splits are COUNTED and reported, because "one path per strip" is
// a claim the count has to be able to contradict.
//
// REAL MILLIMETRES, FROM THE GRID'S OWN UNITS AND THE CAMERA. The export
// declares `units: 'mm'` and the world container carries only a rotation, so
// world units ARE millimetres; the picture plane's scale is then a closed form
// in the camera — `2 tan(fov/2) · distance / viewportHeight` millimetres per
// pixel, at the plane through the orbit target. The SVG's user unit is one
// construction and a stroke width is a real width.
//   THE DIMENSIONS ARE DPR-INDEPENDENT AND THE STROKE IS NOT, and that is a
//   property of /plot rather than of this conversion. `frameRect()` and the
//   mm/px scale are both in CSS pixels, so `width`/`height` are the same on any
//   display; but `resize()` sets each material's `resolution` to the DRAWING
//   BUFFER's size (it does on `main`, and three's own Line2 example uses the
//   CSS size instead), so `linewidth` is a width in DEVICE pixels and a
//   device-pixel-ratio of 2 draws every line half as wide as the slider says.
//   The export DIVIDES BY THE PIXEL RATIO so the file matches what is on
//   screen, which is why the same drawing exports a 0.361 mm stroke at DPR 1
//   and 0.129 mm at DPR 2 with the sheet's closer camera. Faithful, and worth
//   knowing before anyone reads one of those numbers as "the" pen width.
//   WHAT THAT SCALE IS TRUE OF, said rather than hidden: it is exact AT THE
//   TARGET PLANE. This is a perspective projection, so nearer parts of the
//   drawing are magnified and farther parts reduced — inherent to the picture,
//   not to the conversion. A bloom sitting on the target plane comes out life
//   size.
//   AND IT IS NOT CLAIMED WHEN IT IS NOT KNOWN. If the grid's own
//   `asset.extras.units` is not millimetres, this file says what the unit
//   actually is instead of relabelling it.
//
// THE BOUNDARY IS A REAL CLIP, IN BOTH SHAPES. The ellipse needs one — cropping
// to its bounding box keeps the four corners, which is not the same picture —
// and the rectangle gets one too rather than leaning on the SVG viewport's own
// overflow, so "every stroked path is inside a clip that IS the boundary" is
// one statement with no special case. The boundary itself is NOT drawn: it is
// chrome on the page (an indication of the crop, not the crop), and a crop
// indicator baked into the cropped image would be an odd thing to plot.
//   WHAT A CLIP IS AND IS NOT, said because it matters at a plotter: the paths
//   are emitted WHOLE and the clip is what removes what is outside. Measured on
//   an ellipse at a zoomed-in camera, 26,430 of 56,560 emitted points lie
//   outside the viewBox — so software that ignores `clip-path` draws every one
//   of them. Pre-clipping the geometry instead would mean splitting strips at
//   the boundary, which is the one thing this file is built not to do (a split
//   is a pen lift), so the clip is the right trade and the caveat is real. If a
//   plotter turns out to ignore it, the fix is a clipped COPY of the file, not
//   a different path structure.

export const RASTER_SCALE = 4;          // asked for; the GL limits may lower it
export const SVG_PRECISION = 3;         // 1 µm, well past any plotter
export const SVG_NS = 'http://www.w3.org/2000/svg';

/* MILLIMETRES PER PIXEL AT THE TARGET PLANE. The perspective camera's vertical
   field of view spans the whole viewport height, so the world height visible at
   distance d is 2 d tan(fov/2) and one pixel is that over the viewport's height
   in CSS pixels — the same pixel space `frameRect` works in. */
export function mmPerPixel(fovDeg, distance, canvasHeightPx) {
  const H = Math.max(1, canvasHeightPx || 1);
  const d = Math.max(0, distance || 0);
  return 2 * Math.tan(fovDeg * Math.PI / 360) * d / H;
}

const round = (v, p = SVG_PRECISION) => {
  const s = +v.toFixed(p);
  return Object.is(s, -0) ? 0 : s;
};

/* A PROJECTED POLYLINE BECOMES PATHS. `pts` is a flat [x,y,x,y,…] in the page's
   own CSS-pixel space; `ok` marks which points the projection could place. The
   result is one path per RUN of placeable points, so an entirely visible strip
   is exactly one path — which is the property the whole plot time rests on. */
export function stripToPaths(pts, ok, rect, mmPerPx, precision = SVG_PRECISION) {
  const out = [];
  let run = null;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    // AT LEAST TWO POINTS, i.e. four numbers. A run of one point is not a
    // path — `M x y` with nothing after it is a pen-down and no stroke, which
    // some plotter software draws as a dot.
    if (ok && !ok[i]) { if (run && run.length >= 4) out.push(run); run = null; continue; }
    const x = round((pts[i * 2] - rect.x) * mmPerPx, precision);
    const y = round((pts[i * 2 + 1] - rect.y) * mmPerPx, precision);
    (run || (run = [])).push(x, y);
  }
  if (run && run.length >= 4) out.push(run);
  return out;
}

export function pathData(flat) {
  let d = `M${flat[0]} ${flat[1]}`;
  for (let i = 2; i < flat.length; i += 2) d += `L${flat[i]} ${flat[i + 1]}`;
  return d;
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hex = n => '#' + (n >>> 0 & 0xffffff).toString(16).padStart(6, '0');

/* THE DOCUMENT. `paths` is a list of flat coordinate arrays already in
   millimetres and already relative to the boundary's own origin, so this
   function does no geometry — everything it could get wrong is a property of
   the file rather than of the picture, which is what lets the gate drive it
   over polylines whose answer is written down. */
export function svgDocument({
  paths, widthMm, heightMm, shape, strokeMm, ink, ground, drawGround,
  title = '', unitLabel = 'mm',
}) {
  const W = round(widthMm), H = round(heightMm);
  const clip = shape === 'ellipse'
    ? `<ellipse cx="${round(W / 2)}" cy="${round(H / 2)}" rx="${round(W / 2)}" ry="${round(H / 2)}"/>`
    : `<rect x="0" y="0" width="${W}" height="${H}"/>`;
  const body = paths.map(p => `<path d="${pathData(p)}"/>`).join('\n');
  /* THE GROUND IS DRAWN ONLY WHERE ITS ABSENCE WOULD BE WRONG. On white paper
     the absence of ink IS the ground, which is exactly what a plotter wants and
     what a filled rectangle would only get in its way. On black, white strokes
     on a viewer's own white page are invisible, so the ground is real content
     and is drawn.
     AND IT IS INSIDE THE CLIP, WITH THE INK. Outside it, a screen-polarity
     ellipse comes out as a full black RECTANGLE with an ellipse of white lines
     floating in it — which is not the boundary the page drew and not what the
     raster's own elliptical alpha produces. The ground is part of the picture,
     so it is cropped by the same clip the picture is. */
  const groundRect = drawGround
    ? `\n    <rect x="0" y="0" width="${W}" height="${H}" fill="${hex(ground)}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="${SVG_NS}" version="1.1"
     width="${W}${unitLabel}" height="${H}${unitLabel}"
     viewBox="0 0 ${W} ${H}">
  <title>${esc(title)}</title>
  <desc>${esc(`Flat strokes, no blending: SVG has neither additive nor multiply, `
    + `so the crossings that carry the screen picture are not here. Depth comes `
    + `from line density. One path per line strip. 1 user unit = 1 ${unitLabel}.`)}</desc>
  <defs><clipPath id="plot-frame">${clip}</clipPath></defs>
  <g clip-path="url(#plot-frame)">${groundRect}
    <g fill="none" stroke="${hex(ink)}"
       stroke-width="${round(strokeMm, 4)}" stroke-linecap="round" stroke-linejoin="round">
${body}
    </g>
  </g>
</svg>
`;
}

/* WHAT IS OUTSIDE AN ELLIPSE IS TRANSPARENT, NOT FILLED — the one decision the
   raster half of this session had to make, and it is decided on which way round
   is recoverable. Alpha is strictly more information: a viewer or a layout that
   wants the ground behind the ellipse composites it in one step, where a
   ground-filled PNG cannot have its corners taken back off without
   re-deriving the ellipse from numbers the file does not carry. A RECTANGLE is
   fully opaque, so this only ever touches the ellipse.
   Mutates `rgba` in place; returns how many pixels it cleared. */
export function punchEllipse(rgba, w, h) {
  const rx = w / 2, ry = h / 2;
  let cleared = 0;
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - ry) / ry;
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - rx) / rx;
      if (dx * dx + dy * dy <= 1) continue;
      rgba[(y * w + x) * 4 + 3] = 0;
      cleared++;
    }
  }
  return cleared;
}

/* A FILE NAME THAT SAYS WHAT THE THING IS. The grid's own stem, the polarity
   and the boundary, because two exports of one composition at two polarities
   are the pair anyone reviewing this will be holding side by side. */
export function exportName(source, polarity, shape, ext) {
  const stem = String(source || 'plot').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'plot';
  return `${stem}-${polarity}-${shape}.${ext}`;
}
