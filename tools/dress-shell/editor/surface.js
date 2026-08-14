// Pure-math port of the Python geometry/layout layer for live editing.
// The server (shell.py / layout.py) stays the source of truth: every save
// and drag-end goes through it. This port exists so dragging re-seats and
// re-derives twins continuously without a round trip.
//
// Frames and conventions mirror shell.py / coords.py / layout.py exactly:
//   theta deg (0 = CF, + = wearer's left), s mm from the waist (+ hemward),
//   pieces split at theta = +-90, twins derived at -theta, rotations 0/180.
//
// ELLIPTICAL SECTIONS, EQUAL-ARC THETA (mirrors shell.py):
//   - each level z is an ellipse a(z) x b(z); theta is EQUAL-ARC around the
//     section (theta/360 of a turn == that fraction of the section
//     perimeter), solved per point by Gauss-quadrature arc length + Newton,
//     exactly like ShellModel.param_from_arc_angle;
//   - the chart metric r_theta is therefore P(z)/2pi == r_eq(z), UNIFORM
//     around each ring (layout.py's SurfaceChart.r_theta);
//   - the meridian tangent includes the dt/dz reparameterization term
//     (the equal-arc map shifts with height), like ShellModel.frame;
//   - the waist seam band (cable bus) is a keep-out ring: footprints must
//     clear it and connector escape runs terminate at its edge.

export function wrap180(d) {
  return ((d + 180) % 360 + 360) % 360 - 180;
}

// 24-point Gauss-Legendre nodes/weights on [-1, 1] — same rule shell.py
// uses, so client and server arc lengths agree to machine precision.
const GL_X = [-0.9951872199970213, -0.9747285559713095, -0.9382745520027328, -0.8864155270044011, -0.820001985973903, -0.7401241915785544, -0.6480936519369755, -0.5454214713888396, -0.4337935076260451, -0.3150426796961634, -0.1911188674736163, -0.06405689286260563, 0.06405689286260563, 0.1911188674736163, 0.3150426796961634, 0.4337935076260451, 0.5454214713888396, 0.6480936519369755, 0.7401241915785544, 0.820001985973903, 0.8864155270044011, 0.9382745520027328, 0.9747285559713095, 0.9951872199970213];
const GL_W = [0.01234122979998869, 0.02853138862893356, 0.04427743881741941, 0.05929858491543636, 0.07334648141108016, 0.0861901615319532, 0.09761865210411393, 0.10744427011596556, 0.11550566805372552, 0.1216704729278033, 0.12583745634682825, 0.12793819534675202, 0.12793819534675202, 0.12583745634682825, 0.1216704729278033, 0.11550566805372552, 0.10744427011596556, 0.09761865210411393, 0.0861901615319532, 0.07334648141108016, 0.05929858491543636, 0.04427743881741941, 0.02853138862893356, 0.01234122979998869];

function makeInterp(xs, ys) {
  // linear interpolation over a sorted ascending xs table
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid; else hi = mid;
    }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  };
}

// arc length from CF (tau = 0) to ellipse parameter t, plus |dX/dt| at t
// (odd in t, like ShellModel._arc_and_speed)
function arcAndSpeed(t, a, b) {
  const half = 0.5 * t;
  let arc = 0;
  for (let i = 0; i < 24; i++) {
    const tau = half * (GL_X[i] + 1);
    arc += GL_W[i] * Math.hypot(a * Math.cos(tau), b * Math.sin(tau));
  }
  return { arc: half * arc, speed: Math.hypot(a * Math.cos(t), b * Math.sin(t)) };
}

// d(arc)/dz at FIXED ellipse parameter t (ShellModel._arc_z_partial)
function arcZPartial(t, a, b, da, db) {
  const half = 0.5 * t;
  let acc = 0;
  for (let i = 0; i < 24; i++) {
    const tau = half * (GL_X[i] + 1);
    const c2 = Math.cos(tau) ** 2, s2 = Math.sin(tau) ** 2;
    acc += GL_W[i] * (a * da * c2 + b * db * s2)
         / Math.sqrt(a * a * c2 + b * b * s2);
  }
  return half * acc;
}

export class Surface {
  constructor(profile, bounds) {
    this.sMin = bounds.s_min;
    this.sMax = bounds.s_max;
    this.zBottom = bounds.z_bottom;
    this.zTop = bounds.z_top;
    this.band = bounds.band_halfwidth || 0;
    this.a = makeInterp(profile.z, profile.a);
    this.b = makeInterp(profile.z, profile.b);
    this.da = makeInterp(profile.z, profile.da);
    this.db = makeInterp(profile.z, profile.db);
    this.req = makeInterp(profile.z, profile.req);    // r_eq = P/2pi
    this.dreq = makeInterp(profile.z, profile.dreq);  // dr_eq/dz
    // s decreases as z increases: build the inverse on reversed arrays
    const sRev = [...profile.s].reverse();
    const zRev = [...profile.z].reverse();
    this.zOfS = makeInterp(sRev, zRev);
    this.sOfZ = makeInterp(profile.z, profile.s);
  }

  // equal-arc ellipse parameter t for theta (radians); Newton like
  // ShellModel.param_from_arc_angle (target arc = theta * r_eq)
  paramFromArcAngle(thetaRad, a, b, req) {
    let t = thetaRad;
    for (let k = 0; k < 7; k++) {
      const { arc, speed } = arcAndSpeed(t, a, b);
      t -= (arc - thetaRad * req) / speed;
    }
    return t;
  }

  // chart metric: mm of section arc per RADIAN of theta. Equal-arc makes
  // this P(z)/2pi — uniform around the ring (SurfaceChart.r_theta).
  rTheta(thetaDeg, s) {
    const z = this.zOfS(Math.min(Math.max(s, this.sMin), this.sMax));
    return this.req(z);
  }

  forward(thetaDeg, s) {
    const z = this.zOfS(s);
    const thetaRad = thetaDeg * Math.PI / 180;
    const a = this.a(z), b = this.b(z), da = this.da(z), db = this.db(z);
    const req = this.req(z), dreq = this.dreq(z);
    const t = this.paramFromArcAngle(thetaRad, a, b, req);
    const sin = Math.sin(t), cos = Math.cos(t);
    const pos = [a * sin, b * cos, z];
    // dt/dz: the equal-arc map shifts with height (ShellModel.frame);
    // d(target)/dz = theta * dr_eq, minus d(arc)/dz at fixed t, over speed
    const speed = Math.hypot(a * cos, b * sin);
    const tz = (thetaRad * dreq - arcZPartial(t, a, b, da, db)) / speed;
    const pt = [a * cos, -b * sin, 0];
    const pz = [da * sin + a * cos * tz, db * cos - b * sin * tz, 1];
    let n = [pz[1] * pt[2] - pz[2] * pt[1],
             pz[2] * pt[0] - pz[0] * pt[2],
             pz[0] * pt[1] - pz[1] * pt[0]];
    const nl = Math.hypot(...n); n = n.map(v => v / nl);
    const ptl = Math.hypot(...pt);
    const pzl = Math.hypot(...pz);
    return {
      pos, normal: n,
      eTheta: pt.map(v => v / ptl),
      eS: pz.map(v => -v / pzl),
    };
  }

  inverse(p) {
    const z = Math.min(Math.max(p[2], this.zBottom), this.zTop);
    const a = this.a(z), b = this.b(z);
    // equal-arc inverse (ShellModel.arc_angle_from_point)
    const t = Math.atan2(p[0] / a, p[1] / b);
    const { arc } = arcAndSpeed(t, a, b);
    return { theta: (arc / this.req(z)) * 180 / Math.PI, s: this.sOfZ(z) };
  }

  offsetPoint(theta, s, dxMm, dyMm) {
    const s2 = s + dyMm;
    const r = this.rTheta(theta, s2);
    return { theta: theta + (dxMm / r) * 180 / Math.PI, s: s2 };
  }
}

// -- class helpers ----------------------------------------------------------

export function activeCenter(cls) {
  return [cls.active_offset[0] + cls.active[0] / 2,
          cls.active_offset[1] + cls.active[1] / 2];
}

export function frameOffset(cls, rotation, p) {
  const ac = activeCenter(cls);
  let dx = p[0] - ac[0], dy = p[1] - ac[1];
  if (rotation === 180) { dx = -dx; dy = -dy; }
  return [dx, dy];
}

export function pieceOf(theta) {
  const lam = wrap180(theta);
  return Math.abs(lam) < 90 ? { name: "FRONT", center: 0 } : { name: "BACK", center: 180 };
}

const localAngle = (theta, center) => wrap180(theta - center);

// -- legality (mirrors layout.py) -------------------------------------------

export function connectorGeometry(surf, cls, theta, s, rotation) {
  const [dx, dy] = frameOffset(cls, rotation, cls.connector.origin);
  const c = surf.offsetPoint(theta, s, dx, dy);
  let [ex, ey] = cls.connector.exit;
  if (rotation === 180) { ex = -ex; ey = -ey; }
  const e = surf.offsetPoint(c.theta, c.s, ex * cls.connector.escape_mm,
                             ey * cls.connector.escape_mm);
  // the waist seam band is the cable bus: a run heading into the band
  // TERMINATES at the band edge (layout.py connector_geometry)
  const band = surf.band;
  if (band > 0 && Math.abs(c.s) > band && Math.abs(e.s) < Math.abs(c.s)) {
    const edge = c.s > 0 ? band : -band;
    if ((c.s - edge) * (e.s - edge) < 0) {
      const t = (c.s - edge) / (c.s - e.s);
      e.theta = c.theta + t * (e.theta - c.theta);
      e.s = edge;
    }
  }
  return { origin: c, end: e };
}

export function tailRunMm(surf, cls, theta, s, rotation) {
  const { origin } = connectorGeometry(surf, cls, theta, s, rotation);
  return Math.max(0, Math.abs(origin.s) - surf.band);
}

export function connectorProblems(surf, cls, theta, s, rotation) {
  const { center, name } = pieceOf(theta);
  const { origin, end } = connectorGeometry(surf, cls, theta, s, rotation);
  const out = [];
  for (const [tag, pt] of [["connector origin", origin], ["connector escape end", end]]) {
    if (pt.s < surf.sMin - 1e-9) out.push(`${tag} runs off the top edge`);
    if (pt.s > surf.sMax + 1e-9) out.push(`${tag} runs off the hem edge`);
    if (Math.abs(localAngle(pt.theta, center)) >= 90 - 1e-9)
      out.push(`${tag} crosses the ${name} piece seam`);
  }
  return out;
}

export function outlineProblems(surf, cls, theta, s, rotation) {
  const { center, name } = pieceOf(theta);
  const [W, H] = cls.outline;
  const out = [];
  const sVals = [];
  for (const corner of [[0, 0], [W, 0], [W, H], [0, H]]) {
    const [dx, dy] = frameOffset(cls, rotation, corner);
    const pt = surf.offsetPoint(theta, s, dx, dy);
    sVals.push(pt.s);
    if (pt.s < surf.sMin - 1e-9 || pt.s > surf.sMax + 1e-9)
      out.push("outline corner off the shell (top/hem edge)");
    if (Math.abs(localAngle(pt.theta, center)) >= 90 - 1e-9)
      out.push(`outline crosses the ${name} piece seam`);
  }
  // waist seam band keep-out (layout.py outline_problems)
  const band = surf.band;
  if (band > 0 && Math.min(...sVals) < band - 1e-9
      && Math.max(...sVals) > -band + 1e-9)
    out.push(`footprint intersects the waist seam band (keep-out ±${band} mm)`);
  return out;
}

export function poseProblems(surf, cls, theta, s, rotation) {
  return [...outlineProblems(surf, cls, theta, s, rotation),
          ...connectorProblems(surf, cls, theta, s, rotation)];
}

// -- mirroring (mirrors derive_twin exactly) --------------------------------

export function outlineAsymmetry(cls, sourceRot, twinRot) {
  const ac = activeCenter(cls);
  const ex = ac[0] - cls.outline[0] / 2;
  const ey = ac[1] - cls.outline[1] / 2;
  return twinRot === sourceRot ? 2 * Math.abs(ex) : 2 * Math.abs(ey);
}

export function deriveTwin(surf, classes, src) {
  const cls = classes[src.class];
  const twinTheta = -src.theta;
  const other = src.rotation === 0 ? 180 : 0;
  const candidates = [], tried = [];
  for (const rot of [src.rotation, other]) {
    const probs = poseProblems(surf, cls, twinTheta, src.s, rot);
    if (probs.length) tried.push([rot, probs]); else candidates.push(rot);
  }
  const make = (rot, valid, problems) => ({
    id: `${src.id}~twin`, class: src.class, theta: twinTheta, s: src.s,
    rotation: rot, content_rotation: rot, layer: src.layer,
    is_twin: true, source_id: src.id, valid, problems,
    asymmetry_mm: outlineAsymmetry(cls, src.rotation, rot),
  });
  if (candidates.length) {
    let best = candidates[0];
    for (const r of candidates)
      if (outlineAsymmetry(cls, src.rotation, r) < outlineAsymmetry(cls, src.rotation, best))
        best = r;
    return make(best, true, []);
  }
  const reasons = ["INVALID twin: no legal transform",
                   ...tried.flatMap(([r, ps]) => ps.map(p => `rotation ${r}: ${p}`))];
  return make(src.rotation, false, reasons);
}

export function resolveAll(surf, classes, authored) {
  const placed = [];
  for (const src of authored) {
    const cls = classes[src.class];
    const probs = poseProblems(surf, cls, src.theta, src.s, src.rotation);
    placed.push({
      id: src.id, class: src.class, theta: src.theta, s: src.s,
      rotation: src.rotation, content_rotation: src.rotation,
      layer: src.layer, is_twin: false, source_id: src.id,
      valid: probs.length === 0, problems: probs,
    });
    if (src.mirrored) placed.push(deriveTwin(surf, classes, src));
  }
  return placed;
}

// -- standoff (same sampling as curvature.seat_standoff) --------------------

export function seatStandoff(surf, cls, theta, s, n = 7) {
  const [W, H] = cls.outline;
  const f = surf.forward(theta, s);
  const r = surf.rTheta(theta, s);
  const { center } = pieceOf(theta);
  let maxD = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i / (n - 1) - 0.5) * W;
      const v = (j / (n - 1) - 0.5) * H;
      const sp = s + v;
      if (sp < surf.sMin - 1e-9 || sp > surf.sMax + 1e-9) return Infinity;
      const tp = theta + (u / r) * 180 / Math.PI;
      if (Math.abs(localAngle(tp, center)) >= 90) return Infinity;
      const q = surf.forward(tp, sp).pos;
      const d = (q[0] - f.pos[0]) * f.normal[0] + (q[1] - f.pos[1]) * f.normal[1]
              + (q[2] - f.pos[2]) * f.normal[2];
      maxD = Math.max(maxD, Math.abs(d));
    }
  }
  return maxD;
}

// -- layering (mirrors layering.py) -----------------------------------------

export function outlineRect(surf, classes, p) {
  const cls = classes[p.class];
  const [dx, dy] = frameOffset(cls, p.rotation, [cls.outline[0] / 2, cls.outline[1] / 2]);
  const r = surf.rTheta(p.theta, p.s);
  const mmPerDeg = Math.PI * r / 180;
  const tc = p.theta + dx / mmPerDeg, sc = p.s + dy;
  const ht = 0.5 * cls.outline[0] / mmPerDeg;
  return { t0: tc - ht, t1: tc + ht, s0: sc - cls.outline[1] / 2,
           s1: sc + cls.outline[1] / 2 };
}

const rectsOverlap = (a, b) =>
  a.t0 < b.t1 && b.t0 < a.t1 && a.s0 < b.s1 && b.s0 < a.s1;
const rectContains = (r, t, s) =>
  t >= r.t0 && t <= r.t1 && s >= r.s0 && s <= r.s1;

export function analyzeLayering(surf, classes, placed, nOcc = 16) {
  const panels = placed.filter(p => p.valid);
  const rects = Object.fromEntries(panels.map(p => [p.id, outlineRect(surf, classes, p)]));
  const overlaps = [], conflicts = [];
  for (let i = 0; i < panels.length; i++) {
    for (let j = i + 1; j < panels.length; j++) {
      const p = panels[i], q = panels[j];
      if (!rectsOverlap(rects[p.id], rects[q.id])) continue;
      if (p.layer === q.layer) conflicts.push([p.id, q.id, p.layer]);
      else overlaps.push(p.layer < q.layer ? [p.id, q.id] : [q.id, p.id]);
    }
  }
  const mount = {}, stackTop = {};
  const order = [...panels].sort((a, b) => a.layer - b.layer || a.id.localeCompare(b.id));
  for (const p of order) {
    let base = 0;
    for (const [inner, outer] of overlaps)
      if (outer === p.id) base = Math.max(base, stackTop[inner]);
    mount[p.id] = base;
    stackTop[p.id] = base + classes[p.class].thickness;
  }
  const visiblePct = {}, visibleArea = {};
  let totalActive = 0, totalVisible = 0;
  for (const p of panels) {
    const cls = classes[p.class];
    const r = surf.rTheta(p.theta, p.s);
    const mmPerDeg = Math.PI * r / 180;
    const ht = 0.5 * cls.active[0] / mmPerDeg;
    const ar = { t0: p.theta - ht, t1: p.theta + ht,
                 s0: p.s - cls.active[1] / 2, s1: p.s + cls.active[1] / 2 };
    const outers = overlaps.filter(([a]) => a === p.id).map(([, b]) => rects[b]);
    let covered = 0;
    for (let i = 0; i < nOcc; i++) {
      for (let j = 0; j < nOcc; j++) {
        const t = ar.t0 + (ar.t1 - ar.t0) * i / (nOcc - 1);
        const s = ar.s0 + (ar.s1 - ar.s0) * j / (nOcc - 1);
        if (outers.some(o => rectContains(o, t, s))) covered++;
      }
    }
    const frac = 1 - covered / (nOcc * nOcc);
    const area = cls.active[0] * cls.active[1];
    visiblePct[p.id] = 100 * frac;
    visibleArea[p.id] = area * frac;
    totalActive += area;
    totalVisible += area * frac;
  }
  const buried = {};
  for (const p of panels) {
    const cls = classes[p.class];
    const { origin, end } = connectorGeometry(surf, cls, p.theta, p.s, p.rotation);
    const pts = [];
    for (let k = 0; k <= 8; k++)
      pts.push([origin.theta + (end.theta - origin.theta) * k / 8,
                origin.s + (end.s - origin.s) * k / 8]);
    const coverers = panels.filter(q =>
      q.id !== p.id && q.layer > p.layer
      && pts.some(([t, s]) => rectContains(rects[q.id], t, s))).map(q => q.id);
    if (coverers.length) buried[p.id] = coverers;
  }
  const maxStack = Math.max(0, ...Object.values(stackTop));
  return { overlaps, conflicts, mount, stackTop, maxStack,
           visiblePct, visibleArea, totalActive, totalVisible, buried };
}

export function uncoveredPct(surf, classes, placed, nT = 240, nS = 60) {
  const panels = placed.filter(p => p.valid);
  const rects = panels.map(p => outlineRect(surf, classes, p));
  let total = 0, unc = 0;
  for (let j = 0; j < nS; j++) {
    const s = surf.sMin + (surf.sMax - surf.sMin) * (j + 0.5) / nS;
    for (let i = 0; i < nT; i++) {
      const t = -180 + 360 * (i + 0.5) / nT;
      const w = surf.rTheta(t, s);
      total += w;
      if (!rects.some(r => rectContains(r, t, s))) unc += w;
    }
  }
  return 100 * unc / total;
}


// -- flat facets (mirrors facets.py) ----------------------------------------

export function applyFacets(surf, classes, placed, basePositions, thetaS,
                            blendMm = 15) {
  const out = Float32Array.from(basePositions);
  const facets = placed.filter(p => p.valid && classes[p.class].requires_facet);
  for (const p of facets) {
    const cls = classes[p.class];
    const f = surf.forward(p.theta, p.s);
    const n = f.normal;
    const [dxo, dyo] = frameOffset(cls, p.rotation,
                                   [cls.outline[0] / 2, cls.outline[1] / 2]);
    const mmPerDeg = Math.PI * surf.rTheta(p.theta, p.s) / 180;
    const tc = p.theta + dxo / mmPerDeg, sc = p.s + dyo;
    const hw = cls.outline[0] / 2, hh = cls.outline[1] / 2;
    const count = thetaS.length / 2;
    for (let i = 0; i < count; i++) {
      const dt = Math.abs(wrap180(thetaS[2 * i] - tc)) * mmPerDeg;
      const ds = Math.abs(thetaS[2 * i + 1] - sc);
      const outd = Math.hypot(Math.max(dt - hw, 0), Math.max(ds - hh, 0));
      if (outd >= blendMm) continue;
      let t = outd / blendMm;
      t = 1 - (t * t * (3 - 2 * t));   // 1 inside, smooth to 0 at blend edge
      const px = out[3 * i] - f.pos[0], py = out[3 * i + 1] - f.pos[1],
            pz = out[3 * i + 2] - f.pos[2];
      const d = t * (px * n[0] + py * n[1] + pz * n[2]);
      out[3 * i] -= d * n[0];
      out[3 * i + 1] -= d * n[1];
      out[3 * i + 2] -= d * n[2];
    }
  }
  return { positions: out, hasFacets: facets.length > 0 };
}
