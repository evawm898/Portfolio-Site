// scene/koi-rain.js — falling rain, and the only thing that makes a ripple
// without a hand on the mouse. One emitter serves the idle drizzle and the
// downpour: the rate, the fall speed and the splash all interpolate on the
// storm's intensity, so there is no moment where the rain changes character
// and no second code path where a "storm drop" could start behaving unlike a
// drizzle drop.
//
// A DROP IS IN THE AIR, SO IT LIVES IN SCREEN SPACE. The water is a squashed
// plane; the air in front of it is not, and a streak is a streak. The landing
// point is chosen uniformly across the VIEWPORT (which is what makes rain look
// evenly distributed to an eye looking at a screen) and converted to plane
// coordinates at the instant it lands, which is the only moment the drop and
// the water have anything to say to each other.
//
// THE WIND REACHES EXACTLY THIS FILE AND NOTHING ELSE. `fallDir` tilts the line
// a drop travels down; where it lands is decided first and does not move, so a
// gale does not sweep the rain into a corner of the pond.

import { rollRipple, lerpRippleTable, DROP_RIPPLE, STORM_RIPPLE } from './koi-ripples.js';

// Drops per second at the reference viewport, scaled by area so a large screen
// gets a proportionally heavier fall rather than a sparser-looking one.
// IDLE WAS 2.0 — a lone ring every second or so, gone before the next arrived.
// Raised so several ripples overlap at idle rather than the pond reading as
// flat between them. STORM IS UNCHANGED, DELIBERATELY: `rain.advance()` spawns
// drops on a fixed accumulator, not a random draw, so the exact NUMBER spawned
// each frame is deterministic in the rate — and rain and the fish share one
// seeded stream (see rng.js), so a changed storm rate shifts every random
// number the fish read for the rest of a run. The idle rate has the same
// property, but nothing here reacts to idle rain at anywhere near as tight a
// margin as the population manager's storm floor, so raising it is safe;
// raising the storm rate measurably was not (see koi-fish.js's population
// check, which this was tuned against directly).
export const RAIN_IDLE_RATE = 5.0;
export const RAIN_STORM_RATE = 240;
export const REF_AREA = 1440 * 900;
export const MAX_DROPS = 900;

const FALL_SPEED = [900, 1900];       // px/s, idle -> downpour
const FALL_DIST = [0.35, 0.72];       // of viewport height
// A STREAK IS LONGER THAN THE PHYSICS WANTS, ON PURPOSE. A drop's ripple
// outlives its streak by five to one, so a downpour shows far more rings than
// falling lines and the rain itself reads thin. Raising the drop rate to fix
// that only evicts ripples against the cap; lengthening the streak makes the
// same drops read as heavier rain, which is the honest trade of the two.
const STREAK_S = 0.024;               // a streak is this much of its own travel
const ALPHA_IDLE = [0.30, 0.52];
const ALPHA_STORM = [0.42, 0.78];

export function createRain({ rand, ripples }) {
  const rain = {
    drops: [],
    landed: 0,
    _acc: 0,

    rateFor(intensity, width, height) {
      const base = RAIN_IDLE_RATE + (RAIN_STORM_RATE - RAIN_IDLE_RATE) * intensity;
      return base * (width * height) / REF_AREA;
    },

    // `fallDir` IS ACCEPTED AND DELIBERATELY NOT USED, which is the point
    // rather than an oversight: the wind decides the line a drop travels down,
    // and the renderer draws that — but where the drop LANDS is chosen first,
    // in the viewport, and no gale moves it. If this function ever starts
    // reading the direction, a gale sweeps the whole fall into one corner of
    // the pond. `rain/the-wind-does-not-move-where-a-drop-lands` is the
    // witness, and it is why the parameter stays visible here.
    advance(dt, { width, height, intensity, fallDir, surface }) {
      const I = Math.max(0, Math.min(1, intensity));
      const speed = FALL_SPEED[0] + (FALL_SPEED[1] - FALL_SPEED[0]) * I;
      const a0 = ALPHA_IDLE[0] + (ALPHA_STORM[0] - ALPHA_IDLE[0]) * I;
      const a1 = ALPHA_IDLE[1] + (ALPHA_STORM[1] - ALPHA_IDLE[1]) * I;
      const splash = lerpRippleTable(DROP_RIPPLE, STORM_RIPPLE, I);

      rain._acc += rain.rateFor(I, width, height) * dt;
      while (rain._acc >= 1 && rain.drops.length < MAX_DROPS) {
        rain._acc -= 1;
        const dist = height * rand.range(FALL_DIST[0], FALL_DIST[1]);
        rain.drops.push({
          lx: rand.range(0, width),
          ly: rand.range(0, height),
          p: 0,
          fall: dist / speed,
          dist,
          len: speed * STREAK_S * rand.range(0.75, 1.35),
          alpha: rand.range(a0, a1),
        });
      }
      if (rain._acc > 1) rain._acc = 1;   // a long stall must not burst on resume

      const live = rain.drops;
      let w = 0;
      for (let i = 0; i < live.length; i++) {
        const d = live[i];
        d.p += dt / d.fall;
        if (d.p >= 1) {
          // It has reached the water. This is the one place a drop becomes a
          // ripple, and it goes through the same spawner a click does.
          ripples.spawn(surface.px(d.lx), surface.py(d.ly), rollRipple(rand, splash));
          rain.landed += 1;
          continue;
        }
        live[w++] = d;
      }
      live.length = w;
    },

    clear() { rain.drops.length = 0; rain._acc = 0; },
  };
  return rain;
}

// Where a drop is right now, in screen pixels, given the direction it is
// falling. Exported rather than inlined in the renderer so the gate can ask a
// drop where it is without a canvas.
export function dropSegment(d, dir) {
  const back = (1 - d.p) * d.dist;
  const x = d.lx - dir.x * back;
  const y = d.ly - dir.y * back;
  return { x, y, x2: x - dir.x * d.len, y2: y - dir.y * d.len };
}
