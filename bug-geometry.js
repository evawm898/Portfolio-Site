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
const TAIL_AT = 0.78;                       // hindwing tail root, fraction of span
const TAIL_ANGLE = 20 * D2R;                // tail points backward, 20 deg outward
const BAND_DEPTH = 0.14;                    // abdomen constriction depth when banding is on
const ABD_DEPTH_RATIO = 0.9;                // abdomen depth / width
const ABD_PEAK = 0.3;                       // abdomen widest at 30% of its length
const HEAD_DEPTH_RATIO = 0.9;
const LEG_ROOT_FRAC = 0.44;                 // leg root DIAMETER / thorax half-width
const ANT_ROOT_FRAC = 0.10;                 // antenna root diameter / head size

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
export const OUTLINE_BOUNDS = { u: [0, 1.2], w: [-0.65, 0.65] };
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
  { id: 'tail', label: 'Hindwing tail (last pair)', parent: 'wings' },
  { id: 'print', label: 'Print' },
];

const isThree = (p) => p.bodyParts === '3';
const hasLegs = (p) => p.legPairs > 0 && p.legsVisible;
const hasAnt = (p) => p.antennaType !== 'none';
const hasTail = (p) => p.wingPairs >= 2;

const R = (id, section, label, min, max, step, def, unit = '', visibleWhen) =>
  ({ id, section, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });

export const PARAM_SPEC = [
  { id: 'bodyParts', section: 'plan', label: 'Body parts', kind: 'choice', default: '3',
    options: [['3', '3 — head, thorax, abdomen'], ['2', '2 — cephalothorax, abdomen']] },
  R('roundness', 'plan', 'Cross-section roundness', 1.5, 6, 0.1, 2.0, '', null),

  R('headSize', 'head', 'Head size', 2, 12, 0.1, 4.0, 'mm', isThree),

  R('thoraxLength', 'thorax', 'Length', 3, 20, 0.1, 7, 'mm'),
  R('thoraxWidth', 'thorax', 'Width', 2.5, 14, 0.1, 5, 'mm'),
  R('thoraxDepth', 'thorax', 'Depth', 2.5, 14, 0.1, 4.6, 'mm'),

  R('abdomenLength', 'abdomen', 'Length', 2, 70, 0.5, 15, 'mm'),
  R('abdomenWidth', 'abdomen', 'Width', 1.5, 18, 0.1, 5, 'mm'),
  R('abdomenTaper', 'abdomen', 'Taper', 0, 1, 0.01, 0.5),
  R('abdomenSegments', 'abdomen', 'Segment count', 1, 12, 1, 6),
  { id: 'banding', section: 'abdomen', label: 'Banding', kind: 'bool', default: true },

  R('legPairs', 'legs', 'Pairs', 0, 4, 1, 3),
  { id: 'legsVisible', section: 'legs', label: 'Visible', kind: 'bool', default: true },
  R('legReach', 'legs', 'Reach — tucked under ↔ splayed out', 0, 1, 0.01, 1, '', hasLegs),
  R('coxa', 'legs', 'Coxa', 0.5, 5, 0.1, 1.2, 'mm', hasLegs),
  R('femur', 'legs', 'Femur', 1, 20, 0.1, 5, 'mm', hasLegs),
  R('tibia', 'legs', 'Tibia', 1, 20, 0.1, 5.5, 'mm', hasLegs),
  R('tarsus', 'legs', 'Tarsus', 0.5, 15, 0.1, 4, 'mm', hasLegs),
  R('legSplay', 'legs', 'Splay — fan forward / back', 0, 70, 1, 35, '°', hasLegs),
  R('legBend', 'legs', 'Joint bend', 0, 90, 1, 45, '°', hasLegs),
  R('legTaper', 'legs', 'Taper', 0, 0.9, 0.01, 0.5, '', hasLegs),

  { id: 'antennaType', section: 'antennae', label: 'Type', kind: 'choice', default: 'filiform',
    options: [['clubbed', 'Clubbed'], ['feathered', 'Feathered'], ['filiform', 'Filiform'], ['bristle', 'Bristle'], ['none', 'None']] },
  R('antennaLength', 'antennae', 'Length', 1, 40, 0.5, 10, 'mm', hasAnt),
  R('antennaCurl', 'antennae', 'Curl', -120, 180, 1, 10, '°', hasAnt),
  R('antennaSpread', 'antennae', 'Spread', 0, 80, 1, 25, '°', hasAnt),

  R('wingPairs', 'wings', 'Pairs', 0, MAX_WING_PAIRS, 1, 2),
  R('tailLength', 'tail', 'Length', 0, 30, 0.5, 0, 'mm', hasTail),
  R('tailWidth', 'tail', 'Width', 0.5, 6, 0.1, 2.4, 'mm', (p) => hasTail(p) && p.tailLength > 0),
  R('tailClub', 'tail', 'Club', 0, 1, 0.01, 0.5, '', (p) => hasTail(p) && p.tailLength > 0),

  R('minDiameter', 'print', 'Min feature diameter (STL floor)', 0.6, 2, 0.05, MIN_DIAMETER_DEFAULT, 'mm'),
];

/* Per-pair wing fields. The drawn OUTLINE is the base shape; these are applied
   on top of it: stretch (chord scale) and sweep (in-plane rotation) transform
   the drawn curve, scallop / thickness / tilt are as before. */
const WR = (id, label, min, max, step, def, unit = '', visibleWhen = null) => ({ id, label, kind: 'range', min, max, step, default: def, unit, visibleWhen });
export const WING_FIELDS = [
  WR('length', 'Length (span)', 5, 60, 0.5, 26, 'mm'),
  WR('stretch', 'Stretch — chord scale of the drawn curve', 0.3, 3, 0.01, 1),
  WR('sweep', 'Sweep — rotation of the drawn curve', -30, 70, 1, 0, '°'),
  WR('scallop', 'Scallop depth', 0, 0.4, 0.01, 0),
  WR('scallopCount', 'Scallop count', 2, 12, 1, 6, '', (w) => w.scallop > 0),
  WR('thickness', 'Thickness (STL)', 0.6, 4, 0.05, 1.2, 'mm'),
  WR('dihedral', 'Tilt — dihedral', -60, 80, 1, 12, '°'),
  WR('pitch', 'Tilt — pitch', -45, 45, 1, 0, '°'),
];

/* The neutral default: a plain rounded forewing and a shorter, rounder hindwing
   swept back. Not any named insect. Points are [u, w]: u along the span from the
   root (units of the wing's length), w along the chord, + = toward the head.
   First and last points are the ROOT LEAD and ROOT TRAIL, pinned at u = 0. */
export const DEFAULT_WINGS = {
  first: {
    points: [[0, 0.09], [0.34, 0.17], [0.78, 0.14], [1.0, 0.0], [0.82, -0.17], [0.4, -0.22], [0, -0.1]],
    length: 26, stretch: 1, sweep: 0, scallop: 0, scallopCount: 6, thickness: 1.2, dihedral: 12, pitch: 0,
  },
  last: {
    points: [[0, 0.08], [0.4, 0.2], [0.85, 0.12], [1.0, -0.06], [0.72, -0.28], [0.3, -0.26], [0, -0.09]],
    length: 20, stretch: 1, sweep: 32, scallop: 0, scallopCount: 6, thickness: 1.2, dihedral: 8, pitch: 0,
  },
  unlinked: {},
};

export const DEFAULTS = Object.fromEntries(PARAM_SPEC.map((s) => [s.id, s.default]));
DEFAULTS.wings = DEFAULT_WINGS;

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
export const OUTLINE_CLEARANCE = 0.015;
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
  let c = mix(t);
  if (outlineOk(c)) return { dense: c, tUsed: t, repaired: false };
  const end = t < 0.5 ? 0 : 1;
  let good = end, bad = t;                       // the endpoint passes: it is a validated drawn outline
  for (let k = 0; k < 30; k++) { const m = (good + bad) / 2; if (outlineOk(mix(m))) good = m; else bad = m; }
  return { dense: mix(good), tUsed: good, repaired: true };
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

/* The N wing pairs, resolved: pair 0 is the drawn FIRST pair, pair N-1 the
   drawn LAST pair, every pair between interpolates both (outline AND scalar
   fields) unless it is UNLINKED, when it carries its own drawn spec. */
export function resolveWingPairs(p) {
  const N = p.wingPairs, W = p.wings, out = [];
  for (let k = 0; k < N; k++) {
    const role = k === 0 ? 'first' : k === N - 1 ? 'last' : 'mid';
    if (role !== 'mid') { out.push({ index: k, role, linked: false, ...W[role], dense: sampleOutline(W[role].points), repaired: false }); continue; }
    const own = W.unlinked && W.unlinked[k];
    if (own) { out.push({ index: k, role, linked: false, ...own, dense: sampleOutline(own.points), repaired: false }); continue; }
    const t = k / (N - 1);
    const io = interpolatedOutline(W.first.points, W.last.points, t);
    const s = {};
    for (const f of WING_FIELDS) {
      const v = lerp(W.first[f.id], W.last[f.id], t);
      s[f.id] = f.step >= 1 && f.id === 'scallopCount' ? Math.round(v) : v;
    }
    out.push({ index: k, role, linked: true, t, ...s, points: null, dense: io.dense, repaired: io.repaired, tUsed: io.tUsed });
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
  tailChance: 0.25, tailLength: [3, 12], tailWidth: [1.2, 3.2], tailClub: [0, 0.8],
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

export function randomParams(seed) {
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
  p.wings = { first: f, last: l, unlinked: {} };
  p.tailLength = wp >= 2 && r() < K.tailChance ? U(K.tailLength) : 0;
  p.tailWidth = U(K.tailWidth); p.tailClub = U(K.tailClub);
  return normalizeParams(p);
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

function frustum(acc, p0, p1, r0, r1, meta) {
  const d = norm(sub(p1, p0));
  const [u, v] = frameFor(d);
  const ids = loftRings(acc, [ringAround(p0, u, v, r0, TUBE_SIDES), ringAround(p1, u, v, r1, TUBE_SIDES)], p0, p1);
  if (meta) meta.push(...ids.map((r) => [r[0], r.length]));
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
function tubeAlong(acc, pts, radii, meta) {
  const n = pts.length;
  const T = pts.map((_, i) => norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
  let [N] = frameFor(T[0]);
  const rings = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) N = norm(sub(N, mul(T[i], dot(N, T[i]))));
    const B = cross(T[i], N);
    rings.push(ringAround(pts[i], N, B, radii[i], TUBE_SIDES));
  }
  const ids = loftRings(acc, rings, pts[0], pts[n - 1]);
  if (meta) meta.push(...ids.map((r) => [r[0], r.length]));
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
function abdomenEnvelope(s, taper, segs, banding) {
  if (s <= 0 || s >= 1) return 0;
  // An egg: a quarter-ellipse rise to the widest point at ABD_PEAK, then an
  // ellipse fall that the taper pulls to a point (0 = round end, 1 = spike).
  let f;
  if (s < ABD_PEAK) f = Math.sqrt(1 - ((ABD_PEAK - s) / ABD_PEAK) ** 2);
  else { const u = (s - ABD_PEAK) / (1 - ABD_PEAK); f = Math.sqrt(Math.max(0, 1 - u * u)) * (1 - taper * u); }
  if (banding && segs > 1) {
    const sig = 0.16 / segs;
    let notch = 0;
    for (let k = 1; k < segs; k++) notch = Math.max(notch, Math.exp(-(((s - k / segs) / sig) ** 2)));
    f *= 1 - BAND_DEPTH * notch;
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
  const f = abdomenEnvelope(s, p.abdomenTaper, p.abdomenSegments, p.banding);
  if (f > 0) { rx = Math.max(rx, L.ra * f); rz = Math.max(rz, L.ra * ABD_DEPTH_RATIO * f); }
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
  const rings = [], ys = [];
  for (let i = 1; i < N; i++) {
    const y = L.yMin + ((L.yMax - L.yMin) * i) / N;
    const [rx, rz] = profileAt(p, L, y);
    rings.push(superRing(y, Math.max(rx, 0.02), Math.max(rz, 0.02), p.roundness));
    ys.push(y);
  }
  // rings run tail -> head; loftRings wants the caps at the matching ends
  const ids = loftRings(acc, rings, [0, L.yMin, 0], [0, L.yMax, 0], RING_HALF);
  part.meta.rings = ids.map((r, i) => ({ v0: r[0], n: r.length, y: ys[i] }));
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

/* 1 -> 4 midpoint subdivision; a midpoint is shared by both triangles of an
   edge, so the result stays conforming (no T-junctions). */
function subdivide(pts, tris) {
  const mid = new Map(), P = pts.slice();
  const m = (a, b) => {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (!mid.has(k)) { mid.set(k, P.length); P.push(lerp2(P[a], P[b], 0.5)); }
    return mid.get(k);
  };
  const T = [];
  for (const [a, b, c] of tris) {
    const ab = m(a, b), bc = m(b, c), ca = m(c, a);
    T.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
  }
  return { pts: P, tris: T };
}

/* A solid slab over a triangulated planform: top face, bottom face, and a rim
   walked along the top face's own boundary edges. */
function planformSlab(acc, pts, tris, half, W, part) {
  const T = pts.map(([u, w]) => acc.v(W(u, w, +half)));
  const B = pts.map(([u, w]) => acc.v(W(u, w, -half)));
  const dir = new Set();
  for (const [a, b, c] of tris) {
    acc.tri(T[a], T[b], T[c]); acc.tri(B[a], B[c], B[b]);
    dir.add(`${a},${b}`); dir.add(`${b},${c}`); dir.add(`${c},${a}`);
  }
  for (const [a, b, c] of tris) for (const [p, q] of [[a, b], [b, c], [c, a]]) {
    if (!dir.has(`${q},${p}`)) acc.quad(T[q], T[p], B[p], B[q]);   // a boundary edge p->q: the rim takes its twin
  }
  part.meta.thickPairs = [];
  for (let i = 0; i < pts.length; i += 7) part.meta.thickPairs.push([T[i], B[i]]);
}

function buildWingPair(acc, p, L, spec, hingeInfo, isLast, N) {
  const thick = Math.max(p.minDiameter, spec.thickness);
  const span = spec.length;
  const { hinge, k } = hingeInfo;
  const embed = Math.max(0.6 * L.rt * k, thick);
  const W = wingTransform(hinge, span, spec.sweep, spec.pitch, spec.dihedral);
  const minW = p.minDiameter;

  // The drawn curve in world millimetres: u by the length, w by length * stretch.
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
  // Root: the closing chord moved INTO the thorax by `embed`.
  const n0 = scalloped[0], n1 = scalloped[scalloped.length - 1];
  let poly = [[-embed, n0[1]], ...scalloped, [-embed, n1[1]]];
  // the curve runs clockwise in (u, w); the triangulator wants CCW
  poly = poly.reverse();
  let tri = delaunayFlip(poly, earClip(poly)), pts = poly;
  for (let s = 0; s < WING_SUBDIV; s++) ({ pts, tris: tri } = subdivide(pts, tri));
  const part = acc.begin(`wing${spec.index + 1}`, `wing${spec.index + 1}`, 'R');
  planformSlab(acc, pts, tri, thick / 2, W, part);
  part.meta.thickness = thick;
  part.meta.planform = poly.slice();
  part.meta.pair = spec.index;
  part.meta.linked = spec.linked;
  part.meta.repaired = spec.repaired;
  part.meta.scallopReduced = scallopReduced;
  part.meta.hingeY = hinge[1];
  acc.end();

  if (isLast && N >= 2 && p.tailLength > 0) {
    const tw = Math.max(minW, p.tailWidth);
    // the trailing-edge point nearest TAIL_AT of the span, on the trailing half
    let best = apex, bd = Infinity;
    for (let i = apex; i < scalloped.length; i++) { const d = Math.abs(scalloped[i][0] - TAIL_AT * umax); if (d < bd) { bd = d; best = i; } }
    const at = scalloped[best];
    const d = [Math.sin(TAIL_ANGLE), -Math.cos(TAIL_ANGLE)];
    const q = [Math.cos(TAIL_ANGLE), Math.sin(TAIL_ANGLE)];
    const b0 = [at[0] - d[0] * tw, at[1] - d[1] * tw];          // starts inside the wing
    const Lq = p.tailLength + tw;
    const NQ = 24, NV = 6;
    const tg = [];
    for (let i = 0; i <= NQ; i++) {
      const s = i / NQ;
      let hw = (tw / 2) * (1 - 0.35 * s) * (1 + p.tailClub * 1.6 * Math.exp(-(((s - 0.86) / 0.1) ** 2)));
      if (s > 0.86) hw *= Math.sqrt(Math.max(0, 1 - ((s - 0.86) / 0.14) ** 2));
      hw = Math.max(hw, minW / 2);
      const cx = b0[0] + d[0] * s * Lq, cy = b0[1] + d[1] * s * Lq;
      const row = [];
      for (let j = 0; j <= NV; j++) { const v = lerp(-hw, hw, j / NV); row.push([cx + q[0] * v, cy + q[1] * v]); }
      tg.push(row);
    }
    const tp = acc.begin('tail', 'tail', 'R');
    const tthick = Math.max(minW, 0.9 * thick);
    slab(acc, tg, tthick / 2, W, tp);
    tp.meta.thickness = tthick;
    tp.meta.tubeMinWidth = minW;
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
    const rootX = lerp(0.2, 0.35, reach) * L.rt * kk;
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
    for (let s = 1; s <= 4; s++) {
      const lim = Math.max(0, 0.85 * profileAt(p, L, pts[s][1])[0] - rad[s]);
      const x = Math.min(pts[s][0], lim);
      pts[s] = [lerp(x, pts[s][0], reach), pts[s][1], pts[s][2]];
    }
    const part = acc.begin(`leg${i + 1}`, 'leg', 'R');
    part.meta.tubeRings = [];
    for (let s = 0; s < 4; s++) frustum(acc, pts[s], pts[s + 1], rad[s], rad[s + 1], part.meta.tubeRings);
    acc.end();
    for (let s = 1; s <= 4; s++) {
      acc.begin(`leg${i + 1}-joint${s}`, 'leg', 'R');
      sphere(acc, pts[s], Math.max(rad[s - 1], rad[s]) * 1.08);
      acc.end();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Antennae                                                             */
/* ------------------------------------------------------------------ */

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
  const M = 28;
  const pts = [root], rad = [];
  const rTip = type === 'bristle' ? floorR : Math.max(floorR, r0 * 0.8);
  if (type === 'bristle') r0 = Math.max(floorR, r0 * 1.6);
  for (let i = 1; i <= M; i++) {
    const s = i / M;
    const ang = p.antennaCurl * D2R * s * s;            // curl grows toward the tip
    const d = rotateAbout(dir, curlAxis, -ang);
    pts.push(add(pts[i - 1], mul(d, len0 / M)));
  }
  for (let i = 0; i <= M; i++) rad.push(Math.max(floorR, lerp(r0, rTip, i / M)));
  const part = acc.begin('antenna', 'antenna', 'R');
  part.meta.tubeRings = [];
  const T = tubeAlong(acc, pts, rad, part.meta.tubeRings);
  acc.end();
  const tip = pts[M];
  if (type === 'clubbed') {
    const t = T[M];
    const [u, v] = frameFor(t);
    acc.begin('antenna-club', 'antenna', 'R');
    ellipsoid(acc, sub(tip, mul(t, 0.06 * len0)), [u, v, t], [rTip * 2.6, rTip * 2.6, Math.max(0.12 * len0, rTip * 3)]);
    acc.end();
  } else {
    acc.begin('antenna-tip', 'antenna', 'R');
    sphere(acc, tip, rTip * 1.05);
    acc.end();
  }
  if (type === 'feathered') {
    const K = 11;
    const pp = acc.begin('antenna-pinnae', 'antenna', 'R');
    pp.meta.tubeRings = [];
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
  for (const [k, w] of Object.entries(W.unlinked || {})) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 1 && i <= MAX_WING_PAIRS - 2 && w) q.wings.unlinked[i] = normalizeWing(w, DEFAULT_WINGS.first, notes, `pair ${i + 1}`);
  }
  return q;
}

/* ---------------- designs (save / load) ---------------- */
export const DESIGN_FORMAT = 'parametric-bug-design';
export const DESIGN_VERSION = 1;
export function designFromParams(p, name = '') {
  return { format: DESIGN_FORMAT, version: DESIGN_VERSION, name, params: clone(p) };
}
export function paramsFromDesign(doc) {
  if (!doc || doc.format !== DESIGN_FORMAT) return { ok: false, reason: 'not a Parametric Bug design file' };
  if (doc.version > DESIGN_VERSION) return { ok: false, reason: `design version ${doc.version} is newer than this page (${DESIGN_VERSION})` };
  const notes = [];
  const params = normalizeParams(doc.params || {}, notes);
  return { ok: true, params, notes };
}

export function buildBug(params) {
  const notes = [];
  const p = normalizeParams(params, notes);
  const L = bodyLayout(p);
  const acc = new Acc();
  buildBody(acc, p, L);
  if (p.legsVisible && p.legPairs > 0) buildLegs(acc, p, L);
  if (p.antennaType !== 'none') buildAntenna(acc, p, L);
  const pairs = resolveWingPairs(p);
  const hinges = wingHinges(p, L);
  for (const spec of pairs) buildWingPair(acc, p, L, spec, hinges[spec.index], spec.index === pairs.length - 1, pairs.length);
  for (const s of pairs) if (s.repaired) notes.push(`pair ${s.index + 1}: the interpolated outline crossed itself and was eased toward the nearer drawn pair (t ${s.t.toFixed(2)} -> ${s.tUsed.toFixed(2)})`);
  for (const part of acc.parts) if (part.meta.scallopReduced) notes.push(`pair ${part.meta.pair + 1}: scallop depth reduced so the outline does not cross itself`);

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
    wingPairs: pairs.map((s) => ({ index: s.index, role: s.role, linked: s.linked, repaired: s.repaired, dense: s.dense, hingeY: hinges[s.index].y })),
    notes,
    positions: Float64Array.from(acc.pos),
    indices: Uint32Array.from(acc.idx),
    parts: acc.parts,
    triangleCount: acc.idx.length / 3,
  };
}

function mirrorMeta(m, shift) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'tubeRings') out[k] = v.map(([a, n]) => [a + shift, n]);
    else if (k === 'thickPairs') out[k] = v.map(([a, b]) => [a + shift, b + shift]);
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

export function exportStl(model) {
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
      regions: u.regions, widthMm: W, heightMm: H,
    };
  }
  let body = '';
  for (const { part, loops } of partLoops) {
    body += `<path data-part="${part.name}-${part.side}" d="${pathD(loops)}" fill="${SVG_INK}" fill-rule="nonzero" stroke="${SVG_LINE}" stroke-width="0.15" stroke-linejoin="round"/>\n`;
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
  return { svg: head + meta + body + '</svg>\n', regions: null, widthMm: W, heightMm: H };
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
