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

function linInterp(xs, ys) {
  const n = xs.length;
  return (x) => {
    x = Math.max(xs[0], Math.min(xs[n - 1], x));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  };
}

// Ramanujan II — same formula as bodice.ellipse_perimeter / _perimeter_np
function ellipsePerimeter(a, b) {
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

function paramFromArcAngle(thetaRad, a, b, req) {
  let t = thetaRad;
  for (let k = 0; k < 7; k++) {
    const { arc, speed } = arcAndSpeed(t, a, b);
    t -= (arc - thetaRad * req) / speed;
  }
  return t;
}

// A coarse ShellModel-equivalent, built directly from an edited a(v)
// fit + the frozen committed b(z) table. Mirrors shell.py's
// ShellModel.point() (equal-arc elliptical sections) — mesh triangulation
// only, no frame()/curvature (that stays server-side, out of scope for
// this slice's one readout).
export class CoarseShell {
  constructor(aFit, bTable, splitThetaDeg) {
    this.aFit = aFit;
    this.bOf = linInterp(bTable.z, bTable.b);
    this.zLo = bTable.z[0];
    this.zHi = bTable.z[bTable.z.length - 1];
    this.splitTheta = splitThetaDeg * Math.PI / 180;
  }

  point(thetaRad, z) {
    const a = this.aFit(z), b = this.bOf(z);
    const req = ellipsePerimeter(a, b) / (2 * Math.PI);
    const t = paramFromArcAngle(thetaRad, a, b, req);
    return [a * Math.sin(t), b * Math.cos(t), z];
  }

  // FRONT/BACK triangulated meshes, coarse resolution (n_theta cols,
  // n_z rows) — enough to see the shape change live, not the export mesh.
  buildMeshes(nTheta = 20, nZ = 36) {
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
