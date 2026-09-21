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

export const MAX_RIPPLES = 600;    // a downpour is capped here, the one nearest its own end dropped
export const RING_LAG = 0.13;      // each inner ring trails the front by this much of a life

// The two callers' parameter sets, declared here rather than at the call sites,
// so the difference between a raindrop and a click is one readable table and
// neither caller can quietly grow a field the other lacks.
//
// WIDENED FOR VARIETY, ON PURPOSE: the low end of each range is well under the
// old floor and the high end well over the old ceiling, so a field of these
// reads as a mix of quick small ones and lingering large ones rather than a
// crowd of near-identical rings. rollRipple() below correlates `maxR` and
// `life` from one shared draw so the two ends of that mix are "small and
// fast" and "big and slow" — never "big and gone in a blink".
//
// WIDENED FURTHER, AND THE SIZE DRAW SKEWED SMALL. The rain-on-a-pond
// photograph this scene is measured against is dense with tiny fresh pocks and
// carries a handful of big slow rings over the top of them; a UNIFORM draw
// over a narrow band gives neither, only a crowd of mid-sized rings. Measured
// on the shipped grid at 1440x900: rate alone takes the surface from 4% to 42%
// covered but puts 46 drops in the air, which is as many as the DOWNPOUR has —
// so the storm stops being an escalation. Getting the density from LIFE and
// SIZE as well reaches 92% covered on 23 drops in the air, half the rain for
// twice the water. See rollRipple for the skew, which costs no extra draw.
//
// LIFE WAS SHORTENED AGAIN, IDLE ONLY: at [3.0, 8.0] the slowest quarter of
// idle ripples sat on screen for the better part of ten seconds, well past
// the point a real drop's ring has actually spread and faded, and read as the
// surface visually dominated by a handful of ripples that would not leave.
// [1.8, 4.5] roughly halves both ends and still keeps `life` correlated to
// `maxR` (rollRipple below), so the largest, slowest-fading rings are still
// the largest and slowest — they just stop taking twice as long to die as
// everything else on the pond. STORM_RIPPLE is untouched: a storm ripple is
// already an order of magnitude shorter-lived by construction, and
// `lerpRippleTable` reads DROP_RIPPLE only at intensity 0, so nothing here
// reaches a storm or downpour ripple at all.
//
// TUNED FURTHER, DIALLED LIVE RATHER THAN GUESSED-AND-CHECKED: life to
// [1.8, 3.2] and the reach to [10, 104] (from [10, 170]), against a
// standalone sandbox that runs this same table with sliders instead of a
// screenshot-and-gate round trip per tweak (not part of this repo — see the
// PR for the tool). Same construction as the paragraph above: idle only,
// STORM_RIPPLE untouched, nothing here reaches a storm or click ripple.
//
// AND ONE MORE PASS ON THE SAME SANDBOX: life to [0.8, 2.1] and reach to
// [10, 74], both tightened further still, alongside RAIN_IDLE_RATE dropping
// to 21 in koi-rain.js — a shorter-lived, shorter-reaching ripple at a
// lower rate read as the better-balanced idle surface than the wider,
// slower one this file had been carrying. Same construction, still idle
// only: STORM_RIPPLE and CLICK_RIPPLE below are untouched, and
// `lerpRippleTable` reads DROP_RIPPLE only at storm intensity 0.
export const DROP_RIPPLE = { maxR: [10, 74], life: [0.8, 2.1], strength: [0.24, 0.58], rings: 2 };
export const STORM_RIPPLE = { maxR: [14, 46], life: [0.6, 1.6], strength: [0.20, 0.44], rings: 2 };
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
        // Drop the one CLOSEST TO ITS OWN NATURAL END, rather than the one
        // with the most raw seconds on it: with size and decay now varied, a
        // long-lived ripple at 1s in is barely started while a quick one at
        // the same raw age is nearly gone, so age alone is not "oldest" any
        // more. age/life is — and it is also, by construction, the faintest
        // one on screen (see fadeAt), so evicting it is the one eviction the
        // eye is least likely to notice.
        let oldest = 0, oldestFrac = field.list[0].age / field.list[0].life;
        for (let i = 1; i < field.list.length; i++) {
          const frac = field.list[i].age / field.list[i].life;
          if (frac > oldestFrac) { oldest = i; oldestFrac = frac; }
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

// How strongly a ripple's life is pulled toward what its own reach implies —
// 0 would be two fully independent rolls, 1 would make `life` a pure function
// of `maxR` with no spread of its own. Short of either, on purpose: enough
// pull that a mixed field reads as "small and quick" against "big and slow"
// rather than the two rolling apart at random, not so much that every ripple
// of a given size lives for the same length of time.
const LIFE_FOLLOWS_SIZE = 0.7;

export function rollRipple(rand, table) {
  // THREE ROLLS, SAME ORDER AS BEFORE. `rand` is the one shared stream a
  // scene draws everything from, so adding or dropping a draw here shifts
  // every number anything downstream reads for the rest of the run — including
  // the fish, who share it. So `maxR`, `life` and `strength` are each still
  // exactly one call, in this order, whatever the tables above say — and a
  // real splash disperses its energy over more area AND more time together,
  // so `life` is then pulled toward what `maxR`'s own draw implies rather
  // than adding a fourth roll to correlate them.
  // SKEWED SMALL, AND STILL EXACTLY ONE DRAW. `range` is one call on the shared
  // stream, and so is this: squaring a unit sample biases it toward the low end
  // without touching how many numbers the stream gives out, which is what keeps
  // every downstream reader (the fish above all) on the sequence it had.
  const sizeRoll = rand.range(0, 1);
  const maxR = table.maxR[0] + (table.maxR[1] - table.maxR[0]) * sizeRoll * sizeRoll;
  const lifeRoll = rand.range(table.life[0], table.life[1]);
  const strength = rand.range(table.strength[0], table.strength[1]);
  const span = table.maxR[1] - table.maxR[0];
  const k = span > 0 ? (maxR - table.maxR[0]) / span : 0.5;
  const implied = table.life[0] + (table.life[1] - table.life[0]) * k;
  const life = lifeRoll + (implied - lifeRoll) * LIFE_FOLLOWS_SIZE;
  return { maxR, life, strength, rings: table.rings };
}
