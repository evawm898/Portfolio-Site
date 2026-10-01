/* bug-fixtures.mjs — hand-drawn wing outlines for tools/verify-bug.mjs and
   tools/shot-bug-sheet.mjs, and the swallowtail REFERENCE drawing used as the
   editor backdrop on the contact sheet.

   The reference is a schematic drawn here (a swallowtail's right forewing,
   hindwing and tail in the editor's own [u, w] frame), NOT a photograph. The
   traced outline is a set of control points placed ON that drawing. */

import { sampleOutline } from '../bug-geometry.js';

/* The editor's drawing frame (bug.js reads the same numbers): [u, w] maps to
   x right / y up, u in [-0.08, 1.28], w in [-0.9, 0.46] (room below for a tail). */
export const EDITOR_VIEW = { u0: -0.08, u1: 1.28, w0: -0.9, w1: 0.46 };

/* The reference forewing: a denser hand-drawn outline (the "drawing"). */
const REF_FORE = [[0, 0.07], [0.12, 0.11], [0.3, 0.165], [0.5, 0.205], [0.7, 0.235], [0.88, 0.255], [1.0, 0.26],
  [0.98, 0.17], [0.93, 0.06], [0.86, -0.05], [0.78, -0.15], [0.66, -0.23], [0.5, -0.24], [0.32, -0.2], [0.14, -0.14], [0, -0.08]];
const REF_HIND = [[0, 0.03], [0.3, 0.02], [0.62, -0.06], [0.82, -0.2], [0.86, -0.36], [0.8, -0.5], [0.66, -0.6], [0.48, -0.6],
  [0.3, -0.48], [0.14, -0.3], [0, -0.12]];

/* The trace: nine control points placed on the reference forewing's outline
   (a subset of its own vertices, so every one lies ON the drawing). */
export const SWALLOWTAIL_TRACE = [REF_FORE[0], REF_FORE[2], REF_FORE[4], REF_FORE[6], REF_FORE[8], REF_FORE[10], REF_FORE[12], REF_FORE[14], REF_FORE[15]].map((q) => q.slice());

/* Other hand-drawn outlines the gate builds: each exercises something the
   default does not. */
export const HAND_OUTLINES = {
  swallowtail: SWALLOWTAIL_TRACE,
  // falcate: the apex hooks BACKWARD past the trailing margin's own span — the
  // outline is not span-monotone, which a row-by-row planform could not build
  falcate: [[0, 0.08], [0.45, 0.2], [0.95, 0.18], [1.12, 0.02], [1.0, -0.12], [0.86, -0.04], [0.7, -0.16], [0.35, -0.22], [0, -0.09]],
  // a deep notch in the outer margin
  notched: [[0, 0.1], [0.5, 0.22], [1.0, 0.15], [0.62, -0.02], [0.95, -0.22], [0.4, -0.3], [0, -0.1]],
  // narrow dragonfly-like strap, many points
  strap: [[0, 0.04], [0.15, 0.07], [0.35, 0.085], [0.55, 0.09], [0.75, 0.09], [0.92, 0.075], [1.0, 0.04], [0.98, -0.03], [0.8, -0.075], [0.55, -0.09], [0.3, -0.085], [0.12, -0.06], [0, -0.04]],
  // only four points — the minimum
  minimal: [[0, 0.1], [0.9, 0.12], [0.8, -0.2], [0, -0.1]],
};

/* A pair that BLENDS into a crossing: each outline is simple on its own, and
   the straight apex-aligned mix of the two crosses itself at t = 0.5 (found by
   search over 300 outlines, kept as data). The gate builds it as a 3-pair bug,
   so the middle pair is exactly that mix. */
export const CROSSING_BLEND = { first: SWALLOWTAIL_TRACE, last: [[0, 0.105], [1.051, -0.188], [0.581, -0.253], [0.787, -0.141], [0, -0.128]] };

/* A tail drawn DELIBERATELY thinner than the floor: a neck 0.02 of the pair's
   length wide (0.4 mm on a 20 mm hindwing, against the 1.0 mm floor). */
export const THIN_TAIL = { on: true, anchorU: 0.6, points: [[-0.03, -0.005], [-0.04, 0.15], [-0.045, 0.3], [-0.08, 0.36], [-0.06, 0.43], [-0.01, 0.42], [-0.025, 0.3], [-0.02, 0.15], [0.03, -0.005]] };   // [along, outward]

/* An SVG of the reference, sized to the editor frame (width x height px). */
export function swallowtailReferenceSvg(width = 680, height = 680) {
  const v = EDITOR_VIEW;
  const X = (u) => ((u - v.u0) / (v.u1 - v.u0)) * width, Y = (w) => ((v.w1 - w) / (v.w1 - v.w0)) * height;
  const path = (pts) => 'M' + sampleOutline(pts, 8).map(([u, w]) => `${X(u).toFixed(1)} ${Y(w).toFixed(1)}`).join('L') + 'Z';
  // a tail off the hindwing's outer margin
  const tail = [[0.8, -0.5], [0.87, -0.56], [0.97, -0.66], [1.0, -0.62], [0.9, -0.5], [0.84, -0.4]];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<rect width="100%" height="100%" fill="#f1ebdd"/>`
    + `<path d="${path(REF_HIND)}" fill="#3a2e1f" opacity="0.55"/>`
    + `<path d="${'M' + tail.map(([u, w]) => `${X(u).toFixed(1)} ${Y(w).toFixed(1)}`).join('L') + 'Z'}" fill="#3a2e1f" opacity="0.55"/>`
    + `<path d="${path(REF_FORE)}" fill="#1d1710" stroke="#e2c044" stroke-width="3"/>`
    + `<rect x="0" y="${Y(0.07).toFixed(1)}" width="${X(0).toFixed(1)}" height="${(Y(-0.08) - Y(0.07)).toFixed(1)}" fill="#1d1710"/>`
    + `<text x="12" y="28" font-family="monospace" font-size="16" fill="#3a2e1f">reference — swallowtail, schematic</text></svg>`;
}
