#!/usr/bin/env node
/* ===================================================================
   bloom-texture-lab-budget.mjs — WHAT A WHOLE-BLOOM RELIEF COSTS IN
   TRIANGLES (surface-texture discovery; not a gate).

   The shipped lattice cannot carry a millimetre-scale relief (petal columns
   are ~1.6 mm apart), so any relief — A or B — must first refine the mesh.
   This measures, in EXPORT mode, the shipped triangle count, the surface
   area, and the count after the prototype's split (--split, default 'rows',
   T1's; 'redgreen' is the discovery's) at several edge targets, per organ,
   for the demo states AND for the shipped COST CORNERS. Since T1 the corners
   are BUILT (the discovery projected them from the default's density,
   because the red-green split could not afford them; its projections stay in
   docs/data/bloom-surface-texture-budget.json as the record).

   IDEAL is 2A/e^2, a regular lattice of edge e over the same area — an
   arithmetic bound, not a build (tools/bloom-texture-lab-quality.mjs says why
   it is not reachable by a split that keeps the shipped vertices).

   A relief of feature size lambda is drawn by edges no longer than lambda/4
   (below that a 2 mm pebble aliases into facet noise); the edge column is the
   cost of a feature size four times it.

   Usage: node tools/bloom-texture-lab-budget.mjs [--out <json>] [--split rows|redgreen]
          [--edges 0.6,0.4,0.3,0.25] [--no-corners]
   =================================================================== */
import fs from 'node:fs';
import * as C from '../bloom-texture-lab-core.js';
import { DEFAULTS } from '../bloom-registry.js';
import { EXPORT_TRI_BUDGET } from '../bloom-geometry.js';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = arg('--out', null);
const SPLIT = arg('--split', 'rows');
const EDGES = arg('--edges', '0.6,0.4,0.3,0.25').split(',').map(Number);
const CORNERS_ON = !args.includes('--no-corners');
const out = { budget: EXPORT_TRI_BUDGET, split: SPLIT, edges: EDGES, built: {}, corners: {} };
const pct = (t) => +(100 * t / EXPORT_TRI_BUDGET).toFixed(1);

function measure(label, state, edges) {
  const t0 = Date.now();
  const soup = C.buildTagged(state);
  const base = C.weld(soup);
  const area = C.surfaceArea(base.P, base.tri);
  const organArea = {};
  for (let t = 0; t < base.tri.length / 3; t++) {
    const o = C.ORGANS[soup.organIx[base.src[t]]];
    organArea[o] = (organArea[o] || 0) + C.surfaceArea(base.P, base.tri.slice(t * 3, t * 3 + 3));
  }
  const row = { shippedTris: soup.triCount, shippedPctBudget: pct(soup.triCount), areaMm2: +area.toFixed(1), organAreaMm2: Object.fromEntries(Object.entries(organArea).map(([k, v]) => [k, +v.toFixed(1)])), byEdge: {} };
  for (const e of edges) {
    const s = C.subdivide(base, e, [], { split: SPLIT, canPair: C.pairPredicate(soup) });
    const tris = s.tri.length / 3;
    const byOrgan = {};
    for (let t = 0; t < tris; t++) { const o = C.ORGANS[soup.organIx[s.src[t]]]; byOrgan[o] = (byOrgan[o] || 0) + 1; }
    const ideal = Math.round(2 * area / (e * e));
    row.byEdge[e] = { tris, pctBudget: pct(tris), ideal, idealPctBudget: pct(ideal), byOrgan, idealByOrgan: Object.fromEntries(Object.entries(organArea).map(([k, v]) => [k, Math.round(2 * v / (e * e))])) };
    console.log(`${label.padEnd(36)} shipped ${soup.triCount} (${pct(soup.triCount)}%) area ${area.toFixed(0)} mm2 | ${SPLIT} edge ${e}: ${tris} tris (${pct(tris)}% of budget; ideal ${ideal}, ${pct(ideal)}%) | ${Object.entries(byOrgan).map(([o, n]) => `${o} ${n}`).join(' · ')}`);
  }
  row.ms = Date.now() - t0;
  return row;
}
for (const name of ['default', 'whole', 'infill', 'tube']) out.built[name] = measure(name, { ...DEFAULTS, ...C.DEMO_STATES[name] }, EDGES);
if (CORNERS_ON) {
  const CORNERS = {
    'INFILL: x 40 petals x 3 whorls': { petalInfill: 'VORONOI', petalCount: 40, layerCount: 3 },
    'whole bloom x 40 petals x 3 whorls': { ...C.DEMO_STATES.whole, petalCount: 40, layerCount: 3 },
  };
  for (const [label, delta] of Object.entries(CORNERS)) out.corners[label] = measure(label, { ...DEFAULTS, ...delta }, EDGES);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
