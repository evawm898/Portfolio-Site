// Coarse client-side math for the shape editor's LIVE (drag) pass — a
// standalone port, deliberately NOT importing editor/surface.js: the two
// pages stay fully separate per the milestone-3 instruction ("shared
// shell code, separate pages" means shared math class, not a shared
// file). The authoritative FULL pass is always the server
// (/api/curve -> shell.py's real PchipInterpolator + ShellModel), fired
// once on pointerup. This module exists only to make dragging feel live;
// never trust its numbers as final — see the "COARSE (live" labels in
// editor.js.

// -- PCHIP (Fritsch-Carlson monotone cubic Hermite) -------------------------
// Same interpolant class scipy.interpolate.PchipInterpolator uses server
// side (and that FittedDepth/front_silhouette.py use throughout this
// project) — shape-preserving, no manufactured overshoot between control
// points. Not asserted monotone in y (a real silhouette need not be).
export function pchipFit(xs, ys) {
  const n = xs.length;
  const h = new Array(n - 1), delta = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    delta[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const d = new Array(n);
  if (n === 2) {
    d[0] = d[1] = delta[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] === 0 || delta[i] === 0 || (delta[i - 1] < 0) !== (delta[i] < 0)) {
        d[i] = 0;
      } else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
      }
    }
    // one-sided end conditions (Fritsch-Carlson, shape-preserving)
    const endSlope = (h0, h1, d0, d1) => {
      let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if ((m < 0) !== (d0 < 0)) m = 0;
      else if ((d0 < 0) !== (d1 < 0) && Math.abs(m) > Math.abs(3 * d0)) m = 3 * d0;
      return m;
    };
    d[0] = endSlope(h[0], h[1], delta[0], delta[1]);
    d[n - 1] = endSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  }
  return (x) => {
    x = Math.max(xs[0], Math.min(xs[n - 1], x));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    const t = (x - xs[lo]) / h[lo], t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return h00 * ys[lo] + h10 * h[lo] * d[lo] + h01 * ys[lo + 1] + h11 * h[lo] * d[lo + 1];
  };
}

// Fritsch-Carlson interior/end slopes alone (the same computation pchipFit
// does internally, factored out so neckline.py's NecklineV3 descent —
// which takes those slopes and then OVERRIDES the first and last before
// building a Hermite spline through them — can be ported without
// touching the validated pchipFit above).
function fritschCarlsonSlopes(xs, ys) {
  const n = xs.length;
  const h = new Array(n - 1), delta = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    delta[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const d = new Array(n);
  if (n === 2) {
    d[0] = d[1] = delta[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] === 0 || delta[i] === 0 || (delta[i - 1] < 0) !== (delta[i] < 0)) {
        d[i] = 0;
      } else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
      }
    }
    const endSlope = (h0, h1, d0, d1) => {
      let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if ((m < 0) !== (d0 < 0)) m = 0;
      else if ((d0 < 0) !== (d1 < 0) && Math.abs(m) > Math.abs(3 * d0)) m = 3 * d0;
      return m;
    };
    d[0] = endSlope(h[0], h[1], delta[0], delta[1]);
    d[n - 1] = endSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);
  }
  return d;
}

// Piecewise cubic Hermite through explicit (xs, ys, slopes) — same basis
// as pchipFit's eval, just taking given slopes instead of computing them,
// so it can build the RISE segment's non-monotone-style explicit-tangent
// spline and the DESCENT segment's slope-overridden spline (both from
// neckline.py's NecklineV3) with one shared evaluator.
function hermiteSpline(xs, ys, slopes) {
  const n = xs.length;
  return (x) => {
    x = Math.max(xs[0], Math.min(xs[n - 1], x));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    const hlo = xs[lo + 1] - xs[lo];
    const t = (x - xs[lo]) / hlo, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return h00 * ys[lo] + h10 * hlo * slopes[lo] + h01 * ys[lo + 1] + h11 * hlo * slopes[lo + 1];
  };
}

// Faithful port of neckline.py's NecklineV3.height(theta) — the physical
// top edge of the bodice. `n` is the baked generator's neckline dict
// (cf_height/peak_height/peak_theta/side_height/cb_height/cf_corner/
// rise_bow/decay_rate); cb_ease_deg and peak_sharpness are NOT exported
// because dress_params() never overrides them off NecklineV3Params'
// defaults (15.0 and 1.0 respectively — peak_sharpness < 1 isn't even
// implemented Python-side), so they're fixed constants here too.
// Validated against neckline.NecklineV3.height() directly: 22 test
// thetas spanning the rise, the peak, every descent knot region, the CB
// ease, negative theta, and >180deg raw values (what buildMeshes' BACK
// half actually feeds it) — max absolute error ~1e-11mm.
const NECKLINE_CB_EASE_DEG = 15.0;

export function necklineHeightFn(n) {
  const chord = (n.peak_height - n.cf_height) / n.peak_theta;
  const m0 = n.cf_corner ? chord * (1.0 - n.rise_bow) : 0.0;
  const m1 = chord * (1.0 + n.rise_bow);
  const rise = hermiteSpline([0.0, n.peak_theta], [n.cf_height, n.peak_height], [m0, m1]);

  const drop = n.peak_height - n.cb_height;
  const t30 = n.peak_theta + 30.0;
  const h30 = n.peak_height - n.decay_rate * drop;
  const t_ease = 180.0 - NECKLINE_CB_EASE_DEG;
  const tau_tail = (180.0 - t30) / 3.0;
  const h_ease = n.cb_height + (h30 - n.cb_height) * Math.exp(-(t_ease - t30) / tau_tail);
  const knots = [n.peak_theta, 90.0, t30, t_ease, 180.0];
  const vals = [n.peak_height, n.side_height, h30, h_ease, n.cb_height];
  const slopes = fritschCarlsonSlopes(knots, vals);
  slopes[0] = (vals[1] - vals[0]) / (knots[1] - knots[0]);   // steepest, never eased
  slopes[slopes.length - 1] = 0.0;                            // zero at CB (mirror)
  const descent = hermiteSpline(knots, vals, slopes);

  return (thetaDeg) => {
    let t = Math.abs(thetaDeg);
    if (t > 180.0) t = 360.0 - t;
    return t <= n.peak_theta ? rise(t) : descent(t);
  };
}

// Ramanujan II — same formula as bodice.ellipse_perimeter / _perimeter_np
export function ellipsePerimeter(a, b) {
  const h = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
}

// 24-pt Gauss-Legendre on [-1,1] — same rule shell.py / surface.js use,
// so a coarse and a full pass agree to floating-point precision on the
// SAME a(z)/b(z), and only differ where the fits themselves differ.
const GL_X = [-0.9951872199970213, -0.9747285559713095, -0.9382745520027328, -0.8864155270044011, -0.820001985973903, -0.7401241915785544, -0.6480936519369755, -0.5454214713888396, -0.4337935076260451, -0.3150426796961634, -0.1911188674736163, -0.06405689286260563, 0.06405689286260563, 0.1911188674736163, 0.3150426796961634, 0.4337935076260451, 0.5454214713888396, 0.6480936519369755, 0.7401241915785544, 0.820001985973903, 0.8864155270044011, 0.9382745520027328, 0.9747285559713095, 0.9951872199970213];
const GL_W = [0.01234122979998869, 0.02853138862893356, 0.04427743881741941, 0.05929858491543636, 0.07334648141108016, 0.0861901615319532, 0.09761865210411393, 0.10744427011596556, 0.11550566805372552, 0.1216704729278033, 0.12583745634682825, 0.12793819534675202, 0.12793819534675202, 0.12583745634682825, 0.1216704729278033, 0.11550566805372552, 0.10744427011596556, 0.09761865210411393, 0.0861901615319532, 0.07334648141108016, 0.05929858491543636, 0.04427743881741941, 0.02853138862893356, 0.01234122979998869];

function arcAndSpeed(t, a, b) {
  const half = 0.5 * t;
  let arc = 0;
  for (let i = 0; i < 24; i++) {
    const tau = half * (GL_X[i] + 1);
    arc += GL_W[i] * Math.hypot(a * Math.cos(tau), b * Math.sin(tau));
  }
  return { arc: half * arc, speed: Math.hypot(a * Math.cos(t), b * Math.sin(t)) };
}

// Compound mean-Ramanujan perimeter — same formula as compound.py's
// compound_perimeter (front half-ellipse + back half-ellipse, mean).
export function compoundPerimeter(a, bf, bb) {
  return 0.5 * (ellipsePerimeter(a, bf) + ellipsePerimeter(a, bb));
}

// A coarse CompoundShellModel-equivalent, built directly from edited
// a(v)/b_front(v)/b_back(v) fits. Ports compound.py's CompoundShellModel
// .param_from_arc_angle/.point: front half-ellipse (a, b_front) owns
// |theta| <= 90deg, back half-ellipse (a, b_back) owns the rest, target
// arc rebased through the junction — same per-half Newton solve, just
// fewer iterations (coarse). Mesh triangulation only, no frame()/
// curvature (that stays server-side — the full sweep is expensive and
// only ever runs on release, see editor.js).
export class CompoundCoarseShell {
  constructor(aFit, bfFit, bbFit, zLo, zHi, splitThetaDeg) {
    this.aFit = aFit; this.bfFit = bfFit; this.bbFit = bbFit;
    this.zLo = zLo; this.zHi = zHi;
    this.splitTheta = splitThetaDeg * Math.PI / 180;
  }

  paramFromArcAngle(thetaRad, a, bf, bb) {
    const theta = ((thetaRad + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    // section_perimeter(z) in shell.py's equal-arc convention is the
    // COMPOUND MEAN (compound.CompoundShellModel inherits mean_radius
    // from the base, which reads depth.perimeter() = compound_perimeter,
    // not Ram(bf)+Ram(bb)) — using the sum here silently doubled every
    // target arc length and put every point at the wrong theta. Caught
    // by cross-checking this port against shell.py's ShellModel.point()
    // directly (352mm position error before the fix, ~0 after).
    const P = compoundPerimeter(a, bf, bb);
    const target = P * Math.abs(theta) / (2 * Math.PI);
    const quarterF = arcAndSpeed(0.5 * Math.PI, a, bf).arc;
    const quarterB = arcAndSpeed(0.5 * Math.PI, a, bb).arc;
    const front = target <= quarterF;
    const tgt = front ? target : target - quarterF + quarterB;
    const bUse = front ? bf : bb;
    let t = Math.min(Math.abs(theta), Math.PI);
    for (let k = 0; k < 7; k++) {
      const { arc, speed } = arcAndSpeed(t, a, bUse);
      t = Math.max(0, Math.min(Math.PI, t - (arc - tgt) / speed));
    }
    return Math.sign(theta) * t;
  }

  point(thetaRad, z) {
    const a = this.aFit(z), bf = this.bfFit(z), bb = this.bbFit(z);
    const t = this.paramFromArcAngle(thetaRad, a, bf, bb);
    const bSel = Math.cos(t) >= 0 ? bf : bb;
    return [a * Math.sin(t), bSel * Math.cos(t), z];
  }

  // FRONT/BACK triangulated meshes, coarse resolution (n_theta cols,
  // n_z rows) — enough to see the shape change live, not the export mesh.
  //
  // necklineFn (optional, from necklineHeightFn above) trims the top: for
  // each theta COLUMN the z-row sampling is rescaled from zLo up to
  // min(zHi, necklineFn(thetaDeg)) instead of always zHi — a clip, not a
  // solve, since neckline height is already a known function of theta and
  // every resulting vertex is still an exact point() on the true shell,
  // just sampled over a shorter range for columns the neckline cuts low.
  // shell.py's own _clamp_to_neckline clips the same way but keeps a
  // FIXED z grid and collapses above-neckline rows to zero-area instead
  // (fine at its 256x400 export resolution) — at this mesh's much coarser
  // 48x64, collapsing rows would waste most of the row budget on columns
  // near CB where the neckline sits well below zHi, so this per-column
  // rescale is used instead to spend every row on visible surface. Same
  // trimmed boundary curve either way; no shell above neckline(theta).
  buildMeshes(nTheta = 48, nZ = 64, necklineFn = null) {
    const meshes = {};
    const half = nTheta / 2;
    for (const [name, t0, t1] of [
      ["FRONT", -this.splitTheta, this.splitTheta],
      ["BACK", this.splitTheta, 2 * Math.PI - this.splitTheta]]) {
      const cols = half + 1;
      const topZ = new Array(cols);
      for (let i = 0; i < cols; i++) {
        const th = t0 + (t1 - t0) * i / half;
        topZ[i] = necklineFn ? Math.min(this.zHi, necklineFn(th * 180 / Math.PI)) : this.zHi;
      }
      const pos = [];
      for (let j = 0; j <= nZ; j++) {
        for (let i = 0; i < cols; i++) {
          const th = t0 + (t1 - t0) * i / half;
          const z = this.zLo + (topZ[i] - this.zLo) * j / nZ;
          const p = this.point(th, z);
          pos.push(p[0], p[1], p[2]);
        }
      }
      const idx = [];
      for (let j = 0; j < nZ; j++) {
        for (let i = 0; i < half; i++) {
          const q00 = j * cols + i, q01 = q00 + 1;
          const q10 = q00 + cols, q11 = q10 + 1;
          idx.push(q00, q11, q01, q00, q10, q11);
        }
      }
      meshes[name] = { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
    }
    return meshes;
  }
}

// Same methodology as front_silhouette.py's monotonicity_report /
// shape_editor_server._monotonicity_report — waist (v=0) up to neckline.
export function monotonicityReport(aFit, vHi, n = 400) {
  const vv = new Array(n);
  for (let i = 0; i < n; i++) vv[i] = vHi * i / (n - 1);
  const a = vv.map(aFit);
  let worst = -Infinity, worstAt = null;
  for (let i = 0; i < n - 1; i++) {
    const da = a[i + 1] - a[i];
    if (da > worst) { worst = da; worstAt = vv[i]; }
  }
  return {
    non_increasing_waist_to_neckline: worst <= 1e-9,
    worst_positive_slope_mm_per_mm: Math.max(worst, 0),
    worst_at_v: worstAt,
  };
}

// Derived circumference at the standard tape anchors — pure Ramanujan,
// same anchors as front_silhouette.DEFAULT_TAPE_ANCHORS (kept in sync by
// hand here since this file has no server import; the FULL pass is the
// authoritative source of truth for this table).
export const TAPE_ANCHORS = [
  ["waist", 0.0, 609.6], ["underbust", 152.4, 711.2],
  ["bust", 203.2, 825.5], ["above-bust", 254.0, 812.8],
];

export function coarseCircumferenceReport(aFit, bfFit, bbFit, vLo, vHi) {
  return TAPE_ANCHORS.map(([label, v, tapeMm]) => {
    const vv = Math.max(vLo, Math.min(vHi, v));
    const derived = compoundPerimeter(aFit(vv), bfFit(vv), bbFit(vv));
    return { label, v, derived_mm: derived, tape_mm: tapeMm,
             delta_mm: derived - tapeMm, in_range: v >= vLo && v <= vHi };
  });
}

// -- adaptive point placement -------------------------------------------
// Greedy worst-residual insertion: builds an ORDERED sequence (insertion
// order, NOT sorted by v) that approximates `groundTruth` ever more
// closely. Endpoints (vLo, vHi) are always the first two. Every prefix
// length K's max/rms residual gets recorded as it's built, so a caller
// can look up "residual at K points" for any K up to the built length
// without recomputing — that's what makes the density SLIDER O(1) per
// move: build once (on load, or whenever the underlying curve changes
// via an edit), then the slider only takes a prefix.
//
// STANDING RULE, enforced structurally here, not just by convention: the
// residual driving both point SELECTION and the reported number is
// always measured on a dense probe grid BETWEEN points, never AT them
// (PCHIP interpolates exactly at knots, so an at-knot check would always
// read ~0 regardless of how badly the curve wanders between them — this
// is exactly what hid the 72,000 mm^2 finding the first time).
export function buildAdaptiveOrder(groundTruth, vLo, vHi, opts = {}) {
  const { maxPoints = 60, probeCount = 1201, minResidual = 0.02 } = opts;
  const probe = new Array(probeCount);
  for (let i = 0; i < probeCount; i++) probe[i] = vLo + (vHi - vLo) * i / (probeCount - 1);
  const gt = probe.map(groundTruth);

  const order = [{ v: vLo, y: groundTruth(vLo) }, { v: vHi, y: groundTruth(vHi) }];
  const residualAtCount = new Map();

  function measure(pts) {
    const sorted = [...pts].sort((a, b) => a.v - b.v);
    const fit = pchipFit(sorted.map(p => p.v), sorted.map(p => p.y));
    let maxErr = 0, sumSq = 0, worstIdx = -1;
    for (let i = 0; i < probe.length; i++) {
      const err = Math.abs(fit(probe[i]) - gt[i]);
      if (err > maxErr) { maxErr = err; worstIdx = i; }
      sumSq += err * err;
    }
    return { max: maxErr, rms: Math.sqrt(sumSq / probe.length), fit, worstIdx };
  }

  let m = measure(order);
  residualAtCount.set(order.length, { max: m.max, rms: m.rms });
  while (order.length < maxPoints && m.max > minResidual) {
    const v = probe[m.worstIdx];
    if (order.some(p => Math.abs(p.v - v) < 1e-6)) break;   // degenerate: stop, don't loop forever
    order.push({ v, y: gt[m.worstIdx] });
    m = measure(order);
    residualAtCount.set(order.length, { max: m.max, rms: m.rms });
  }
  return { order, residualAtCount, probe, gt };
}

// "Solve for the minimum number of points meeting a target residual" —
// the same greedy build, just reporting where it naturally stopped.
export function minimumPointsForResidual(groundTruth, vLo, vHi, targetResidualMm, opts = {}) {
  const { order, residualAtCount } = buildAdaptiveOrder(
    groundTruth, vLo, vHi, { ...opts, minResidual: targetResidualMm });
  const count = order.length;
  return { count, points: [...order].sort((a, b) => a.v - b.v),
          residual: residualAtCount.get(count) };
}

// Named features this shell is known to have (from this project's own
// history — the waist fillet crease and the bust-bump ramp are the two
// regions dense uniform seeding was originally added FOR). Checking
// these explicitly means a density choice that loses one gets named
// ("below 14 points the waist crease is lost"), not just a bare
// aggregate residual a viewer has to interpret themselves.
export const NAMED_FEATURES = [
  { name: "waist crease", vRange: [-25, 25] },
  { name: "bust ramp", vRange: [150, 212] },
];

export function checkNamedFeatures(fit, groundTruth, thresholdMm, probeStep = 1.0) {
  return NAMED_FEATURES.map(({ name, vRange }) => {
    let maxErr = 0;
    for (let v = vRange[0]; v <= vRange[1]; v += probeStep) {
      const err = Math.abs(fit(v) - groundTruth(v));
      if (err > maxErr) maxErr = err;
    }
    return { name, vRange, maxErrorMm: maxErr, lost: maxErr > thresholdMm };
  });
}

// -- smoothing -------------------------------------------------------------
// Laplacian (neighbor-averaging) smoothing directly on the CONTROL
// POINTS' y-values — for cleaning up trace/digitization noise (e.g. a
// b_back seed with small zig-zags that aren't real shape, just noise in
// how it was authored) without hand-dragging every point. Endpoints
// held fixed so the domain boundary values never drift. `amount` in
// [0, 1] blends each point toward its neighbor average per pass;
// `passes` repeats it — same idea as a box-blur iterated.
export function smoothPoints(points, amount = 0.5, passes = 1) {
  let pts = points.map(p => ({ v: p.v, y: p.y })).sort((a, b) => a.v - b.v);
  for (let k = 0; k < passes; k++) {
    const next = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return { ...p };
      const prev = pts[i - 1], nxt = pts[i + 1];
      // distance-weighted neighbor average (uneven v-spacing after
      // adaptive placement — a plain unweighted average would bias
      // toward whichever neighbor happens to sit closer)
      const wPrev = 1 / Math.max(p.v - prev.v, 1e-6);
      const wNext = 1 / Math.max(nxt.v - p.v, 1e-6);
      const avg = (prev.y * wPrev + nxt.y * wNext) / (wPrev + wNext);
      return { v: p.v, y: p.y + amount * (avg - p.y) };
    });
    pts = next;
  }
  return pts;
}

// -- true principal curvatures (faithful port of curvature.py) -------------
// fundamental_forms_numeric/principal_curvatures, ported term for term:
// same finite-difference steps (dt=1e-3 rad, dz=0.5mm — curvature.py's
// _H), same z-stencil guard against crossing the waist crease (z=0) that
// exists whenever a bodice is set (true for every model in this family).
// Built on point() alone, exactly like the Python original (is_swept_ellipse
// is true for every model in this family, so this numeric path — not an
// analytic revolution formula — is what Python actually runs too).
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm3(a) { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }

export function principalCurvatures(pointFn, thetaRad, z, zBottom, zTop, dt = 1e-3, dz = 0.5) {
  const below = z <= 0.0;
  const zLo = below ? zBottom + dz : dz;
  const zHi = below ? -dz : zTop - dz;
  const zc = Math.max(zLo, Math.min(z, zHi));

  const X = pointFn(thetaRad, z);
  const Ptp = pointFn(thetaRad + dt, z), Ptm = pointFn(thetaRad - dt, z);
  const Xt = scale3(sub3(Ptp, Ptm), 1 / (2 * dt));
  const Xtt = scale3(add3(sub3(Ptp, scale3(X, 2)), Ptm), 1 / (dt * dt));
  const Pzcp = pointFn(thetaRad, zc + dz), Pzcm = pointFn(thetaRad, zc - dz);
  const Xzc = scale3(sub3(Pzcp, Pzcm), 1 / (2 * dz));
  const Pzc = pointFn(thetaRad, zc);
  const Xzz = scale3(add3(sub3(Pzcp, scale3(Pzc, 2)), Pzcm), 1 / (dz * dz));
  const Ptpzp = pointFn(thetaRad + dt, zc + dz), Ptmzp = pointFn(thetaRad - dt, zc + dz);
  const Ptpzm = pointFn(thetaRad + dt, zc - dz), Ptmzm = pointFn(thetaRad - dt, zc - dz);
  const Xtz = scale3(
    add3(sub3(sub3(Ptpzp, Ptmzp), Ptpzm), Ptmzm), 1 / (4 * dt * dz));

  const n = norm3(cross3(Xzc, Xt));
  const E = dot3(Xt, Xt), F = dot3(Xt, Xzc), G = dot3(Xzc, Xzc);
  const L = dot3(Xtt, n), M = dot3(Xtz, n), N = dot3(Xzz, n);
  const denom = E * G - F * F;
  const K = (L * N - M * M) / denom;
  const H = (E * N - 2 * F * M + G * L) / (2 * denom);
  const disc = Math.sqrt(Math.max(H * H - K, 0));
  return { k1: H + disc, k2: H - disc, K };
}

// Whole-shell min meridional radius, hem band separated exactly like
// shape_editor_server._full_shell_analysis (same HEM_SINGULAR_BAND_MM,
// same "outside the band" vs "inside, and is dome_n < 2 the reason"
// split) — but computed LIVE, client-side, from principalCurvatures
// above rather than a Python baked snapshot. domeN is passed in (not
// re-derived) since the compound curves architecture has no superellipse
// exponent of its own; the hem_singular label reflects the COMMITTED
// shell's skirt family, carried from the baked snapshot.
export const HEM_SINGULAR_BAND_MM = 5.0;

export function scanMinRadius(pointFn, zLo, zHi, splitThetaDeg, domeN,
                              { nTheta = 36, nZ = 48 } = {}) {
  const split = splitThetaDeg * Math.PI / 180;
  let minR = Infinity, minAt = null;
  let bandMinR = Infinity, bandMinAt = null;
  for (let j = 0; j <= nZ; j++) {
    const z = zLo + (zHi - zLo) * j / nZ;
    const nearHemZ = (z - zLo) <= HEM_SINGULAR_BAND_MM;   // hem is at z = zLo (z_bottom)
    for (let i = 0; i <= nTheta; i++) {
      const theta = -Math.PI + (2 * Math.PI) * i / nTheta;
      const { k1, k2 } = principalCurvatures(pointFn, theta, z, zLo, zHi);
      const r = 1 / Math.max(Math.abs(k1), Math.abs(k2), 1e-12);
      if (nearHemZ) {
        if (r < bandMinR) { bandMinR = r; bandMinAt = { thetaDeg: theta * 180 / Math.PI, z }; }
      } else if (r < minR) {
        minR = r; minAt = { thetaDeg: theta * 180 / Math.PI, z };
      }
    }
  }
  return {
    minRadiusMm: Number.isFinite(minR) ? minR : null, minRadiusAt: minAt,
    hemBandMinRadiusMm: Number.isFinite(bandMinR) ? bandMinR : null, hemBandMinRadiusAt: bandMinAt,
    hemSingular: domeN < 2.0, hemBandMm: HEM_SINGULAR_BAND_MM,
  };
}
