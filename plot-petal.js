// plot-petal.js — one petal's own axis, and the deformation that rides on it.
//
// THIS FILE IMPORTS ONLY plot-warp.js. No three, no DOM: every function here is
// arithmetic over plain arrays, so the gate drives the SHIPPED law in Node over
// petals whose answer can be written down. That matters more here than almost
// anywhere else on this page, because on a 28-petal bloom drawn white on black
// a warp that reaches the wrong petal, a warp that reaches only one of the two
// line families, and a warp that quietly drags the attachment ring with it ALL
// still draw a plausible flower.
//
// plot-warp.js IS NOT REBUILT HERE, AND THAT WAS THE POINT OF WRITING IT THE
// WAY IT IS. It is a function of one scalar station along whatever axis the
// caller owns; the stem was its first caller and this is its second. What this
// file supplies is the AXIS — where a petal's stations are, how long it is, and
// what a displacement at a station does to the petal's points.
//
// FOUR THINGS THAT ARE NOT OBVIOUS AND ARE THE WHOLE DESIGN:
//
// 1. THE STATION IS ARC LENGTH IN MILLIMETRES ALONG THE PETAL'S OWN CENTRE
//    LINE, NOT `u`. The file parameterises a petal by u in [0, 1] and that is
//    what places each point (see `stationsForStrip` in plot-grid.js); but u is
//    a PARAMETER, and the export's own telemetry records `metricMax` reaching
//    4.12 under cup — evenly spaced u is not evenly spaced millimetres. A
//    gaussian of constant width in u would be a bend whose physical size
//    changed along the petal, and `sigmasFor` derives its widths from the gaps
//    between stations, so the units it is handed decide what a handle means.
//    So u orders the rows and the CENTRE LINE measured through them supplies
//    the millimetres. On the shipped grid the two agree to 2e-5 mm, which is
//    what a flat build looks like and is not a reason to assume it.
//
// 2. THE STATION IS A FUNCTION OF u ALONE, WHICH IS WHAT KEEPS THE TWO LINE
//    FAMILIES TOGETHER. A petal is 10 u-lines of 29 points and 29 v-lines of 10
//    points over ONE lattice: the u-line in column c and the v-line in row r
//    share the point (r, c), bit for bit (measured on the shipped grid: 0
//    mismatches over all 28 petals). Because every term below depends on the
//    point and on its station only — never on which strip the point arrived in
//    — the two copies of a shared point receive the SAME displacement and the
//    grid cannot tear internally. That is a structural property, not a
//    tolerance, and the gate asserts it as an identity.
//
// 3. THE BASE IS HELD EXACTLY, AND IT IS HELD BY THE DELTA BEING ZERO RATHER
//    THAN BY A COMPARISON. Every u-line starts on the attachment ring at
//    z = 0, and the inferred stem continues from exactly those points, so a
//    petal that moved at its base would tear away from the bundle — the same
//    failure the stem's join gate exists to prevent, coming the other way. The
//    law is written as `point + delta`, `rootHold` returns EXACTLY 0 at
//    station 0, and the centre-line term is a difference of a value with
//    itself there; so all three components of the delta are exactly zero at the
//    base row and the caller hands the point straight back. `=== 0` and not
//    `Object.is` on purpose: `-0 === 0` is true, and the sign a zero comes back
//    with depends on the sign of `along - 1`.
//
// 4. STRETCH ALONG AND STRETCH ACROSS ARE INDEPENDENT BECAUSE THEY ACT ON
//    DIFFERENT HALVES OF ONE DECOMPOSITION. Every point is its row's centroid
//    plus an offset from it: `along` scales the CENTRE LINE about the base
//    (longer petal, same cross-sections) and `across` scales the OFFSET (wider
//    petal, same length). Neither is a scale of the whole petal, so setting
//    both to k is a similarity and setting one is not.
//
// WHY THE ACROSS SCALE IS GATED AND THE ALONG SCALE IS NOT. The along scale is
// anchored by construction — it multiplies `centre − base`, which is zero at
// the base — so a longer petal still leaves the ring from the same point at the
// same angle. The across scale is not: widening a petal's own foot would widen
// the arc it occupies on a ring 28 petals share, and would move the feet the
// stem is built from. So it rides the same `rootHold` the bend does, and the
// petal flares out of a foot whose width the junction owns. That is the
// botanically correct reading as well as the safe one, and it is stated rather
// than hidden.

import { warpAt, warpIsRest } from './plot-warp.js';

/* HOW MANY OF THE FILE'S OWN ROWS THE BASE HOLD CLOSES OVER. Not a fraction of
   the petal and not a length in mm: a gate shorter than the lattice spacing
   cannot be DRAWN — it would step between row 0 and row 1 rather than taper,
   which is exactly the failure the stem's funnel has a check for. Counting
   rows makes the hold resolved by at least three segments on any grid, however
   coarse or fine its ladder. On the shipped grid that is 3.75 mm of a 35 mm
   petal. */
export const ROOT_HOLD_ROWS = 3;

/* HOW MUCH OF THE WARP THIS STATION CARRIES. EXACTLY 0 at the base — so the
   attachment row is the file's own point rather than nearly it — rising to 1
   by the end of the hold, with zero slope at both ends so the petal leaves the
   ring tangentially and settles into the deformation without a crease. The
   stem's `convergence` is the same shape for the same reason; they are not
   shared because they are gates on different axes and a change to one is not a
   change to the other. */
export function rootHold(s, holdLength) {
  if (!(holdLength > 0)) return s > 0 ? 1 : 0;
  const t = s / holdLength;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/* THE PETAL'S OWN FRAME, measured from the file's points rather than declared.
   Takes the petal's strips (each carrying `stations`, `points` and `count`) and
   returns:

     rows    one entry per DISTINCT declared u, ascending: its u, the centroid
             of every u-line point at that u, and the arc length to it
     base    rows[0].c — the same array, so `c - base` at the base row is a
             difference of a value with itself and is exactly +0
     length  the arc length of the whole centre line
     hold    the station ROOT_HOLD_ROWS rows in
     byU     u -> row index, so a point whose u the file declared is looked up
             rather than interpolated to

   Built from the u-lines because they are the family that runs ALONG the petal
   and therefore the family that has one point per row. Returns null for a petal
   with fewer than two rows or no length, which is a petal there is no axis to
   measure. */
export function petalFrame(strips) {
  const acc = new Map();
  for (const t of strips) {
    if (t.kind !== 'u' || !t.stations) continue;
    for (let i = 0; i < t.count; i++) {
      const u = t.stations[i];
      let r = acc.get(u);
      if (!r) acc.set(u, r = { u, n: 0, x: 0, y: 0, z: 0 });
      r.n++;
      r.x += t.points[i * 3]; r.y += t.points[i * 3 + 1]; r.z += t.points[i * 3 + 2];
    }
  }
  if (acc.size < 2) return null;
  const rows = [...acc.values()].sort((a, b) => a.u - b.u)
    .map(r => ({ u: r.u, n: r.n, c: [r.x / r.n, r.y / r.n, r.z / r.n], s: 0 }));
  let s = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].c, b = rows[i].c;
    s += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    rows[i].s = s;
  }
  if (!(s > 0)) return null;
  const byU = new Map();
  rows.forEach((r, i) => byU.set(r.u, i));
  let hold = rows[Math.min(ROOT_HOLD_ROWS, rows.length - 1)].s;
  // A grid whose first rows are coincident would give a zero hold, which is a
  // step rather than a taper. Falling back to the whole petal is the only other
  // length there is to reach for, and it is a hold that is certainly resolved.
  if (!(hold > 0)) hold = s;
  return { rows, byU, base: rows[0].c, length: s, hold,
           holdRows: Math.min(ROOT_HOLD_ROWS, rows.length - 1) };
}

/* A DECLARED u IS LOOKED UP, NOT INTERPOLATED TO. Every point of every strip
   sits on a row the file named, so the common path is a map hit that returns
   the row's own numbers — no arithmetic, and therefore no chance of a value
   that is analytically the row's but not bitwise it. Interpolation is the
   fallback for a u no u-line declared (a v-line between rows, on a file that
   has one). */
function rowIndexFor(frame, u) {
  const i = frame.byU.get(u);
  return i === undefined ? -1 : i;
}

export function stationOfU(frame, u) {
  const i = rowIndexFor(frame, u);
  if (i >= 0) return frame.rows[i].s;
  const rows = frame.rows;
  if (u <= rows[0].u) return rows[0].s;
  if (u >= rows[rows.length - 1].u) return rows[rows.length - 1].s;
  for (let k = 1; k < rows.length; k++) {
    if (u <= rows[k].u) {
      const a = rows[k - 1], b = rows[k];
      const t = (u - a.u) / (b.u - a.u);
      return a.s + t * (b.s - a.s);
    }
  }
  return rows[rows.length - 1].s;
}

/* The centre line at a declared u. Returns the row's OWN array when the u is
   one the file named — which is what makes `c - base` exactly zero at the base
   row rather than zero to within a rounding. Never mutate what comes back. */
export function centreOfU(frame, u, out) {
  const i = rowIndexFor(frame, u);
  if (i >= 0) return frame.rows[i].c;
  const rows = frame.rows;
  const o = out || [0, 0, 0];
  if (u <= rows[0].u) { o[0] = rows[0].c[0]; o[1] = rows[0].c[1]; o[2] = rows[0].c[2]; return o; }
  const last = rows[rows.length - 1];
  if (u >= last.u) { o[0] = last.c[0]; o[1] = last.c[1]; o[2] = last.c[2]; return o; }
  for (let k = 1; k < rows.length; k++) {
    if (u <= rows[k].u) {
      const a = rows[k - 1], b = rows[k];
      const t = (u - a.u) / (b.u - a.u);
      for (let x = 0; x < 3; x++) o[x] = a.c[x] + t * (b.c[x] - a.c[x]);
      return o;
    }
  }
  return o;
}

/* The centre line at an arc-length station — where a bend handle is drawn and
   what its drag is solved against. The rows are ascending in `s` by
   construction, so this is the same interpolation the other way round. */
export function centreAtStation(frame, s, out) {
  const rows = frame.rows;
  const o = out || [0, 0, 0];
  const put = c => { o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; return o; };
  if (!(s > rows[0].s)) return put(rows[0].c);
  const last = rows[rows.length - 1];
  if (s >= last.s) return put(last.c);
  for (let k = 1; k < rows.length; k++) {
    if (s <= rows[k].s) {
      const a = rows[k - 1], b = rows[k];
      const span = b.s - a.s;
      if (!(span > 0)) return put(b.c);
      const t = (s - a.s) / span;
      for (let x = 0; x < 3; x++) o[x] = a.c[x] + t * (b.c[x] - a.c[x]);
      return o;
    }
  }
  return put(last.c);
}

/* THE ONE PLACE THE DEFORMATION IS WRITTEN. Three terms, and each one is a
   DISPLACEMENT so the whole law is `point + delta` and "the base does not move"
   is an identity rather than a comparison:

     along   (along − 1) · (centre − base)        the centre line, scaled about
                                                  the base: a longer or shorter
                                                  petal with the same sections
     across  hold · (across − 1) · (point − centre)
                                                  the offset from the centre
                                                  line, scaled: a wider or
                                                  narrower petal of the same
                                                  length, held at its foot
     bend    hold · warpAt(warp, s)               the control points, gated so a
                                                  handle cannot drag the ring

   `c` and `p` are supplied by the caller so that a point uses the centre at its
   own declared u and a handle uses the centre at its own station — two front
   doors onto one arithmetic, the discipline plot-stem.js's `stemPointFromPlan`
   already follows. `out` is OVERWRITTEN. */
export function petalDeltaAt(frame, warp, st, s, c, p, out, tmp) {
  const g = rootHold(s, frame.hold);
  const b = frame.base;
  const w = warpAt(warp, s, tmp || [0, 0, 0]);
  const ka = st.along - 1;
  const kc = g * (st.across - 1);
  out[0] = ka * (c[0] - b[0]) + kc * (p[0] - c[0]) + g * w[0];
  out[1] = ka * (c[1] - b[1]) + kc * (p[1] - c[1]) + g * w[1];
  out[2] = ka * (c[2] - b[2]) + kc * (p[2] - c[2]) + g * w[2];
  return out;
}

/* True when nothing is asked of the petal — the state in which the law is
   arithmetically the identity, so the app can skip the pass and the strips it
   hands the renderer are the file's own arrays. */
export function petalIsRest(st, warp) {
  return st.along === 1 && st.across === 1 && warpIsRest(warp);
}

/* ONE STRIP, DEFORMED. Returns the SAME array at rest — the discipline
   `headTransform` already follows for droop 0 — so a petal nobody has touched
   draws the vertices the file wrote, and "the other 27 petals were not
   touched" is an array identity rather than a measurement.

   Float32 out, because that is what the grid's own vertices are and what the
   renderer packs; a point that does not move round-trips exactly, since a value
   read out of a Float32Array is already representable. */
export function petalPoints(points, count, stations, frame, warp, st, out) {
  if (petalIsRest(st, warp)) return points;
  const o = out || new Float32Array(count * 3);
  const p = [0, 0, 0], d = [0, 0, 0], tmp = [0, 0, 0], cb = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    p[0] = points[i * 3]; p[1] = points[i * 3 + 1]; p[2] = points[i * 3 + 2];
    const u = stations[i];
    const c = centreOfU(frame, u, cb);
    petalDeltaAt(frame, warp, st, stationOfU(frame, u), c, p, d, tmp);
    // A ZERO DELTA COPIES RATHER THAN ADDS — header note 3. `x + (-0)` is x but
    // `(-0) + 0` is `+0`, so a point whose own coordinate is a negative zero
    // would come back as a positive one and stop being the file's point. The
    // test is `=== 0` because a zero's sign here follows the sign of
    // `along - 1`, and `-0 === 0`.
    if (d[0] === 0 && d[1] === 0 && d[2] === 0) {
      o[i * 3] = p[0]; o[i * 3 + 1] = p[1]; o[i * 3 + 2] = p[2];
    } else {
      o[i * 3] = p[0] + d[0]; o[i * 3 + 1] = p[1] + d[1]; o[i * 3 + 2] = p[2] + d[2];
    }
  }
  return o;
}

/* WHERE A BEND HANDLE STANDS: the deformed centre line at a station. It is the
   same law with the point and the centre the same array, so the across term is
   a difference of a value with itself and drops out exactly — a handle sits on
   the line the petal actually runs down, and widening the petal does not move
   it. */
export function petalCentreAt(frame, warp, st, s, out, tmp) {
  const c = centreAtStation(frame, s, [0, 0, 0]);
  const d = petalDeltaAt(frame, warp, st, s, c, c, [0, 0, 0], tmp);
  const o = out || [0, 0, 0];
  o[0] = c[0] + d[0]; o[1] = c[1] + d[1]; o[2] = c[2] + d[2];
  return o;
}

/* THE PETAL'S OWN WIDTH, measured rather than declared: the largest distance
   from the centre line to any point on its row, over every row. The read-out
   prints it so `across` can be judged in millimetres; the file's `halfWidthMm`
   is the GENERATOR's number for the surface it built and says nothing about
   what the grid on screen currently is.

   IT IS A MAXIMUM, AND A MAXIMUM CANNOT SEE A GATED NARROWING — measured, and
   the reason the gate asserts the across scale row by row instead. `across`
   rides `rootHold`, so the rows inside the hold keep the width the junction
   gave them; narrow the blade far enough and the widest point on the petal
   moves INTO the hold, where it is by design not narrowing. On the written-down
   fixture (every row 4 mm) the maximum reads 4 at across 0.5 and at across
   0.25 alike, and on the shipped grid across 0.4 happens to land the scaled
   blade exactly on the base row's own 3.2 mm — a check that watched the maximum
   would have passed that one for no reason at all. */
export function petalHalfWidth(strips, frame) {
  let w = 0;
  const cb = [0, 0, 0];
  for (const t of strips) {
    if (!t.stations) continue;
    for (let i = 0; i < t.count; i++) {
      const c = centreOfU(frame, t.stations[i], cb);
      w = Math.max(w, Math.hypot(t.points[i * 3] - c[0], t.points[i * 3 + 1] - c[1],
                                 t.points[i * 3 + 2] - c[2]));
    }
  }
  return w;
}
