// scene/koi-fish.js — the koi as agents. Everything here happens in PLANE
// coordinates (see scene/surface.js): the water is isotropic, so a fish swims
// at one speed whatever its heading and a neighbour ten units away is ten units
// away in every direction. The squash is applied once, at draw time, by
// koi-draw.js. Steering computed on screen coordinates would make a fish
// measurably faster sideways than up — which reads as "the fish are odd" long
// before anyone finds the cause.
//
// NO DOM AND NO CANVAS IN THIS FILE. The simulation is a function of (state,
// dt, the ripple list, the storm intensity, the viewport size), so the gate
// runs whole minutes of pond in Node and asserts what the fish did.
//
// THE THREE TRAITS ARE SLIDERS, NOT ARCHETYPES — the brief is explicit, and it
// matters for how they are read. Each is drawn uniformly in [0, 1] and each is
// used as a SIGNED weight about its midpoint: 0 is the far end of one
// behaviour, 1 the far end of the other, and 0.5 is genuinely indifferent
// rather than a third mode. So a fish at ripple 0.52 is very slightly drawn to
// a splash, not "a neutral fish", and the population is a continuum.
//
//   traits.speed   — base meander speed. Multiplied by a per-fish variance, so
//                    two fish with the same trait still do not move in lockstep.
//   traits.ripple  — 0 flees a ripple, 1 swims to it, 0.5 does not care.
//   traits.social  — 0 avoids a group, 1 joins one. Alignment (matching a
//                    neighbour's heading) rides only on the joining half; a
//                    solitary fish keeps its own heading rather than taking
//                    the opposite of everyone else's, which is not a behaviour.
//
// SEPARATION IS NOT A TRAIT. Fish do not overlap whatever their sociability —
// that is a body, not a personality — so the short-range push is unconditional
// and sits outside the signed social term.
//
// THE FRONT IS WHAT STARTLES, NOT THE SPLASH. A fish is disturbed when the
// expanding ring actually reaches it (|distance - r| small), not the instant
// the drop lands somewhere across the pond. The steering pull toward or away
// from the ripple's centre is separate and starts at once, which is the
// difference between seeing a disturbance and feeling it.

import { createSurface } from './surface.js';

export const BODY_LEN_PX = 96;        // ~1 inch at a typical 96 CSS-px inch
export const SIZE_VAR = [0.82, 1.18]; // "mild size variation per fish"
export const SPINE_JOINTS = 9;

export const MIN_ON_SCREEN = 3;
export const MAX_ON_SCREEN = 7;
const IDLE_TARGET = 6.6;              // rounds to 7 — "the higher end"
const STORM_TARGET = 3.1;             // rounds to 3 — "lower when it is"
const TARGET_HOLD_S = 1.2;            // the target must persist before acting
const SPAWN_COOL_S = 1.6;
const DEPART_COOL_S = 1.3;
const ARRIVE_S = 2.6;                 // fades up from depth
const LEAVE_S = 2.6;                  // fades down into it

const SPEED_RANGE = [21, 57];         // plane px/s, by traits.speed
const TURN_RANGE = [0.75, 1.25];      // rad/s, cruising
const SPEED_LERP = 1.6;

const WANDER_DIST = 92;
const WANDER_R = 60;
const WANDER_RATE = [1.4, 3.2];       // rad/s of random walk, by fish

const RIPPLE_REACH = 330;             // plane px a ripple can be felt across
const FRONT_BAND = 34;                // how near the passing front startles
const ALARM_GAIN = 3.4;
const ALARM_TAU = 1.15;               // seconds to 1/e
const ALARM_SPEED = 1.5;              // alarmed fish swim up to 2.5x
const ALARM_TURN = 1.8;

// COMPANY HAS TO BE VISIBLE ACROSS THE POND OR THE TRAIT DOES NOTHING. At 230
// plane px, seven koi spread over a 1440x1500 pond were typically 660 px apart
// and simply never saw one another, so the sociability slider moved the mean
// separation by 8% — measured. At 600 the school is a school: 383 px mean at
// full sociability against 913 px at none.
const SOCIAL_RANGE = 600;
const SEP_RANGE_LEN = 1.8;            // multiples of body length

const W_WANDER = 1.0;
const W_RIPPLE = 2.0;
const W_SOCIAL = 0.95;
const W_ALIGN = 0.55;
const W_SEPARATE = 1.7;
// SEPARATION HAS TO GET MORE URGENT AS IT GETS WORSE, or it loses to company.
// addNorm normalises its direction, so a flat weight contributes the same
// whether two koi are a body apart or overlapping — and against cohesion 0.95
// plus alignment 0.55 that left a net push of 0.2 outward at maximum
// sociability. Measured: schooling koi closed to 18 px, head inside a body.
// The weight now scales with how deep the worst overlap is.
const SEP_URGENCY = 6;
const W_EDGE = 3.2;
// THE FRAME IS WHERE THE KOI ARE, and the brief says so: "3-7 koi on screen at
// any time". The water is still infinite and unframed — it bleeds off all four
// edges and nothing draws a boundary — but the fish turn back a little BEFORE
// the edge rather than a long way past it, so the count on screen is the count
// that exists. A force that started at the edge and ramped outward let fish sit
// a couple of hundred units out of frame, which made the population manager
// replace fish that were on their way back and filled the pond with sixteen koi
// to keep seven visible.
// THE BAND IS MEASURED INWARD FROM EACH EDGE, and that is the whole of it. A
// force whose strength ramped with how far a fish had ALREADY OVERSHOT only
// reached full magnitude well outside the frame, so the fish that needed it
// most were the ones past the point where it could help: on a phone-width
// viewport the koi spent a third of the time out of shot. Here the force is
// zero at EDGE_BAND inside the frame, full AT the edge, and saturated beyond
// it, so a koi begins its turn about two body lengths early and the turn is
// finished by the boundary. The band is capped as a fraction of the dimension
// so two opposing bands cannot meet and squeeze a narrow pond to its midline.
// THE BAND HAS TO HOLD A TURNING CIRCLE, NOT A DISTANCE. A koi at 57 plane px/s
// turning at 0.9 rad/s needs about 1.9 s and 110 px to come about, and an
// alarmed one needs more — so a fixed band that was comfortable on a desktop
// was crossed before the turn finished on a phone-width pond, and the koi left
// the frame with no storm and no ripples anywhere near them. The band is sized
// from the fish's OWN speed, and where the viewport is too narrow to give it
// one, the remaining distance is bought by the fish slowing and turning harder
// as it comes about — which is what a real one does and what the geometry here
// actually needs.
const EDGE_BAND_BASE = 58;
const EDGE_BAND_LOOKAHEAD = 1.9;      // seconds of travel the band must hold
const EDGE_BAND_FRAC = 0.28;          // but never more than this of the span
const EDGE_OUT_MAX = 1.6;             // how much harder it pulls once outside
const EDGE_BRAKE = 0.35;              // speed multiplier when coming about
const EDGE_TURN_BOOST = 1.3;
// AND A KOI ABOUT TO BUMP ANOTHER SLOWS DOWN. Steering weight alone could not
// keep them apart, because the limit is kinematic rather than a matter of
// priority: two fish closing head-on at 90 px/s cross a separation band faster
// than either can turn out of it. Braking buys the turn the distance it needs,
// and it is what a fish does. Measured: closest approach 21 -> 46 px.
const SEP_BRAKE = 0.45;
const CULL_MARGIN = 420;

function addNorm(acc, x, y, w) {
  const m = Math.hypot(x, y);
  if (m < 1e-9 || w === 0) return;
  acc.x += (x / m) * w;
  acc.y += (y / m) * w;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function makeFish(rand, id, x, y, heading, state) {
  const traits = { speed: rand.unit(), ripple: rand.unit(), social: rand.unit() };
  const len = BODY_LEN_PX * rand.range(SIZE_VAR[0], SIZE_VAR[1]);
  const speedVar = rand.range(0.85, 1.15);
  const seg = len / (SPINE_JOINTS - 1) * 0.82;
  const spine = [];
  for (let i = 0; i < SPINE_JOINTS; i++) {
    spine.push({ x: x - Math.cos(heading) * seg * i, y: y - Math.sin(heading) * seg * i });
  }
  // KOI MARKINGS. Part of the fish's identity, so they are rolled here with
  // the rest of it rather than in the renderer — a fish must not change its
  // pattern because a frame was drawn.
  const patches = [];
  const n = rand.int(0, 3);
  for (let i = 0; i < n; i++) {
    patches.push({
      s: rand.range(0.08, 0.78),        // along the body, 0 nose -> 1 tail base
      t: rand.range(-0.55, 0.55),       // across it, in half-widths
      rx: rand.range(0.045, 0.105),     // as a fraction of BODY LENGTH
      ry: rand.range(0.40, 0.85),       // as a fraction of the LOCAL HALF-WIDTH
      rot: rand.range(-0.6, 0.6),
    });
  }
  return {
    id, x, y, heading,
    traits, len, seg, spine, patches,
    baseSpeed: (SPEED_RANGE[0] + (SPEED_RANGE[1] - SPEED_RANGE[0]) * traits.speed) * speedVar,
    turnRate: rand.range(TURN_RANGE[0], TURN_RANGE[1]),
    wanderRate: rand.range(WANDER_RATE[0], WANDER_RATE[1]),
    wanderTheta: rand.range(0, Math.PI * 2),
    speed: 0,
    alarm: 0,
    phase: rand.range(0, Math.PI * 2),
    finPhase: rand.range(0, Math.PI * 2),
    state,                              // arriving | cruising | leaving
    fade: state === 'arriving' ? 0 : 1,
  };
}

export function createSchool({ rand, surface = createSurface(), width, height }) {
  const school = {
    fish: [],
    surface,
    nextId: 1,
    target: MAX_ON_SCREEN,
    _heldT: 0,
    _cool: 0,
    _lastTarget: -1,
    // Counters the read-out and the gate use; a population that is churning is
    // very hard to see and trivial to count.
    arrivals: 0,
    departures: 0,

    // The target population for a storm intensity. Exposed because it is a
    // claim the brief makes ("higher when calm, lower when storming") and a
    // claim should be checkable without running a pond for a minute.
    targetFor(intensity) {
      const t = IDLE_TARGET + (STORM_TARGET - IDLE_TARGET) * Math.max(0, Math.min(1, intensity));
      return Math.max(MIN_ON_SCREEN, Math.min(MAX_ON_SCREEN, Math.round(t)));
    },

    // TWO COUNTS, AND CONFLATING THEM IS A REAL DEFECT rather than a nicety.
    // `visibleCount` is what the brief's "3-7 koi on screen" is about and what
    // the read-out says. `presentCount` is what the population manager must
    // use, because containment lets a fish nose past the edge and pulls it
    // back: counting those as gone makes the manager spawn a replacement for a
    // fish that is on its way in, and the pond fills up. Measured with one
    // count doing both jobs: eighteen fish alive to keep seven on screen, and
    // a spawn or a departure every few seconds forever.
    visibleCount(w, h) {
      let n = 0;
      for (const f of school.fish) {
        if (f.state === 'leaving') continue;
        if (surface.onScreen(f.x, f.y, w, h, 0)) n++;
      }
      return n;
    },

    // Every fish containment is holding, which after the inset above is every
    // fish that has not been sent away. The manager counts these so it cannot
    // spawn a replacement for a koi that is merely turning around.
    presentCount() {
      let n = 0;
      for (const f of school.fish) if (f.state !== 'leaving') n++;
      return n;
    },

    // A place for a new fish: on screen, as far from the others as a handful of
    // tries can manage. A fish surfacing on top of another reads as a glitch.
    _spawnSpot(w, h) {
      const vis = surface.visible(w, h, 0);
      let best = null, bestD = -1;
      for (let k = 0; k < 14; k++) {
        const x = vis.x0 + vis.w * rand.range(0.10, 0.90);
        const y = vis.y0 + vis.h * rand.range(0.10, 0.90);
        let d = Infinity;
        for (const f of school.fish) d = Math.min(d, Math.hypot(f.x - x, f.y - y));
        if (d > bestD) { bestD = d; best = { x, y }; }
      }
      return best;
    },

    spawn(w, h, state = 'arriving') {
      const spot = school._spawnSpot(w, h);
      const f = makeFish(rand, school.nextId++, spot.x, spot.y, rand.range(0, Math.PI * 2), state);
      f.speed = f.baseSpeed;
      school.fish.push(f);
      if (state === 'arriving') school.arrivals++;
      return f;
    },

    // Send one fish deep. Preference goes to whoever is furthest out of frame
    // and to whoever most dislikes a disturbance — during a storm the averse
    // fish are the first to go, which is the behaviour the traits describe
    // rather than a rule about storms.
    depart(w, h) {
      const cx = w / 2, cy = height ? height / 2 / surface.squash : h / 2 / surface.squash;
      let pick = null, bestScore = -Infinity;
      const diag = Math.hypot(w, h / surface.squash) || 1;
      for (const f of school.fish) {
        if (f.state === 'leaving') continue;
        const dist = Math.hypot(f.x - cx, f.y - cy) / diag;
        const score = dist + (1 - f.traits.ripple) * 0.8;
        if (score > bestScore) { bestScore = score; pick = f; }
      }
      if (pick) { pick.state = 'leaving'; school.departures++; }
      return pick;
    },

    // Fill the pond at full visibility, for a page that opens with koi already
    // in it rather than fading up out of nothing.
    seed(w, h, n) {
      const count = n === undefined ? school.targetFor(0) : n;
      for (let i = 0; i < count; i++) school.spawn(w, h, 'cruising');
    },

    advance(dt, { ripples = [], intensity = 0, width: w = width, height: h = height } = {}) {
      const vis = surface.visible(w, h, 0);
      const capX = vis.w * EDGE_BAND_FRAC, capY = vis.h * EDGE_BAND_FRAC;
      const sepRange = SEP_RANGE_LEN * BODY_LEN_PX;

      for (const f of school.fish) {
        const steer = { x: 0, y: 0 };
        const fx = Math.cos(f.heading), fy = Math.sin(f.heading);

        // --- meander -------------------------------------------------------
        f.wanderTheta += rand.signed() * f.wanderRate * dt;
        addNorm(steer,
          fx * WANDER_DIST + Math.cos(f.wanderTheta) * WANDER_R,
          fy * WANDER_DIST + Math.sin(f.wanderTheta) * WANDER_R,
          W_WANDER);

        // --- ripples, whatever made them -----------------------------------
        let rx = 0, ry = 0, wsum = 0;
        for (let i = 0; i < ripples.length; i++) {
          const rip = ripples[i];
          const dx = rip.x - f.x, dy = rip.y - f.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > RIPPLE_REACH * RIPPLE_REACH) continue;
          const d = Math.sqrt(d2) || 1e-6;
          const prox = 1 - d / RIPPLE_REACH;
          const fresh = Math.max(0, 1 - rip.age / rip.life);
          const wgt = rip.strength * fresh * prox;
          rx += (dx / d) * wgt; ry += (dy / d) * wgt; wsum += wgt;
          const front = Math.abs(d - rip.r);
          if (front < FRONT_BAND) {
            f.alarm += rip.strength * (1 - front / FRONT_BAND) * prox * ALARM_GAIN * dt;
          }
        }
        if (wsum > 0) {
          // Signed about the midpoint: -1 flees, +1 approaches, 0 ignores.
          const pull = (f.traits.ripple - 0.5) * 2;
          addNorm(steer, rx, ry, W_RIPPLE * pull * Math.min(1, wsum));
        }

        // --- company, or the lack of it ------------------------------------
        let cx = 0, cy = 0, ax = 0, ay = 0, n = 0;
        let sx = 0, sy = 0, sepPeak = 0;
        for (const o of school.fish) {
          if (o === f || o.state === 'leaving') continue;
          const dx = o.x - f.x, dy = o.y - f.y;
          const d = Math.hypot(dx, dy);
          if (d < 1e-6) continue;
          if (d < SOCIAL_RANGE) {
            cx += o.x; cy += o.y;
            ax += Math.cos(o.heading); ay += Math.sin(o.heading);
            n++;
          }
          if (d < sepRange) {
            const push = 1 - d / sepRange;
            sx -= (dx / d) * push; sy -= (dy / d) * push;
            if (push > sepPeak) sepPeak = push;
          }
        }
        if (n > 0) {
          const soc = (f.traits.social - 0.5) * 2;
          addNorm(steer, cx / n - f.x, cy / n - f.y, W_SOCIAL * soc);
          if (soc > 0) addNorm(steer, ax, ay, W_ALIGN * soc);
        }
        addNorm(steer, sx, sy, W_SEPARATE * (1 + SEP_URGENCY * sepPeak));

        // --- the frame is not a wall, but it is a preference ----------------
        let ox = 0, oy = 0;
        const reach = EDGE_BAND_BASE + f.speed * EDGE_BAND_LOOKAHEAD;
        const bandX = Math.min(capX, reach), bandY = Math.min(capY, reach);
        const dLeft = f.x - vis.x0, dRight = vis.x1 - f.x;
        const dTop = f.y - vis.y0, dBottom = vis.y1 - f.y;
        if (dLeft < bandX) ox += Math.min(EDGE_OUT_MAX, (bandX - dLeft) / bandX);
        if (dRight < bandX) ox -= Math.min(EDGE_OUT_MAX, (bandX - dRight) / bandX);
        if (dTop < bandY) oy += Math.min(EDGE_OUT_MAX, (bandY - dTop) / bandY);
        if (dBottom < bandY) oy -= Math.min(EDGE_OUT_MAX, (bandY - dBottom) / bandY);
        let edgeMag = 0;
        if (ox !== 0 || oy !== 0) {
          edgeMag = Math.min(EDGE_OUT_MAX, Math.hypot(ox, oy));
          addNorm(steer, ox, oy, W_EDGE * edgeMag);
        }

        // --- resolve --------------------------------------------------------
        if (steer.x !== 0 || steer.y !== 0) {
          const want = Math.atan2(steer.y, steer.x);
          const diff = wrapAngle(want - f.heading);
          const maxTurn = f.turnRate * (1 + f.alarm * ALARM_TURN + edgeMag * EDGE_TURN_BOOST) * dt;
          f.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
        }
        f.alarm = Math.min(1, f.alarm) * Math.exp(-dt / ALARM_TAU);

        const brake = (1 - (1 - EDGE_BRAKE) * Math.min(1, edgeMag)) * (1 - SEP_BRAKE * sepPeak);
        const wantSpeed = f.baseSpeed * (1 + f.alarm * ALARM_SPEED) * brake;
        f.speed += (wantSpeed - f.speed) * Math.min(1, dt * SPEED_LERP);

        f.x += Math.cos(f.heading) * f.speed * dt;
        f.y += Math.sin(f.heading) * f.speed * dt;

        // The body follows the head: each joint is pulled to a fixed distance
        // behind the one in front. Turning then makes the S-curve on its own,
        // with no swim wave needed to sell it.
        const sp = f.spine;
        sp[0].x = f.x; sp[0].y = f.y;
        for (let i = 1; i < sp.length; i++) {
          const dx = sp[i].x - sp[i - 1].x, dy = sp[i].y - sp[i - 1].y;
          const d = Math.hypot(dx, dy) || 1e-6;
          sp[i].x = sp[i - 1].x + (dx / d) * f.seg;
          sp[i].y = sp[i - 1].y + (dy / d) * f.seg;
        }

        f.phase += dt * (2.2 + f.speed * 0.055);
        f.finPhase += dt * 1.7;

        if (f.state === 'arriving') {
          f.fade += dt / ARRIVE_S;
          if (f.fade >= 1) { f.fade = 1; f.state = 'cruising'; }
        } else if (f.state === 'leaving') {
          f.fade -= dt / LEAVE_S;
        }
      }

      // --- remove what has gone --------------------------------------------
      school.fish = school.fish.filter(f =>
        f.fade > 0 && surface.onScreen(f.x, f.y, w, h, CULL_MARGIN));

      // --- population -------------------------------------------------------
      const target = school.targetFor(intensity);
      if (target !== school._lastTarget) { school._lastTarget = target; school._heldT = 0; }
      else school._heldT += dt;
      school.target = target;
      school._cool -= dt;

      const live = school.presentCount();
      if (school._heldT >= TARGET_HOLD_S && school._cool <= 0) {
        if (live < target) { school.spawn(w, h); school._cool = SPAWN_COOL_S; }
        else if (live > target) { school.depart(w, h); school._cool = DEPART_COOL_S; }
      }
    },
  };
  return school;
}
