// scene/studio-cat.js — ONE CAT: its state, its channels, its feet, and the
// programs that move it. DOM-free; the gate drives it in Node.
//
// WHAT A CAT IS, AS DATA. A cat is a plain object — numbers and arrays, no
// functions, no class — so the dev harness can snapshot one with
// structuredClone and replay a jump from it bit for bit (scrub and replay are
// exactly that). Its randomness is its OWN stream, carried in the snapshot.
//
//   pos [x,y,z], h        the ROOT: the ground point under the body's centre,
//                         and the heading (atan2(dz,dx)). Grounded, pos[1] is
//                         the surface's height; airborne it is the body centre
//                         less H_STAND, which is what makes "the arc" one
//                         well-defined curve (see flight below).
//   ch {...}              the CHANNELS — every number the pose is drawn from.
//   tw {ch: queue}        eased tweens on channels. There is no linear ease:
//                         `tween()` refuses one by name (EASE has none).
//   feet[4]               FL, FR, HL, HR: planted / swinging / airborne.
//   head, tail            spring-driven — a head snaps to what it looks at, a
//                         tail lags the body it hangs from.
//   prog                  the running program: a list of phases, each data.
//
// THE MOTION RULES THE BRIEF MAKES, AND WHERE EACH IS KEPT:
//   * no linear easing anywhere: every channel moves by an EASE curve, a spring,
//     a parabola under constant gravity, or a drag-decayed glide; walking speed
//     surges with the gait. The gate samples every channel and fails on a run
//     of constant non-zero slope.
//   * every duration is drawn per instance from TIMING when the PLAN is made,
//     so a replay replays the same draws and nothing else does.
//   * an up-jump is seven phases (notice, approach, gather, launch, flight,
//     land, settle); a down-jump is a different program (notice, approach,
//     peer, reach, pour, fall, land, settle) — not the up-jump reversed.
//   * forepaws come down first and the hind paws 60-100 ms later BY
//     CONSTRUCTION: the flight is solved so the posed forepaw meets the target
//     surface at the arc's end, and the hind paws are swung down after it.

import { NODES, EDGES, edgeById, nodePath, restSpot, onSurface, CAMERA, STANDOFF_K, FORE_TOE_U, HIND_TOE_U, BODY_SPAN, standoffLaunch } from './studio-room.js';

// -------------------------------------------------------------- timing ----
// Every range is [min, max] in MILLISECONDS. The dev harness edits this object
// live; nothing caches a value from it.
export const TIMING = {
  notice: [200, 400],
  standUp: [380, 620],
  gather: [500, 1200],
  holdExtra: [300, 300],       // the occasional extra hold at the bottom
  abortRise: [380, 560],
  abortPause: [420, 900],
  launch: [80, 120],
  flight: [250, 450],          // by height: the low end for a low rise
  hindLag: [60, 100],
  compress: [120, 180],
  recover: [130, 170],
  settle: [300, 800],
  // the down-jump
  peer: [160, 380],
  reach: [180, 320],
  pour: [170, 300],
  downHindLag: [70, 120],
  downCompress: [180, 260],
  downRecover: [170, 240],
  // posture changes and actions
  pose: [520, 900],
  stretch: [2300, 3300],
  groom: [3000, 5600],
  look: [1600, 3200],
  wake: [1400, 2400],
};

export const CHANCE = { hold: 0.22, abort: 0.12, tread: 0.55, wiggle: 0.6 };

export const APEX_FRAC = [0.15, 0.25];  // the apex above the landing surface, of the rise
export const RISE_FOR_FLIGHT = [20, 80]; // the rise that maps onto TIMING.flight's ends
export const DRAG = 0.55;                // 1/s — horizontal flight is near-linear, not linear
export const G_FALL = 981;               // cm/s^2, the step-off drop is free fall
export const H_STAND = 21;               // body-centre height standing, cm
export const TORSO = 24;

// ------------------------------------------------------------- easing ----
// THERE IS NO LINEAR EASE, and asking for one throws. The names survive as
// SHAPES: since the continuity pass every tween is a quintic Hermite segment
// (below), and a name only says where its progress is front- or back-loaded.
// The EASE curves themselves are kept so that a name always has a curve to
// point at — `tween()` refuses a name with none.
export const EASE = {
  inOut: (t) => t * t * t * (t * (t * 6 - 15) + 10),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  in: (t) => t * t * t,
  inQuad: (t) => t * t,
  sine: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
};

// HOW A NAME SKEWS A SEGMENT. `out` loads the progress early (a flick, an
// impact absorbed), `in` late; the symmetric names add nothing. The skew term
// is k^3 (1-k)^3, which vanishes with its first two derivatives at both ends,
// so it moves WHEN the progress happens and never what a seam carries. A skew
// up to 10 keeps a rest-to-rest segment monotonic.
export const SKEW = { inOut: 0, inOutCubic: 0, sine: 0, out: 8, outQuad: 5, in: -8, inQuad: -5 };

// THE QUINTIC HERMITE SEGMENT. Position, velocity and acceleration are given
// at both ends, so two segments meeting at a seam agree in all three: this is
// the whole of the continuity rule. `T` is the duration, `k` in [0, 1].
// Returns [x, v, a] with v and a per SECOND.
export function herm5(p0, v0, a0, p1, v1, a1, T, k, skew = 0) {
  k = Math.max(0, Math.min(1, k));
  const k2 = k * k, k3 = k2 * k, k4 = k3 * k, k5 = k4 * k;
  const TT = T * T;
  const x = (1 - 10 * k3 + 15 * k4 - 6 * k5) * p0 + (k - 6 * k3 + 8 * k4 - 3 * k5) * T * v0
    + (0.5 * k2 - 1.5 * k3 + 1.5 * k4 - 0.5 * k5) * TT * a0
    + (10 * k3 - 15 * k4 + 6 * k5) * p1 + (-4 * k3 + 7 * k4 - 3 * k5) * T * v1 + (0.5 * k3 - k4 + 0.5 * k5) * TT * a1
    + skew * (p1 - p0) * (k3 - 3 * k4 + 3 * k5 - k5 * k);
  const d = (-30 * k2 + 60 * k3 - 30 * k4) * p0 + (1 - 18 * k2 + 32 * k3 - 15 * k4) * T * v0
    + (k - 4.5 * k2 + 6 * k3 - 2.5 * k4) * TT * a0
    + (30 * k2 - 60 * k3 + 30 * k4) * p1 + (-12 * k2 + 28 * k3 - 15 * k4) * T * v1 + (1.5 * k2 - 4 * k3 + 2.5 * k4) * TT * a1
    + skew * (p1 - p0) * (3 * k2 - 12 * k3 + 15 * k4 - 6 * k5);
  const dd = (-60 * k + 180 * k2 - 120 * k3) * p0 + (-36 * k + 96 * k2 - 60 * k3) * T * v0
    + (1 - 9 * k + 18 * k2 - 10 * k3) * TT * a0
    + (60 * k - 180 * k2 + 120 * k3) * p1 + (-24 * k + 84 * k2 - 60 * k3) * T * v1 + (3 * k - 12 * k2 + 10 * k3) * TT * a1
    + skew * (p1 - p0) * (6 * k - 36 * k2 + 60 * k3 - 30 * k4);
  return [x, d / T, dd / TT];
}

// A curve held as data (so a snapshot carries it): a quintic segment that
// starts at time t0. Evaluated at absolute time t; past its end it holds its
// end state.
export const seg5 = (t0, d, p0, v0, a0, p1, v1 = 0, a1 = 0, skew = 0) => ({ t0, d: Math.max(1e-4, d), p0, v0, a0, p1, v1, a1, skew });
export function evalSeg(S, t) {
  const tt = t - S.t0;
  if (tt >= S.d) { const r = herm5(S.p0, S.v0, S.a0, S.p1, S.v1, S.a1, S.d, 1, S.skew); return [r[0] + S.v1 * (tt - S.d), S.v1, 0]; }
  return herm5(S.p0, S.v0, S.a0, S.p1, S.v1, S.a1, S.d, tt / S.d, S.skew);
}

// ------------------------------------------------------------ postures ----
export const POSTURE = {
  stand: { hipU: -12, hipH: 20.5, shU: 12, shH: 22.5, arch: 0.8, hock: 0.35, neck: 0.9, len: TORSO, bend: 0, lid: 0 },
  sit: { hipU: -10, hipH: 5.5, shU: 5.3, shH: 24, arch: 0.4, hock: 1.35, neck: 1.15, len: TORSO, bend: 0, lid: 0 },
  loaf: { hipU: -12, hipH: 8.2, shU: 11.6, shH: 9.8, arch: 1.4, hock: 1.45, neck: 0.75, len: TORSO, bend: 0, lid: 0.25 },
  curl: { hipU: -12, hipH: 7.4, shU: 11.4, shH: 7.8, arch: 2.2, hock: 1.45, neck: 0.15, len: TORSO, bend: 1, lid: 1 },
};

const CHANNELS0 = {
  ...POSTURE.stand,
  foreAirU: 2, foreAirV: -21, hindAirU: -1, hindAirV: -19,
  airFL: 0, airFR: 0, airHL: 0, airHR: 0,
  liftFL: 0, liftFR: 0, liftHL: 0, liftHR: 0,
  tailUp: 0.45, tailCurl: 0.9, tailSway: 0,
  earL: 0, earR: 0, blink: 0, hipSway: 0,
};

export const FOOT_NAMES = ['FL', 'FR', 'HL', 'HR'];
const FOOT_W = [3.6, -3.6, 4.0, -4.0];

// ------------------------------------------------------------- the rng ----
// mulberry32, as rng.js, but with its state in the cat so a snapshot carries it.
export function rnd(cat) {
  let a = cat.rs | 0; a = (a + 0x6D2B79F5) | 0; cat.rs = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (cat, r) => (r[0] + (r[1] - r[0]) * rnd(cat)) / 1000; // ms range -> seconds
const chance = (cat, p) => rnd(cat) < p;

// ------------------------------------------------------------- the cat ----
export function createCat({ id, seed, node, x, z, heading, posture = 'sit' }) {
  const y = NODES[node].y;
  const cat = {
    id, rs: (seed >>> 0) || 1, t: 0,
    node, pos: [x, y, z], h: heading,
    hv: 0,                       // heading angular velocity (spring)
    hT: heading, hS: heading,    // the heading's target, and that target smoothed
    ch: { ...CHANNELS0, ...POSTURE[posture] },
    chv: {}, cha: {}, chPrev: null, // every channel's rate, measured or analytic
    tw: {},
    toeP: null, toeV: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], toeA: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
    feet: FOOT_NAMES.map((n, i) => ({ n, mode: 'plant', p: [0, y, 0], sw: null, y })),
    head: { yaw: 0, pitch: 0.1, vy: 0, vp: 0, ty: 0, tp: 0.1, sy: 0, sp: 0.1, look: null, omega: 9 },
    tail: { a: 0.45, av: 0, c: 0.9, cv: 0, s: 0, sv: 0, ph: 0 },
    breath: 0, gait: 0, speed: 0,
    stepping: true,
    defer: [],                   // swings to make at the end of this step
    walk: null,
    free: null,                  // airborne: the jump plane and the arc
    span: null,                  // stepping across a gap: the two surfaces
    prog: null,
    posture,
    asleep: posture === 'curl',
    idle: { blink: 2, ear: 4, look: 6 },
    Cprev: null, Cvel: [0, 0, 0], Cacc: [0, 0, 0],
    events: [],                  // contact and phase events, bounded
    lastAction: null,
    lastArc: null,               // the most recent solved arc, for the dev overlay
    action: null,                // name of the running program, for the director
  };
  homeFeet(cat, true);
  return cat;
}

// ------------------------------------------------------- frame helpers ----
export const fwd = (h) => [Math.cos(h), Math.sin(h)];
export const side = (h) => [-Math.sin(h), Math.cos(h)];

export function local2world(cat, u, v, w) {
  const f = fwd(cat.h), s = side(cat.h);
  return [cat.pos[0] + f[0] * u + s[0] * w, cat.pos[1] + v, cat.pos[2] + f[1] * u + s[1] * w];
}
export function world2local(cat, p) {
  const f = fwd(cat.h), s = side(cat.h);
  const dx = p[0] - cat.pos[0], dz = p[2] - cat.pos[2];
  return [dx * f[0] + dz * f[1], p[1] - cat.pos[1], dx * s[0] + dz * s[1]];
}

export function bodyCentre(cat) {
  const c = cat.ch;
  return local2world(cat, (c.hipU + c.shU) / 2, (c.hipH + c.shH) / 2, 0);
}

function attachLocal(cat, i) {
  const c = cat.ch;
  return i < 2 ? [c.shU, c.shH] : [c.hipU, c.hipH];
}

// A foot's home on the surface under its shoulder or hip, for the posture the
// channels currently describe. Sitting draws the hind paws in under the hip.
function homeLocal(cat, i, lead = 0) {
  const c = cat.ch;
  const sitness = Math.max(0, Math.min(1, (c.hock - 0.35) / 1.0));
  const u = i < 2 ? c.shU + 1.2 : c.hipU + (-0.5 + 4.5 * sitness);
  return [u + lead, FOOT_W[i]];
}

export function toeWorld(cat, i) {
  const f = cat.feet[i];
  if (f.mode === 'swing') return swingAt(f.sw);
  const air = cat.ch['air' + f.n];
  const lift = cat.ch['lift' + f.n];
  const base = [f.p[0], f.p[1] + lift, f.p[2]];
  if (air <= 0) return base;
  const c = cat.ch;
  const [au, av] = attachLocal(cat, i);
  const posed = local2world(cat, au + (i < 2 ? c.foreAirU : c.hindAirU), av + (i < 2 ? c.foreAirV : c.hindAirV), FOOT_W[i]);
  // a pair shares one posed offset; a paw lifted off a plant that sat apart
  // from its pair keeps the difference and lets it go smoothly
  if (f.corr) {
    const k = Math.min(1, Math.max(0, (cat.t - f.corr.t0) / f.corr.T));
    const w = 1 - EASE.inOut(k);
    for (let j = 0; j < 3; j++) posed[j] += f.corr.d[j] * w;
    if (k >= 1) f.corr = null;
  }
  if (air >= 1) return posed;
  return [base[0] + (posed[0] - base[0]) * air, base[1] + (posed[1] - base[1]) * air, base[2] + (posed[2] - base[2]) * air];
}

// A SWING IS ONE CONTINUOUS CURVE: a quintic Hermite per axis from where the
// paw is, moving as it is moving (a paw leaving a body mid-flight keeps the
// body's velocity), to its plant, at rest; plus a lift that vanishes with its
// first two derivatives at both ends, so a paw neither pops off the surface
// nor slaps onto it.
function swingAt(sw) {
  const k = Math.max(0, Math.min(1, sw.t / sw.d));
  const v0 = sw.v0 || [0, 0, 0], a0 = sw.a0 || [0, 0, 0];
  const out = [0, 0, 0];
  for (let j = 0; j < 3; j++) out[j] = herm5(sw.from[j], v0[j], a0[j], sw.to[j], 0, 0, sw.d, k)[0];
  out[1] += sw.arc * 64 * k * k * k * (1 - k) * (1 - k) * (1 - k);
  return out;
}
function makeSwing(cat, i, to, d, arc, contact = null, extra = {}) {
  const f = cat.feet[i];
  const moving = f.mode !== 'plant' || cat.ch['air' + f.n] > 0;
  const from = toeWorld(cat, i);
  f.mode = 'swing';
  f.sw = { from, to, t: 0, d, arc, contact,
    v0: moving ? [...cat.toeV[i]] : [0, 0, 0], a0: moving ? [...cat.toeA[i]] : [0, 0, 0], ...extra };
  cat.ch['air' + f.n] = 0;
  delete cat.tw['air' + f.n];
}

// WHERE A PAW COMES DOWN. On one surface, its height. Stepping across a gap
// (`cat.span`), the height of whichever of the two surfaces is under it — and a
// paw that would come down in the gap is carried on to the far side, which is
// what makes it a step ACROSS rather than a walk through air.
// how far past its gait spot a paw may be carried to clear a gap: a step
// further than this is one the leg cannot make, so the paw waits on the near
// edge for the next stride
const SPAN_REACH = 3;
function placePaw(cat, to) {
  const S = cat.span;
  if (!S) { to[1] = cat.pos[1]; return to; }
  const f = fwd(cat.h);
  // the nearer edge: on over the gap if that is a short reach, else wait on
  // this side for the next step
  for (let k = 0; k <= 30; k++) {
    for (const sg of k ? [1, -1] : [1]) {
      if (sg > 0 && k > SPAN_REACH) continue;
      const x = to[0] + f[0] * k * sg, z = to[2] + f[1] * k * sg;
      for (const n of [S.b, S.a]) if (onSurface(n, x, z)) {
        to[0] = x; to[2] = z; to[1] = NODES[n].y;
        return to;
      }
    }
  }
  to[1] = cat.pos[1];
  return to;
}

function plantAt(cat, i, p) {
  const f = cat.feet[i];
  f.mode = 'plant'; f.sw = null; f.p = [p[0], p[1], p[2]]; f.at = cat.t; f.corr = null;
  cat.ch['air' + f.n] = 0; cat.chv['air' + f.n] = 0; cat.cha['air' + f.n] = 0;
  delete cat.tw['air' + f.n];
}

function homeFeet(cat, snap) {
  for (let i = 0; i < 4; i++) {
    const [u, w] = homeLocal(cat, i);
    const p = local2world(cat, u, 0, w);
    if (snap) plantAt(cat, i, p);
  }
}

// --------------------------------------------------------------- tweens ----
/** Ease a channel from wherever it is to `to` over `dur` seconds. A queue
 *  of further legs may follow: tween(cat,'x',[[to1,d1,e1],[to2,d2,e2]]).
 *
 *  CONTINUOUS BY CONSTRUCTION. The first leg starts from the channel's
 *  CURRENT value, velocity and acceleration — whatever was moving it before —
 *  so a tween started mid-motion bends that motion instead of restarting it.
 *  A queued leg passes through its waypoint at the PCHIP slope of its
 *  neighbours (zero at a turn-around or a hold), and the last leg comes to
 *  rest, because a channel nobody drives afterwards is a channel at rest. */
export function tween(cat, ch, to, dur, ease = 'inOut', now = false) {
  const legs = Array.isArray(to) ? to : [[to, dur, ease]];
  for (const l of legs) if (!EASE[l[2] || 'inOut']) throw new Error(`no ease named "${l[2]}" — and there is no linear one`);
  const q = legs.map(l => ({ to: l[0], d: Math.max(1e-4, l[1]), s: SKEW[l[2] || 'inOut'] }));
  const P = [cat.ch[ch], ...q.map(l => l.to)];
  for (let j = 0; j < q.length; j++) {
    if (j === q.length - 1) { q[j].v1 = 0; continue; }
    const m1 = (P[j + 1] - P[j]) / q[j].d, m2 = (P[j + 2] - P[j + 1]) / q[j + 1].d;
    q[j].v1 = m1 * m2 <= 0 ? 0 : 2 * m1 * m2 / (m1 + m2);
  }
  const [v0, a0] = chanRate(cat, ch);
  const first = q.shift();
  // WHEN A TWEEN STARTS. A channel's value during a program step is still the
  // previous step's (stepTweens has not run yet), so a tween begun here starts
  // THEN and this step advances it — except a tween started from a value
  // computed for this very instant (`now`), which this step must not advance.
  cat.tw[ch] = { q, cur: seg5(0, first.d, cat.ch[ch], v0, a0, first.to, first.v1, 0, first.s), t: 0, born: now ? cat.t : null };
}

// A channel's rate of change: the running segment's own derivatives if it has
// one, else what the last step measured.
function chanRate(cat, ch) {
  const tw = cat.tw[ch];
  if (tw) { const r = evalSeg(tw.cur, tw.t); return [r[1], r[2]]; }
  return [cat.chv[ch] || 0, cat.cha[ch] || 0];
}

function stepTweens(cat, dt) {
  for (const ch of Object.keys(cat.tw)) {
    const tw = cat.tw[ch];
    let rem = tw.born === cat.t ? 0 : dt;
    for (;;) {
      const S = tw.cur;
      const take = Math.min(rem, S.d - tw.t);
      tw.t += take; rem -= take;
      if (tw.t < S.d - 1e-12) break;
      // the leg is done: the next one starts from exactly its end state
      if (!tw.q.length) { tw.t = S.d; break; }
      const n = tw.q.shift();
      tw.cur = seg5(0, n.d, S.p1, S.v1, S.a1, n.to, n.v1, 0, n.s);
      tw.t = 0;
      if (rem <= 0) break;
    }
    const r = evalSeg(tw.cur, tw.t);
    cat.ch[ch] = r[0]; cat.chv[ch] = r[1]; cat.cha[ch] = r[2];
    if (tw.t >= tw.cur.d && !tw.q.length) { cat.ch[ch] = tw.cur.p1; delete cat.tw[ch]; }
  }
}
function toPosture(cat, name, dur, ease = 'inOut') {
  const P = POSTURE[name];
  for (const k of Object.keys(P)) tween(cat, k, P[k], dur, ease);
  cat.posture = name;
}

// --------------------------------------------------------------- springs ----
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function spring(x, v, target, omega, dt) {
  // critically damped, semi-implicit
  const a = omega * omega * (target - x) - 2 * omega * v;
  v += a * dt; x += v * dt;
  return [x, v];
}

function headTargets(cat) {
  const H = cat.head;
  if (!H.look) return;
  const c = cat.ch;
  const neck = local2world(cat, c.shU + 4, c.shH + 6, 0);
  const dx = H.look[0] - neck[0], dz = H.look[2] - neck[2], dy = H.look[1] - neck[1];
  const f = fwd(cat.h), s = side(cat.h);
  const lu = dx * f[0] + dz * f[1], lw = dx * s[0] + dz * s[1];
  H.ty = Math.max(-1.9, Math.min(1.9, Math.atan2(lw, lu)));
  H.tp = Math.max(-1.15, Math.min(0.95, Math.atan2(dy, Math.hypot(lu, lw))));
}

// ------------------------------------------------------------- stepping ----
// THE FEET DO NOT SLIDE. A planted paw stays where it is in the world while the
// body moves over it; when it falls too far behind its home it is lifted and
// swung to the home ahead, under a gait rule that keeps three paws down most
// of the time and never lifts both paws of one side or of one pair at once.
// WALKING IS A GAIT, NOT A CHASE. Above a shuffle's speed the paws are lifted
// by a gait clock in a cat's lateral sequence — left hind, left fore, right
// hind, right fore, a quarter-cycle apart — and set down half a stride ahead of
// their homes, so the body passes over each paw rather than dragging it.
export const STRIDE = 20;
const GAIT_OFFSET = [0.25, 0.75, 0, 0.5];
function stepGait(cat) {
  const prev = cat.gaitPrev ?? cat.gait;
  cat.gaitPrev = cat.gait;
  const period = STRIDE / Math.max(8, cat.speed);
  for (let i = 0; i < 4; i++) {
    const off = GAIT_OFFSET[i];
    const f = cat.feet[i];
    // a paw whose beat comes while it is still in the air goes as soon as it lands
    if (Math.floor(prev - off) !== Math.floor(cat.gait - off)) f.due = true;
    // a paw left too far behind its home (one the gap made wait on the near
    // edge) steps now rather than on its beat, if its pair and its side allow
    if (!f.due && f.mode === 'plant') {
      const [hu, hw] = homeLocal(cat, i);
      const h = local2world(cat, hu, 0, hw);
      const lag = Math.hypot(h[0] - f.p[0], h[2] - f.p[2]);
      const pair = cat.feet[i ^ 1];
      const down = cat.feet.filter(q => q.mode === 'plant').length;
      if (lag > STRIDE * 0.62 && pair.mode !== 'swing' && down >= 3) f.due = true;
    }
    if (!f.due || f.mode !== 'plant' || cat.ch['air' + f.n] > 0) continue;
    f.due = false;
    const d = Math.max(0.16, Math.min(0.32, period * 0.36));
    // land half a stride ahead of home, counting what the body covers during the swing
    const [u, w] = homeLocal(cat, i, cat.speed * d + STRIDE * 0.5);
    const to = placePaw(cat, local2world(cat, u, 0, w));
    makeSwing(cat, i, to, d, cat.span ? 4.2 : 3.4, spanContact(cat, i, to));
  }
}

function stepFeet(cat, dt, threshold) {
  if (cat.walk && cat.speed > 8) { stepGait(cat); return; }
  cat.gaitPrev = cat.gait;
  const swinging = cat.feet.filter(f => f.mode === 'swing').length;
  let best = -1, bestErr = 0;
  for (let i = 0; i < 4; i++) {
    const f = cat.feet[i];
    if (f.mode !== 'plant' || cat.ch['air' + f.n] > 0) continue;
    const pair = cat.feet[i ^ 1], same = cat.feet[i ^ 2];
    if (pair.mode === 'swing' || same.mode === 'swing') continue;
    // a paw that has just come down stays down a moment (a stance), and the
    // one down longest goes first — or a diagonal pair can starve the other
    const stance = cat.t - (f.at || 0);
    if (stance < 0.12) continue;
    const [u, w] = homeLocal(cat, i, cat.speed * 0.16);
    const home = local2world(cat, u, 0, w);
    const err = Math.hypot(home[0] - f.p[0], home[2] - f.p[2]) / threshold;
    const score = err * (1 + 2 * Math.min(1, stance / 0.4));
    if (err > 1 && score > bestErr) { best = i; bestErr = score; }
  }
  if (best >= 0 && swinging < 2) {
    const f = cat.feet[best];
    const [u, w] = homeLocal(cat, best, cat.speed * 0.26);
    const to = placePaw(cat, local2world(cat, u, 0, w));
    void f;
    makeSwing(cat, best, to, cat.speed > 8 ? 0.27 : 0.21, cat.span ? 4.2 : cat.speed > 8 ? 3.4 : 2.2, spanContact(cat, best, to));
  }
}

// the first fore and first hind paw onto the far surface of a step across
function spanContact(cat, i, to) {
  const S = cat.span;
  if (!S || Math.abs(to[1] - NODES[S.b].y) > 1e-9 || !onSurface(S.b, to[0], to[2])) return null;
  const k = i < 2 ? 0 : 1;
  if (S.claimed[k]) return null;
  S.claimed[k] = true;
  return k ? 'hindContact' : 'foreContact';
}

function stepSwings(cat, dt) {
  for (let i = 0; i < 4; i++) {
    const f = cat.feet[i];
    if (f.mode !== 'swing') continue;
    // a swing made at the end of a step (from that instant's paw) first moves
    // on the next; one made by a program this step starts from the previous
    // step's paw, so this step advances it
    if (f.sw.born === cat.t) continue;
    f.sw.t += dt;
    if (f.sw.t >= f.sw.d) {
      const { to, contact } = f.sw;
      plantAt(cat, i, to);
      if (contact) event(cat, contact, { foot: f.n });
    }
  }
}

function event(cat, type, extra = {}) {
  cat.events.push({ type, t: cat.t, ...extra });
  if (cat.events.length > 200) cat.events.splice(0, cat.events.length - 200);
}

// --------------------------------------------------------------- walking ----
// The root follows a path at a speed that eases up, eases down, slows for a
// turn, and SURGES with the gait (a walking cat is not a dolly). Heading is a
// spring toward the path's tangent, and at the end toward `endHeading`, so a
// cat arrives squared up to what it will jump at.
//
// CONTINUITY. The waypoints are joined by a centripetal Catmull-Rom curve, so
// the root's direction never jumps at a corner; the speed is a second-order
// (critically damped) follower of its target, so its acceleration never jumps;
// and the arrival law is v = c rem^(3/4), which brings speed AND deceleration
// to zero together at the end, so a cat that arrives is at rest rather than
// stopped. The heading spring runs on every grounded step, not only while
// walking, so a turn still under way when a walk ends finishes as a turn.
const ARRIVE_C = 6.5;
function crPath(pts) {
  if (pts.length < 3) return pts.map(p => [p[0], p[1]]);
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [[pts[0][0], pts[0][1]]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    if (L < 1e-6) continue;
    const t01 = Math.sqrt(Math.max(1e-6, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]))) || 1e-3;
    const t12 = Math.sqrt(L), t23 = Math.sqrt(Math.max(1e-6, Math.hypot(p3[0] - p2[0], p3[1] - p2[1]))) || 1e-3;
    const m1 = [0, 1].map(j => (p2[j] - p1[j]) + t12 * ((p1[j] - p0[j]) / t01 - (p2[j] - p0[j]) / (t01 + t12)));
    const m2 = [0, 1].map(j => (p2[j] - p1[j]) + t12 * ((p3[j] - p2[j]) / t23 - (p3[j] - p1[j]) / (t12 + t23)));
    const n = Math.max(2, Math.ceil(L / 1.5));
    for (let k = 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
      out.push([0, 1].map(j => h00 * p1[j] + h10 * m1[j] + h01 * p2[j] + h11 * m2[j]));
    }
  }
  return out;
}

export function startWalk(cat, pts0, endHeading, vmax) {
  const pts = crPath(pts0);
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push(L); total += L;
  }
  cat.walk = { pts, segs, total, s: 0, v: 0, cv: 0, ca: 0, vmax, endHeading, done: false, t: 0 };
}

function pathAt(w, s) {
  let acc = 0;
  for (let i = 0; i < w.segs.length; i++) {
    if (s <= acc + w.segs[i] || i === w.segs.length - 1) {
      const t = w.segs[i] ? Math.max(0, Math.min(1, (s - acc) / w.segs[i])) : 1;
      const a = w.pts[i], b = w.pts[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    acc += w.segs[i];
  }
  const p = w.pts[w.pts.length - 1];
  return [p[0], p[1], 0];
}

function stepWalk(cat, dt) {
  const w = cat.walk;
  w.t += dt;
  const rem = w.total - w.s;
  if (rem > 6 && w.total > 0.5) cat.hT = pathAt(w, Math.min(w.total, w.s + 9))[2];
  else if (w.endHeading != null) cat.hT = w.endHeading;
  const dh = wrap(cat.hT - cat.h);
  const turning = Math.min(1, Math.abs(dh) / 1.1);
  // the cruise speed, followed at second order
  const vCruise = rem > 0.05 ? w.vmax * (1 - 0.85 * turning) : 0;
  const om = 6;
  w.ca += (om * om * (vCruise - w.cv) - 2 * om * w.ca) * dt;
  w.cv += w.ca * dt;
  // the arrival law, blended in by a smooth minimum
  const vArr = ARRIVE_C * Math.pow(Math.max(0, rem), 0.75);
  const c = Math.max(0, w.cv);
  w.v = c <= 0 || vArr <= 0 ? 0 : Math.pow(Math.pow(c, -4) + Math.pow(vArr, -4), -0.25);
  cat.gait += w.v * dt / STRIDE;
  const surge = 1 + 0.16 * Math.sin(cat.gait * Math.PI * 4);
  const ds = Math.max(0, Math.min(rem, w.v * surge * dt));
  w.s += ds;
  cat.speed = w.v;
  const [x, z] = pathAt(w, w.s);
  cat.pos[0] = x; cat.pos[2] = z;
  if (rem - ds < 0.3) {
    const endErr = w.endHeading != null ? Math.abs(wrap(w.endHeading - cat.h)) : 0;
    if (endErr < 0.035 && Math.abs(cat.hv) < 0.12 && w.v < 1.5) w.done = true;
  }
}

// THE HEADING, every grounded step: the target is smoothed (so a target that
// jumps does not jump the turn's acceleration), then a spring follows it.
// A cat turns on its feet, so this spring is softer than the head's. (A rate
// CAP was tried once and is a linear turn — the linear sweep said so.)
function stepHeading(cat, dt) {
  cat.hS = wrap(cat.hS + wrap(cat.hT - cat.hS) * (1 - Math.exp(-14 * dt)));
  const dh = wrap(cat.hS - cat.h);
  const [nh, nhv] = spring(0, cat.hv, dh, 5.2, dt);
  cat.h = wrap(cat.h + nh); cat.hv = nhv;
}

// ----------------------------------------------------------- free body ----
// AIRBORNE (and through a landing, until the body comes to rest), the body is
// posed directly from four FREE COORDINATES: its centre's distance s along the
// jump plane, its height y, its pitch and its length L. Origin O on the floor
// plan, axis along the heading. The root rides under the centre at y - H_STAND.
//
// EACH COORDINATE IS ONE CONTINUOUS CURVE FOR THE WHOLE JUMP: a chain of
// pieces (quintic segments, the drag-decayed glide, the parabola), each piece
// starting from the exact position, velocity and acceleration the last one
// ended with. The pieces are data on the cat (`free.c`), so a snapshot replays
// them; nothing eases a coordinate from rest unless it is at rest.
function evalPiece(P, t) {
  if (P.kind === 'seg') return evalSeg(P, t);
  const tt = t - P.t0;
  if (P.kind === 'glide') {
    const den = 1 - Math.exp(-DRAG * P.T), e = Math.exp(-DRAG * tt);
    const v = P.Dh * DRAG * e / den;
    return [P.s0 + P.Dh * (1 - e) / den, v, -DRAG * v];
  }
  // 'ballistic'
  return [P.y0 + P.v0 * tt - 0.5 * P.g * tt * tt, P.v0 - P.g * tt, -P.g];
}
export function freeCoord(cat, k, t = cat.t) {
  const list = cat.free.c[k];
  let P = list[0];
  for (const q of list) if (q.t0 <= t + 1e-12) P = q;
  return evalPiece(P, t);
}
// Replace a coordinate's future from time t0 on with a new piece. A segment
// is handed the curve's own state at t0, so the seam is C2 by construction.
function setPiece(cat, k, piece) {
  const list = cat.free.c[k].filter(q => q.t0 < piece.t0 - 1e-12);
  list.push(piece);
  cat.free.c[k] = list;
}
function segFrom(cat, k, t0, d, p1, v1 = 0, a1 = 0) {
  const [p0, v0, a0] = freeCoord(cat, k, t0);
  return { kind: 'seg', ...seg5(t0, d, p0, v0, a0, p1, v1, a1) };
}
function driveFree(cat) {
  const F = cat.free;
  const [s] = freeCoord(cat, 's'), [y] = freeCoord(cat, 'y'), [p] = freeCoord(cat, 'p'), [L] = freeCoord(cat, 'L');
  cat.pos[0] = F.O[0] + F.f[0] * s; cat.pos[2] = F.O[1] + F.f[1] * s;
  cat.pos[1] = y - H_STAND;
  const c = cat.ch, hc = L / 2 * Math.cos(p), hs = L / 2 * Math.sin(p);
  c.hipU = -hc; c.hipH = H_STAND - hs; c.shU = hc; c.shH = H_STAND + hs;
  F.s = s; F.y = y; F.pitch = p; F.L = L;
}
function planeS(cat, p) { const F = cat.free; return (p[0] - F.O[0]) * F.f[0] + (p[2] - F.O[1]) * F.f[1]; }

// Into free coordinates FROM THE CHANNELS, carrying their velocity and
// acceleration: a body that was still moving as the jump began keeps moving.
function enterFree(cat) {
  const c = cat.ch, v = (k) => cat.chv[k] || 0, a = (k) => cat.cha[k] || 0;
  const du = c.shU - c.hipU, dh = c.shH - c.hipH, L2 = du * du + dh * dh, L = Math.sqrt(L2);
  const vdu = v('shU') - v('hipU'), vdh = v('shH') - v('hipH');
  const adu = a('shU') - a('hipU'), adh = a('shH') - a('hipH');
  const t = cat.t;
  const pt = (x, vx, ax) => [{ kind: 'seg', ...seg5(t, 1e3, x, vx, ax, x + vx * 1e3, vx, 0) }];
  cat.free = {
    O: [cat.pos[0], cat.pos[2]], f: fwd(cat.h),
    c: {
      s: pt((c.hipU + c.shU) / 2, (v('hipU') + v('shU')) / 2, (a('hipU') + a('shU')) / 2),
      y: pt(cat.pos[1] + (c.hipH + c.shH) / 2, (v('hipH') + v('shH')) / 2, (a('hipH') + a('shH')) / 2),
      p: pt(Math.atan2(dh, du), (du * vdh - dh * vdu) / L2, (du * adh - dh * adu) / L2),
      L: pt(L, (du * vdu + dh * vdh) / L, (du * adu + dh * adh) / L),
    },
  };
  for (const k of ['hipU', 'hipH', 'shU', 'shH']) delete cat.tw[k];
  driveFree(cat);
}

// Back onto the ground AT REST: the root comes to the middle of the four
// planted paws and the channels are re-expressed against it, so the body does
// not move by a hair. Every paw has finished its swing by now; none is forced.
function groundAt(cat, node) {
  const hipW = local2world(cat, cat.ch.hipU, cat.ch.hipH, 0);
  const shW = local2world(cat, cat.ch.shU, cat.ch.shH, 0);
  let x = 0, z = 0;
  for (const f of cat.feet) { x += f.mode === 'swing' ? f.sw.to[0] : f.p[0]; z += f.mode === 'swing' ? f.sw.to[2] : f.p[2]; }
  cat.pos = [x / 4, NODES[node].y, z / 4];
  cat.node = node;
  const hl = world2local(cat, hipW), sl = world2local(cat, shW);
  cat.ch.hipU = hl[0]; cat.ch.hipH = hl[1]; cat.ch.shU = sl[0]; cat.ch.shH = sl[1];
  for (const k of ['hipU', 'hipH', 'shU', 'shH']) { cat.chv[k] = 0; cat.cha[k] = 0; }
  cat.chPrev = { ...cat.ch };
  cat.free = null;
  cat.hT = cat.hS = cat.h; cat.hv = 0;
}

// ------------------------------------------------------------- planning ----
// A PLAN is every random draw a program will need, made once, up front. The
// program is then a pure function of (the cat's state at the start, the plan),
// which is what makes replay and scrub exact.

function flightDuration(cat, rise) {
  const r = TIMING.flight;
  const k = Math.max(0, Math.min(1, (Math.abs(rise) - RISE_FOR_FLIGHT[0]) / (RISE_FOR_FLIGHT[1] - RISE_FOR_FLIGHT[0])));
  const nominal = r[0] + (r[1] - r[0]) * k;
  const jit = (rnd(cat) - 0.5) * 0.3 * (r[1] - r[0]);
  return Math.max(r[0], Math.min(r[1], nominal + jit)) / 1000;
}

export function planLeg(cat, edge) {
  const p = { edge: edge.id, type: edge.type, phases: [] };
  const push = (k, d, extra) => p.phases.push({ k, d, ...extra });
  if (cat.posture !== 'stand') push('pose', between(cat, TIMING.standUp), { posture: 'stand' });
  push('notice', between(cat, TIMING.notice));
  if (edge.from === 'floor' && edge.type === 'up') {
    // the standoff law, jittered per jump
    p.standoffK = STANDOFF_K * (0.88 + 0.24 * rnd(cat));
  }
  push('approach', 0);
  if (edge.type === 'up') {
    const gather = () => ({
      d: between(cat, TIMING.gather),
      tread: chance(cat, CHANCE.tread) ? 2 + Math.floor(rnd(cat) * 3) : 0,
      wiggle: chance(cat, CHANCE.wiggle) ? 0.7 + rnd(cat) * 0.9 : 0,
    });
    const g1 = gather();
    push('gather', g1.d, { tread: g1.tread, wiggle: g1.wiggle });
    if (chance(cat, CHANCE.abort)) {
      push('abort', between(cat, TIMING.abortRise));
      push('pause', between(cat, TIMING.abortPause));
      const g2 = gather();
      push('gather', g2.d, { tread: g2.tread, wiggle: g2.wiggle, again: true });
    }
    if (chance(cat, CHANCE.hold)) push('hold', between(cat, TIMING.holdExtra));
    push('launch', between(cat, TIMING.launch));
    push('flight', flightDuration(cat, edge.rise), { apex: APEX_FRAC[0] + (APEX_FRAC[1] - APEX_FRAC[0]) * rnd(cat) });
    push('touch', between(cat, TIMING.hindLag));
    push('compress', between(cat, TIMING.compress), { depth: 0.85 + 0.3 * rnd(cat) });
    push('recover', between(cat, TIMING.recover));
  } else if (edge.type === 'down') {
    push('peer', between(cat, TIMING.peer));
    push('reach', between(cat, TIMING.reach));
    push('pour', between(cat, TIMING.pour));
    push('fall', 0);
    push('touch', between(cat, TIMING.downHindLag), { down: true });
    push('compress', between(cat, TIMING.downCompress), { depth: 1.12 + 0.2 * rnd(cat), down: true });
    push('recover', between(cat, TIMING.downRecover));
  } else {
    push('across', 0);
  }
  push('settle', between(cat, TIMING.settle), { steps: 1 + Math.floor(rnd(cat) * 2) });
  return p;
}

export function planAction(cat, name, extra = {}) {
  const p = { action: name, phases: [] };
  const push = (k, d, more) => p.phases.push({ k, d, ...more });
  switch (name) {
    case 'pose': push('pose', between(cat, TIMING.pose), { posture: extra.posture }); break;
    case 'stretch':
      if (cat.posture !== 'stand') push('pose', between(cat, TIMING.standUp), { posture: 'stand' });
      push('stretch', between(cat, TIMING.stretch));
      push('pose', between(cat, TIMING.pose), { posture: rnd(cat) < 0.6 ? 'sit' : 'stand' });
      break;
    case 'groom':
      if (cat.posture !== 'sit') push('pose', between(cat, TIMING.pose), { posture: 'sit' });
      push('groom', between(cat, TIMING.groom), { strokes: 4 + Math.floor(rnd(cat) * 4), side: rnd(cat) < 0.5 ? 0 : 1 });
      break;
    case 'look': push('look', between(cat, TIMING.look)); break;
    case 'earFlick': push('earFlick', 0.32, { ear: rnd(cat) < 0.5 ? 'earL' : 'earR' }); break;
    case 'reposition':
      if (cat.posture !== 'stand') push('pose', between(cat, TIMING.standUp), { posture: 'stand' });
      push('reposition', 0, { target: extra.target });
      push('pose', between(cat, TIMING.pose), { posture: extra.posture || (rnd(cat) < 0.65 ? 'sit' : 'loaf') });
      break;
    case 'settleDown': {
      const next = cat.posture === 'stand' ? 'sit' : cat.posture === 'sit' ? 'loaf' : 'curl';
      push('pose', between(cat, TIMING.pose) * (next === 'curl' ? 1.8 : 1), { posture: next });
      break;
    }
    case 'wake':
      push('wake', between(cat, TIMING.wake));
      break;
    default: throw new Error(`no action named ${name}`);
  }
  return p;
}

export function startProgram(cat, plan) {
  cat.prog = { plan, i: 0, t: 0, entered: false, data: {}, done: false, startT: cat.t, phaseStarts: [] };
  cat.action = plan.action || (plan.edge ? 'leg' : null);
}

// -------------------------------------------------------------- phases ----
// how far the hips stand from the hind paws at the end of the push: short of
// the leg's full reach, so the hind leg is extending (not locked) as it leaves
const LAUNCH_REACH = 22.5;
const LAND_PITCH = -0.32;
const LAND_FORE = [6.5, -17.5];
const LAND_LEN = TORSO * 1.06;
const DOWN_LAND_PITCH = -0.48;
const DOWN_LAND_FORE = [7.5, -18.5];

function lookAtPoint(cat, p, omega = 9) { cat.head.look = p; cat.head.omega = omega; }

function enter(cat, ph) {
  const plan = cat.prog.plan, D = cat.prog.data;
  const edge = plan.edge ? edgeById(plan.edge) : null;
  const dst = edge ? NODES[edge.to] : null;
  ph.t0 = cat.t;
  cat.prog.phaseStarts.push([ph.k, cat.t]);
  event(cat, 'phase', { k: ph.k });
  switch (ph.k) {
    case 'pose':
      cat.stepping = true;
      toPosture(cat, ph.posture, ph.d);
      if (ph.posture !== 'curl') cat.asleep = false;
      if (ph.posture === 'curl') { tween(cat, 'tailSway', 1.25, ph.d); tween(cat, 'tailCurl', 2.2, ph.d); }
      else { tween(cat, 'tailSway', 0, ph.d); tween(cat, 'tailCurl', 0.9, ph.d); }
      break;
    case 'notice':
      cat.stepping = true;
      lookAtPoint(cat, [edge.land[0], dst.y + 6, edge.land[1]], 11);
      break;
    case 'approach': {
      const launch = plan.standoffK ? standoffLaunch(edge, plan.standoffK) : edge.launch;
      D.launch = launch;
      const f = fwd(edge.heading);
      const pts = [[cat.pos[0], cat.pos[2]]];
      const lead = [launch[0] - f[0] * 14, launch[1] - f[1] * 14];
      const far = Math.hypot(launch[0] - cat.pos[0], launch[1] - cat.pos[2]);
      if (far > 22) pts.push(...nodePath(cat.node, pts[0], lead).slice(1));
      pts.push(launch);
      startWalk(cat, pts, edge.heading, 40);
      cat.stepping = true;
      lookAtPoint(cat, [edge.land[0], dst.y + 6, edge.land[1]], 6);
      break;
    }
    case 'gather':
      cat.stepping = false;
      cat.speed = 0;
      lookAtPoint(cat, [edge.land[0], dst.y + 4, edge.land[1]], 16);
      // weight back, haunches down; the front lowers less than the rear
      tween(cat, 'hipH', 11.6, ph.d * 0.55, 'inOut');
      tween(cat, 'shH', 16.2, ph.d * 0.5, 'inOut');
      tween(cat, 'hipU', -13.6, ph.d * 0.6, 'inOut');
      tween(cat, 'shU', 9.8, ph.d * 0.55, 'inOut');
      tween(cat, 'hock', 0.95, ph.d * 0.55, 'inOut');
      tween(cat, 'arch', 1.9, ph.d * 0.6, 'inOut');
      tween(cat, 'tailUp', 0.08, ph.d * 0.5, 'inOut');
      tween(cat, 'earL', 0, 0.15, 'out'); tween(cat, 'earR', 0, 0.15, 'out');
      D.treads = [];
      if (ph.tread) {
        for (let i = 0; i < ph.tread; i++) D.treads.push({ t: ph.d * (0.42 + 0.5 * i / ph.tread), foot: i % 2 ? 'liftHR' : 'liftHL', done: false });
      }
      break;
    case 'hold': break;
    case 'abort':
      cat.head.omega = 5;
      lookAtPoint(cat, [edge.land[0] + 40 * Math.cos(edge.heading + 1.2), dst.y - 20, edge.land[1] + 40 * Math.sin(edge.heading + 1.2)], 5);
      toPosture(cat, 'stand', ph.d, 'inOut');
      tween(cat, 'tailUp', 0.45, ph.d);
      tween(cat, 'hipSway', 0, 0.2);
      event(cat, 'abort');
      break;
    case 'pause':
      lookAtPoint(cat, [edge.land[0], dst.y + 6, edge.land[1]], 4);
      break;
    case 'launch': {
      cat.stepping = false;
      tween(cat, 'hipSway', 0, ph.d, 'out');
      enterFree(cat);
      solveUpJump(cat, edge, ph);
      const J = cat.free.jump, t0 = cat.t, t1 = t0 + ph.d, T = J.T;
      // the push, from wherever the gather left the body, INTO the arc's own
      // initial velocity and acceleration — then the arc itself, joined there
      setPiece(cat, 's', segFrom(cat, 's', t0, ph.d, J.sL, J.vs0, -DRAG * J.vs0));
      setPiece(cat, 'y', segFrom(cat, 'y', t0, ph.d, J.yL, J.vy0, -J.g));
      setPiece(cat, 'p', segFrom(cat, 'p', t0, ph.d, J.pitchL, 0, 0));
      setPiece(cat, 'L', segFrom(cat, 'L', t0, ph.d, J.Llaunch, 0, 0));
      setPiece(cat, 's', { kind: 'glide', t0: t1, s0: J.sL, Dh: J.Dh, T });
      setPiece(cat, 'y', { kind: 'ballistic', t0: t1, y0: J.yL, v0: J.vy0, g: J.g });
      setPiece(cat, 'p', { kind: 'seg', ...seg5(t1, T, J.pitchL, 0, 0, LAND_PITCH, 0, 0) });
      const Lm = TORSO * 0.95;
      setPiece(cat, 'L', { kind: 'seg', ...seg5(t1, T * 0.4, J.Llaunch, 0, 0, Lm, 0, 0) });
      setPiece(cat, 'L', { kind: 'seg', ...seg5(t1 + T * 0.4, T * 0.6, Lm, 0, 0, J.Lland, 0, 0) });
      // forepaws come off at once and reach up and forward
      const sh = local2world(cat, cat.ch.shU, cat.ch.shH, 0);
      const fl = cat.feet[0].p;
      cat.ch.foreAirU = (fl[0] - sh[0]) * cat.free.f[0] + (fl[2] - sh[2]) * cat.free.f[1];
      cat.ch.foreAirV = fl[1] - sh[1];
      cat.chv.foreAirU = cat.chv.foreAirV = cat.cha.foreAirU = cat.cha.foreAirV = 0;
      tween(cat, 'foreAirU', 11, ph.d, 'out'); tween(cat, 'foreAirV', 4, ph.d, 'out');
      tween(cat, 'airFL', 1, ph.d * 0.7, 'out'); tween(cat, 'airFR', 1, ph.d * 0.75, 'out');
      tween(cat, 'arch', -0.6, ph.d, 'out');
      tween(cat, 'hock', 0.15, ph.d, 'out');
      tween(cat, 'tailUp', -0.1, ph.d, 'out');
      break;
    }
    case 'flight': {
      const J = cat.free.jump;
      event(cat, 'liftoff');
      liftHind(cat, hindThen(cat));
      const T = J.T;
      tween(cat, 'foreAirU', [[15, T * 0.45, 'out'], [LAND_FORE[0], T * 0.55, 'inOut']]);
      tween(cat, 'foreAirV', [[-1.5, T * 0.45, 'inOut'], [LAND_FORE[1], T * 0.55, 'inOut']]);
      tween(cat, 'arch', [[3.0, T * 0.45, 'inOut'], [0.6, T * 0.55, 'inOut']]);
      tween(cat, 'tailUp', [[0.55, T * 0.5, 'inOut'], [0.85, T * 0.5, 'inOut']]);
      break;
    }
    case 'touch': {
      // the forepaws are AT the surface by construction; plant them there
      // the forepaws are arriving AT the surface by construction (their last
      // swing ends there, at rest, now); one still posed is planted where it is
      for (const i of [0, 1]) {
        const f = cat.feet[i];
        const p = f.mode === 'swing' ? f.sw.to : toeWorld(cat, i);
        cat.events.push({ type: 'forepawErr', t: cat.t, err: (f.mode === 'swing' ? swingAt(f.sw)[1] : p[1]) - dst.y });
        if (f.mode !== 'swing') plantAt(cat, i, [p[0], dst.y, p[2]]);
      }
      event(cat, 'foreContact');
      planLanding(cat, edge, ph);
      tween(cat, 'foreAirU', 2, ph.d); tween(cat, 'foreAirV', -21, ph.d);
      break;
    }
    case 'compress': {
      cat.stepping = false;
      tween(cat, 'hock', 0.75, ph.d, 'out');
      tween(cat, 'arch', 1.4, ph.d, 'out');
      tween(cat, 'tailUp', 1.05, ph.d, 'out');
      tween(cat, 'hindAirU', -1, 0.1); tween(cat, 'hindAirV', -19, 0.1);
      break;
    }
    case 'recover': {
      // the body's own coordinates are already on their way to standing (the
      // landing curve); the rest of the posture comes with them
      const P = POSTURE.stand;
      for (const k of Object.keys(P)) if (!['hipU', 'hipH', 'shU', 'shH'].includes(k)) tween(cat, k, P[k], ph.d, 'inOut');
      cat.posture = 'stand';
      tween(cat, 'tailUp', 0.6, ph.d, 'inOut');
      break;
    }
    case 'settle': {
      cat.stepping = true;
      const r = restSpot(cat.node, cat.pos[0], cat.pos[2], cat.h);
      const step = Math.min(10 * ph.steps, Math.hypot(r.x - cat.pos[0], r.z - cat.pos[2]));
      const dir = Math.atan2(r.z - cat.pos[2], r.x - cat.pos[0]);
      const tgt = step > 0.5 ? [cat.pos[0] + Math.cos(dir) * step, cat.pos[2] + Math.sin(dir) * step] : [cat.pos[0], cat.pos[2]];
      startWalk(cat, [[cat.pos[0], cat.pos[2]], tgt], r.heading, 18);
      D.rest = r;
      tween(cat, 'tailUp', [[0.25, ph.d * 0.4, 'inOut'], [0.45, ph.d * 0.6, 'inOut']]);
      cat.head.look = null; cat.head.ty = 0; cat.head.tp = 0.05; cat.head.omega = 6;
      break;
    }
    case 'peer':
      cat.stepping = false; cat.speed = 0;
      lookAtPoint(cat, [edge.land[0], dst.y, edge.land[1]], 14);
      tween(cat, 'shH', 19.5, ph.d); tween(cat, 'shU', 13, ph.d); tween(cat, 'neck', 0.35, ph.d);
      break;
    case 'reach': {
      const sh = local2world(cat, cat.ch.shU, cat.ch.shH, 0);
      const fl = cat.feet[0].p;
      cat.ch.foreAirU = planeS0(cat, fl) - planeS0(cat, sh);
      cat.ch.foreAirV = fl[1] - sh[1];
      tween(cat, 'airFL', 1, ph.d * 0.35, 'inOut'); tween(cat, 'airFR', 1, ph.d * 0.5, 'inOut');
      tween(cat, 'foreAirU', 11, ph.d, 'inOut'); tween(cat, 'foreAirV', -18.5, ph.d, 'inOut');
      tween(cat, 'shH', 14.5, ph.d, 'inOut'); tween(cat, 'shU', 15.5, ph.d, 'inOut');
      tween(cat, 'hipH', 21.5, ph.d, 'inOut'); tween(cat, 'hipU', -8.5, ph.d, 'inOut');
      tween(cat, 'tailUp', 0.85, ph.d, 'inOut');
      break;
    }
    case 'pour': {
      enterFree(cat);
      solveDownJump(cat, edge, ph);
      const J = cat.free.jump, t0 = cat.t, t1 = t0 + ph.d, T = J.T;
      setPiece(cat, 's', segFrom(cat, 's', t0, ph.d, J.sL, J.vs0, -DRAG * J.vs0));
      setPiece(cat, 'y', segFrom(cat, 'y', t0, ph.d, J.yL, J.vy0, -J.g));
      setPiece(cat, 'p', segFrom(cat, 'p', t0, ph.d, J.pitchL, 0, 0));
      setPiece(cat, 'L', segFrom(cat, 'L', t0, ph.d, J.Llaunch, 0, 0));
      setPiece(cat, 's', { kind: 'glide', t0: t1, s0: J.sL, Dh: J.Dh, T });
      setPiece(cat, 'y', { kind: 'ballistic', t0: t1, y0: J.yL, v0: J.vy0, g: J.g });
      setPiece(cat, 'p', { kind: 'seg', ...seg5(t1, T, J.pitchL, 0, 0, DOWN_LAND_PITCH, 0, 0) });
      setPiece(cat, 'L', { kind: 'seg', ...seg5(t1, T, J.Llaunch, 0, 0, J.Lland, 0, 0) });
      tween(cat, 'foreAirU', 8, ph.d, 'inOut'); tween(cat, 'foreAirV', -19, ph.d, 'inOut');
      tween(cat, 'hock', 0.1, ph.d, 'inOut');
      tween(cat, 'arch', -0.4, ph.d, 'inOut');
      tween(cat, 'tailUp', 1.2, ph.d, 'inOut');
      break;
    }
    case 'fall': {
      const J = cat.free.jump;
      ph.d = J.T;
      event(cat, 'liftoff');
      liftHind(cat, hindThen(cat));
      tween(cat, 'foreAirU', DOWN_LAND_FORE[0], J.T, 'inOut'); tween(cat, 'foreAirV', DOWN_LAND_FORE[1], J.T, 'inOut');
      tween(cat, 'arch', 1.2, J.T, 'inOut');
      tween(cat, 'tailUp', 1.35, J.T, 'out');
      tween(cat, 'neck', 0.7, J.T, 'inOut');
      break;
    }
    case 'across': {
      // walked, not scripted: the gait carries each paw over the gap
      const f = fwd(edge.heading);
      // walk on until every paw's home is on the far surface
      let destRoot = [edge.land[0] - f[0] * FORE_TOE_U, edge.land[1] - f[1] * FORE_TOE_U];
      for (let k = 0; k <= 40; k++) {
        const r = [edge.land[0] + f[0] * (k - FORE_TOE_U), edge.land[1] + f[1] * (k - FORE_TOE_U)];
        if (onSurface(edge.to, r[0] - f[0] * 15, r[1] - f[1] * 15) && onSurface(edge.to, r[0] + f[0] * 15, r[1] + f[1] * 15)) { destRoot = r; break; }
      }
      D.across = { y0: NODES[edge.from].y, y1: dst.y };
      cat.span = { a: edge.from, b: edge.to, dir: 1, on: [false, false], claimed: [false, false] };
      startWalk(cat, [[cat.pos[0], cat.pos[2]], destRoot], edge.heading, 24);
      cat.stepping = true;
      lookAtPoint(cat, [edge.land[0], dst.y + 8, edge.land[1]], 8);
      break;
    }
    case 'stretch': {
      cat.stepping = false;
      const T = ph.d;
      const f = fwd(cat.h);
      D.foreFrom = [0, 1].map(i => [...(cat.feet[i].mode === 'swing' ? cat.feet[i].sw.to : cat.feet[i].p)]);
      for (const i of [0, 1]) {
        const ft = cat.feet[i];
        const p = ft.mode === 'swing' ? ft.sw.to : ft.p;
        const busy = ft.mode !== 'plant';
        makeSwing(cat, i, [p[0] + f[0] * 10, p[1], p[2] + f[1] * 10], T * 0.22, 1.4, null, busy ? {} : { t: -0.12 * i });
      }
      tween(cat, 'shH', [[11, T * 0.3, 'inOut'], [11, T * 0.32, 'sine'], [22.5, T * 0.32, 'inOut']]);
      tween(cat, 'shU', [[17.5, T * 0.3, 'inOut'], [17.5, T * 0.32, 'sine'], [12, T * 0.32, 'inOut']]);
      tween(cat, 'hipH', [[22.5, T * 0.3, 'inOut'], [22.8, T * 0.32, 'sine'], [20.5, T * 0.32, 'inOut']]);
      tween(cat, 'arch', [[-2.2, T * 0.3, 'inOut'], [-2.4, T * 0.32, 'sine'], [0.8, T * 0.32, 'inOut']]);
      tween(cat, 'neck', [[0.55, T * 0.3, 'inOut'], [0.6, T * 0.32, 'sine'], [0.9, T * 0.32, 'inOut']]);
      tween(cat, 'tailUp', [[0.9, T * 0.3, 'inOut'], [0.95, T * 0.32, 'sine'], [0.45, T * 0.32, 'inOut']]);
      cat.head.look = null; cat.head.ty = 0; cat.head.tp = 0.35; cat.head.omega = 5;
      break;
    }
    case 'groom': {
      cat.stepping = false;
      const T = ph.d, n = ph.strokes, sd = ph.side;
      const air = sd ? 'airFR' : 'airFL';
      D.groom = { air, n, T };
      tween(cat, air, [[1, 0.28, 'inOut'], [1, T - 0.6, 'sine'], [0, 0.32, 'inOut']]);
      tween(cat, 'foreAirU', [[7.5, 0.28, 'inOut'], [7, T - 0.6, 'sine'], [2, 0.32, 'inOut']]);
      tween(cat, 'foreAirV', [[-6, 0.28, 'inOut'], [-5, T - 0.6, 'sine'], [-21, 0.32, 'inOut']]);
      cat.head.look = null; cat.head.ty = sd ? -0.45 : 0.45; cat.head.tp = -0.7; cat.head.omega = 8;
      break;
    }
    case 'look':
      lookAtPoint(cat, [CAMERA.x, CAMERA.y, CAMERA.z], 7);
      D.blinkAt = ph.d * (0.35 + 0.3 * (cat.rs % 100) / 100);
      break;
    case 'earFlick':
      tween(cat, ph.ear, [[1, 0.09, 'out'], [0, 0.23, 'inOut']]);
      break;
    case 'reposition': {
      cat.stepping = true;
      const t = ph.target;
      const pts = nodePath(cat.node, [cat.pos[0], cat.pos[2]], [t.x, t.z]);
      startWalk(cat, pts, t.heading, 30);
      cat.head.look = null; cat.head.ty = 0; cat.head.tp = 0; cat.head.omega = 6;
      break;
    }
    case 'wake': {
      const T = ph.d;
      cat.asleep = false;
      toPosture(cat, 'loaf', T * 0.45, 'inOut');
      tween(cat, 'lid', [[0.6, T * 0.3, 'inOut'], [0, T * 0.5, 'inOut']]);
      tween(cat, 'blink', [[0, T * 0.55, 'sine'], [1, 0.08, 'out'], [0, 0.12, 'inOut']]);
      cat.head.look = null; cat.head.ty = 0.3; cat.head.tp = 0.5; cat.head.omega = 4;
      tween(cat, 'tailSway', 0, T * 0.6); tween(cat, 'tailCurl', 0.9, T * 0.6);
      break;
    }
    default: break;
  }
}

export function feetSettled(cat, tol = 4.5) {
  for (let i = 0; i < 4; i++) {
    const f = cat.feet[i];
    if (f.mode !== 'plant') return false;
    const [u, w] = homeLocal(cat, i);
    const h = local2world(cat, u, 0, w);
    if (Math.hypot(h[0] - f.p[0], h[2] - f.p[2]) > tol) return false;
  }
  return true;
}

function planeS0(cat, p) { const f = fwd(cat.h); return (p[0] - cat.pos[0]) * f[0] + (p[2] - cat.pos[2]) * f[1]; }

// FOREPAW TOUCHDOWN. For the last FORE_LAND of the arc the forepaws stop being
// posed off the shoulders and swing — as world-space curves that start moving
// exactly as they were moving — to the spot the arc was solved to put them on,
// arriving AT REST at the arc's end. A paw is never stopped by the surface; it
// is set down on it, and the body arrives over it moving.
const FORE_LAND = 0.07;
function foreReach(cat, edge, left) {
  const F = cat.free, J = F.jump;
  if (!F || cat.feet[0].mode === 'swing' || cat.ch.airFL < 1 || left < 0.01) return;
  const tT = cat.t + left;
  const [sT] = freeCoord(cat, 's', tT), [pT] = freeCoord(cat, 'p', tT), [LT] = freeCoord(cat, 'L', tT);
  const U = J.kind === 'up' ? LAND_FORE[0] : DOWN_LAND_FORE[0];
  const sPaw = sT + LT / 2 * Math.cos(pT) + U;
  const sd = side(cat.h), dstY = NODES[edge.to].y;
  for (const i of [0, 1]) {
    const to = [F.O[0] + F.f[0] * sPaw + sd[0] * FOOT_W[i], dstY, F.O[1] + F.f[1] * sPaw + sd[1] * FOOT_W[i]];
    makeSwing(cat, i, to, left, 0);
    cat.feet[i].sw.born = cat.t;
  }
}

// HIND LIFTOFF. A planted hind paw stays put while the hips drive away from
// it, and leaves as its leg nears full reach — at REST: it is posed off the hip
// at once, and its posed offset starts with exactly minus the hip's velocity
// and acceleration, so in the world the paw starts from zero and accelerates
// away (a peel, a few tens of ms) instead of being dragged a frame late or
// snapped onto the body. `then` is where the offset goes once it has peeled.
const HIND_SPAN = 10.5 + 10.5, HIND_META = 7.5, HIND_LIFT_AT = 0.84, PEEL = 0.035;
function hindReach(cat) {
  if (cat.ch.airHL > 0) return 0;
  const c = cat.ch, f = fwd(cat.h);
  const hip = local2world(cat, c.hipU, c.hipH, 0);
  let r = 0;
  for (const i of [2, 3]) {
    const p = cat.feet[i].p;
    const hock = [p[0] - f[0] * HIND_META * Math.sin(c.hock), p[1] + HIND_META * Math.cos(c.hock), p[2] - f[1] * HIND_META * Math.sin(c.hock)];
    r = Math.max(r, Math.hypot(hock[0] - hip[0], hock[1] - hip[1], hock[2] - hip[2]) / HIND_SPAN);
  }
  return r;
}
function hipRate(cat) {
  // the hip's plane velocity and acceleration, from the free curves themselves
  const at = (t) => {
    const [s] = freeCoord(cat, 's', t), [y] = freeCoord(cat, 'y', t), [p] = freeCoord(cat, 'p', t), [L] = freeCoord(cat, 'L', t);
    return [s - L / 2 * Math.cos(p), y - L / 2 * Math.sin(p)];
  };
  const h = 1e-4, a = at(cat.t - h), b = at(cat.t), c = at(cat.t + h);
  return [[(c[0] - a[0]) / (2 * h), (c[1] - a[1]) / (2 * h)], [(c[0] - 2 * b[0] + a[0]) / (h * h), (c[1] - 2 * b[1] + a[1]) / (h * h)]];
}
function liftHind(cat, then) {
  if (cat.ch.airHL > 0) return false;
  driveFree(cat);   // the body at THIS instant, which the rates below are of
  const hip = local2world(cat, cat.ch.hipU, cat.ch.hipH, 0);
  const hl = cat.feet[2].p;
  const [v, a] = hipRate(cat);
  cat.ch.hindAirU = planeS(cat, hl) - planeS(cat, hip);
  cat.ch.hindAirV = hl[1] - hip[1];
  cat.chv.hindAirU = -v[0]; cat.cha.hindAirU = -a[0];
  cat.chv.hindAirV = -v[1]; cat.cha.hindAirV = -a[1];
  for (const i of [2, 3]) {
    const f = cat.feet[i], k = 'air' + f.n;
    f.corr = null;
    const q = [...f.p];
    cat.ch[k] = 1; cat.chv[k] = 0; cat.cha[k] = 0; delete cat.tw[k];
    const posed = toeWorld(cat, i);
    f.corr = { d: [q[0] - posed[0], q[1] - posed[1], q[2] - posed[2]], t0: cat.t, T: 0.12 };
  }
  const [u1, v1] = then;
  tween(cat, 'hindAirU', [[cat.ch.hindAirU, PEEL, 'inOut'], ...u1], 0, 'inOut', true);
  tween(cat, 'hindAirV', [[cat.ch.hindAirV, PEEL, 'inOut'], ...v1], 0, 'inOut', true);
  event(cat, 'hindOff');
  return true;
}
const hindThen = (cat) => {
  const J = cat.free.jump, T = J.T;
  if (J.kind === 'up') return [[[-1.5, T * 0.3, 'out'], [-5, T * 0.6, 'inOut']], [[-11, T * 0.3, 'out'], [-15.5, T * 0.6, 'inOut']]];
  return [[[-6, T * 0.85, 'out']], [[-13, T * 0.85, 'out']]];
};

// THE LANDING, PLANNED AT TOUCHDOWN AS ONE CURVE PER COORDINATE. From the
// arc's end — its exact position, velocity and acceleration (still falling at
// g) — each coordinate runs to the crouch at the bottom and on to standing,
// over the touch, compress and recover phases together. The descent is given
// the time in which it is MONOTONE (a body cannot fall below its crouch and
// bob back up), and the horizontal stop the distance in which it does not
// roll back. The hind paws then come down where that stop puts the hips.
function monotoneSeg(S, sign) {
  for (let k = 1; k < 48; k++) { const v = herm5(S.p0, S.v0, S.a0, S.p1, S.v1, S.a1, S.d, k / 48, S.skew)[1]; if (v * sign < -1e-6) return false; }
  return true;
}
function planLanding(cat, edge, ph) {
  const plan = cat.prog.plan, i = cat.prog.i;
  const comp = plan.phases[i + 1], rec = plan.phases[i + 2];
  const dT = ph.d, dC = comp.d, dR = rec.d, Ttot = dT + dC + dR, t0 = cat.t;
  const dst = NODES[edge.to], P = POSTURE.stand, dd = comp.depth;
  const hipHc = Math.max(8, 20.5 - 7.2 * dd), shHc = Math.max(11, 22.5 - 6.6 * dd);
  const yB = dst.y + (hipHc + shHc) / 2, pB = Math.atan2(shHc - hipHc, TORSO);
  const yS = dst.y + (P.hipH + P.shH) / 2, pS = Math.atan2(P.shH - P.hipH, P.shU - P.hipU), LS = Math.hypot(P.shH - P.hipH, P.shU - P.hipU);
  // down into the crouch, in the longest time that stays monotone
  const [y0, vy, ay] = freeCoord(cat, 'y');
  let tau = dT + dC;
  for (let n = 0; n < 40; n++) { if (monotoneSeg(seg5(0, tau, y0, vy, ay, yB, 0, 0), -1)) break; tau *= 0.92; }
  tau = Math.max(0.03, tau);
  setPiece(cat, 'y', { kind: 'seg', ...seg5(t0, tau, y0, vy, ay, yB, 0, 0) });
  setPiece(cat, 'y', { kind: 'seg', ...seg5(t0 + tau, Ttot - tau, yB, 0, 0, yS, 0, 0) });
  setPiece(cat, 'p', segFrom(cat, 'p', t0, tau, pB));
  setPiece(cat, 'p', { kind: 'seg', ...seg5(t0 + tau, Ttot - tau, pB, 0, 0, pS, 0, 0) });
  setPiece(cat, 'L', segFrom(cat, 'L', t0, tau, TORSO));
  setPiece(cat, 'L', { kind: 'seg', ...seg5(t0 + tau, Ttot - tau, TORSO, 0, 0, LS, 0, 0) });
  // forward over the forepaws to a stop that does not roll back
  const f = cat.free.f;
  const footAt = (i) => (cat.feet[i].mode === 'swing' ? cat.feet[i].sw.to : cat.feet[i].p);
  const foreS = (planeS(cat, footAt(0)) + planeS(cat, footAt(1))) / 2;
  const [s0, vs, as] = freeCoord(cat, 's');
  // the stop: no further than a little past standing over the paws, in the
  // longest time that does not roll back (the legs absorb the rest)
  const sEnd = Math.max(s0 + 0.5, foreS - 13.2);
  let tauS = Ttot;
  for (let n = 0; n < 60; n++) { if (monotoneSeg(seg5(0, tauS, s0, vs, as, sEnd, 0, 0), 1)) break; tauS *= 0.92; }
  tauS = Math.max(0.03, tauS);
  setPiece(cat, 's', { kind: 'seg', ...seg5(t0, tauS, s0, vs, as, sEnd, 0, 0) });
  setPiece(cat, 's', { kind: 'seg', ...seg5(t0 + tauS, Math.max(0.01, Ttot - tauS), sEnd, 0, 0, sEnd, 0, 0) });
  // the hind paws come down under where the hips will stop
  const hindS = Math.max(foreS - 30, Math.min(foreS - 18, 2 * sEnd - foreS));
  const sd = side(cat.h);
  const targets = [2, 3].map(k => [cat.free.O[0] + f[0] * hindS + sd[0] * FOOT_W[k], dst.y, cat.free.O[1] + f[1] * hindS + sd[1] * FOOT_W[k]]);
  cat.defer.push({ kind: 'hind', targets, at: t0 + dT });
  cat.prog.data.landing = { tau, yB, sEnd, hindS, foreS };
}

// THE UP-JUMP, SOLVED. Given where the hind paws push from and where the
// forepaws must come down, find the launch pose, the arc's gravity and its
// initial velocity so that:
//   - the arc reference (body centre less H_STAND) peaks `apex` x rise above
//     the landing surface,
//   - the flight lasts the planned T (drawn from TIMING.flight by height),
//   - at T the posed forepaw is exactly on the landing surface at `land`.
// Gravity is constant along the arc; horizontal speed decays under a light
// DRAG, which is what keeps that channel near-linear and not linear.
function solveUpJump(cat, edge, ph) {
  const F = cat.free;
  const flight = cat.prog.plan.phases.find(p => p.k === 'flight');
  const T = flight.d, apex = flight.apex;
  const srcY = NODES[edge.from].y, dstY = NODES[edge.to].y;
  const rise = dstY - srcY;
  const hindS = (planeS(cat, cat.feet[2].p) + planeS(cat, cat.feet[3].p)) / 2;
  const landS = planeS(cat, [edge.land[0], 0, edge.land[1]]);
  const Lland = LAND_LEN;
  const offFu = Lland / 2 * Math.cos(LAND_PITCH) + LAND_FORE[0];
  const offFv = Lland / 2 * Math.sin(LAND_PITCH) + LAND_FORE[1];
  const yF = dstY - offFv, sF = landS - offFu;
  const ya = dstY + H_STAND + apex * rise;
  const Llaunch = TORSO * 1.16;
  let pitch = 0.7, sL = 0, yL = 0, g = 0, vy0 = 0, vs0 = 0;
  for (let it = 0; it < 4; it++) {
    const hipS = hindS + LAUNCH_REACH * Math.cos(pitch + 0.12), hipY = srcY + LAUNCH_REACH * Math.sin(pitch + 0.12);
    sL = hipS + Llaunch / 2 * Math.cos(pitch); yL = hipY + Llaunch / 2 * Math.sin(pitch);
    const up = Math.max(3, ya - yL), dn = Math.max(1, ya - yF);
    g = Math.pow(Math.sqrt(2 * up) + Math.sqrt(2 * dn), 2) / (T * T);
    vy0 = Math.sqrt(2 * g * up);
    const Dh = Math.max(4, sF - sL);
    vs0 = Dh * DRAG / (1 - Math.exp(-DRAG * T));
    pitch = Math.max(0.3, Math.min(1.05, 0.78 * Math.atan2(vy0, vs0)));
  }
  const Dh = Math.max(4, sF - sL);
  const tUp = vy0 / g;
  cat.lastArc = { kind: 'up', O: [...F.O], f: [...F.f], T, g, vy0, Dh, sL, yL, ya, dstY, srcY, rise, apex, H: H_STAND };
  F.jump = {
    kind: 'up', T, g, vy0, vs0, Dh, sL, yL, sF, yF, ya, apex, tUp,
    pitchL: pitch, Llaunch, Lland, landS, srcY, dstY, rise,
    launch: { s0: F.s, y0: F.y, p0: F.pitch, L0: F.L },
  };
}

function solveDownJump(cat, edge, ph) {
  const F = cat.free;
  const srcY = NODES[edge.from].y, dstY = NODES[edge.to].y;
  const edgeS = planeS(cat, [edge.launch[0], 0, edge.launch[1]]) + FORE_TOE_U;
  const landS = planeS(cat, [edge.land[0], 0, edge.land[1]]);
  const pR = -0.85, LR = TORSO * 1.08;
  const sR = edgeS - 0.5, yR = srcY + 10;
  const vyR = -32;
  const Ll = TORSO * 1.04;
  const offFu = Ll / 2 * Math.cos(DOWN_LAND_PITCH) + DOWN_LAND_FORE[0];
  const offFv = Ll / 2 * Math.sin(DOWN_LAND_PITCH) + DOWN_LAND_FORE[1];
  const yF = dstY - offFv, sF = landS - offFu;
  const drop = Math.max(1, yR - yF);
  const T = (vyR + Math.sqrt(vyR * vyR + 2 * G_FALL * drop)) / G_FALL;
  const Dh = Math.max(3, sF - sR);
  const vs0 = Dh * DRAG / (1 - Math.exp(-DRAG * T));
  cat.lastArc = { kind: 'down', O: [...F.O], f: [...F.f], T, g: G_FALL, vy0: vyR, Dh, sL: sR, yL: yR, ya: yR, dstY, srcY, rise: dstY - srcY, apex: 0, H: H_STAND };
  F.jump = {
    kind: 'down', T, g: G_FALL, vy0: vyR, vs0, Dh, sL: sR, yL: yR, sF, yF, pitchL: pR, Llaunch: LR, Lland: Ll,
    landS, srcY, dstY, rise: dstY - srcY,
    pour: { s0: F.s, y0: F.y, p0: F.pitch, L0: F.L },
  };
}

function update(cat, ph, dt) {
  const D = cat.prog.data, t = cat.t - ph.t0;
  const plan = cat.prog.plan;
  const edge = plan.edge ? edgeById(plan.edge) : null;
  switch (ph.k) {
    case 'approach':
    case 'reposition':
      if (cat.walk && !cat.walk.done) stepWalk(cat, dt);
      // arrived, AND standing square on its paws before anything else begins
      return cat.walk && cat.walk.done && feetSettled(cat);
    case 'gather': {
      for (const tr of D.treads) {
        if (!tr.done && t >= tr.t) { tr.done = true; tween(cat, tr.foot, [[1.4, 0.1, 'out'], [0, 0.13, 'inOut']]); }
      }
      // the butt wiggle, enveloped, in the second half
      if (ph.wiggle) {
        const k = Math.max(0, (t / ph.d - 0.45) / 0.5);
        const kk = Math.min(1, Math.max(0, k)), env = 64 * kk ** 3 * (1 - kk) ** 3;   // a bump flat to second order at both ends
        cat.ch.hipSway = ph.wiggle * env * Math.sin(2 * Math.PI * 3.6 * (t - ph.d * 0.45));
      }
      cat.ch.tailSway = 0.18 * Math.sin(2 * Math.PI * 2.3 * t) * Math.min(1, t / 0.3);
      return t >= ph.d;
    }
    case 'launch':
    case 'pour':
      driveFree(cat);
      // a hind paw leaves the moment its leg runs out of reach, not a frame late
      if (hindReach(cat) > HIND_LIFT_AT) liftHind(cat, hindThen(cat));
      return t >= ph.d;
    case 'touch':
    case 'compress':
      driveFree(cat);
      return t >= ph.d;
    case 'flight':
    case 'fall':
      driveFree(cat);
      if (t >= cat.free.jump.T - FORE_LAND && !cat.defer.some(q => q.kind === 'fore')) cat.defer.push({ kind: 'fore', edge: edge.id, at: ph.t0 + cat.free.jump.T });
      return t >= cat.free.jump.T;
    case 'recover':
      driveFree(cat);
      if (t >= ph.d) { groundAt(cat, edge.to); return true; }
      return false;
    case 'across': {
      const A = D.across, w = cat.walk;
      if (!w.done) stepWalk(cat, dt);
      // the body rises (or drops) the few centimetres as it passes over
      cat.pos[1] = A.y0 + (A.y1 - A.y0) * EASE.inOut(Math.min(1, w.total ? w.s / w.total : 1));
      const allOn = cat.feet.every(ft => ft.mode === 'plant' && onSurface(edge.to, ft.p[0], ft.p[2]) && Math.abs(ft.p[1] - A.y1) < 1e-9);
      if (w.done && feetSettled(cat) && allOn) { cat.node = edge.to; cat.pos[1] = A.y1; cat.span = null; return true; }
      // a paw still on the near side is due a step: the settle rule only fires on error
      return false;
    }
    case 'settle':
      if (cat.walk && !cat.walk.done) stepWalk(cat, dt);
      return t >= ph.d;
    case 'stretch': {
      const T = ph.d;
      if (!D.back && t > T * 0.62) {
        D.back = true;
        for (const i of [0, 1]) {
          makeSwing(cat, i, D.foreFrom[i], T * 0.22, 1.6, null, cat.feet[i].mode === 'plant' ? { t: -0.1 * i } : {});
        }
      }
      if (t >= T && cat.feet.every(f => f.mode === 'plant')) { cat.stepping = true; return true; }
      return false;
    }
    case 'groom': {
      const G = D.groom, T = ph.d;
      const k = (t - 0.28) / Math.max(0.1, T - 0.6);
      if (k > 0 && k < 1) {
        // lick strokes: the head draws down the raised paw and back
        cat.head.tp = -0.55 - 0.3 * Math.max(0, Math.sin(Math.PI * G.n * k));
        cat.head.ty = (G.air === 'airFR' ? -1 : 1) * (0.35 + 0.15 * Math.sin(Math.PI * G.n * k * 0.5));
        cat.ch.foreAirV = -5 + 1.6 * Math.sin(Math.PI * 2 * G.n * k * 0.5);
      }
      if (t >= T) { cat.head.tp = 0.05; cat.head.ty = 0; cat.stepping = true; return true; }
      return false;
    }
    case 'look':
      if (!D.blinked && t >= D.blinkAt) { D.blinked = true; tween(cat, 'blink', [[1, 0.12, 'inOut'], [0, 0.22, 'inOut']]); }
      if (t >= ph.d) { cat.head.look = null; cat.head.ty = 0; cat.head.tp = 0.05; cat.head.omega = 4; return true; }
      return false;
    default:
      return t >= ph.d;
  }
}

function exitPhase(cat, ph) {
  if (ph.k === 'approach' || ph.k === 'reposition' || ph.k === 'settle' || ph.k === 'across') { cat.walk = null; cat.speed = 0; }
  if (ph.k === 'settle') cat.stepping = true;
}

// ---------------------------------------------------------------- step ----
const IDLE_BLINK = [2600, 7600], IDLE_EAR = [3500, 12000], IDLE_LOOK = [5000, 14000];

export function stepCat(cat, dt) {
  cat.t += dt;
  // the program
  const pr = cat.prog;
  if (pr && !pr.done) {
    let guard = 0;
    while (guard++ < 6) {
      const ph = pr.plan.phases[pr.i];
      if (!ph) { pr.done = true; break; }
      if (!pr.entered) { pr.entered = true; enter(cat, ph); }
      const fin = update(cat, ph, guard === 1 ? dt : 0);
      if (!fin) break;
      exitPhase(cat, ph);
      pr.i++; pr.entered = false;
      if (pr.i >= pr.plan.phases.length) { pr.done = true; break; }
    }
  }
  if (pr && pr.done) {
    cat.prog = null;
    if (pr.plan.action) cat.lastAction = pr.plan.action;
    cat.action = null;
    event(cat, 'programEnd', { what: pr.plan.action || pr.plan.edge });
  }

  stepTweens(cat, dt);
  if (!cat.free) stepHeading(cat, dt);
  stepSwings(cat, dt);
  if (cat.stepping && !cat.free) stepFeet(cat, dt, cat.walk && !cat.walk.done ? 7 : 3.4);

  // idle life: only when nothing else owns the cat
  const I = cat.idle;
  if (!cat.prog && !cat.asleep) {
    I.blink -= dt; I.ear -= dt; I.look -= dt;
    if (I.blink <= 0) { I.blink = between(cat, IDLE_BLINK); if (!cat.tw.blink) tween(cat, 'blink', [[1, 0.07, 'out'], [0, 0.11, 'inOut']]); }
    if (I.ear <= 0) { I.ear = between(cat, IDLE_EAR); const e = rnd(cat) < 0.5 ? 'earL' : 'earR'; tween(cat, e, [[1, 0.08, 'out'], [0, 0.2, 'inOut']]); }
    if (I.look <= 0) {
      I.look = between(cat, IDLE_LOOK);
      cat.head.look = null; cat.head.omega = 3.5;
      cat.head.ty = (rnd(cat) - 0.5) * 1.9; cat.head.tp = -0.2 + rnd(cat) * 0.45;
    }
  }

  // springs: the head, the heading at rest, the tail
  headTargets(cat);
  const H = cat.head;
  // the head's target is smoothed before the spring follows it: a cat's head
  // SNAPS to what it looks at, but a snap is a fast curve, not a jump in its
  // acceleration
  const kS = 1 - Math.exp(-2.5 * H.omega * dt);
  H.sy += (H.ty - H.sy) * kS; H.sp += (H.tp - H.sp) * kS;
  [H.yaw, H.vy] = spring(H.yaw, H.vy, H.sy, H.omega, dt);
  [H.pitch, H.vp] = spring(H.pitch, H.vp, H.sp, H.omega, dt);

  const C = bodyCentre(cat);
  if (cat.Cprev && dt > 0) {
    const v = [(C[0] - cat.Cprev[0]) / dt, (C[1] - cat.Cprev[1]) / dt, (C[2] - cat.Cprev[2]) / dt];
    for (let k = 0; k < 3; k++) {
      const a = (v[k] - cat.Cvel[k]) / dt;
      cat.Cacc[k] += (a - cat.Cacc[k]) * Math.min(1, dt * 30);
      cat.Cvel[k] = v[k];
    }
  }
  cat.Cprev = C;
  const T = cat.tail, c = cat.ch;
  T.ph += dt * (cat.asleep ? 0.18 : 0.42);
  const idleSway = cat.asleep ? 0.05 * Math.sin(T.ph * 2 * Math.PI) : 0.28 * Math.sin(T.ph * 2 * Math.PI) + 0.1 * Math.sin(T.ph * 5.1);
  const kick = -cat.Cacc[1] * 0.0011;
  if (dt > 0) {
    [T.a, T.av] = spring(T.a, T.av, c.tailUp + Math.max(-0.9, Math.min(0.9, kick)), 7, dt);
    [T.c, T.cv] = spring(T.c, T.cv, c.tailCurl, 6, dt);
    [T.s, T.sv] = spring(T.s, T.sv, c.tailSway + (cat.prog ? 0.4 : 1) * idleSway, 5, dt);
  }
  cat.breath += dt * (cat.asleep ? 0.32 : 0.52);

  // RATES. A tweened channel's velocity and acceleration are its segment's
  // own (set in stepTweens); every other channel's are measured, so the next
  // tween to take it over starts from how it was actually moving.
  if (dt > 0) {
    const P = cat.chPrev;
    for (const k of Object.keys(cat.ch)) {
      if (cat.tw[k]) continue;
      const v = P ? (cat.ch[k] - P[k]) / dt : 0;
      cat.cha[k] = P ? (v - (cat.chv[k] || 0)) / dt : 0;
      cat.chv[k] = v;
    }
    cat.chPrev = { ...cat.ch };
    // the paws' own velocity and acceleration, for a swing that takes over a
    // paw in motion
    const tp = cat.toeP;
    const now = [0, 1, 2, 3].map(i => toeWorld(cat, i));
    if (tp) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const v = (now[i][j] - tp[i][j]) / dt;
      cat.toeA[i][j] = (v - cat.toeV[i][j]) / dt;
      cat.toeV[i][j] = v;
    }
    cat.toeP = now;
  }
  // SWINGS THAT TAKE OVER A MOVING PAW are made here, at the end of the step,
  // where every channel and the body agree on one instant — a swing made in
  // the middle of a step would start from a paw half a step stale
  for (const q of cat.defer.splice(0)) {
    if (q.kind === 'fore') foreReach(cat, edgeById(q.edge), q.at - cat.t);
    else if (q.kind === 'hind') for (const k of [2, 3]) {
      makeSwing(cat, k, q.targets[k - 2], Math.max(0.01, q.at - cat.t), 0, k === 2 ? 'hindContact' : null);
      cat.feet[k].sw.born = cat.t;
    }
  }
}

// -------------------------------------------------------------- legs ----
/** Every leg a cat will traverse for this edge, as a program. */
export function startLeg(cat, edgeId) {
  const edge = edgeById(edgeId);
  if (!edge) throw new Error(`no edge ${edgeId}`);
  if (edge.from !== cat.node) throw new Error(`${cat.id} is on ${cat.node}, not ${edge.from}: an edge starts where the cat is`);
  const plan = planLeg(cat, edge);
  startProgram(cat, plan);
  return plan;
}

export function startAction(cat, name, extra) {
  const plan = planAction(cat, name, extra);
  startProgram(cat, plan);
  return plan;
}

export const isBusy = (cat) => !!cat.prog;
export const isLeg = (cat) => !!(cat.prog && cat.prog.plan.edge);
export const isAirborne = (cat) => !!cat.free;

// A flat record of everything that moves, for the gate's channel sweeps.
export function sample(cat) {
  const C = bodyCentre(cat);
  const out = { t: cat.t, x: cat.pos[0], y: cat.pos[1], z: cat.pos[2], h: cat.h,
    Cx: C[0], Cy: C[1], Cz: C[2], headYaw: cat.head.yaw, headPitch: cat.head.pitch,
    tailA: cat.tail.a, tailC: cat.tail.c, tailS: cat.tail.s };
  for (const k of Object.keys(cat.ch)) out[k] = cat.ch[k];
  for (let i = 0; i < 4; i++) {
    const p = toeWorld(cat, i);
    out['toe' + FOOT_NAMES[i] + 'x'] = p[0]; out['toe' + FOOT_NAMES[i] + 'y'] = p[1]; out['toe' + FOOT_NAMES[i] + 'z'] = p[2];
  }
  return out;
}

export { EDGES };
