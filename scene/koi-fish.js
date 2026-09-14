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
// A KOI IS NEVER PLACED IN VIEW AND NEVER VANISHES FROM IT. Every fish is born
// outside the visible frame and swims in, and every fish that leaves swims out
// and is removed only once its whole body is clear. There is no fade and no
// pop: `entering` becomes `cruising` on the frame the koi is first on screen,
// and `leaving` is culled on the frame it is last off it — both GEOMETRIC
// transitions, decided by the surface's own onScreen, so nothing here has to be
// trusted to report its own arrival honestly. That is also why a koi that has been sent
// away can be RECALLED: a storm that ends a second after a departure must not
// put an eighth fish on the water while the seventh is still swimming off.
//
// THE FRONT IS WHAT STARTLES, NOT THE SPLASH. A fish is disturbed when the
// expanding ring actually reaches it (|distance - r| small), not the instant
// the drop lands somewhere across the pond. The steering pull toward or away
// from the ripple's centre is separate and starts at once, which is the
// difference between seeing a disturbance and feeling it.

import { createSurface } from './surface.js';

export const BODY_LEN_PX = 96;        // ~1 inch at a typical 96 CSS-px inch
export const SIZE_VAR = [0.82, 1.18]; // "mild size variation per fish"

// A KOI IS A FIXED NUMBER OF PIXELS AND A PHONE IS NOT A DESKTOP. Measured on
// the shipped page: the drawn silhouette is the same 154 px at 1440x900, at
// 1280x800 and at 390x844 — the body length is a constant and nothing scaled
// it — so a koi is 17% of the short side on a desktop and 39% on a phone. The
// reference photograph's koi run 15-26% of its frame's short side, median 21%.
// So the desktop was already right and the phone was the thing that was wrong,
// which is the opposite of the way round it had been assumed.
//
// THE LAW IS FLOORED AND CAPPED AT 1, so every viewport at or above the
// reference short side is UNCHANGED — a desktop, a laptop and a tablet all
// draw exactly the koi they drew before. Only a genuinely small frame scales,
// and the floor stops a very narrow one from breeding minnows: at 390 px the
// scale lands on the floor, giving an 85 px silhouette, 22% of the short side
// and squarely inside the reference's own range.
export const BODY_REF_SHORT = 800;    // short side at which a koi is full size
export const BODY_MIN_SCALE = 0.55;

export function bodyScale(width, height) {
  const short = Math.max(1, Math.min(width, height));
  return Math.max(BODY_MIN_SCALE, Math.min(1, short / BODY_REF_SHORT));
}
export const SPINE_JOINTS = 9;

// WHERE THE BODY ENDS AND THE TAIL BEGINS, shared by the simulation and the
// renderer because it is one fact about the animal: the last body joint IS the
// root the tail lobes hang from, so neither side can place it somewhere the
// other does not.
export const TAIL_ROOT_U = 0.90;

// THE CHAIN CANNOT HAIRPIN, AND THAT IS A CONSTRAINT RATHER THAN A FILTER.
// A plain follow-the-leader chain places each joint one segment behind the one
// ahead in whatever direction it already lay, and says nothing about the angle
// between consecutive segments — so when a koi turns inside its own segment
// length (it can: at 21 px/s and 4 rad/s the turn radius is half a segment) the
// body doubles back on itself. Measured on the chain without this clamp, over
// four minutes of pond: the angle between consecutive segments reaches 180
// degrees, exceeds 120 on 0.28% of joint-frames and 90 on 0.55%.
//
// Capping that angle makes the fold UNREACHABLE rather than unlikely. It is
// the one place the constraint belongs: downstream of it every consumer — the
// contour, the fins, the markings, both tail lobes — is safe by construction,
// where a smoothing pass would only make a fold rarer.
const CHAIN_MAX_BEND = 0.42;     // rad between consecutive segments

// THE TAIL IS TWO CHAINS, NOT ONE HINGED FAN. Each lobe trails on its own, so
// the chain's lag reaches all the way through the tail instead of stopping at
// a rigid piece bolted to the last joint. The first segment of each is RIGID to
// the body — it is the lobe's attachment, and it is what gives the two lobes
// their splay; a pure follow-the-leader chain has no rest direction, so two
// lobes trailing from one root would collapse onto the same line.
export const LOBE_JOINTS = 6;
export const TAIL_LOBE_REST = 0.31;   // rad off the body's backward axis
const LOBE_SPAN = 0.70;               // of body length, so the fan never runs past it

// Place `n` one segment behind `lead`, in the direction it already lay, with
// the turn from `refAng` capped. Returns the direction actually used, which is
// the reference for the joint behind it.
function trail(lead, n, seg, refAng) {
  const dx = n.x - lead.x, dy = n.y - lead.y;
  const d = Math.hypot(dx, dy);
  // A joint sitting exactly on its leader has no direction of its own; keep the
  // one in front rather than letting atan2(0, 0) snap it to +x.
  let ang = d > 1e-9 ? Math.atan2(dy, dx) : refAng;
  const turn = wrapAngle(ang - refAng);
  if (turn > CHAIN_MAX_BEND) ang = refAng + CHAIN_MAX_BEND;
  else if (turn < -CHAIN_MAX_BEND) ang = refAng - CHAIN_MAX_BEND;
  n.x = lead.x + Math.cos(ang) * seg;
  n.y = lead.y + Math.sin(ang) * seg;
  return ang;
}

// HOW HARD A KOI IS TURNING, SMOOTHED — the one thing the renderer needs to
// bend the body, and the only number this file exports for a drawing decision.
// A koi's body lies along the path it has just swum, so an arc of curvature
// omega/speed IS the spine; koi-draw.js reads it and nothing else.
//
// SMOOTHED BECAUSE THE RAW PER-FRAME DELTA IS NOISE. The heading is resolved
// against a steering vector that several behaviours write to, so it jitters
// frame to frame even on a fish swimming a visibly smooth line — and an
// unfiltered omega makes the body twitch rather than flow. One time constant,
// long enough to read as a body following a turn rather than reacting to one.
const OMEGA_TAU = 0.22;

// WHERE THE KOI IS DRAWN IS NOT WHERE THE KOI IS, AND THAT IS THE WHOLE FIX FOR
// THE JITTER. The steering vector several behaviours write to genuinely
// REVERSES frame to frame — measured over a 60 s run, the sign of the turn
// flips on 2.7% of fish-frames at rest and 5.8% in a storm, and a single frame
// carried the turn rate from -3.749 to +3.752 to -3.756 rad/s. That is real
// behaviour and it is not wrong: a koi picking its way through a crowded ripple
// field does change its mind. What is wrong is DRAWING it at 60 Hz.
//
// So the renderer reads a lagged placement — drawX / drawY / drawHeading — and
// never f.x / f.y / f.heading. Position and heading are lagged with ONE time
// constant ON PURPOSE: a low-pass of both together is (near enough) the same
// fish a tenth of a second ago, so the nose still points along the way the
// drawn body is actually moving — measured, within 1.5 degrees of it at p99
// and 5.2 at the worst. Lagging the HEADING alone leaves a koi aimed 21.5
// degrees off its own travel at p99 and 24.9 at the worst, which is a fish
// swimming sideways; that split is a mutant.
//
// NOTHING BEHAVIOURAL READS ANY OF THEM. Steering, containment, the population
// and every geometric state test are on f.x / f.y / f.heading exactly as
// before, so this moves no check in the gate: it is a drawing decision living
// beside the simulation that feeds it, not a change to the simulation. Measured
// against a tree without them: 119,550 behaviour values over a minute of pond,
// 0 differ.
//
// WHERE IT DOES MEET A GEOMETRIC TEST, THE MARGIN IS THE ANSWER AND IT WAS
// CHECKED RATHER THAN ASSUMED. A lagged koi is drawn BEHIND where the
// simulation has it — measured, 7.3% of a body length at the median and 18.8%
// at the worst — while a leaving koi is kept until LEAVE_CLEAR_LEN puts it 1.1
// body lengths clear. So at the moment one is culled the DRAWN koi is still at
// least 0.9 body lengths outside the frame, and the rule that no koi vanishes
// in view survives the lag with room to spare. Shortening that margin toward a
// fifth of a body would not.
const DRAW_TAU = 0.12;

// AND THE BEND BIAS EASES ON TOP OF THAT, WHICH IS A SECOND STAGE RATHER THAN A
// LONGER FIRST ONE. f.omega is the MEASUREMENT — how hard this koi is turning,
// smoothed just enough to be a number — and f.bend is what the body is DRAWN
// curving by. A body does not change its curvature the instant the turn rate
// does, and two first-order stages in series reject the reversal burst far
// better than one stage of the same total delay: the fast one keeps the
// measurement honest, the slow one keeps the drawn spine from flapping.
const BEND_TAU = 0.28;

export const MIN_ON_SCREEN = 3;
export const MAX_ON_SCREEN = 7;
const IDLE_TARGET = 6.6;              // rounds to 7 — "the higher end"
const STORM_TARGET = 3.1;             // rounds to 3 — "lower when it is"
const TARGET_HOLD_S = 1.2;            // the target must persist before acting
const SPAWN_COOL_S = 1.6;
const DEPART_COOL_S = 1.3;

// HOW FAR OUTSIDE A KOI IS BORN. A whole body clear of the edge, at the
// LARGEST size a fish can roll, so the figure is outside for every fish rather
// than for the average one — and the spine trails further out still, since it
// is laid down behind a head that is pointing in.
const SPAWN_OUT = BODY_LEN_PX * SIZE_VAR[1] * 1.35;
const ENTRY_JITTER = 0.45;            // rad either side of straight in
const ENTRY_TRIES = 12;
// A departing koi is removed one body length past the edge, which is where the
// last of it has gone. CULL_MARGIN is the safety net for the other states.
const LEAVE_CLEAR_LEN = 1.1;
const W_EXIT = 3.2;                   // as strong as containment, and opposed
const EXIT_BIAS = 0.25;               // how much an aligned edge is preferred
const RECALL_MARGIN = 40;             // still near enough to turn back
const SPAWN_LOG_MAX = 64;

// THE POND OPENS FULL, AND IT STILL OBEYS THE RULE. The koi the page starts
// with are spawned outside like every other and then swum in, in simulated
// time, before the first frame is drawn — so "no koi is ever placed inside the
// frame" has no exception for the seed. Eighteen seconds at ~39 plane px/s is
// about 700 px of travel, which puts a fish well past the containment band and
// into the body of the pond; the whole warm-up is a few hundred allocation-free
// steps and does not touch the canvas.
const SEED_WARMUP_S = 18;
const SEED_WARMUP_DT = 1 / 30;

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
// SECONDS OF TRAVEL THE BAND MUST HOLD. Raised from 1.9 to 2.8 so containment
// starts pulling a koi round EARLIER, and the reason is the brief's own floor
// rather than anything about how the swimming looks.
//
// THE POND IS MEANT TO SHOW 3-7 KOI AND TO THIN DURING A STORM, and the storm
// target is 3 — the floor exactly. So a single CRUISING koi drifting out of
// frame, which is ordinary swimming rather than a defect, put the pond at 2 and
// broke the brief. Instrumented at the dip: three koi alive, all three cruising,
// one of them momentarily outside the frame; no leaver, no replacement in
// transit. At 1.9 s of lookahead that happens on 1 of 48 storm runs (16 seeds x
// three viewports, 70 s each) — and on main too, on a different seed, which is
// the only reason the gate has been green.
//
// THE ALTERNATIVE WAS TO RAISE THE STORM TARGET TO 4, which buys the same
// margin and was measured to work; it is not taken, because the target is a
// ruled number and the koi leaving the frame is the actual defect. At 2.8 the
// dip rate is 0 of 48 and the target stays where the brief put it.
const EDGE_BAND_LOOKAHEAD = 2.8;      // seconds of travel the band must hold
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

function makeFish(rand, id, x, y, heading, state, scale = 1) {
  const traits = { speed: rand.unit(), ripple: rand.unit(), social: rand.unit() };
  const len = BODY_LEN_PX * scale * rand.range(SIZE_VAR[0], SIZE_VAR[1]);
  const speedVar = rand.range(0.85, 1.15);
  // The chain spans exactly as far as the drawn body does, so the last joint
  // lands on the tail root and no part of the outline has to be extrapolated
  // off the end of it.
  const seg = TAIL_ROOT_U * len / (SPINE_JOINTS - 1);
  const lobeSeg = LOBE_SPAN * len / (LOBE_JOINTS - 1);
  const spine = [];
  for (let i = 0; i < SPINE_JOINTS; i++) {
    spine.push({ x: x - Math.cos(heading) * seg * i, y: y - Math.sin(heading) * seg * i });
  }
  // Both lobes seeded straight out along their own rest direction, so a koi's
  // first drawn frame is the same fish its hundredth is.
  const root = spine[SPINE_JOINTS - 1];
  const lobes = [1, -1].map((side) => {
    const a = heading + Math.PI + side * TAIL_LOBE_REST;
    const arr = [];
    for (let i = 0; i < LOBE_JOINTS; i++) {
      arr.push({ x: root.x + Math.cos(a) * lobeSeg * i, y: root.y + Math.sin(a) * lobeSeg * i });
    }
    return arr;
  });
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
    id, x, y, heading, omega: 0,
    // Render state. Seeded at the spawn pose so the first frame draws the koi
    // where it actually is rather than easing in from the origin.
    drawX: x, drawY: y, drawHeading: heading, bend: 0,
    traits, len, seg, lobeSeg, spine, lobes, patches,
    baseSpeed: (SPEED_RANGE[0] + (SPEED_RANGE[1] - SPEED_RANGE[0]) * traits.speed) * speedVar,
    turnRate: rand.range(TURN_RANGE[0], TURN_RANGE[1]),
    wanderRate: rand.range(WANDER_RATE[0], WANDER_RATE[1]),
    wanderTheta: rand.range(0, Math.PI * 2),
    speed: 0,
    alarm: 0,
    phase: rand.range(0, Math.PI * 2),
    finPhase: rand.range(0, Math.PI * 2),
    // entering (outside, swimming in) | cruising | leaving (swimming out).
    // Both edges of that are geometric: see the note at the top of the file.
    // There is no fade, so a koi is never partly there while it is in view.
    state,
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
    recalls: 0,
    // Where every koi was born, with the viewport it was born into. Bounded,
    // and read by the gate rather than by anything that draws.
    spawnLog: [],

    // The target population for a storm intensity. Exposed because it is a
    // claim the brief makes ("higher when calm, lower when storming") and a
    // claim should be checkable without running a pond for a minute.
    targetFor(intensity) {
      const t = IDLE_TARGET + (STORM_TARGET - IDLE_TARGET) * Math.max(0, Math.min(1, intensity));
      return Math.max(MIN_ON_SCREEN, Math.min(MAX_ON_SCREEN, Math.round(t)));
    },

    // TWO COUNTS, AND CONFLATING THEM IS A REAL DEFECT rather than a nicety.
    // `visibleCount` answers the brief's "3-7 koi on screen" literally: how
    // many koi are within the frame, whatever they are doing — a koi on its
    // way out is still on the water and still being looked at.
    // `presentCount` is what the population manager must use: it is the count
    // of koi that are STAYING, so a fish that is merely nosing past the edge
    // and being pulled back is not replaced (that conflation is what once
    // filled the pond with sixteen koi to keep seven on screen) and a fish
    // that has been sent away does not keep the manager from acting.
    visibleCount(w, h) {
      let n = 0;
      for (const f of school.fish) if (surface.onScreen(f.x, f.y, w, h, 0)) n++;
      return n;
    },

    presentCount() {
      let n = 0;
      for (const f of school.fish) if (f.state !== 'leaving') n++;
      return n;
    },

    // WHERE A KOI COMES FROM: outside the frame, pointing in. The edge is
    // chosen with the heading, not after it — a fish enters through the edge
    // it is aimed at, which is what makes the entry read as swimming in rather
    // than as a spawn that then turns around. Among a handful of candidates the
    // one furthest from the koi already in the pond wins, so entries spread
    // along the edges instead of stacking in one corner.
    _entrySpot(w, h) {
      const vis = surface.visible(w, h, 0);
      let best = null, bestD = -1;
      for (let k = 0; k < ENTRY_TRIES; k++) {
        const edge = rand.int(0, 3);
        const t = rand.range(0.08, 0.92);
        let x, y, inward;
        if (edge === 0)      { x = vis.x0 - SPAWN_OUT; y = vis.y0 + vis.h * t; inward = 0; }
        else if (edge === 1) { x = vis.x1 + SPAWN_OUT; y = vis.y0 + vis.h * t; inward = Math.PI; }
        else if (edge === 2) { x = vis.x0 + vis.w * t; y = vis.y0 - SPAWN_OUT; inward = Math.PI / 2; }
        else                 { x = vis.x0 + vis.w * t; y = vis.y1 + SPAWN_OUT; inward = -Math.PI / 2; }
        const heading = inward + rand.range(-ENTRY_JITTER, ENTRY_JITTER);
        let d = Infinity;
        for (const f of school.fish) d = Math.min(d, Math.hypot(f.x - x, f.y - y));
        if (d > bestD) { bestD = d; best = { x, y, heading }; }
      }
      return best;
    },

    spawn(w, h, { counted = true } = {}) {
      const spot = school._entrySpot(w, h);
      const f = makeFish(rand, school.nextId++, spot.x, spot.y, spot.heading, 'entering',
                         bodyScale(w, h));
      f.speed = f.baseSpeed;
      school.fish.push(f);
      if (counted) school.arrivals++;
      // THE GATE JUDGES THIS, NOT THE SCHOOL. What is recorded is the position
      // and the viewport it was born into; whether that is inside the frame is
      // decided by surface.visible() on the far side, which is an owner this
      // file does not write. A self-reported "I spawned outside" flag would be
      // exactly the claim under test answering for itself.
      school.spawnLog.push({ id: f.id, x: spot.x, y: spot.y, w, h });
      if (school.spawnLog.length > SPAWN_LOG_MAX) school.spawnLog.shift();
      return f;
    },

    // Send one fish deep. Preference goes to whoever is furthest out of frame
    // and to whoever most dislikes a disturbance — during a storm the averse
    // fish are the first to go, which is the behaviour the traits describe
    // rather than a rule about storms.
    depart(w, h) {
      // THE CURRENT HEIGHT, NOT THE ONE THE SCHOOL WAS BUILT WITH. `height` is
      // the constructor's argument and goes stale the moment the window is
      // resized, which would have this picking a departure by distance from a
      // centre the pond no longer has.
      const cx = w / 2, cy = h / 2 / surface.squash;
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

    // TURN ONE BACK RATHER THAN CALL A NEW ONE IN. A koi that was sent away a
    // moment ago and is still in the frame is the cheapest fish in the pond:
    // it is already on screen, so recalling it costs nothing and shows nothing,
    // where spawning would put an extra koi on the water while this one is
    // still swimming off — which is how a downpour that ends promptly used to
    // be able to leave eight koi in view. The deepest-in one is chosen, since
    // it has the least distance to undo.
    recall(w, h) {
      const vis = surface.visible(w, h, 0);
      let pick = null, best = -Infinity;
      for (const f of school.fish) {
        if (f.state !== 'leaving') continue;
        const depth = Math.min(f.x - vis.x0, vis.x1 - f.x, f.y - vis.y0, vis.y1 - f.y);
        if (depth < -RECALL_MARGIN) continue;     // effectively gone already
        if (depth > best) { best = depth; pick = f; }
      }
      if (pick) { pick.state = 'cruising'; school.recalls++; }
      return pick;
    },

    // THE POND OPENS FULL, AND THE SEED OBEYS THE SAME RULE AS EVERYTHING ELSE.
    // These koi are spawned outside the frame like any other and then swum in,
    // in simulated time, before a single frame is drawn — so the page opens on
    // a pond rather than on a page that is still filling, and there is still no
    // koi anywhere in this file that was placed in view. The population manager
    // is held off for the warm-up so it cannot act on a pond that is mid-entry.
    seed(w, h, n) {
      const count = n === undefined ? school.targetFor(0) : n;
      for (let i = 0; i < count; i++) school.spawn(w, h, { counted: false });
      const steps = Math.round(SEED_WARMUP_S / SEED_WARMUP_DT);
      school._cool = Infinity;
      for (let i = 0; i < steps; i++) {
        school.advance(SEED_WARMUP_DT, { ripples: [], intensity: 0, width: w, height: h });
      }
      school._cool = 0;
      school._heldT = 0;
    },

    advance(dt, { ripples = [], intensity = 0, width: w = width, height: h = height } = {}) {
      const vis = surface.visible(w, h, 0);
      const capX = vis.w * EDGE_BAND_FRAC, capY = vis.h * EDGE_BAND_FRAC;
      // Separation is measured in BODY LENGTHS, so it follows the body: on a
      // frame where the koi are smaller, keeping them a fixed number of PIXELS
      // apart would spread a small school as widely as a full-size one.
      const sepRange = SEP_RANGE_LEN * BODY_LEN_PX * bodyScale(w, h);

      for (const f of school.fish) {
        const steer = { x: 0, y: 0 };
        const fx = Math.cos(f.heading), fy = Math.sin(f.heading);
        // Read BEFORE any behaviour writes the heading, and differenced at the
        // end of the step: every write is then covered, whichever branch made
        // it, rather than only the one steering site.
        const headingWas = f.heading;

        // --- meander -------------------------------------------------------
        f.wanderTheta += rand.signed() * f.wanderRate * dt;
        addNorm(steer,
          fx * WANDER_DIST + Math.cos(f.wanderTheta) * WANDER_R,
          fy * WANDER_DIST + Math.sin(f.wanderTheta) * WANDER_R,
          W_WANDER);

        // --- ripples, whatever made them -----------------------------------
        let rx = 0, ry = 0, wsum = 0;
        let alarmHit = 0;
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
          // THE STRONGEST FRONT REACHING THE FISH, NOT THE SUM OF THEM. This
          // was `f.alarm += ...` inside the loop, which is an UNBOUNDED SUM
          // over the ripple field — fine while the field was a dozen rings,
          // meaningless once it is a couple of hundred. A fish sitting under a
          // dense shower has several fronts crossing it at any moment, so the
          // sum pinned `alarm` at its ceiling permanently: every koi swam at
          // its alarmed speed and turned at its alarmed rate for the whole run,
          // reached the edges far more often, and the pond dipped to 2 on
          // screen against a floor of 3. Measured — it is what took the
          // population check red when the rain density went up.
          //
          // A max is DENSITY-INVARIANT, which is the property that was missing:
          // being startled is about the biggest disturbance that reaches you,
          // and ten faint ones do not add up to a slammed door. It also matches
          // what the steering pull beside it already does — `Math.min(1, wsum)`
          // saturates for the same reason.
          const front = Math.abs(d - rip.r);
          if (front < FRONT_BAND) {
            const hit = rip.strength * (1 - front / FRONT_BAND) * prox;
            if (hit > alarmHit) alarmHit = hit;
          }
        }
        if (alarmHit > 0) f.alarm += alarmHit * ALARM_GAIN * dt;
        if (wsum > 0) {
          // Signed about the midpoint: -1 flees, +1 approaches, 0 ignores.
          const pull = (f.traits.ripple - 0.5) * 2;
          addNorm(steer, rx, ry, W_RIPPLE * pull * Math.min(1, wsum));
        }

        // --- company, or the lack of it ------------------------------------
        let cx = 0, cy = 0, ax = 0, ay = 0, n = 0;
        let sx = 0, sy = 0, sepPeak = 0;
        for (const o of school.fish) {
          if (o === f) continue;
          const dx = o.x - f.x, dy = o.y - f.y;
          const d = Math.hypot(dx, dy);
          if (d < 1e-6) continue;
          // A KOI ON ITS WAY OUT IS NOT COMPANY, BUT IT IS STILL A BODY. It is
          // no longer part of the school to join or avoid — following one would
          // drag a stayer toward the edge, and being followed would drag the
          // leaver back — but it is on screen for the whole of its exit now,
          // so it must not be swum through.
          if (d < SOCIAL_RANGE && o.state !== 'leaving' && f.state !== 'leaving') {
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
        // CONTAINMENT IS FOR THE KOI THAT ARE STAYING. It pulls INWARD, which
        // is what carries an entering fish in from outside as well as what
        // turns a cruising one back — the same force, doing both jobs, because
        // both are "the pond is that way". A koi that has been sent away is the
        // one case where inward is wrong, so it is steered the other way
        // instead: see the exit below.
        const dLeft = f.x - vis.x0, dRight = vis.x1 - f.x;
        const dTop = f.y - vis.y0, dBottom = vis.y1 - f.y;
        let ox = 0, oy = 0, edgeMag = 0;
        if (f.state === 'leaving') {
          // OUT BY THE NEAREST EDGE IT IS ALREADY POINTED AT. Distance alone
          // would turn a koi that is swimming right and two body lengths from
          // the left edge back across the whole frame; the alignment term makes
          // the edge it is heading for cheaper, and EXIT_BIAS keeps a genuinely
          // much nearer edge reachable when the fish is pointed at neither.
          const outs = [[-1, 0, dLeft], [1, 0, dRight], [0, -1, dTop], [0, 1, dBottom]];
          let bx = -1, by = 0, bestCost = Infinity;
          for (const [dx, dy, dist] of outs) {
            const align = Math.max(0, fx * dx + fy * dy);
            const cost = Math.max(0, dist) / (EXIT_BIAS + align);
            if (cost < bestCost) { bestCost = cost; bx = dx; by = dy; }
          }
          addNorm(steer, bx, by, W_EXIT);
        } else {
          const reach = EDGE_BAND_BASE + f.speed * EDGE_BAND_LOOKAHEAD;
          const bandX = Math.min(capX, reach), bandY = Math.min(capY, reach);
          if (dLeft < bandX) ox += Math.min(EDGE_OUT_MAX, (bandX - dLeft) / bandX);
          if (dRight < bandX) ox -= Math.min(EDGE_OUT_MAX, (bandX - dRight) / bandX);
          if (dTop < bandY) oy += Math.min(EDGE_OUT_MAX, (bandY - dTop) / bandY);
          if (dBottom < bandY) oy -= Math.min(EDGE_OUT_MAX, (bandY - dBottom) / bandY);
          if (ox !== 0 || oy !== 0) {
            edgeMag = Math.min(EDGE_OUT_MAX, Math.hypot(ox, oy));
            addNorm(steer, ox, oy, W_EDGE * edgeMag);
          }
        }

        // --- resolve --------------------------------------------------------
        if (steer.x !== 0 || steer.y !== 0) {
          const want = Math.atan2(steer.y, steer.x);
          const diff = wrapAngle(want - f.heading);
          const maxTurn = f.turnRate * (1 + f.alarm * ALARM_TURN + edgeMag * EDGE_TURN_BOOST) * dt;
          f.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
        }
        f.alarm = Math.min(1, f.alarm) * Math.exp(-dt / ALARM_TAU);

        // THE EDGE BRAKE IS FOR A KOI HEADING OUT, NOT FOR ONE NEAR THE EDGE.
        // It exists to buy a turn the distance it needs, and a fish already
        // pointed back into the pond has no turn left to buy. Ungated it also
        // applies to an ENTERING koi, which is as deep in the band as anything
        // ever gets: measured, an entry at 35% of cruising speed took fifteen
        // seconds to cross a hundred and fifty plane px, so the pond spent its
        // time waiting for fish that were visibly barely moving. Scaling by how
        // far the heading is from where containment is pulling leaves the
        // coming-about case exactly as it was and costs the entry nothing.
        let edgeBrake = 0;
        if (edgeMag > 0) {
          const im = Math.hypot(ox, oy) || 1;
          const against = Math.max(0, -(fx * ox + fy * oy) / im);
          edgeBrake = (1 - EDGE_BRAKE) * Math.min(1, edgeMag) * against;
        }
        const brake = (1 - edgeBrake) * (1 - SEP_BRAKE * sepPeak);
        const wantSpeed = f.baseSpeed * (1 + f.alarm * ALARM_SPEED) * brake;
        f.speed += (wantSpeed - f.speed) * Math.min(1, dt * SPEED_LERP);

        f.x += Math.cos(f.heading) * f.speed * dt;
        f.y += Math.sin(f.heading) * f.speed * dt;


        // The turn this step actually came to, low-passed. wrapAngle so a step
        // across +/-pi is a small turn rather than a full revolution.
        if (dt > 0) {
          const raw = wrapAngle(f.heading - headingWas) / dt;
          f.omega += (raw - f.omega) * Math.min(1, dt / OMEGA_TAU);
        }

        // The drawn placement follows the real one. wrapAngle again, so the
        // lag takes the short way round +/-pi instead of unwinding a whole
        // revolution the koi never swam.
        const kDraw = Math.min(1, dt / DRAW_TAU);
        f.drawX += (f.x - f.drawX) * kDraw;
        f.drawY += (f.y - f.drawY) * kDraw;
        f.drawHeading = wrapAngle(f.drawHeading
          + wrapAngle(f.heading - f.drawHeading) * kDraw);
        f.bend += (f.omega - f.bend) * Math.min(1, dt / BEND_TAU);

        // THE BODY FOLLOWS THE HEAD, AND THE TAIL FOLLOWS THE BODY. Each joint
        // is pulled to a fixed distance behind the one in front with its turn
        // capped, so the S-curve through a turn is the chain's own physical lag
        // and there is no curvature formula anywhere. Driven from the LAGGED
        // placement, not the raw one, for the reason in the note above it.
        const sp = f.spine;
        sp[0].x = f.drawX; sp[0].y = f.drawY;
        let ref = f.drawHeading + Math.PI;        // backward, from the head
        for (let i = 1; i < sp.length; i++) ref = trail(sp[i - 1], sp[i], f.seg, ref);

        // Each lobe: the first segment rigid to the body at its rest angle,
        // every joint behind it trailing on its own.
        const root = sp[sp.length - 1];
        for (let k = 0; k < f.lobes.length; k++) {
          const lb = f.lobes[k], side = k === 0 ? 1 : -1;
          lb[0].x = root.x; lb[0].y = root.y;
          let la = ref + side * TAIL_LOBE_REST;
          lb[1].x = lb[0].x + Math.cos(la) * f.lobeSeg;
          lb[1].y = lb[0].y + Math.sin(la) * f.lobeSeg;
          for (let i = 2; i < lb.length; i++) la = trail(lb[i - 1], lb[i], f.lobeSeg, la);
        }

        f.phase += dt * (2.2 + f.speed * 0.055);
        f.finPhase += dt * 1.7;

        // A KOI HAS ARRIVED WHEN IT IS ON SCREEN, and that is the whole test.
        // Not a timer, not a distance travelled: the thing the state claims is
        // exactly the thing surface.onScreen answers, so the two cannot drift.
        if (f.state === 'entering' && surface.onScreen(f.x, f.y, w, h, 0)) {
          f.state = 'cruising';
        }
      }

      // --- remove what has gone --------------------------------------------
      // A departing koi is removed a body length past the edge, which is the
      // first moment none of it is in view; everything else keeps the old wide
      // safety net, for a fish that somehow got a long way out.
      school.fish = school.fish.filter(f => f.state === 'leaving'
        ? surface.onScreen(f.x, f.y, w, h, f.len * LEAVE_CLEAR_LEN)
        : surface.onScreen(f.x, f.y, w, h, CULL_MARGIN));

      // --- population -------------------------------------------------------
      const target = school.targetFor(intensity);
      if (target !== school._lastTarget) { school._lastTarget = target; school._heldT = 0; }
      else school._heldT += dt;
      school.target = target;
      school._cool -= dt;

      const live = school.presentCount();
      if (school._heldT >= TARGET_HOLD_S && school._cool <= 0) {
        if (live < target) {
          if (school.recall(w, h)) school._cool = DEPART_COOL_S;
          else { school.spawn(w, h); school._cool = SPAWN_COOL_S; }
        } else if (live > target) {
          school.depart(w, h); school._cool = DEPART_COOL_S;
        }
      }
    },
  };
  return school;
}
