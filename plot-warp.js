// plot-warp.js — control points on an axis, with gaussian falloff, for /plot.
//
// THIS FILE IMPORTS NOTHING and knows nothing about stems. Everything here is
// a function of ONE SCALAR — a station `s` along whatever axis the caller owns
// — so the same mechanism can be pointed at a different axis and a different
// line set without being rewritten. The stem uses it with `s` = arc length
// measured downward from a petal's foot; a petal warp would use it with `s` =
// the petal's own `u`. Neither meaning is encoded here.
//
// WHY A GAUSSIAN AND NOT A HAT OR A SPLINE. The requirement is that two
// neighbouring control points BLEND rather than kink: the sum of their
// influences has to be smooth everywhere, including at each point's own
// station. A gaussian is C-infinity and never zero, so a bundle of lines
// displaced by it can only ever bend — there is no station at which the
// displacement's derivative jumps. A hat function kinks at its peak; a spline
// through the offsets would interpolate, which is a different (and here wrong)
// promise: a control point is a PULL, not a point the curve must pass through.
//
// THE WIDTH IS DERIVED, NOT A SEVENTH SLIDER. Each point's sigma comes from
// how far its neighbours are: a point with close neighbours is meant to be a
// local adjustment, a lone point is meant to bend the whole axis. So adding a
// point makes every point near it crisper, which is what "add another control
// point" should do and is why there is no width control to get wrong.

// How wide a control point's influence is, as a multiple of the mean distance
// to its neighbours along the axis. 0.6 puts the neighbour at exp(-(1/0.6)^2)
// = 6.2% of this point's own pull, so two adjacent handles are largely
// independent while the sum between them stays smooth.
export const SIGMA_SPREAD = 0.6;

// A lone control point has no neighbour to take a width from, so it takes the
// whole axis: dragging the only handle bends the entire line, which is the
// only useful thing one handle can mean.
export const LONE_SIGMA_SPREAD = 0.6;

/* THE WIDTH LAW, stated once and read by the app, the read-out and the gate.
   `stations` must be ascending. Returns one sigma per station. */
export function sigmasFor(stations, axisLength) {
  const n = stations.length;
  const L = Math.max(1e-9, axisLength);
  if (n === 0) return [];
  if (n === 1) return [LONE_SIGMA_SPREAD * L];
  return stations.map((s, i) => {
    const gaps = [];
    if (i > 0) gaps.push(Math.abs(s - stations[i - 1]));
    if (i < n - 1) gaps.push(Math.abs(stations[i + 1] - s));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Math.max(1e-6, SIGMA_SPREAD * mean);
  });
}

/* One control point's weight at station `s`. exp(-((s-c)/sigma)^2): 1 at its
   own station, 0.37 one sigma away, 1.8e-2 at two. */
export function gaussianWeight(s, center, sigma) {
  const t = (s - center) / Math.max(1e-9, sigma);
  return Math.exp(-t * t);
}

/* Build a warp from stations (ascending, in the axis's own units), the same
   number of 3-vector offsets, and the axis length the widths are derived
   against. The offsets are WORLD displacements: a handle is dragged in the
   plane facing the camera and the offset is where it ended up minus where it
   rested, so nothing here has to know the axis's orientation. */
export function makeWarp(stations, offsets, axisLength) {
  const sig = sigmasFor(stations, axisLength);
  return {
    length: axisLength,
    points: stations.map((s, i) => ({
      s,
      sigma: sig[i],
      offset: [offsets[i][0], offsets[i][1], offsets[i][2]],
    })),
  };
}

/* The displacement at station `s`, written into `out` (which is OVERWRITTEN,
   not accumulated). A warp with no points writes zero, which is why the caller
   never has to branch on "are there any bend points". */
export function warpAt(warp, s, out) {
  out[0] = 0; out[1] = 0; out[2] = 0;
  if (!warp) return out;
  const pts = warp.points;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const w = gaussianWeight(s, p.s, p.sigma);
    out[0] += p.offset[0] * w;
    out[1] += p.offset[1] * w;
    out[2] += p.offset[2] * w;
  }
  return out;
}

/* True when no control point carries an offset — the state in which the warp
   is arithmetically the identity. The app uses it to skip the whole pass, and
   the read-out uses it to say the handles are resting rather than to imply
   they are doing something. */
export function warpIsRest(warp) {
  if (!warp || !warp.points.length) return true;
  return warp.points.every(p => p.offset[0] === 0 && p.offset[1] === 0 && p.offset[2] === 0);
}

/* WHERE A NEW CONTROL POINT GOES: the middle of the largest gap, counting the
   stretch from the axis origin to the first point as a gap. That is the one
   rule under which "add another" always subdivides the coarsest stretch,
   rather than piling points at one end, and it never moves a point that is
   already placed. Returns the new station; the caller re-sorts. */
export function nextStation(stations, axisLength) {
  const L = Math.max(1e-9, axisLength);
  if (!stations.length) return L;
  /* THE TIE-BREAK IS EXPLICIT, because the common case IS a tie and floating
     point does not break one the way a reader expects. Three evenly spaced
     points on a 170 mm stem give gaps of 56.666666666666664 and
     56.66666666666667 — equal by construction, one ulp apart as computed — so a
     bare `>` handed the second gap the win and "add another" subdivided the
     middle of the stem instead of the stretch nearest the head. Measured, on
     the page's own defaults. Ties now go to the gap nearest the ring. */
  const eps = L * 1e-9;
  let best = stations[0] - 0, at = stations[0] / 2;
  for (let i = 1; i < stations.length; i++) {
    const gap = stations[i] - stations[i - 1];
    if (gap > best + eps) { best = gap; at = (stations[i] + stations[i - 1]) / 2; }
  }
  // The stretch below the last point counts too — otherwise a set that stops
  // short of the root can never gain a point down there.
  const tail = L - stations[stations.length - 1];
  if (tail > best + eps) { best = tail; at = (L + stations[stations.length - 1]) / 2; }
  return at;
}

/* WHICH ONE "remove" DROPS: the middle of the list, so the two EXTREMES
   survive. The ends are the useful handles — one is the root, one is nearest
   the head — and a remove that ate the root would make "the root is a point
   like any other" untrue after a single click. */
export function removeIndex(n) {
  if (n <= 0) return -1;
  return Math.floor((n - 1) / 2);
}
