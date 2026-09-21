// scene/koi-wind.js — scroll-driven wind, which in this scene means exactly one
// thing: the angle the rain falls at. Pure arithmetic over a clock, so the gate
// drives it in Node.
//
// WIND IS AN AIR PHENOMENON AND REACHES NOTHING UNDER THE WATER. The fish are
// submerged, so they never read this; the ripples are on the surface and are
// circles however hard it blows. What tilts is the rain streak, and with it the
// line a drop travels down to the point it lands on.
//
// "3 FULL/RAPID SCROLL ACTIONS = MAX WIND ANGLE" NEEDED AN INTERPRETATION, and
// this is it, stated so it can be argued with rather than discovered:
//
//   * ONE ACTION IS 120 px OF NORMALISED WHEEL DELTA. That is one notch of a
//     typical mouse wheel in deltaMode 0, which is the only unit here with a
//     conventional value. A line-mode event is converted at 16 px a line and a
//     page-mode one at the viewport height, so all three modes mean the same
//     thing. A single event is clamped to two notches so one absurd page-mode
//     delta cannot slam the wind to full on its own.
//   * THE INPUT IS SIGNED. Scrolling down leans the rain to the RIGHT and up
//     leans it LEFT; the magnitude is what the brief caps. A single unsigned
//     maximum would have answered the letter of the brief while making the
//     control unable to put the weather back the way it was.
//   * DECAY IS SUSPENDED WHILE INPUT IS ARRIVING. The brief decays "if no
//     further scroll input", so a 0.2 s grace after the last event holds the
//     ebb off. Without it, three genuinely rapid notches land at 0.95 rather
//     than at max, because the tank leaks while it is being filled — the
//     threshold would be unreachable by the gesture that is supposed to reach
//     it.
//
// THE REST ANGLE IS EXACTLY VERTICAL, not nearly. The decay steps to a hard
// zero when the step would overshoot, so `angleRad` returns the literal 0 and
// a rain streak at rest is a vertical line rather than one a millionth of a
// degree off it.

export const ACTIONS_TO_MAX = 3;
export const ACTION_DELTA = 120;     // px of wheel delta in one "scroll action"
export const MAX_WIND_DEG = 45;      // "toward diagonal" — a diagonal is 45
export const WIND_DECAY_S = 6;       // max -> zero, measured from the last event
export const WIND_GRACE_S = 0.2;     // decay is held off this long after input
export const LINE_HEIGHT_PX = 16;    // deltaMode 1 (lines) -> px
const EVENT_CLAMP = ACTION_DELTA * 2;

// One owner for "how much scroll was that", so the page, the gate and any
// future touch gesture all measure a scroll action the same way.
export function normalizeWheel(deltaY, deltaMode, viewportHeight) {
  let d = deltaY;
  if (deltaMode === 1) d *= LINE_HEIGHT_PX;
  else if (deltaMode === 2) d *= (viewportHeight || 800);
  if (!Number.isFinite(d)) return 0;
  return Math.max(-EVENT_CLAMP, Math.min(EVENT_CLAMP, d));
}

export function createWind() {
  const w = {
    value: 0,          // -1 .. 1, the signed fraction of maximum
    _sinceInput: Infinity,

    // `delta` is already normalised px (see normalizeWheel).
    scroll(delta) {
      w.value += delta / (ACTIONS_TO_MAX * ACTION_DELTA);
      w.value = Math.max(-1, Math.min(1, w.value));
      w._sinceInput = 0;
    },

    advance(dt) {
      w._sinceInput += dt;
      if (w._sinceInput < WIND_GRACE_S || w.value === 0) return;
      // The grace is inside the six seconds, not added to them: the brief's
      // duration is measured from the last scroll event, so the ebb runs at
      // 1/(WIND_DECAY_S - WIND_GRACE_S) and a full tank still reaches exactly
      // zero at WIND_DECAY_S. A grace bolted on the front would quietly make
      // the stated number 6.2.
      const step = dt / (WIND_DECAY_S - WIND_GRACE_S);
      if (Math.abs(w.value) <= step) w.value = 0;
      else w.value -= Math.sign(w.value) * step;
    },

    // Radians off vertical. Positive leans the fall toward +x (to the right).
    get angleRad() { return w.value * MAX_WIND_DEG * Math.PI / 180; },
    get angleDeg() { return w.value * MAX_WIND_DEG; },

    // The unit vector a drop falls along, in SCREEN space (+y is down). At
    // rest this is exactly (0, 1).
    fallDir() {
      const a = w.angleRad;
      return { x: Math.sin(a), y: Math.cos(a) };
    },

    describe() {
      const d = w.angleDeg;
      if (d === 0) return 'still — rain is vertical';
      return `${Math.abs(d).toFixed(1)}° ${d > 0 ? 'right' : 'left'}`;
    },
  };
  return w;
}
