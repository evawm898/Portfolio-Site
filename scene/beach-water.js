// scene/beach-water.js — the foam streaks lying on the open water. Persistent
// records drifting shoreward, recycled seaward. DOM-free, so the gate runs it.
//
// THEY ARE PERSISTENT, AND THAT IS THE POINT. A field of strokes regenerated
// each frame BOILS — the eye reads a surface that is re-randomised sixty times
// a second as static, not as water — so a streak is a record with a position
// and a life, and every frame it moves. The motion is the whole reason they are
// here: the reference's water is full of broken foam lines travelling toward
// the beach, and without them the sea is a graded tone that does not move.
//
// A STREAK KNOWS NOTHING ABOUT THE SWASH. It drifts, it ages, and when it
// reaches the foam band the renderer simply stops drawing it — it has arrived.
// Nothing here reads the swash edge, so a streak cannot be made to behave
// differently by which wave happens to be running.
export const STREAK_FIELDS = ['u', 's', 'len', 'age', 'life'];

export const MAX_STREAKS = 420;
export const DRIFT_S = 0.055;        // frame heights a streak travels per second
export const LEN_RANGE = [0.012, 0.085];
export const LIFE_RANGE = [5, 16];

export function createWater({ rand, count = 260 } = {}) {
  const streaks = [];
  let drift = 0;

  function place(streak, fresh) {
    streak.u = rand.unit();
    // A fresh field is scattered over the whole water; a recycled streak comes
    // in from the back of frame, because that is where water comes from.
    streak.s = fresh ? rand.range(-0.02, 0.38) : rand.range(-0.06, 0.02);
    streak.len = rand.range(LEN_RANGE[0], LEN_RANGE[1]);
    streak.life = rand.range(LIFE_RANGE[0], LIFE_RANGE[1]);
    streak.age = 0;
    return streak;
  }

  for (let i = 0; i < Math.min(MAX_STREAKS, count); i++) {
    streaks.push(place({ u: 0, s: 0, len: 0, age: 0, life: 0 }, true));
  }

  const w = {
    streaks,
    get drift() { return drift; },

    advance(dt, { energy = 0 } = {}) {
      // A bigger sea moves faster. Bounded, and it also advances the phase the
      // renderer uses for the water's own hatching, so the surface texture and
      // the streaks travel together rather than sliding past one another.
      const speed = DRIFT_S * (1 + 0.9 * Math.max(0, Math.min(1, energy)));
      drift += dt * speed;
      for (const f of streaks) {
        f.s += dt * speed * (0.75 + 0.5 * (f.len / LEN_RANGE[1]));
        f.age += dt;
        if (f.age >= f.life || f.s > 0.55) place(f, false);
      }
      return w;
    },

    clear() { streaks.length = 0; },
  };
  return w;
}
