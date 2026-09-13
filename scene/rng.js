// scene/rng.js — the one random source for /scene.
//
// WHY A SEEDED PRNG RATHER THAN Math.random: the gate has to be able to assert
// things about a simulation that is, by design, never the same twice. Every
// scene draws its randomness from here, seeded once at construction, so a run
// with `?seed=N` is byte-reproducible and a run without one is a different
// pond each visit. Nothing in a scene may call Math.random directly — that is
// the only rule, and tools/verify-scene.mjs asserts it against the source.

// mulberry32 — 32 bits of state, uniform enough for a pond and small enough to
// read. Returns a function in [0, 1).
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience wrappers. They exist so call sites read as intent ("a size
// between 0.85 and 1.15") rather than as arithmetic, and so every one of them
// goes through the same stream.
export function makeRandom(seed) {
  const rng = makeRng(seed);
  return {
    unit: rng,
    range: (lo, hi) => lo + (hi - lo) * rng(),
    int: (lo, hi) => lo + Math.floor((hi - lo + 1) * rng()),
    // A value in [-1, 1] that clusters toward 0 — the shape wanted for a
    // meander jitter, where most steps should be small.
    signed: () => (rng() + rng() - 1),
    chance: (p) => rng() < p,
    pick: (arr) => arr[Math.floor(rng() * arr.length) % arr.length],
  };
}

// A seed that is stable within a page load and different between loads, unless
// the URL pins one. The gate always pins one.
export function seedFromUrl(search, fallback) {
  const m = /(?:^|[?&])seed=(-?\d+)/.exec(search || '');
  if (m) return Number(m[1]) >>> 0;
  return (fallback === undefined ? (Date.now() ^ 0x5f3759df) : fallback) >>> 0;
}
