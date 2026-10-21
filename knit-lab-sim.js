// knit-lab-sim.js — a yarn-level knit, relaxed with XPBD. Pure: no DOM, so the very same code
// runs in the page and in tools/verify-knit-lab.mjs under Node.
//
// After Kaldor, James & Marschner 2008 (yarn as an inextensible chain with contact, relaxed
// from a rough initial knit), Yuksel, Kaldor, James & Marschner 2012 (Stitch Meshes: knit
// topology first, then yarn geometry that satisfies it, then relaxation), Leaf et al. 2018
// (periodic yarn-level cells) and Macklin, Müller et al. 2016/2019 (XPBD; "small steps": many
// substeps of one iteration each). Nothing here is taken from any of their code.
//
// THE MODEL
//   * One yarn, a polyline of N points at ~SEGMENT_LENGTH spacing, every point mass 1.
//   * STRETCH   per segment, C = |x_i - x_j| - rest. Compliance tiny: near-inextensible.
//   * BEND      per interior point, C = |x_i - (x_{i-1} + x_{i+1})/2|, rest 0 (the yarn's
//               natural shape is straight). C ~ (seg/2)·turn angle, so the energy C²/2α goes as
//               angle² — the rod scaling. (A distance constraint between i and i+2 would go as
//               angle⁴ and be soft exactly where a yarn is stiffest.)
//   * CONTACT   per segment pair, capsule against capsule: the closest points of two segments
//               must be at least one yarn diameter apart. Pairs come from a spatial hash on the
//               segment midpoints, built with a margin and reused until something has moved half
//               of it (a Verlet list); pairs closer along the yarn than CONTACT_SKIP_ARC are
//               excluded (a yarn does not collide with its own neighbours). Unilateral (push
//               only); optional Coulomb friction, off by default.
//   * JAWS      every point of course 0 (the cast-on) is pinned from the start: the bottom jaw.
//               The live loops of the last course hang on a COMB — one rigid pin per loop, a rod
//               through the loop perpendicular to the fabric, where the next course's legs would
//               be — force-controlled to a small PRELOAD while settling, driven upward to pull:
//               the top jaw. The yarn's end is tied to the comb, and the swatch lies between two
//               frictionless PLATES (see PARAMS for why each exists).
//               WHY a comb: a frictionless knit with live loops has no rest state. Bending energy
//               falls as the yarn straightens, so the top course pulls out of the one below and
//               the swatch unravels to a tangle (the first version of this file did exactly that).
//               The comb is the needle the stitches are still on.
//               The load is the reaction a jaw feels: the sum over every constraint that touches a
//               pinned point (or a pin) of λ·∂C/∂y / Δt².
//
// Units: the yarn diameter is 1 length unit (read it as mm for a ~1 mm yarn), time is seconds
// of SIMULATED time, mass is 1 per point. Forces come out in those model units and are not
// calibrated to newtons; the SHAPE of the load-extension curve is what this spike reports.

import { loopPoint, SHAPE, JERSEY_REST } from './textile-knit-loops.js';
import { courseDirection } from './knit-lab-topology.js';

// ---- Every tunable, in one place -------------------------------------------------------------
export const PARAMS = {
  YARN_DIAMETER: 1.0,          // d. Every length below is in these units.
  SEGMENT_LENGTH: 0.5,         // chain rest length, in d. ~2 points per diameter.
  STRETCH_COMPLIANCE: 1e-9,    // α of a segment. Near-inextensible at the substep below.
  BEND_COMPLIANCE: 4e-6,       // α of a bend. Bigger = softer yarn.
  CONTACT_COMPLIANCE: 0,       // α of a contact. 0 = hard.
  FRICTION: 0,                 // yarn-on-yarn Coulomb coefficient (position-based: a contact's
                               // tangential slip this substep is cancelled up to FRICTION times its
                               // normal multiplier). 0 = frictionless, the brief's scope. Measured
                               // (before the tail was tied): 0.1 stops the post-settle creep but
                               // locks the loops, and the pull is carried by yarn stretch (12.7%).
  CONTACT_SKIP_ARC: 2.0,       // in d: segments nearer than this along the yarn never collide.
  CONTACT_MARGIN: 0.15,        // in d: the pair list is built this much wider than contact and
                               // reused until some point has moved half of it (a Verlet list).
  SUBSTEPS_PER_FRAME: 32,      // XPBD substeps per rendered frame...
  ITERATIONS_PER_SUBSTEP: 1,   // ...each this many Gauss-Seidel sweeps ("small steps": 1).
  FRAME_DT: 1 / 60,            // simulated seconds per frame.
  DAMPING: 15,                 // velocity decay per simulated second while settling (1/s).
  PULL_DAMPING: 15,            // ...and while pulling (relative to the jaws, so it does not resist the pull).
  WALE_PITCH: 4.2,             // initial wale spacing, in d. Sets the yarn length per loop.
  LOOP_DEPTH: 0.6,             // initial z amplitude of a loop, in d.
  SETTLE_WINDOW: 120,          // settled when the jaw gap has moved less than
  SETTLE_GAP_DRIFT: 0.1,       // this many d over the last SETTLE_WINDOW frames...
  SETTLE_MAX_FRAMES: 4000,     // ...or after this many frames, whichever first. NOT "every point at
                               // rest": with no friction and no gravity the free side edges of a
                               // stockinette swatch keep rolling (measured: RMS speed floors at
                               // ~0.2 d/s while the jaw gap is still), so that test never passes.
  PULL_SPEED: 1.5,             // comb speed while pulling, d per simulated second.
  PULL_MAX_EXTENSION: 0.6,     // stop the automatic pull at +60%...
  STRAIN_STOP: 0.05,           // ...or as soon as any segment is strained 5%: past the jam (~+40%)
                               // the yarn carries the load, and one Gauss-Seidel sweep a substep
                               // cannot keep a 1,700 d chain inextensible under it (pulled on, a
                               // segment reached 384% and the load collapsed at ~+55%).
  PLATE_HALF_GAP: 1.6,         // the swatch lies between two frictionless plates: every yarn
                               // CENTRELINE keeps |z| <= this, in d (the loops' own depth is
                               // ±(LOOP_DEPTH + ½) d). Without them a frictionless, weightless
                               // stockinette swatch rolls its free side edges up indefinitely and
                               // the rolling shortens it (measured: the comb load creeps up by
                               // ~6,000 over 1,400 frames after "settling"). Infinity = no plates.
  PIN_RADIUS: 0.5,             // comb pin radius, in d.
  TAIL_TIED: 1.5,              // this much of the yarn's end, in d, is tied to the comb.
  COMB_FOLLOW: 1e-3,           // while settling the comb is FORCE-controlled: it moves at this
                               // many d/s per unit of load error toward PRELOAD, so the swatch
                               // settles at its own height, not the guessed one.
  PRELOAD: 1500,               // ...a small TENSION, the gauge-length preload of a tensile test.
                               // Aiming at exactly zero overshoots into compression and the sheet
                               // buckles into a crumple that the contacts then lock (measured).
  COMB_MAX_SPEED: 3,           // ...never faster than this (d/s).
  PIN_HALF_LENGTH: 40,         // comb pins run z = -this..+this, in d (long: a loop must not slide off).
};

// ---- Initial geometry ------------------------------------------------------------------------
// Every loop is the shared jersey loop of textile-knit-loops.js in (x, y), turned the right way
// up, with a depth z = -LOOP_DEPTH·cos(4πu): its two legs in FRONT, its head and its feet
// (sinkers) BEHIND. With the loops overlapping by JERSEY_REST.loopPerCourse courses, that one
// rule puts the legs of course c+1 in front of the head of course c and the feet of course c+1
// behind the legs of course c — a new loop pulled through its parent from the back, i.e. the
// technical face of jersey. Only placeCourse reads the topology.

function placeCourse(topo, c, xOf, pitch) {
  const row = topo.rows[c];
  return row.map((id, k) => {
    const l = topo.loops[id];
    let x;
    if (c === 0) x = (k + 0.5) * pitch;
    else if (l.through.length === 1) x = xOf.get(l.through[0]);
    else throw new Error(`knit-lab builder: loop ${id} (${l.kind}) passes through ${l.through.length} loops; ` +
      'this spike only draws plain knit (one parent). Yarn overs (0) and k2tog/ssk (2) need a case here.');
    xOf.set(id, x);
    return { id, x };
  }).sort((a, b) => a.x - b.x);
}

export function buildYarn(topo, P = PARAMS) {
  const d = P.YARN_DIAMETER, W = P.WALE_PITCH * d;
  const H = W * JERSEY_REST.coursePerWale, L = H * JERSEY_REST.loopPerCourse, A = P.LOOP_DEPTH * d;
  const dense = [];            // {x, y, z, course}
  const xOf = new Map();
  const SAMPLES = 64;
  const pt = (u, cx, cy, course) => {
    const p = loopPoint(u, cx, 0, W, L, SHAPE);
    return { x: p.x, y: cy - p.y, z: -A * Math.cos(4 * Math.PI * u), course };
  };
  for (let c = 0; c < topo.rows.length; c++) {
    const cy = c * H, dir = courseDirection(topo, c);
    let loops = placeCourse(topo, c, xOf, W);
    if (dir < 0) loops = loops.slice().reverse();
    const pts = [];
    for (const { x } of loops) for (let i = 0; i <= SAMPLES; i++) {
      const u = dir > 0 ? i / SAMPLES : 1 - i / SAMPLES;
      const q = pt(u, x, cy, c);
      const last = pts[pts.length - 1];
      if (last && Math.hypot(q.x - last.x, q.y - last.y) < 1e-9) continue;   // shared sinker
      pts.push(q);
    }
    if (dense.length) {        // the selvedge turn: straight up the edge, behind
      const a = dense[dense.length - 1], b = pts[0];
      for (let i = 1; i < 16; i++) { const t = i / 16; dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: -A, course: c - 0.5 }); }
    }
    dense.push(...pts);
  }
  // resample to a uniform arc length
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y, dense[i].z - dense[i - 1].z));
  const total = cum[cum.length - 1], n = Math.max(2, Math.round(total / (P.SEGMENT_LENGTH * d)) + 1), seg = total / (n - 1);
  const pos = new Float64Array(n * 3), course = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = i * seg;
    while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const t = Math.min(1, Math.max(0, (s - cum[j]) / (cum[j + 1] - cum[j] || 1)));
    const a = dense[j], b = dense[j + 1];
    pos[3 * i] = a.x + (b.x - a.x) * t; pos[3 * i + 1] = a.y + (b.y - a.y) * t; pos[3 * i + 2] = a.z + (b.z - a.z) * t;
    course[i] = t < 0.5 ? a.course : b.course;
  }
  // the comb: one pin inside the head of every loop of the last course, just clear of the head
  const last = topo.rows.length - 1, yHead = last * H + L / 2;
  const pins = topo.rows[last].map(id => ({ x: xOf.get(id), y: yHead - (P.PIN_RADIUS + 0.5 + 0.05) * d }));
  const loopLen = total / topo.loops.length;
  return { pos, course, n, seg, pins, pitch: { wale: W, course: H, loop: L }, yarnLength: total, loopLength: loopLen };
}

// ---- Segment-segment closest points (Ericson, Real-Time Collision Detection §5.1.9) ----------
// Writes s, t into out[0], out[1] and returns the squared distance.
function closest(P, a0, a1, b0, b1, out) {
  const ax = P[3 * a0], ay = P[3 * a0 + 1], az = P[3 * a0 + 2];
  const bx = P[3 * b0], by = P[3 * b0 + 1], bz = P[3 * b0 + 2];
  const d1x = P[3 * a1] - ax, d1y = P[3 * a1 + 1] - ay, d1z = P[3 * a1 + 2] - az;
  const d2x = P[3 * b1] - bx, d2y = P[3 * b1 + 1] - by, d2z = P[3 * b1 + 2] - bz;
  const rx = ax - bx, ry = ay - by, rz = az - bz;
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z;
  const f = d2x * rx + d2y * ry + d2z * rz, c = d1x * rx + d1y * ry + d1z * rz, b = d1x * d2x + d1y * d2y + d1z * d2z;
  const den = a * e - b * b;
  let s = den > 1e-12 ? (b * f - c * e) / den : 0;
  s = s < 0 ? 0 : s > 1 ? 1 : s;
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = -c / a; s = s < 0 ? 0 : s > 1 ? 1 : s; }
  else if (t > 1) { t = 1; s = (b - c) / a; s = s < 0 ? 0 : s > 1 ? 1 : s; }
  out[0] = s; out[1] = t;
  const dx = rx + d1x * s - d2x * t, dy = ry + d1y * s - d2y * t, dz = rz + d1z * s - d2z * t;
  return dx * dx + dy * dy + dz * dz;
}

// ---- The simulator ---------------------------------------------------------------------------
export class KnitSim {
  constructor(topo, P = PARAMS) {
    this.P = P; this.topo = topo;
    const y = buildYarn(topo, P);
    Object.assign(this, { n: y.n, course: y.course, seg: y.seg, pitch: y.pitch, yarnLength: y.yarnLength, loopLength: y.loopLength, pins: y.pins });
    const n = this.n;
    this.x = y.pos;
    this.x0 = new Float64Array(y.pos);
    this.prev = new Float64Array(n * 3);
    this.v = new Float64Array(n * 3);
    this.w = new Float64Array(n).fill(1);           // inverse mass
    this.grip = new Uint8Array(n);                  // 0 free, 1 bottom jaw (pinned), 2 tied to the comb
    for (let i = 0; i < n; i++) if (this.course[i] === 0) { this.grip[i] = 1; this.w[i] = 0; }
    // The yarn's END (the tail of the last stitch) is tied to the comb and moves with it. Left
    // free, the swatch unravels from it under load: the first version's load fell 20% after the
    // jam because the last two stitches had pulled off their pins (seen on the +70% frame).
    this.tieBase = new Float64Array(n * 3);
    const tail = Math.ceil(P.TAIL_TIED * P.YARN_DIAMETER / this.seg);
    for (let i = n - tail; i < n; i++) { this.grip[i] = 2; this.w[i] = 0; this.tieBase[3 * i] = this.x[3 * i]; this.tieBase[3 * i + 1] = this.x[3 * i + 1]; this.tieBase[3 * i + 2] = this.x[3 * i + 2]; }
    this.rest = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) this.rest[i] = this.dist(i, i + 1);
    this.lamS = new Float64Array(n - 1); this.lamB = new Float64Array(n);
    this.nSeg = n - 1;
    this.mid = new Float64Array(this.nSeg * 3);
    let size = 1; while (size < this.nSeg * 2) size <<= 1;
    this.tableMask = size - 1;
    this.cellStart = new Int32Array(size + 1); this.cellEnt = new Int32Array(this.nSeg); this.segCell = new Int32Array(this.nSeg);
    this.pairCap = this.nSeg * 16;
    this.pairA = new Int32Array(this.pairCap); this.pairB = new Int32Array(this.pairCap); this.lamC = new Float64Array(this.pairCap);
    this.nPairs = 0;
    this.skip = Math.ceil(P.CONTACT_SKIP_ARC * P.YARN_DIAMETER / this.seg);
    this.cs = [0, 0];
    // state
    this.phase = 'settling'; this.frame = 0; this.settleFrames = 0; this.gapHist = []; this.drift = Infinity;
    this.pullOffset = 0; this.combLoad = 0; this.restHeight = 0; this.bottomY = this.meanY(1);
    this.react = [0, 0, 0];
    this.audit = false;                              // per-substep pass-through certificate (costly)
    this.stats = { maxSpeed: 0, rmsSpeed: 0, minDist: Infinity, deep: 0, certFail: 0, certSteps: 0, worstMargin: Infinity, loadBottom: 0, loadTop: 0, maxStrain: 0 };
    this.timing = { frameMs: 0, steps: 0, totalMs: 0 };
    this.initialOverlaps = this.countOverlaps(0.999).pairs;
  }

  dist(i, j) { const x = this.x; return Math.hypot(x[3 * i] - x[3 * j], x[3 * i + 1] - x[3 * j + 1], x[3 * i + 2] - x[3 * j + 2]); }

  // ---- spatial hash over segment midpoints
  buildHash() {
    const x = this.x, m = this.mid, ns = this.nSeg, inv = 1 / this.cellSize(), mask = this.tableMask;
    const start = this.cellStart; start.fill(0);
    for (let i = 0; i < ns; i++) {
      const mx = (x[3 * i] + x[3 * i + 3]) * 0.5, my = (x[3 * i + 1] + x[3 * i + 4]) * 0.5, mz = (x[3 * i + 2] + x[3 * i + 5]) * 0.5;
      m[3 * i] = mx; m[3 * i + 1] = my; m[3 * i + 2] = mz;
      const h = hash3(Math.floor(mx * inv), Math.floor(my * inv), Math.floor(mz * inv)) & mask;
      this.segCell[i] = h; start[h]++;
    }
    let acc = 0;
    for (let h = 0; h <= mask; h++) { acc += start[h]; start[h] = acc; }
    start[mask + 1] = acc;
    for (let i = 0; i < ns; i++) this.cellEnt[--start[this.segCell[i]]] = i;
  }
  cellSize() { return this.seg * 1.15 + this.P.YARN_DIAMETER * (1 + this.P.CONTACT_MARGIN); }

  // Is the pair list still a superset of every pair that can be in contact? It was built with
  // CONTACT_MARGIN to spare, and two segments close by at most twice the largest displacement.
  pairsStale() {
    if (!this.builtAt) return true;
    const x = this.x, b = this.builtAt, lim = 0.5 * this.P.CONTACT_MARGIN * this.P.YARN_DIAMETER, lim2 = lim * lim;
    for (let i = 0; i < this.n; i++) {
      const dx = x[3 * i] - b[3 * i], dy = x[3 * i + 1] - b[3 * i + 1], dz = x[3 * i + 2] - b[3 * i + 2];
      if (dx * dx + dy * dy + dz * dz > lim2) return true;
    }
    return false;
  }

  // candidate pairs (i < j, |i - j| > skip) whose midpoints are within reach of a contact
  findPairs() {
    this.buildHash();
    if (!this.builtAt) this.builtAt = new Float64Array(this.n * 3);
    this.builtAt.set(this.x); this.builds = (this.builds || 0) + 1;
    const m = this.mid, inv = 1 / this.cellSize(), mask = this.tableMask, reach = this.cellSize(), r2 = reach * reach;
    const seen = new Int32Array(27);
    let np = 0;
    for (let i = 0; i < this.nSeg; i++) {
      const mx = m[3 * i], my = m[3 * i + 1], mz = m[3 * i + 2];
      const cx = Math.floor(mx * inv), cy = Math.floor(my * inv), cz = Math.floor(mz * inv);
      let ns = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const h = hash3(cx + dx, cy + dy, cz + dz) & mask;
        let dup = false; for (let k = 0; k < ns; k++) if (seen[k] === h) { dup = true; break; }
        if (dup) continue; seen[ns++] = h;
        for (let e = this.cellStart[h], end = this.cellStart[h + 1]; e < end; e++) {
          const j = this.cellEnt[e];
          if (j <= i + this.skip) continue;
          const ex = m[3 * j] - mx, ey = m[3 * j + 1] - my, ez = m[3 * j + 2] - mz;
          if (ex * ex + ey * ey + ez * ez > r2) continue;
          if (np === this.pairCap) this.growPairs();
          this.pairA[np] = i; this.pairB[np] = j; np++;
        }
      }
    }
    this.nPairs = np;
  }
  growPairs() {
    this.pairCap *= 2;
    const a = new Int32Array(this.pairCap), b = new Int32Array(this.pairCap); a.set(this.pairA); b.set(this.pairB);
    this.pairA = a; this.pairB = b; this.lamC = new Float64Array(this.pairCap);
  }

  // ---- constraint solves. Each returns nothing; reactions on pinned points accumulate in react[]
  solveStretch(at) {
    const x = this.x, w = this.w, rest = this.rest, lam = this.lamS, g = this.grip;
    for (let i = 0; i < this.nSeg; i++) {
      const j = i + 1, wi = w[i], wj = w[j], W = wi + wj;
      if (W === 0) continue;
      const dx = x[3 * i] - x[3 * j], dy = x[3 * i + 1] - x[3 * j + 1], dz = x[3 * i + 2] - x[3 * j + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz); if (len < 1e-12) continue;
      const C = len - rest[i], dl = (-C - at * lam[i]) / (W + at);
      lam[i] += dl;
      const nx = dx / len, ny = dy / len, nz = dz / len;
      x[3 * i] += wi * nx * dl; x[3 * i + 1] += wi * ny * dl; x[3 * i + 2] += wi * nz * dl;
      x[3 * j] -= wj * nx * dl; x[3 * j + 1] -= wj * ny * dl; x[3 * j + 2] -= wj * nz * dl;
      if (wi === 0) this.react[g[i]] += dl * ny;
      if (wj === 0) this.react[g[j]] -= dl * ny;
    }
  }
  solveBend(at) {
    const x = this.x, w = this.w, lam = this.lamB, g = this.grip;
    for (let i = 1; i < this.n - 1; i++) {
      const a = i - 1, b = i + 1, wa = w[a], wi = w[i], wb = w[b];
      const W = wi + 0.25 * (wa + wb); if (W === 0) continue;
      const ex = x[3 * i] - 0.5 * (x[3 * a] + x[3 * b]), ey = x[3 * i + 1] - 0.5 * (x[3 * a + 1] + x[3 * b + 1]), ez = x[3 * i + 2] - 0.5 * (x[3 * a + 2] + x[3 * b + 2]);
      const C = Math.sqrt(ex * ex + ey * ey + ez * ez); if (C < 1e-12) continue;
      const dl = (-C - at * lam[i]) / (W + at);
      lam[i] += dl;
      const nx = ex / C, ny = ey / C, nz = ez / C;
      x[3 * i] += wi * nx * dl; x[3 * i + 1] += wi * ny * dl; x[3 * i + 2] += wi * nz * dl;
      const h = -0.5 * dl;
      x[3 * a] += wa * nx * h; x[3 * a + 1] += wa * ny * h; x[3 * a + 2] += wa * nz * h;
      x[3 * b] += wb * nx * h; x[3 * b + 1] += wb * ny * h; x[3 * b + 2] += wb * nz * h;
      if (wi === 0) this.react[g[i]] += dl * ny;
      if (wa === 0) this.react[g[a]] += h * ny;
      if (wb === 0) this.react[g[b]] += h * ny;
    }
  }
  solveContacts(at, first) {
    const x = this.x, w = this.w, g = this.grip, D = this.P.YARN_DIAMETER, D2 = D * D, cs = this.cs, lam = this.lamC, mu = this.P.FRICTION;
    let minD2 = Infinity;
    const pA = this.pairA, pB = this.pairB;
    for (let p = 0; p < this.nPairs; p++) {
      const a0 = pA[p], a1 = a0 + 1, b0 = pB[p], b1 = b0 + 1;
      const d2 = closest(x, a0, a1, b0, b1, cs);
      if (first && d2 < minD2) minD2 = d2;
      if (d2 >= D2) continue;
      const s = cs[0], t = cs[1];
      const pax = x[3 * a0] + (x[3 * a1] - x[3 * a0]) * s, pay = x[3 * a0 + 1] + (x[3 * a1 + 1] - x[3 * a0 + 1]) * s, paz = x[3 * a0 + 2] + (x[3 * a1 + 2] - x[3 * a0 + 2]) * s;
      const pbx = x[3 * b0] + (x[3 * b1] - x[3 * b0]) * t, pby = x[3 * b0 + 1] + (x[3 * b1 + 1] - x[3 * b0 + 1]) * t, pbz = x[3 * b0 + 2] + (x[3 * b1 + 2] - x[3 * b0 + 2]) * t;
      let nx = pax - pbx, ny = pay - pby, nz = paz - pbz;
      const dd = Math.sqrt(d2);
      if (dd < 1e-9) continue;                       // exact touch: no direction to push in
      nx /= dd; ny /= dd; nz /= dd;
      const ca0 = 1 - s, ca1 = s, cb0 = 1 - t, cb1 = t;
      const W = ca0 * ca0 * w[a0] + ca1 * ca1 * w[a1] + cb0 * cb0 * w[b0] + cb1 * cb1 * w[b1];
      if (W === 0) continue;
      const C = dd - D;
      let dl = (-C - at * lam[p]) / (W + at);
      if (lam[p] + dl < 0) dl = -lam[p];             // unilateral
      lam[p] += dl;
      const k0 = w[a0] * ca0 * dl, k1 = w[a1] * ca1 * dl, k2 = w[b0] * cb0 * dl, k3 = w[b1] * cb1 * dl;
      x[3 * a0] += nx * k0; x[3 * a0 + 1] += ny * k0; x[3 * a0 + 2] += nz * k0;
      x[3 * a1] += nx * k1; x[3 * a1 + 1] += ny * k1; x[3 * a1 + 2] += nz * k1;
      x[3 * b0] -= nx * k2; x[3 * b0 + 1] -= ny * k2; x[3 * b0 + 2] -= nz * k2;
      x[3 * b1] -= nx * k3; x[3 * b1 + 1] -= ny * k3; x[3 * b1 + 2] -= nz * k3;
      if (w[a0] === 0) this.react[g[a0]] += ca0 * dl * ny;
      if (w[a1] === 0) this.react[g[a1]] += ca1 * dl * ny;
      if (w[b0] === 0) this.react[g[b0]] -= cb0 * dl * ny;
      if (w[b1] === 0) this.react[g[b1]] -= cb1 * dl * ny;
      if (mu > 0) {
        // relative slip of the two contact points since the start of the substep, tangential part
        const pr = this.prev;
        let rx = (x[3 * a0] - pr[3 * a0]) * ca0 + (x[3 * a1] - pr[3 * a1]) * ca1 - (x[3 * b0] - pr[3 * b0]) * cb0 - (x[3 * b1] - pr[3 * b1]) * cb1;
        let ry = (x[3 * a0 + 1] - pr[3 * a0 + 1]) * ca0 + (x[3 * a1 + 1] - pr[3 * a1 + 1]) * ca1 - (x[3 * b0 + 1] - pr[3 * b0 + 1]) * cb0 - (x[3 * b1 + 1] - pr[3 * b1 + 1]) * cb1;
        let rz = (x[3 * a0 + 2] - pr[3 * a0 + 2]) * ca0 + (x[3 * a1 + 2] - pr[3 * a1 + 2]) * ca1 - (x[3 * b0 + 2] - pr[3 * b0 + 2]) * cb0 - (x[3 * b1 + 2] - pr[3 * b1 + 2]) * cb1;
        const rn = rx * nx + ry * ny + rz * nz; rx -= rn * nx; ry -= rn * ny; rz -= rn * nz;
        const slip = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (slip > 1e-12) {
          // tangential multiplier needed to cancel the slip is slip / W; Coulomb caps it at
          // mu x the normal multiplier dl: static under the cap, kinetic (partial) above it
          const f = Math.min(1 / W, mu * Math.abs(dl) / slip);
          const tx = rx * f, ty = ry * f, tz = rz * f;
          const q0 = w[a0] * ca0, q1 = w[a1] * ca1, q2 = w[b0] * cb0, q3 = w[b1] * cb1;
          x[3 * a0] -= tx * q0; x[3 * a0 + 1] -= ty * q0; x[3 * a0 + 2] -= tz * q0;
          x[3 * a1] -= tx * q1; x[3 * a1 + 1] -= ty * q1; x[3 * a1 + 2] -= tz * q1;
          x[3 * b0] += tx * q2; x[3 * b0 + 1] += ty * q2; x[3 * b0 + 2] += tz * q2;
          x[3 * b1] += tx * q3; x[3 * b1 + 1] += ty * q3; x[3 * b1 + 2] += tz * q3;
          if (w[a0] === 0) this.react[g[a0]] -= ca0 * ty; if (w[a1] === 0) this.react[g[a1]] -= ca1 * ty;
          if (w[b0] === 0) this.react[g[b0]] += cb0 * ty; if (w[b1] === 0) this.react[g[b1]] += cb1 * ty;
        }
      }
    }
    return minD2;
  }

  // Comb pins: rods along z at (pin.x, pin.y + pullOffset), |z| <= PIN_HALF_LENGTH. A point closer
  // to a pin's axis than PIN_RADIUS + d/2 is pushed straight out; the pin is kinematic, so all of
  // the correction goes to the yarn and its y component is the comb's reaction.
  solvePins() {
    const x = this.x, w = this.w, pins = this.pins, R = this.P.PIN_RADIUS + 0.5 * this.P.YARN_DIAMETER, R2 = R * R;
    const zl = this.P.PIN_HALF_LENGTH * this.P.YARN_DIAMETER, off = this.pullOffset;
    const yTop = pins[0].y + off + R, yBot = pins[0].y + off - R;
    for (let i = 0; i < this.n; i++) {
      if (w[i] === 0) continue;
      const py = x[3 * i + 1]; if (py > yTop || py < yBot) continue;
      if (Math.abs(x[3 * i + 2]) > zl) continue;
      for (let k = 0; k < pins.length; k++) {
        const dx = x[3 * i] - pins[k].x, dy = py - (pins[k].y + off);
        const d2 = dx * dx + dy * dy; if (d2 >= R2) continue;
        const dd = Math.sqrt(d2); if (dd < 1e-9) continue;
        const push = R - dd;
        x[3 * i] += dx / dd * push; x[3 * i + 1] += dy / dd * push;
        this.react[2] += push * dy / dd;              // λ·∂C/∂y on the yarn; the pin feels the opposite
      }
    }
  }

  solvePlates() {
    const lim = this.P.PLATE_HALF_GAP * this.P.YARN_DIAMETER; if (!Number.isFinite(lim)) return;
    const x = this.x, w = this.w;
    for (let i = 0; i < this.n; i++) { if (w[i] === 0) continue; const z = x[3 * i + 2]; if (z > lim) x[3 * i + 2] = lim; else if (z < -lim) x[3 * i + 2] = -lim; }
  }

  // ---- one substep
  // Damping is RELATIVE TO THE JAWS: each point's velocity decays toward the velocity it would have
  // if the swatch between the bottom jaw and the comb were stretching uniformly. A world-frame drag
  // would resist the pull itself, and the bottom jaw would feel less than the comb by the drag on
  // ~3,500 moving points — it did, by about 9,000 load units while settling.
  substep(dt, damping, combV) {
    const P = this.P, x = this.x, v = this.v, prev = this.prev, w = this.w, n = this.n;
    prev.set(x);
    const keep = Math.exp(-damping * dt), yB = this.bottomY, span = Math.max(1e-6, this.combY() - yB);
    for (let i = 0; i < n; i++) if (this.grip[i] === 2) {      // the tied tail rides the comb
      x[3 * i] = this.tieBase[3 * i]; x[3 * i + 1] = this.tieBase[3 * i + 1] + this.pullOffset; x[3 * i + 2] = this.tieBase[3 * i + 2];
    }
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue;
      let f = (x[3 * i + 1] - yB) / span; f = f < 0 ? 0 : f > 1 ? 1 : f;
      const ref = combV * f;
      v[3 * i] *= keep; v[3 * i + 1] = ref + (v[3 * i + 1] - ref) * keep; v[3 * i + 2] *= keep;
      x[3 * i] += v[3 * i] * dt; x[3 * i + 1] += v[3 * i + 1] * dt; x[3 * i + 2] += v[3 * i + 2] * dt;
    }
    if (this.pairsStale()) this.findPairs();
    this.lamS.fill(0); this.lamB.fill(0); this.lamC.fill(0, 0, this.nPairs);
    const dt2 = dt * dt;
    const r0 = this.react[1], r2 = this.react[2];
    for (let it = 0; it < P.ITERATIONS_PER_SUBSTEP; it++) {
      // Contact first, the yarn's own length last: the last constraint in a Gauss-Seidel sweep
      // is the one met exactly, and a knit yarn is inextensible before it is impenetrable.
      const m = this.solveContacts(P.CONTACT_COMPLIANCE / dt2, it === 0);
      if (it === 0) this.lastMinPre = Math.sqrt(m);
      this.solvePins();
      this.solvePlates();
      this.solveBend(P.BEND_COMPLIANCE / dt2);
      this.solveStretch(P.STRETCH_COMPLIANCE / dt2);
    }
    this.subLoadBottom = (this.react[1] - r0) / dt2; this.subLoadTop = (this.react[2] - r2) / dt2;
    let maxD2 = 0, sum2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[3 * i] - prev[3 * i], dy = x[3 * i + 1] - prev[3 * i + 1], dz = x[3 * i + 2] - prev[3 * i + 2];
      const d2 = dx * dx + dy * dy + dz * dz; if (d2 > maxD2) maxD2 = d2; sum2 += d2;
      if (w[i] === 0) continue;
      v[3 * i] = dx / dt; v[3 * i + 1] = dy / dt; v[3 * i + 2] = dz / dt;
    }
    this.subRms = Math.sqrt(sum2 / n);
    return Math.sqrt(maxD2);
  }

  // ---- one frame: SUBSTEPS_PER_FRAME substeps, then bookkeeping
  stepFrame() {
    const P = this.P, sub = P.SUBSTEPS_PER_FRAME, dt = P.FRAME_DT / sub;
    const t0 = now();
    const damping = this.phase === 'pulling' ? P.PULL_DAMPING : P.DAMPING;
    let maxDisp = 0, loadB = 0, loadT = 0, rms = 0;
    for (let s = 0; s < sub; s++) {
      const offBefore = this.pullOffset;
      if (this.phase === 'settling') {   // force-controlled comb, speed-limited so a contact spike cannot fling it off the loops
        const v = Math.max(-P.COMB_MAX_SPEED, Math.min(P.COMB_MAX_SPEED, -P.COMB_FOLLOW * (this.combLoad - P.PRELOAD)));
        this.pullOffset += v * dt;
      }
      else if (this.phase === 'pulling' && this.pullAuto && this.strainStopped) this.pullTarget = this.pullOffset;
      else if (this.phase === 'pulling' && this.pullAuto) this.pullOffset = Math.min(this.pullTarget, this.pullOffset + P.PULL_SPEED * dt);
      else if (this.phase === 'pulling') this.pullOffset += Math.max(-P.PULL_SPEED * 3 * dt, Math.min(P.PULL_SPEED * 3 * dt, this.pullTarget - this.pullOffset));
      const combV = (this.pullOffset - offBefore) / dt;
      if (this.audit) this.auditBefore();
      const d = this.substep(dt, damping, combV);
      if (this.audit) this.auditAfter();
      if (d > maxDisp) maxDisp = d;
      rms += this.subRms * this.subRms;
      loadB += this.subLoadBottom; loadT += this.subLoadTop;
    }
    const ms = now() - t0;
    this.timing.frameMs = ms; this.timing.totalMs += ms; this.timing.steps += sub;
    this.frame++;
    this.stats.maxSpeed = maxDisp / dt;
    if (this.phase === 'pulling') { this.stats.maxStrain = this.maxStrain(); if (this.stats.maxStrain > P.STRAIN_STOP) this.strainStopped = true; }
    this.stats.rmsSpeed = Math.sqrt(rms / sub) / dt;
    this.stats.loadBottom = loadB / sub; this.stats.loadTop = loadT / sub;
    // pin contact comes and goes substep to substep; the comb follows a smoothed load
    this.combLoad += (this.stats.loadTop - this.combLoad) * 0.2;
    if (this.phase === 'settling') {
      this.settleFrames++;
      this.gapHist.push(this.jawGap());
      const W = P.SETTLE_WINDOW, h = this.gapHist;
      this.drift = h.length > W ? Math.abs(h[h.length - 1] - h[h.length - 1 - W]) : Infinity;
      if (this.drift < P.SETTLE_GAP_DRIFT * P.YARN_DIAMETER || this.settleFrames >= P.SETTLE_MAX_FRAMES) this.finishSettle();
    }
    return ms;
  }

  settleProgress() {
    if (this.phase !== 'settling') return 1;
    const P = this.P;
    // log-scale progress of the jaw-gap drift from 10 d per window down to the criterion
    const goal = P.SETTLE_GAP_DRIFT * P.YARN_DIAMETER, d = Number.isFinite(this.drift) ? Math.max(goal, this.drift) : 10;
    const byDrift = Math.min(1, Math.max(0, Math.log(10 / d) / Math.log(10 / goal)));
    return Math.max(this.settleFrames / P.SETTLE_MAX_FRAMES, Math.min(this.settleFrames / P.SETTLE_WINDOW, 1) * byDrift);
  }

  finishSettle() {
    this.phase = 'settled';
    this.settledAt = { frames: this.settleFrames, simSeconds: this.settleFrames * this.P.FRAME_DT, ms: this.timing.totalMs, steps: this.timing.steps, hitCap: !(this.drift < this.P.SETTLE_GAP_DRIFT * this.P.YARN_DIAMETER) };
    this.settledPos = new Float64Array(this.x);
  }

  // Clamp the jaws where the settled swatch lies: course 0 pinned, the last course driven.
  clampJaws() { this.restHeight = this.jawGap(); this.restOffset = this.pullOffset; }
  startPull(auto = true) {
    if (this.phase === 'settling') this.finishSettle();
    if (!this.restHeight) this.clampJaws();
    this.phase = 'pulling'; this.pullAuto = auto; this.strainStopped = false;
    if (auto) this.pullTarget = this.restOffset + this.P.PULL_MAX_EXTENSION * this.restHeight;
  }
  setPullTarget(off) { this.pullTarget = Math.max(this.restOffset - 0.3 * this.restHeight, off); }
  // Copy / restore the dynamic state (positions, velocities, jaws), for comparing runs from one
  // settled swatch. Not used by the page.
  snapshot() { return { x: new Float64Array(this.x), v: new Float64Array(this.v), pullOffset: this.pullOffset, combLoad: this.combLoad, phase: this.phase, restHeight: this.restHeight, restOffset: this.restOffset, frame: this.frame }; }
  restore(sn) { this.x.set(sn.x); this.v.set(sn.v); Object.assign(this, { pullOffset: sn.pullOffset, combLoad: sn.combLoad, phase: sn.phase, restHeight: sn.restHeight, restOffset: sn.restOffset, frame: sn.frame, builtAt: null }); }

  meanY(g) { let y = 0, k = 0; for (let i = 0; i < this.n; i++) if (this.grip[i] === g) { y += this.x[3 * i + 1]; k++; } return y / k; }
  combY() { return this.pins[0].y + this.pullOffset; }
  // jaw to jaw: the comb's pins against the bottom jaw's mean height
  jawGap() { return this.combY() - this.bottomY; }
  extension() { return this.restHeight ? this.jawGap() / this.restHeight - 1 : 0; }

  // Largest segment strain, signed (positive = stretched).
  maxStrain() {
    let m = 0;
    for (let i = 0; i < this.nSeg; i++) { const e = this.dist(i, i + 1) / this.rest[i] - 1; if (Math.abs(e) > Math.abs(m)) m = e; }
    return m;
  }

  // ---- the pass-through certificate (audit mode). Two segments whose endpoints each move in a
  // straight line between two substeps change their distance by at most the sum of their
  // endpoints' largest displacements. So if every pair's distance at the start of a substep
  // exceeds that sum, no yarn crossed any yarn during it. Pairs not on the list started farther
  // apart than the list's reach. A substep where some pair FAILS the inequality is not proof of
  // a pass-through — only that this argument cannot rule one out — and it is counted.
  auditBefore() {
    if (this.pairsStale()) this.findPairs();
    const np = this.nPairs, cs = this.cs, x = this.x;
    if (!this.audA || this.audA.length < np) { this.audA = new Int32Array(np * 2); this.audB = new Int32Array(np * 2); this.audD = new Float64Array(np * 2); }
    let m = Infinity;
    for (let p = 0; p < np; p++) {
      const a = this.pairA[p], b = this.pairB[p];
      this.audA[p] = a; this.audB[p] = b;
      const d = Math.sqrt(closest(x, a, a + 1, b, b + 1, cs));
      this.audD[p] = d;
      if (this.w[a] + this.w[a + 1] + this.w[b] + this.w[b + 1] > 0 && d < m) m = d;
    }
    this.audN = np;
    if (m < this.stats.minDist) this.stats.minDist = m;
  }
  auditAfter() {
    const x = this.x, pr = this.prev, n = this.n;
    if (!this.disp || this.disp.length !== n) this.disp = new Float64Array(n);
    let maxDisp = 0;
    for (let i = 0; i < n; i++) { const d = Math.hypot(x[3 * i] - pr[3 * i], x[3 * i + 1] - pr[3 * i + 1], x[3 * i + 2] - pr[3 * i + 2]); this.disp[i] = d; if (d > maxDisp) maxDisp = d; }
    let worst = Infinity, fails = 0;
    for (let p = 0; p < this.audN; p++) {
      const a = this.audA[p], b = this.audB[p];
      const margin = this.audD[p] - Math.max(this.disp[a], this.disp[a + 1]) - Math.max(this.disp[b], this.disp[b + 1]);
      if (margin < worst) worst = margin;
      if (margin <= 0) fails++;
    }
    // pairs off the list: at the build their midpoints were more than cellSize() apart, so the
    // segments (each at most 1.15 seg long — the strain is reported) more than cellSize() -
    // 1.15 seg; every point has since moved less than CONTACT_MARGIN/2.
    const offList = this.cellSize() - this.seg * 1.15 - this.P.CONTACT_MARGIN * this.P.YARN_DIAMETER - 2 * maxDisp;
    if (offList < worst) worst = offList;
    this.stats.certSteps++;
    if (fails > 0 || offList <= 0) this.stats.certFail++;
    if (worst < this.stats.worstMargin) this.stats.worstMargin = worst;
  }

  // Smallest distance between any two non-neighbouring segments (centreline to centreline).
  minPairDistance() {
    if (this.pairsStale()) this.findPairs();
    let m = Infinity; const cs = this.cs;
    for (let p = 0; p < this.nPairs; p++) { if (this.bothPinned(p)) continue; const d2 = closest(this.x, this.pairA[p], this.pairA[p] + 1, this.pairB[p], this.pairB[p] + 1, cs); if (d2 < m) m = d2; }
    return Math.sqrt(m);
  }
  // Pairs of two pinned segments (inside the bottom jaw) never move and are not the solver's.
  bothPinned(p) { const a = this.pairA[p], b = this.pairB[p], w = this.w; return w[a] + w[a + 1] + w[b] + w[b + 1] === 0; }
  // Pairs closer than frac·d (a contact violation at that depth) and the smallest distance.
  countOverlaps(frac = 0.5) {
    if (this.pairsStale()) this.findPairs();
    const lim = frac * this.P.YARN_DIAMETER, lim2 = lim * lim, cs = this.cs;
    let pairs = 0, m = Infinity;
    for (let p = 0; p < this.nPairs; p++) { if (this.bothPinned(p)) continue; const d2 = closest(this.x, this.pairA[p], this.pairA[p] + 1, this.pairB[p], this.pairB[p] + 1, cs); if (d2 < lim2) pairs++; if (d2 < m) m = d2; }
    return { pairs, min: Math.sqrt(m) };
  }

  bounds() {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < this.n; i++) {
      const a = this.x[3 * i], b = this.x[3 * i + 1], c = this.x[3 * i + 2];
      if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; if (c < z0) z0 = c; if (c > z1) z1 = c;
    }
    return { x0, x1, y0, y1, z0, z1 };
  }
}

function hash3(i, j, k) { return Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791); }
const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
