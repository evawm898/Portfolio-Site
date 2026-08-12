// Bodice front-surface geometry: a measurement-driven lofted approximation
// with a per-node principal-curvature field.
//
// Coordinates (mm):
//   x  lateral, 0 at center front, +x = wearer's LEFT
//   y  vertical, 0 at the waistline, + up
//   z  outward from the body core (front of body is +z)
//
// The surface is the FRONT HALF of the torso: horizontal cross-sections are
// half-ellipses (side seam to side seam), lofted from waist to neckline, with
// two bust prominences added along the local cross-section normal. This is a
// curvature-field model, not a couture block — the point is where the surface
// is flat, single-curved, or doubly curved, and by how much.

export const DEFAULT_MEASUREMENTS = {
  bustCircumference: 940,
  underbustCircumference: 800,
  waistCircumference: 720,
  centerFrontLength: 360, // neckline to waist
  apexHeight: 250,        // bust apex above waist
  apexSeparation: 190,    // apex-to-apex distance
};

// Model assumptions (documented, not measured):
const TORSO_ASPECT = 1.35;   // cross-section width : depth
const UNDERBUST_DROP = 70;   // underbust line sits this far below the apex
const RIB_AT_APEX_GAIN = 15; // base ribcage girth gain from underbust up to apex level
const UPPER_CHEST_GAIN = 42; // base girth gain from underbust up to the neckline edge
const BUMP_SIGMA_S = 55;     // bust prominence spread along the cross-section arc (mm)
const BUMP_SIGMA_H = 45;     // bust prominence vertical spread (mm)

// Ramanujan ellipse perimeter.
function ellipsePerimeter(a, b) {
  const h = ((a - b) / (a + b)) ** 2;
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}
const UNIT_PERIMETER = ellipsePerimeter(TORSO_ASPECT, 1);

// Fritsch–Carlson monotone cubic through (xs, ys); clamped outside the range.
export function monotoneCubic(xs, ys) {
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const hSeg = xs[i + 1] - xs[i], t = (x - xs[i]) / hSeg;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hSeg * m[i]
         + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hSeg * m[i + 1];
  };
}

// Convex hull (Andrew monotone chain) of 2D points; returns hull perimeter.
function hullPerimeter(pts) {
  const p = [...pts].sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let per = 0;
  for (let i = 0; i < hull.length; i++) {
    const q = hull[(i + 1) % hull.length];
    per += Math.hypot(q[0] - hull[i][0], q[1] - hull[i][1]);
  }
  return per;
}

export function buildBodiceModel(meas = DEFAULT_MEASUREMENTS, opts = {}) {
  const m = { ...DEFAULT_MEASUREMENTS, ...meas };
  const nu = opts.nu ?? 141; // across the front, theta in [-pi/2, +pi/2]
  const nv = opts.nv ?? 101; // waist (0) to neckline edge (centerFrontLength)

  const hUnderbust = m.apexHeight - UNDERBUST_DROP;
  // Base (bust-less) torso girth profile. The bust prominence leaks girth
  // down to the underbust line, so the base profile is corrected iteratively
  // below until the TAPE girths (with prominence) match the measurements.
  let corrUnderbust = 0;
  // The prominence displaces the apex point outward ALONG THE SECTION NORMAL,
  // which shifts its x as well; apexShiftX is solved so the displaced apex
  // lands at x = +/- apexSeparation/2.
  let apexShiftX = 0;
  let section, thetaApex, arcScale;
  const rebuildSections = () => {
    const baseGirth = monotoneCubic(
      [0, hUnderbust, m.apexHeight, m.centerFrontLength],
      [m.waistCircumference,
       m.underbustCircumference + corrUnderbust,
       m.underbustCircumference + RIB_AT_APEX_GAIN + corrUnderbust,
       m.underbustCircumference + UPPER_CHEST_GAIN],
    );
    section = (h) => {
      const b = baseGirth(h) / UNIT_PERIMETER;
      return { a: TORSO_ASPECT * b, b };
    };
    // Apex meridian angle, fixed from the apex-height section.
    const secA = section(m.apexHeight);
    const xBase = Math.max(10, m.apexSeparation / 2 - apexShiftX);
    thetaApex = Math.asin(Math.min(0.95, xBase / secA.a));
    // Arc-length scale near the apex meridian (for a mm-true gaussian).
    arcScale = Math.hypot(secA.a * Math.cos(thetaApex), secA.b * Math.sin(thetaApex));
  };
  rebuildSections();

  const bump = (theta, h, A) => {
    const dh2 = ((h - m.apexHeight) / BUMP_SIGMA_H) ** 2;
    const dsL = ((theta - thetaApex) * arcScale / BUMP_SIGMA_S) ** 2;
    const dsR = ((theta + thetaApex) * arcScale / BUMP_SIGMA_S) ** 2;
    return A * (Math.exp(-0.5 * (dsL + dh2)) + Math.exp(-0.5 * (dsR + dh2)));
  };

  // Cross-section point + outward normal at (theta, h) for prominence A.
  const sectionPoint = (theta, h, A) => {
    const { a, b } = section(h);
    const sx = a * Math.sin(theta), sz = b * Math.cos(theta);
    const nl = Math.hypot(b * Math.sin(theta), a * Math.cos(theta));
    const nx = (b * Math.sin(theta)) / nl, nz = (a * Math.cos(theta)) / nl;
    const d = bump(theta, h, A);
    return [sx + d * nx, sz + d * nz];
  };

  // Tape girth of the full cross-section at height h: front half bumped,
  // back half the base ellipse; the tape bridges hollows => convex hull.
  const tapeGirth = (h, A) => {
    const pts = [];
    const N = 256;
    for (let i = 0; i < N; i++) {
      const t = -Math.PI + (2 * Math.PI * i) / N; // full loop
      if (t >= -Math.PI / 2 && t <= Math.PI / 2) {
        pts.push(sectionPoint(t, h, A));
      } else {
        const { a, b } = section(h);
        pts.push([a * Math.sin(t), b * Math.cos(t)]);
      }
    }
    return hullPerimeter(pts);
  };

  // Solve the bust prominence A so the tape girth at apex height matches
  // the bust circumference.
  let A = 0, solveNote = '';
  const solveA = () => {
    const target = m.bustCircumference;
    let lo = 0, hi = 180;
    const f = (x) => tapeGirth(m.apexHeight, x) - target;
    if (f(0) >= 0) {
      A = 0;
      solveNote = 'bust <= base chest girth; no prominence added';
    } else if (f(hi) < 0) {
      A = hi;
      solveNote = `WARNING: prominence clamped at ${hi} mm; bust girth not reached`;
    } else {
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid; else hi = mid;
      }
      A = (lo + hi) / 2;
    }
  };
  // Alternate: solve A against bust, then (a) pull the base underbust control
  // down by however much the prominence inflated the underbust tape girth and
  // (b) update the normal-displacement x-shift of the apex.
  for (let round = 0; round < 8; round++) {
    solveA();
    const ubErr = tapeGirth(hUnderbust, A) - m.underbustCircumference;
    const { a, b } = section(m.apexHeight);
    const nx = (b * Math.sin(thetaApex)) / Math.hypot(b * Math.sin(thetaApex), a * Math.cos(thetaApex));
    const shiftErr = (Math.abs(a * Math.sin(thetaApex) + A * nx) - m.apexSeparation / 2);
    if (Math.abs(ubErr) < 0.5 && Math.abs(shiftErr) < 0.5) break;
    corrUnderbust -= ubErr;
    apexShiftX += shiftErr;
    rebuildSections();
  }

  // Sample the front surface grid. P[j][i], i over theta, j over height.
  const du = Math.PI / (nu - 1);
  const dv = m.centerFrontLength / (nv - 1);
  const P = [];
  for (let j = 0; j < nv; j++) {
    const h = j * dv;
    const row = [];
    for (let i = 0; i < nu; i++) {
      const theta = -Math.PI / 2 + i * du;
      const [x, z] = sectionPoint(theta, h, A);
      row.push([x, h, z]);
    }
    P.push(row);
  }

  const girthCheck = {
    waist: { model: tapeGirth(0, A), target: m.waistCircumference },
    underbust: { model: tapeGirth(hUnderbust, A), target: m.underbustCircumference },
    bust: { model: tapeGirth(m.apexHeight, A), target: m.bustCircumference },
  };

  return {
    measurements: m, nu, nv, du, dv, P,
    apex: { height: m.apexHeight, halfSeparation: m.apexSeparation / 2, prominence: A },
    hUnderbust, girthCheck, solveNote, baseCorrection: corrUnderbust,
    curvature: curvatureField(P, nu, nv, du, dv),
  };
}

// Principal curvature field over a parametric grid via finite differences
// and the first/second fundamental forms. Returns per-node arrays (row-major
// j*nu+i): k1, k2 (|k1| >= |k2|), K (Gaussian), R = 1/max|k|, and the area
// weight of each node's cell patch.
export function curvatureField(P, nu, nv, du, dv) {
  const n = nu * nv;
  const k1 = new Float64Array(n), k2 = new Float64Array(n);
  const K = new Float64Array(n), R = new Float64Array(n);
  const areaW = new Float64Array(n);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crossV = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  for (let j = 1; j < nv - 1; j++) {
    for (let i = 1; i < nu - 1; i++) {
      const c = P[j][i];
      const Su = scale(sub(P[j][i + 1], P[j][i - 1]), 1 / (2 * du));
      const Sv = scale(sub(P[j + 1][i], P[j - 1][i]), 1 / (2 * dv));
      const Suu = scale(sub(sub(P[j][i + 1], scale(c, 2)), scale(P[j][i - 1], -1)), 1 / (du * du));
      const Svv = scale(sub(sub(P[j + 1][i], scale(c, 2)), scale(P[j - 1][i], -1)), 1 / (dv * dv));
      const Suv = scale(
        sub(sub(P[j + 1][i + 1], P[j + 1][i - 1]), sub(P[j - 1][i + 1], P[j - 1][i - 1])),
        1 / (4 * du * dv),
      );
      const E = dot(Su, Su), F = dot(Su, Sv), G = dot(Sv, Sv);
      const nvec = crossV(Su, Sv);
      const nl = Math.hypot(nvec[0], nvec[1], nvec[2]);
      const un = scale(nvec, 1 / nl);
      const L = dot(Suu, un), M = dot(Suv, un), N = dot(Svv, un);
      const denom = E * G - F * F;
      const gK = (L * N - M * M) / denom;
      const H = (E * N + G * L - 2 * F * M) / (2 * denom);
      const disc = Math.sqrt(Math.max(0, H * H - gK));
      let ka = H + disc, kb = H - disc;
      if (Math.abs(kb) > Math.abs(ka)) [ka, kb] = [kb, ka];
      const idx = j * nu + i;
      k1[idx] = ka; k2[idx] = kb; K[idx] = gK;
      const kmax = Math.abs(ka);
      R[idx] = kmax > 1e-9 ? 1 / kmax : Infinity;
      areaW[idx] = nl * du * dv;
    }
  }
  // Edges copy the nearest interior node.
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const jj = Math.min(Math.max(j, 1), nv - 2);
      const ii = Math.min(Math.max(i, 1), nu - 2);
      if (jj === j && ii === i) continue;
      const s = jj * nu + ii, d = j * nu + i;
      k1[d] = k1[s]; k2[d] = k2[s]; K[d] = K[s]; R[d] = R[s]; areaW[d] = areaW[s];
    }
  }
  return { k1, k2, K, R, areaW };
}

// Sanity check of the curvature operator on analytic surfaces.
export function selfTest() {
  const lines = [];
  const approx = (x, y, tolPct) => Math.abs(x - y) <= Math.abs(y) * tolPct;

  // Cylinder r=100: k = { -1/100 (or 1/100), 0 }.
  {
    const r = 100, nu = 61, nv = 41, du = Math.PI / (nu - 1), dv = 200 / (nv - 1);
    const P = [];
    for (let j = 0; j < nv; j++) {
      const row = [];
      for (let i = 0; i < nu; i++) {
        const t = i * du;
        row.push([r * Math.cos(t), j * dv, r * Math.sin(t)]);
      }
      P.push(row);
    }
    const f = curvatureField(P, nu, nv, du, dv);
    const c = (Math.floor(nv / 2)) * nu + Math.floor(nu / 2);
    const ok = approx(Math.abs(f.k1[c]), 1 / r, 0.01) && Math.abs(f.k2[c]) < 1e-6;
    lines.push(`cylinder r=${r}: |k1|=${Math.abs(f.k1[c]).toFixed(6)} (expect 0.010000), |k2|=${Math.abs(f.k2[c]).toExponential(2)} (expect ~0) ${ok ? 'PASS' : 'FAIL'}`);
  }
  // Sphere r=100: k1 = k2 = 1/100.
  {
    const r = 100, nu = 61, nv = 61;
    const du = Math.PI / (nu - 1), dv = (Math.PI - 0.6) / (nv - 1);
    const P = [];
    for (let j = 0; j < nv; j++) {
      const phi = 0.3 + j * dv;
      const row = [];
      for (let i = 0; i < nu; i++) {
        const t = i * du;
        row.push([r * Math.sin(phi) * Math.cos(t), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(t)]);
      }
      P.push(row);
    }
    const f = curvatureField(P, nu, nv, du, dv);
    const c = (Math.floor(nv / 2)) * nu + Math.floor(nu / 2);
    const ok = approx(Math.abs(f.k1[c]), 1 / r, 0.01) && approx(Math.abs(f.k2[c]), 1 / r, 0.01);
    lines.push(`sphere   r=${r}: |k1|=${Math.abs(f.k1[c]).toFixed(6)}, |k2|=${Math.abs(f.k2[c]).toFixed(6)} (expect 0.010000) ${ok ? 'PASS' : 'FAIL'}`);
  }
  return { lines, pass: lines.every((l) => l.endsWith('PASS')) };
}
