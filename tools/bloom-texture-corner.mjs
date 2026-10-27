#!/usr/bin/env node
/* ===================================================================
   bloom-texture-corner.mjs — THE WORST CORNER AND THE THREE CAP MECHANISMS,
   MEASURED AND NOT CHOSEN (surface texture T3, step 6 of the brief). The
   discovery read the whole bloom x 40 petals x 3 whorls at 119.7 % of the
   1,500,000 export budget on the prototype's lattice at 0.4 mm; this is the
   SHIPPED lattice's own figure, and beside it what each of the three
   mechanisms Eva named would cost, so the ruling is made in front of numbers:
     (1) A HEAD-COUNT LIMIT  — the largest petal count whose textured export
                               fits, at 1 / 2 / 3 whorls (bisected).
     (2) EDGE COARSENING     — the budget share at 40 x 3 as the lattice edge
                               rises from the ruled 0.4 mm (through the
                               `textureEdgeMm` capability hook, petals only),
                               and the finest edge that fits.
     (3) REFUSAL PAST BUDGET — what the page does today: the export is refused
                               at `EXPORT_TRI_BUDGET` with the count on the
                               read-out (the fringe's precedent, XR1); the
                               row stays unbuilt as a matrix row because a
                               refused row produces no STL for the gates.
   RULED (Eva, Oct 23): COARSEN THE EDGE, TOLD — mechanism (2), built into
   `buildBloomInto` as a budget-derived edge on a 0.01 mm grid between 0.4 and
   the 0.5 cap (past the cap the export is refused). This tool now ALSO prints
   the shipped derivation's own answer per corner (the edge used and every
   trial) beside the pinned ladder it measured before the ruling; the pinned
   ladder reaches EVERY organ now (the hook pins the whole bloom), so its
   whole-bloom figures are lower than the petals-only ones T3 quoted.
   Node only. RUN: node tools/bloom-texture-corner.mjs
   =================================================================== */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(HERE, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const B = G.EXPORT_TRI_BUDGET;
const JSON_OUT = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const REC = { budget: B, corners: {}, headCount: {}, edges: {} };
/* a PINNED build (the hook) — the derivation is off, the edge is the one asked */
const tris = (o, cap = { textureEdgeMm: 0.4 }) => { const acc = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(acc, { ...R.DEFAULTS, petalTexture: 'PEBBLE', ...o }, { below: null, capability: cap }); return acc.triangleCount; };
/* the SHIPPED derivation's own answer */
const derived = (o) => { const acc = new G.MeshBuilder({ exportMode: true }); const b = G.buildBloomInto(acc, { ...R.DEFAULTS, petalTexture: 'PEBBLE', ...o }, { below: null }); const E = b.texture.edgeCap; return { usedMm: E.usedMm, fits: E.fits, tris: acc.triangleCount, trials: E.trials }; };
const pct = (n) => `${(100 * n / B).toFixed(1)} %`;
console.log(`THE CORNER — PEBBLE at the ruled 0.4 mm edge, H 0.4, EXPORT (the budget is ${B.toLocaleString('en-US')}):`);
const corners = [['40 x 3 whorls', { petalCount: 40, layerCount: 3 }], ['40 x 3 whorls + 8 sepals + a 60 mm leaf on a 60 mm stem (the WHOLE bloom)', { petalCount: 40, layerCount: 3, sepalCount: 8, stemLength: 60, leafLength: 60 }], ['40 x 1 whorl', { petalCount: 40 }], ['the default', {}]];
const got = {};
for (const [n, o] of corners) { const t = tris(o); got[n] = t; REC.corners[n] = t; console.log(`  ${n}: ${t.toLocaleString('en-US')} tris = ${pct(t)}${t > B ? '  — REFUSED by the page today (mechanism 3)' : ''}`); }
console.log('\n(1) A HEAD-COUNT LIMIT — the largest petal count whose textured export fits:');
for (const L of [1, 2, 3]) {
  let lo = 3, hi = 40;
  if (tris({ petalCount: 40, layerCount: L }) <= B) { REC.headCount[L] = { fits: 40, fitsTris: tris({ petalCount: 40, layerCount: L }) }; console.log(`  ${L} whorl(s): 40 fits (${pct(tris({ petalCount: 40, layerCount: L }))})`); continue; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tris({ petalCount: mid, layerCount: L }) <= B) lo = mid; else hi = mid; }
  REC.headCount[L] = { fits: lo, fitsTris: tris({ petalCount: lo, layerCount: L }), next: hi, nextTris: tris({ petalCount: hi, layerCount: L }) };
  console.log(`  ${L} whorl(s): ${lo} petals fit (${pct(tris({ petalCount: lo, layerCount: L }))}); ${hi} does not (${pct(tris({ petalCount: hi, layerCount: L }))})`);
}
console.log('\n(2) EDGE COARSENING at 40 x 3 — the lattice edge raised past the ruled 0.4 mm (petals, through the capability hook):');
let fits = null;
for (const e of [0.4, 0.5, 0.6, 0.7, 0.8, 1.0, 1.2]) { const t = tris({ petalCount: 40, layerCount: 3 }, { textureEdgeMm: e }); if (fits === null && t <= B) fits = e; REC.edges[e] = t; console.log(`  edge ${e.toFixed(1)} mm: ${t.toLocaleString('en-US')} tris = ${pct(t)}${t <= B ? ' fits' : ''}  (a 0.4 mm relief on a ${e.toFixed(1)} mm lattice is ${(e / 0.4).toFixed(1)} edges per feature-floor)`); }
console.log(`  the finest edge in that ladder that fits: ${fits} mm`);
console.log('\n(3) REFUSAL PAST BUDGET — the page as it stands: the export click builds the mesh, reads the count and refuses above the budget with the count printed; a textured 40 x 3 is refused at ' + got['40 x 3 whorls'].toLocaleString('en-US') + ' tris. No row carries it: a refused row produces no STL for X1 to read (the ALL MAX precedent).');
REC.finestEdgeThatFits = fits;
console.log('\nTHE SHIPPED CAP (Eva, Oct 23 — the derivation itself, every organ on one edge):');
REC.derived = {};
for (const [n, o] of [...corners, ['past the cap: 40 x 3 + 40 sepals x 4 tiers + whorled leaves on a 120 mm stem', { petalCount: 40, layerCount: 3, sepalCount: 40, sepalTiers: 4, stemLength: 120, leafLength: 60, leafNodes: 8, leafPhyllotaxy: 'whorled' }]]) {
  const d = derived(o); REC.derived[n] = d;
  console.log(`  ${n}: edge ${d.usedMm.toFixed(2)} mm, ${d.tris.toLocaleString('en-US')} tris = ${pct(d.tris)}${d.fits ? '' : ' — DOES NOT FIT AT THE CAP, the export is refused'} (trials ${d.trials.map((t) => `${t.edgeMm.toFixed(2)}: ${t.tris.toLocaleString('en-US')}`).join(' · ')})`);
}
if (JSON_OUT) (await import('node:fs')).writeFileSync(JSON_OUT, JSON.stringify(REC, null, 1));
