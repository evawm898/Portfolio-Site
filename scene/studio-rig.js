// scene/studio-rig.js — the cat's drawable skeleton. DOM-free.
//
// studio-cat.js decides where things ARE: the root, the hip and shoulder, the
// paws, the head's yaw and pitch, the tail's three springs. This file decides
// what that LOOKS like: a spine through the hip and shoulder bowed by `arch`,
// legs solved by two-bone IK down to the paws the motion planted, a head that
// turns in three dimensions (so a cat that looks at the viewer shows both ears
// and both eyes), and a tail sprung off the rump. It owns no time and decides
// nothing about motion.
//
// EVERYTHING IS LAID OUT IN THE CAT'S LOCAL FRAME — u forward along the heading,
// v up, w to the side — then bent (a sleeping curl bends the whole animal round
// in plan), then carried to the world. Primitives come out in world centimetres
// and the drawing projects them, so the rig never sees a screen.
//
// A BLACK CAT IS A SILHOUETTE, so overlap order only matters where it can be
// seen: the FAR legs are drawn a shade lighter than the body and before it, the
// NEAR legs after it, and the eyes last. That is the whole depth story here.

import { local2world, toeWorld, world2local, FOOT_NAMES } from './studio-cat.js';
import { CAMERA } from './studio-room.js';

const THIGH = 10.5, SHIN = 10.5, META = 7.5;
const UPPER = 9.6, FORE = 9.9;
const FOOT_W = [3.6, -3.6, 4.0, -4.0];
const TAIL_N = 12, TAIL_SEG = 2.4;

// THE SHOULDER BLADE SLIDES, AND THE LIMB NEVER SNAPS STRAIGHT. A cat's
// scapula is not fixed to its ribs, so a reaching foreleg starts a little
// further toward its paw than a standing one; `slide` is how far the
// attachment may follow. Two-bone IK has a singularity at full extension —
// the knee angle is acos of something reaching 1, whose derivative is
// infinite — so a limb driven to its length WHIPS its knee straight in a frame.
// Here the span the bones are asked for is a SOFT limit: above SOFT_FROM of
// the full length it approaches (never reaches) the full length smoothly, and
// the difference is taken up by the slide (smoothly capped at `slide`). Only
// past both is the paw out of reach, and `over` says by how much.
const SOFT_FROM = 0.86, SOFT_TOP = 0.985;
// tanh: slope 1 and curvature 0 where it takes over, so the knee's motion
// stays continuous in its acceleration too, not only its velocity
function softSpan(d, full) {
  const d0 = SOFT_FROM * full, top = SOFT_TOP * full, w = top - d0;
  if (d <= d0) return d;
  return d0 + w * Math.tanh((d - d0) / w);
}
// and the same at the folded end, where the bones cannot overlap
function softFloor(d, low) {
  const band = 1.2;
  if (d >= low + band) return d;
  return low + band * (1 + Math.tanh((d - low - band) / band));
}
const softCap = (x, cap) => (cap <= 0 ? 0 : cap * Math.tanh(x / cap));
function ik2(ax, ay, bx, by, l1, l2, sign, slide = 0) {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  const full = l1 + l2;
  const ext = d / full;
  const want = softSpan(d, full);
  const m = softCap(d - want, slide);
  if (m > 0 && d > 1e-9) { ax += dx * m / d; ay += dy * m / d; dx = bx - ax; dy = by - ay; d = Math.hypot(dx, dy); }
  const dmax = softSpan(1e9, full) - 1e-6, dmin = Math.abs(l1 - l2) + 0.2;
  let reached = true;
  // past the slide's reach the soft span still bends the limb short of its
  // paw: that shortfall is the paw drawn off its plant
  const span = Math.min(d, want);
  const over = Math.max(0, d - span);
  if (over > 1e-6) { dx *= span / d; dy *= span / d; d = span; reached = over < 0.05; }
  void dmax;
  { const d2 = softFloor(d, dmin); if (d2 !== d) { const k = d2 / Math.max(1e-6, d); dx *= k; dy *= k; d = d2; } }
  const base = Math.atan2(dy, dx);
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a = Math.acos(c);
  return { ax, ay, jx: ax + l1 * Math.cos(base + sign * a), jy: ay + l1 * Math.sin(base + sign * a), ex: ax + dx, ey: ay + dy, reached, over, ext, slid: m };
}

// The sleeping curl: the body's centre line bent onto an arc in plan.
// Written so it has no switch-over at small bend: sin(ku)/k and (1-cos ku)/k
// are carried through sinc, which is smooth through zero — a cutoff here was
// a jump in the drawing every time a cat uncurled past it.
const sinc = (x) => (Math.abs(x) < 1e-4 ? 1 - x * x / 6 : Math.sin(x) / x);
function bender(b) {
  if (b === 0) return (u, v, w) => [u, v, w];
  const k = b * Math.PI / 30;
  return (u, v, w) => {
    const s = Math.sin(k * u), c = Math.cos(k * u), h = k * u / 2;
    return [u * sinc(k * u) - w * s, v, Math.sin(h) * u * sinc(h) + w * c];
  };
}

export function solveRig(cat) {
  const c = cat.ch;
  const B = bender(c.bend);
  const W = (u, v, w) => { const q = B(u, v, w); return local2world(cat, q[0], q[1], q[2]); };
  const breathe = Math.sin(cat.breath * Math.PI * 2);

  // --- torso
  const hip = [c.hipU, c.hipH], sh = [c.shU, c.shH];
  const du = sh[0] - hip[0], dv = sh[1] - hip[1];
  const L = Math.hypot(du, dv) || 1;
  const d = [du / L, dv / L], n = [-d[1], d[0]];
  const sway = c.hipSway;
  const at = (k, up, w = 0) => [hip[0] + d[0] * L * k + n[0] * up, hip[1] + d[1] * L * k + n[1] * up, w];
  const archOff = (k) => c.arch * Math.sin(Math.PI * Math.max(0, Math.min(1, k)));
  const spine = [
    { q: at(-0.16, 0.9, sway), r: 5.6 },
    { q: at(0.0, 0.4 + archOff(0.0), sway * 0.8), r: 6.6 },
    { q: at(0.24, -0.6 + archOff(0.24), sway * 0.5), r: 7.3 + 0.25 * breathe },
    { q: at(0.5, -1.0 + archOff(0.5), sway * 0.25), r: 7.6 + 0.35 * breathe },
    { q: at(0.76, -1.1 + archOff(0.76), 0), r: 7.3 + 0.3 * breathe },
    { q: at(1.0, -0.9, 0), r: 6.6 },
  ];
  const neckBase = [sh[0] + d[0] * 3.6 + n[0] * 3.6, sh[1] + d[1] * 3.6 + n[1] * 3.6, 0];
  spine.push({ q: neckBase, r: 4.4 });

  // --- head, in three dimensions
  const H = cat.head;
  const yaw = H.yaw, pitch = H.pitch;
  const e = c.neck + 0.45 * pitch;
  const ny = yaw * 0.55;
  const hc = [neckBase[0] + 6.1 * Math.cos(e) * Math.cos(ny), neckBase[1] + 6.1 * Math.sin(e), 6.1 * Math.cos(e) * Math.sin(ny)];
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const hf = [cp * cy, sp, cp * sy];              // facing
  const hs = [-sy, 0, cy];                          // its side
  const hu = [-sp * cy, cp, -sp * sy];              // its up
  const add = (p, ...terms) => { const r = [...p]; for (const [k, v] of terms) { r[0] += v[0] * k; r[1] += v[1] * k; r[2] += v[2] * k; } return r; };
  const head = { c: hc, r: 4.7 };
  const muzzle = { c: add(hc, [3.3, hf], [-1.4, hu]), r: 2.55 };
  const ears = [1, -1].map((sg) => {
    const flick = sg > 0 ? c.earL : c.earR;
    const base = add(hc, [3.0, hu], [2.35 * sg, hs], [-0.7, hf]);
    const tip = add(base, [3.9 - 1.4 * flick, hu], [-1.2 - 2.4 * flick, hf], [(0.7 + 1.6 * flick) * sg, hs]);
    return [add(base, [1.55, hf]), tip, add(base, [-1.55, hf])];
  });
  const eyes = [1, -1].map((sg) => ({
    c: add(hc, [3.25, hf], [0.95, hu], [1.85 * sg, hs]),
    nrm: add([0, 0, 0], [0.72, hf], [0.62 * sg, hs], [0.1, hu]),
    open: Math.max(0, 1 - Math.max(c.blink, c.lid)),
  }));

  // --- legs
  const legs = [];
  let unreached = 0, over = 0, ext = 0, lastOver = 0;
  for (let i = 0; i < 4; i++) {
    const fore = i < 2;
    const toe = world2local(cat, toeWorld(cat, i));
    const aw = FOOT_W[i] + (fore ? 0 : sway * 0.8);
    const A = fore ? [sh[0] - d[0] * 1.2 - n[0] * 2.4, sh[1] - d[1] * 1.2 - n[1] * 2.4]
                   : [hip[0] - n[0] * 1.2, hip[1] - n[1] * 1.2];
    let pts, widths;
    if (fore) {
      const wrist = [toe[0] - 1.5, toe[1] + 2.3];
      const s = ik2(A[0], A[1], wrist[0], wrist[1], UPPER, FORE, -1, 3.2);
      if (!s.reached) unreached++;
      over = Math.max(over, s.over); ext = Math.max(ext, s.ext); lastOver = s.over;
      pts = [[s.ax, s.ay], [s.jx, s.jy], [s.ex, s.ey], [s.ex + 1.5, s.ey - 2.3]];
      widths = [4.6, 3.3, 2.9, 2.6];
    } else {
      const hockAng = c.hock;
      const hock = [toe[0] - META * Math.sin(hockAng), toe[1] + META * Math.cos(hockAng)];
      const s = ik2(A[0], A[1], hock[0], hock[1], THIGH, SHIN, +1, 1.6);
      if (!s.reached) unreached++;
      over = Math.max(over, s.over); ext = Math.max(ext, s.ext); lastOver = s.over;
      pts = [[s.ax, s.ay], [s.jx, s.jy], [s.ex, s.ey], [s.ex + META * Math.sin(hockAng), s.ey - META * Math.cos(hockAng)]];
      widths = [6.4, 3.8, 3.0, 2.7];
    }
    const tw = toe[2];
    const world = pts.map((p, k) => W(p[0], p[1], aw + (tw - aw) * (k / 3)));
    legs.push({ i, fore, name: FOOT_NAMES[i], pts: world, widths, paw: world[3], over: lastOver });
  }

  // --- tail
  const tail = [];
  const T = cat.tail;
  let p = at(-0.2, 1.6, sway);
  tail.push({ p: W(p[0], p[1], p[2]), r: 1.45 });
  const torsoAng = Math.atan2(d[1], d[0]);
  for (let k = 1; k <= TAIL_N; k++) {
    const f = k / TAIL_N;
    const th = Math.PI + torsoAng - T.a - T.c * f * 1.1 + 0.15 * f * f;
    const ph = T.s * f * 1.25;
    const dir = [Math.cos(th) * Math.cos(ph), Math.sin(th), Math.sin(ph) * 0.95];
    const m = Math.hypot(dir[0], dir[1], dir[2]);
    p = [p[0] + TAIL_SEG * dir[0] / m, p[1] + TAIL_SEG * dir[1] / m, p[2] + TAIL_SEG * dir[2] / m];
    tail.push({ p: W(p[0], p[1], p[2]), r: 1.35 - 0.62 * f });
  }

  // --- which side faces the camera
  const toCam = (q) => Math.hypot(q[0] - CAMERA.x, q[1] - CAMERA.y, q[2] - CAMERA.z);
  const nearSign = toCam(local2world(cat, 0, 10, 6)) < toCam(local2world(cat, 0, 10, -6)) ? 1 : -1;

  return {
    spine: spine.map(s => ({ p: W(s.q[0], s.q[1], s.q[2]), r: s.r })),
    head: { c: W(...head.c), r: head.r },
    muzzle: { c: W(...muzzle.c), r: muzzle.r },
    ears: ears.map(tri => tri.map(q => W(q[0], q[1], q[2]))),
    eyes: eyes.map(ey => {
      // the normal is a direction: carry it as the difference of two points
      const a = W(...ey.c), b = W(ey.c[0] + ey.nrm[0], ey.c[1] + ey.nrm[1], ey.c[2] + ey.nrm[2]);
      return { c: a, n: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], open: ey.open };
    }),
    legs, tail, nearSign, unreached, over, ext,
  };
}
