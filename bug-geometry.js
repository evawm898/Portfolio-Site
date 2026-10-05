/* bug-geometry.js — the Parametric Bug's ONE model, and both exporters.

   ARCHITECTURE LAW (bug-project-design-doc.md §1): one 3D model is the single
   source of truth. buildBug(params) returns it; exportStl(model) and
   exportSvg(model) read it and NOTHING else — neither takes the parameters, so
   the two exports cannot be two drawings of two different bugs. The SVG is the
   top-down projection of the model's own triangles (the contour generator of
   each closed part), never a second 2D geometry path.

   Pure ES module: no three.js, no DOM. Runs in Node (tools/verify-bug.mjs) and
   in the page (bug.js). Units are millimetres; x = right, y = forward (head),
   z = up.

   SYMMETRY: only the right half (+x) is generated. Every R part is mirrored
   (x -> -x, winding reversed) into an L part; the axial body loft is built from
   half-rings mirrored the same way, with x = 0 written as +0 so an axial
   vertex's mirror is itself. mirrorDiff() checks the identity on the emitted
   triangles as exact doubles. */

import { planVenation, bridgeHoles, MIN_CELL_MM_DEFAULT } from './bug-venation.js';
import { WING_LIBRARY } from './bug-wing-library.js';
export { WING_LIBRARY };
export { MIN_CELL_MM_DEFAULT };

const D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mx = (x) => (x === 0 ? 0 : -x);          // mirror, keeping +0 on the plane

/* ------------------------------------------------------------------ */
/* Constants (derived quantities, not controls — each says why)        */
/* ------------------------------------------------------------------ */

export const MIN_DIAMETER_DEFAULT = 1.0;   // SLS PA12 unsupported-wire minimum (CLAUDE.md / flower-project). A declared guess: nothing here is printed.
const RING_HALF = 16;                       // body ring: 16 segments per half -> 32 around
const BODY_STEP_MM = 0.25;                  // station spacing along the body axis
const TUBE_SIDES = 10;
/* A tube's floor is on its INSCRIBED radius — the polygon a printer gets —
   so the vertex radius is the floor divided by cos(pi / sides). */
const tubeFloorR = (p) => p.minDiameter / 2 / Math.cos(Math.PI / TUBE_SIDES);
const SCALLOP_FROM = 0.3;                   // scallops run over the outer 70% of the span
const BAND_DEPTH = 0.14;                    // abdomen constriction depth when banding is on
const ABD_DEPTH_RATIO = 0.9;                // abdomen depth / width
const ABD_PEAK = 0.3;                       // abdomen widest at 30% of its length
const HEAD_DEPTH_RATIO = 0.9;
const LEG_ROOT_FRAC = 0.44;                 // leg root DIAMETER / thorax half-width
const ANT_ROOT_FRAC = 0.10;                 // antenna root diameter / head size

/* Elegance pass (bug-project-design-doc.md §9). Every one of these shapes has an
   "old" end on its control that is a BRANCH back to the Phase 1/2 code, so the
   cute bug stays reachable bit for bit and only stops being the default. */
/* A POINTED termination is a floored tube that closes in a cone whose apex
   stands TIP_POINT ring radii beyond its last ring (a ~53 degree point). The
   last ring is at or above the floor; the apex is the point, as a printer gets
   it — the same reading the drawn-outline floor gives a sharp corner. */
export const TIP_POINT = 2.0;
/* ...and closes on a NIB this many mm in radius, not on a mathematical point:
   a cone drawn diagonally in projection thins past one cut-safe raster pixel
   (0.05 mm) before its apex, and the 4-connected union then cut the last
   stretch off as an ISLAND — 5 of 40 random bugs read 2 cut-safe regions, every
   one at a leg, antenna or pinna tip (measured; rounded ends read 1). A nib
   0.16 mm across clears two pixels on any diagonal and is far under anything
   a printer resolves. */
export const TIP_NIB_MM = 0.08;
/* An incised segment line: a Gaussian groove GROOVE_SIGMA_MM wide, cutting
   GROOVE_DEPTH of the local radius, at each segment boundary. Fine lines, not
   constrictions: the bulge end of the style axis is the old BAND_DEPTH bead. */
export const GROOVE_SIGMA_MM = 0.18, GROOVE_DEPTH = 0.12;
/* A pointed abdomen ends in a cone this many floor RADII long; above it the
   abdomen's radius is floored at the floor (a tip does not thin to a hair). */
const ABD_TIP_CONE = 1.6;
/* A tucked leg keeps this far off the midline (mm) so it never coincides with
   its own mirror image (see buildLegs). */
const TUCK_MIDLINE_GAP = 0.08;

/* Wings (Phase 1 revision). */
export const MAX_WING_PAIRS = 4;
/* The thorax lengthens with each wing pair past two, so N roots can be spread
   along it without stacking: effective length = thoraxLength * (1 + k (N - 2)). */
export const THORAX_PER_PAIR = 0.3;
/* Roots are spread evenly over the middle 70% of the (lengthened) thorax. */
const WING_ROOT_SPAN = 0.7;
/* Centripetal Catmull-Rom (alpha 0.5): no cusps and no self-intersection inside
   a segment (Yuksel et al. 2011) — the trap a plain cubic spline falls into. */
const CR_ALPHA = 0.5;
export const CR_SAMPLES = 10;               // samples per control segment
/* Middle pairs interpolate between the first and last DENSE curves, resampled
   by arc length with the apex (the sample farthest out along the span) aligned,
   so the two drawn outlines need not have the same number of control points. */
export const INTERP_SAMPLES = 48;           // per half (leading / trailing)
const WING_SUBDIV = 2;                      // 1->4 midpoint subdivisions of the triangulated planform
/* Editor bounds of the drawn outline, in units of the wing's own length. */
export const OUTLINE_BOUNDS = { u: [0, 1.2], w: [-0.9, 0.46] };   // room below for a tail
const MIN_POINT_GAP = 0.012;                // consecutive control points closer than this are refused
const MIN_ROOT_CHORD = 0.03;                // root lead must sit this far ahead of root trail
export const MIN_OUTLINE_POINTS = 4;        // two roots + two interior

/* ------------------------------------------------------------------ */
/* Parameter declaration — the ONE place a control is defined          */
/* ------------------------------------------------------------------ */

export const SECTIONS = [
  { id: 'plan', label: 'Body', open: true },
  { id: 'head', label: 'Head' },
  { id: 'thorax', label: 'Thorax' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'legs', label: 'Legs' },
  { id: 'antennae', label: 'Antennae' },
  { id: 'wings', label: 'Wings', open: true },
  { id: 'venation', label: 'Venation (Phase 2)' },
  { id: 'print', label: 'Print' },
];

const isThree = (p) => p.bodyParts === '3';
const hasLegs = (p) => p.legPairs > 0 && p.legsVisible;
const hasAnt = (p) => p.antennaType !== 'none';
const hasVeins = (p) => p.venation !== 'none' && p.wingPairs > 0;

const hasWings = (p) => p.wingPairs > 0;
const isClubbed = (p) => p.antennaType === 'clubbed';
const R = (id, section, label, min, max, step, def, unit = '', visibleWhen) =>
  ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });

export const PARAM_SPEC = [
  { id: 'bodyParts', section: 'plan', label: 'Body parts', kind: 'choice', default: '3',
    options: [['3', '3 — head, thorax, abdomen'], ['2', '2 — cephalothorax, abdomen']] },
  R('roundness', 'plan', 'Cross-section roundness', 1.5, 6, 0.1, 2.0, '', null),
  { id: 'pointedTips', section: 'plan', label: 'Terminations pointed — abdomen, tarsi, antennae (off: rounded ends)', kind: 'bool', default: true },

  R('headSize', 'head', 'Head size', 2, 12, 0.1, 2.4, 'mm', isThree),

  R('thoraxLength', 'thorax', 'Length', 3, 20, 0.1, 5, 'mm'),
  R('thoraxWidth', 'thorax', 'Width', 2.5, 14, 0.1, 2.9, 'mm'),
  R('thoraxDepth', 'thorax', 'Depth', 2.5, 14, 0.1, 2.9, 'mm'),

  R('abdomenLength', 'abdomen', 'Length', 2, 70, 0.5, 15, 'mm'),
  R('abdomenWidth', 'abdomen', 'Width', 1.5, 18, 0.1, 2.2, 'mm'),
  R('abdomenTaper', 'abdomen', 'Taper', 0, 1, 0.01, 0.75),
  R('abdomenSegments', 'abdomen', 'Segment count', 1, 12, 1, 7),
  { id: 'banding', section: 'abdomen', label: 'Segments marked', kind: 'bool', default: true },
  R('segmentStyle', 'abdomen', 'Segments — groove (incised lines) ↔ bulge (beaded)', 0, 1, 0.01, 0, '', (p) => p.banding && p.abdomenSegments > 1),

  R('legPairs', 'legs', 'Pairs', 0, 4, 1, 3),
  { id: 'legsVisible', section: 'legs', label: 'Visible', kind: 'bool', default: true },
  R('legReach', 'legs', 'Reach — tucked under ↔ splayed out', 0, 1, 0.01, 0, '', hasLegs),
  R('coxa', 'legs', 'Coxa', 0.5, 5, 0.1, 0.9, 'mm', hasLegs),
  R('femur', 'legs', 'Femur', 1, 20, 0.1, 4, 'mm', hasLegs),
  R('tibia', 'legs', 'Tibia', 1, 20, 0.1, 4.2, 'mm', hasLegs),
  R('tarsus', 'legs', 'Tarsus', 0.5, 15, 0.1, 3.4, 'mm', hasLegs),
  R('legSplay', 'legs', 'Splay — fan forward / back', 0, 70, 1, 35, '°', hasLegs),
  R('legBend', 'legs', 'Joint bend', 0, 90, 1, 45, '°', hasLegs),
  R('legTaper', 'legs', 'Taper', 0, 0.9, 0.01, 0.5, '', hasLegs),

  { id: 'antennaType', section: 'antennae', label: 'Type', kind: 'choice', default: 'clubbed',
    options: [['clubbed', 'Clubbed'], ['feathered', 'Feathered'], ['filiform', 'Filiform'], ['bristle', 'Bristle'], ['none', 'None']] },
  R('antennaLength', 'antennae', 'Length', 1, 40, 0.5, 17, 'mm', hasAnt),
  R('antennaCurl', 'antennae', 'Curl', -120, 180, 1, 0, '°', hasAnt),
  R('antennaSpread', 'antennae', 'Spread', 0, 80, 1, 22, '°', hasAnt),
  R('clubLength', 'antennae', 'Club length — of the antenna (0: a round knob)', 0, 0.5, 0.01, 0.22, '', isClubbed),
  R('clubWidth', 'antennae', 'Club width — × the shaft', 1, 4, 0.05, 1.8, '', (p) => isClubbed(p) && p.clubLength > 0),
  R('clubTaper', 'antennae', 'Club taper — rounded end ↔ drawn back to the tip', 0, 1, 0.01, 0.35, '', (p) => isClubbed(p) && p.clubLength > 0),

  R('wingPairs', 'wings', 'Pairs', 0, MAX_WING_PAIRS, 1, 2),
  R('wingEdgeTaper', 'wings', 'Edge — thickness tapers root → margin (0: even slab)', 0, 0.9, 0.01, 0.5, '', hasWings),
  R('wingEdgeBevel', 'wings', 'Edge — chamfer width to the floor at the margin (0: none)', 0, 4, 0.05, 0, 'mm', hasWings),
  R('wingEdgeRound', 'wings', 'Edge — round radius, × half the local thickness (1: full half-round bead; 0: square wall)', 0, 1, 0.01, 1, '', hasWings),
  R('wingRootPinch', 'wings', 'Root — pinch where the wing meets the body (0: the straight root chord, 1: a neck at ROOT_NECK_AT_FULL of the drawn root)', 0, 1, 0.05, 0, '', hasWings),
  R('wingRootLength', 'wings', 'Root — length: how far out from the body the narrowing reaches (1: as derived from the wing)', 0.5, 2, 0.05, 1, '×', (p) => hasWings(p) && p.wingRootPinch > 0),

  /* Phase 2 — venation. ONE model: the mode decides how the SAME cell record
     becomes geometry (HOLES: the cells are cut through and the veins plus the
     margin border are the frame; RIDGES: a solid wing with the veins raised).
     Per-pair vein settings live in WING_FIELDS, blended like everything else. */
  { id: 'venation', section: 'venation', label: 'Veins', kind: 'choice', default: 'none',
    options: [['none', 'None (Phase 1 wings)'], ['holes', 'HOLES — cells cut through, veins are the frame'], ['ridges', 'RIDGES — solid wing, veins raised']] },
  R('ridgeHeight', 'venation', 'Ridge height (STL)', 0.2, 2, 0.05, 0.6, 'mm', (p) => hasVeins(p) && p.venation === 'ridges'),
  R('minCellMm', 'venation', 'Smallest hole across — smaller cells merge', 0.5, 5, 0.1, MIN_CELL_MM_DEFAULT, 'mm', (p) => hasVeins(p) && p.venation === 'holes'),

  R('minDiameter', 'print', 'Min feature diameter (STL floor)', 0.6, 2, 0.05, MIN_DIAMETER_DEFAULT, 'mm'),
];

/* Per-pair wing fields. The drawn OUTLINE is the base shape; these are applied
   on top of it: stretch (chord scale) and sweep (in-plane rotation) transform
   the drawn curve, scallop / thickness / tilt are as before. */
const WR = (id, label, min, max, step, def, unit = '', visibleWhen = null) => ({ id, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });
export const WING_FIELDS = [
  WR('length', 'Length (span)', 5, 60, 0.5, 26, 'mm'),
  WR('stretch', 'Stretch — chord scale of the drawn curve', 0.3, 3, 0.01, 1),
  WR('sweep', 'Sweep — rotation of the drawn curve', -90, 90, 1, 0, '°'),
  WR('scallop', 'Scallop depth', 0, 0.4, 0.01, 0),
  WR('scallopCount', 'Scallop count', 2, 12, 1, 6, '', (w) => w.scallop > 0),
  WR('thickness', 'Thickness (STL)', 0.6, 4, 0.05, 1.2, 'mm'),
  WR('dihedral', 'Tilt — dihedral', -60, 80, 1, 12, '°'),
  WR('pitch', 'Tilt — pitch', -45, 45, 1, 0, '°'),
  /* venation (Phase 2) — visibleWhen receives (pairSpec, params) */
  WR('veinCount', 'Main veins from the root', 1, 10, 1, 4, '', (w, p) => hasVeins(p)),
  WR('veinBranch', 'Branching — forks per main vein', 0, 2, 1, 1, '', (w, p) => hasVeins(p)),
  WR('discal', 'Discal cell (0 off, 1 on)', 0, 1, 1, 1, '', (w, p) => hasVeins(p)),
  WR('discalSize', 'Discal — closes at this fraction of the vein', 0.15, 0.95, 0.01, 0.55, '', (w, p) => hasVeins(p) && w.discal >= 0.5),
  WR('discalPos', 'Discal — position across the wing', 0, 1, 0.01, 0.5, '', (w, p) => hasVeins(p) && w.discal >= 0.5),
  WR('crossDensity', 'Cross-veins — open ↔ segmented', 0, 1, 0.01, 0.1, '', (w, p) => hasVeins(p)),
  WR('cellRegularity', 'Cells — irregular ↔ grid-like', 0, 1, 0.01, 0.6, '', (w, p) => hasVeins(p)),
  WR('veinWidth', 'Vein width at the root', 0.4, 3, 0.05, 1.2, 'mm', (w, p) => hasVeins(p)),
  WR('veinTaper', 'Vein taper root → tip', 0, 0.8, 0.01, 0.15, '', (w, p) => hasVeins(p)),
  WR('stigma', 'Pterostigma (0 off, 1 on)', 0, 1, 1, 0, '', (w, p) => hasVeins(p)),
  WR('stigmaSize', 'Pterostigma size', 0.03, 0.4, 0.01, 0.12, '', (w, p) => hasVeins(p) && w.stigma >= 0.5),
  WR('marginBorder', 'Margin border width', 0.4, 4, 0.05, 1.0, 'mm', (w, p) => hasVeins(p)),
];
export const VENATION_FIELD_IDS = ['veinCount', 'veinBranch', 'discal', 'discalSize', 'discalPos', 'crossDensity', 'cellRegularity', 'veinWidth', 'veinTaper', 'stigma', 'stigmaSize', 'marginBorder'];
const VEIN_DEFAULTS = Object.fromEntries(WING_FIELDS.filter((f) => VENATION_FIELD_IDS.includes(f.id)).map((f) => [f.id, f.default]));

/* The neutral default: a plain rounded forewing and a shorter, rounder hindwing
   swept back. Not any named insect. Points are [u, w]: u along the span from the
   root (units of the wing's length), w along the chord, + = toward the head.
   First and last points are the ROOT LEAD and ROOT TRAIL, pinned at u = 0. */
/* The DEFAULT since the elegance pass (§9): a pinned specimen. The forewing has
   an ANGULAR apex and a straight-to-slightly-concave outer margin down to a
   clear tornus; the hindwing is a rounded fan with a gently scalloped margin.
   The forewing's sweep is not typed here: specimenPose() sets it at the end of
   this module so its inner margin is square to the body (see SPECIMEN). The
   Phase 1/2 neutral default is LEGACY_DEFAULT_WINGS, kept for reachability. */
export const DEFAULT_WINGS = {
  first: {
    points: [[0, 0.05], [0.3, 0.1], [0.65, 0.13], [0.9, 0.12], [1.0, 0.09], [0.9, -0.02], [0.795, -0.13], [0.69, -0.27], [0.62, -0.35], [0.5, -0.32], [0.26, -0.19], [0, -0.06]],
    length: 41, stretch: 1, sweep: 0, scallop: 0, scallopCount: 6, thickness: 1.8, dihedral: 0, pitch: 0, ...VEIN_DEFAULTS,
  },
  last: {
    points: [[0, 0.08], [0.3, 0.17], [0.62, 0.15], [0.86, 0.04], [0.98, -0.13], [0.92, -0.31], [0.72, -0.41], [0.44, -0.39], [0.17, -0.24], [0, -0.07]],
    length: 29, stretch: 1, sweep: 14, scallop: 0.06, scallopCount: 8, thickness: 1.8, dihedral: 0, pitch: 0, ...VEIN_DEFAULTS,
  },
  unlinked: {},
  tail: null,           // set below, once STARTER_TAIL exists
};

/* The Phase 1/2 neutral default, kept verbatim: with LEGACY_STYLE it rebuilds
   the shipped Phase 2 default bit for bit (measured, §9.6) — the cute bug is
   reachable, it is only no longer the default. */
export const LEGACY_DEFAULT_WINGS = {
  first: {
    points: [[0, 0.09], [0.34, 0.17], [0.78, 0.14], [1.0, 0.0], [0.82, -0.17], [0.4, -0.22], [0, -0.1]],
    length: 26, stretch: 1, sweep: 0, scallop: 0, scallopCount: 6, thickness: 1.2, dihedral: 12, pitch: 0, ...VEIN_DEFAULTS,
  },
  last: {
    points: [[0, 0.08], [0.4, 0.2], [0.85, 0.12], [1.0, -0.06], [0.72, -0.28], [0.3, -0.26], [0, -0.09]],
    length: 20, stretch: 1, sweep: 32, scallop: 0, scallopCount: 6, thickness: 1.2, dihedral: 8, pitch: 0, ...VEIN_DEFAULTS,
  },
  unlinked: {},
  tail: null,
};
/* The new controls at the ends that ARE the old code (each a branch). A design
   saved before DESIGN_VERSION 4 loads with these, so it looks as it did. */
export const LEGACY_STYLE = { pointedTips: false, segmentStyle: 1, clubLength: 0, clubWidth: 1.8, clubTaper: 0.35, wingEdgeTaper: 0, wingEdgeBevel: 0, wingEdgeRound: 0, wingRootPinch: 0 };
/* The edges pass (design doc §10): the rounded edge became the default. A design
   saved at DESIGN_VERSION 4 carries the chamfer it was saved with and knows no
   round radius, so it loads with the round at 0 (the square wall it had). */
export const PRE_ROUND_STYLE = { wingEdgeRound: 0 };
/* The blended root (§12.1): a design saved before DESIGN_VERSION 6 knows no root
   width and loads with it at 0 — the straight root chord it was saved with. */
export const PRE_ROOT_STYLE = { wingRootPinch: 0 };
/* The Phase 1/2 default's body, legs and antennae (the values PARAM_SPEC used
   to default to). */
export const LEGACY_BODY = { headSize: 4.0, thoraxLength: 7, thoraxWidth: 5, thoraxDepth: 4.6, abdomenLength: 15, abdomenWidth: 5, abdomenTaper: 0.5, abdomenSegments: 6,
  legReach: 1, coxa: 1.2, femur: 5, tibia: 5.5, tarsus: 4, antennaType: 'filiform', antennaLength: 10, antennaCurl: 10, antennaSpread: 25 };

export const DEFAULTS = Object.fromEntries(PARAM_SPEC.map((s) => [s.id, s.default]));
DEFAULTS.wings = DEFAULT_WINGS;   // .tail filled in after STARTER_TAIL (below)

export const defaultParams = () => clone(DEFAULTS);
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ------------------------------------------------------------------ */
/* Curve math: the drawn outline                                        */
/* ------------------------------------------------------------------ */

/* Centripetal Catmull-Rom through the control points (an OPEN chain from root
   lead to root trail), with mirrored phantom points at both ends so the curve
   passes through every control point, the roots included. Returns the dense
   polyline, control points included exactly. */
export function sampleOutline(points, per = CR_SAMPLES) {
  const n = points.length;
  const P = [sub2(mul2(points[0], 2), points[1]), ...points, sub2(mul2(points[n - 1], 2), points[n - 2])];
  const out = [points[0].slice()];
  for (let i = 1; i < n; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const t0 = 0;
    const t1 = t0 + Math.max(1e-9, Math.pow(dist2(p0, p1), CR_ALPHA));
    const t2 = t1 + Math.max(1e-9, Math.pow(dist2(p1, p2), CR_ALPHA));
    const t3 = t2 + Math.max(1e-9, Math.pow(dist2(p2, p3), CR_ALPHA));
    for (let k = 1; k <= per; k++) {
      if (k === per) { out.push(p2.slice()); break; }
      const t = t1 + ((t2 - t1) * k) / per;
      const A1 = lerp2(p0, p1, (t - t0) / (t1 - t0));
      const A2 = lerp2(p1, p2, (t - t1) / (t2 - t1));
      const A3 = lerp2(p2, p3, (t - t2) / (t3 - t2));
      const B1 = lerp2(A1, A2, (t - t0) / (t2 - t0));
      const B2 = lerp2(A2, A3, (t - t1) / (t3 - t1));
      out.push(lerp2(B1, B2, (t - t1) / (t2 - t1)));
    }
  }
  return out;
}
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* Is the CLOSED polygon simple? Every pair of non-adjacent edges is tested for
   intersection or touching; adjacent edges for folding back on themselves.
   O(n^2) — n is a few hundred, run per drag event. */
export function polygonSimple(poly) {
  const n = poly.length;
  if (n < 3) return false;
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSeg = (a, b, c) => Math.min(a[0], b[0]) - 1e-12 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-12 && Math.min(a[1], b[1]) - 1e-12 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-12;
  const inter = (p1, p2, p3, p4) => {
    const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    if (d1 === 0 && onSeg(p3, p4, p1)) return true;
    if (d2 === 0 && onSeg(p3, p4, p2)) return true;
    if (d3 === 0 && onSeg(p1, p2, p3)) return true;
    if (d4 === 0 && onSeg(p1, p2, p4)) return true;
    return false;
  };
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if (a[0] === b[0] && a[1] === b[1]) return false;
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) {
        // adjacent: they share a vertex; reject only a fold-back (collinear, overlapping)
        const c = j === i + 1 ? poly[(j + 1) % n] : poly[n - 1];
        const s = j === i + 1 ? b : a, o = j === i + 1 ? a : b;
        const cr = orient(o, s, c);
        if (cr === 0 && ((s[0] - o[0]) * (c[0] - s[0]) + (s[1] - o[1]) * (c[1] - s[1])) < 0) return false;
        continue;
      }
      if (inter(a, b, poly[j], poly[(j + 1) % n])) return false;
    }
  }
  return true;
}

/* CLEARANCE: simple is not enough. An outline that nearly touches itself is
   simple and still pinches the wing into a neck a printer cannot hold, and a
   cut-safe raster splits there (the first interpolation repair, which eased
   only to "just simple", left a 0.012 mm neck and a 3-region cut file). Every
   point must stand at least OUTLINE_CLEARANCE (units of the wing's length) from
   every part of the outline more than 4x that away along the curve. A sharp
   tip passes down to an included angle of about 29 degrees. */
export const OUTLINE_CLEARANCE = 0.008;
/* It was 0.015 until the drawn-width FLOOR existed (PR #326, second ruling).
   With a real floor in millimetres, clearance only has to keep an outline from
   nearly touching itself; a narrow-but-real feature (a thin tail neck) must be
   drawable so the floor can show it red and refuse the STL. At 0.015 a 0.4 mm
   neck on a 20 mm wing could not be drawn at all — the editor blocked it as a
   pinch before the floor ever saw it. */
export function polygonClear(poly, c = OUTLINE_CLEARANCE) {
  const n = poly.length, cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + dist2(poly[i - 1], poly[i % n]));
  const per = cum[n], sep = 4 * c;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    for (let j = 0; j < n; j++) {
      // arc distance from point i to segment j (its nearer end), the shorter way round
      const d0 = Math.abs(cum[j] - cum[i]), d1 = Math.abs(cum[j + 1] - cum[i]);
      const arc = Math.min(Math.min(d0, per - d0), Math.min(d1, per - d1));
      if (arc <= sep) continue;
      const a = poly[j], b = poly[(j + 1) % n], ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12;
      const t = clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2, 0, 1);
      if (dist2(p, lerp2(a, b, t)) < c) return false;
    }
  }
  return true;
}
const outlineOk = (dense) => polygonSimple(dense) && polygonClear(dense);   // last->first edge IS the root chord

/* Validity of a control-point outline: the rule the editor enforces on every
   drag, add and delete, and the rule a loaded file must pass. */
export function outlineValid(points) {
  if (!Array.isArray(points) || points.length < MIN_OUTLINE_POINTS) return { ok: false, reason: `needs at least ${MIN_OUTLINE_POINTS} points` };
  for (const q of points) if (!Array.isArray(q) || q.length !== 2 || !Number.isFinite(q[0]) || !Number.isFinite(q[1])) return { ok: false, reason: 'a point is not a number pair' };
  const n = points.length;
  if (points[0][0] !== 0 || points[n - 1][0] !== 0) return { ok: false, reason: 'the root points must sit at u = 0' };
  if (points[0][1] - points[n - 1][1] < MIN_ROOT_CHORD) return { ok: false, reason: 'the root lead must sit ahead of the root trail' };
  const { u, w } = OUTLINE_BOUNDS;
  for (const [a, b] of points) if (a < u[0] - 1e-9 || a > u[1] + 1e-9 || b < w[0] - 1e-9 || b > w[1] + 1e-9) return { ok: false, reason: 'a point is outside the drawing area' };
  for (let i = 0; i + 1 < n; i++) if (dist2(points[i], points[i + 1]) < MIN_POINT_GAP) return { ok: false, reason: 'two neighbouring points coincide' };
  const dense = sampleOutline(points);
  if (!polygonSimple(dense)) return { ok: false, reason: 'the outline would cross itself' };
  if (!polygonClear(dense)) return { ok: false, reason: 'the outline would pinch (nearly touch itself)' };
  return { ok: true };
}

const clampOutlinePoint = (q, root) => {
  const { u, w } = OUTLINE_BOUNDS;
  return [root ? 0 : clamp(q[0], u[0], u[1]), clamp(q[1], w[0], w[1])];
};

/* Editor operations. Each returns { ok, points, reason }: an operation that
   would make the outline invalid (a self-crossing above all) is BLOCKED — the
   points come back unchanged. The editor shows the reason. */
export function moveControlPoint(points, i, q) {
  const next = points.map((p) => p.slice());
  next[i] = clampOutlinePoint(q, i === 0 || i === points.length - 1);
  const v = outlineValid(next);
  return v.ok ? { ok: true, points: next } : { ok: false, points, reason: v.reason };
}
export function insertControlPoint(points, q) {
  // insert into the control segment whose curve passes nearest q
  const dense = sampleOutline(points);
  let best = Infinity, seg = 0;
  for (let k = 0; k + 1 < dense.length; k++) {
    const a = dense[k], b = dense[k + 1];
    const ab = sub2(b, a), L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1e-12;
    const t = clamp(((q[0] - a[0]) * ab[0] + (q[1] - a[1]) * ab[1]) / L2, 0, 1);
    const d = dist2(q, lerp2(a, b, t));
    if (d < best) { best = d; seg = Math.floor(k / CR_SAMPLES); }
  }
  const next = points.map((p) => p.slice());
  next.splice(seg + 1, 0, clampOutlinePoint(q, false));
  const v = outlineValid(next);
  return v.ok ? { ok: true, points: next, index: seg + 1 } : { ok: false, points, reason: v.reason };
}
export function deleteControlPoint(points, i) {
  if (i === 0 || i === points.length - 1) return { ok: false, points, reason: 'the root points cannot be deleted' };
  const next = points.filter((_, k) => k !== i);
  const v = outlineValid(next);
  return v.ok ? { ok: true, points: next } : { ok: false, points, reason: v.reason };
}

/* Resample a dense open curve to 2M+1 points by arc length, apex aligned: the
   leading half (root lead -> apex) and the trailing half (apex -> root trail)
   are resampled separately, so two outlines with different point counts — and
   different apex positions along their arc — correspond apex to apex. */
export function resampleApexAligned(dense, M = INTERP_SAMPLES) {
  let apex = 0;
  for (let k = 1; k < dense.length; k++) if (dense[k][0] > dense[apex][0]) apex = k;
  const half = (pts) => {
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist2(pts[k - 1], pts[k]));
    const L = cum[cum.length - 1], out = [];
    let j = 0;
    for (let m = 0; m <= M; m++) {
      const s = (L * m) / M;
      while (j + 1 < cum.length - 1 && cum[j + 1] < s) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      out.push(m === M ? pts[pts.length - 1].slice() : lerp2(pts[j], pts[j + 1], (s - cum[j]) / seg));
    }
    out[0] = pts[0].slice();
    return out;
  };
  const a = half(dense.slice(0, apex + 1)), b = half(dense.slice(apex));
  return a.concat(b.slice(1));
}

/* A middle pair's dense outline: the first and last pairs' curves, resampled
   apex-aligned, mixed at t. If the mix crosses itself (two simple outlines can
   blend into a crossing one), it is REPAIRED by easing t toward the nearer drawn
   pair until it is simple AND clear (see OUTLINE_CLEARANCE) — reported, never
   silent. */
export function interpolatedOutline(firstPts, lastPts, t) {
  const A = resampleApexAligned(sampleOutline(firstPts));
  const B = resampleApexAligned(sampleOutline(lastPts));
  const mix = (s) => A.map((a, k) => [a[0] + (B[k][0] - a[0]) * s, a[1] + (B[k][1] - a[1]) * s]);
  // whether the blend crosses, and how far it is eased if it does, are read
  // off the raw mix (unchanged); what is DRAWN is that mix re-expressed as
  // control points (one more than the denser drawn pair) through the same
  // spline as every drawn outline (§13.3): the raw per-sample mix of two
  // detailed margins (the wing-shape library's) came out as 1.6 mm chords
  // zig-zagging 20 degrees, and resampled finer it kept lobes under the floor
  // on a small wing — the J clause on both. Unlinking the pair starts from
  // exactly these points. If the re-expression is not itself simple and clear,
  // the raw mix is drawn, as before.
  const K = Math.max(firstPts.length, lastPts.length) + 1;
  const drawn = (raw, tUsed, repaired) => {
    const ctrl = controlPointsFromDense(raw, K), dense = sampleOutline(ctrl);
    return outlineOk(dense) ? { dense, ctrl, tUsed, repaired } : { dense: raw, ctrl: null, tUsed, repaired };
  };
  const c = mix(t);
  if (outlineOk(c)) return drawn(c, t, false);
  const end = t < 0.5 ? 0 : 1;
  let good = end, bad = t;                       // the endpoint passes: it is a validated drawn outline
  for (let k = 0; k < 30; k++) { const m = (good + bad) / 2; if (outlineOk(mix(m))) good = m; else bad = m; }
  return drawn(mix(good), good, true);
}

/* Control points that reproduce a dense curve: used when a middle pair is
   UNLINKED, so it starts from exactly what was on screen. K points, apex kept. */
export function controlPointsFromDense(dense, K) {
  let apex = 0;
  for (let k = 1; k < dense.length; k++) if (dense[k][0] > dense[apex][0]) apex = k;
  const lenOf = (pts) => pts.reduce((s, p, i) => (i ? s + dist2(pts[i - 1], p) : 0), 0);
  const La = lenOf(dense.slice(0, apex + 1)), Lb = lenOf(dense.slice(apex));
  const interior = Math.max(2, K - 2);                       // apex + others
  const na = clamp(Math.round(((interior - 1) * La) / (La + Lb)), 0, interior - 1);
  const nb = interior - 1 - na;
  const pick = (pts, n) => {                                  // n points strictly inside pts, by arc length
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + dist2(pts[k - 1], pts[k]));
    const L = cum[cum.length - 1], out = [];
    for (let m = 1; m <= n; m++) {
      const s = (L * m) / (n + 1);
      let j = 0; while (j + 1 < cum.length - 1 && cum[j + 1] < s) j++;
      out.push(lerp2(pts[j], pts[j + 1], (s - cum[j]) / (cum[j + 1] - cum[j] || 1)));
    }
    return out;
  };
  const r = (q) => [+q[0].toFixed(4), +q[1].toFixed(4)];
  const pts = [[0, dense[0][1]], ...pick(dense.slice(0, apex + 1), na), dense[apex], ...pick(dense.slice(apex), nb), [0, dense[dense.length - 1][1]]].map(r);
  pts[0][0] = 0; pts[pts.length - 1][0] = 0;
  return pts;
}

/* ------------------------------------------------------------------ */
/* The TAIL: a tagged group of control points in the BOTTOM pair's outline */
/* ------------------------------------------------------------------ */

/* Eva's ruling (PR #326): the hindwing tail is part of the wing OUTLINE, not a
   separate solid, behind a TAIL toggle on the BOTTOM pair only (the last pair,
   or the only pair of one). The tail is stored ONCE, at the wings level:
     wings.tail = { on, anchorU, points }
   - `points` are OFFSETS (units of the bottom pair's length) from the ANCHOR —
     the point where the trailing edge crosses u = anchorU — in the MARGIN'S
     OWN FRAME: [a, b] = a along the trailing edge (toward the root), b along
     its outward normal. Ordered from the outer side of the tail, round its
     end, back to the inner side. (Plain (u, w) offsets were tried first: a
     tail moved to a pair whose margin slopes differently had its roots land
     INSIDE the wing and was refused — the margin frame keeps it hanging off
     the edge on any pair.)
   - The bottom pair's own control points (`base`) never contain the tail. The
     outline the builder draws is composed: base up to the anchor's control
     segment, then the tail points (anchor + offset), then the rest of base.
   This is the tag, structurally: a tail point can only exist in `tail.points`,
   so OFF drops exactly those and nothing else, ON brings back the edited group
   (it was never deleted), a base edit cannot absorb a tail point, and the
   first<->last blend reads `first.points` / `last.points` — the tail-less
   bases — so a middle pair cannot inherit any part of a tail. Changing the pair
   count moves the group with its edits, because it belongs to no pair: it is
   composed onto whichever pair is the bottom one, at the same anchorU. */
export const STARTER_TAIL = {
  on: false,
  anchorU: 0.6,
  // spatulate swallowtail, [along, outward]: a neck 0.08 wide widening to a rounded paddle
  points: [[-0.05, -0.005], [-0.075, 0.13], [-0.085, 0.25], [-0.14, 0.31], [-0.13, 0.4], [-0.06, 0.44], [0.005, 0.36], [-0.005, 0.25], [0.005, 0.13], [0.045, -0.005]],
};
export const MIN_TAIL_POINTS = 2;
DEFAULT_WINGS.tail = JSON.parse(JSON.stringify(STARTER_TAIL));
LEGACY_DEFAULT_WINGS.tail = JSON.parse(JSON.stringify(STARTER_TAIL));
/* The Phase 1/2 default bug, whole: the cute end of every control. */
export function legacyDefaultParams() {
  const p = clone(DEFAULTS);
  Object.assign(p, LEGACY_BODY, LEGACY_STYLE);
  p.wings = clone(LEGACY_DEFAULT_WINGS);
  return p;
}

/* The anchor on a base outline: where its TRAILING half (apex -> root trail)
   first reaches u = anchorU, and the base control segment that holds it. */
export function tailAnchor(base, anchorU) {
  const dense = sampleOutline(base);
  let apex = 0; for (let k = 1; k < dense.length; k++) if (dense[k][0] > dense[apex][0]) apex = k;
  const u = clamp(anchorU, dense[dense.length - 1][0], dense[apex][0]);
  let j = apex;
  while (j + 1 < dense.length - 1 && dense[j + 1][0] > u) j++;
  const a = dense[j], b = dense[j + 1], t = b[0] === a[0] ? 0 : (u - a[0]) / (b[0] - a[0]);
  // the margin's frame there: tangent along the curve's own direction (apex ->
  // root trail), outward normal = the tangent turned a quarter clockwise-out
  // (the outline runs clockwise in (u, w))
  const j0 = Math.max(0, j - 2), j1 = Math.min(dense.length - 1, j + 3);
  const tx = dense[j1][0] - dense[j0][0], ty = dense[j1][1] - dense[j0][1], tl = Math.hypot(tx, ty) || 1;
  const T = [tx / tl, ty / tl], N = [-T[1], T[0]];
  return { point: lerp2(a, b, clamp(t, 0, 1)), seg: Math.min(base.length - 2, Math.floor(j / CR_SAMPLES)), T, N };
}
const fromFrame = (A, [a, b]) => [A.point[0] + a * A.T[0] + b * A.N[0], A.point[1] + a * A.T[1] + b * A.N[1]];
const toFrame = (A, q) => { const d = [q[0] - A.point[0], q[1] - A.point[1]]; return [d[0] * A.T[0] + d[1] * A.T[1], d[0] * A.N[0] + d[1] * A.N[1]]; };

/* Compose the drawn outline: base, or base with the tail group spliced in.
   Returns the points and a parallel tag array ('base' | 'tail') with each
   point's index in its own group. */
export function composeOutline(base, tail) {
  if (!tail || !tail.on || !tail.points.length) return { points: base.map((q) => q.slice()), tags: base.map((_, i) => ['base', i]), anchor: null };
  const A = tailAnchor(base, tail.anchorU);
  const tp = tail.points.map((ab) => fromFrame(A, ab));
  const points = [...base.slice(0, A.seg + 1).map((q) => q.slice()), ...tp, ...base.slice(A.seg + 1).map((q) => q.slice())];
  const tags = [...base.slice(0, A.seg + 1).map((_, i) => ['base', i]), ...tp.map((_, i) => ['tail', i]), ...base.slice(A.seg + 1).map((_, i) => ['base', A.seg + 1 + i])];
  return { points, tags, anchor: A };
}

/* Editor operations on the BOTTOM pair with its tail: they act on the composed
   outline the editor shows, write back into base or tail by tag, and are
   validated on the composed outline that WOULD result. A base edit keeps the
   tail's offsets, so the tail rides the margin it hangs from. */
export function moveComposed(base, tail, i, q) {
  const c = composeOutline(base, tail), [kind, j] = c.tags[i];
  if (kind === 'tail') {
    const nt = { ...tail, points: tail.points.map((p) => p.slice()) };
    const qq = clampOutlinePoint(q, false);
    nt.points[j] = toFrame(c.anchor, qq);
    const v = outlineValid(composeOutline(base, nt).points, true);
    return v.ok ? { ok: true, base, tail: nt } : { ok: false, base, tail, reason: v.reason };
  }
  const nb = base.map((p) => p.slice());
  nb[j] = clampOutlinePoint(q, j === 0 || j === base.length - 1);
  const vb = outlineValid(nb);
  if (!vb.ok) return { ok: false, base, tail, reason: vb.reason };
  const v = outlineValid(composeOutline(nb, tail).points, true);
  return v.ok ? { ok: true, base: nb, tail } : { ok: false, base, tail, reason: v.reason };
}
export function insertComposed(base, tail, q) {
  const c = composeOutline(base, tail);
  const r = insertControlPoint(c.points, q, true);
  if (!r.ok) return { ok: false, base, tail, reason: r.reason };
  const i = r.index;                                   // the new point sits between c.points[i-1] and c.points[i]
  const before = c.tags[i - 1], after = c.tags[i];
  if (before[0] === 'tail' && after && after[0] === 'tail') {
    const nt = { ...tail, points: tail.points.map((p) => p.slice()) };
    nt.points.splice(after[1], 0, toFrame(c.anchor, r.points[i]));
    return { ok: true, base, tail: nt, index: i };
  }
  // a base point: its base index is the count of base points before it
  const bi = c.tags.slice(0, i).filter((t) => t[0] === 'base').length;
  const nb = base.map((p) => p.slice()); nb.splice(bi, 0, r.points[i].slice());
  if (!outlineValid(nb).ok || !outlineValid(composeOutline(nb, tail).points, true).ok) return { ok: false, base, tail, reason: 'the point would move the tail off a valid outline' };
  return { ok: true, base: nb, tail, index: i };
}
export function deleteComposed(base, tail, i) {
  const c = composeOutline(base, tail), [kind, j] = c.tags[i];
  if (kind === 'tail') {
    if (tail.points.length <= MIN_TAIL_POINTS) return { ok: false, base, tail, reason: `a tail keeps at least ${MIN_TAIL_POINTS} points — turn TAIL off to remove it` };
    const nt = { ...tail, points: tail.points.filter((_, k) => k !== j) };
    const v = outlineValid(composeOutline(base, nt).points, true);
    return v.ok ? { ok: true, base, tail: nt } : { ok: false, base, tail, reason: v.reason };
  }
  const r = deleteControlPoint(base, j);
  if (!r.ok) return { ok: false, base, tail, reason: r.reason };
  const v = outlineValid(composeOutline(r.points, tail).points, true);
  return v.ok ? { ok: true, base: r.points, tail } : { ok: false, base, tail, reason: v.reason };
}

/* Saved designs written before the tail ruling carried the old tail SLIDERS
   (tailLength / tailWidth / tailClub, mm). They migrate into a tagged group
   that draws the same tail: the old builder hung a strap from the trailing
   edge at 0.78 of the span, 20 degrees outward-backward, `tailWidth` wide,
   tailLength + tailWidth long, swelling into a club near its end. The strap's
   two edges and its rounded end become control points (offsets from the
   anchor, in units of the bottom pair's length). Exact to the old solid only
   up to the spline through those points; reported in the load notes. */
export function migrateOldTail(old, bottomLength) {
  const L = Math.max(1e-6, bottomLength);
  const tw = Math.max(0.5, +old.tailWidth || 2.4), len = (+old.tailLength || 0) + tw, club = clamp(+old.tailClub || 0, 0, 1);
  const a = 20 * D2R, d = [Math.sin(a), -Math.cos(a)], q = [Math.cos(a), Math.sin(a)];
  const hw = (s) => {
    let h = (tw / 2) * (1 - 0.35 * s) * (1 + club * 1.6 * Math.exp(-(((s - 0.86) / 0.1) ** 2)));
    return Math.max(h, 0.3);
  };
  const S = [0.15, 0.5, 0.8, 0.92];
  const at = (s, side) => [(d[0] * s * len + side * q[0] * hw(s)) / L, (d[1] * s * len + side * q[1] * hw(s)) / L];
  const pts = [[(q[0] * tw / 2) / L, 0], ...S.map((s) => at(s, 1)), [(d[0] * len) / L, (d[1] * len) / L], ...S.slice().reverse().map((s) => at(s, -1)), [-(q[0] * tw / 2) / L, 0]];
  // the old strap's direction was fixed in (u, w); the new group is stored in the
  // margin frame, read as if the margin ran straight back toward the root
  // (along -u, outward -w) — exact on a level trailing edge, rotated with the
  // margin elsewhere, which is the point of the frame
  return { on: true, anchorU: MIGRATED_TAIL_ANCHOR, points: pts.map(([u, w]) => [+(-u).toFixed(4), +(-w).toFixed(4)]) };
}
/* The old strap hung at 0.78 of the span; the group anchors at the starter's
   0.6 instead, because on the default outline 0.78 lands ON a base control
   point (a coincident neighbour) and pushes a long strap past the drawing
   area. If the migrated group still does not fit the bottom pair it is
   SCALED DOWN about its anchor until it does, and the note says by how much
   — a migrated design never silently loses its tail. */
export const MIGRATED_TAIL_ANCHOR = 0.6;
export function fitMigratedTail(base, tail) {
  for (let f = 1; f > 0.2; f = +(f - 0.05).toFixed(2)) {
    const t = { ...tail, points: tail.points.map(([a, b]) => [+(a * f).toFixed(4), +(b * f).toFixed(4)]) };
    if (outlineValid(composeOutline(base, t).points).ok) return { tail: t, scale: f };
  }
  return { tail, scale: null };
}

/* The N wing pairs, resolved: pair 0 is the drawn FIRST pair, pair N-1 the
   drawn LAST pair, every pair between interpolates both (outline AND scalar
   fields) unless it is UNLINKED, when it carries its own drawn spec. */
export function resolveWingPairs(p) {
  const out = resolveWingPairsRaw(p);
  if (out.length && p.wingRootPinch > 0) {
    const L = bodyLayout(p), H = wingHinges(p, L);
    for (const spec of out) {
      // the body's silhouette from the hinge: the hinge stands at half the
      // thorax's local half-width, so the silhouette is that far again (not
      // divided by the sweep's cosine: the sweep is DERIVED from this outline by
      // the specimen pose, and a root that moved with the sweep would make the
      // pose chase its own tail)
      const k = H[spec.index].k;
      spec.root = { pinch: p.wingRootPinch, length: p.wingRootLength ?? 1, filletScale: 1, floor: p.minDiameter, ub: 0.5 * L.rt * k };
    }
  }
  return out;
}
function resolveWingPairsRaw(p) {
  const N = p.wingPairs, W = p.wings, out = [];
  for (let k = 0; k < N; k++) {
    const role = k === 0 ? 'first' : k === N - 1 ? 'last' : 'mid';
    if (role !== 'mid') {
      // the BOTTOM pair (last, or the only pair) carries the tail group
      let comp = composeOutline(W[role].points, k === N - 1 ? W.tail : null), tailFits = true;
      if (comp.anchor && !outlineValid(comp.points).ok) { comp = composeOutline(W[role].points, null); tailFits = false; }
      out.push({ index: k, role, linked: false, ...W[role], drawn: comp.points, tags: comp.tags, dense: sampleOutline(comp.points), repaired: false, tailFits, hasTail: !!comp.anchor });
      continue;
    }
    const own = W.unlinked && W.unlinked[k];
    if (own) { out.push({ index: k, role, linked: false, ...own, dense: sampleOutline(own.points), repaired: false }); continue; }
    const t = k / (N - 1);
    const io = interpolatedOutline(W.first.points, W.last.points, t);
    const s = {};
    for (const f of WING_FIELDS) {
      const v = lerp(W.first[f.id], W.last[f.id], t);
      s[f.id] = f.step >= 1 ? Math.round(v) : v;   // integer-stepped fields (scallop count, vein count, branching, the two on/off flags) round
    }
    out.push({ index: k, role, linked: true, t, ...s, points: null, ctrl: io.ctrl, dense: io.dense, repaired: io.repaired, tUsed: io.tUsed });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Randomize — ranges chosen to produce plausible bugs most of the time */
/* ------------------------------------------------------------------ */

/* mulberry32 — the page's Randomize button and the contact sheet share it. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The ranges, as data, so the page and the design doc report the same table.
   Lengths of limbs and wings are multiples of the THORAX length so a bug's
   proportions hold together at any size. */
export const RANDOM_RANGES = {
  threePartChance: 0.8,
  wingPairWeights: { 0: 0.08, 1: 0.12, 2: 0.6, 3: 0.12, 4: 0.08 },   // 3-part only; a 2-part bug gets 0
  antennaNoneChance: 0.1,                                              // 3-part only; a 2-part bug gets none
  roundness: [1.8, 3],
  headSize: [2.6, 6.5],
  thoraxLength: [4.5, 11], thoraxWidth: [3.5, 8.5], thoraxDepthOfWidth: [0.75, 1.05],
  abdomenLengthOfThorax: { 3: [1.4, 4.2], 2: [1.1, 1.8] },
  abdomenWidthOfThorax: { 3: [0.55, 1.25], 2: [1.0, 1.6] },
  abdomenTaper: [0.2, 0.8], abdomenSegments: { 3: [4, 10], 2: [1, 3] }, bandingChance: 0.5,
  legPairs: { 3: 3, 2: 4 },
  // tucked or splayed, never the half-way pose: a mid reach reads as stubs
  // poking out from under the wings (the Phase 1 sheet's butterfly complaint)
  legTuckedChance: { 3: 0.3, 2: 0 }, legReach: [0.75, 1],
  coxa: [0.8, 2], femurOfThorax: { 3: [0.5, 1.3], 2: [0.9, 1.6] }, tibiaOfFemur: [0.9, 1.25], tarsusOfFemur: [0.5, 1.0],
  legSplay: [20, 55], legBend: [25, 70], legTaper: [0.3, 0.7],
  antennaLengthOfHead: [1.2, 4.5], antennaCurl: [-30, 70], antennaSpread: [12, 45],
  wingLengthOfThorax: [2.2, 4.8], lastWingOfFirst: [0.6, 1.0],
  wingStretch: [0.75, 1.35], firstSweep: [-12, 20], lastSweep: [12, 50],
  scallopChance: 0.3, scallop: [0.05, 0.2], wingThickness: [1.0, 1.5],
  dihedral: [-5, 25], pitch: [-8, 8],
  tailChance: 0.2,   // TAIL on the bottom pair with the starter shape, when it fits that outline
};

function randomOutline(r) {
  // Star-shaped about (0.5, 0): control points ordered by angle are a simple
  // polygon, and the centripetal spline through them stays simple — checked,
  // and redrawn if not.
  for (let attempt = 0; attempt < 50; attempt++) {
    const top = 0.12 + 0.18 * r(), bot = 0.14 + 0.28 * r(), lean = (r() - 0.5) * 0.18;
    const n = 4 + Math.floor(r() * 4);                       // interior points
    const pts = [[0, +(0.06 + 0.08 * r()).toFixed(3)]];
    for (let k = 0; k < n; k++) {
      const th = Math.PI * (0.78 - (1.56 * (k + 0.5)) / n);  // from upper-left round to lower-left
      const b = th > 0 ? top : bot;
      const rr = 1 + (r() - 0.5) * 0.22;
      const u = 0.5 + 0.5 * Math.cos(th) * rr;
      const w = (Math.sin(th) * b + lean * Math.cos(th)) * rr;
      pts.push([+clamp(u, 0.05, 1.15).toFixed(3), +clamp(w, -0.6, 0.6).toFixed(3)]);
    }
    pts.push([0, -+(0.06 + 0.1 * r()).toFixed(3)]);
    if (outlineValid(pts).ok) return pts;
  }
  return DEFAULT_WINGS.first.points.map((q) => q.slice());
}

/* ------------------------------------------------------------------ */
/* The WING-SHAPE LIBRARY: apply, blend, randomize (design doc §13)      */
/* ------------------------------------------------------------------ */

/* What applying a library shape may write, and NOTHING else (the gate's AP
   clause holds every other byte of the params to this list):
     wings.first.points / .stretch / .sweep / .scallop — the forewing outline as fitted
     wings.last.points / .stretch / .sweep / .scallop / .length — the hindwing outline,
       its length as the shape's ratio of the forewing's (the forewing keeps
       the length the bug already has)
     wings.unlinked — cleared, so 3–4 pairs' middles BLEND between the two
     wings.tail — the shape's tail group, on; or, for a shape with none, the
       bug's own tail group switched off (its points are kept, not deleted)
   Sweep is 0 because the outline was fitted at sweep 0: the orientation is IN
   the points. Scallop depth is 0 for the same reason: a fitted outline carries
   its OWN margin, and the procedural scallop would cut a second one into it
   (on the default bug's 0.06 hindwing scallop that read as 9 "scallop reduced"
   repairs over 17 shapes and put shape #1 under the floor). Its count is kept. The pair count, every per-pair field below the outline (scallop,
   thickness, tilt, venation) and every body / leg / antenna control are left
   alone — there are no whole-bug presets. */
/* A library wing is stored at ANGLE 0 (`points`, its outline turned onto its
   own axis) with the angle it was found at (`sweep`, degrees, wingAngleOf's
   convention — NOT the pair's sweep field, which stays 0). Posing it is one
   rotateWingBlade: an ordinary outline, root anchors on u = 0 untouched. A
   shape whose points are already posed (a blend) carries sweep 0, and posing
   it is the identity. A pose the outline rule refuses throws: every library
   shape is held valid at its own angle by the gate (WA1). */
export function posedWing(w) {
  const r = rotateWingBlade(w.points, w.stretch, w.sweep || 0);
  if (!r.ok) throw new Error(`a library wing cannot be posed at ${w.sweep} deg: ${r.reason}`);
  return r;
}
export const WING_SHAPE_WRITES = { first: ['points', 'stretch', 'sweep', 'scallop'], last: ['points', 'stretch', 'sweep', 'scallop', 'length'], wings: ['unlinked', 'tail'] };
export function applyWingShape(params, shape) {
  const p = clone(params);
  const W = p.wings, lf = WING_FIELDS.find((f) => f.id === 'length');
  const fore = posedWing(shape.fore), hind = posedWing(shape.hind);
  W.first.points = fore.points; W.first.stretch = fore.stretch; W.first.sweep = 0; W.first.scallop = 0;
  W.last.points = hind.points; W.last.stretch = hind.stretch; W.last.sweep = 0; W.last.scallop = 0;
  W.last.length = +clamp(W.first.length * shape.hind.lengthRatio, lf.min, lf.max).toFixed(3);
  W.unlinked = {};
  W.tail = shape.tail ? clone({ ...shape.tail, on: true }) : W.tail ? { ...clone(W.tail), on: false } : clone({ ...STARTER_TAIL, on: false });
  return p;
}

/* WING ANGLE (Eva's "tilt"; on this page it is a SWEEP-like angle in the
   top-down plane, NOT the pair's sweep field and never dihedral or pitch).
   Convention, one for every wing: in TRUE planform (u, w x stretch — units of
   the wing's own length, isotropic) the wing's AXIS runs from the hinge (0, 0)
   to the arc-length centroid of the drawn outline BEYOND the root bridge (the
   blade; the tail group is not part of it); the angle is that axis's angle
   from the span direction (+u, square to the body), POSITIVE BACKWARD (toward
   the tail) — the sign of the sweep field. (A farthest-point axis was tried
   first and dropped: two near-identical wings read 8 deg apart because their
   farthest points sat on different lobes.)

   rotateWingBlade turns a drawn outline by `deg` about the hinge and returns
   an ORDINARY outline: each control point rotates by deg x ramp(r), r its
   distance from the hinge in lengths — 0 inside WING_ANGLE_RAMP[0] (the root
   anchors stay on u = 0, the root chord square to the body), 1 beyond
   WING_ANGLE_RAMP[1] (the blade turns rigidly), a smoothstep between (the root
   bridge, tangent-continuous at both ends). Because a rotation about the hinge
   keeps r, two turns add exactly: rotate(rotate(P, a), b) = rotate(P, a + b).
   The builder never sees anything but the result: buildBug is untouched.
   A chord stretch too small for the turned outline is RAISED (the true shape
   is unchanged); a turn that leaves the drawing area (u < 0: into the body) or
   makes the outline invalid is refused with the outline's own reason. A tail
   group follows the margin: its anchor is re-found at the turned anchor point. */
export const WING_ANGLE_RAMP = [0.06, 0.3];
export const WING_ANGLE_RANGE = [-20, 20];   // offset from the measured angle the control allows (design doc §14)
const rampAt = (r) => { const t = clamp((r - WING_ANGLE_RAMP[0]) / (WING_ANGLE_RAMP[1] - WING_ANGLE_RAMP[0]), 0, 1); return t * t * (3 - 2 * t); /* the root bridge */ };
export function wingAngleOf(points, stretch) {
  // the BLADE's axis: the arc-length centroid of the drawn outline beyond the
  // root bridge (r > WING_ANGLE_RAMP[1]), which turns rigidly with the blade
  const d = sampleOutline(points).map(([u, w]) => [u, w * stretch]);
  let cu = 0, cb = 0;
  for (let k = 0; k + 1 < d.length; k++) {
    const a = d[k], b = d[k + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (Math.hypot(m[0], m[1]) <= WING_ANGLE_RAMP[1]) continue;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]); cu += l * m[0]; cb += l * m[1];
  }
  return Math.atan2(-cb, cu) / D2R;
}
/* set a wing to an ABSOLUTE angle: turn by the difference, then correct the
   small residual (the spline is drawn in (u, w), so a turn in true planform is
   not exactly a turn of the drawn curve when the stretch is not 1) — two
   corrections land within 0.01 deg */
export function setWingAngle(points, stretch, deg, tail = null) {
  let r = { ok: true, points, stretch, tail };
  for (let it = 0; it < 3; it++) {
    const d = deg - wingAngleOf(r.points, r.stretch);
    if (Math.abs(d) < 0.005) break;
    const n = rotateWingBlade(r.points, r.stretch, d, r.tail);
    if (!n.ok) return n;
    r = n;
  }
  return r;
}
function turnPoints(points, stretch, deg) {
  return points.map(([u, w]) => {
    const b = w * stretch, r = Math.hypot(u, b), a = deg * D2R * rampAt(r);
    if (a === 0) return [u, b];
    const c = Math.cos(a), s = Math.sin(a);
    return [u * c + b * s, -u * s + b * c];
  });
}
/* the raw turn, NOT validated and not clamped to the drawing area: the
   library's canonical outlines (turned to angle 0) are made with it */
export function turnWingRaw(points, stretch, deg) {
  return turnPoints(points, stretch, deg).map(([u, b], k) => [k === 0 || k === points.length - 1 ? 0 : u, b / stretch]);
}
export function rotateWingBlade(points, stretch, deg, tail = null) {
  if (deg === 0) return { ok: true, points: points.map((q) => q.slice()), stretch, tail: tail ? clone(tail) : null };
  const T = turnPoints(points, stretch, deg);
  // the tail's own drawn points turn too (beyond the bridge: rigidly), and
  // count for the drawing area
  const C = tail && tail.points && tail.points.length ? composeOutline(points, { ...tail, on: true }) : null;
  const TT = C ? turnPoints([C.anchor.point, ...C.points.filter((_, k) => C.tags[k][0] === 'tail')], stretch, deg) : [];
  const { u: UB, w: WB } = OUTLINE_BOUNDS;
  for (const [u] of [...T, ...TT]) if (u < UB[0] - 1e-9) return { ok: false, reason: 'the turned wing would reach into the body (u < 0)' };
  for (const [u] of [...T, ...TT]) if (u > UB[1]) return { ok: false, reason: 'the turned wing is longer than the drawing area' };
  let S = stretch;
  for (const [, b] of [...T, ...TT.slice(1)]) S = Math.max(S, b > 0 ? b / WB[1] : -b / -WB[0]);
  if (S !== stretch) S = Math.ceil(S * 1e4) / 1e4;
  const out = T.map(([u, b], k) => [k === 0 || k === T.length - 1 ? 0 : +u.toFixed(5), clamp(+(b / S).toFixed(5), WB[0], WB[1])]);
  const v = outlineValid(out);
  if (!v.ok) return { ok: false, reason: v.reason };
  let nt = null;
  if (C) {
    // re-anchored on the turned margin at the turned anchor point, and the
    // offsets re-read in THAT anchor's frame: the frame is re-derived from the
    // margin's own tangent window, so offsets carried over unchanged would
    // swing with it (2.6 deg, 0.59 mm at #16's tail tip, from a 1e-5 nudge)
    const tp = TT.map(([u, b]) => [u, b / S]);
    const A = tailAnchor(out, tp[0][0]);
    if (A.seg !== C.anchor.seg || Math.hypot(A.point[0] - tp[0][0], (A.point[1] - tp[0][1]) * S) > 0.01) return { ok: false, reason: 'the tail anchor cannot be re-found on the turned margin' };
    const toF = (q) => { const dx = q[0] - A.point[0], dy = q[1] - A.point[1]; return [dx * A.T[0] + dy * A.T[1], dx * A.N[0] + dy * A.N[1]]; };
    nt = { ...clone(tail), anchorU: tp[0][0], points: tp.slice(1).map(toF) };
    if (!outlineValid(composeOutline(out, { ...nt, on: true }).points).ok) return { ok: false, reason: 'the tail would cross the turned outline' };
  }
  return { ok: true, points: out, stretch: S, tail: nt };
}

/* A blend of two library shapes at t: each outline is resampled apex-aligned
   in TRUE planform (w x its own stretch, so two shapes drawn at different
   stretches mix as drawn, not as numbers), mixed, divided back by the mixed
   stretch and re-expressed as control points (one more than the denser of the
   two, so the blend keeps the detail). The tail is the NEARER shape's (a tail
   group's points cannot be mixed point for point with a shape that has none). */
export function blendWingShapes(a, b, t) {
  const mixOutline = (pa, sa, pb, sb, s) => {
    const A = resampleApexAligned(sampleOutline(pa)), B = resampleApexAligned(sampleOutline(pb));
    const dense = A.map((q, k) => [lerp(q[0], B[k][0], t), lerp(q[1] * sa, B[k][1] * sb, t) / s]);
    return controlPointsFromDense(dense, Math.max(pa.length, pb.length) + 1);
  };
  // each parent POSED at its own angle (as it is applied), so a blend mixes
  // the wings as they are drawn; the blend is stored posed, at sweep 0
  const pz = (s) => { const f = posedWing(s.fore), h = posedWing(s.hind); return { ...s, fore: { ...s.fore, points: f.points, stretch: f.stretch }, hind: { ...s.hind, points: h.points, stretch: h.stretch } }; };
  a = pz(a); b = pz(b);
  const fs = lerp(a.fore.stretch, b.fore.stretch, t), hs = lerp(a.hind.stretch, b.hind.stretch, t);
  const near = t < 0.5 ? a : b;
  return {
    fore: { stretch: +fs.toFixed(4), sweep: 0, points: mixOutline(a.fore.points, a.fore.stretch, b.fore.points, b.fore.stretch, fs) },
    hind: { stretch: +hs.toFixed(4), sweep: 0, lengthRatio: +lerp(a.hind.lengthRatio, b.hind.lengthRatio, t).toFixed(4), points: mixOutline(a.hind.points, a.hind.stretch, b.hind.points, b.hind.stretch, hs) },
    tail: near.tail ? clone(near.tail) : null,
  };
}

/* Why a wing shape on these params is NOT acceptable, or null. Invalid is what
   the brief names: an outline that crosses (or pinches) itself, a tail that
   would cross its outline, or a wing under the printable floor — read off the
   BUILT model (its floorViolations are the builder's own). */
export function wingShapeProblem(params, model) {
  const p = normalizeParams(params);
  for (const role of ['first', 'last']) { const v = outlineValid(p.wings[role].points); if (!v.ok) return `the ${role} outline is refused (${v.reason})`; }
  const pairs = resolveWingPairsRaw(p);
  for (const s of pairs) if (s.tailFits === false) return `the tail would cross pair ${s.index + 1}'s outline`;
  const m = model || buildBug(p);
  const thin = m.floorViolations;
  if (thin.length) return `pair ${thin[0].pair + 1} is under the ${p.minDiameter} mm floor`;
  return null;
}

/* RANDOMIZE WINGS: two different library shapes blended at a random t (two
   decimals, rounded BEFORE the blend, so the label is the t that was used),
   applied to the params; a blend wingShapeProblem() refuses is RE-ROLLED, up
   to `maxTries`, and if none passes, a plain library shape (each is held valid
   by the gate) is used and the label says so. Returns the params and the label. */
export const BLEND_T_RANGE = [0.1, 0.9];
export function randomWingBlend(params, seed, opts = {}) {
  const r = rng(seed), lib = opts.library || WING_LIBRARY, maxTries = opts.maxTries ?? 24, refused = [];
  for (let k = 0; k < maxTries; k++) {
    const i = Math.floor(r() * lib.length); let j = Math.floor(r() * (lib.length - 1)); if (j >= i) j++;
    const t = +(BLEND_T_RANGE[0] + (BLEND_T_RANGE[1] - BLEND_T_RANGE[0]) * r()).toFixed(2);
    const q = applyWingShape(params, blendWingShapes(lib[i], lib[j], t));
    const why = q.wingPairs > 0 ? wingShapeProblem(q) : null;
    if (!why) return { params: q, blend: { a: lib[i].id, b: lib[j].id, t, tries: k + 1, refused }, label: `blend of #${lib[i].id} and #${lib[j].id} at ${t.toFixed(2)}` };
    refused.push({ a: lib[i].id, b: lib[j].id, t, why });
  }
  for (const s of lib) {
    const q = applyWingShape(params, s);
    if (!(q.wingPairs > 0) || !wingShapeProblem(q)) return { params: q, blend: { a: s.id, b: s.id, t: 0, tries: maxTries, refused }, label: `#${s.id} (no blend passed in ${maxTries} tries)` };
  }
  return { params: clone(params), blend: null, refused, label: 'no library shape fits this bug' };
}

/* The whole-bug Randomize: the body, legs and antennae from RANDOM_RANGES, and
   the WING OUTLINES from the library — randomWingBlend(), the same function the
   RANDOMIZE WINGS button calls, seeded off this bug's own stream (design doc
   §13). randomParamsWithBlend also returns the blend's label for the page. */
export function randomParams(seed) { return randomParamsWithBlend(seed).params; }
export function randomParamsWithBlend(seed) {
  const r = rng(seed), K = RANDOM_RANGES;
  const U = ([a, b]) => a + (b - a) * r();
  const I = ([a, b]) => Math.round(U([a - 0.49, b + 0.49]));
  const p = defaultParams();
  const parts = r() < K.threePartChance ? '3' : '2';
  p.bodyParts = parts;
  p.roundness = U(K.roundness);
  p.headSize = U(K.headSize);
  p.thoraxLength = U(K.thoraxLength); p.thoraxWidth = U(K.thoraxWidth); p.thoraxDepth = p.thoraxWidth * U(K.thoraxDepthOfWidth);
  p.abdomenLength = p.thoraxLength * U(K.abdomenLengthOfThorax[parts]);
  p.abdomenWidth = p.thoraxWidth * U(K.abdomenWidthOfThorax[parts]);
  p.abdomenTaper = U(K.abdomenTaper); p.abdomenSegments = I(K.abdomenSegments[parts]); p.banding = r() < K.bandingChance;
  p.legPairs = K.legPairs[parts]; p.legsVisible = true; p.legReach = r() < K.legTuckedChance[parts] ? 0 : U(K.legReach);
  p.coxa = U(K.coxa); p.femur = p.thoraxLength * U(K.femurOfThorax[parts]); p.tibia = p.femur * U(K.tibiaOfFemur); p.tarsus = p.femur * U(K.tarsusOfFemur);
  p.legSplay = U(K.legSplay); p.legBend = U(K.legBend); p.legTaper = U(K.legTaper);
  if (parts === '2' || r() < K.antennaNoneChance) p.antennaType = 'none';
  else p.antennaType = ['clubbed', 'feathered', 'filiform', 'bristle'][Math.floor(r() * 4)];
  p.antennaLength = p.headSize * U(K.antennaLengthOfHead); p.antennaCurl = U(K.antennaCurl); p.antennaSpread = U(K.antennaSpread);
  let wp = 0;
  if (parts === '3') { let x = r(); for (const [k, w] of Object.entries(K.wingPairWeights)) { if (x < w) { wp = +k; break; } x -= w; } }
  p.wingPairs = wp;
  const wing = (first) => {
    const len = first ? p.thoraxLength * U(K.wingLengthOfThorax) : 0;
    return {
      points: randomOutline(r), length: len, stretch: U(K.wingStretch),
      sweep: U(first ? K.firstSweep : K.lastSweep),
      scallop: r() < K.scallopChance ? U(K.scallop) : 0, scallopCount: I([3, 9]),
      thickness: U(K.wingThickness), dihedral: U(K.dihedral), pitch: U(K.pitch),
    };
  };
  const f = wing(true), l = wing(false);
  l.length = f.length * U(K.lastWingOfFirst);
  p.wings = { first: f, last: l, unlinked: {}, tail: JSON.parse(JSON.stringify(STARTER_TAIL)) };
  if (wp >= 1 && r() < K.tailChance) {
    p.wings.tail.on = true;
    const bottom = wp === 1 ? f : l;
    const comp = composeOutline(bottom.points, p.wings.tail).points;
    // never draw a tail that does not fit, or whose neck is under the floor on this pair's size
    if (!outlineValid(comp).ok || thinAnalysis(sampleOutline(comp).map(([u, w]) => [u * bottom.length, w * bottom.length * bottom.stretch]), p.minDiameter).thin) p.wings.tail.on = false;
  }
  const q = normalizeParams(p);
  if (!(wp >= 1)) return { params: q, blend: null, label: '' };
  const b = randomWingBlend(q, Math.floor(r() * 4294967296));
  return { params: b.params, blend: b.blend, label: b.label };
}


/* ------------------------------------------------------------------ */
/* Mesh accumulator                                                     */
/* ------------------------------------------------------------------ */

class Acc {
  constructor() { this.pos = []; this.idx = []; this.parts = []; this.cur = null; }
  begin(name, kind, side) {
    this.cur = { name, kind, side, v0: this.pos.length / 3, t0: this.idx.length / 3, meta: {} };
    return this.cur;
  }
  v(p) { this.pos.push(p[0], p[1], p[2]); return this.pos.length / 3 - 1; }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  end() {
    const c = this.cur;
    c.v1 = this.pos.length / 3; c.t1 = this.idx.length / 3;
    // Orientation: a closed part is made outward by its own signed volume.
    if (signedVolume(this.pos, this.idx, c.t0, c.t1) < 0) {
      for (let t = c.t0; t < c.t1; t++) { const k = 3 * t; const s = this.idx[k + 1]; this.idx[k + 1] = this.idx[k + 2]; this.idx[k + 2] = s; }
    }
    this.parts.push(c); this.cur = null; return c;
  }
}

function signedVolume(pos, idx, t0, t1) {
  let v = 0;
  for (let t = t0; t < t1; t++) {
    const a = 3 * idx[3 * t], b = 3 * idx[3 * t + 1], c = 3 * idx[3 * t + 2];
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return v / 6;
}
export { signedVolume };

/* ------------------------------------------------------------------ */
/* Closed primitives                                                    */
/* ------------------------------------------------------------------ */

function frameFor(d) {
  const up = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm(cross(d, up));
  return [u, cross(u, d)];
}

/* Rings joined by quads, closed by a flat fan at each end. ringsMeta records
   each ring's vertex range so the gate can MEASURE its diameter off the
   emitted vertices. */
function loftRings(acc, rings, capA, capB, symHalf = 0) {
  const n = rings[0].length;
  const ids = rings.map((ring) => ring.map((p) => acc.v(p)));
  for (let i = 0; i + 1 < ids.length; i++) {
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      const a = ids[i][j], b = ids[i + 1][j], c = ids[i + 1][j1], d = ids[i][j1];
      // A mirrored ring (symHalf > 0) takes the MIRRORED diagonal on its left
      // half, so the quad's two triangles are each other's reflection rather
      // than the same split reflected into a different split.
      if (symHalf && j >= symHalf) { acc.tri(a, b, d); acc.tri(b, c, d); }
      else acc.quad(a, b, c, d);
    }
  }
  const cA = acc.v(capA), cB = acc.v(capB);
  for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    acc.tri(cA, ids[0][j], ids[0][j1]);       // twin of the side quad's ring-0 edge j1 -> j
    const L = ids[ids.length - 1];
    acc.tri(cB, L[j1], L[j]);                  // twin of the last ring's edge j -> j1
  }
  ids.capA = cA; ids.capB = cB;
  return ids;
}

function ringAround(c, u, v, r, sides) {
  const out = [];
  for (let k = 0; k < sides; k++) {
    const a = (2 * Math.PI * k) / sides;
    out.push(add(c, add(mul(u, r * Math.cos(a)), mul(v, r * Math.sin(a)))));
  }
  return out;
}

/* `point` (optional) is a POINTED termination at p1: the end closes in a cone
   whose apex stands TIP_POINT x r1 beyond the last ring, recorded in `points`
   as { apex, ring: [v0, n] } so the gate can measure the last ring against the
   floor and the apex as a real point. */
function frustum(acc, p0, p1, r0, r1, meta, points) {
  const d = norm(sub(p1, p0));
  const [u, v] = frameFor(d);
  const apex = points ? add(p1, mul(d, TIP_POINT * r1)) : null;
  const rings = [ringAround(p0, u, v, r0, TUBE_SIDES), ringAround(p1, u, v, r1, TUBE_SIDES)];
  if (apex) rings.push(ringAround(apex, u, v, TIP_NIB_MM, TUBE_SIDES));
  const ids = loftRings(acc, rings, p0, apex || p1);
  const tube = apex ? ids.slice(0, -1) : ids;               // the nib is not a tube ring: the floor is on the last REAL ring
  if (meta) meta.push(...tube.map((r) => [r[0], r.length]));
  if (points) { const L = tube[tube.length - 1]; points.push({ apex: ids.capB, ring: [L[0], L.length] }); }
}

function ellipsoid(acc, c, axes, radii, nLat = 8, nLon = 14) {
  const [a1, a2, a3] = axes;
  const pt = (phi, th) => add(c, add(add(
    mul(a1, radii[0] * Math.cos(phi) * Math.cos(th)),
    mul(a2, radii[1] * Math.cos(phi) * Math.sin(th))),
    mul(a3, radii[2] * Math.sin(phi))));
  const S = acc.v(add(c, mul(a3, -radii[2]))), N = acc.v(add(c, mul(a3, radii[2])));
  const rows = [];
  for (let i = 1; i < nLat; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / nLat;
    const row = [];
    for (let k = 0; k < nLon; k++) row.push(acc.v(pt(phi, (2 * Math.PI * k) / nLon)));
    rows.push(row);
  }
  for (let k = 0; k < nLon; k++) {
    const k1 = (k + 1) % nLon;
    acc.tri(S, rows[0][k1], rows[0][k]);
    const L = rows[rows.length - 1];
    acc.tri(N, L[k], L[k1]);
    for (let i = 0; i + 1 < rows.length; i++) acc.quad(rows[i][k], rows[i][k1], rows[i + 1][k1], rows[i + 1][k]);
  }
}
const sphere = (acc, c, r) => ellipsoid(acc, c, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [r, r, r]);

/* A tube along a polyline with parallel-transport frames. */
function tubeAlong(acc, pts, radii, meta, points) {
  const n = pts.length;
  const T = pts.map((_, i) => norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
  let [N] = frameFor(T[0]);
  const rings = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) N = norm(sub(N, mul(T[i], dot(N, T[i]))));
    const B = cross(T[i], N);
    rings.push(ringAround(pts[i], N, B, radii[i], TUBE_SIDES));
  }
  const apex = points ? add(pts[n - 1], mul(T[n - 1], TIP_POINT * radii[n - 1])) : null;
  if (apex) rings.push(ringAround(apex, N, cross(T[n - 1], N), TIP_NIB_MM, TUBE_SIDES));
  const ids = loftRings(acc, rings, pts[0], apex || pts[n - 1]);
  const tube = apex ? ids.slice(0, -1) : ids;
  if (meta) meta.push(...tube.map((r) => [r[0], r.length]));
  if (points) { const L = tube[tube.length - 1]; points.push({ apex: ids.capB, ring: [L[0], L.length] }); }
  return T;
}

/* A structured slab: grid[i][j] = [u, w] in a planform frame, deformed by W.
   Top face, bottom face and a rim walked once round the perimeter in the top
   face's own boundary direction, so the winding is consistent before end()
   makes it outward. thickPairs records (top, bottom) vertex pairs so the gate
   can measure the emitted thickness. */
function slab(acc, grid, half, W, part) {
  const nr = grid.length, nc = grid[0].length;
  const T = [], B = [];
  for (let i = 0; i < nr; i++) {
    T.push([]); B.push([]);
    for (let j = 0; j < nc; j++) {
      const [u, w] = grid[i][j];
      T[i].push(acc.v(W(u, w, +half)));
      B[i].push(acc.v(W(u, w, -half)));
    }
  }
  for (let i = 0; i + 1 < nr; i++) for (let j = 0; j + 1 < nc; j++) {
    acc.quad(T[i][j], T[i + 1][j], T[i + 1][j + 1], T[i][j + 1]);
    acc.quad(B[i][j], B[i][j + 1], B[i + 1][j + 1], B[i + 1][j]);
  }
  const loop = [];
  for (let i = 0; i < nr - 1; i++) loop.push([i, 0]);
  for (let j = 0; j < nc - 1; j++) loop.push([nr - 1, j]);
  for (let i = nr - 1; i > 0; i--) loop.push([i, nc - 1]);
  for (let j = nc - 1; j > 0; j--) loop.push([0, j]);
  for (let k = 0; k < loop.length; k++) {
    const [pi, pj] = loop[k], [qi, qj] = loop[(k + 1) % loop.length];
    acc.quad(T[qi][qj], T[pi][pj], B[pi][pj], B[qi][qj]);
  }
  part.meta.thickPairs = [];
  for (let i = 0; i < nr; i += 4) for (let j = 0; j < nc; j += 3) part.meta.thickPairs.push([T[i][j], B[i][j]]);
}

/* ------------------------------------------------------------------ */
/* Body                                                                 */
/* ------------------------------------------------------------------ */

/* The abdomen's width envelope along s in [0, 1] (base -> tip). */
function abdomenEnvelope(s, taper, segs, banding, style = 1, lenMm = 1, pointed = false) {
  if (s <= 0 || s >= 1) return 0;
  // An egg: a quarter-ellipse rise to the widest point at ABD_PEAK, then an
  // ellipse fall that the taper pulls to a point (0 = round end, 1 = spike).
  // POINTED (elegance pass): the fall is a cosine instead, which meets the axis
  // at a finite slope — a tip, not a dome (the floor is applied in profileAt).
  let f;
  if (s < ABD_PEAK) f = Math.sqrt(1 - ((ABD_PEAK - s) / ABD_PEAK) ** 2);
  else { const u = (s - ABD_PEAK) / (1 - ABD_PEAK); f = (pointed ? Math.cos((Math.PI / 2) * u) : Math.sqrt(Math.max(0, 1 - u * u))) * (1 - taper * u); }
  if (banding && segs > 1) {
    const sig = 0.16 / segs;
    let notch = 0;
    for (let k = 1; k < segs; k++) notch = Math.max(notch, Math.exp(-(((s - k / segs) / sig) ** 2)));
    if (style >= 1) f *= 1 - BAND_DEPTH * notch;     // BULGE: the Phase 1/2 bead, by branch
    else {
      // the style axis: `style` of the bead, (1 - style) of a fine incised groove
      if (style > 0) f *= 1 - BAND_DEPTH * style * notch;
      const sg = GROOVE_SIGMA_MM / lenMm;
      let g = 0;
      for (let k = 1; k < segs; k++) g = Math.max(g, Math.exp(-(((s - k / segs) / sg) ** 2)));
      f *= 1 - GROOVE_DEPTH * (1 - style) * g;
    }
  }
  return f;
}

/* Layout of the body along y, read by the body builder AND by every part that
   attaches to it (one owner of where the thorax, head and abdomen are). */
function bodyLayout(p) {
  // The thorax lengthens with each wing pair past two (THORAX_PER_PAIR), so the
  // roots spread along it instead of stacking.
  const Lt = p.thoraxLength * (1 + THORAX_PER_PAIR * Math.max(0, p.wingPairs - 2));
  const rt = p.thoraxWidth / 2, dt = p.thoraxDepth / 2;
  const L = { Lt, rt, dt, insect: p.bodyParts === '3' };
  L.thorax = { y0: -Lt / 2, y1: Lt / 2 };
  if (L.insect) {
    L.Rh = p.headSize / 2;
    L.yh = Lt / 2 + L.Rh * 0.55;                     // the head overlaps the thorax front
  }
  const ov = (L.insect ? 0.12 : 0.04) * Lt;          // a spider's pedicel is a real waist
  L.yA0 = -Lt / 2 + ov;
  L.yA1 = L.yA0 - p.abdomenLength;
  L.ra = p.abdomenWidth / 2;
  L.yMax = L.insect ? L.yh + L.Rh : Lt / 2;
  L.yMin = L.yA1;
  L.waistR = L.insect ? Math.max(p.minDiameter / 2, 0.42 * Math.min(rt, L.ra, dt))
                      : Math.max(p.minDiameter / 2, 0.16 * Math.min(rt, L.ra) + 0.3);
  return L;
}

function profileAt(p, L, y) {
  let rx = 0, rz = 0;
  const t = Math.abs(y) / (L.Lt / 2);
  if (t < 1) { const k = Math.sqrt(1 - t * t); rx = L.rt * k; rz = L.dt * k; }
  if (L.insect) {
    const h = (y - L.yh) / L.Rh;
    if (Math.abs(h) < 1) { const k = Math.sqrt(1 - h * h); rx = Math.max(rx, L.Rh * k); rz = Math.max(rz, L.Rh * HEAD_DEPTH_RATIO * k); }
  }
  const s = (L.yA0 - y) / (L.yA0 - L.yA1);
  const f = abdomenEnvelope(s, p.abdomenTaper, p.abdomenSegments, p.banding, p.segmentStyle, p.abdomenLength, p.pointedTips);
  if (f > 0) { rx = Math.max(rx, L.ra * f); rz = Math.max(rz, L.ra * ABD_DEPTH_RATIO * f); }
  // POINTED abdomen: floored at the floor's radius down to a cone ABD_TIP_CONE
  // floor radii long, which closes on the loft's own apex at yMin
  if (p.pointedTips && s > 0 && s < 1) {
    const fl = p.minDiameter / 2, cone = ABD_TIP_CONE * fl, dy = y - L.yA1;
    const lim = dy >= cone ? fl : (fl * dy) / cone;
    rx = Math.max(rx, lim); rz = Math.max(rz, lim);
  }
  // Junction floor: only inside the run between the head's middle and the
  // abdomen's middle, so it can only act on a neck or a waist, never on a pole.
  const front = L.insect ? L.yh : L.Lt / 4, back = L.yA0 - 0.5 * (L.yA0 - L.yA1);
  if (y < front && y > back) { rx = Math.max(rx, L.waistR); rz = Math.max(rz, L.waistR); }
  return [rx, rz];
}

function superRing(y, rx, rz, n, z0 = 0) {
  // right half from bottom (-90) to top (+90), then the mirrored interior
  const e = 2 / n, half = [];
  for (let k = 0; k <= RING_HALF; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / RING_HALF;
    const c = Math.cos(a), s = Math.sin(a);
    const x = (k === 0 || k === RING_HALF) ? 0 : rx * Math.pow(Math.abs(c), e);
    const z = (k === 0 ? -rz : k === RING_HALF ? rz : Math.sign(s) * rz * Math.pow(Math.abs(s), e));
    half.push([x, y, z + z0]);
  }
  const ring = half.slice();
  for (let k = RING_HALF - 1; k >= 1; k--) ring.push([mx(half[k][0]), half[k][1], half[k][2]]);
  return ring;
}

function buildBody(acc, p, L) {
  const part = acc.begin('body', 'body', 'C');
  const N = Math.max(24, Math.ceil((L.yMax - L.yMin) / BODY_STEP_MM));
  let stations = [];
  for (let i = 1; i < N; i++) stations.push(L.yMin + ((L.yMax - L.yMin) * i) / N);
  // GROOVE segments are finer than the station spacing: each segment boundary
  // gets its own stations across its groove, the boundary itself among them
  // (so the SVG's segment line is read off the groove's own ring). Bulge style
  // adds none — the Phase 1/2 stations, by branch.
  const grooves = p.banding && p.abdomenSegments > 1 && p.segmentStyle < 1;
  if (grooves) {
    // the groove's stations win: a uniform station within 0.03 mm of one is
    // dropped (the boundary's own ring must sit ON the boundary — the gate's G
    // clause caught a de-dup that dropped it instead)
    const gs = [];
    for (let k = 1; k < p.abdomenSegments; k++) {
      const yb = L.yA0 - (k / p.abdomenSegments) * (L.yA0 - L.yA1);
      for (const m of [-2, -1.25, -0.6, 0, 0.6, 1.25, 2]) gs.push(yb + m * GROOVE_SIGMA_MM);
    }
    stations = stations.filter((y) => gs.every((g) => Math.abs(y - g) > 0.03)).concat(gs.filter((y) => y > L.yMin && y < L.yMax));
    stations.sort((a, b) => a - b);
  }
  const rings = [], ys = [];
  for (const y of stations) {
    const [rx, rz] = profileAt(p, L, y);
    rings.push(superRing(y, Math.max(rx, 0.02), Math.max(rz, 0.02), p.roundness));
    ys.push(y);
  }
  // rings run tail -> head; loftRings wants the caps at the matching ends
  const ids = loftRings(acc, rings, [0, L.yMin, 0], [0, L.yMax, 0], RING_HALF);
  part.meta.rings = ids.map((r, i) => ({ v0: r[0], n: r.length, y: ys[i] }));
  part.meta.abdomen = { y0: L.yA0, y1: L.yA1, tipCone: p.pointedTips ? ABD_TIP_CONE * p.minDiameter / 2 : null, apex: ids.capA, grooves };
  // band rings for the SVG's segment lines: the ring nearest each boundary
  part.meta.bands = [];
  if (p.banding && p.abdomenSegments > 1) {
    for (let k = 1; k < p.abdomenSegments; k++) {
      const yb = L.yA0 - (k / p.abdomenSegments) * (L.yA0 - L.yA1);
      let best = 0;
      for (let i = 1; i < ys.length; i++) if (Math.abs(ys[i] - yb) < Math.abs(ys[best] - yb)) best = i;
      part.meta.bands.push(part.meta.rings[best].v0);
    }
  }
  acc.end();
}

/* ------------------------------------------------------------------ */
/* Drawn-width floor (Eva's ruling on PR #326)                          */
/* ------------------------------------------------------------------ */

/* Where is a drawn planform NARROWER than the floor? Morphological opening by
   a disc of the floor's diameter: every disc of diameter `floor` that fits
   inside the planform is kept, and the parts of the planform no such disc
   reaches are THIN. A tail neck narrower than the floor is wholly thin; a wide
   wing has no thin part except the tips of sharp corners, which every printer
   rounds anyway — so a thin region only COUNTS when it reaches deeper than
   THIN_DEPTH_FRAC x floor past the nearest kept material (a corner sharper than
   about 60 degrees). Computed on a raster at floor / THIN_RES with exact
   Euclidean distance transforms (Felzenszwalb-Huttenlocher), in millimetres.
   THIN_RES 8 was measured first; it nearly doubled a 4-pair build (90 ms).

   Returns { maxDepth, thin (bool), flags } where flags[i] marks dense outline
   sample i as lying on a thin part (for the editor's red highlight). */
export const THIN_DEPTH_FRAC = 0.5;
const THIN_RES = 12;  // pixel = floor/12. At floor/6 a sharp point's tip, thinner than a pixel, was never filled and read up to 0.5 mm shallow (measured against the gate's own measure); 12 halves that at ~1.7x the build time

function edt1(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
/* squared distance (in pixels^2) from every pixel to the nearest pixel where `src` is set */
function edt2(src, nx, ny) {
  const INF = 1e20, out = new Float64Array(nx * ny), m = Math.max(nx, ny);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) f[y] = src[y * nx + x] ? 0 : INF;
    edt1(f, ny, d, v, z);
    for (let y = 0; y < ny; y++) out[y * nx + x] = d[y];
  }
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) f[x] = out[y * nx + x];
    edt1(f, nx, d, v, z);
    for (let x = 0; x < nx; x++) out[y * nx + x] = d[x];
  }
  return out;
}

export function thinAnalysis(poly, floor, opts = {}) {
  const ig = opts.ignoreXBelow ?? -Infinity;   // material at x < ig is not judged (the root tab, inside the body)
  const h = floor / THIN_RES, r = floor / 2;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 3;
  const nx = Math.ceil((x1 - x0) / h) + 2 * pad, ny = Math.ceil((y1 - y0) / h) + 2 * pad;
  const gx = x0 - pad * h, gy = y0 - pad * h;
  const inside = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {                       // even-odd scanline fill at pixel centres (the polygon is simple)
    const yc = gy + (j + 0.5) * h, xs = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - gx) / h - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - gx) / h - 0.5));
      for (let i = i0; i <= i1; i++) inside[j * nx + i] = 1;
    }
  }
  const outside = new Uint8Array(nx * ny); for (let i = 0; i < outside.length; i++) outside[i] = inside[i] ? 0 : 1;
  const dOut = edt2(outside, nx, ny);                   // inside pixels: distance to the outside
  const core = new Uint8Array(nx * ny);                 // centres of floor-discs that fit
  const r2 = (r / h) ** 2;
  for (let i = 0; i < core.length; i++) core[i] = inside[i] && dOut[i] >= r2 ? 1 : 0;
  const dCore = edt2(core, nx, ny);
  const opened = new Uint8Array(nx * ny);               // material some floor-disc covers
  for (let i = 0; i < opened.length; i++) opened[i] = inside[i] && dCore[i] <= r2 ? 1 : 0;
  const dOpen = edt2(opened, nx, ny);
  let maxDepth = 0;
  for (let i = 0; i < inside.length; i++) if (inside[i] && !opened[i] && gx + ((i % nx) + 0.5) * h >= ig) maxDepth = Math.max(maxDepth, Math.sqrt(dOpen[i]) * h);
  const tau = THIN_DEPTH_FRAC * floor;
  const flags = new Uint8Array(poly.length);
  for (let k = 0; k < poly.length; k++) {
    const i = clamp(Math.floor((poly[k][0] - gx) / h), 0, nx - 1), j = clamp(Math.floor((poly[k][1] - gy) / h), 0, ny - 1);
    flags[k] = poly[k][0] >= ig && Math.sqrt(dOpen[j * nx + i]) * h > tau ? 1 : 0;
  }
  return { maxDepth, thin: maxDepth > tau, flags, tau };
}

/* ------------------------------------------------------------------ */
/* Wings                                                                */
/* ------------------------------------------------------------------ */

function scallopCut(t, depth, count) {
  if (depth <= 0 || t <= SCALLOP_FROM) return 0;
  const f = (count * (t - SCALLOP_FROM)) / (1 - SCALLOP_FROM);
  const ramp = Math.min(1, (t - SCALLOP_FROM) / 0.08);
  return depth * ramp * (1 - Math.sqrt(Math.abs(Math.sin(Math.PI * f))));   // round lobes, sharp notches
}

/* The wing transform: planform (u span, w chord, h normal offset) -> world.
   sweep (yaw in plane, + = backward) -> pitch (about the swept span axis,
   growing from 0 at the hinge to full at the tip, + = leading edge up) ->
   dihedral (about the body axis through the hinge, + = tip up) -> hinge. */
function wingTransform(hinge, span, sweepDeg, pitchDeg, dihedralDeg) {
  const sw = sweepDeg * D2R, dh = dihedralDeg * D2R;
  const s = [Math.cos(sw), -Math.sin(sw), 0];
  const c = [Math.sin(sw), Math.cos(sw), 0];
  const cd = Math.cos(dh), sd = Math.sin(dh);
  return (u, w, h) => {
    const a = pitchDeg * D2R * clamp(u / span, 0, 1);
    const ca = Math.cos(a), sa = Math.sin(a);
    // c' = c cos a + z sin a ; z' = z cos a - c sin a
    const x = u * s[0] + w * c[0] * ca - h * c[0] * sa;
    const y = u * s[1] + w * c[1] * ca - h * c[1] * sa;
    const z = w * sa + h * ca;
    return [hinge[0] + x * cd - z * sd, hinge[1] + y, hinge[2] + x * sd + z * cd];
  };
}

/* Where each pair's root sits on the thorax. ONE owner, read by the builder and
   by the gate (roots must be distinct). Roots spread evenly over the middle of
   the lengthened thorax, front to back; each later pair a little lower so the
   pairs stack rather than share a plane, but never below the body's mid-height. */
export function wingHinges(p, L) {
  const N = p.wingPairs, out = [];
  for (let k = 0; k < N; k++) {
    const yH = N === 1 ? 0.18 * L.Lt : L.Lt * (WING_ROOT_SPAN / 2 - (WING_ROOT_SPAN * k) / (N - 1));
    const kk = Math.sqrt(Math.max(0, 1 - (yH / (L.Lt / 2)) ** 2));
    const drop = Math.min(k * 0.45 * p.minDiameter * 1.2, 0.6 * L.dt * kk);
    out.push({ y: yH, k: kk, hinge: [0.5 * L.rt * kk, yH, 0.5 * L.dt * kk - drop] });
  }
  return out;
}

/* Ear clipping of a simple CCW polygon. Of all valid ears it clips the one
   with the LARGEST smallest angle, not the first found: first-found clipping
   leaves long slivers along a nearly straight margin, and a sliver whose
   vertices are almost collinear reads its facing as noise — the first sheet
   showed them as stray zero-area contour loops (thin lines across the wing in
   the SVG). Collinear vertices are removed without a triangle. */
function earClip(poly) {
  const V = [...Array(poly.length).keys()], tris = [];
  const cr2 = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const cr = (a, b, c) => cr2(poly[c], poly[a], poly[b]);
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const minAngle = (a, b, c) => {
    const P = [poly[a], poly[b], poly[c]];
    let m = Infinity;
    for (let k = 0; k < 3; k++) {
      const o = P[k], u = sub2(P[(k + 1) % 3], o), v = sub2(P[(k + 2) % 3], o);
      m = Math.min(m, Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1e-30), -1, 1)));
    }
    return m;
  };
  const isEar = (i) => {
    const a = V[(i + V.length - 1) % V.length], b = V[i], c = V[(i + 1) % V.length];
    if (!(cr(a, b, c) > 0)) return false;
    for (const m of V) {
      if (m === a || m === b || m === c) continue;
      const q = poly[m];
      if (same(q, poly[a]) || same(q, poly[b]) || same(q, poly[c])) continue;
      if (cr2(q, poly[a], poly[b]) >= 0 && cr2(q, poly[b], poly[c]) >= 0 && cr2(q, poly[c], poly[a]) >= 0) return false;
    }
    return true;
  };
  let guard = 0;
  while (V.length > 3 && guard++ < 100000) {
    // drop exactly collinear (or doubled) vertices first: they make no triangle
    let dropped = false;
    for (let i = 0; i < V.length && V.length > 3; i++) {
      const a = V[(i + V.length - 1) % V.length], b = V[i], c = V[(i + 1) % V.length];
      if (cr(a, b, c) === 0) { V.splice(i, 1); dropped = true; break; }
    }
    if (dropped) continue;
    let best = -1, bq = -1;
    for (let i = 0; i < V.length; i++) {
      if (!isEar(i)) continue;
      const q = minAngle(V[(i + V.length - 1) % V.length], V[i], V[(i + 1) % V.length]);
      if (q > bq) { bq = q; best = i; }
    }
    if (best < 0) throw new Error('earClip: polygon is not simple');
    tris.push([V[(best + V.length - 1) % V.length], V[best], V[(best + 1) % V.length]]);
    V.splice(best, 1);
  }
  if (V.length === 3 && cr(V[0], V[1], V[2]) > 0) tris.push([V[0], V[1], V[2]]);
  return tris;
}

/* Lawson flips: every interior edge whose two opposite angles sum past pi is
   flipped (when the quad is convex) until none is — the constrained Delaunay
   triangulation of the outline, which maximises the smallest angle. Boundary
   edges are never flipped, so the outline is untouched. */
function delaunayFlip(pts, tris) {
  const T = tris.map((t) => t.slice());
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  const ang = (o, p, q) => { const u = sub2(pts[p], pts[o]), v = sub2(pts[q], pts[o]); return Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]); };
  const orient = (a, b, c) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  for (let pass = 0; pass < 200; pass++) {
    const edges = new Map();
    T.forEach((t, i) => { for (let e = 0; e < 3; e++) { const k = key(t[e], t[(e + 1) % 3]); (edges.get(k) || edges.set(k, []).get(k)).push(i); } });
    let flips = 0;
    const done = new Set();
    for (const [k, ts] of edges) {
      if (ts.length !== 2 || done.has(ts[0]) || done.has(ts[1])) continue;
      const [i, j] = ts, [a, b] = k.split(',').map(Number);
      const c = T[i].find((v) => v !== a && v !== b), d = T[j].find((v) => v !== a && v !== b);
      if (ang(c, a, b) + ang(d, a, b) <= Math.PI + 1e-12) continue;
      // convex quad: c and d on opposite sides of ab, a and b on opposite sides of cd
      if (!(orient(c, d, a) * orient(c, d, b) < 0)) continue;
      // keep CCW orientation
      const t1 = orient(c, d, a) > 0 ? [c, d, a] : [d, c, a];
      const t2 = orient(c, d, b) > 0 ? [c, d, b] : [d, c, b];
      T[i] = t1; T[j] = t2; done.add(i); done.add(j); flips++;
    }
    if (!flips) break;
  }
  return T;
}

/* Flip away every ZERO-AREA triangle and touch nothing else. A vein's end is
   inserted ON an outline edge, so it is exactly collinear with that edge's two
   ends, and an ear clip of the cell can hand back the flat triangle the three
   make: zero area on both skins, and after the subdivision a slab whose rim
   walk loses its way — 24 boundary edges, measured (holes, 3 pairs, 8 -> 3
   veins, at root pinch 0.3; pre-existing, the layout only had to land on it).
   The flip is across the triangle's longest edge, so the middle point joins
   the vertex opposite (one lying along the outline is dropped instead); a
   triangle that is not degenerate is never visited, so every mesh without one
   is byte-identical. */
function flipDegenerate(pts, tris) {
  const T = tris.map((t) => t.slice());
  const orient = (a, b, c) => (pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[c][0] - pts[a][0]);
  const d2 = (a, b) => (pts[a][0] - pts[b][0]) ** 2 + (pts[a][1] - pts[b][1]) ** 2;
  const flat = (t) => Math.abs(orient(t[0], t[1], t[2])) <= 1e-12 * Math.max(d2(t[0], t[1]), d2(t[1], t[2]), d2(t[2], t[0]));
  if (!T.some(flat)) return T;
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let pass = 0; pass < 50; pass++) {
    const edges = new Map();
    T.forEach((t, i) => { for (let e = 0; e < 3; e++) { const k = key(t[e], t[(e + 1) % 3]); (edges.get(k) || edges.set(k, []).get(k)).push(i); } });
    let flips = 0, left = 0;
    const done = new Set(), drop = new Set();
    T.forEach((t, i) => {
      if (done.has(i) || !flat(t)) return;
      left++;
      let e = 0;
      for (let k = 1; k < 3; k++) if (d2(t[k], t[(k + 1) % 3]) > d2(t[e], t[(e + 1) % 3])) e = k;
      const a = t[e], b = t[(e + 1) % 3], c = t[(e + 2) % 3];
      const ts = edges.get(key(a, b));
      // a flat triangle whose long edge is on the BOUNDARY is a sliver lying
      // along the outline (its short edges carry the in-line points the
      // neighbours already use): it covers nothing, so it is dropped and the
      // boundary runs through those points instead of across them
      if (ts && ts.length === 1) { drop.add(i); done.add(i); flips++; return; }
      if (!ts || ts.length !== 2) return;
      const j = ts[0] === i ? ts[1] : ts[0];
      if (done.has(j)) return;
      const d = T[j].find((v) => v !== a && v !== b);
      const t1 = orient(c, d, a) > 0 ? [c, d, a] : [d, c, a];
      const t2 = orient(c, d, b) > 0 ? [c, d, b] : [d, c, b];
      // (a neighbour that is itself on the line would only trade two flat
      // triangles for two more: skip it — the chain unwinds from its end)
      if (flat(t1) || flat(t2)) return;
      T[i] = t1; T[j] = t2; done.add(i); done.add(j); flips++;
    });
    if (drop.size) { const keep = T.filter((_, i) => !drop.has(i)); T.length = 0; T.push(...keep); }
    if (!left || !flips) break;
  }
  return T;
}

/* 1 -> 4 midpoint subdivision; a midpoint is shared by both triangles of an
   edge, so the result stays conforming (no T-junctions). */
/* `apex` (optional): per point, the drawn-outline point its rounded edge's bead
   reaches (insetLoops), or null for an interior point. A midpoint of a
   BOUNDARY edge (one triangle) carries the midpoint of its two ends' apexes —
   the original outline is a polyline, so that point lies on it. */
function subdivide(pts, tris, apex = null) {
  const mid = new Map(), P = pts.slice(), A = apex ? apex.slice() : null;
  let ecount = null;
  if (A) { ecount = new Map(); for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? `${p},${q}` : `${q},${p}`; ecount.set(k, (ecount.get(k) || 0) + 1); } }
  const m = (a, b) => {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (!mid.has(k)) {
      mid.set(k, P.length); P.push(lerp2(P[a], P[b], 0.5));
      if (A) A.push(ecount.get(k) === 1 && A[a] && A[b] ? lerp2(A[a], A[b], 0.5) : null);
    }
    return mid.get(k);
  };
  const T = [];
  for (const [a, b, c] of tris) {
    const ab = m(a, b), bc = m(b, c), ca = m(c, a);
    T.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
  }
  return { pts: P, tris: T, apex: A };
}

/* ------------------------------------------------------------------ */
/* The ROUNDED EDGE (edges pass, design doc §10)                        */
/* ------------------------------------------------------------------ */
/* A full bullnose — a half-round bead — on every free edge of a slab: the
   wing's outer margin, a drawn tail, every hole rim in HOLES, the pterostigma
   plate. The silhouette does not move: the bead's APEX (its mid-plane point)
   sits exactly ON the drawn outline (or the planned hole), and the two skins
   stop short of it by the bead's in-plane radius `a`. The profile is a half
   ellipse with that in-plane semi-axis and the local half-thickness H as its
   vertical one — a half-round at round 1 (a = H), a square wall at round 0
   (the slab as shipped, by branch: the bead is never built). It is tangent to
   both skins (no step) and vertical only at its apex (no cliff anywhere).

   `a` is round x H at the outline point, and it never takes material away
   below the floor: the skins are only inset (their thickness is the edge
   law's, unchanged), the bead's height IS the local thickness (>= the floor),
   and `a` is held to ROUND_ROOM_FRAC of the material's local width (an inward
   ray to the nearest other boundary), so the two beads of a narrow strip — a
   vein between two holes, a tail — never meet: the strip keeps a flat of at
   least 1 - 2 x 0.45 = 10% of its width between them. A vein the width of
   its own thickness therefore becomes a near-round ROD. */
export const ROUND_ROOM_FRAC = 0.45;
export const EDGE_ROUND_SEGMENTS = 6;       // facets on a half-round bead (30 degrees each); even, so the apex is a ring vertex
const ROUND_ROOT_RAMP_MM = 1.0;             // the bead grows from 0 at the root chord (inside the body) over this much span
/* Inset the BOUNDARY LOOPS of a planform (before it is triangulated) inward by
   their bead radius. `loops`: closed loops with the MATERIAL ON THEIR LEFT (the
   outer outline CCW, a hole CW), each a list of [u, w]; `want(P)`: whether
   point P is rounded (the root tab inside the body is not); `aAt(q, P)`: the
   radius for rim point P evaluated at q, its new skin edge; `extraAt(P)`
   (optional): the apex itself pulled in by that much (a plate on the wing).
   Returns per loop the moved points and each point's apex (its old position)
   and radius. The radius is a fixed point of a = aAt(P - a n) — taken at the
   skin's new edge, where the bead's height is, so it never exceeds it; held to
   ROUND_ROOM_FRAC of the inward ray to the nearest other boundary; and where
   the inset loop would cross itself (a notch tighter than the bead) the radii
   of the stretch between the crossing edges shrink until it does not. The
   caller TRIANGULATES THE MOVED LOOPS, so no triangle can flip. */
function insetLoops(loops, want, aAt, extraAt = null, capAt = null) {
  const edges = [];
  loops.forEach((L, li) => { for (let i = 0; i < L.length; i++) edges.push([li, i, L[i], L[(i + 1) % L.length]]); });
  const out = loops.map((L, li) => {
    const n = L.length, A = new Float64Array(n), E = new Float64Array(n), nrm = [], apex = [];
    for (let i = 0; i < n; i++) {
      const P = L[i], a0 = L[(i + n - 1) % n], b0 = L[(i + 1) % n];
      // outward = the right normal of each incident edge (material on the left)
      let ox = 0, oy = 0;
      for (const [p, q] of [[a0, P], [P, b0]]) { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; ox += dy / l; oy += -dx / l; }
      const l = Math.hypot(ox, oy), nn = l > 1e-12 ? [ox / l, oy / l] : [0, 0];
      nrm.push(nn); apex.push([P[0], P[1]]);
      if (!want(P) || !(l > 1e-12)) continue;
      if (extraAt) { E[i] = extraAt(P); apex[i] = [P[0] - nn[0] * E[i], P[1] - nn[1] * E[i]]; }
      let a = aAt(P, P);
      if (!(a > 0)) continue;
      for (let it = 0; it < 12; it++) a = aAt([P[0] - nn[0] * (a + E[i]), P[1] - nn[1] * (a + E[i])], P);
      // the material's local width: the inward ray to the nearest boundary
      // edge not incident to this point
      const d = [-nn[0], -nn[1]];
      let room = Infinity;
      for (const [lj, j, p, q] of edges) {
        if (lj === li && (j === i || (j + 1) % n === i)) continue;
        const ex = q[0] - p[0], ey = q[1] - p[1], den = d[0] * ey - d[1] * ex;
        if (Math.abs(den) < 1e-14) continue;
        const wx = p[0] - P[0], wy = p[1] - P[1];
        const t = (wx * ey - wy * ex) / den, sg = (wx * d[1] - wy * d[0]) / den;
        if (t > 1e-9 && sg >= -1e-9 && sg <= 1 + 1e-9 && t < room) room = t;
      }
      A[i] = Math.max(0, Math.min(a, ROUND_ROOM_FRAC * room - E[i], capAt ? capAt(li, i, P) : Infinity));
    }
    const moved = () => L.map((q, i) => (A[i] + E[i] > 0 ? [q[0] - nrm[i][0] * (A[i] + E[i]), q[1] - nrm[i][1] * (A[i] + E[i])] : [q[0], q[1]]));
    let M = moved(), reduced = new Set();
    for (let it = 0; it < 24; it++) {
      const x = loopCrossing(M);
      if (!x) break;
      // shrink the shorter run of the loop between the two crossing edges
      let [i, j] = x; if (j - i > n / 2) [i, j] = [j, i + n];
      for (let k = i; k <= j + 1; k++) { const v = k % n; if (A[v] > 0) { A[v] = it < 23 ? A[v] * 0.7 : 0; reduced.add(v); } }
      M = moved();
    }
    // `shrink(f)`: scale every radius of this loop by f and re-place it (the
    // caller's own containment checks use it)
    const res = { pts: M, apex, a: A, reduced: reduced.size };
    res.shrink = (f) => { for (let i = 0; i < n; i++) A[i] *= f; res.pts = moved(); res.reduced = n; };
    return res;
  });
  return out;
}
/* The same inset on an already-TRIANGULATED coarse mesh, for HOLES: the
   frame's cells are conforming and fragile to re-triangulate, so instead its
   boundary points (the outline's and every hole rim's, found as the mesh's
   own boundary edges) move in place, and wherever a triangle would flip or
   collapse below ROUND_MIN_AREA_FRAC of its area the radii of its corners
   shrink (x 0.7) until it does not — which also keeps a grown hole inside its
   cell. Same radius law as insetLoops (fixed point, room clamp). */
const ROUND_MIN_AREA_FRAC = 0.05;
function insetMesh(pts, tris, want, aAt) {
  const dir = new Set();
  for (const [a, b, c] of tris) { dir.add(`${a},${b}`); dir.add(`${b},${c}`); dir.add(`${c},${a}`); }
  const bnd = [], outN = pts.map(() => [0, 0]), isB = new Uint8Array(pts.length);
  for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if (dir.has(`${q},${p}`)) continue;
    bnd.push([p, q]); isB[p] = isB[q] = 1;
    const dx = pts[q][0] - pts[p][0], dy = pts[q][1] - pts[p][1], L = Math.hypot(dx, dy) || 1;
    for (const v of [p, q]) { outN[v][0] += dy / L; outN[v][1] += -dx / L; }
  }
  const apex = pts.map((q, i) => (isB[i] ? [q[0], q[1]] : null));
  const A = new Float64Array(pts.length), nrm = pts.map(() => [0, 0]);
  for (let i = 0; i < pts.length; i++) {
    if (!isB[i]) continue;
    const L = Math.hypot(outN[i][0], outN[i][1]);
    if (!(L > 1e-9) || !want(pts[i])) continue;
    const n = [outN[i][0] / L, outN[i][1] / L], P = pts[i]; nrm[i] = n;
    let a = aAt(P, P);
    if (!(a > 0)) continue;
    for (let it = 0; it < 12; it++) a = aAt([P[0] - n[0] * a, P[1] - n[1] * a], P);
    const d = [-n[0], -n[1]];
    let room = Infinity;
    for (const [p, q] of bnd) {
      if (p === i || q === i) continue;
      const ex = pts[q][0] - pts[p][0], ey = pts[q][1] - pts[p][1], den = d[0] * ey - d[1] * ex;
      if (Math.abs(den) < 1e-14) continue;
      const wx = pts[p][0] - P[0], wy = pts[p][1] - P[1];
      const t = (wx * ey - wy * ex) / den, sg = (wx * d[1] - wy * d[0]) / den;
      if (t > 1e-9 && sg >= -1e-9 && sg <= 1 + 1e-9 && t < room) room = t;
    }
    A[i] = Math.max(0, Math.min(a, ROUND_ROOM_FRAC * room));
  }
  const moved = () => pts.map((q, i) => (A[i] > 0 ? [q[0] - nrm[i][0] * A[i], q[1] - nrm[i][1] * A[i]] : [q[0], q[1]]));
  const area2 = (P, a, b, c) => (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
  let out = moved(); const reduced = new Set();
  for (let it = 0; it < 20; it++) {
    let bad = false;
    for (const [a, b, c] of tris) {
      if (area2(out, a, b, c) > ROUND_MIN_AREA_FRAC * area2(pts, a, b, c)) continue;
      for (const v of [a, b, c]) if (A[v] > 0) { A[v] = it < 19 ? A[v] * 0.7 : 0; reduced.add(v); bad = true; }
    }
    if (!bad) break;
    out = moved();
  }
  return { pts: out, apex, reduced: reduced.size };
}
/* The first pair of non-adjacent edges of a closed loop that touch, or null. */
function loopCrossing(L) {
  const n = L.length;
  const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  for (let i = 0; i < n; i++) {
    const a = L[i], b = L[(i + 1) % n];
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = L[j], d = L[(j + 1) % n];
      if (Math.max(c[0], d[0]) < x0 || Math.min(c[0], d[0]) > x1 || Math.max(c[1], d[1]) < y0 || Math.min(c[1], d[1]) > y1) continue;
      if (o(a, b, c) * o(a, b, d) <= 0 && o(c, d, a) * o(c, d, b) <= 0) return [i, j];
    }
  }
  return null;
}

/* A solid slab over a triangulated planform: top face, bottom face, and a rim
   walked along the top face's own boundary edges. */
/* `half` is the half-thickness: a number (the Phase 1/2 even slab) or a
   function of the planform point (the elegance pass's edge field — tapered
   toward the margin and chamfered to the floor at it). Returns the boundary
   vertices (pts indices) with their emitted top / bottom ids, so the builder
   can record the EDGE's own thickness for the gate to measure. */
/* `apex` (optional, from insetLoops through subdivide): the rim becomes a
   BEAD — per boundary point a ring of EDGE_ROUND_SEGMENTS + 1 points from the
   top skin's edge through the apex to the bottom skin's, on the half ellipse
   P' + sin(t) (apex - P'), H cos(t); consecutive rings joined by quads. A rim
   point whose apex is itself (radius 0, the root tab) gets the same ring along
   its vertical wall, so neighbouring rings always match point for point.
   Without `apex`, the shipped square wall, verbatim. */
function planformSlab(acc, pts, tris, half, W, part, apex = null) {
  const hf = typeof half === 'function' ? half : () => half;
  const H = pts.map(([u, w]) => hf(u, w));
  const T = pts.map(([u, w], i) => acc.v(W(u, w, +H[i])));
  const B = pts.map(([u, w], i) => acc.v(W(u, w, -H[i])));
  const dir = new Set();
  for (const [a, b, c] of tris) {
    acc.tri(T[a], T[b], T[c]); acc.tri(B[a], B[c], B[b]);
    dir.add(`${a},${b}`); dir.add(`${b},${c}`); dir.add(`${c},${a}`);
  }
  const rimV = new Set();
  if (apex) {
    const K = EDGE_ROUND_SEGMENTS, ring = new Map();
    part.meta.bead = { K, rings: [] };
    const ringOf = (v) => {
      let r = ring.get(v);
      if (r) return r;
      const [u, w] = pts[v], A = apex[v] || pts[v], du = A[0] - u, dw = A[1] - w;
      r = [T[v]];
      for (let j = 1; j < K; j++) { const t = (Math.PI * j) / K, sn = j === K / 2 ? 1 : Math.sin(t), cs = j === K / 2 ? 0 : Math.cos(t); r.push(acc.v(W(u + sn * du, w + sn * dw, H[v] * cs))); }
      r.push(B[v]);
      ring.set(v, r);
      part.meta.bead.rings.push({ i: v, ids: r, uw: [u, w], apex: [A[0], A[1]], a: Math.hypot(du, dw), H: H[v] });
      return r;
    };
    for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (dir.has(`${q},${p}`)) continue;
      const Rp = ringOf(p), Rq = ringOf(q);
      for (let j = 0; j < K; j++) acc.quad(Rq[j], Rp[j], Rp[j + 1], Rq[j + 1]);
      rimV.add(p);
    }
  } else for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if (!dir.has(`${q},${p}`)) { acc.quad(T[q], T[p], B[p], B[q]); rimV.add(p); }   // a boundary edge p->q: the rim takes its twin
  }
  part.meta.thickPairs = [];
  for (let i = 0; i < pts.length; i += 7) part.meta.thickPairs.push([T[i], B[i]]);
  return [...rimV].map((i) => ({ i, top: T[i], bot: B[i] }));
}

/* The drawn planform in MILLIMETRES — the drawn curve scaled by the pair's
   length and stretch, with the scallops cut on its trailing half. ONE owner:
   buildWingPair triangulates exactly this, and specimenPose() reads its inner
   margin off exactly this, so the pose squares the margin the STL carries. */
/* THE BLENDED ROOT (§12.1). A drawn outline closes on a straight root chord
   (both root points pinned at u = 0); left at its drawn width that chord is a
   vertical cut beside the body, and a forewing and a hindwing side by side read
   as one rectangular block. The root is reshaped here, in planform MILLIMETRES,
   by one map that every consumer reads (the builder through drawnPlanformMm, the
   editor through editorFrame, the specimen pose):

     w' = c(u) + (w - c0) * s(u)        u unchanged

   c0 is the drawn root chord's centre and h0 its half-width; the map squeezes
   the chord toward the HINGE (c -> 0) so every pair attaches at its own point on
   the thorax. s(u) is E(u) / h0, where the ENVELOPE E(u) is the attachment's
   half-width: hr at the NECK — the drawn half-width h0 narrowed by the PINCH,
   h0 (1 - pinch (1 - ROOT_NECK_AT_FULL)), never under half the floor —
   flaring by a FILLET (curvature radius R at the neck, 45 degrees by the body's
   silhouette at u = ub, and on at 45 degrees inside the body), then released
   back to the drawn wing over the next `blend` mm by a smoothstep. It narrows
   only, and only the band between the centre and each ROOT EDGE is scaled —
   what lies beyond a root edge is shifted, never crushed.

   For every u the map is affine in w with a positive slope, so it is a
   BIJECTION of the plane: it cannot make a simple outline cross itself, and it
   moves no point along the span (the apex, the tail, every index stay put).
   The pinch is RELATIVE to the drawn root (Eva's ruling on the first neck,
   which was a fixed 1.6 mm and pinched a 4.5 mm root to a third of its width,
   carving teardrop gaps beside the body): the neck and the fillet radius are
   both fractions of the drawn root chord, so one pinch reads the same on
   every wing shape and a low pinch is a gentle narrowing with a fillet small
   enough to stay smooth. Pinch 1 is the first neck on the default forewing
   (1.6 mm neck, 0.9 mm fillet on its 4.51 mm root). Pinch 0 is the drawn root
   chord, BY BRANCH (the map is never built). */
export const ROOT_NECK_AT_FULL = 0.355;    // the neck at pinch 1, as a fraction of the drawn root chord (1.6 / 4.51 on the default forewing)
export const ROOT_FILLET_AT_FULL = 0.2;    // the fillet radius at pinch 1, as a fraction of the drawn root chord (0.9 / 4.51)
export const ROOT_EDGE_STEEP = 2.5;   // see rootWarp: a root edge ends where the outline runs more across than this x along
export const ROOT_BLEND_SLOPE = 1.0;   // see rootWarp: the release is at least this x the narrowing long
export const ROOT_BLEND_FRAC = 0.1;    // the release to the drawn wing runs over 0.1 of the pair's length (or 2.5 fillets, if longer)
export function rootWarp(spec) {
  const r = spec.root;
  if (!r || !(r.pinch > 0)) return null;
  const span = spec.length, S = span * spec.stretch;
  const d = spec.dense, n = d.length;
  const P = d.map(([u, w]) => [u * span, w * S]);
  const wL = P[0][1], wT = P[n - 1][1];
  const c0 = (wL + wT) / 2;
  if (!(wL > wT)) return null;
  // the FULL neck (pinch 1) is built below; a lower pinch is the straight
  // chord and the full neck mixed, w' = w + pinch (full(w) - w) — see the return
  const h0 = (wL - wT) / 2;
  const hr = Math.max(h0 * ROOT_NECK_AT_FULL, r.floor / 2);
  // A ROOT ALREADY NEAR THE FLOOR HAS NOTHING TO NARROW: the full neck is
  // held at half the floor, so on a small wing with a narrow root it is only
  // a few tenths of a millimetre under the drawn chord, and the "pinch" came
  // out as a dip finer than the floor — the J clause, on library shapes at
  // small sizes (a 1.2 mm root narrowed by 0.1 mm, §13.3). The pinch fades in
  // with the full narrowing h0 - hr: none while it is under 3/4 of a floor,
  // whole from 1 1/4 floors (a ramp, so no slider position or wing size
  // switches it on as a step; the first cut faded from 1/2 to 1 floor and
  // left 7-9 degree S-bends on the ramp). A root whose full narrowing is 1 1/4
  // floors or more — the default bug's forewing narrows by 1.45 mm — is
  // untouched.
  const fade = clamp((h0 - hr) / (r.floor / 2) - 1.5, 0, 1);
  const pinch = clamp(r.pinch, 0, 1) * fade;
  if (!(pinch > 0)) return null;
  const R = Math.max(0, ROOT_FILLET_AT_FULL * 2 * h0 * (r.filletScale ?? 1)), ub = Math.max(0, r.ub);
  // the LENGTH stretches the root outward: the neck's offset from the body's
  // silhouette and the release back to the drawn wing both scale by it (1 =
  // as derived; the curvature at the neck stays the fillet's)
  // (capped at 2x: at 2.5x and up a full pinch left a flipped sliver facet
  // where the wing meets the body's silhouette — measured, a 0.47-0.58 mm
  // contour loop; the range stops below it rather than carry it)
  const len = clamp(r.length ?? 1, 0.25, 2);
  // (and never closer to the body's silhouette than one floor: the root tab's
  // shoulder at the silhouette and the neck's fillet turn opposite ways, and
  // on a small wing R x len put them 0.4 mm apart — a wobble finer than the
  // floor, the J clause, §13.3)
  const un = ub + Math.max(R * len, r.floor);
  // the DRAWN wing's two ROOT EDGES: the outline walked from the root lead
  // (forward) and from the root trail (backward), each read where it first
  // crosses a station u — on a grid of NS stations over [0, uEnd]
  const NS = 240;
  const edges = (uEnd) => {
    const du = uEnd / NS, up = new Float64Array(NS + 1), dn = new Float64Array(NS + 1);
    const edgeAt = (start, step, arr, sign) => {
      let last = Math.abs(P[start][1] - c0);
      for (let g = 0; g <= NS; g++) {
        const u = Math.max(1e-9, g * du);
        let found = null, walked = 0;
        // only the outline NEAR the root is its root edge: a hindwing whose inner
        // margin runs down beside the abdomen is not one, and reading it as one
        // would make the whole anal lobe "the root" — the walk stops after
        // 1.5 x the map's span of outline
        for (let i = start; i + step >= 0 && i + step < n; i += step) {
          const A = P[i], B = P[i + step];
          // ... and it ends where the outline turns STEEP (more than
          // ROOT_EDGE_STEEP across per along): an edge running off along the
          // body (a hindwing's inner margin, a forewing's costa beside the head)
          // is not the root edge, and is shifted with the wing, never crushed
          if (Math.abs(B[1] - A[1]) > ROOT_EDGE_STEEP * Math.abs(B[0] - A[0]) && Math.hypot(B[0] - A[0], B[1] - A[1]) > 1e-9) break;
          if ((A[0] <= u) !== (B[0] <= u)) { found = A[1] + ((u - A[0]) * (B[1] - A[1])) / (B[0] - A[0]); break; }
          walked += Math.hypot(B[0] - A[0], B[1] - A[1]);
          if (walked > 1.5 * uEnd + 1) break;
        }
        if (found !== null) last = sign * (found - c0);
        arr[g] = Math.max(1e-6, last);
      }
    };
    edgeAt(0, 1, up, 1);
    edgeAt(n - 1, -1, dn, -1);
    return { du, up, dn };
  };
  // the release runs over ROOT_BLEND_FRAC of the length, or 2.5 fillets — or
  // ROOT_BLEND_SLOPE x the narrowing it has to undo (the root edges' widest
  // reach over that first span, less the neck), so a deep squeeze is released
  // gently, never as a kink the rounded edge folds on
  // (and never shorter than two floors: on a small wing a release inside a
  // millimetre is a wobble the print cannot make — random:29, a 1.55 mm root,
  // read two 0.6 mm lobes once the neck became relative)
  // (derived at length 1, then scaled: measured over a longer stretch the
  // root edges read wider and the derived release grew faster than the slider)
  const un1 = ub + Math.max(R, r.floor);
  const blend0 = Math.max(ROOT_BLEND_FRAC * span, 2.5 * R, 2 * r.floor);
  const first = edges(un1 + blend0);
  let hd = 0; for (let g = 0; g <= NS; g++) hd = Math.max(hd, first.up[g], first.dn[g]);
  // (the two-floor minimum holds AFTER the length: at 0.5x a 1.55 mm root fell
  // back under it — random:29)
  const blend = Math.max(Math.max(blend0, ROOT_BLEND_SLOPE * (hd - hr)) * len, 2 * r.floor), uEnd = un + blend;
  const { du, up, dn } = len === 1 && blend === blend0 ? first : edges(uEnd);
  const at = (arr, u) => { const x = clamp(u / du, 0, NS), i = Math.min(NS - 1, Math.floor(x)), f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
  // the envelope toward the body: a parabola from the neck (curvature radius R
  // there — the FILLET) reaching 45 degrees at the body's silhouette, then on at
  // 45 degrees into the body: C1 everywhere, so no corner for the rounded edge
  // to fold on (a quarter circle ends vertical at the silhouette and leaves a
  // convex corner there, where the bead folded)
  // ... and inside the body the slope eases from 45 degrees at the silhouette
  // back to 0 at the root chord, so the edge meets the root tab TANGENT too (a
  // 45-degree corner there folded the bead's ramp)
  const Eb = R <= 0 ? hr + (un - ub) : un - ub <= R ? hr + ((un - ub) ** 2) / (2 * R) : hr + (un - ub) - R / 2;
  const sb = R <= 0 ? 1 : Math.min(1, (un - ub) / R);   // the slope at the silhouette
  const E = (u) => {
    if (u < ub) return ub > 0 ? Eb + (sb * (ub * ub - Math.max(0, u) ** 2)) / (2 * ub) : Eb;
    const x = un - u; return x <= 0 ? hr : R <= 0 ? hr + x : x <= R ? hr + (x * x) / (2 * R) : hr + x - R / 2;
  };
  const beta = (u) => { const t = clamp((u - un) / blend, 0, 1); return t * t * (3 - 2 * t); };
  // each side: the band between the centre and the root edge is SCALED so the
  // edge lands on e(u) (the envelope, released to the drawn edge by beta);
  // beyond the root edge the wing is only SHIFTED by the same amount — so what
  // lies past the root edge (a hindwing's inner margin beside the abdomen) keeps
  // its shape instead of being crushed into the neck. Slope e/h then 1: monotone.
  // (the drawn edge and the envelope meet through a SMOOTH minimum of width K:
  // a plain min leaves a corner where the envelope first cuts the drawn edge, and
  // the rounded edge folded on it)
  const K = Math.max(R, 0.5);
  const smin = (a, b) => { const q = Math.max(K - Math.abs(a - b), 0) / K; return Math.min(a, b) - (q * q * K) / 4; };
  const eOf = (u, h) => { const target = Math.max(0.5 * hr, smin(h, E(u))), b = beta(u); return target + (h - target) * b; };
  const map1 = (u, x) => {
    if (u >= uEnd) return x;
    const sd = x >= 0 ? 1 : -1, h = at(sd > 0 ? up : dn, Math.max(0, u)), e = eOf(u, h), ax = Math.abs(x);
    return sd * (ax <= h ? (ax * e) / h : ax - h + e);
  };
  const inv1 = (u, y) => {
    if (u >= uEnd) return y;
    const sd = y >= 0 ? 1 : -1, h = at(sd > 0 ? up : dn, Math.max(0, u)), e = eOf(u, h), ay = Math.abs(y);
    return sd * (ay <= e ? (ay * h) / e : ay - e + h);
  };
  // the centre: c0 at the drawn wing, 0 (the hinge) at the root
  const cOf = (u) => c0 * beta(u);
  const full = (u, w) => cOf(u) + map1(u, w - c0);
  if (pinch >= 1) return { hr, R, ub, un, blend, c0, h0, pinch, fwd: (u, w) => [u, full(u, w)], inv: (u, w) => [u, c0 + inv1(u, w - cOf(u))] };
  // THE PINCH MIXES THE STRAIGHT CHORD WITH THE FULL NECK (Eva's ruling: a
  // gentle narrowing, a small gap, no stalk). Shrinking the fillet's radius
  // with the pinch does not do that: a smaller copy of the same curve turns
  // through the same angles, so a low pinch came back as a small KINK (the J
  // clause fired on six gate rows). Mixed, every slope and every turn of the
  // narrowing scales with the pinch, the neck is h0 - pinch (h0 - hr) — the
  // relative rule, never under the full neck's floor-held hr — and a convex
  // mix of two increasing maps of w is increasing, so the map is still a
  // bijection. Its inverse is solved by bisection on that monotone function.
  const fwd1 = (u, w) => w + pinch * (full(u, w) - w);
  return {
    hr: h0 - pinch * (h0 - hr), R: R / pinch, ub, un, blend, c0, h0, pinch,
    fwd: (u, w) => [u, u >= uEnd ? w : fwd1(u, w)],
    inv: (u, y) => {
      if (u >= uEnd) return [u, y];
      let lo = y - 4 * h0 - Math.abs(c0) - 1, hi = y + 4 * h0 + Math.abs(c0) + 1;
      for (let it = 0; it < 80; it++) { const m = 0.5 * (lo + hi); if (fwd1(u, m) < y) lo = m; else hi = m; }
      return [u, 0.5 * (lo + hi)];
    },
  };
}
export const ROOT_SAMPLE_MM = 0.5;    // the outline is resampled to this spacing where the root map acts, so the fillet and the neck are drawn, not chorded
function applyRootWarp(spec, poly) {
  const ident = () => ({ poly, warp: null, rootReduced: false, posOf: poly.map((_, i) => i), srcOf: poly.map((_, i) => i) });
  const R = rootWarp(spec);
  if (!R) return ident();
  const uEnd = R.un + R.blend;
  // densify every edge that reaches into the root map's span (the closing root
  // chord too: it is the polygon's last edge, but it is not resampled — it is
  // the straight root, inside the body)
  const out = [], srcOf = [], posOf = [];
  for (let i = 0; i < poly.length; i++) {
    posOf.push(out.length); out.push(R.fwd(...poly[i])); srcOf.push(i);
    if (i + 1 >= poly.length) break;
    const A = poly[i], B = poly[i + 1];
    if (Math.min(A[0], B[0]) >= uEnd) continue;
    // only where the map MOVES the edge (where it leaves an edge alone it is
    // the identity, and fine samples there only crowd the bead's ramp at the root)
    const fa = R.fwd(...A), fb = R.fwd(...B);
    if (fa[1] === A[1] && fb[1] === B[1]) continue;
    // the length the edge has AFTER the map is what must be fine
    const m = Math.ceil(Math.hypot(fb[0] - fa[0], fb[1] - fa[1], B[1] - A[1]) / ROOT_SAMPLE_MM);
    for (let t = 1; t < m; t++) { out.push(R.fwd(A[0] + ((B[0] - A[0]) * t) / m, A[1] + ((B[1] - A[1]) * t) / m)); srcOf.push(-1); }
  }
  if (polygonSimple(out) && polygonClear(out, OUTLINE_CLEARANCE * spec.length)) return { poly: out, warp: R, rootReduced: false, posOf, srcOf };
  return { ...ident(), rootReduced: true };
}

function drawnPlanformMm(spec) {
  const span = spec.length;
  const base = spec.dense.map(([u, w]) => [u * span, w * span * spec.stretch]);
  let umax = 0; for (const q of base) umax = Math.max(umax, q[0]);
  let apex = 0; for (let i = 1; i < base.length; i++) if (base[i][0] > base[apex][0]) apex = i;
  // Scallops on the TRAILING half (apex -> root trail), each point pulled
  // toward the span line by the cut. If that crosses the outline the depth is
  // halved until it does not (reported on the part).
  let depth = spec.scallop, scalloped = base;
  const applyScallop = (d) => base.map(([u, w], i) => (i > apex ? [u, w * (1 - scallopCut(u / umax, d, Math.round(spec.scallopCount)))] : [u, w]));
  let scallopReduced = false;
  if (depth > 0) {
    const okW = (q) => polygonSimple(q) && polygonClear(q, OUTLINE_CLEARANCE * span);
    for (let it = 0; it < 12; it++) { scalloped = applyScallop(depth); if (okW(scalloped)) break; depth /= 2; scallopReduced = true; }
    if (!okW(scalloped)) { scalloped = base; depth = 0; }
  }
  // the blended root, after the scallop (it moves no point along the span)
  const rw = applyRootWarp(spec, scalloped);
  // the DRAWN outline before the scallop law cuts it (the same root map): what
  // the smoothness clause reads — a scallop is a law applied on top, deliberate by construction
  const drawn = rw.warp ? applyRootWarp(spec, base).poly : base;
  return { base, drawn, scalloped: rw.poly, apex, umax, scallopReduced, rootWarp: rw.warp, rootReduced: rw.rootReduced, posOf: rw.posOf, srcOf: rw.srcOf };
}

/* The wing's EDGE PROFILE (elegance pass, §9.1): its half-thickness at a
   planform point. Two controls, each a separate law, neither below the floor:
     taper  — the thickness falls linearly along the span from the pair's own
              thickness at the root to max(floor, thickness x (1 - taper)) at
              the outermost point;
     bevel  — within `bevel` mm of the drawn outline (the root chord excluded:
              it is inside the body) the thickness ramps linearly down to the
              FLOOR exactly at the outline — a chamfer, both skins inset.
   Both at 0 is the Phase 1/2 vertical-walled slab, BY BRANCH (the same double
   on every vertex). `dist` is the distance to the outline, so the builder can
   tell the outline's own rim vertices from a hole's or the root tab's. */
function edgeField(p, thick, outline, umax) {
  const taper = p.wingEdgeTaper, bevel = p.wingEdgeBevel, floor = p.minDiameter;
  const n = outline.length;
  const dist = (u, w) => {
    let d = Infinity;
    for (let i = 0; i + 1 < n; i++) {
      const a = outline[i], b = outline[i + 1], ax = b[0] - a[0], ay = b[1] - a[1], L2 = ax * ax + ay * ay || 1e-30;
      const t = clamp(((u - a[0]) * ax + (w - a[1]) * ay) / L2, 0, 1);
      const dd = Math.hypot(u - a[0] - t * ax, w - a[1] - t * ay); if (dd < d) d = dd;
    }
    return d;
  };
  if (!(taper > 0) && !(bevel > 0)) { const h = thick / 2; return { h: () => h, dist, flat: true, tip: thick }; }
  const tip = Math.max(floor, thick * (1 - taper));
  const h = (u, w) => {
    const body = thick + (tip - thick) * clamp(u / umax, 0, 1);
    if (!(bevel > 0)) return body / 2;
    const d = dist(u, w);
    return d >= bevel ? body / 2 : (floor + (body - floor) * (d / bevel)) / 2;
  };
  return { h, dist, flat: false, tip };
}

function buildWingPair(acc, p, L, spec, hingeInfo, isLast, N) {
  const thick = Math.max(p.minDiameter, spec.thickness);
  const span = spec.length;
  const { hinge, k } = hingeInfo;
  const embed = Math.max(0.6 * L.rt * k, thick);
  const W = wingTransform(hinge, span, spec.sweep, spec.pitch, spec.dihedral);
  const minW = p.minDiameter;

  // The drawn curve in world millimetres, scallops cut (one owner: drawnPlanformMm).
  const { scalloped, drawn, umax, scallopReduced, rootWarp: rootW, rootReduced, posOf, srcOf } = drawnPlanformMm(spec);
  const edge = edgeField(p, thick, scalloped, umax), hAt = (q) => edge.h(q[0], q[1]);
  // Root: the closing chord moved INTO the thorax by `embed`.
  const n0 = scalloped[0], n1 = scalloped[scalloped.length - 1];
  let poly = [[-embed, n0[1]], ...scalloped, [-embed, n1[1]]];
  // the curve runs clockwise in (u, w); the triangulator wants CCW
  poly = poly.reverse();
  /* Phase 2 — VENATION. The cells are planned on the DRAWN planform (scallops
     and tail included, the root tab excluded), in millimetres, before the wing
     transform: the same W that places the slab places every vein and hole. */
  const mode = p.venation;
  let plan = null;
  if (mode !== 'none') {
    // the tail flags are per DENSE sample; a point the root map inserted takes
    // the flag of both its neighbours (it is never in a tail: the root is not)
    const f0 = tailFlagsFor(spec, spec.dense.length);
    const flags = f0 && srcOf.map((d, i) => (d >= 0 ? f0[d] : false));
    plan = planVenation(scalloped, flags, spec, { holes: mode === 'holes', minCellMm: p.minCellMm, neck: rootW ? { u: rootW.un, c: 0, half: rootW.hr } : null });
  }
  /* The ROUNDED EDGE (§10): every free edge's boundary loop moves inward by
     its bead radius — round x the local half-thickness, the root chord (u <= 0,
     inside the body) square, ramped in over the first mm of span — remembering
     where it was (the bead's apex), and the MOVED loops are what is
     triangulated, so the skins conform and no triangle can flip. */
  const round = p.wingEdgeRound;
  // (under the blended root the bead starts at the body's silhouette, not at
  // the root chord: the stretch inside the body is hidden, and a bead ramping
  // up through the root's fillet folded there)
  const r0 = rootW ? Math.max(0, rootW.ub - ROUND_ROOT_RAMP_MM) : 0;
  const wantRound = (P) => P[0] > r0 + 1e-9;
  const aRound = (q, P) => round * edge.h(q[0], q[1]) * clamp((P[0] - r0) / ROUND_ROOT_RAMP_MM, 0, 1);
  let tri, pts, apex = null, movedOf = null, roundReduced = 0;
  if (plan && mode === 'holes') {
    // ONE conforming triangulation: every cut cell is a ring of quads between
    // its outline and its hole, every solid cell is ear-clipped with its shared
    // vertices kept, and the root tab is three triangles through R — so the
    // frame is a single closed slab whose rim walk (planformSlab) finds the
    // hole rims by the same directed-edge rule as the outer rim.
    ({ pts, tris: tri } = frameMesh(plan, embed, n0, n1));
    tri = flipDegenerate(pts, tri);
    // under the blended root every main vein converges on the neck, so the
    // cells between them are long thin wedges and an ear clip hands back
    // slivers whose facing flips under the wing's bend — contour hairlines up
    // to 0.6 mm inside the outline (measured, dense nets). A Delaunay pass
    // flips them away; the straight root chord keeps its triangulation, so
    // every design without the root is byte-identical.
    if (rootW) tri = delaunayFlip(pts, tri);
    if (round > 0) {
      const r = insetMesh(pts, tri, wantRound, aRound);
      movedOf = new Map(pts.map((q, i) => [`${q[0]},${q[1]}`, r.pts[i]]));
      ({ pts, apex, reduced: roundReduced } = r);
    }
  } else {
    let P = poly;
    if (round > 0) {
      const [r] = insetLoops([poly], wantRound, aRound);
      P = r.pts; apex = r.apex; roundReduced = r.reduced;
      movedOf = new Map(poly.map((q, i) => [`${q[0]},${q[1]}`, P[i]]));
    }
    tri = delaunayFlip(P, earClip(P)); pts = P;
  }
  for (let s = 0; s < WING_SUBDIV; s++) ({ pts, tris: tri, apex } = subdivide(pts, tri, apex));
  // a subdivision midpoint's radius is the mean of its ends' while its
  // half-thickness is the edge law's at the chord's midpoint, which on a
  // concave stretch can be a hair smaller: there the skin edge steps back
  // toward the apex until the radius is round x the half-thickness again, so
  // no bead is ever more than a half-round (measured up to 0.12% before)
  if (apex) for (let i = 0; i < pts.length; i++) {
    const A = apex[i]; if (!A) continue;
    const dx = A[0] - pts[i][0], dy = A[1] - pts[i][1], a = Math.hypot(dx, dy);
    if (!(a > 0)) continue;
    let b = Math.min(a, round * edge.h(pts[i][0], pts[i][1]));
    if (b >= a) continue;
    for (let it = 0; it < 12; it++) b = Math.min(a, round * edge.h(A[0] - (dx / a) * b, A[1] - (dy / a) * b));
    pts[i] = [A[0] - (dx / a) * b, A[1] - (dy / a) * b];
  }
  const part = acc.begin(`wing${spec.index + 1}`, `wing${spec.index + 1}`, 'R');
  const rim = planformSlab(acc, pts, tri, edge.flat ? thick / 2 : edge.h, W, part, apex);
  if (round > 0) part.meta.round = { round, reduced: roundReduced };
  // the EDGE's own thickness, for the gate to measure off the emitted vertices:
  // the rim vertices ON the drawn outline, and every other rim vertex (holes,
  // the root tab)
  part.meta.edgePairs = { outline: [], other: [] };
  for (const r of rim) {
    const q = apex ? apex[r.i] || pts[r.i] : pts[r.i], on = q[0] >= 0 && edge.dist(q[0], q[1]) < 1e-6;
    part.meta.edgePairs[on ? 'outline' : 'other'].push([r.top, r.bot]);
  }
  part.meta.edge = { taper: p.wingEdgeTaper, bevel: p.wingEdgeBevel, root: thick, tip: edge.tip };
  // the slab's layout, for the gate to MEASURE the thickness at every planform
  // point: vertex v0 + i is point i's top, v0 + n + i its bottom
  part.meta.slab = { n: pts.length, uw: pts };
  if (plan) {
    part.meta.venation = plan;
    const xy = (q, h) => { const v = W(q[0], q[1], h); return [v[0], v[1]]; };
    // BOTH rims of every hole: under pitch or dihedral the projected contour
    // of a hole runs along the top rim where its wall faces away from the
    // viewer and along the bottom rim where the wall faces up, so a gate
    // matching the contour against the top rim alone reads the bottom-rim
    // stretches as strays (1.04 mm off at a 1.2 mm sheet and 60 degrees)
    // (with the rounded edge the skins stop short of the hole by the bead's
    // radius: those inset rims and the bead's apex loop — the planned hole at
    // mid-plane — are all on the record)
    const mv = (q) => (movedOf && movedOf.get(`${q[0]},${q[1]}`)) || q;
    part.meta.holeLoops = plan.cells.flatMap((c) => c.holes.flatMap((h) => [h.map((q) => xy(mv(q), hAt(mv(q)))), h.map((q) => xy(mv(q), -hAt(mv(q)))), ...(movedOf ? [h.map((q) => xy(q, 0))] : [])]));
    part.meta.svgStigma = mode === 'ridges' ? plan.cells.filter((c) => c.role === 'stigma').map((c) => c.points.map((q) => xy(q, hAt(q)))) : [];
    part.meta.svgVeins = mode === 'ridges' ? plan.veins.filter((v) => !v.dropped).map((v) => ({ pts: v.points.map((q) => xy(q, hAt(q))), width: (v.width[0] + v.width[1]) / 2 })) : [];
    part.meta.veinWorld = plan.veins.filter((v) => !v.dropped).flatMap((v) => { const o = []; for (let i = 0; i + 1 < v.points.length; i++) o.push(W(v.points[i][0], v.points[i][1], hAt(v.points[i]) + 0.02), W(v.points[i + 1][0], v.points[i + 1][1], hAt(v.points[i + 1]) + 0.02)); return o; });
    // the vein floor: the narrowest vein (the tip width under the taper) and,
    // in HOLES, the margin border, against minDiameter — the same block-the-STL
    // rule as the drawn outline, reported on the part for floorViolations
    const veinMin = spec.veinWidth * (1 - spec.veinTaper), border = mode === 'holes' ? spec.marginBorder : Infinity;
    part.meta.veinFloor = { veinMin, border, under: veinMin < minW - 1e-9 || border < minW - 1e-9 };
  }
  part.meta.thickness = thick;
  part.meta.planform = poly.slice();
  part.meta.pair = spec.index;
  part.meta.linked = spec.linked;
  part.meta.repaired = spec.repaired;
  part.meta.scallopReduced = scallopReduced;
  part.meta.root = rootW ? { pinch: rootW.pinch, width: 2 * rootW.hr, fillet: rootW.R, ub: rootW.ub, neckU: rootW.un, blend: rootW.blend, drawnHalf: rootW.h0, centre: rootW.c0 } : null;
  part.meta.rootReduced = rootReduced;
  // dense sample d of the drawn curve is planform point posOf[d] of the outline
  // (the root map inserts points near the root): consumers that index the
  // planform by control point read this, never d itself
  part.meta.denseAt = posOf;
  // the drawn outline in mm BEFORE the scallop law (root map applied): the gate's smoothness clause reads it
  part.meta.drawnMm = drawn;
  part.meta.hingeY = hinge[1];
  // drawn-width floor: the planform as drawn (tail and scallops included, the
  // root tab inside the body excluded), in millimetres, against minDiameter
  // with the blended root the root chord is no edge: the wing runs on into the
  // body as the root tab, so the measure reads the polygon WITH its tab and
  // judges nothing inside the body (u < 0). Without it, the drawn polygon closed
  // on its root chord, exactly as before.
  const thin = rootW
    ? (() => { const t = thinAnalysis([[-embed, n0[1]], ...scalloped, [-embed, n1[1]]], p.minDiameter, { ignoreXBelow: 0 }); return { ...t, flags: t.flags.slice(1, -1) }; })()
    : thinAnalysis(scalloped, p.minDiameter);
  part.meta.thin = { maxDepth: thin.maxDepth, thin: thin.thin, tau: thin.tau };
  part.meta.thinFlags = Array.from(thin.flags);
  // the same flagged runs in WORLD millimetres, just above the top face — the
  // page draws them red over the 3D view (an overlay, never part of the mesh
  // or of either export), so a thin pair shows red even when it is not the
  // pair open in the editor
  const seg = [], lift = (q) => hAt(q) + 0.02;
  if (thin.thin) for (let i = 0; i < scalloped.length; i++) {
    const j = (i + 1) % scalloped.length;
    if (thin.flags[i] && thin.flags[j]) seg.push(W(scalloped[i][0], scalloped[i][1], lift(scalloped[i])), W(scalloped[j][0], scalloped[j][1], lift(scalloped[j])));
  }
  part.meta.thinWorld = seg;
  acc.end();

  if (plan && mode === 'ridges') buildRidges(acc, plan, W, edge.flat ? () => thick / 2 : edge.h, p.ridgeHeight, spec.index, round, (q) => edge.dist(q[0], q[1]));
}

/* Tail flags per DENSE outline sample: sampleOutline() emits CR_SAMPLES points
   per control segment ending ON each control point, so dense sample d > 0 lies
   in control segment ceil(d / per); it is a tail sample when both bounding
   control points are tail-tagged (or it IS a tail control point). */
function tailFlagsFor(spec, n) {
  if (!spec.tags || !spec.hasTail) return null;
  const T = spec.tags.map((t) => t[0] === 'tail'), per = CR_SAMPLES, out = new Array(n).fill(false);
  for (let d = 0; d < n; d++) {
    if (d === 0) { out[d] = T[0]; continue; }
    const i = Math.ceil(d / per);
    out[d] = d % per === 0 ? !!T[i] : !!(T[i - 1] && T[i]);
  }
  return out;
}

/* Ear clipping that KEEPS exactly-collinear vertices: earClip() drops them
   (they make no triangle), but a vertex another cell shares on that edge must
   stay or the two cells stop being conforming (a T-junction the rim walk then
   reads as two boundary edges). The collinear vertices are removed first,
   recorded, and after triangulation each is put back by splitting the one
   triangle that carries the chord it lies on. */
function triangulateCell(poly) {
  triangulateCell.failures = triangulateCell.failures || [];
  const n = poly.length;
  const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  // "collinear" with a TOLERANCE: a vertex inserted on a straight vein edge by
  // a later cut is a lerp of that edge computed at another time, and sits
  // ~1e-14 off the line — exactly-zero tests miss it and the ear clipper then
  // emits a needle (area ~1e-15), which the STL projects as a hairline loop
  const flat = (a, b, c) => Math.abs(orient(a, b, c)) <= 1e-9 * Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
  let V = [...Array(n).keys()];
  const removed = [];
  for (let changed = true; changed && V.length > 3;) {
    changed = false;
    for (let i = 0; i < V.length; i++) {
      const a = V[(i + V.length - 1) % V.length], b = V[i], c = V[(i + 1) % V.length];
      if (flat(poly[a], poly[b], poly[c])) { removed.push([a, b, c]); V.splice(i, 1); changed = true; break; }
    }
  }
  let tris;
  try { tris = earClip(V.map((i) => poly[i])).map((t) => t.map((k) => V[k])); }
  catch (e) { // a numerically degenerate cell: fan from its first vertex (reported by the gate's O/W clauses if it ever mattered)
    triangulateCell.failures.push({ n: poly.length, reason: String(e.message || e) });
    tris = []; for (let i = 1; i + 1 < V.length; i++) tris.push([V[0], V[i], V[i + 1]]);
  }
  for (let r = removed.length - 1; r >= 0; r--) {
    const [a, m, c] = removed[r];
    const ti = tris.findIndex((t) => t.includes(a) && t.includes(c));
    if (ti < 0) continue;
    const t = tris[ti], x = t.find((v) => v !== a && v !== c);
    // keep the triangle's own winding: (a, c, x) in some rotation
    const ia = t.indexOf(a), forward = t[(ia + 1) % 3] === c;
    tris.splice(ti, 1, forward ? [a, m, x] : [m, a, x], forward ? [m, c, x] : [c, m, x]);
  }
  return improveTriangulation(poly, reinsertUnused(poly, tris));
}

/* earClip drops a vertex that is EXACTLY collinear with its two current
   neighbours (cross product 0), which is right on a planform (nothing is on
   the other side of that edge) and wrong inside the frame: a cross-vein's end
   sits exactly on the main vein it meets, so once the ears around it are
   clipped it is collinear with its neighbours in V, the clipper drops it, and
   the cell is covered by a triangle whose edge spans it while the cell across
   the vein still has it as a vertex — a T-junction, which planformSlab then
   closes with a WALL inside the material and the SVG strokes as a hairline
   (measured: cell 78 of the irregular dense row, 32 vertices, 29 triangles).
   Every triangle edge that passes through a polygon vertex is split there
   (the triangle across the edge too, when it is a diagonal); the dropped
   vertex is still USED elsewhere by the restored fan, so unused-ness is not
   the test, the spanning edge is. */
function reinsertUnused(poly, tris) {
  const onSeg = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1];
    if (!(L2 > 0)) return Infinity;
    const t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L2;
    if (t <= 0 || t >= 1) return Infinity;
    return Math.abs((p[0] - a[0]) * ab[1] - (p[1] - a[1]) * ab[0]) / Math.sqrt(L2);
  };
  // every triangle edge that passes through a polygon vertex (not its own end,
  // and not a doubled copy of one) is split there, on both sides of the edge
  for (let guard = 0; guard < 4 * poly.length; guard++) {
    let hit = null;
    for (let i = 0; i < tris.length && !hit; i++) for (let e = 0; e < 3 && !hit; e++) {
      const u = tris[i][e], v = tris[i][(e + 1) % 3];
      for (let m = 0; m < poly.length; m++) {
        if (m === u || m === v) continue;
        const q = poly[m];
        if ((q[0] === poly[u][0] && q[1] === poly[u][1]) || (q[0] === poly[v][0] && q[1] === poly[v][1])) continue;
        if (onSeg(q, poly[u], poly[v]) < 1e-6) { hit = { u, v, m }; break; }
      }
    }
    if (!hit) break;
    const { u, v, m } = hit;
    for (let i = tris.length - 1; i >= 0; i--) {
      const t = tris[i], e = t.findIndex((a, k) => (a === u && t[(k + 1) % 3] === v) || (a === v && t[(k + 1) % 3] === u));
      if (e < 0) continue;
      const a = t[e], b = t[(e + 1) % 3], x = t[(e + 2) % 3];
      tris.splice(i, 1, [a, m, x], [m, b, x]);
    }
  }
  return tris;
}

/* Lawson flips over one cell's triangulation: every interior diagonal whose
   quad is convex is flipped when that raises the smaller of the two
   triangles' minimum angles. The ear clipper is free to admit a diagonal that
   passes a thousandth of a millimetre from a boundary vertex, which leaves a
   NEEDLE — a triangle of real area whose altitude is far under its length.
   Measured on the dense HOLES row: a 16 mm needle 1.3e-3 mm tall on the
   bottom skin, whose subdivided children carry one nz and different
   edge-length tolerances, so contourLoops' edge-on rule counted the long
   children front and the short ones back and the SVG stroked a hairline
   along the needle. Boundary edges are never flipped, so the cell's outline
   (and the mesh's conformity across cells) is untouched; the bridge edges of a
   bridged hole are boundary edges by index and stay too. */
function improveTriangulation(poly, tris) {
  const minAngle = (a, b, c) => {
    const A = poly[a], B = poly[b], C = poly[c];
    const ang = (P, Q, R) => { const ux = Q[0] - P[0], uy = Q[1] - P[1], vx = R[0] - P[0], vy = R[1] - P[1]; return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy); };
    return Math.min(ang(A, B, C), ang(B, C, A), ang(C, A, B));
  };
  const orient = (a, b, c) => (poly[b][0] - poly[a][0]) * (poly[c][1] - poly[a][1]) - (poly[b][1] - poly[a][1]) * (poly[c][0] - poly[a][0]);
  for (let pass = 0; pass < 50; pass++) {
    const owner = new Map();
    tris.forEach((t, i) => { for (let e = 0; e < 3; e++) owner.set(`${t[e]},${t[(e + 1) % 3]}`, i); });
    let flipped = 0;
    for (let i = 0; i < tris.length; i++) {
      const t = tris[i];
      for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3], x = t[(e + 2) % 3];
        const j = owner.get(`${b},${a}`);
        if (j === undefined || j === i) continue;
        const u = tris[j], y = u.find((v) => v !== a && v !== b);
        if (y === undefined || y === x) continue;
        // (a, b, x) and (b, a, y) are both CCW, so the quad reads a, y, b, x
        // counter-clockwise; it is strictly convex (the flip x-y valid) iff
        // its two remaining corners turn left too
        if (!(orient(y, b, x) > 0 && orient(x, a, y) > 0)) continue;
        const before = Math.min(minAngle(a, b, x), minAngle(b, a, y));
        const after = Math.min(minAngle(a, y, x), minAngle(y, b, x));
        if (after <= before + 1e-12) continue;
        tris[i] = [a, y, x]; tris[j] = [y, b, x];
        for (const [k, tt] of [[i, tris[i]], [j, tris[j]]]) for (let q = 0; q < 3; q++) owner.set(`${tt[q]},${tt[(q + 1) % 3]}`, k);
        owner.delete(`${a},${b}`); owner.delete(`${b},${a}`);
        flipped++; break;
      }
    }
    if (!flipped) break;
  }
  return tris;
}

/* The HOLES frame as one triangle set over one vertex pool (vertices shared by
   coordinate, so a cell edge is the same two indices in both cells). */
function frameMesh(plan, embed, lead, trail) {
  const key = new Map(), pts = [];
  const vid = (q) => { const k = `${q[0]},${q[1]}`; let i = key.get(k); if (i === undefined) { i = pts.length; pts.push([q[0], q[1]]); key.set(k, i); } return i; };
  const tris = [];
  for (const c of plan.cells) {
    const O = c.points.map(vid);
    if (c.holes.length) {
      // the cell with its holes bridged in: one weakly simple polygon, ear
      // clipped with every vertex kept; the duplicated bridge vertices fold
      // back onto one index through vid, so the bridge edges pair up
      const bridged = bridgeHoles(c.points, c.holes);
      const poly = bridged || c.points;
      const ids = poly.map(vid);
      for (const [a, b, cc] of triangulateCell(poly)) { const t = [ids[a], ids[b], ids[cc]]; if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) tris.push(t); }
      if (!bridged) { c.holes = []; c.holeReason = 'bridge-failed'; }
    } else {
      for (const [a, b, cc] of triangulateCell(c.points)) tris.push([O[a], O[b], O[cc]]);
    }
  }
  // the root tab, fanned over EVERY vertex on the root chord (the vein
  // starts), so the chord stays conforming with the cells
  const tt = vid([-embed, trail[1]]), lt = vid([-embed, lead[1]]);
  const ch = plan.rootChord.map(vid);                       // trail ... lead
  for (let i = 0; i + 1 < ch.length; i++) tris.push([tt, ch[i], ch[i + 1]]);
  tris.push([tt, ch[ch.length - 1], lt]);
  return { pts, tris };
}

/* RIDGES: every vein as a closed strip of rectangular section — its width the
   vein's own (tapered along it), standing from a little inside the top skin
   to ridgeHeight above it — and the pterostigma as a plate over its cell.
   Each is its own closed part (kind 'vein'), overlapping the slab: the export
   contract's closed-shells-union. ridgeWidthPairs lets the gate MEASURE the
   emitted width against the floor. */
/* With the rounded edge (round > 0, §10) the ridge is ROUNDED TOO: its top is
   a half ellipse — across the vein's own half-width, round x min(half-width,
   ridge height) high — so at round 1 a ridge as tall as half its width is a
   half-round rod lying on the skin. And a ridge that runs out to the drawn
   outline STOPS SHORT of it: it ends inside the wing's flat skin, one bead
   radius plus 0.05 mm in from the outline, its height ramping down over the
   last 2 x the ridge height so the end dives into the skin — no end wall
   standing over the margin's bead. Round 0 is the rectangular strip, by
   branch. */
function buildRidges(acc, plan, W, halfAt, ridgeH, pairIndex, round = 0, outlineDist = null) {
  // the ridge stands on the LOCAL top skin (the edge field may taper it)
  const h0f = (u, w) => { const half = halfAt(u, w); return half - Math.min(0.15, half * 0.5); };
  const h1f = (u, w) => halfAt(u, w) + ridgeH;
  if (round > 0) return buildRoundRidges(acc, plan, W, halfAt, h0f, h1f, ridgeH, pairIndex, round, outlineDist);
  for (const v of plan.veins) {
    if (v.dropped) continue;
    const pts = v.points, n = pts.length;
    if (n < 2) continue;
    const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[n - 1] || 1;
    if (L < 1e-6) continue;
    const part = acc.begin(`vein${pairIndex + 1}-${v.id}`, 'vein', 'R');
    part.meta.pair = pairIndex; part.meta.ridgeWidthPairs = [];
    const rings = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      const d = [b[0] - a[0], b[1] - a[1]], dl = Math.hypot(d[0], d[1]) || 1, nn = [-d[1] / dl, d[0] / dl];
      const w = lerp(v.width[0], v.width[1], cum[i] / L) / 2, q = pts[i];
      const h0 = h0f(q[0], q[1]), h1 = h1f(q[0], q[1]);
      rings.push([W(q[0] - nn[0] * w, q[1] - nn[1] * w, h0), W(q[0] + nn[0] * w, q[1] + nn[1] * w, h0), W(q[0] + nn[0] * w, q[1] + nn[1] * w, h1), W(q[0] - nn[0] * w, q[1] - nn[1] * w, h1)]);
    }
    const mid = (q) => (h0f(q[0], q[1]) + h1f(q[0], q[1])) / 2;
    const ids = loftRings(acc, rings, W(pts[0][0], pts[0][1], mid(pts[0])), W(pts[n - 1][0], pts[n - 1][1], mid(pts[n - 1])));
    for (const r of ids) part.meta.ridgeWidthPairs.push([r[0], r[1]]);
    acc.end();
  }
  for (const c of plan.cells) {
    if (c.role !== 'stigma') continue;
    const part = acc.begin(`stigma${pairIndex + 1}`, 'vein', 'R');
    part.meta.pair = pairIndex;
    const W2 = (u, w, h) => W(u, w, (h0f(u, w) + h1f(u, w)) / 2 + h);
    planformSlab(acc, c.points, triangulateCell(c.points), (u, w) => (h1f(u, w) - h0f(u, w)) / 2, W2, part);
    delete part.meta.thickPairs;   // a plate's height is the ridge height, not the sheet: the floor is on its WIDTH, and a plate is wider than any vein
    acc.end();
  }
}

const RIDGE_ARC = 6;                        // facets over a rounded ridge's top
function buildRoundRidges(acc, plan, W, halfAt, h0f, h1f, ridgeH, pairIndex, round, outlineDist) {
  const onOutline = (q) => outlineDist && q[0] > 1e-9 && outlineDist(q) < 1e-6;
  for (const v of plan.veins) {
    if (v.dropped) continue;
    const P0 = v.points, n0 = P0.length;
    if (n0 < 2) continue;
    const cum0 = [0]; for (let i = 1; i < n0; i++) cum0.push(cum0[i - 1] + Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]));
    const L0 = cum0[n0 - 1];
    if (!(L0 > 1e-6)) continue;
    const at = (s) => { let i = 1; while (i < n0 - 1 && cum0[i] < s) i++; const t = (s - cum0[i - 1]) / ((cum0[i] - cum0[i - 1]) || 1); return lerp2(P0[i - 1], P0[i], clamp(t, 0, 1)); };
    // stations along the path: arc-length s, and the ridge's height above the
    // skin there (1 = full). An end on the outline is trimmed and ramped.
    const endTrim = (q) => (onOutline(q) ? round * halfAt(q[0], q[1]) + 0.05 : 0);
    const t0 = endTrim(P0[0]), t1 = endTrim(P0[n0 - 1]);
    const ramp = Math.min(2 * ridgeH, 0.35 * L0);
    let sA = t0, sB = L0 - t1;
    if (!(sB - sA > 2 * ramp + 1e-3)) { sA = t0 ? Math.min(t0, 0.3 * L0) : 0; sB = t1 ? L0 - Math.min(t1, 0.3 * L0) : L0; }
    const st = new Map();
    const add = (s, f) => { const k = s.toFixed(9); if (!st.has(k)) st.set(k, { s, f }); };
    for (let i = 0; i < n0; i++) if (cum0[i] > sA + 1e-6 && cum0[i] < sB - 1e-6) add(cum0[i], 1);
    add(sA, t0 ? -1 : 1); add(sB, t1 ? -1 : 1);
    if (t0) add(Math.min(sA + ramp, (sA + sB) / 2), 1);
    if (t1) add(Math.max(sB - ramp, (sA + sB) / 2), 1);
    const S = [...st.values()].sort((a, b) => a.s - b.s);
    for (const x of S) if (x.f > 0) {
      // between an end and its ramp station the height falls linearly
      if (t0 && x.s < sA + ramp) x.f = Math.min(x.f, -1 + 2 * (x.s - sA) / ramp);
      if (t1 && x.s > sB - ramp) x.f = Math.min(x.f, -1 + 2 * (sB - x.s) / ramp);
    }
    const part = acc.begin(`vein${pairIndex + 1}-${v.id}`, 'vein', 'R');
    part.meta.pair = pairIndex; part.meta.ridgeWidthPairs = []; part.meta.ridgeRound = round;
    const rings = [], mids = [];
    for (let i = 0; i < S.length; i++) {
      const q = at(S[i].s), qa = at(S[Math.max(0, i - 1)].s), qb = at(S[Math.min(S.length - 1, i + 1)].s);
      const d = [qb[0] - qa[0], qb[1] - qa[1]], dl = Math.hypot(d[0], d[1]) || 1, nn = [-d[1] / dl, d[0] / dl];
      const w = lerp(v.width[0], v.width[1], S[i].s / L0) / 2, half = halfAt(q[0], q[1]);
      const h0 = h0f(q[0], q[1]);
      // f = 1: the full ridge; f falls to -1 at a trimmed end, where the top
      // sits 0.05 mm under the skin (inside the wing: hidden)
      const above = S[i].f >= 0 ? ridgeH * S[i].f : 0.05 * S[i].f;
      const h1 = Math.max(h0 + 0.02, half + above);
      const rv = round * clamp(Math.min(w, h1 - half), 0, h1 - h0 - 0.01);
      const zc = h1 - rv;
      const R = [W(q[0] - nn[0] * w, q[1] - nn[1] * w, h0), W(q[0] + nn[0] * w, q[1] + nn[1] * w, h0)];
      for (let j = 0; j <= RIDGE_ARC; j++) { const t = (Math.PI * j) / RIDGE_ARC, c = j === RIDGE_ARC ? -1 : Math.cos(t), sn = j === RIDGE_ARC ? 0 : Math.sin(t); R.push(W(q[0] + nn[0] * w * c, q[1] + nn[1] * w * c, zc + rv * sn)); }
      rings.push(R); mids.push(W(q[0], q[1], (h0 + h1) / 2));
    }
    const ids = loftRings(acc, rings, mids[0], mids[mids.length - 1]);
    for (const r of ids) part.meta.ridgeWidthPairs.push([r[0], r[1]]);
    acc.end();
  }
  for (const c of plan.cells) {
    if (c.role !== 'stigma') continue;
    const part = acc.begin(`stigma${pairIndex + 1}`, 'vein', 'R');
    part.meta.pair = pairIndex;
    const W2 = (u, w, h) => W(u, w, (h0f(u, w) + h1f(u, w)) / 2 + h);
    // the plate's bead is round x its own half-height, its apex on the cell's
    // own outline like every other bead. (Pulling the plate's outline-side
    // edge inside the wing's flat skin was tried: on a narrow stigma cell the
    // pull ate the whole room, the bead went to 0 there and its vertical
    // facets made the SVG contour chain asymmetrically. Where the plate meets
    // the leading margin its rounded edge stands over the wing's own bead.)
    const [ins] = insetLoops([c.points], () => true, (q) => round * (h1f(q[0], q[1]) - h0f(q[0], q[1])) / 2);
    planformSlab(acc, ins.pts, triangulateCell(ins.pts), (u, w) => (h1f(u, w) - h0f(u, w)) / 2, W2, part, ins.apex);
    delete part.meta.thickPairs;
    acc.end();
  }
}

/* ------------------------------------------------------------------ */
/* Legs                                                                 */
/* ------------------------------------------------------------------ */

/* Reach 1: the Phase 1 pose — each leg heads outward on its splay azimuth.
   Reach 0: TUCKED — the coxa drops, then femur back, tibia forward, tarsus back,
   folded flat under the body along the root's own x (folding toward the
   thorax's middle instead was measured and read WORSE: front tibiae reach out
   under the narrow neck), so seen from above the
   leg sits under the body's silhouette. Every segment's heading is a blend of
   the two and is never zero-length (the splayed heading always has x > 0). */
function buildLegs(acc, p, L) {
  const n = p.legPairs;
  const floorR = tubeFloorR(p);
  const r0 = Math.max(floorR, (LEG_ROOT_FRAC * L.rt) / 2);
  const r1 = Math.max(floorR, r0 * (1 - p.legTaper));
  const reach = p.legReach;
  for (let i = 0; i < n; i++) {
    const yi = n === 1 ? 0 : (L.Lt / 2) * (0.5 - (1.0 * i) / (n - 1));
    const kk = Math.sqrt(Math.max(0, 1 - (yi / (L.Lt / 2)) ** 2));
    // tucked, the coxae fold onto the midline (a pinned specimen's legs lie
    // under the sternum): the Phase 1/2 0.2 rt was wider than a slim body's
    // floor-wide waist. At reach 1 the old expression, untouched.
    const rootX = (reach < 1 ? lerp(0.04, 0.35, reach) : lerp(0.2, 0.35, reach)) * L.rt * kk;
    const root = [rootX, yi, -0.3 * L.dt * kk];
    const az = (n === 1 ? 0 : p.legSplay * (1 - (2 * i) / (n - 1))) * D2R;   // + = forward
    const out = [Math.cos(az), Math.sin(az), 0];
    const b = p.legBend;
    const elevOut = [-35, 15 + 0.6 * b, 15 + 0.6 * b - (60 + b), 15 + 0.6 * b - (60 + b) + 35];
    const elevTuck = [-70, -4, 0, -4];
    const tuckH = [[0, 0, 0], [0, -1, 0], [0, 1, 0], [0, -1, 0]];
    const lens = [p.coxa, p.femur, p.tibia, p.tarsus];
    const total = lens.reduce((a, c) => a + c, 0);
    const pts = [root]; let acc0 = 0; const rad = [r0];
    for (let s = 0; s < 4; s++) {
      const e = lerp(elevTuck[s], elevOut[s], reach) * D2R;
      const hz = norm(add(mul(tuckH[s], 1 - reach), mul(out, reach + (s === 0 ? 1e-3 : 0))));
      const dir = add(mul(hz, Math.cos(e)), [0, 0, Math.sin(e)]);
      pts.push(add(pts[s], mul(dir, lens[s])));
      acc0 += lens[s];
      rad.push(Math.max(floorR, lerp(r0, r1, acc0 / total)));
    }
    // Tucked legs stay inside the body's own silhouette: every joint's x is
    // held within the body's half-width at that joint's y (less the tube), so
    // a fold that runs back past a wide thorax beside a narrow abdomen does
    // not reappear there as two stubs (the revised sheet's random 8). Blended
    // out by reach: a splayed leg is meant to show.
    // (Elegance pass: the hold is the NARROWEST body width along the segment
    // that reaches the joint, not only the width at the joint's own y — on a
    // slim body a femur folding back across the waist showed there, 6.3% of
    // the legs' area on the new default. Applied only while tucked (reach < 1):
    // at reach 1 the blend ignores the hold, and the arithmetic is the old one.)
    for (let s = 1; s <= 4; s++) {
      let lim = Math.max(0, 0.85 * profileAt(p, L, pts[s][1])[0] - rad[s]);
      if (reach < 1) {
        const y0 = pts[s - 1][1], y1 = pts[s][1];
        for (let k = 0; k <= 12; k++) lim = Math.min(lim, Math.max(0, 0.85 * profileAt(p, L, lerp(y0, y1, k / 12))[0] - Math.max(rad[s - 1], rad[s])));
        // never ON the midline: there the left leg is the right one's exact
        // mirror image, the two closed tubes coincide face for face and the
        // welded STL reads every edge four times (measured, 1,506 edges)
        lim = Math.max(lim, TUCK_MIDLINE_GAP);
      }
      const x = Math.min(pts[s][0], lim);
      pts[s] = [lerp(x, pts[s][0], reach), pts[s][1], pts[s][2]];
    }
    const part = acc.begin(`leg${i + 1}`, 'leg', 'R');
    part.meta.tubeRings = [];
    if (p.pointedTips) part.meta.points = [];
    for (let s = 0; s < 4; s++) frustum(acc, pts[s], pts[s + 1], rad[s], rad[s + 1], part.meta.tubeRings, s === 3 ? part.meta.points : undefined);
    acc.end();
    // a joint between two segments is a knuckle; the END of the tarsus is not a
    // joint — POINTED, it is the cone above and carries no ball
    for (let s = 1; s <= (p.pointedTips ? 3 : 4); s++) {
      acc.begin(`leg${i + 1}-joint${s}`, 'leg', 'R');
      sphere(acc, pts[s], Math.max(rad[s - 1], rad[s]) * 1.08);
      acc.end();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Antennae                                                             */
/* ------------------------------------------------------------------ */

/* The antenna. Its END is where the elegance pass acts (§9.2, §9.4):
   CLUBBED with clubLength > 0 is a TEARDROP — the shaft thickens gradually
   over its last clubLength, peaks at clubWidth x the shaft, and closes toward
   the tip by clubTaper (0 blunt, 1 drawn back to the floor) — never a sphere;
   clubLength 0 is the Phase 1/2 ellipsoid knob, by branch.
   POINTED tips: every antenna END is a floored cone (TIP_POINT), never a ball;
   FEATHERED pinnae follow a LEAF envelope (short at the base, longest a third
   of the way out, vanishing at the tip) and each pinna ends in a point. With
   pointed off, the tip ball and the old fan of equal-taper pinnae, by branch. */
/* A TEARDROP along x in [0, 1] of the club: the drop's thin tail toward the
   shaft (a gradual sin^2 swell to clubWidth x the shaft at xp), its round head
   toward the tip (an elliptical close). clubTaper moves the peak back and draws
   the end down: 0 ends at 0.55 of the club's width (a rounded end), 1 closes
   onto the floor. Never under the floor anywhere. */
export function clubRadius(x, rBase, width, taper, floorR) {
  const rClub = rBase * width, xp = lerp(0.82, 0.62, taper);
  if (x <= xp) { const g = Math.sin((Math.PI / 2) * (x / xp)) ** 2; return rBase + (rClub - rBase) * g; }
  const rEnd = Math.max(floorR, lerp(0.55 * rClub, floorR, taper));
  const y = (x - xp) / (1 - xp);
  return rEnd + (rClub - rEnd) * Math.sqrt(Math.max(0, 1 - y * y));
}
function buildAntenna(acc, p, L) {
  const type = p.antennaType;
  const floorR = tubeFloorR(p);
  const sizeRef = L.insect ? p.headSize : p.thoraxWidth * 0.6;
  let r0 = Math.max(floorR, (ANT_ROOT_FRAC * sizeRef) / 2);
  const root = L.insect
    ? [0.25 * L.Rh, L.yh + 0.5 * L.Rh, 0.45 * L.Rh * HEAD_DEPTH_RATIO]
    : [0.2 * L.rt, L.Lt / 2 - 0.15 * L.Lt, 0.3 * L.dt];
  const sp = p.antennaSpread * D2R;
  let dir = norm([Math.sin(sp), Math.cos(sp), 0.35]);
  const curlAxis = norm(cross(dir, [0, 0, 1]));
  const len0 = p.antennaLength;
  const teardrop = type === 'clubbed' && p.clubLength > 0;
  const pointed = p.pointedTips;
  const M = teardrop ? 56 : 28;
  const pts = [root], rad = [];
  const rTip = type === 'bristle' ? floorR : Math.max(floorR, r0 * 0.8);
  if (type === 'bristle') r0 = Math.max(floorR, r0 * 1.6);
  for (let i = 1; i <= M; i++) {
    const s = i / M;
    const ang = p.antennaCurl * D2R * s * s;            // curl grows toward the tip
    const d = rotateAbout(dir, curlAxis, -ang);
    pts.push(add(pts[i - 1], mul(d, len0 / M)));
  }
  for (let i = 0; i <= M; i++) {
    const s = i / M, rb = Math.max(floorR, lerp(r0, rTip, s));
    const s0 = 1 - p.clubLength;
    rad.push(teardrop && s > s0 ? clubRadius((s - s0) / p.clubLength, rb, p.clubWidth, p.clubTaper, floorR) : rb);
  }
  const part = acc.begin('antenna', 'antenna', 'R');
  part.meta.tubeRings = [];
  if (pointed) part.meta.points = [];
  const T = tubeAlong(acc, pts, rad, part.meta.tubeRings, pointed ? part.meta.points : undefined);
  if (teardrop) part.meta.club = { length: p.clubLength, width: p.clubWidth, taper: p.clubTaper, rBase: rad[Math.floor(M * (1 - p.clubLength))], rings: part.meta.tubeRings.slice() };
  acc.end();
  const tip = pts[M];
  if (type === 'clubbed' && !teardrop) {
    const t = T[M];
    const [u, v] = frameFor(t);
    acc.begin('antenna-club', 'antenna', 'R');
    ellipsoid(acc, sub(tip, mul(t, 0.06 * len0)), [u, v, t], [rTip * 2.6, rTip * 2.6, Math.max(0.12 * len0, rTip * 3)]);
    acc.end();
  } else if (!pointed) {
    acc.begin('antenna-tip', 'antenna', 'R');
    sphere(acc, tip, (teardrop ? rad[M] : rTip) * 1.05);
    acc.end();
  }
  if (type === 'feathered') {
    const pp = acc.begin('antenna-pinnae', 'antenna', 'R');
    pp.meta.tubeRings = [];
    if (!pointed) {
      const K = 11;
      for (let k = 0; k < K; k++) {
        const s = 0.12 + (0.85 * k) / (K - 1);
        const i = Math.round(s * M);
        const lat = norm(cross(T[i], [0, 0, 1]));
        const pl = 0.32 * len0 * (1 - 0.6 * s);
        for (const sg of [1, -1]) {
          const d = norm(add(mul(T[i], 0.5), mul(lat, sg * 0.87)));
          frustum(acc, pts[i], add(pts[i], mul(d, pl)), floorR, floorR, pp.meta.tubeRings);
        }
      }
    } else {
      // a LEAF: K pinnae each side, lengths on a lanceolate envelope, each a
      // floored wire ending in a point, swept toward the tip
      pp.meta.points = [];
      const K = 15;
      const leaf = (s) => (s < 0.35 ? Math.sin((Math.PI / 2) * (s / 0.35)) ** 0.6 : ((1 - s) / 0.65) ** 1.15);
      for (let k = 0; k < K; k++) {
        const s = 0.06 + (0.9 * k) / (K - 1);
        const i = Math.round(s * M);
        const pl = 0.3 * len0 * leaf(s);
        if (pl < 2 * floorR) continue;
        const lat = norm(cross(T[i], [0, 0, 1]));
        for (const sg of [1, -1]) {
          const d = norm(add(mul(T[i], 0.75), mul(lat, sg * 0.66)));
          frustum(acc, pts[i], add(pts[i], mul(d, pl)), floorR, floorR, pp.meta.tubeRings, pp.meta.points);
        }
      }
    }
    acc.end();
  }
}

function rotateAbout(v, k, a) {   // Rodrigues
  const c = Math.cos(a), s = Math.sin(a);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

function normalizeWing(w, fallback, notes, label) {
  const out = {};
  for (const f of WING_FIELDS) {
    let v = Number(w && w[f.id]);
    if (!Number.isFinite(v)) v = fallback[f.id];
    out[f.id] = clamp(v, f.min, f.max);
  }
  const pts = w && Array.isArray(w.points) ? w.points.map((q) => (Array.isArray(q) ? [Number(q[0]), Number(q[1])] : q)) : null;
  const v = pts ? outlineValid(pts) : { ok: false, reason: 'no outline' };
  if (v.ok) out.points = pts;
  else { out.points = fallback.points.map((q) => q.slice()); if (w && w.points) notes.push(`${label} outline refused (${v.reason}); the default outline was used`); }
  return out;
}

function normalizeTail(t, p, q, notes) {
  // a design from before the tail ruling: the old sliders become a tagged group
  if (!t && Number(p.tailLength) > 0) {
    const bottom = q.wingPairs <= 1 ? q.wings.first : q.wings.last;
    const fit = fitMigratedTail(bottom.points, migrateOldTail(p, bottom.length)), m = fit.tail;
    const how = fit.scale === 1 ? '' : fit.scale ? `, scaled to ${Math.round(fit.scale * 100)}% to fit the bottom pair's outline` : ', but it does not fit the bottom pair\'s outline at any scale and is not drawn until the outline or the tail is edited';
    notes.push(`the old tail sliders (length ${(+p.tailLength).toFixed(1)} mm, width ${(+p.tailWidth || 2.4).toFixed(1)} mm, club ${(+p.tailClub || 0).toFixed(2)}) were migrated into a TAIL group of ${m.points.length} control points on the bottom pair${how}`);
    return m;
  }
  const out = JSON.parse(JSON.stringify(STARTER_TAIL));
  if (!t) return out;
  out.on = !!t.on;
  if (Number.isFinite(+t.anchorU)) out.anchorU = clamp(+t.anchorU, 0, OUTLINE_BOUNDS.u[1]);
  if (Array.isArray(t.points) && t.points.length >= MIN_TAIL_POINTS && t.points.every((d) => Array.isArray(d) && Number.isFinite(+d[0]) && Number.isFinite(+d[1]))) out.points = t.points.map((d) => [+d[0], +d[1]]);
  else if (t.points) notes.push('the tail group in the file was unreadable; the starter tail was used');
  return out;
}

/* Clamp every field to its range and validate every outline. An invalid
   outline is REPLACED by the default and the replacement is reported in
   `notes` — a design is never silently partly loaded. */
export function normalizeParams(p, notes = []) {
  const q = clone(DEFAULTS);
  for (const s of PARAM_SPEC) {
    if (!(s.id in p)) continue;
    let v = p[s.id];
    if (s.kind === 'range') { v = Number(v); if (!Number.isFinite(v)) v = s.default; v = clamp(v, s.min, s.max); if (s.step >= 1) v = Math.round(v); }
    else if (s.kind === 'bool') v = v === true || v === 'true' || v === 1;
    else { v = String(v); if (!s.options.some((o) => o[0] === v)) v = s.default; }
    q[s.id] = v;
  }
  const W = p.wings || {};
  q.wings = {
    first: normalizeWing(W.first, DEFAULT_WINGS.first, notes, 'first pair'),
    last: normalizeWing(W.last, DEFAULT_WINGS.last, notes, 'last pair'),
    unlinked: {},
  };
  q.wings.tail = normalizeTail(W.tail, p, q, notes);
  for (const [k, w] of Object.entries(W.unlinked || {})) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 1 && i <= MAX_WING_PAIRS - 2 && w) q.wings.unlinked[i] = normalizeWing(w, DEFAULT_WINGS.first, notes, `pair ${i + 1}`);
  }
  return q;
}

/* ---------------- designs (save / load) ---------------- */
export const DESIGN_FORMAT = 'parametric-bug-design';
export const DESIGN_VERSION = 6;   // 6: the blended wing root (wingRootPinch) — a v5 file loads with the pinch at 0, its straight root chord, so it looks as saved; 5: the edges pass (the rounded edge, wingEdgeRound) — a v4 file loads with the round at 0, so it looks as saved; 4: the elegance pass (edge profile, club shape, segment style, pointed tips) — a v1-3 file loads with LEGACY_STYLE for the new fields, so it looks as it did; 3: venation (Phase 2) — a `venation` mode and per-pair vein fields, all defaulted when absent; 2: the tail is an outline group (wings.tail); v1 files load and migrate
export function designFromParams(p, name = '') {
  return { format: DESIGN_FORMAT, version: DESIGN_VERSION, name, params: clone(p) };
}
export function paramsFromDesign(doc) {
  if (!doc || doc.format !== DESIGN_FORMAT) return { ok: false, reason: 'not a Parametric Bug design file' };
  if (doc.version > DESIGN_VERSION) return { ok: false, reason: `design version ${doc.version} is newer than this page (${DESIGN_VERSION})` };
  const notes = [];
  // a design saved before the elegance pass did not know the new controls: they
  // load at their OLD ends (each a branch to the old code), so it looks as saved
  const raw = { ...(doc.params || {}) };
  if (!(doc.version >= 4)) for (const [k, v] of Object.entries(LEGACY_STYLE)) if (!(k in raw)) raw[k] = v;
  if (!(doc.version >= 5)) for (const [k, v] of Object.entries(PRE_ROUND_STYLE)) if (!(k in raw)) raw[k] = v;
  if (!(doc.version >= 6)) for (const [k, v] of Object.entries(PRE_ROOT_STYLE)) if (!(k in raw)) raw[k] = v;
  const params = normalizeParams(raw, notes);
  return { ok: true, params, notes };
}

/* `opts.flatPair` (k, display only): pair k is built with its dihedral and
   pitch at 0 — the page shows the wing being edited FLAT so a screen drag
   maps exactly onto its outline (editorFrame). The parameters are untouched;
   the page never exports a model built with this option. */
export function buildBug(params, opts = {}) {
  const notes = [];
  const p = normalizeParams(params, notes);
  const L = bodyLayout(p);
  const acc = new Acc();
  buildBody(acc, p, L);
  if (p.legsVisible && p.legPairs > 0) buildLegs(acc, p, L);
  if (p.antennaType !== 'none') buildAntenna(acc, p, L);
  const pairs = resolveWingPairs(p);
  if (Number.isInteger(opts.flatPair) && pairs[opts.flatPair]) { pairs[opts.flatPair] = { ...pairs[opts.flatPair], dihedral: 0, pitch: 0 }; }
  const hinges = wingHinges(p, L);
  for (const spec of pairs) {
    // A blended root whose rounded edge cannot be inset (a hook at the root,
    // tighter than the bead, squeezed tighter by the root map) is stepped down —
    // half the fillet, no fillet, then the drawn root chord — and reported; the
    // triangulation throws before anything of the pair is emitted, so a retry
    // starts clean.
    const tries = spec.root ? [1, 0.5, 0, null] : [undefined];
    for (let t = 0; t < tries.length; t++) {
      const s2 = tries[t] === undefined ? spec : { ...spec, root: tries[t] === null ? null : { ...spec.root, filletScale: tries[t] } };
      try {
        buildWingPair(acc, p, L, s2, hinges[spec.index], spec.index === pairs.length - 1, pairs.length);
        if (t > 0) notes.push(`pair ${spec.index + 1}: the rounded edge could not follow the blended root here, so ${tries[t] === null ? 'this pair keeps its drawn root chord' : `its fillet was reduced to ${tries[t] ? 'half' : 'none'}`}`);
        break;
      } catch (e) { if (t === tries.length - 1 || !/earClip|not simple/.test(e.message)) throw e; }
    }
  }
  for (const s of pairs) if (s.tailFits === false) notes.push(`pair ${s.index + 1}: the TAIL does not fit this outline (it would cross or pinch it) and is not drawn; edit it or the outline`);
  for (const s of pairs) if (s.repaired) notes.push(`pair ${s.index + 1}: the interpolated outline crossed itself and was eased toward the nearer drawn pair (t ${s.t.toFixed(2)} -> ${s.tUsed.toFixed(2)})`);
  for (const part of acc.parts) if (part.meta.scallopReduced) notes.push(`pair ${part.meta.pair + 1}: scallop depth reduced so the outline does not cross itself`);
  // a narrow root's pinch is EASED (rootWarp's fade, §13.4): said, never silent
  for (const s of pairs) { if (!s.root) continue; const rw = rootWarp(s), eff = rw ? rw.pinch : 0; if (eff < s.root.pinch - 1e-9) notes.push(`pair ${s.index + 1}: its drawn root is narrow — within 1¼ floors of the floor-held neck — so the root pinch is eased to ${eff > 0 ? eff.toFixed(2) : 'none'}`); }
  for (const part of acc.parts) if (part.meta.rootReduced) notes.push(`pair ${part.meta.pair + 1}: the blended root would make the outline cross or pinch, so this pair keeps its drawn root chord`);

  // Mirror every right-side part into its left twin.
  const rightParts = acc.parts.filter((q) => q.side === 'R');
  for (const q of rightParts) {
    const shift = acc.pos.length / 3 - q.v0;
    const lp = { name: q.name, kind: q.kind, side: 'L', v0: acc.pos.length / 3, t0: acc.idx.length / 3, meta: mirrorMeta(q.meta, shift) };
    for (let v = q.v0; v < q.v1; v++) acc.pos.push(mx(acc.pos[3 * v]), acc.pos[3 * v + 1], acc.pos[3 * v + 2]);
    for (let t = q.t0; t < q.t1; t++) {
      const a = acc.idx[3 * t], b = acc.idx[3 * t + 1], c = acc.idx[3 * t + 2];
      acc.idx.push(a + shift, c + shift, b + shift);
    }
    lp.v1 = acc.pos.length / 3; lp.t1 = acc.idx.length / 3;
    acc.parts.push(lp);
  }

  return {
    params: p,
    layout: L,
    wingPairs: pairs.map((s) => {
      const part = acc.parts.find((q) => q.kind === `wing${s.index + 1}` && q.side === 'R');
      return { index: s.index, role: s.role, linked: s.linked, repaired: s.repaired, dense: s.dense, hingeY: hinges[s.index].y,
        hasTail: !!s.hasTail, tags: s.tags || null, thin: part.meta.thin, thinFlags: part.meta.thinFlags,
        // Phase 2: the venation record (planform mm) — cells as closed polygons, veins, holes
        venation: part.meta.venation || null,
        veinFloor: part.meta.veinFloor || null,
        // both wings: the right's runs and their mirror images; a vein-floor
        // violation adds the vein centrelines, so the page draws THEM red
        thinSegments: [...part.meta.thinWorld, ...part.meta.thinWorld.map(([x, y, z]) => [mx(x), y, z]),
          ...(part.meta.veinFloor && part.meta.veinFloor.under ? [...part.meta.veinWorld, ...part.meta.veinWorld.map(([x, y, z]) => [mx(x), y, z])] : [])] };
    }),
    // every pair whose DRAWN planform is narrower than the floor somewhere: the
    // STL exporter refuses the model while this list is not empty (see exportStl).
    // A LINKED middle pair is not drawn by anyone: it is blended from the first
    // and last pairs, and `blendedFrom` names them so the refusal can say what
    // to widen (or that unlinking it makes it editable).
    floorViolations: [
      ...pairs.map((s) => ({
        pair: s.index, kind: 'outline', ...acc.parts.find((q) => q.kind === `wing${s.index + 1}` && q.side === 'R').meta.thin,
        blendedFrom: s.role === 'mid' && s.linked ? [0, p.wingPairs - 1] : null,
      })).filter((v) => v.thin),
      // Phase 2: a pair whose veins taper under the floor (or, in HOLES, whose
      // margin border is under it) blocks the STL the same way
      ...pairs.map((s) => {
        const vf = acc.parts.find((q) => q.kind === `wing${s.index + 1}` && q.side === 'R').meta.veinFloor;
        return vf && vf.under ? { pair: s.index, kind: 'vein', veinMin: vf.veinMin, border: vf.border, thin: true, blendedFrom: s.role === 'mid' && s.linked ? [0, p.wingPairs - 1] : null } : null;
      }).filter(Boolean),
    ],
    notes,
    positions: Float64Array.from(acc.pos),
    indices: Uint32Array.from(acc.idx),
    parts: acc.parts,
    triangleCount: acc.idx.length / 3,
  };
}

/* The ON-WING EDITOR's frame (edges pass, §10): pair k's RIGHT wing drawn
   FLAT (dihedral and pitch 0 — buildBug's flatPair), as a map between the
   drawn outline's own units (u along the span in lengths, w along the chord
   in lengths x stretch... i.e. the editor's (u, w)) and WORLD millimetres seen
   from above (x right, y head). It is the wing transform with no tilt, so it
   is a rigid motion plus the two scales: sweep rotates, stretch scales the
   chord, length scales both. ONE owner, read by the page to place the points
   on the wing and to turn a pointer into an outline point, and by the gate's
   Q clause, which measures it against the EMITTED geometry. */
export function editorFrame(params, k) {
  const p = normalizeParams(params);
  const spec = resolveWingPairs(p)[k];
  if (!spec) return null;
  const { hinge } = wingHinges(p, bodyLayout(p))[k];
  const L = spec.length, S = L * spec.stretch, sw = spec.sweep * D2R, cs = Math.cos(sw), sn = Math.sin(sw);
  // the blended root's map (§12.1), the same one the builder applies — so a
  // control point near the root is drawn on the wing it shapes, and a drag there
  // lands where the hand put it (inverted exactly: the map is affine in w)
  const rw = rootWarp(spec), fw = rw ? rw.fwd : (a, b) => [a, b], iw = rw ? rw.inv : (a, b) => [a, b];
  return {
    pair: k, length: L, stretch: spec.stretch, sweep: spec.sweep, hinge: [hinge[0], hinge[1]], rootWarp: rw,
    toWorld: (u, w) => { const [a, b] = fw(u * L, w * S); return [hinge[0] + a * cs + b * sn, hinge[1] - a * sn + b * cs]; },
    fromWorld: (x, y) => { const dx = x - hinge[0], dy = y - hinge[1]; const [a, b] = iw(dx * cs - dy * sn, dx * sn + dy * cs); return [a / L, b / S]; },
  };
}
/* The SVG export's own frame: world mm <-> the file's user units (mm, y down). */
export const svgFromWorld = (frame, x, y) => [x - frame.x0 + frame.margin, frame.y1 - y + frame.margin];
export const worldFromSvg = (frame, X, Y) => [X + frame.x0 - frame.margin, frame.y1 + frame.margin - Y];

function mirrorMeta(m, shift) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'tubeRings') out[k] = v.map(([a, n]) => [a + shift, n]);
    else if (k === 'thickPairs' || k === 'ridgeWidthPairs') out[k] = v.map(([a, b]) => [a + shift, b + shift]);
    else if (k === 'edgePairs') out[k] = { outline: v.outline.map(([a, b]) => [a + shift, b + shift]), other: v.other.map(([a, b]) => [a + shift, b + shift]) };
    else if (k === 'points') out[k] = v.map((q) => ({ apex: q.apex + shift, ring: [q.ring[0] + shift, q.ring[1]] }));
    else if (k === 'club') out[k] = { ...v, rings: v.rings.map(([a, n]) => [a + shift, n]) };
    else if (k === 'holeLoops' || k === 'svgStigma') out[k] = v.map((L) => L.map(([x, y]) => [mx(x), y]));
    else if (k === 'svgVeins') out[k] = v.map((l) => ({ ...l, pts: l.pts.map(([x, y]) => [mx(x), y]) }));
    else if (k === 'veinWorld') out[k] = v.map(([x, y, z]) => [mx(x), y, z]);
    else if (k === 'bead') out[k] = { ...v, rings: v.rings.map((r) => ({ ...r, ids: r.ids.map((i) => i + shift) })) };
    else out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Symmetry check — on the emitted triangles, exact doubles             */
/* ------------------------------------------------------------------ */

export function mirrorDiff(model) {
  const P = model.positions, I = model.indices;
  const key = (v, mirror) => {
    const x = P[3 * v];
    const xx = mirror ? (x === 0 ? 0 : -x) : (x === 0 ? 0 : x);
    return `${xx},${P[3 * v + 1]},${P[3 * v + 2]}`;
  };
  const canon = (a, b, c) => {   // rotate so the smallest key leads; keep orientation
    if (a <= b && a <= c) return `${a}|${b}|${c}`;
    if (b <= a && b <= c) return `${b}|${c}|${a}`;
    return `${c}|${a}|${b}`;
  };
  const counts = new Map();
  const n = I.length / 3;
  for (let t = 0; t < n; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const k = canon(key(a, false), key(b, false), key(c, false));
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let unmatched = 0;
  for (let t = 0; t < n; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const k = canon(key(a, true), key(c, true), key(b, true));   // mirror reverses winding
    const m = counts.get(k) || 0;
    if (m > 0) counts.set(k, m - 1); else unmatched++;
  }
  return unmatched;
}

/* ------------------------------------------------------------------ */
/* STL exporter — reads the model only                                  */
/* ------------------------------------------------------------------ */

/* The STL is REFUSED while any drawn planform is narrower than the floor
   (model.floorViolations): it would ship geometry below the minimum feature
   with nothing on the print to say so. Blocking, not thickening, is the
   ruling's choice — see bug-project-design-doc.md §5.10. `allowBelowFloor` is
   for the gate's own analysis of a refused model (watertightness is still
   checked on it); the page never passes it. */
export class FloorError extends Error {}
/* One sentence per violating pair, each ending in what to DO about it. A drawn
   pair (first, last, the only one, or an unlinked middle one) is widened where
   it shows red in the editor. A linked middle pair has no drawing of its own,
   so the sentence names the two drawn pairs it is blended from and the other
   way out: unlink it and edit it directly. */
export function floorReason(model) {
  const f = model.params.minDiameter.toFixed(2);
  return model.floorViolations.map((v) => {
    const k = v.pair + 1;
    if (v.kind === 'vein') {
      const what = v.veinMin < model.params.minDiameter ? `veins taper to ${v.veinMin.toFixed(2)} mm` : `margin border is ${v.border.toFixed(2)} mm`;
      const fix = v.veinMin < model.params.minDiameter ? 'Raise its vein width or lower its taper' : 'Widen its margin border';
      if (v.blendedFrom) { const [a, b] = v.blendedFrom.map((i) => i + 1); return `Pair ${k}'s ${what}, narrower than the ${f} mm floor (the veins are shown red in the view). Pair ${k} is blended from pairs ${a} and ${b}. Widen those, or unlink pair ${k} to edit it directly.`; }
      return `Pair ${k}'s ${what}, narrower than the ${f} mm floor (the veins are shown red in the view). ${fix} there.`;
    }
    const how = `the narrow part reaches ${v.maxDepth.toFixed(2)} mm past where a floor-wide disc fits`;
    if (v.blendedFrom) {
      const [a, b] = v.blendedFrom.map((i) => i + 1);
      return `Pair ${k} is narrower than the ${f} mm floor (${how} — shown red in the view). Pair ${k} is blended from pairs ${a} and ${b}. Widen those, or unlink pair ${k} to edit it directly.`;
    }
    return `Pair ${k}'s drawn outline is narrower than the ${f} mm floor (${how} — shown red in the editor and the view). Widen it there.`;
  }).join(' ');
}
export function exportStl(model, opts = {}) {
  if (model.floorViolations && model.floorViolations.length && !opts.allowBelowFloor) throw new FloorError(`STL not exported. ${floorReason(model)} Or lower the floor in Print.`);
  const P = model.positions, I = model.indices, n = I.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n);
  const dv = new DataView(buf);
  const header = 'Parametric Bug — eva-maskalenko.com/bug — mm';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < header.length ? header.charCodeAt(i) & 0x7f : 32);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < n; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
    const e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const nn = norm(cross(e1, e2));
    dv.setFloat32(o, nn[0], true); dv.setFloat32(o + 4, nn[1], true); dv.setFloat32(o + 8, nn[2], true); o += 12;
    for (const v of [a, b, c]) { dv.setFloat32(o, P[v], true); dv.setFloat32(o + 4, P[v + 1], true); dv.setFloat32(o + 8, P[v + 2], true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}

/* ------------------------------------------------------------------ */
/* SVG exporter — the top-down projection of the model's own solids     */
/* ------------------------------------------------------------------ */

/* The contour generator of one closed part seen from +z: the directed edges
   of front-facing triangles whose twin belongs to a back-facing triangle.
   They chain into closed loops; projected to x-y and filled NONZERO they
   reproduce the part's projection exactly, because every projected point is
   covered by at least one front face and each covering front face winds +1. */
/* A facet seen almost exactly edge-on (|nz| below EDGE_ON_REL of its edges'
   squared lengths) is counted FRONT-facing. Its facing is decided by rounding
   — a needle facet on a twisted wing can come out a hair negative — and
   counting it back-facing cuts a zero-area hole in the contour that the SVG
   then strokes as a hairline across the wing (the revised sheet showed them).
   Counted front, it adds winding over an area of at most that tolerance and
   no contour edge. nz is computed identically for a triangle and its mirror
   twin, so the decision is symmetric. (A first fix dropped tiny LOOPS instead;
   that broke the SVG's exact mirror symmetry, because the two sides chain the
   same edges into loops differently.) */
export const EDGE_ON_REL = 1e-4;
export function contourLoops(model, part) {
  const P = model.positions, I = model.indices;
  const NV = model.positions.length / 3;
  const owner = new Map();
  const front = [];
  for (let t = part.t0; t < part.t1; t++) {
    const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2];
    const ex = P[3 * b] - P[3 * a], ey = P[3 * b + 1] - P[3 * a + 1], fx = P[3 * c] - P[3 * a], fy = P[3 * c + 1] - P[3 * a + 1];
    const nz = ex * fy - ey * fx;
    const ez = P[3 * b + 2] - P[3 * a + 2], fz = P[3 * c + 2] - P[3 * a + 2];
    front.push(nz > -EDGE_ON_REL * (ex * ex + ey * ey + ez * ez + fx * fx + fy * fy + fz * fz));
    const f = t - part.t0;
    owner.set(a * NV + b, f); owner.set(b * NV + c, f); owner.set(c * NV + a, f);
  }
  const out = new Map();
  let count = 0;
  for (let t = part.t0; t < part.t1; t++) {
    const f = t - part.t0;
    if (!front[f]) continue;
    const v = [I[3 * t], I[3 * t + 1], I[3 * t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      const tw = owner.get(b * NV + a);
      if (tw === undefined || !front[tw]) {
        if (!out.has(a)) out.set(a, []);
        out.get(a).push(b); count++;
      }
    }
  }
  const loops = [];
  while (count > 0) {
    let start = -1;
    for (const [a, list] of out) if (list.length) { start = a; break; }
    const loop = [start];
    let cur = start;
    for (let guard = 0; guard < 1e6; guard++) {
      const list = out.get(cur);
      if (!list || !list.length) break;
      const nx = list.pop(); count--;
      if (nx === start) break;
      loop.push(nx); cur = nx;
    }
    if (loop.length >= 3) loops.push(loop.map((v) => [P[3 * v], P[3 * v + 1]]));
  }
  return loops;
}

/* Anatomical draw order: legs, then the wing pairs back to front (the last
   pair's tail straight after its own wing), antennae, body. */
const drawOrder = (model) => {
  const n = model.parts.filter((q) => /^wing\d$/.test(q.kind)).reduce((m, q) => Math.max(m, +q.kind.slice(4)), 0);
  const wings = [];
  for (let k = n; k >= 1; k--) { wings.push(`wing${k}`); if (k === n) wings.push('tail'); }
  return ['leg', ...wings, 'antenna', 'body'];
};
export const SVG_INK = '#0A0A0C', SVG_LINE = '#EDEDE8';

function bounds2(loops) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const L of loops) for (const [x, y] of L) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

export function exportSvg(model, opts = {}) {
  const cutSafe = !!opts.cutSafe;
  const groups = drawOrder(model).map((kind) => ({ kind, parts: model.parts.filter((q) => q.kind === kind) }));
  const partLoops = [];
  for (const g of groups) for (const part of g.parts) partLoops.push({ part, loops: contourLoops(model, part) });
  const all = partLoops.flatMap((pl) => pl.loops);
  const b = bounds2(all);
  const M = 2;
  const W = b.x1 - b.x0 + 2 * M, H = b.y1 - b.y0 + 2 * M;
  const X = (x) => (x - b.x0 + M).toFixed(3), Y = (y) => (b.y1 - y + M).toFixed(3);
  const pathD = (loops) => loops.map((L) => 'M' + L.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('');
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}">\n`;
  const meta = `<!-- Parametric Bug — top-down orthographic projection of the 3D model (units: mm). ${cutSafe ? 'CUT-SAFE' : 'layered'} -->\n`;
  if (cutSafe) {
    const u = unionOutline(all, 0.05);
    const d = u.loops.map((L) => 'M' + L.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L') + 'Z').join('');
    return {
      svg: head + meta + `<!-- cut-safe: union of every part, ${u.regions} connected region(s) -->\n<path d="${d}" fill="${SVG_INK}" fill-rule="evenodd"/>\n</svg>\n`,
      regions: u.regions, widthMm: W, heightMm: H, frame: { x0: b.x0, y1: b.y1, margin: M },
    };
  }
  let body = '';
  for (const { part, loops } of partLoops) {
    body += `<path data-part="${part.name}-${part.side}" d="${pathD(loops)}" fill="${SVG_INK}" fill-rule="nonzero" stroke="${SVG_LINE}" stroke-width="0.15" stroke-linejoin="round"/>\n`;
    // Phase 2, RIDGES: the veins as lines on the wing, read off the model's
    // own vein record (the ridge strips' centrelines, at the vein's width),
    // not the strips' contours, which would stroke every vein twice. In HOLES
    // the veins need no line: the cells are holes in the contour above.
    for (const v of part.meta.svgVeins || []) body += `<path data-vein="${part.name}-${part.side}" d="${'M' + v.pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}" fill="none" stroke="${SVG_LINE}" stroke-width="${v.width.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    for (const L of part.meta.svgStigma || []) body += `<path data-stigma="${part.name}-${part.side}" d="${pathD([L])}" fill="${SVG_LINE}" fill-opacity="0.35"/>\n`;
  }
  // Segment lines: read off the model's own band rings (their x extent at their y).
  const bodyPart = model.parts.find((q) => q.kind === 'body');
  const P = model.positions;
  for (const v0 of bodyPart?.meta.bands || []) {
    const ring = bodyPart.meta.rings.find((r) => r.v0 === v0);
    let x0 = Infinity, x1 = -Infinity;
    for (let k = 0; k < ring.n; k++) { const x = P[3 * (v0 + k)]; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const y = P[3 * v0 + 1];
    body += `<line x1="${X(x0)}" y1="${Y(y)}" x2="${X(x1)}" y2="${Y(y)}" stroke="${SVG_LINE}" stroke-width="0.15"/>\n`;
  }
  return { svg: head + meta + body + '</svg>\n', regions: null, widthMm: W, heightMm: H, frame: { x0: b.x0, y1: b.y1, margin: M } };
}

/* ------------------------------------------------------------------ */
/* Cut-safe union: nonzero raster of every loop, traced by marching     */
/* squares. Exact crossings along each row, half a pixel across rows.   */
/* ------------------------------------------------------------------ */

export function unionOutline(loops, px) {
  const b = bounds2(loops);
  const gx0 = b.x0 - 3 * px, gy0 = b.y0 - 3 * px;
  const nx = Math.ceil((b.x1 - b.x0) / px) + 6, ny = Math.ceil((b.y1 - b.y0) / px) + 6;
  const grid = new Uint8Array(nx * ny);
  const rowCross = new Array(ny);
  // edge buckets by row
  const buckets = Array.from({ length: ny }, () => []);
  const E = [];
  for (const L of loops) for (let i = 0; i < L.length; i++) {
    const a = L[i], c = L[(i + 1) % L.length];
    if (a[1] === c[1]) continue;
    const e = E.length; E.push([a[0], a[1], c[0], c[1]]);
    const lo = Math.max(0, Math.ceil((Math.min(a[1], c[1]) - gy0) / px - 0.5));
    const hi = Math.min(ny - 1, Math.floor((Math.max(a[1], c[1]) - gy0) / px - 0.5));
    for (let j = lo; j <= hi; j++) buckets[j].push(e);
  }
  for (let j = 0; j < ny; j++) {
    const yc = gy0 + (j + 0.5) * px;
    const xs = [];
    for (const e of buckets[j]) {
      const [x0, y0, x1, y1] = E[e];
      const ylo = Math.min(y0, y1), yhi = Math.max(y0, y1);
      if (yc < ylo || yc >= yhi) continue;
      xs.push([x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0), y1 > y0 ? 1 : -1]);
    }
    xs.sort((p, q) => p[0] - q[0]);
    const iv = [];
    let w = 0, open = null;
    for (const [x, d] of xs) {
      const was = w !== 0; w += d; const now = w !== 0;
      if (!was && now) open = x;
      else if (was && !now) iv.push([open, x]);
    }
    // merge touching intervals
    const merged = [];
    for (const it of iv) { const last = merged[merged.length - 1]; if (last && it[0] <= last[1]) last[1] = Math.max(last[1], it[1]); else merged.push(it.slice()); }
    rowCross[j] = merged;
    for (const [a, c] of merged) {
      const i0 = Math.max(0, Math.ceil((a - gx0) / px - 0.5)), i1 = Math.min(nx - 1, Math.floor((c - gx0) / px - 0.5));
      for (let i = i0; i <= i1; i++) grid[j * nx + i] = 1;
    }
  }
  // connected regions (4-connectivity on filled pixels)
  const lab = new Int32Array(nx * ny);
  let regions = 0;
  const q = new Int32Array(nx * ny);
  for (let s = 0; s < nx * ny; s++) {
    if (!grid[s] || lab[s]) continue;
    regions++; let h = 0, t = 0; q[t++] = s; lab[s] = regions;
    while (h < t) {
      const c = q[h++]; const ci = c % nx, cj = (c / nx) | 0;
      const nb = [ci > 0 ? c - 1 : -1, ci < nx - 1 ? c + 1 : -1, cj > 0 ? c - nx : -1, cj < ny - 1 ? c + nx : -1];
      for (const m of nb) if (m >= 0 && grid[m] && !lab[m]) { lab[m] = regions; q[t++] = m; }
    }
  }
  // marching squares over pixel centres
  const cx = (i) => gx0 + (i + 0.5) * px, cy = (j) => gy0 + (j + 0.5) * px;
  const hCross = (i, j) => {   // between (i,j) and (i+1,j): the exact interval end on row j
    const x0 = cx(i), x1 = cx(i + 1);
    for (const [a, c] of rowCross[j]) { if (a >= x0 && a <= x1) return a; if (c >= x0 && c <= x1) return c; }
    return (x0 + x1) / 2;
  };
  const pt = new Map();
  const adj = new Map();
  const node = (id, xy) => { if (!pt.has(id)) pt.set(id, xy); if (!adj.has(id)) adj.set(id, []); return id; };
  const link = (a, c) => { adj.get(a).push(c); adj.get(c).push(a); };
  const g = (i, j) => grid[j * nx + i];
  for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) {
    const a = g(i, j), bb = g(i + 1, j), c = g(i + 1, j + 1), d = g(i, j + 1);
    const code = a | (bb << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const B = () => node(`h${i},${j}`, [hCross(i, j), cy(j)]);
    const T = () => node(`h${i},${j + 1}`, [hCross(i, j + 1), cy(j + 1)]);
    const Lf = () => node(`v${i},${j}`, [cx(i), (cy(j) + cy(j + 1)) / 2]);
    const Rt = () => node(`v${i + 1},${j}`, [cx(i + 1), (cy(j) + cy(j + 1)) / 2]);
    switch (code) {
      case 1: case 14: link(Lf(), B()); break;
      case 2: case 13: link(B(), Rt()); break;
      case 3: case 12: link(Lf(), Rt()); break;
      case 4: case 11: link(Rt(), T()); break;
      case 6: case 9: link(B(), T()); break;
      case 7: case 8: link(Lf(), T()); break;
      case 5: link(Lf(), B()); link(Rt(), T()); break;     // diagonal insides stay apart (4-connectivity)
      case 10: link(B(), Rt()); link(Lf(), T()); break;
    }
  }
  const used = new Set();
  const out = [];
  for (const start of adj.keys()) {
    if (used.has(start)) continue;
    const loop = []; let prev = null, cur = start;
    for (let guard = 0; guard < 1e7; guard++) {
      used.add(cur); loop.push(pt.get(cur));
      const nbs = adj.get(cur);
      const nx2 = nbs.find((n) => n !== prev && !used.has(n)) ?? null;
      if (nx2 === null) break;
      prev = cur; cur = nx2;
    }
    if (loop.length >= 3) out.push(simplifyClosed(loop, px * 0.2));
  }
  return { loops: out, regions, raster: { nx, ny, px } };
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-12;
  let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
    const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
    if (d > best) { best = d; bi = i; }
  }
  if (best <= tol) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, bi + 1), tol).slice(0, -1).concat(rdp(pts.slice(bi), tol));
}
function simplifyClosed(loop, tol) {
  if (loop.length < 8) return loop;
  let far = 0, fd = -1;
  for (let i = 1; i < loop.length; i++) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = rdp(loop.slice(0, far + 1), tol), b = rdp(loop.slice(far).concat([loop[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

/* ------------------------------------------------------------------ */
/* Specimen pose (elegance pass, §9.5)                                  */
/* ------------------------------------------------------------------ */

/* A pinned specimen, as set on a spreading board: the FOREWINGS pulled forward
   until their INNER MARGINS (root trail -> tornus) form one straight line
   square to the body axis; every wing flat (dihedral 0, pitch 0); the legs
   tucked; the antennae straight in a symmetric V. It SETS SLIDER VALUES and
   returns them — nothing about it is a mode, and every value stays editable.

   The tornus is the trailing-half point standing farthest OUTSIDE the chord
   from the apex to the root trail (the rear corner of the wing), read off the
   drawn planform in millimetres — the very polygon the builder triangulates
   (drawnPlanformMm). Under the wing transform a planform direction (du, dw)
   lands at world dy = -du sin(sweep) + dw cos(sweep) when pitch is 0, so the
   inner margin is square to the body (dy = 0) at sweep = atan2(dw, du). The
   mirror puts the left margin on the same line. A sweep outside the slider's
   range is clamped and reported. */
export const SPECIMEN = { legReach: 0, antennaCurl: 0, antennaSpread: 22 };
export function innerMargin(outline) {
  let apex = 0; for (let i = 1; i < outline.length; i++) if (outline[i][0] > outline[apex][0]) apex = i;
  const rt = outline[outline.length - 1], A = outline[apex];
  const dx = rt[0] - A[0], dy = rt[1] - A[1];
  let best = -1, bc = 0;
  for (let i = apex + 1; i < outline.length - 1; i++) {
    const c = dx * (outline[i][1] - A[1]) - dy * (outline[i][0] - A[0]);   // > 0: outside the chord (the outline runs clockwise)
    if (c > bc) { bc = c; best = i; }
  }
  if (best < 0) best = Math.max(apex, outline.length - 2);
  return { rootTrail: rt, tornus: outline[best], tornusIndex: best, apexIndex: apex };
}
export function specimenPose(params) {
  const p = normalizeParams(params);
  const notes = [];
  if (p.wingPairs > 0) {
    const fw = resolveWingPairs(p)[0];
    const m = innerMargin(drawnPlanformMm(fw).scalloped);
    const du = m.tornus[0] - m.rootTrail[0], dw = m.tornus[1] - m.rootTrail[1];
    const f = WING_FIELDS.find((x) => x.id === 'sweep');
    const want = Math.atan2(dw, du) / D2R, got = clamp(want, f.min, f.max);
    if (got !== want) notes.push(`the forewing's inner margin needs a sweep of ${want.toFixed(1)}°, outside the slider (${f.min}–${f.max}°); set to ${got}°`);
    p.wings.first.sweep = got;
    for (const w of [p.wings.first, p.wings.last, ...Object.values(p.wings.unlinked)]) { w.dihedral = 0; w.pitch = 0; }
  }
  Object.assign(p, SPECIMEN);
  return { params: p, notes };
}

/* The DEFAULT is a pinned specimen: the pose is applied to it here, once, so
   the forewing sweep in the default is DERIVED from its own outline (the
   margin square to the body), never a typed angle. */
{
  const sp = specimenPose(DEFAULTS).params;
  DEFAULT_WINGS.first.sweep = sp.wings.first.sweep;
  Object.assign(DEFAULTS, SPECIMEN);
}
