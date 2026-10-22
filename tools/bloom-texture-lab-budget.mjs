#!/usr/bin/env node
/* ===================================================================
   bloom-texture-lab-budget.mjs — WHAT A WHOLE-BLOOM RELIEF COSTS IN
   TRIANGLES (surface-texture discovery; not a gate).

   The shipped lattice cannot carry a millimetre-scale relief (petal columns
   are ~1.6 mm apart), so any relief — A or B — must first refine the mesh.
   This measures, in EXPORT mode, the shipped triangle count, the surface
   area, and the count after the prototype's red-green split at several edge
   targets, for the demo states; and for the shipped COST CORNERS (too large
   to subdivide here) it PROJECTS the count from their own area at the
   density the default bloom actually reached — the projection is labelled as
   one, never quoted as a build.

   A relief of feature size lambda is drawn by edges no longer than lambda/4
   (below that a 2 mm pebble aliases into facet noise); the edge column is the
   cost of a feature size four times it.

   Usage: node tools/bloom-texture-lab-budget.mjs [--out <json>]
   =================================================================== */
import fs from 'node:fs';
import * as C from '../bloom-texture-lab-core.js';
import { DEFAULTS } from '../bloom-registry.js';
import { EXPORT_TRI_BUDGET } from '../bloom-geometry.js';

const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const EDGES = [0.6, 0.4, 0.3, 0.25];
const out = { budget: EXPORT_TRI_BUDGET, edges: EDGES, built: {}, projected: {} };
const density = {};
for (const name of ['default', 'whole', 'infill', 'tube']) {
  const soup = C.buildTagged({ ...DEFAULTS, ...C.DEMO_STATES[name] });
  const base = C.weld(soup);
  const area = C.surfaceArea(base.P, base.tri);
  const row = { shippedTris: soup.triCount, areaMm2: +area.toFixed(1), byEdge: {} };
  for (const e of EDGES) {
    if (name !== 'default' && e < 0.3) continue;
    const s = C.subdivide(base, e);
    const tris = s.tri.length / 3;
    row.byEdge[e] = { tris, pctBudget: +(100 * tris / EXPORT_TRI_BUDGET).toFixed(1) };
    if (name === 'default') density[e] = tris / area;
    console.log(`${name.padEnd(8)} shipped ${soup.triCount} area ${area.toFixed(0)} mm2 | edge ${e}: ${tris} tris (${row.byEdge[e].pctBudget}% of budget)`);
  }
  out.built[name] = row;
}
const CORNERS = {
  'INFILL: x 40 petals x 3 whorls': { petalInfill: 'VORONOI', petalCount: 40, layerCount: 3 },
  'whole bloom x 40 petals x 3 whorls': { ...C.DEMO_STATES.whole, petalCount: 40, layerCount: 3 },
};
for (const [label, delta] of Object.entries(CORNERS)) {
  const soup = C.buildTagged({ ...DEFAULTS, ...delta });
  const base = C.weld(soup);
  const area = C.surfaceArea(base.P, base.tri);
  const row = { shippedTris: soup.triCount, areaMm2: +area.toFixed(1), byEdge: {} };
  for (const e of EDGES) { const t = Math.round(area * density[e]); row.byEdge[e] = { projectedTris: t, pctBudget: +(100 * t / EXPORT_TRI_BUDGET).toFixed(1) }; }
  out.projected[label] = row;
  console.log(`${label}: shipped ${soup.triCount} (${(100 * soup.triCount / EXPORT_TRI_BUDGET).toFixed(1)}%), area ${area.toFixed(0)} mm2 | PROJECTED ${EDGES.map((e) => `${e}: ${row.byEdge[e].projectedTris} (${row.byEdge[e].pctBudget}%)`).join(' · ')}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
