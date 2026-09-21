// scene/beach-swash.js — THE TWO-LINE MODEL. The swash edge and the high-water
// mark, on different time constants, and the wet-sand memory between them.
// Pure arithmetic over a clock and a seeded stream: no DOM, no canvas, so the
// gate drives every law here in Node.
//
// ANIMATING ONE OSCILLATING WATERLINE IS THE FAILURE MODE THIS FILE EXISTS TO
// AVOID. Wet sand has to persist after the water has left it, so there are two
// boundaries and they are not the same object:
//
//   THE SWASH EDGE is DERIVED, not stored. It is the per-sample MAXIMUM over a
//   list of committed wave records — which is what the water surface actually
//   is when a new wave arrives over a sheet that has not finished draining.
//   Max-extent hands over on its own: a retreating sheet's extent is falling,
//   so the moment the new wave passes it, the new wave is the edge.
//
//   THE HIGH-WATER MARK is STORED, one number per along-shore sample, and it
//   is the wet/dry boundary itself rather than a line drawn near it.
//
// THE TWO DRYING RATES ARE TWO VARIABLES, NOT TWO BRANCHES OF ONE RATE, and
// that is the whole of how the brief's "do not use one rate for the whole
// beach" is kept:
//
//   sat[i] — THE SATURATED LEVEL. How far up the beach the ordinary waves keep
//            the sand wet. Raised by every swash toward its own reach, and
//            decaying on a time constant measured in MINUTES. This is "the
//            normal high-water mark", and on any timescale a visitor is here
//            for it is the effectively-static line the brief measured moving
//            about six pixels in three and a half seconds.
//   wet[i] — THE PUBLISHED HIGH-WATER MARK, and the invariant is wet >= sat.
//            The part ABOVE sat is the OVERRUN ZONE: sand an unusually large
//            set reached, sitting above the saturated sand, draining and drying
//            in seconds rather than minutes.
//
// So nothing applies one rate to the whole beach, because the saturated zone
// is not a decaying quantity at all — it IS sat, and the only thing that
// decays is what stands above it. An overrun therefore jumps the mark outward
// the instant it happens and then RETURNS to sat rather than ratcheting,
// because sat is an average of what the waves have been doing and not a
// running maximum of it.
//
// A WAVE IS COMMITTED AT BIRTH, AND THAT IS STRUCTURAL RATHER THAN A RULE. The
// brief says set energy biases the NEXT wave and never the one running, so a
// swash record carries its own `runup` fixed when it is spawned and holds no
// reference to the energy that chose it. SWASH_FIELDS below is that claim
// written down — there is no `energy`, no `set`, no `target` — and
// `advance()` never reads the energy at all: the ONE place it is read is
// `spawn()`. Deforming a running swash is unreachable rather than merely
// avoided, which is koi-ripples.js's discipline applied to the quantity this
// scene's brief actually cares about.
//
// AND THE RECORD IS A WAVE'S NOW, NOT A SWASH'S. Everything below is stage
// SIX of a life that starts `preS` seconds earlier, out at sea — see
// beach-wave.js, which owns stages one to five and which this list is the
// continuation of. `WAVE_FIELDS` plus these is the whole record, and the claim
// the two lists make together is the one this file already made about energy:
// there is no `energy` field in either.
export const SWASH_FIELDS = ['life', 'runup', 'advanceS', 'holdS', 'retreatS', 'wob', 'scallop', 'peaked'];

import { WATERLINE_S, RUNUP_NOMINAL, RUNUP_MAX, SAMPLES } from './beach-shore.js';
import { makeWave } from './beach-wave.js';
import { rng, lobeParams, lobesFrom } from './beach-brush.js';

// --- TIMING -----------------------------------------------------------------
// MEASURED, from the brief's own reading of the two clean drains in the
// reference: "Retreat: 2-3 seconds."
export const RETREAT_S = 2.5;

// PICKED, NOT MEASURED, and the brief says so in as many words: "Advance: fast,
// well under a second. This is NOT measured. The reference catches only the
// tail of one advance and the camera reframes mid-rush. Pick a value, expose it
// as a tunable parameter, and do not claim it was derived from the footage."
export const ADVANCE_S = 0.55;

// PICKED. The stall at the top of the runup, before the backwash starts. A
// swash that reversed at a cusp reads as a bounce; a real one arrives, stops,
// and then goes back.
export const HOLD_S = 0.28;

// PICKED, AND VARIED. "Interval between swashes: not measurable from 9 seconds
// of reference. Pick, vary, expose." A wave's whole life is ADVANCE + HOLD +
// RETREAT = 3.33 s, so an interval band that straddles it gives mostly a clear
// gap and sometimes a new wave arriving over a sheet still draining — which is
// the case the max-extent edge exists to handle.
export const INTERVAL_S = [3.2, 6.4];

// PICKED. Successive swashes must not reach identical distances, so each
// wave's reach is drawn around the current target.
//
// THE WIDTH OF THIS BAND IS WHAT DECIDES HOW STATIC THE HIGH-WATER MARK LOOKS,
// which is not obvious from where it is written. Water covering sand wets it at
// once, so any wave reaching past the standing mark moves the mark — and at
// +/-22% of a 0.20 runup that is +/-40 px of a 900 px frame on an ORDINARY
// wave, which reads as the slow line twitching every few seconds. Measured over
// four seeds, that band gives 9.5 px of movement per 3.5 s against the brief's
// measured 6; +/-12% gives 7.2. Narrowing it further was tried and rejected:
// it only reaches the brief's figure by also making `sat` track the peaks
// faster, and THAT ratchets — sat ends a big set at 0.76-0.83 where it started
// at 0.62, and at SAT_DRY_S it does not come back for minutes. The brief says
// the mark must return, so the drift stays a shade over the measured figure
// rather than being bought with a ratchet.
export const RUNUP_VARY = [0.88, 1.12];

// FROM THE REFERENCE: "Sand goes glossy -> matte over roughly half a second
// behind the departing water." The glossy band is therefore not a fixed width
// — it is however far the edge has moved in the last half second, so a fast
// drain leaves a wide one and a stalled edge a narrow one.
export const GLOSS_S = 0.5;

// --- DRYING -----------------------------------------------------------------
// The overrun zone drains and dries in SECONDS. The saturated zone is kept wet
// by every wave and only gives way over MINUTES — an order of magnitude apart,
// which is the separation the brief asks for, and they are separate variables
// so no single rate exists that could be tuned to split the difference.
// Both are "seconds to give up a full frame height", so the ratio IS the
// separation between the two zones — a factor of forty-three here.
//
// SAT_DRY_S IS SET FROM THE BRIEF'S OWN MEASUREMENT, not chosen. "Measured
// across the reference it moves about 6px in 3.5 seconds" — 1.7 px/s, which on
// a 900 px frame is 0.0019 of a frame height per second, so the time to give
// up a whole one is about 530 s. The first cut used 240 and the high-water mark
// slid down the beach at 4 px/s in an idle scene: more than twice the measured
// rate, and visible as a drift over half a minute where the reference's is
// "effectively static frame to frame".
export const OVERRUN_DRY_S = 14.0;   // the overrun zone, in seconds per frame height
export const SAT_DRY_S = 530;        // the saturated zone — 38x slower, and it only matters if the waves stop

// THE SATURATED LEVEL IS AN AVERAGE OVER THE LAST FEW WAVES' PEAKS, WHICH IS
// THE BRIEF'S OWN PHRASE — "the memory of the furthest recent swash" — with
// "recent" being this horizon. It is updated ONCE PER WAVE, at the moment that
// wave peaks, and not continuously.
//
// THE FIRST CUT RAISED IT CONTINUOUSLY WHENEVER THE EDGE WAS ABOVE IT AND LET
// IT DECAY THE REST OF THE TIME, AND THE TWO DID NOT BALANCE WHERE THEY
// NEEDED TO. Measured over five seeds and 410 waves: the saturated level
// settled 0.076 of a frame height BELOW the peaks the ordinary waves were
// reaching, so every ordinary wave overran it — 23 overrun events in two quiet
// minutes, where the event is supposed to mean an unusually large set. Tuning
// the rise to close that gap made it ratchet instead: it then climbed to the
// peaks of a big set and took minutes to come back, which is the one thing the
// brief says it must not do.
//
// An average over peaks has neither failure. It sits AT the ordinary waves'
// mean reach rather than below it, so an ordinary wave tops it by half the
// wave-to-wave variation and no more; and it is an average, so a set pulls it
// up and the ordinary waves that follow pull it back down within the horizon.
export const SAT_ALPHA = 0.14;       // per wave — a horizon of about 5.5 waves, ~26 s

// An overrun is a swash that reaches MEANINGFULLY past the standing high-water
// mark. The margin is the one interpretive decision here, and it is MEASURED
// rather than chosen: sat is an AVERAGE of what the waves reach, so roughly
// half of all ordinary waves exceed it by a hair and each wave's own scallops
// put its best sample further out again. An event that fired on those would be
// no signal at all, and the brief's consumer for it is mark-erasure — which
// wants to know that an unusually large set has just wiped the beach, not that
// a wave happened.
//
// The firing rate at each candidate, over five seeds and five minutes each,
// with the energy pinned at zero against the scene as it actually runs:
//
//   margin   0.035  0.060  0.090  0.120  0.150
//   quiet     6.40   6.40   3.44   0.00   0.00   overruns per minute
//   w/ sets   5.68   4.28   3.52   3.24   3.00
//
// 0.12 was where the two populations separated: nothing at all on a quiet
// beach, and the set-driven rate barely touched. Below it the event fires as
// often without a set as with one, which is the definition of no signal.
//
// RE-DERIVED WHEN THE FRONT'S SHAPE CHANGED, and it had to be: this is a
// MEASURED separation between two populations, and the quantity it separates
// them by — how far the furthest point of a wave gets past the standing mark —
// moved when the drawing's scallops became the published edge (see makeScallop
// below). The same sweep, the same five seeds and five minutes each, on the
// front as it is now:
//
//   margin   0.035  0.060  0.090  0.120  0.150  0.180
//   quiet    12.32  12.32   7.24   0.36   0.00   0.00   overruns per minute
//   w/ sets   8.24   5.60   3.48   3.04   2.80   2.64
//
// 0.150 reads exactly what 0.120 used to: nothing on a quiet beach, and the
// set-driven rate down 8% (3.04 -> 2.80). Holding 0.120 would have left the
// event firing about once every three and a half minutes with no input at all,
// which is the no-signal state this constant exists to avoid — and the only
// other lever was to make the drawn scallops shallower than the drawing draws
// them, which is tuning a picture to satisfy a simulation constant.
export const OVERRUN_MARGIN_S = 0.150;

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v) => v * v * (3 - 2 * v);

// The envelope, as a fraction of the wave's reach past the waterline. Up fast
// and decelerating, a brief stall, then a backwash that starts from rest,
// accelerates, and leaves a long thin film at the end — which is the "the sheet
// thins as it goes" the brief describes, expressed as the extent easing to zero
// rather than cutting off.
export function swashEnv(age, a, hold, ret) {
  if (age <= 0) return 0;
  if (age < a) { const u = age / a; return 1 - (1 - u) * (1 - u); }
  if (age < a + hold) return 1;
  const v = (age - a - hold) / ret;
  if (v >= 1) return 0;
  return 1 - smooth(v);
}

// How thick the sheet reads, separately from how far it reaches: it thins
// throughout the drain, so the last of it is a wide film rather than a narrow
// wedge.
export function sheetAt(age, a, hold, ret) {
  if (age < a) return clamp01(age / a);
  if (age < a + hold) return 1;
  return clamp01(1 - (age - a - hold) / ret);
}

export function createSwash({ rand, samples = SAMPLES } = {}) {
  const sat = new Float64Array(samples).fill(WATERLINE_S + RUNUP_NOMINAL);
  const wet = new Float64Array(samples).fill(WATERLINE_S + RUNUP_NOMINAL);
  const edge = new Float64Array(samples).fill(WATERLINE_S);
  const prevEdge = new Float64Array(samples).fill(WATERLINE_S);

  const waves = [];
  const overruns = [];
  let untilNext = 0.8;
  let clock = 0;
  let spawned = 0;
  let glossDepth = 0.008;

  // A per-wave along-shore shape, so no two fronts are the same scallops and
  // none of them is a straight line.
  function makeWob() {
    const w = new Float64Array(samples);
    const k1 = 3 + rand.range(0, 5), k2 = 9 + rand.range(0, 11);
    const p1 = rand.range(0, 6.283), p2 = rand.range(0, 6.283);
    const a1 = rand.range(0.5, 1.0), a2 = rand.range(0.2, 0.5);
    for (let i = 0; i < samples; i++) {
      const u = i / (samples - 1);
      w[i] = a1 * Math.sin(u * k1 + p1) + a2 * Math.sin(u * k2 + p2);
    }
    return w;
  }

  // THE SCALLOPS, AND THE POINT IS WHOSE THEY ARE. A drawn foam edge and a
  // published swash edge that are generated separately WILL diverge, and the
  // failure is not cosmetic: a bird stands where `swashYAt(x)` says the water
  // is, and a mark is erased where it says the water reached. So the union of
  // half-discs every cartoon foam line has is drawn HERE, from the wave's own
  // seed, once, and it is `edgeAtU` that carries it to the renderer. The
  // renderer generates nothing.
  //
  // `lobeParams` and `lobesFrom` are beach-brush.js's own — imported rather
  // than reimplemented, so there is one answer to what a scallop is, and the
  // parameters are fractions of the width so a stored set survives a resize.
  // The counts, the radii and the squash are the drawing's, unchanged.
  //
  // IT IS ZERO-MEANED, and that is what keeps `runup` meaning the wave's reach.
  // A union of half-discs is one-sided — it only ever pushes the edge further
  // up the beach — so folded in raw it would add half its own depth to every
  // wave's reach and quietly move the saturated level, the overrun margin and
  // the high-water mark with it. Subtracting its mean changes no shape at all:
  // it is a constant offset on a curve.
  //
  // AND THE DEPTH IS IN FRAME HEIGHTS, WHICH THE DRAWING'S WAS NOT. The
  // module's lobe radii are fractions of the WIDTH and its depth falls out of
  // them, so the scallops it drew were a third deeper on a 16:9 frame than on a
  // 4:3 one. The simulation has no canvas and cannot have an aspect, so the
  // conversion is fixed here at the aspect two of the three frames the drawing
  // was verified at actually are.
  const SCALLOP_ASPECT = 16 / 9;
  function makeScallop(seed) {
    const r = rng(seed);
    const us = new Array(samples);
    for (let i = 0; i < samples; i++) us[i] = i / (samples - 1);
    const a = lobesFrom(us, lobeParams(r, 11, 0.025, 0.069), 1, null, 0.32);
    const b = lobesFrom(us, lobeParams(r, 26, 0.008, 0.025), 1, null, 0.5);
    const f = new Float64Array(samples);
    let mean = 0;
    for (let i = 0; i < samples; i++) { f[i] = (a[i] + b[i]) * SCALLOP_ASPECT; mean += f[i]; }
    mean /= samples;
    for (let i = 0; i < samples; i++) f[i] -= mean;
    return f;
  }

  // THE ONE PLACE SET ENERGY IS READ. Everything the energy decides about a
  // wave is decided here and frozen into the record.
  function spawn(energy) {
    const e = clamp01(energy || 0);
    const target = RUNUP_NOMINAL + e * (RUNUP_MAX - RUNUP_NOMINAL);
    const reach = target * rand.range(RUNUP_VARY[0], RUNUP_VARY[1]);
    // ONE RECORD, BORN AT SEA. `makeWave` freezes everything stages one to
    // five need; the fields below are stage six's, and `preS` — which
    // `makeWave` derives from the wave's own travel — is when the one hands
    // over to the other. So a swash no longer begins out of nothing at the
    // waterline: it is the arrival of a thing that has been in the frame,
    // visibly, for the whole of its approach.
    const w = makeWave({ rand, energy: e, waterline: WATERLINE_S, samples });
    w.runup = Math.min(1, WATERLINE_S + reach);
    w.advanceS = ADVANCE_S * rand.range(0.82, 1.20);
    w.holdS = HOLD_S * rand.range(0.6, 1.5);
    w.retreatS = RETREAT_S * rand.range(0.85, 1.18);
    w.wob = makeWob();
    w.scallop = makeScallop(w.seed);
    w.peaked = false;
    w.life = w.preS + w.advanceS + w.holdS + w.retreatS;
    waves.push(w);
    spawned++;
    return w;
  }

  // THE SWASH'S OWN CLOCK, which is the wave's less its seaward life. Every
  // stage-six law below reads THIS and never `w.age`, so the shipped envelope
  // is untouched by the wave arriving earlier — it simply starts later.
  const swashAge = (w) => w.age - w.preS;

  // HOW FAR A FRONT WANDERS, in frame heights — and it is no longer how deep
  // the SCALLOPS run, which is what it used to be and what its old value of
  // 0.020 was set for. The scallops are the drawing's now (see makeScallop
  // above) and this is only the long wander beneath them, so its value is the
  // drawing's own wander, read off it rather than kept: beach-brush.js wanders
  // its front with `bumps(..., 0.007 * H, 3, ...)`, whose three harmonics sum
  // to 0.007 * (1/1.5 + 1/2.5 + 1/3.5) = 0.00947 of a frame height at their
  // peak, and `wob` below is two sines whose amplitudes sum to at most 1.5.
  //
  // MEASURED, five seeds x five minutes, because it moves an event the brief
  // calls settled. Holding 0.020 and adding the scallops puts the live front's
  // peak-to-trough at 0.0496 against the drawing's own 0.0344 — a third deeper
  // than the picture that was verified — and takes the OVERRUN rate on a QUIET
  // beach from 0.04 to 1.96 a minute, against 3.16 with sets running: the two
  // populations OVERRUN_MARGIN_S was set to separate stop being separated. At
  // the derived value the front reads 0.0344 and the quiet rate is 0.28.
  const WOB_S = 0.00631;

  function extentOf(w, i) {
    const env = swashEnv(swashAge(w), w.advanceS, w.holdS, w.retreatS);
    if (env <= 0) return WATERLINE_S;
    const reach = (w.runup - WATERLINE_S) * env;
    return WATERLINE_S + reach + (WOB_S * w.wob[i] + w.scallop[i]) * env;
  }

  const sw = {
    sat, wet, edge, waves, overruns,
    get clock() { return clock; },
    get spawned() { return spawned; },
    get glossDepth() { return glossDepth; },
    get sheet() {
      // The thickest sheet on the beach right now, which is what the foam band
      // is drawn from. Zero when nothing is running.
      let m = 0;
      for (const w of waves) m = Math.max(m, sheetAt(swashAge(w), w.advanceS, w.holdS, w.retreatS));
      return m;
    },

    // `energy` is read HERE and nowhere else — see the header.
    advance(dt, { energy = 0, intervalScale = 1 } = {}) {
      clock += dt;
      untilNext -= dt;
      if (untilNext <= 0) {
        spawn(energy);
        untilNext = rand.range(INTERVAL_S[0], INTERVAL_S[1]) * intervalScale;
      }

      for (let n = waves.length - 1; n >= 0; n--) {
        const w = waves[n];
        w.age += dt;
        if (w.age >= w.life) waves.splice(n, 1);
      }

      prevEdge.set(edge);
      for (let i = 0; i < samples; i++) {
        let e = WATERLINE_S;
        for (const w of waves) { const v = extentOf(w, i); if (v > e) e = v; }
        edge[i] = e;

        // Water covering sand wets it AT ONCE; there is no rise time on the
        // way up, only on the way down.
        if (e > wet[i]) wet[i] = e;

        // The saturated level is updated ONCE PER WAVE, at its peak (below).
        // All that happens here is the very slow give-way that matters only if
        // the waves stop altogether.
        sat[i] = Math.max(WATERLINE_S, sat[i] - dt / SAT_DRY_S);

        // And the OVERRUN ZONE — everything above the saturated level — dries
        // an order of magnitude faster. Below sat there is nothing to dry:
        // that sand is wet because the waves keep it wet.
        if (wet[i] > sat[i]) wet[i] = Math.max(sat[i], wet[i] - dt / OVERRUN_DRY_S);
        else wet[i] = sat[i];
      }

      // THE EVENT FIRES AT THE PEAK, which is what makes "with the reached
      // extent" a literal statement rather than a prediction: at the end of a
      // wave's advance it has reached as far as it is going to.
      for (const w of waves) {
        if (w.peaked || swashAge(w) < w.advanceS) continue;
        w.peaked = true;
        let reached = WATERLINE_S, at = 0, over = -1;
        for (let i = 0; i < samples; i++) {
          const v = extentOf(w, i);
          // The excess is read BEFORE this wave is folded into the average, so
          // a wave is never measured against a level it has already moved.
          const d = v - sat[i];
          if (d > over) { over = d; at = i / (samples - 1); }
          if (v > reached) reached = v;
          sat[i] = Math.max(WATERLINE_S, sat[i] + (v - sat[i]) * SAT_ALPHA);
          if (wet[i] < sat[i]) wet[i] = sat[i];
        }
        if (over >= OVERRUN_MARGIN_S) {
          overruns.push({ t: clock, extent: reached, over, at });
          if (overruns.length > 32) overruns.shift();
        }
      }

      // THE GLOSS IS A LENGTH, NOT A DURATION, and it is measured rather than
      // assumed: how far the edge has moved in the last half second. A drain
      // running hard leaves a wide glossy band behind it and a stalled edge a
      // narrow one, which is the same sentence the brief writes as "glossy ->
      // matte over roughly half a second behind the departing water".
      let recede = 0;
      for (let i = 0; i < samples; i++) recede += Math.max(0, prevEdge[i] - edge[i]);
      recede /= samples;
      const target = Math.max(0.004, (recede / Math.max(1e-6, dt)) * GLOSS_S);
      glossDepth += (target - glossDepth) * clamp01(dt * 6);
      return sw;
    },

    // --- THE PUBLISHED INTERFACE ------------------------------------------
    // The brief asks for exactly three things and nothing else. These are the
    // three. (`state()` on the scene is test chrome for the gate, which is a
    // different thing and is not part of this.)
    //
    //   swashYAt(x)      the swash edge, in screen y, at screen x
    //   highWaterYAt(x)  the high-water mark, likewise
    //   overruns         the event feed, each { t, extent, over, at }
    //
    // They are bound onto the scene in scene-beach.js, which owns the shore
    // and therefore the x -> y mapping; here they are in beach coordinates.
    edgeAtU(u) { return sampleAt(edge, u); },
    wetAtU(u) { return sampleAt(wet, u); },
    satAtU(u) { return sampleAt(sat, u); },

    clear() { waves.length = 0; overruns.length = 0; },
  };

  function sampleAt(field, u) {
    const t = clamp01(u) * (samples - 1);
    const i = Math.floor(t);
    if (i >= samples - 1) return field[samples - 1];
    const f = t - i;
    return field[i] * (1 - f) + field[i + 1] * f;
  }

  sw.spawn = spawn;
  return sw;
}
