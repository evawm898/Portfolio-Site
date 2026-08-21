// Deployed copy of tools/dress-shell/shape-editor/geom.js — served as
// part of the static site (this route, /shape-editor.html, is the ONLY
// way to reach the shape editor; there is no reachable Python backend
// for a Netlify deploy preview or the built site). Keep the two files in
// sync by hand; this one is the one that ships.
//
// On THIS page, the math here is not a "coarse preview" ahead of an
// authoritative server pass — there is no server pass. This IS the
// geometry: cross-validated against shell.py's ShellModel.point() /
// compound.CompoundShellModel.point() directly (120 (theta, z) probes
// spanning the full domain and both an identical and a diverged
// b_front/b_back case) down to ~1e-13mm, floating-point noise. That
// check caught a real bug before it shipped here: the target arc length
// used Ram(a,b_front) + Ram(a,b_back) (double the true section
// perimeter) instead of compound_perimeter's MEAN — a max 352mm position
// error before the fix. The local dev server's copy had the same bug
// (this file started as a copy of it); this is a shared fix, not a
// static-page-only patch — the local copy has it too.
//
// mesh resolution (buildMeshes' defaults) is higher here than the local
// tool's original "coarse, drag-preview" tuning, since this is the only
// tier a viewer of this page ever sees.

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
  buildMeshes(nTheta = 48, nZ = 64) {
    const meshes = {};
    const half = nTheta / 2;
    for (const [name, t0, t1] of [
      ["FRONT", -this.splitTheta, this.splitTheta],
      ["BACK", this.splitTheta, 2 * Math.PI - this.splitTheta]]) {
      const pos = [];
      for (let j = 0; j <= nZ; j++) {
        const z = this.zLo + (this.zHi - this.zLo) * j / nZ;
        for (let i = 0; i <= half; i++) {
          const th = t0 + (t1 - t0) * i / half;
          const p = this.point(th, z);
          pos.push(p[0], p[1], p[2]);
        }
      }
      const cols = half + 1;
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
