// scene/beach-sets.js — SET ENERGY: the scroll input, and the large sets that
// arrive on their own. Pure arithmetic over a clock and a seeded stream, so the
// gate drives it in Node.
//
// THE SHAPE IS SCENE 1'S WIND — "ramps on scroll, decays over a fixed window",
// which the brief names directly — and one thing about it is deliberately NOT
// scene 1's: THIS VALUE IS UNSIGNED. koi-wind.js is signed on purpose, because
// its maximum is an ANGLE and an unsigned control could not put the weather
// back the way it was. A set has no negative: a sea with less energy in it is a
// calm one, which is zero, and what puts it back is the decay. So either scroll
// direction adds, and the magnitude is what the ramp caps.
//
// AND IT REACHES EXACTLY TWO THINGS: how heavy the break at the back of frame
// is, and how far the NEXT swash runs up. It never reaches a swash that is
// already running — see beach-swash.js, where the energy is read in `spawn()`
// and nowhere else.

// One action is 120 px of normalised wheel delta — one notch of a typical
// mouse wheel in deltaMode 0, the only unit here with a conventional value —
// and a line-mode event is converted at 16 px a line, a page-mode one at the
// viewport height, so all three modes mean the same thing. koi-wind.js's
// reading, restated rather than imported, because that module's job is an
// angle and this one's is an energy.
export const ACTIONS_TO_MAX = 3;
export const ACTION_DELTA = 120;
export const LINE_HEIGHT_PX = 16;
const EVENT_CLAMP = ACTION_DELTA * 2;

export const DECAY_S = 9;          // max -> zero, measured from the last event
export const GRACE_S = 0.25;       // decay is held off this long after input

// LARGE SETS ARRIVE ON THEIR OWN. "Large sets also occur on their own at a
// long, irregular interval with no scroll input, so an untouched scene still
// gets overruns." PICKED and irregular; the interval is drawn fresh each time
// rather than jittered around a period, so the sets never fall into a rhythm.
export const SET_INTERVAL_S = [26, 62];
export const SET_RISE_S = 3.2;     // a set builds; it does not switch on
export const SET_HOLD_S = 5.5;     // and it is a SET — several waves, not one
export const SET_PEAK = [0.55, 1.0];

export function normalizeWheel(deltaY, deltaMode, viewportHeight) {
  let d = deltaY;
  if (deltaMode === 1) d *= LINE_HEIGHT_PX;
  else if (deltaMode === 2) d *= (viewportHeight || 800);
  if (!Number.isFinite(d)) return 0;
  return Math.max(-EVENT_CLAMP, Math.min(EVENT_CLAMP, d));
}

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

export function createSets({ rand } = {}) {
  const st = {
    scrolled: 0,        // the hand's contribution, 0..1
    natural: 0,         // the sea's own, 0..1
    _sinceInput: Infinity,
    _untilSet: rand ? rand.range(SET_INTERVAL_S[0] * 0.35, SET_INTERVAL_S[1] * 0.6) : 30,
    _setT: -1,
    _setPeak: 0,
    sets: 0,

    // THE TWO SOURCES ARE COMBINED AS A MAXIMUM, NOT A SUM. They are two
    // accounts of the same thing — how much energy is in the water — and
    // adding them would let a scroll during a natural set push past a ceiling
    // that is supposed to mean "as big as this sea gets".
    get energy() { return Math.max(st.scrolled, st.natural); },

    scroll(delta) {
      // UNSIGNED: either direction is energy. See the header.
      st.scrolled = clamp01(st.scrolled + Math.abs(delta) / (ACTIONS_TO_MAX * ACTION_DELTA));
      st._sinceInput = 0;
    },

    advance(dt) {
      st._sinceInput += dt;
      // The grace is INSIDE the window, not added to it, so the stated decay
      // duration stays the stated decay duration — koi-wind.js's reading.
      if (st._sinceInput >= GRACE_S && st.scrolled > 0) {
        const step = dt / (DECAY_S - GRACE_S);
        st.scrolled = st.scrolled <= step ? 0 : st.scrolled - step;
      }

      if (st._setT >= 0) {
        st._setT += dt;
        const rise = SET_RISE_S, hold = SET_HOLD_S, fall = DECAY_S;
        if (st._setT < rise) st.natural = st._setPeak * (st._setT / rise);
        else if (st._setT < rise + hold) st.natural = st._setPeak;
        else {
          const v = (st._setT - rise - hold) / fall;
          if (v >= 1) { st.natural = 0; st._setT = -1; }
          else st.natural = st._setPeak * (1 - v);
        }
      } else if (rand) {
        st._untilSet -= dt;
        if (st._untilSet <= 0) {
          st._setT = 0;
          st._setPeak = rand.range(SET_PEAK[0], SET_PEAK[1]);
          st._untilSet = rand.range(SET_INTERVAL_S[0], SET_INTERVAL_S[1]);
          st.sets++;
        }
      }
      return st;
    },

    // Sets come in groups, so a big one also closes the gap between waves a
    // little. Bounded well away from zero: this shortens an interval, it does
    // not turn the beach into a washing machine.
    get intervalScale() { return 1 - 0.32 * st.energy; },

    clear() { st.scrolled = 0; st.natural = 0; st._setT = -1; },
  };
  return st;
}
