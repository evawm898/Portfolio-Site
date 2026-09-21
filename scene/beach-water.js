// scene/beach-water.js — the open water's own clock. DOM-free, so the gate
// runs it.
//
// IT USED TO BE TWO THINGS AND IS NOW ONE. Beside the drift it kept a field of
// persistent foam STREAKS — records with a position and a life, drifting
// shoreward and recycled seaward, because a field regenerated each frame boils
// and the eye reads a re-randomised surface as static rather than as water.
// That reasoning was sound and the records were correct; what happened is that
// the drawing they were written for stopped existing. The halftone lattice
// drew them; beach-brush.js marks the open water with two paper brush lines of
// its own, driven by `phase`, and reads no record at all.
//
// So the streaks were a law that was still tested, still exercised by a
// mutant, and DRAWN BY NOTHING — which is worse than either keeping or
// deleting them, because the gate went on reporting that a feature nobody
// could see was working. Eva ruled them deleted rather than re-drawn. If
// travelling foam lines are wanted in this idiom they are a new thing in the
// new drawing, not these records revived: they were shaped for a tone field
// that quantised them into a lattice.
//
// WHAT IS LEFT IS THE DRIFT, and it is live: `phase` in the drawing is this
// number, so the surface wander, the horizon's wobble and the sea bands all
// travel on one clock, and a bigger sea moves it faster.

/** frame heights a streak travelled per second — now the drift's own rate */
export const DRIFT_S = 0.055;

export function createWater() {
  let drift = 0;

  const w = {
    get drift() { return drift; },

    advance(dt, { energy = 0 } = {}) {
      // A bigger sea moves faster. Bounded.
      const speed = DRIFT_S * (1 + 0.9 * Math.max(0, Math.min(1, energy)));
      drift += dt * speed;
      return w;
    },

    clear() { drift = 0; },
  };
  return w;
}
