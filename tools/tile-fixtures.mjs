/* tools/tile-fixtures.mjs — hand-drawn tiles for the /tile gate and sheets.
   Each is an ordinary tile (lattice coordinates, [u, v, sharp]); each must pass
   validate() except where `invalid` says why it must not. `expect` names the
   shape flags the gate requires (and requires ABSENT where `expect` omits them). */

export const FIXTURES = [
  { name: 'default', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true, edgeA: [[0.3, 0.13, 0], [0.7, -0.13, 0]], edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]] }, expect: [] },
  { name: 'straight 30 mm square', tile: { pitchA: 30, pitchB: 30, angle: 90, cornerSmooth: false, edgeA: [], edgeB: [] }, expect: [] },
  // an edge that hooks back over itself — an overhang a stamped blade can cut and a
  // dragged one cannot. Its curl makes an acute cookie corner: a spike, correctly.
  { name: 'hook at 60°, pitches 44 / 34', tile: { pitchA: 44, pitchB: 34, angle: 60, cornerSmooth: true,
      edgeA: [[0.3, 0.02, 0], [0.22, 0.2, 0], [0.35, 0.34, 0], [0.55, 0.25, 0], [0.75, 0.05, 0]],
      edgeB: [[0.1, 0.35, 0], [-0.1, 0.65, 0]] }, expect: ['spike'] },
  { name: 'sharp zigzag at 75°', tile: { pitchA: 36, pitchB: 42, angle: 75, cornerSmooth: false,
      edgeA: [[0.25, 0.12, 1], [0.5, -0.12, 1], [0.75, 0.12, 1]],
      edgeB: [[0.12, 0.33, 1], [-0.12, 0.66, 1]] }, expect: ['spike'] },   // its corner at C0 is 34.5°
  // a jigsaw knob on each edge: a neck narrower than the bulb, an overhang both ways
  { name: 'jigsaw knob', tile: { pitchA: 50, pitchB: 50, angle: 90, cornerSmooth: false,
      edgeA: [[0.4, 0, 1], [0.38, 0.1, 0], [0.32, 0.2, 0], [0.5, 0.3, 0], [0.68, 0.2, 0], [0.62, 0.1, 0], [0.6, 0, 1]],
      edgeB: [[0, 0.4, 1], [-0.1, 0.38, 0], [-0.2, 0.32, 0], [-0.3, 0.5, 0], [-0.2, 0.68, 0], [-0.1, 0.62, 0], [0, 0.6, 1]] }, expect: [] },
  { name: 'obtuse 120°, pitches 35 / 45', tile: { pitchA: 35, pitchB: 45, angle: 120, cornerSmooth: true,
      edgeA: [[0.35, 0.15, 0], [0.65, -0.1, 0]], edgeB: [[0.15, 0.4, 0], [-0.05, 0.75, 1]] }, expect: [] },
  { name: 'acute 40°', tile: { pitchA: 42, pitchB: 42, angle: 40, cornerSmooth: true,
      edgeA: [[0.5, 0.1, 0]], edgeB: [[-0.1, 0.5, 0]] }, expect: [] },
  // a tall thin finger: the top copy is a spike 30 mm long and 6 mm wide
  { name: 'finger (spike)', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: false,
      edgeA: [[0.42, 0, 1], [0.45, 0.6, 0], [0.5, 0.75, 0], [0.55, 0.6, 0], [0.58, 0, 1]], edgeB: [] }, expect: ['spike'] },
  // a notch from below (edge A) and a bulge from the left (edge B) that nearly meet:
  // the cookie's lower-left lobe hangs on a 2–4 mm neck. Its top copy is a finger.
  { name: 'pinch (neck)', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: false,
      edgeA: [[0.47, 0, 1], [0.55, 0.5, 0], [0.63, 0, 1]], edgeB: [[0, 0.3, 1], [0.45, 0.5, 0], [0, 0.7, 1]] }, expect: ['neck', 'spike'] },
  { name: 'close points', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true,
      edgeA: [[0.3, 0.13, 0], [0.31, 0.13, 0], [0.7, -0.13, 0]], edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]] }, expect: ['close'] },
];

/* Outlines the editor must REFUSE: the requested tile crosses itself. */
export const INVALID = [
  { name: 'bottom edge through the left edge', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: true, edgeA: [[0.05, 0.4, 0], [-0.1, 0.5, 0]], edgeB: [[-0.13, 0.3, 0], [0.13, 0.7, 0]] } },
  // an overhang taller than the tile: its peak rises through its own top copy's dip
  { name: 'a hook that laps its own top copy', tile: { pitchA: 40, pitchB: 40, angle: 90, cornerSmooth: false, edgeA: [[0.45, 0.45, 0], [0.55, 0.9, 0], [0.6, 0.45, 0], [0.5, -0.2, 0]], edgeB: [] } },
];

/* Seeded random tiles (mulberry32), rejected until valid. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function randomTile(seed, validate) {
  const r = rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    const n = (k) => Math.floor(r() * k);
    const pts = (count, along) => {
      const us = Array.from({ length: count }, () => 0.12 + 0.76 * r()).sort((a, b) => a - b);
      return us.map((u) => { const w = (r() - 0.5) * 0.5; return along === 'A' ? [u, w, r() < 0.3 ? 1 : 0] : [w, u, r() < 0.3 ? 1 : 0]; });
    };
    const tile = { pitchA: 25 + 35 * r(), pitchB: 25 + 35 * r(), angle: 40 + 100 * r(), cornerSmooth: r() < 0.6, edgeA: pts(n(4), 'A'), edgeB: pts(n(4), 'B') };
    if (validate(tile).ok) return tile;
  }
  throw new Error(`no valid random tile for seed ${seed}`);
}
