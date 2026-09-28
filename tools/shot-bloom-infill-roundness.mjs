#!/usr/bin/env node
/* ===================================================================
   tools/shot-bloom-infill-roundness.mjs — THE ROUNDNESS SWEEP, and the
   numbers behind docs/bloom-infill-roundness-and-bevel.md §2.
   `node tools/shot-bloom-infill-roundness.mjs <dir> [--png <file>] [--quick]`

   THE LAW MEASURED, not shipped: roundness s in [0, 1] takes each hole the
   shipped plan draws (the inset, clipped to the basal V, filleted at
   INFILL_FILLET_MM with the 0.45 x short-edge clamp) and OPENS it by
   s x its own inradius — erode then dilate, the union of every disc of that
   radius that fits. s = 0 IS TODAY'S HOLE BY BRANCH (the law returns the
   shipped polygon untouched), so the state shipping today is the floor; s = 1
   is the inscribed circle. The opening never removes a hole's largest
   inscribed disc, so the ruled 1.50 mm WIDTH — the quantity the bar is
   decided on — cannot fall under it; what falls is the hole's AREA.

   Every caption carries the ACHIEVED count, read off the builder's own
   record. EXPORT mode throughout (print preview's geometry), smooth normals
   from the builder's captureNormals channel (print preview's own shading).
   The geometry is a PATCHED COPY of bloom-geometry.js written outside the
   repo (tools/bloom-rim-roundness-lib.mjs); nothing shipped is touched.
   Deterministic renderer: no pixel delta is quoted.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import * as L from './bloom-rim-roundness-lib.mjs';
import { infillWallSurfaceMm } from './bloom-infill-wall.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-infill-roundness.mjs <dir> [--png <file>] [--quick]'); process.exit(2); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png'), QUICK = process.argv.includes('--quick');
fs.mkdirSync(DIR, { recursive: true });
const { DEFAULTS } = await import(new URL('../bloom-registry.js', import.meta.url).href);

const G = await L.loadVariant({ K: 4, law: true });
let S = 0;
globalThis.__holeLaw = (P, fr, infillFillet, infillInset) => {
  const f = infillFillet(P, fr);
  if (S === 0) return f;                                     // THE FLOOR: today's hole, by branch
  const rIn = L.inradiusOf(f, infillInset);
  return L.openingLaw(infillFillet(P, fr, 20), S * rIn, infillInset);
};

const STEPS = QUICK ? [0, 1] : [0, 0.25, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
const key = (q) => `${q.x.toFixed(6)},${q.y.toFixed(6)}`;
function measure() {
  const R = L.planFor(G, DEFAULTS, {});
  const pl = R.plan, open = pl.cellOpen;
  const holes = pl.holes.filter((h, i) => h && open[i]);
  const region = pl.cells.reduce((a, c) => a + L.polyArea(c), 0);
  const holeA = holes.reduce((a, h) => a + L.polyArea(h), 0);
  const cnt = new Map(); for (const c of pl.cells) for (const q of c) { const k = key(q); if (!cnt.has(k)) cnt.set(k, { q, n: 0 }); cnt.get(k).n++; }
  const js = [...cnt.values()].filter((v) => v.n >= 3).map((v) => 2 * Math.min(...holes.map((h) => L.polyDist(v.q.x, v.q.y, h)))).sort((a, b) => a - b);
  const wd = pl.widthsMm.filter((x, i) => open[i]).sort((a, b) => a - b);
  const q = holes.map(L.roundnessOf).sort((a, b) => a - b);
  const w = infillWallSurfaceMm(R.surface, pl);
  return { achieved: pl.achieved, cells: pl.cells.length, wMin: wd[0], wMed: wd[wd.length >> 1], solid: 1 - holeA / region, holeArea: holeA,
    minWall: w ? w.mm : null, jMin: js[0], jMed: js[js.length >> 1], nJ: js.length, qMin: q[0], qMed: q[q.length >> 1] };
}
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };
const light = { light1: [0.45, -0.45, 0.78], light2: [-0.5, 0.4, 0.3] };
const PW = 300, PH = 420, BW = 300, BH = 300;
const table = [], petals = [], blooms = [];
for (const s of STEPS) {
  S = s;
  const m = measure();
  const one = L.build(G, DEFAULTS, { petalCount: 1, layerCount: 1, petalInfill: 'VORONOI' }, { normals: true });
  const bloom = L.build(G, DEFAULTS, { petalInfill: 'VORONOI' }, { normals: true });
  const corner = QUICK ? null : L.build(G, DEFAULTS, { petalInfill: 'VORONOI', petalCount: 40, layerCount: 3 });
  const row = { s, ...m, tris1: one.tris, trisBloom: bloom.tris, trisCorner: corner ? corner.tris : null };
  table.push(row);
  console.log(`s=${s.toFixed(2)}  achieved ${m.achieved}/${m.cells}  widths min ${m.wMin.toFixed(3)} med ${m.wMed.toFixed(3)} mm  solid ${(100 * m.solid).toFixed(1)}%  hole area ${m.holeArea.toFixed(1)} mm2  min wall ${m.minWall.toFixed(4)}  junction solid dia min ${m.jMin.toFixed(3)} med ${m.jMed.toFixed(3)} (n=${m.nJ})  roundness min ${m.qMin.toFixed(3)} med ${m.qMed.toFixed(3)}  tris petal ${one.tris} bloom ${bloom.tris}${corner ? ` 40x3 ${corner.tris} (${(100 * corner.tris / G.EXPORT_TRI_BUDGET).toFixed(1)}%)` : ''}`);
  /* the petal face-on: the sheet normal at mid-blade is the view direction */
  const n0 = one.surface.at(0.5, 0).n; const bb = bbox(one.pos);
  const up = L.nrm(L.sub(one.surface.at(0.9, 0).P, one.surface.at(0.1, 0).P));
  const prgb = render(one.pos, PW, PH, { dir: n0, up, center: bb.c, halfHeight: Math.max(...bb.d) * 0.52 }, { ...light, normals: one.normals, supersample: 3 });
  text(prgb, PW, PH, 8, 8, `ROUNDNESS ${s.toFixed(2)}`, [250, 250, 248], 2);
  text(prgb, PW, PH, 8, 28, `${m.achieved} OF ${m.cells} HOLES`, [111, 183, 174], 2);
  text(prgb, PW, PH, 8, PH - 22, `${one.tris} TRIS`, [180, 176, 168], 2);
  petals.push(prgb);
  const bb2 = bbox(bloom.pos);
  const brgb = render(bloom.pos, BW, BH, { dir: [0.2, -0.45, 0.87], up: [0, 1, 0], center: bb2.c, halfHeight: Math.max(...bb2.d) * 0.55 }, { ...light, normals: bloom.normals, supersample: 2 });
  text(brgb, BW, BH, 8, 8, `ROUNDNESS ${s.toFixed(2)}`, [250, 250, 248], 2);
  text(brgb, BW, BH, 8, 28, `${m.achieved} OF ${m.cells} HOLES A PETAL`, [111, 183, 174], 2);
  text(brgb, BW, BH, 8, BH - 22, `${bloom.tris} TRIS`, [180, 176, 168], 2);
  blooms.push(brgb);
}
fs.writeFileSync(path.join(DIR, 'roundness-sweep.json'), JSON.stringify(table, null, 1));
const cols = STEPS.length, SHW = cols * PW, SHH = PH + BH;
const sheet = Buffer.alloc(SHW * SHH * 3);
for (let i = 0; i < STEPS.length; i++) { blit(sheet, SHW, SHH, petals[i], PW, PH, i * PW, 0); blit(sheet, SHW, SHH, blooms[i], BW, BH, i * PW, PH); }
const out = PNG || path.join(DIR, 'roundness-sweep.png');
writePng(out, SHW, SHH, sheet);
console.log(`wrote ${out}`);
