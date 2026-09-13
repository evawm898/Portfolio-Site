// scene/koi-ripples.js — the ripple field. One spawner, one record shape, one
// decay law, and NO RECORD OF WHAT MADE THE RIPPLE.
//
// THE INVARIANT, WHICH IS STRUCTURAL RATHER THAN A CONVENTION: a ripple is
// geometry and energy — where it is, how far its front has travelled, how hard
// it hit — and nothing else. There is no `source`, no `kind`, no `fromClick`.
// The fish system cannot branch on the cause of a ripple because the cause is
// not in the data it is handed, so "fish react to ripples generically" is a
// property of the type rather than a rule somebody has to keep remembering.
// RIPPLE_FIELDS below is that claim written down; tools/verify-scene.mjs holds
// the shipped records to it and separately proves that a ripple spawned by a
// falling raindrop and one spawned by a click with the same energy are deeply
// equal — which is the strong form of the same statement.
//
// A BIGGER SPLASH IS STILL A BIGGER SPLASH. `maxR` and `strength` differ
// between a drizzle drop and a click, and the fish feel that difference. That
// is not provenance leaking: it is the physical size of the disturbance, which
// is exactly what a fish can actually perceive. What it cannot perceive is a
// label.
//
// THE FRONT, NOT THE SPLASH, IS WHAT ARRIVES. `r` is where the leading ring has
// got to, and it grows from 0 to `maxR` over the ripple's life, easing out the
// way a real ring slows as it spreads. A fish some distance away is disturbed
// when `r` reaches IT, not when the drop lands — which is why koi-fish.js
// watches |distance - r| rather than distance alone.

// The exact key set of a live ripple. Any other key — above all one naming a
// cause — is a defect, and the gate says so.
export const RIPPLE_FIELDS = ['x', 'y', 'r', 'maxR', 'age', 'life', 'strength', 'rings'];

export const MAX_RIPPLES = 320;    // a downpour is capped here, oldest dropped
export const RING_LAG = 0.13;      // each inner ring trails the front by this much of a life

// The two callers' parameter sets, declared here rather than at the call sites,
// so the difference between a raindrop and a click is one readable table and
// neither caller can quietly grow a field the other lacks.
export const DROP_RIPPLE = { maxR: [30, 58], life: [1.5, 2.3], strength: [0.30, 0.55], rings: 2 };
export const STORM_RIPPLE = { maxR: [22, 44], life: [0.9, 1.5], strength: [0.22, 0.42], rings: 2 };
export const CLICK_RIPPLE = { maxR: [104, 132], life: [2.1, 2.5], strength: [0.95, 1.0], rings: 3 };

// How far the front has travelled at age u (0..1 of its life): fast out of the
// splash, easing as it spreads.
export function frontAt(u) {
  const v = Math.max(0, Math.min(1, u));
  return 1 - (1 - v) * (1 - v);
}

// How visible a ripple is at age u. A quick attack so a drop reads as a strike
// rather than a fade-in, then a long decay.
export function fadeAt(u) {
  const v = Math.max(0, Math.min(1, u));
  const attack = v < 0.06 ? v / 0.06 : 1;
  const tail = (1 - v) * (1 - v) * (1 - v) * 0.4 + (1 - v) * 0.6;
  return attack * tail;
}

export function createRipples() {
  const field = {
    list: [],
    spawned: 0,

    // THE ONE SPAWNER. Rain, storm rain and clicks all arrive here; the only
    // thing that differs is the numbers, and the numbers are physical.
    spawn(x, y, { maxR, life, strength, rings }) {
      if (field.list.length >= MAX_RIPPLES) {
        // Drop the oldest rather than refusing the new one: under a downpour
        // the newest ripples are the ones the eye and the fish are following.
        let oldest = 0;
        for (let i = 1; i < field.list.length; i++) {
          if (field.list[i].age > field.list[oldest].age) oldest = i;
        }
        field.list.splice(oldest, 1);
      }
      const rip = { x, y, r: 0, maxR, age: 0, life, strength, rings };
      field.list.push(rip);
      field.spawned += 1;
      return rip;
    },

    advance(dt) {
      const live = field.list;
      let w = 0;
      for (let i = 0; i < live.length; i++) {
        const rip = live[i];
        rip.age += dt;
        if (rip.age >= rip.life) continue;      // expired, and not kept
        rip.r = rip.maxR * frontAt(rip.age / rip.life);
        live[w++] = rip;
      }
      live.length = w;
    },

    clear() { field.list.length = 0; },
  };
  return field;
}

// Pick a concrete parameter set from one of the tables above. Separated from
// spawn() so the randomness has exactly one entry point and the spawner itself
// stays pure — which is what lets the gate spawn a click ripple and a rain
// ripple with identical numbers and compare the records.
// Blend two of the tables above. The rain uses it so a drop's splash grows
// smoothly smaller and sharper as the storm builds, rather than switching
// character at a threshold — a step there is visible as a moment where every
// new ripple changes size at once.
export function lerpRippleTable(a, b, k) {
  const t = Math.max(0, Math.min(1, k));
  const mix = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  return {
    maxR: mix(a.maxR, b.maxR),
    life: mix(a.life, b.life),
    strength: mix(a.strength, b.strength),
    rings: t < 0.5 ? a.rings : b.rings,
  };
}

export function rollRipple(rand, table) {
  return {
    maxR: rand.range(table.maxR[0], table.maxR[1]),
    life: rand.range(table.life[0], table.life[1]),
    strength: rand.range(table.strength[0], table.strength[1]),
    rings: table.rings,
  };
}
