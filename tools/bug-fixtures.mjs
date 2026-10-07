/* bug-fixtures.mjs — hand-drawn wing outlines for tools/verify-bug.mjs and
   tools/shot-bug-sheet.mjs, and the swallowtail REFERENCE drawing used as the
   editor backdrop on the contact sheet.

   The reference is a schematic drawn here (a swallowtail's right forewing,
   hindwing and tail in the editor's own [u, w] frame), NOT a photograph. The
   traced outline is a set of control points placed ON that drawing. */

import { sampleOutline, defaultParams } from '../bug-geometry.js';

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

/* A LINKED middle pair below the floor while both drawn pairs clear it. Since
   the wing-shape library (design doc §13.4) a middle pair is DRAWN through
   control points re-expressed from the mix, which smooths away the waist the
   old fixture's eased mix had (the crossing blend at 3 pairs, last pair 36 mm
   at stretch 1.6 — it no longer reads below the floor). This one was found by
   search: library hindwing #15's outline (kept here as data, so the fixture
   does not move with the library) as the FIRST pair, 30 mm at stretch 1.6, and
   the hand-drawn notched outline as the last, 15 mm at stretch 1.3, at 4 pairs.
   Pair 2's mix crosses and is eased (barely: t 0.33 -> 0.33); pair 3 (linked)
   reads 0.61 mm past the floor disc; pairs 1 and 4 are clear by the builder's
   measure. (A first candidate with a 45 mm last pair stacked the roots: R.) */
const BLENDED_THIN_FIRST = [[0, 0.05], [0.13272, 0.03457], [0.37211, -0.12721], [0.66513, -0.44907], [0.70704, -0.49285], [0.70509, -0.61476], [0.7632, -0.6509], [0.90505, -0.78324], [1, -0.84032], [0.967, -0.86506], [0.68641, -0.69959], [0.63926, -0.73439], [0.59277, -0.72438], [0.50235, -0.76609], [0.44617, -0.61662], [0.20244, -0.43194], [0.07471, -0.05102], [0, -0.05]];
export function blendedThin() {
  const p = defaultParams(); p.wingPairs = 4;
  p.wings.first.points = BLENDED_THIN_FIRST.map((q) => q.slice());
  p.wings.last.points = HAND_OUTLINES.notched.map((q) => q.slice());
  p.wings.first.length = 30; p.wings.first.stretch = 1.6;
  p.wings.last.length = 15; p.wings.last.stretch = 1.3; p.wings.last.scallop = 0;
  p.wings.tail.on = false;
  return p;
}

/* Two library blends that found builder defects (design doc §15.2, 15.3),
   kept as the PARAMS they built from (body and wings), so neither moves when
   the library, the blend law or the randomizer does. Both were what the random
   rows drew when #22 and #19 were first taken out of the library (random:3 and
   random:1, positional draws, before §15.1 keyed the draws on shape ids).

   ROOT_UNDER_FLOOR: random:3's body with blend #20/#31 at 0.62, three pairs.
   The hindwing (pair 3) closes on a root chord 0.85 mm wide, under the 1 mm
   floor, and stays narrower than a floor-wide disc for the first stretch of
   span: 1.04 mm past the floor disc by the gate's N measure. The builder read
   0.42 (its disc test admitted centres 0.458 mm from the edge on a pixel
   distance) and the STL exported. It must now be REFUSED.

   PITCHED_BEAD_HOLES: random:1's body with blend #55/#27 at 0.37, two pairs,
   HOLES, pitch -7.2 / +7.0 degrees. Its long hindwing reaches 26 mm back from
   the hinge chord, where the pitch's twist stretches planform distances by
   1.1%: beads exactly half-round in the planform were up to 1.12% wider than
   half-round in the world (E1). */
const ROOT_UNDER_FLOOR_PARAMS = {"bodyParts": "3", "roundness": 1.8463945926167071, "pointedTips": true, "headSize": 4.379149551223963, "thoraxLength": 4.987032062723301, "thoraxWidth": 7.315026949159801, "thoraxDepth": 6.542224528991838, "abdomenLength": 13.778385672464458, "abdomenWidth": 4.85176767556036, "abdomenTaper": 0.35795376100577414, "abdomenSegments": 7, "banding": true, "segmentStyle": 0, "legPairs": 3, "legsVisible": true, "legReach": 0, "coxa": 1.656544869299978, "femur": 4.395482442437325, "tibia": 5.177026561959092, "tarsus": 4.131255327112001, "legSplay": 31, "legBend": 56, "legTaper": 0.4146988276392221, "antennaType": "filiform", "antennaLength": 17.274526258158083, "antennaCurl": 24, "antennaSpread": 12, "clubLength": 0.22, "clubWidth": 1.8, "clubTaper": 0.35, "wingPairs": 3, "wingEdgeTaper": 0.5, "wingEdgeBevel": 0, "wingEdgeRound": 1, "wingRootPinch": 0, "wingRootLength": 1, "venation": "none", "ridgeHeight": 0.6, "minCellMm": 1.5, "minDiameter": 1, "wings": {"first": {"length": 14.99616614666349, "stretch": 1.0588, "sweep": 0, "scallop": 0, "scallopCount": 7, "thickness": 1.035459477454424, "dihedral": 6.168854809366167, "pitch": 0.49489201977849007, "veinCount": 4, "veinBranch": 1, "discal": 1, "discalSize": 0.55, "discalPos": 0.5, "crossDensity": 0.1, "cellRegularity": 0.6, "veinWidth": 1.2, "veinTaper": 0.15, "stigma": 0, "stigmaSize": 0.12, "marginBorder": 1, "points": [[0, 0.0472], [0.178, 0.0233], [0.3544, 0.0637], [0.5348, 0.0815], [0.7156, 0.0757], [0.887, 0.0203], [1.0002, -0.1116], [0.8958, -0.2746], [0.7469, -0.4027], [0.5874, -0.5141], [0.4127, -0.4488], [0.2809, -0.3035], [0.1562, -0.1517], [0, -0.0472]]}, "last": {"length": 8.485, "stretch": 2.2173, "sweep": 0, "scallop": 0, "scallopCount": 7, "thickness": 1.3385605097282678, "dihedral": 23.578441557474434, "pitch": 4.242713704705238, "veinCount": 4, "veinBranch": 1, "discal": 1, "discalSize": 0.55, "discalPos": 0.5, "crossDensity": 0.1, "cellRegularity": 0.6, "veinWidth": 1.2, "veinTaper": 0.15, "stigma": 0, "stigmaSize": 0.12, "marginBorder": 1, "points": [[0, 0.0225], [0.1328, 0.0164], [0.2629, -0.0112], [0.3887, -0.0544], [0.5079, -0.1134], [0.6228, -0.1805], [0.7342, -0.2533], [0.8387, -0.3355], [0.9273, -0.4346], [1.0017, -0.5435], [0.9318, -0.6608], [0.8313, -0.7506], [0.7124, -0.8164], [0.5909, -0.8733], [0.4561, -0.8569], [0.3284, -0.8083], [0.2435, -0.7031], [0.2092, -0.5715], [0.1907, -0.436], [0.1958, -0.299], [0.1954, -0.162], [0.1325, -0.0447], [0, -0.0225]]}, "unlinked": {}, "tail": {"on": false, "anchorU": 0.6, "points": [[-0.05, -0.005], [-0.075, 0.13], [-0.085, 0.25], [-0.14, 0.31], [-0.13, 0.4], [-0.06, 0.44], [0.005, 0.36], [-0.005, 0.25], [0.005, 0.13], [0.045, -0.005]]}}};
const PITCHED_BEAD_HOLES_PARAMS = {"bodyParts": "3", "roundness": 1.8032828654162587, "pointedTips": true, "headSize": 4.657043455843814, "thoraxLength": 10.876831288565882, "thoraxWidth": 8.341889491071925, "thoraxDepth": 6.959897425475132, "abdomenLength": 33.89164950673318, "abdomenWidth": 8.796690964458966, "abdomenTaper": 0.45547817125916484, "abdomenSegments": 10, "banding": true, "segmentStyle": 0, "legPairs": 3, "legsVisible": true, "legReach": 0.7847333958488889, "coxa": 1.2844937181100249, "femur": 7.592236173074536, "tibia": 7.243544484406452, "tarsus": 5.652966074978026, "legSplay": 22, "legBend": 43, "legTaper": 0.6068432103842496, "antennaType": "clubbed", "antennaLength": 6.245132730824222, "antennaCurl": 13, "antennaSpread": 31, "clubLength": 0.22, "clubWidth": 1.8, "clubTaper": 0.35, "wingPairs": 2, "wingEdgeTaper": 0.5, "wingEdgeBevel": 0, "wingEdgeRound": 1, "wingRootPinch": 0, "wingRootLength": 1, "venation": "holes", "ridgeHeight": 0.6, "minCellMm": 1.5, "minDiameter": 1, "wings": {"first": {"length": 32.26787841268147, "stretch": 1.1509, "sweep": 0, "scallop": 0, "scallopCount": 7, "thickness": 1.0636054360074922, "dihedral": 2.9397287010215223, "pitch": -7.2204245664179325, "veinCount": 4, "veinBranch": 1, "discal": 1, "discalSize": 0.55, "discalPos": 0.5, "crossDensity": 0.1, "cellRegularity": 0.6, "veinWidth": 1.2, "veinTaper": 0.15, "stigma": 0, "stigmaSize": 0.12, "marginBorder": 1, "points": [[0, 0.0434], [0.2051, 0.1128], [0.3983, 0.2194], [0.6002, 0.3081], [0.8175, 0.3378], [1, 0.2441], [0.8784, 0.0261], [0.71, -0.1576], [0.4722, -0.2181], [0.2395, -0.1214], [0, -0.0434]]}, "last": {"length": 20.616, "stretch": 1.6071, "sweep": 0, "scallop": 0, "scallopCount": 5, "thickness": 1.4406132654985413, "dihedral": 10.301758928690106, "pitch": 6.974308013916016, "veinCount": 4, "veinBranch": 1, "discal": 1, "discalSize": 0.55, "discalPos": 0.5, "crossDensity": 0.1, "cellRegularity": 0.6, "veinWidth": 1.2, "veinTaper": 0.15, "stigma": 0, "stigmaSize": 0.12, "marginBorder": 1, "points": [[0, 0.0311], [0.1584, 0.0228], [0.3164, 0.0101], [0.4724, -0.0182], [0.6263, -0.0566], [0.7759, -0.1086], [0.9232, -0.1662], [1.0027, -0.2953], [0.9677, -0.4372], [0.8962, -0.5701], [0.7819, -0.6629], [0.6261, -0.6765], [0.4703, -0.6761], [0.3181, -0.652], [0.2209, -0.5375], [0.1784, -0.387], [0.1679, -0.2309], [0.1391, -0.0787], [0, -0.0311]]}, "unlinked": {}, "tail": {"on": true, "anchorU": 0.88877, "points": [[0.11057, -0.03593], [0.09415, 0.14243], [0.09102, 0.22369], [0.18276, 0.21141], [0.23743, -0.07243]]}}};
// Both were frozen before the JUNCTION BLEND (design doc §16) existed, and a
// params object without its key takes the blend's default: pinned OFF here so
// neither fixture moves. (The blend is exactly what clears the first: with it
// on, that hindwing root reads 0.08 mm past the floor disc, not 1.04.)
export const rootUnderFloor = () => ({ ...JSON.parse(JSON.stringify(ROOT_UNDER_FLOOR_PARAMS)), wingJunction: 0 });
export const pitchedBeadHoles = () => ({ ...JSON.parse(JSON.stringify(PITCHED_BEAD_HOLES_PARAMS)), wingJunction: 0 });

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
