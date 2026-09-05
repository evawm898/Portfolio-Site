// print-stem.js — axial (curve) deformation of the stem mesh.
//
// THE DEFORMATION APPROACH IS THE RULING, NOT A PROPOSAL (Eva, Sep 5). The
// position-stage brief scoped the simple re-loft and asked for the trade-off
// to be named; the measurement below reversed that scope, and Eva ruled to
// KEEP the deformation. Do not "simplify" this back into a swept tube — that
// is not a smaller version of this file, it is the object-losing behaviour
// this one exists to avoid. Replacing it is a new ruling, not a refactor.
//
// WHY NOT A RE-LOFT. The obvious way to make a stem bend is to sweep a fresh
// tube along the new curve. Measured on this bundle, that is not a lossy
// version of the goal — it is a different object: 12,060 of the stem's 14,472
// vertices (83%) belong to THREE LEAVES, at s 0.14-0.21, 0.53-0.59 and
// 0.89-0.95, each reaching ~12 units from an axis whose core radius is only
// 0.55-1.20. A plain stem ring is 72 vertices; a leaf slab is up to 2,232.
// A swept tube reproduces the 17% and deletes the rest, at ZERO bend.
//
// So nothing is rebuilt here. Every original vertex is kept and MOVED. Each one
// is bound once to a material coordinate s along the stem (from its original y)
// plus a rigid offset in the rest curve's local frame; posing re-evaluates the
// frame on the new curve and writes the offset back. Leaves ride their local
// frame, so they travel and rotate with the bend instead of vanishing.
//
// WHAT THIS IS NOT. It is not weighted skinning. A leaf is carried rigidly by
// the single frame at its own s, so a bend whose radius approaches the leaf's
// ~12-unit reach will shear that leaf rather than bending it smoothly along
// its length. Real skinning would blend several frames per vertex with
// falloff weights. That is a bigger job and is deliberately not this session's.
//
// The rest pose is exact TO THE PRECISION OF THE BUFFER: bind and pose run the
// same sampling code, so any discretization error cancels and the only residual
// left is the float32 round-trip of writing a double back into the position
// attribute. Measured on this bundle: 7.63e-6 absolute, which is 0.39 of a ULP
// at the model's own scale (164) — so the assertion is "<= 1 float32 ULP", not
// "== 0", and `restResidualUlps()` reports it in those units. Stating it as 0
// would have been wrong, and a tolerance loose enough to hide a real error is
// the thing this guard exists to avoid. Same intent as the bloom's
// `domeIsFlat()`.

import * as THREE from 'three';

const SAMPLES = 240;      // frame series resolution along the curve
const SLABS = 64;         // y-bins used to find the original axis

// Seed the frame from a FIXED world reference rather than an arbitrary
// perpendicular, so the rest series and any posed series agree by
// construction and the rest pose comes out identity.
function seedNormal(T) {
  const ref = Math.abs(T.dot(new THREE.Vector3(1, 0, 0))) > 0.9
    ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  return ref.sub(T.clone().multiplyScalar(T.dot(ref))).normalize();
}

// Rotation-minimizing frames: transport the normal by the rotation that takes
// each tangent to the next, so the frame does not spin about the curve.
function frameSeries(curve) {
  const P = [], T = [], U = [], V = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const s = i / SAMPLES;
    P.push(curve.getPoint(s));
    T.push(curve.getTangent(s).normalize());
  }
  U.push(seedNormal(T[0]));
  for (let i = 1; i <= SAMPLES; i++) {
    const a = T[i - 1], b = T[i];
    const axis = new THREE.Vector3().crossVectors(a, b);
    const len = axis.length();
    const u = U[i - 1].clone();
    if (len > 1e-9) u.applyAxisAngle(axis.divideScalar(len), Math.atan2(len, a.dot(b)));
    u.sub(b.clone().multiplyScalar(u.dot(b))).normalize();   // re-orthonormalize
    U.push(u);
  }
  for (let i = 0; i <= SAMPLES; i++) V.push(new THREE.Vector3().crossVectors(T[i], U[i]).normalize());
  return { P, T, U, V };
}

// One sampling routine, used by BOTH bind and pose. Any discretization error
// it has is therefore identical on both sides and cancels — which is what
// makes the rest pose exact rather than merely close.
const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();
function sampleAt(series, s) {
  const f = Math.min(SAMPLES, Math.max(0, s * SAMPLES));
  const i = Math.min(SAMPLES - 1, Math.floor(f)), w = f - i;
  _p.copy(series.P[i]).lerp(series.P[i + 1], w);
  _t.copy(series.T[i]).lerp(series.T[i + 1], w).normalize();
  _u.copy(series.U[i]).lerp(series.U[i + 1], w);
  _u.sub(_t.clone().multiplyScalar(_u.dot(_t))).normalize();
  _v.crossVectors(_t, _u).normalize();
  return { p: _p, T: _t, U: _u, V: _v };
}

// Recover the stem's original centreline. The centroid of a slab is useless
// where a leaf is attached (it lands INSIDE the leaf — measured cx 14.15 on a
// 0.95-radius stem), so slabs are kept only where the cross-section is a tight
// ring, and the axis is interpolated across the leaf gaps.
function extractAxis(pos, y0, y1) {
  const bins = Array.from({ length: SLABS }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = Math.min(SLABS - 1, Math.max(0, Math.floor((y - y0) / (y1 - y0) * SLABS)));
    bins[k].push([pos.getX(i), pos.getZ(i)]);
  }
  const raw = [];
  bins.forEach((pts, k) => {
    if (pts.length < 8) return;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const rs = pts.map(p => Math.hypot(p[0] - cx, p[1] - cz)).sort((a, b) => a - b);
    const med = rs[rs.length >> 1] || 1e-6;
    raw.push({ s: (k + 0.5) / SLABS, cx, cz, med, spread: rs[rs.length - 1] / med });
  });
  const cores = raw.map(r => r.med).sort((a, b) => a - b);
  const coreR = cores[cores.length >> 1];
  // A ring reads spread ~1.0; a leaf slab reads 1.3-2.9 and a fat median.
  //
  // HONEST NOTE: this filter is DEFENSIVE and is NOT covered by the gate.
  // Removing it changes nothing measurable on this bundle, because axisAt() is
  // only ever evaluated at the four CONTROL_S values (0, 1/3, 2/3, 1) and all
  // four sit clear of the three leaves, so the interpolation reads clean
  // neighbours either way. Measured: with the filter removed the control-point
  // offsets are identical to 2 d.p., and the whole gate stays green. It is kept
  // because a centroid taken inside a leaf is not the axis by any definition,
  // and either a different bundle or a different control placement would hit
  // it — but do not read a green run as endorsing it.
  const clean = raw.filter(r => r.spread < 1.5 && r.med < 2.5 * coreR);
  if (clean.length < 4) return null;
  return { clean, coreR };
}

function axisAt(clean, s) {
  if (s <= clean[0].s) return [clean[0].cx, clean[0].cz];
  const last = clean[clean.length - 1];
  if (s >= last.s) return [last.cx, last.cz];
  for (let i = 1; i < clean.length; i++) {
    if (s <= clean[i].s) {
      const a = clean[i - 1], b = clean[i], w = (s - a.s) / (b.s - a.s);
      return [a.cx + (b.cx - a.cx) * w, a.cz + (b.cz - a.cz) * w];
    }
  }
  return [last.cx, last.cz];
}

export const CONTROL_S = [0, 1 / 3, 2 / 3, 1];   // root is index 0 and is anchored

export class StemRig {
  constructor(mesh) {
    this.mesh = mesh;
    const geo = mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    this.y0 = bb.min.y; this.y1 = bb.max.y;
    this.pos = geo.getAttribute('position');
    this.nrm = geo.getAttribute('normal');
    this.restPos = this.pos.array.slice();
    this.restNrm = this.nrm ? this.nrm.array.slice() : null;

    const axis = extractAxis(this.pos, this.y0, this.y1);
    this.coreRadius = axis ? axis.coreR : 1;
    this.axisCleanSlabs = axis ? axis.clean.length : 0;

    // Control points sit ON the recovered axis, so the rest curve is the stem's
    // own centreline and posing starts from identity.
    this.restPoints = CONTROL_S.map(s => {
      const [x, z] = axis ? axisAt(axis.clean, s) : [0, 0];
      return new THREE.Vector3(x, this.y0 + s * (this.y1 - this.y0), z);
    });
    this.points = this.restPoints.map(p => p.clone());

    this.restSeries = frameSeries(this._curve(this.restPoints));
    this.series = this.restSeries;

    // Bind: material coordinate + rigid offset and normal, in the rest frame.
    const n = this.pos.count;
    this.bs = new Float32Array(n);
    this.ba = new Float32Array(n); this.bb_ = new Float32Array(n); this.bc = new Float32Array(n);
    this.nu = new Float32Array(n); this.nv = new Float32Array(n); this.nt = new Float32Array(n);
    const d = new THREE.Vector3(), nv = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const x = this.restPos[i * 3], y = this.restPos[i * 3 + 1], z = this.restPos[i * 3 + 2];
      const s = Math.min(1, Math.max(0, (y - this.y0) / (this.y1 - this.y0)));
      this.bs[i] = s;
      const f = sampleAt(this.restSeries, s);
      d.set(x - f.p.x, y - f.p.y, z - f.p.z);
      this.ba[i] = d.dot(f.U); this.bb_[i] = d.dot(f.V); this.bc[i] = d.dot(f.T);
      if (this.restNrm) {
        nv.set(this.restNrm[i * 3], this.restNrm[i * 3 + 1], this.restNrm[i * 3 + 2]);
        this.nu[i] = nv.dot(f.U); this.nv[i] = nv.dot(f.V); this.nt[i] = nv.dot(f.T);
      }
    }
  }

  _curve(points) {
    return new THREE.CatmullRomCurve3(points.map(p => p.clone()), false, 'catmullrom', 0.5);
  }

  get length() { return this.y1 - this.y0; }

  isRest() {
    return this.points.every((p, i) => p.distanceToSquared(this.restPoints[i]) === 0);
  }

  setPoint(i, v) {
    if (i === 0) return false;              // the root is anchored, by design
    this.points[i].copy(v);
    return true;
  }

  resetPose() { this.points.forEach((p, i) => p.copy(this.restPoints[i])); }

  apply() {
    this.series = this.isRest() ? this.restSeries : frameSeries(this._curve(this.points));
    const P = this.pos.array, N = this.nrm ? this.nrm.array : null;
    for (let i = 0; i < this.pos.count; i++) {
      const f = sampleAt(this.series, this.bs[i]);
      const a = this.ba[i], b = this.bb_[i], c = this.bc[i];
      P[i * 3]     = f.p.x + a * f.U.x + b * f.V.x + c * f.T.x;
      P[i * 3 + 1] = f.p.y + a * f.U.y + b * f.V.y + c * f.T.y;
      P[i * 3 + 2] = f.p.z + a * f.U.z + b * f.V.z + c * f.T.z;
      if (N) {
        const u = this.nu[i], v = this.nv[i], t = this.nt[i];
        N[i * 3]     = u * f.U.x + v * f.V.x + t * f.T.x;
        N[i * 3 + 1] = u * f.U.y + v * f.V.y + t * f.T.y;
        N[i * 3 + 2] = u * f.U.z + v * f.V.z + t * f.T.z;
      }
    }
    this.pos.needsUpdate = true;
    if (this.nrm) this.nrm.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }

  // The rest guard: with the control points untouched, every vertex must land
  // back on itself. Reported in float32 ULPs so the bound is scale-free — an
  // absolute epsilon would be far too loose at a coordinate of 164 and far too
  // tight near 0.
  restResidual() {
    let worst = 0;
    const P = this.pos.array;
    for (let i = 0; i < P.length; i++) worst = Math.max(worst, Math.abs(P[i] - this.restPos[i]));
    return worst;
  }

  // Scaled by the ULP at MODEL SCALE, not at each coordinate's own magnitude.
  // A vertex whose x is ~0 still gets that x from a sum of terms ~164 (curve
  // point plus frame offsets), so cancellation leaves it an absolute error set
  // by the largest term, not by the result. Dividing by its own tiny magnitude
  // reported 850 ULP for a mesh that is in fact clean — measured, and the
  // reason this metric is written the way it is.
  restResidualUlps() {
    let worst = 0, scale = 0;
    const P = this.pos.array, R = this.restPos;
    for (let i = 0; i < R.length; i++) scale = Math.max(scale, Math.abs(R[i]));
    const ulp = Math.max(scale, 1) * 1.1920929e-7;
    for (let i = 0; i < P.length; i++) worst = Math.max(worst, Math.abs(P[i] - R[i]));
    return worst / ulp;
  }

  // Where the stem tip ends up, and how its frame turned — the bloom hangs off
  // this, so the hinge follows the bend instead of floating at a fixed point.
  tipFrame() {
    const rest = sampleAt(this.restSeries, 1);
    const restM = new THREE.Matrix4().makeBasis(rest.U.clone(), rest.T.clone(), rest.V.clone());
    const cur = sampleAt(this.series, 1);
    const curM = new THREE.Matrix4().makeBasis(cur.U.clone(), cur.T.clone(), cur.V.clone());
    const q = new THREE.Quaternion().setFromRotationMatrix(
      curM.multiply(restM.clone().invert()));
    return { position: cur.p.clone(), tangent: cur.T.clone(), quaternion: q };
  }

  restTip() { return sampleAt(this.restSeries, 1).p.clone(); }

  // Is the recovered centreline actually the STEM? Bind and pose cancel each
  // other, so a badly-fitted axis still deforms smoothly and preserves every
  // leaf — it just pivots around the wrong line, with the handles floating off
  // the mesh. Measured: letting leaf slabs into the fit puts a control point
  // ~14 units inside a leaf on a 0.95-radius stem, and every other check here
  // stayed green. This is the one that sees it.
  //
  // Per control point: the 25th-percentile lateral distance from that point to
  // the stem vertices sharing its s, in units of the core radius. A correct
  // axis reads ~1 (the ring radius); a polluted one reads an order of magnitude
  // more.
  axisOffsets() {
    return this.restPoints.map((p, ci) => {
      const s0 = CONTROL_S[ci], d = [];
      for (let i = 0; i < this.pos.count; i++) {
        if (Math.abs(this.bs[i] - s0) > 0.02) continue;
        const x = this.restPos[i * 3], z = this.restPos[i * 3 + 2];
        d.push(Math.hypot(x - p.x, z - p.z));
      }
      if (!d.length) return null;
      d.sort((a, b) => a - b);
      return d[Math.floor(d.length * 0.25)] / this.coreRadius;
    });
  }
}
