/* ===================================================================
   bloom-curve.js — THE CURVE VALUE: its one shape, its one sampler, the one
   rule that decides whether an edit is allowed, and the edit operations the
   panel's curve editor performs. Pure: no DOM, no registry, no geometry
   import, so the geometry (F3's spine, F6's outline), the registry, the
   design file and the panel can all import it and none can disagree with
   another about what a curve value IS or where its curve lies.

   NO GEOMETRY READS A CURVE YET. The curve-editor session (Oct 14) shipped the
   kind, the widget and this module with ZERO consumers; F3 (the spine) and F6
   (the outline) wire into it in their own sessions. Read
   docs/bloom-curve-editor.md before changing anything here.

   THE VALUE (Eva's rulings, feature map §11 — not re-litigated here):
     { mode: 'symmetric', points: [[x, y], ...] }
     { mode: 'two-sided', points: [[x, y], ...], right: [[x, y], ...] }
     { mode: 'single',    points: [[x, y], ...] }
   * Points draw a curve's SHAPE in 2D; points can be added and removed.
   * Every coordinate is a FRACTION OF THE OWNING LENGTH (`spec.owner`, a
     length control such as petalLength) — along it (x) and across it (y) —
     so the curve always fits the length slider: a longer petal scales the
     drawn curve and moves no stored number. `curveSamples(..., {lengthMm})`
     is the one place a fraction becomes a millimetre.
   * `points` is ALWAYS the LEFT side (in 'symmetric' the half the mirror is
     made from). 'two-sided' adds `right`, stored in the SAME convention (its
     distance from the axis, not a negated number), so a mirror is the
     identity on stored numbers and the display does the reflecting.
     Switching two-sided -> symmetric KEEPS `points` (the LEFT side) and drops
     `right`; symmetric -> two-sided starts `right` as a copy of the left.
     'single' is one curve with a signed y and no mirror — what a spine shape
     needs (F3); neither ruling names it, it costs one mode string, and a spec
     that does not list it cannot reach it.
   * A curve is a VALUE, never page state: a plain JSON object the design
     file, a scope entry and the panel can each hold, compare and copy. The
     editor keeps nothing of its own but a drag in progress and a focused
     point.

   THE SPEC (a registry row's `curve` field; the value's bounds, which the file
   reader reads at the moment of reading, rule 2 of bloom-file.js):
     modes   the modes this control offers, first is the reset mode
     x, y    [lo, hi] the box a point lives in, as fractions of the owning length
     lock    { first, last }: 'x' holds that end's x at the box edge (the curve
             spans the whole length), 'xy' holds the point entirely, null frees it
     monotoneX  the curve is a FUNCTION of x — control points strictly
             increasing in x AND the sampled curve never folding back (an
             outline h(u) needs this; a spine shape does not)
     points  [min, max] control points per side
     owner   the registry id of the owning length control (mm), for display

   THE LAW — ONE SAMPLER, TWO ARMS, THE SPEC CHOOSES (`sampleCurve`). A 2D
   SHAPE (a spine, which may double back — a fiddlehead is not a function of
   x) takes CENTRIPETAL CATMULL-ROM (alpha 0.5) through the control points with
   mirrored phantom ends, /bug's `sampleOutline` (bug-geometry.js), the
   precedent the brief names — PORTED rather than imported (the bloom imports
   nothing from /bug, and a change on either page must not silently move the
   other). A FUNCTION CURVE (`monotoneX`, an outline's h(u)) takes the
   shape-preserving monotone cubic (Fritsch-Carlson PCHIP, /frame's profile
   law), because Catmull-Rom was MEASURED to fold back in x on 30.9% of
   ordinary function-shaped point sets (sampleCurve's header has the count).
   Either way the shape rule checks the samples, so the property is measured
   on every edit, never assumed of the law.

   THE REFUSAL (Eva's Q4.4: a drag past printable curvature is REFUSED — the
   point does not move there — not clamped). `proposeEdit` is the ONE place an
   edit is decided: it builds the candidate value, asks the shape rule
   (`curveShapeRefusal`) and then the consumer's validator, and answers
   accepted-with-the-candidate or refused-with-a-reason. A refused edit hands
   back the value UNCHANGED. There is no clamp anywhere in this file and the
   editor adds none: no projection onto the boundary, no bisection toward it,
   no told clamp — the point stays where it last was.
   =================================================================== */

export const CURVE_MODES = Object.freeze(['symmetric', 'two-sided', 'single']);
export const CURVE_SIDES = Object.freeze(['left', 'right']);
/* Samples per control-point span. A display and evaluation density, not a
   geometry constant: a consumer that needs another density passes `per`. */
export const CURVE_SAMPLES_PER_SPAN = 24;
const CR_ALPHA = 0.5;
/* What a HAND produces is rounded to this grid (1e-4 of the owning length —
   3.5 microns on the shipping 35 mm petal), so a saved file reads as short
   decimals and the number a drag stores is the number the JSON writes back.
   A file's own value is never rounded (bloom-file.js rule 2): only the editor
   calls `quantise`. */
export const CURVE_GRID = 1e-4;
export const quantise = (v) => { const q = +(Math.round(v / CURVE_GRID) * CURVE_GRID).toFixed(4); return q === 0 ? 0 : q; };   // -0 written as 0

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPt = (p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]);

export const cloneCurve = (v) => {
  const out = { mode: v.mode, points: v.points.map((p) => [p[0], p[1]]) };
  if (v.mode === 'two-sided') out.right = v.right.map((p) => [p[0], p[1]]);
  return out;
};

/* Equality of two curve values: same mode, same sides, every coordinate the
   same double (Object.is, so -0 and 0 differ — a round trip is an identity
   or it is not). */
export function curveEquals(a, b) {
  if (!a || !b || a.mode !== b.mode) return false;
  const same = (p, q) => Array.isArray(p) && Array.isArray(q) && p.length === q.length && p.every((pt, i) => Object.is(pt[0], q[i][0]) && Object.is(pt[1], q[i][1]));
  if (!same(a.points, b.points)) return false;
  return a.mode === 'two-sided' ? same(a.right, b.right) : a.right === undefined && b.right === undefined;
}

/* The sides a value draws, each `{ side, points, mirrored }`: 'symmetric'
   draws its left side and that side's MIRROR (the same points, reflected by
   the display — `mirrored: true`), 'two-sided' its two sides, 'single' one. */
export function curveSides(v) {
  if (v.mode === 'two-sided') return [{ side: 'left', points: v.points, mirrored: false }, { side: 'right', points: v.right, mirrored: false }];
  if (v.mode === 'symmetric') return [{ side: 'left', points: v.points, mirrored: false }, { side: 'right', points: v.points, mirrored: true }];
  return [{ side: 'left', points: v.points, mirrored: false }];
}
export const pointsOf = (v, side) => (side === 'right' && v.mode === 'two-sided' ? v.right : v.points);

/* ---- the law ------------------------------------------------------------- */

const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* THE SAMPLER — the one owner of a curve value's drawn curve. Dense polyline
   through the control points, every control point included EXACTLY (the
   endpoints of each span are the points themselves, never a re-evaluation).
   Returns `{ pts, span }`: `span[k]` is the control span sample k lies on
   (the add-on-the-curve operation needs to know which two points a sample is
   between).

   TWO ARMS, CHOSEN BY THE SPEC AND NEVER BY THE CALLER, and the second is a
   MEASUREMENT rather than a preference. A function curve (`monotoneX`, an
   outline's h(u)) cannot use Catmull-Rom: over 20,000 random point sets with
   x strictly increasing and both ends on the box edges, centripetal
   Catmull-Rom's samples FOLD BACK in x on 6,176 (30.9%) — almost all at the
   ends, where the mirrored phantom drives the curve past x = 1 and back —
   so an outline editor on that law would refuse a third of ordinary drags for
   a reason the visitor cannot see. Its arm is the shape-preserving monotone
   cubic (Fritsch-Carlson PCHIP, /frame's profile law): x is linear in each
   span, so the samples are strictly increasing BY CONSTRUCTION, and y never
   overshoots its two control points, so a curve whose points are in the box
   is in the box. A 2D shape (a spine that may double back, which is not a
   function of x at all) takes centripetal Catmull-Rom, /bug's law. The shape
   rule still CHECKS both properties on the samples, so the claim is measured
   on every edit rather than trusted. */
export function sampleCurve(points, spec = null, per = CURVE_SAMPLES_PER_SPAN) {
  if (spec && spec.monotoneX) return samplePchip(points, per);
  return sampleCatmullRom(points, per);
}

/* Fritsch-Carlson monotone cubic Hermite through x-increasing points. Interior
   tangents are the weighted harmonic mean of the neighbouring secants (0 at a
   local extremum or a flat), ends the one-sided three-point estimate, made
   shape-preserving. */
function samplePchip(points, per) {
  const n = points.length;
  if (n < 2) return { pts: points.map((p) => [p[0], p[1]]), span: points.map(() => 0) };
  const h = [], d = [];
  for (let k = 0; k < n - 1; k++) { h.push(points[k + 1][0] - points[k][0]); d.push((points[k + 1][1] - points[k][1]) / h[k]); }
  const m = new Array(n).fill(0);
  if (n === 2) { m[0] = d[0]; m[1] = d[0]; }
  else {
    for (let k = 1; k < n - 1; k++) {
      if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
      const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
      m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
    }
    const end = (h0, h1, d0, d1) => {
      let t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(t) !== Math.sign(d0)) t = 0;
      else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > Math.abs(3 * d0)) t = 3 * d0;
      return t;
    };
    m[0] = end(h[0], h[1], d[0], d[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  const pts = [[points[0][0], points[0][1]]], span = [0];
  for (let k = 0; k < n - 1; k++) {
    const x0 = points[k][0], y0 = points[k][1], y1 = points[k + 1][1];
    for (let j = 1; j <= per; j++) {
      span.push(k);
      if (j === per) { pts.push([points[k + 1][0], y1]); break; }
      const s = j / per, s2 = s * s, s3 = s2 * s;
      const y = (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h[k] * m[k] + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h[k] * m[k + 1];
      pts.push([x0 + s * h[k], y]);
    }
  }
  return { pts, span };
}

function sampleCatmullRom(points, per) {
  const n = points.length;
  if (n < 2) return { pts: points.map((p) => [p[0], p[1]]), span: points.map(() => 0) };
  const P = [sub2(mul2(points[0], 2), points[1]), ...points, sub2(mul2(points[n - 1], 2), points[n - 2])];
  const pts = [[points[0][0], points[0][1]]];
  const span = [0];
  for (let i = 1; i < n; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const t0 = 0;
    const t1 = t0 + Math.max(1e-12, Math.pow(dist2(p0, p1), CR_ALPHA));
    const t2 = t1 + Math.max(1e-12, Math.pow(dist2(p1, p2), CR_ALPHA));
    const t3 = t2 + Math.max(1e-12, Math.pow(dist2(p2, p3), CR_ALPHA));
    for (let k = 1; k <= per; k++) {
      span.push(i - 1);
      if (k === per) { pts.push([p2[0], p2[1]]); break; }
      const t = t1 + ((t2 - t1) * k) / per;
      const A1 = lerp2(p0, p1, (t - t0) / (t1 - t0));
      const A2 = lerp2(p1, p2, (t - t1) / (t2 - t1));
      const A3 = lerp2(p2, p3, (t - t2) / (t3 - t2));
      const B1 = lerp2(A1, A2, (t - t0) / (t2 - t0));
      const B2 = lerp2(A2, A3, (t - t1) / (t3 - t1));
      pts.push(lerp2(B1, B2, (t - t1) / (t2 - t1)));
    }
  }
  return { pts, span };
}

/* THE CONSUMERS' FRONT DOOR: every side a value draws, sampled, in fractions
   or — given `lengthMm` — in millimetres of the owning length. `right` is null
   for 'single'; for 'symmetric' it is the LEFT side's samples (the mirror is
   the same curve — the consumer applies it at -v as it applies the left at
   +v). F3 and F6 call this; they never re-implement the law. */
export function curveSamples(v, spec, { per = CURVE_SAMPLES_PER_SPAN, lengthMm = null } = {}) {
  const scale = (pts) => (lengthMm === null ? pts : pts.map((p) => [p[0] * lengthMm, p[1] * lengthMm]));
  const left = scale(sampleCurve(v.points, spec, per).pts);
  const right = v.mode === 'single' ? null : v.mode === 'symmetric' ? left.map((p) => [p[0], p[1]]) : scale(sampleCurve(v.right, spec, per).pts);
  return { mode: v.mode, left, right };
}

/* A FUNCTION CURVE's y at x, linearly between the samples (monotoneX values
   only — a value that folds back has no single y at x and returns null). */
export function curveYAtX(pts, x) {
  if (!pts.length || x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (!(b[0] > a[0])) return null;
    if (x <= b[0]) return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0]));
  }
  return pts[pts.length - 1][1];
}

/* ---- the shape rule ------------------------------------------------------ */

/* WHY A VALUE IS NOT A CURVE THIS SPEC CAN HOLD — null when it is. The value's
   own validity, independent of any consumer: the mode, the side lists, the
   point count, the box, the end locks, and (for a function curve) the order of
   the points AND of the samples. The editor refuses an edit that breaks any
   of these exactly as it refuses one the consumer's validator rejects; the
   file reader refuses a file value that breaks any of them, whole. */
export function curveShapeRefusal(v, spec) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 'not a curve value';
  if (!CURVE_MODES.includes(v.mode)) return `mode ${JSON.stringify(v.mode)} is not a curve mode`;
  if (!spec.modes.includes(v.mode)) return `mode ${v.mode} is not offered here (${spec.modes.join(' / ')})`;
  for (const k of Object.keys(v)) if (!['mode', 'points', 'right'].includes(k)) return `"${k}" is not a field of a curve value`;
  if (v.mode === 'two-sided' && !Array.isArray(v.right)) return 'a two-sided curve has no right side';
  if (v.mode !== 'two-sided' && v.right !== undefined) return `a ${v.mode} curve carries a right side`;
  for (const s of (v.mode === 'two-sided' ? ['points', 'right'] : ['points'])) {
    const pts = v[s], side = s === 'points' ? 'left' : 'right';
    if (!Array.isArray(pts)) return `the ${side} side is not a list of points`;
    if (pts.length < spec.points[0]) return `the ${side} side has ${pts.length} point${pts.length === 1 ? '' : 's'} — at least ${spec.points[0]} draw a curve here`;
    if (pts.length > spec.points[1]) return `the ${side} side has ${pts.length} points — at most ${spec.points[1]} here`;
    for (const [i, p] of pts.entries()) {
      if (!isPt(p)) return `the ${side} side's point ${i + 1} is not [x, y]`;
      if (p[0] < spec.x[0] || p[0] > spec.x[1] || p[1] < spec.y[0] || p[1] > spec.y[1]) return `the ${side} side's point ${i + 1} (${p[0]}, ${p[1]}) is outside the box x ${spec.x[0]}..${spec.x[1]}, y ${spec.y[0]}..${spec.y[1]}`;
    }
    for (const [end, p, at] of [['first', pts[0], spec.x[0]], ['last', pts[pts.length - 1], spec.x[1]]]) {
      const lk = spec.lock && spec.lock[end];
      if (lk === 'x' || lk === 'xy') if (p[0] !== at) return `the ${side} side's ${end} point must sit at x ${at} (it spans the whole length)`;
    }
    for (let i = 1; i < pts.length; i++) {
      if (dist2(pts[i - 1], pts[i]) === 0) return `the ${side} side's points ${i} and ${i + 1} coincide`;
      if (spec.monotoneX && !(pts[i][0] > pts[i - 1][0])) return `the ${side} side's point ${i + 1} is not past point ${i} along the length`;
    }
    /* THE DRAWN CURVE, not only its points: a function curve never folds back
       along the length, and EVERY curve stays in its box between its points
       (centripetal Catmull-Rom can overshoot a box its points are inside) */
    const sm = sampleCurve(pts, spec).pts;
    if (spec.monotoneX) for (let i = 1; i < sm.length; i++) if (!(sm[i][0] > sm[i - 1][0])) return `the ${side} side's curve would fold back along the length (near x ${sm[i][0].toFixed(3)})`;
    for (const p of sm) if (p[0] < spec.x[0] || p[0] > spec.x[1] || p[1] < spec.y[0] || p[1] > spec.y[1]) return `the ${side} side's curve would leave the box (at ${p[0].toFixed(4)}, ${p[1].toFixed(4)}) between its points`;
  }
  return null;
}

/* A curve value read from OUTSIDE (a file, a scope entry): the value, cloned,
   when it is a curve this spec can hold, else a refusal with the reason. No
   clamp, no snap, no repair — a curve is ONE value, and a value the control
   cannot hold is refused whole (rule 2's "verbatim", stated for a kind whose
   bounds are a shape rather than a range). */
export function readCurveValue(raw, spec) {
  const why = curveShapeRefusal(raw, spec);
  if (why) return { ok: false, note: why };
  return { ok: true, value: cloneCurve(raw) };
}

/* A spec, checked where it is declared (the registry calls this at module
   load for every curve row). Returns a list of problems. */
export function curveSpecProblems(spec, def) {
  const bad = [];
  if (!spec || typeof spec !== 'object') return ['declares no `curve` spec'];
  if (!Array.isArray(spec.modes) || !spec.modes.length || spec.modes.some((m) => !CURVE_MODES.includes(m))) bad.push(`curve.modes must be a non-empty subset of ${CURVE_MODES.join(' / ')}`);
  if (spec.modes && spec.modes.includes('single') && spec.modes.length > 1) bad.push('curve.modes: a single curve has no mirror to switch to — "single" stands alone');
  for (const k of ['x', 'y', 'points']) if (!Array.isArray(spec[k]) || spec[k].length !== 2 || !(spec[k][0] < spec[k][1])) bad.push(`curve.${k} must be [lo, hi] with lo < hi`);
  if (Array.isArray(spec.points) && !(Number.isInteger(spec.points[0]) && spec.points[0] >= 2)) bad.push('curve.points[0] must be a whole number of at least 2');
  if (typeof spec.owner !== 'string' || !spec.owner) bad.push('curve.owner must name the owning length control');
  if (!bad.length) { const why = curveShapeRefusal(def, spec); if (why) bad.push(`its default is not a curve it can hold: ${why}`); }
  return bad;
}

/* ---- the edit operations ------------------------------------------------- */
/* Each returns a CANDIDATE value (a new object; the input is never mutated) or
   null when the operation is not defined on this value (an index out of
   range). They hold the spec's end locks as the definition of the point's
   degrees of freedom — an x-locked end point has no x to move — which is not a
   clamp: the lock is part of what the point IS, stated in the spec. */

function withSide(v, side, pts) {
  const out = cloneCurve(v);
  if (side === 'right' && v.mode === 'two-sided') out.right = pts; else out.points = pts;
  return out;
}

export function movePoint(v, spec, side, i, xy) {
  const pts = pointsOf(v, side);
  if (!(i >= 0 && i < pts.length)) return null;
  const n = pts.length;
  const lk = i === 0 ? spec.lock && spec.lock.first : i === n - 1 ? spec.lock && spec.lock.last : null;
  const next = pts.map((p) => [p[0], p[1]]);
  if (lk === 'xy') return withSide(v, side, next);
  next[i] = [lk === 'x' ? pts[i][0] : xy[0], xy[1]];
  return withSide(v, side, next);
}

/* Insert `xy` as a new control point between points `after` and `after + 1`. */
export function insertPoint(v, side, after, xy) {
  const pts = pointsOf(v, side);
  if (!(after >= 0 && after < pts.length - 1)) return null;
  const next = pts.map((p) => [p[0], p[1]]);
  next.splice(after + 1, 0, [xy[0], xy[1]]);
  return withSide(v, side, next);
}

export function removePoint(v, side, i) {
  const pts = pointsOf(v, side);
  if (!(i >= 0 && i < pts.length)) return null;
  const next = pts.map((p) => [p[0], p[1]]);
  next.splice(i, 1);
  return withSide(v, side, next);
}

/* THE MIRROR SWITCH. symmetric -> two-sided: the right side starts as a copy
   of the left (the shape on screen does not change). two-sided -> symmetric:
   the LEFT side is kept and the right is dropped (Eva's ruling: "switching
   two-sided -> symmetric mirrors the LEFT side over"). Any -> single and
   single -> any keep `points`. */
export function switchMode(v, mode) {
  if (!CURVE_MODES.includes(mode)) return null;
  const out = { mode, points: v.points.map((p) => [p[0], p[1]]) };
  if (mode === 'two-sided') out.right = (v.mode === 'two-sided' ? v.right : v.points).map((p) => [p[0], p[1]]);
  return out;
}

/* WHERE ON THE CURVE `xy` IS NEAREST — for "add a point on the curve": the
   nearest sample of that side's drawn curve and the control span it lies on.
   Distances are in the caller's units: pass `scale = [sx, sy]` to measure in
   screen pixels rather than fractions. */
export function nearestOnCurve(v, spec, side, xy, scale = [1, 1]) {
  const { pts, span } = sampleCurve(pointsOf(v, side), spec);
  let best = null;
  for (let k = 0; k < pts.length; k++) {
    const d = Math.hypot((pts[k][0] - xy[0]) * scale[0], (pts[k][1] - xy[1]) * scale[1]);
    if (!best || d < best.d) best = { d, at: [pts[k][0], pts[k][1]], span: span[k], k };
  }
  return best;
}

/* THE ONE DECISION. `op` is one of
     { op: 'move', side, i, xy } | { op: 'insert', side, after, xy }
     { op: 'remove', side, i }    | { op: 'mode', mode }
   Returns `{ accepted: true, value }` or `{ accepted: false, value: <v unchanged>,
   reason }`. The shape rule speaks first; the consumer's `validate(candidate)`
   then answers true / null / undefined to accept, or false / a string (the
   reason) to refuse. A validator that throws refuses, with its message. */
export function proposeEdit(v, spec, validate, op) {
  let cand = null;
  if (op.op === 'move') cand = movePoint(v, spec, op.side, op.i, op.xy);
  else if (op.op === 'insert') cand = insertPoint(v, op.side, op.after, op.xy);
  else if (op.op === 'remove') cand = removePoint(v, op.side, op.i);
  else if (op.op === 'mode') cand = switchMode(v, op.mode);
  if (!cand) return { accepted: false, value: v, reason: `no such edit (${op.op})` };
  if (curveEquals(cand, v)) return { accepted: true, value: v, unchanged: true };
  const shape = curveShapeRefusal(cand, spec);
  if (shape) return { accepted: false, value: v, reason: shape };
  if (typeof validate === 'function') {
    let r;
    try { r = validate(cand); } catch (e) { r = `the validator failed: ${(e && e.message) || e}`; }
    if (r === false) return { accepted: false, value: v, reason: 'refused by this control' };
    if (typeof r === 'string' && r) return { accepted: false, value: v, reason: r };
  }
  return { accepted: true, value: cand };
}
