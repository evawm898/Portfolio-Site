// plot-stem.js — the stem /plot INFERS from the grid, rather than loads.
//
// THIS FILE IMPORTS ONLY plot-warp.js. No three, no DOM: every function here
// is arithmetic over plain arrays, so the gate drives the SHIPPED law in Node
// over stems whose answer can be written down. On the real grid a wrong decay,
// a wrong funnel or a stem that quietly tears at the ring all still draw a
// plausible flower, and there is nothing on screen to compare them against.
//
// WHERE THE STEM COMES FROM. The bloom generator has no stem geometry at all —
// `below` throws, and that is phase-2 work in the generator. But the grid
// export already contains the thing a stem is made of: every u-line starts at
// z = 0 on the attachment ring (measured on the shipped grid: 280 u-lines,
// first-point z exactly 0.0000, first-point radius 2.2766 .. 5.3400 mm around
// a 4.275 mm hub). They are already gathered. So the stem is those same lines
// CONTINUED DOWNWARD and pulled in toward a bundle — no new object, no second
// curve stroked beside them, and because ~280 lines stack in nearly the same
// place below the join, the stem reads bright under the existing additive
// blending without anything being told to brighten it.
//
// THREE THINGS THAT ARE NOT OBVIOUS AND ARE THE WHOLE DESIGN:
//
// 1. DROOP IS NOT A RIGID ROTATION. In /print the bloom and the stem are
//    separate meshes on a pivot, so droop turns one rigid object and the stem
//    is free to stay put. Here the lines are CONTINUOUS: the head cannot
//    rotate without the stem following it. So droop is a rotation whose ANGLE
//    DECAYS along the stem — full at the ring, zero by the end of the neck —
//    and that decay IS the curve that reads as a nodding flower rather than a
//    bent stick. `neck` is therefore not derivable from `droop`: it is the
//    difference between a stiff stalk and a heavy head.
//
// 2. THE HEAD TAKES THE FULL ROTATION AND THE STEM TAKES THE WEIGHTED ONE, AND
//    THEY HAVE TO AGREE EXACTLY AT THE RING. `droopDecay(0, neck)` returns
//    EXACTLY 1 (not "1 to within a tolerance") and `convergence(0, join)`
//    returns EXACTLY 0, so the stem's own s = 0 point evaluates to
//    `rotateAboutRing(foot, centre, droop * 1)` — the same call, on the same
//    input, as the head transform. Both boundary values are exact rather than
//    approached, which is what makes the seam measure 0 mm instead of "small".
//    The stem station is written as `foot + delta(s)` and never as
//    `centre + radius * direction`, because the second form does not reproduce
//    the foot bit-for-bit at s = 0 even when it is analytically equal to it.
//
// 3. THE BEND IS GATED BY THE CONVERGENCE CURVE, AND DROOP IS APPLIED AFTER
//    IT. `convergence` is 0 at the ring, so a control point cannot drag the
//    bloom head around with it however hard it pulls; and because the bend is
//    added to the station BEFORE the rotation, a handle means "displace the
//    stem" rather than fighting the droop it is being rotated by.
//
// 4. A STATION'S PLAN IS THE SAME FOR ALL 280 LINES, and that is why the
//    rebuild is affordable at a hundred-odd stations. The funnel's progress,
//    the droop's decayed angle (with its cosine and sine) and the bend's gated
//    displacement depend on the STATION, never on the line passing through it,
//    so `stationPlans()` computes them once per station and
//    `stemPointFromPlan` reads them. That is a factoring, NOT a second
//    expression of the law: `stemPointAt` — the single-station front door the
//    gate drives and `centrelineAt` calls — is literally
//    `stemPointFromPlan(..., stationPlan(...))`.
//
// The join length does two jobs with one number, which is why there is no
// separate taper control: it is how gradually the lines gather, and it is
// therefore also the head-to-stem taper — a smooth funnel instead of a hard
// join.

import { warpAt } from './plot-warp.js';

/* THE LADDER IS UNIFORM OVER THE WHOLE STEM, WITH EXTRA STATIONS PACKED INTO
   THE TOP ZONE. Two things curve near the ring — the funnel closes over the
   join and the droop washes out over the neck — and one thing curves anywhere:
   a bend point. A single graded ladder cannot serve both, and the first one
   here (s = L (j/N)^1.7, 64 rows) served only the first: it put a third of its
   rows in the top tenth and left the lower stem at 4.5 mm chords, where six
   bend points measured 1.15 mm of corner-cutting — about seven pixels at any
   framing that fits the drawing, and visible on the contact sheet.

   So the body is UNIFORM, which is the only spacing that makes a bend's
   resolution the same wherever the artist puts it, and the top zone gets its
   own fixed count on top — which is what keeps a 0.5 mm funnel a taper rather
   than a step. The two sets are merged, not partitioned, so neither count
   depends on the other. */
export const BODY_ROWS = 120;
export const TOP_ROWS = 24;
// There is deliberately no exported TOTAL: the merge drops near-duplicates, so
// how many stations a ladder actually has is a property of the settings and is
// read off the ladder (the panel prints it) rather than assumed from a constant.

/* THE TOP ZONE is the longer of the join and the neck — the two lengths that
   say how far down the drawing is still turning. Below it the stem is straight
   until a bend point says otherwise, and the uniform body covers that. */
export const topZoneOf = (length, join, neck) =>
  Math.min(length, Math.max(join, neck, length * 1e-3));

/* Two stations closer together than this share a station rather than making a
   segment shorter than the drawing can show. */
const MERGE_EPS = 1e-4;

/* The ring the stem hangs from, read off the feet themselves rather than from
   `asset.extras`: a grid whose placement is not radial has no single ring
   radius, but its feet still have a centroid, and hanging the stem from the
   centroid of whatever feet exist is the only rule that does not need the file
   to be a rosette. */
export function ringOf(feet) {
  if (!feet.length) return null;
  let cx = 0, cy = 0, cz = 0;
  for (const f of feet) { cx += f[0]; cy += f[1]; cz += f[2]; }
  cx /= feet.length; cy /= feet.length; cz /= feet.length;
  let rMin = Infinity, rMax = 0, zMin = Infinity, zMax = -Infinity;
  for (const f of feet) {
    const r = Math.hypot(f[0] - cx, f[1] - cy);
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (f[2] < zMin) zMin = f[2];
    if (f[2] > zMax) zMax = f[2];
  }
  return { center: [cx, cy, cz], rMin, rMax, zMin, zMax, count: feet.length };
}

/* The stations, ascending, s[0] EXACTLY 0 (the foot itself, so the stem's
   first point is the u-line's own first point evaluated through the stem's
   law) and the last exactly the length. `topZone` is how far down the extra
   stations are packed; pass 0 for a plain uniform ladder. */
export function stationLadder(length, topZone = 0, body = BODY_ROWS, top = TOP_ROWS) {
  const nb = Math.max(1, Math.round(body));
  const nt = Math.max(0, Math.round(top));
  const a = Math.max(0, Math.min(length, topZone));
  const all = [];
  for (let j = 0; j <= nb; j++) all.push(length * j / nb);
  for (let k = 1; k < nt && a > 0; k++) all.push(a * k / nt);
  all.sort((x, y) => x - y);
  const eps = Math.max(1e-9, length * MERGE_EPS);
  const out = [all[0]];
  for (let i = 1; i < all.length; i++) {
    if (all[i] - out[out.length - 1] > eps) out.push(all[i]);
  }
  out[0] = 0;
  out[out.length - 1] = length;
  return Float64Array.from(out);
}

/* HOW FAR THE GATHER HAS GOT. 0 at the ring, 1 by the end of the join, with
   zero slope at both ends so the funnel leaves the ring tangentially and
   settles into the bundle without a crease. EXACTLY 0 at s = 0 — see note 2
   in the header; the whole seam rests on it. */
export function convergence(s, joinLength) {
  if (!(joinLength > 0)) return s > 0 ? 1 : 0;
  const t = s / joinLength;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/* HOW MUCH OF THE DROOP THIS STATION CARRIES. EXACTLY 1 at the ring — so the
   stem's top turns with the head, not merely nearly with it — falling to 0 by
   the end of the neck, with zero slope at both ends so the stem leaves the
   ring along the head's own tilt and straightens without a kink. */
export function droopDecay(s, neckLength) {
  if (!(neckLength > 0)) return s > 0 ? 0 : 1;
  const t = s / neckLength;
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return 1 - t * t * (3 - 2 * t);
}

/* The one rotation both the head and the stem go through: about the ring
   centre, around the grid's own X axis, so a positive angle tips the head
   toward +Y. `out` may alias `p`.

   ANGLE 0 COPIES RATHER THAN ROTATES, and that is not an optimisation: it is
   what makes the shipped default (droop 0) leave every grid point bit-for-bit
   as the file wrote it, so the drawing with no droop is the drawing /plot
   already shipped. */
export function rotateAboutRing(p, center, angle, out) {
  if (angle === 0) { out[0] = p[0]; out[1] = p[1]; out[2] = p[2]; return out; }
  return rotateAboutRingCS(p, center, Math.cos(angle), Math.sin(angle), out);
}

/* The same rotation with the trigonometry already done — the form the station
   plan uses, because a station's angle is the same for all 280 lines and
   calling cos and sin once per POINT is 280 times the work for one answer. It
   is the one place the rotation's arithmetic is written; `rotateAboutRing` is
   the angle-taking front door onto it. */
export function rotateAboutRingCS(p, center, c, s, out) {
  const y = p[1] - center[1], z = p[2] - center[2];
  out[0] = p[0];
  out[1] = center[1] + y * c + z * s;
  out[2] = center[2] - y * s + z * c;
  return out;
}

/* EVERYTHING ABOUT A STATION THAT DOES NOT DEPEND ON WHICH LINE IS PASSING
   THROUGH IT — the funnel's progress, the droop's decayed angle, and the bend's
   already-gated displacement. All 280 lines share one ladder, so this is
   computed once per station and read 280 times instead of being recomputed at
   every point; that is the whole reason the stem's rebuild is affordable at a
   hundred stations. `opts`: { bundle, join, length, droopRad, neck }. */
export function stationPlan(opts, warp, s, tmp) {
  const g = convergence(s, opts.join);
  const angle = opts.droopRad * droopDecay(s, opts.neck);
  const d = tmp || [0, 0, 0];
  warpAt(warp, s, d);
  return { s, g, angle,
           cos: angle === 0 ? 1 : Math.cos(angle),
           sin: angle === 0 ? 0 : Math.sin(angle),
           bx: g * d[0], by: g * d[1], bz: g * d[2] };
}

export function stationPlans(opts, warp, ladder) {
  const tmp = [0, 0, 0];
  const out = new Array(ladder.length);
  for (let j = 0; j < ladder.length; j++) out[j] = stationPlan(opts, warp, ladder[j], tmp);
  return out;
}

/* ONE STATION OF ONE STEM LINE. Written as `foot + delta(s)` so that delta is
   arithmetically zero at s = 0 and the point IS the foot before rotation — see
   header note 2. Order is base, then the gated bend, then the droop, which is
   header note 3. */
export function stemPointFromPlan(foot, ring, opts, plan, out) {
  const c = ring.center;
  const fx = foot[0] - c[0], fy = foot[1] - c[1];
  const r0 = Math.hypot(fx, fy);
  // The azimuth the foot sits at is kept the whole way down, so lines that
  // start apart stay apart inside the bundle instead of collapsing onto one
  // another — which is what lets a loose bundle read as separate strands. A
  // foot ON the axis has no azimuth to keep and stays on the axis: that is
  // what makes `centrelineAt` (the same law with the centre as its foot) the
  // stem's actual centre line rather than a line offset by one bundle radius
  // in whatever direction the degenerate case happened to pick.
  const ux = r0 > 1e-9 ? fx / r0 : 0, uy = r0 > 1e-9 ? fy / r0 : 0;
  const g = plan.g;
  out[0] = foot[0] + g * (opts.bundle * ux - fx) + plan.bx;
  out[1] = foot[1] + g * (opts.bundle * uy - fy) + plan.by;
  out[2] = foot[2] - plan.s + plan.bz;
  if (plan.angle === 0) return out;
  return rotateAboutRingCS(out, c, plan.cos, plan.sin, out);
}

/* The single-station front door, and the reference form: it is what the gate
   drives and what `centrelineAt` calls, and it is `stemPointFromPlan` on this
   station's own plan — not a second expression of the law. `tmp` is a scratch
   [3]. */
export function stemPointAt(foot, ring, opts, warp, s, out, tmp) {
  return stemPointFromPlan(foot, ring, opts, stationPlan(opts, warp, s, tmp), out);
}

/* A whole stem line, from the foot (s = 0) down to the root (s = length),
   packed as (plans.length) * 3 floats. Float32 to match the grid's own
   vertices: the foot round-trips exactly, because a value read out of the
   file's Float32Array is already representable. Takes the STATION PLANS rather
   than the ladder, so the caller builds them ONCE for the whole bundle —
   `stationPlans(opts, warp, ladder)` is what makes them. */
export function stemLine(foot, ring, opts, plans, out) {
  const p = out || new Float32Array(plans.length * 3);
  const v = [0, 0, 0];
  for (let j = 0; j < plans.length; j++) {
    stemPointFromPlan(foot, ring, opts, plans[j], v);
    p[j * 3] = v[0]; p[j * 3 + 1] = v[1]; p[j * 3 + 2] = v[2];
  }
  return p;
}

/* The stem's own CENTRELINE at a station — where a bend handle is drawn, and
   what the read-out measures the bend against. It is the same law with the
   foot replaced by the ring centre, so a handle sits on the line the bundle
   actually runs down rather than beside it. */
export function centrelineAt(ring, opts, warp, s, out, tmp) {
  return stemPointAt(ring.center, ring, opts, warp, s, out, tmp || [0, 0, 0]);
}

/* HOW MUCH THE GRADED LADDER CUTS THE CORNER, in mm: the largest distance
   between a chord's midpoint and the curve's own point at the midpoint
   station. Measured on the centreline, which carries the droop and the bend
   and is therefore the most curved line in the bundle. This is printed on the
   page rather than assumed, because "48 eased rows is enough" is a claim about
   the settings in front of you and not about the law. */
export function maxChordSagitta(ring, opts, warp, ladder) {
  const a = [0, 0, 0], b = [0, 0, 0], m = [0, 0, 0], t = [0, 0, 0];
  let worst = 0;
  centrelineAt(ring, opts, warp, ladder[0], a, t);
  for (let j = 1; j < ladder.length; j++) {
    centrelineAt(ring, opts, warp, ladder[j], b, t);
    centrelineAt(ring, opts, warp, (ladder[j - 1] + ladder[j]) / 2, m, t);
    const d = Math.hypot(m[0] - (a[0] + b[0]) / 2, m[1] - (a[1] + b[1]) / 2,
                         m[2] - (a[2] + b[2]) / 2);
    if (d > worst) worst = d;
    a[0] = b[0]; a[1] = b[1]; a[2] = b[2];
  }
  return worst;
}

/* THE HEAD'S OWN TRANSFORM — the full droop, no decay, about the same centre.
   Returns the SAME array when the angle is 0, so the shipped default hands the
   drawing straight through and no copy is made. */
export function headTransform(points, count, center, angle) {
  if (angle === 0) return points;
  const out = new Float32Array(count * 3);
  const p = [0, 0, 0], q = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    p[0] = points[i * 3]; p[1] = points[i * 3 + 1]; p[2] = points[i * 3 + 2];
    rotateAboutRing(p, center, angle, q);
    out[i * 3] = q[0]; out[i * 3 + 1] = q[1]; out[i * 3 + 2] = q[2];
  }
  return out;
}
