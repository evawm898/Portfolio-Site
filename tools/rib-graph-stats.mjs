// Acceptance metric for EDGE TERMINATION + constrained Lloyd.
//
// Builds the petal rib network as an explicit graph and reports, for one petal:
//   VEINS / BONE : cyclomatic number (E - V + C) and free-end (degree-1) count,
//                  for FADE vs MEET vs LOOP. FADE should be ~1 (the margin hoop
//                  alone) with many free ends; MEET/LOOP raise the cyclomatic
//                  number into the tens and cut free ends sharply.
//   VORONOI      : a cell network is already closed (cyclomatic ~ cell count,
//                  ~0 free ends), so the meaningful metric is how many outer cells
//                  are SLICED by the raw outline. Constrained Lloyd (>=1) should
//                  drive that to ~0 by aligning cells to an inward margin band.
//
// Run: node tools/rib-graph-stats.mjs
import {
  buildVenation, buildBone, buildSilhouette, buildVoronoi,
  buildRibGraph, graphStats, terminateEdges, petalHalfWidth,
} from '../flower-geometry.js';

const DEG = Math.PI / 180, CCS = 0.75;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const P = {
  W: 0.9, taper: 0.35, tip: 0.5, bloom: 55 * DEG, curl: 0.4 * CCS,
  edgeCurve: 0, edgeProfile: 0, petalCup: 0, lobe: 0, lobeCount: 5,
  L: 2.2, r0: 0, cup: 0.22, tipStyle: 'clean',
  secondaries: 6, maxDepth: 4, softness: 0.75, branchStart: 0.05, tubeRadius: 0.02,
  density: 8, boneCount: 18, boneWidth: 0.5, boneCurve: 0.55, boneSpread: 0.85,
};
const CAPTURE = 0.12;

// --- graph of a tube infill (veins/bone) closed onto the rim, per mode ---
function tubeStats(ven, mode) {
  const rim = buildSilhouette(P);
  const items = ven.veins.map((v) => ({ points: v.points, weld: [0] }));   // roots join parents
  if (mode !== 'fade') {
    const term = terminateEdges(ven.veins, rim, P, mode, CAPTURE);
    for (const v of term.veins) items.push({ points: v.points, weld: [0, 1] });
  }
  items.push({ points: rim, weld: [], closed: true });                     // the margin hoop
  return graphStats(buildRibGraph(items));
}

console.log('VEINS  (one petal, density 8 / detail 0.75)');
for (const mode of ['fade', 'meet', 'loop']) {
  const s = tubeStats(buildVenation(P, mulberry32(999), P), mode);
  console.log(`  ${mode.toUpperCase().padEnd(4)}  cyclomatic ${String(s.cyclomatic).padStart(3)}   free-ends ${String(s.deg1).padStart(3)}   (V ${s.V}, E ${s.E}, C ${s.C})`);
}
console.log('\nBONE  (one petal, 18 ribs)');
for (const mode of ['fade', 'meet', 'loop']) {
  const s = tubeStats(buildBone(P, P), mode);
  console.log(`  ${mode.toUpperCase().padEnd(4)}  cyclomatic ${String(s.cyclomatic).padStart(3)}   free-ends ${String(s.deg1).padStart(3)}   (V ${s.V}, E ${s.E}, C ${s.C})`);
}

// --- VORONOI: count outer cells sliced by the raw outline (touching it) ---
function distToPoly(p, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const abx = b.x - a.x, aby = b.y - a.y, len2 = abx * abx + aby * aby || 1e-12;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    best = Math.min(best, Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t));
  }
  return best;
}
console.log('\nVORONOI  (one petal, density 8) — outer cells sliced by the raw outline');
const sil = buildSilhouette(P, 72);
let Wmax = 0; for (let i = 0; i <= 100; i++) Wmax = Math.max(Wmax, petalHalfWidth(i / 100, P));
const touchEps = 0.01 * 2 * Wmax;   // "on the outline"
for (const lloyd of [0, 8, 20]) {
  const v = buildVoronoi(P, mulberry32(7), { density: P.density, softness: 0, lloyd });
  let sliced = 0;
  for (const slab of v.slabs) {
    if (slab.outer.some((p) => distToPoly(p, sil) < touchEps)) sliced++;
  }
  console.log(`  Lloyd ${String(lloyd).padStart(2)}   cells ${String(v.slabs.length).padStart(3)}   sliced-by-outline ${String(sliced).padStart(3)}`);
}
