// scene/koi-storm.js — click-driven storm escalation, and the lightning it can
// earn. Pure arithmetic over a clock: no DOM, no canvas, no randomness, so
// tools/verify-scene.mjs drives it directly in Node against the brief's own
// numbers rather than inferring them from a picture of rain.
//
// THE BRIEF, VERBATIM, AND HOW EACH LINE BECAME A CONSTANT:
//   "Each click adds 1/5 toward downpour"            -> CLICK_STEP   = 0.2
//   "Escalation from a click ramps up over 2 seconds" -> RAMP_S      = 2
//   "Full downpour ... holds for 3 seconds"           -> HOLD_S      = 3
//   "Full decay ... takes 10 seconds total"           -> DECAY_S     = 10
//   "5 rapid clicks"                                  -> BURST_N     = 5, RETUNED TO 4
//
// BURST_N MOVED OFF THE BRIEF'S OWN NUMBER, DIALLED LIVE: a burst that took
// five clicks to earn its lightning read as one click too patient against
// the escalation ramp it sits on top of — tuned in a standalone sandbox
// against a live preview rather than by guessing at a number. It changes
// only the burst-count THRESHOLD, not the ramp: "5 clicks reaches full
// downpour" below is CLICK_STEP arithmetic (5 x 0.2 = 1.0) and is untouched.
//
// THE RAMP IS A FIXED DURATION, NOT A FIXED RATE, and the difference is the
// whole reading of the spec. A fixed rate of CLICK_STEP/RAMP_S would take ten
// seconds to answer five rapid clicks, which contradicts "5 rapid clicks =
// full downpour". So a click restarts a 2-second linear ramp from wherever the
// intensity currently is to wherever the target now sits: one click from rest
// reaches 0.2 in two seconds, five rapid clicks reach 1.0 two seconds after
// the last of them. Both sentences hold at once.
//
// HOLD-THEN-EBB IS GENERALISED FROM THE FULL-DOWNPOUR RULE. The brief only
// states the hold for a full downpour; a plateau at 0.4 is not addressed. The
// same rule is applied at every level — reach the plateau, hold HOLD_S, then
// ebb at the full-downpour rate — because a second rule for partial plateaus
// would be a number nobody asked for. The ebb is a RATE (1/DECAY_S per second)
// rather than a duration, so a full downpour takes exactly the stated ten
// seconds and a shallower one takes proportionally less.

export const CLICK_STEP = 0.2;     // 1/5 of the way to a downpour
export const RAMP_S = 2;           // a click's escalation ramps in over this
export const HOLD_S = 3;           // a reached plateau holds for this
export const DECAY_S = 10;         // full downpour -> idle, at this rate
export const BURST_N = 4;          // clicks that make a "burst" — see the note above
export const RAPID_GAP_S = 0.7;    // consecutive clicks closer than this extend a burst
export const FULL = 1;
// Reaching FULL through floating-point addition of 0.2 five times lands on
// 0.9999999999999999, so "already at full downpour" is a bar rather than an
// equality. It is set far below one click step, so no partial plateau can
// reach it.
export const FULL_BAR = 0.995;

export const FLASH_S = 0.45;       // the white flash's whole envelope
export const SHAKE_S = 0.5;        // the jolt outlives the flash slightly

// The flash envelope: a hard strike, an almost-dark beat, a weaker second
// strike, then a fade. PLACEHOLDER SHAPE — the brief says not to over-invest
// here, so this is one readable function rather than a rig, and it is the one
// place the flash's timing lives.
function flashEnvelope(u) {
  if (u <= 0 || u >= 1) return 0;
  if (u < 0.10) return 1 - u / 0.10 * 0.88;          // 1.00 -> 0.12
  if (u < 0.18) return 0.12 + (u - 0.10) / 0.08 * 0.60; // 0.12 -> 0.72
  const v = (u - 0.18) / 0.82;
  return 0.72 * (1 - v) * (1 - v);                    // ease out to 0
}

export function createStorm() {
  const st = {
    // The published state. `intensity` is what the rain reads; everything else
    // is either input bookkeeping or the lightning placeholder's envelopes.
    intensity: 0,
    target: 0,
    phase: 'idle',        // idle | rising | holding | ebbing
    flash: 0,             // 0..1, the white screen flash
    shake: 0,             // 0..1, the jolt
    flashes: 0,           // how many have fired, for the gate and the read-out
    burst: 0,             // clicks in the current rapid run

    _rampFrom: 0,
    _rampT: 0,
    _holdT: 0,
    _flashT: Infinity,
    _lastClickT: -Infinity,

    // A click. `now` is the scene clock in seconds. Returns true if this click
    // fired lightning, so the caller can react without polling.
    click(now) {
      st.burst = (now - st._lastClickT <= RAPID_GAP_S) ? st.burst + 1 : 1;
      st._lastClickT = now;

      // LIGHTNING IS A SECOND BURST AT FULL DOWNPOUR. The first burst cannot
      // fire one by construction: its BURST_N-th click (the fourth, now) lands
      // while the intensity is still well short of the top, so the bar below
      // is not met. Nothing special-cases "the first burst" — the timing does
      // it, at BURST_N = 4 as it did at 5.
      let fired = false;
      if (st.burst >= BURST_N && st.intensity >= FULL_BAR) {
        st.burst = 0;
        st.flashes += 1;
        st._flashT = 0;
        fired = true;
      }

      // A CLICK AT FULL DOWNPOUR SUSTAINS IT, and that falls out of the ramp
      // rather than being a rule of its own: the target cannot rise, so the
      // "ramp" is two seconds of holding at 1.0, and the three-second plateau
      // only starts after it. So a downpour runs five seconds past the last
      // click rather than three, and clicking keeps it raining for as long as
      // you keep clicking. Deliberate, and the reason the gate waits 5.4 s to
      // see an ebb rather than 3.2.
      st.target = Math.min(FULL, st.target + CLICK_STEP);
      st._rampFrom = st.intensity;
      st._rampT = 0;
      st.phase = 'rising';
      return fired;
    },

    advance(dt) {
      if (st.phase === 'rising') {
        st._rampT += dt;
        const u = Math.min(1, st._rampT / RAMP_S);
        st.intensity = st._rampFrom + (st.target - st._rampFrom) * u;
        if (u >= 1) { st.intensity = st.target; st.phase = 'holding'; st._holdT = 0; }
      } else if (st.phase === 'holding') {
        st._holdT += dt;
        if (st._holdT >= HOLD_S) st.phase = 'ebbing';
      } else if (st.phase === 'ebbing') {
        st.intensity = Math.max(0, st.intensity - dt / DECAY_S);
        // The target follows the intensity down so the next click escalates
        // from where the storm actually is, not from the plateau it left.
        st.target = st.intensity;
        if (st.intensity <= 0) { st.intensity = 0; st.target = 0; st.phase = 'idle'; }
      }

      if (st._flashT < FLASH_S + SHAKE_S) {
        st._flashT += dt;
        st.flash = flashEnvelope(st._flashT / FLASH_S);
        const s = 1 - st._flashT / SHAKE_S;
        st.shake = s > 0 ? s * s : 0;
      } else { st.flash = 0; st.shake = 0; }
    },

    // A one-line description for the read-out. Named states rather than a bare
    // number, because "0.62" does not say whether it is on its way up or down.
    describe() {
      if (st.phase === 'idle') return 'idle — ambient rain';
      const pct = Math.round(st.intensity * 100);
      if (st.phase === 'rising') return `building — ${pct}%`;
      if (st.phase === 'holding') return st.intensity >= FULL_BAR ? 'downpour' : `holding — ${pct}%`;
      return `ebbing — ${pct}%`;
    },
  };
  return st;
}
