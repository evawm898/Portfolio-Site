/* ===================================================================
   tools/bloom-hydrangea-measure.mjs — the floret-cost tables of
   docs/bloom-hydrangea-discovery.md §2 and §4. MEASUREMENT ONLY, Node, no
   browser, about a minute. Nothing here is imported by the generator.

   Prints, every figure naming its MODE and its SAMPLING (the session-32 rule):
     §2a  the cheapest reachable 4-petal floret on the SHIPPED tree, by part
          (petals, hub, pedicel), LIVE and EXPORT, and the floret count that
          fits EXPORT_TRI_BUDGET with nothing else built;
     §2b  the tip-shape row ramp on a floret (a round sepal-like tip reaches
          `APEX_NU_BAND` and pays for it);
     §2c  REDUCED-LATTICE florets from patched copies of bloom-geometry.js
          written OUTSIDE the repo (tools/bloom-hydrangea-lib.mjs): NU_BASE,
          NV and RIM_BEAD_SEGMENTS, each with its triangle count, the outline's
          chord error against a 224-row reference build of the SAME variant
          family, the nib's arc rows, and the closed-solid census (boundary,
          non-manifold, directed-edge mismatch, degenerate, within-shell
          self-intersection pairs);
     §2d  the cup and bead facet errors in closed form (from the cup law
          `c a^2 / hb` and the bead's half-round of K segments).

   RUN:  node tools/bloom-hydrangea-measure.mjs [--json <file>]
   =================================================================== */
import fs from 'node:fs';
import { loadVariant, registry, build, FLORET, edgeCensus } from './bloom-hydrangea-lib.mjs';
import { census } from './bloom-self-intersection.mjs';

const { DEFAULTS } = await registry();
const out = {};
const jsonArg = process.argv.indexOf('--json');
const S = await loadVariant({});
const budget = S.EXPORT_TRI_BUDGET;

/* ---- §2a: the shipped floret, by part ---- */
console.log('§2a THE CHEAPEST REACHABLE 4-PETAL FLORET (shipped tree; DEFAULTS + the named set)');
const rows2a = [
  ['4 petals 20x8, sessile (no stem)', FLORET],
  ['4 petals 20x18 tip 2.0 cup 0.2 tilt 15, sessile', { ...FLORET, petalWidth: 18, petalTipShape: 2.0, petalCup: 0.2, petalTilt: 15 }],
  ['3 petals 20x8, sessile', { ...FLORET, petalCount: 3 }],
  ['4 petals 20x8 + 3 mm pedicel 5 mm, flat end', { ...FLORET, stemLength: 5, stemDiameter: 3, stemCut: 'FLAT' }],
  ['4 petals 20x8 + 3 mm pedicel 40 mm, flat end', { ...FLORET, stemLength: 40, stemDiameter: 3, stemCut: 'FLAT' }],
  ['4 petals 20x8 + domed hub (headRise 0.3)', { ...FLORET, headRise: 0.3 }],
];
out.florets = [];
for (const [label, set] of rows2a) {
  const L = build(S, DEFAULTS, set, { exportMode: false }), E = build(S, DEFAULTS, set, { exportMode: true });
  const petals = E.b.petalsAll.filter(Boolean).map((p) => p.triRange[1] - p.triRange[0]);
  const petalSum = petals.reduce((a, b) => a + b, 0);
  /* everything that is not a petal: the hub (192 flat / 3,456 domed) plus the
     pedicel and its hub-to-stem join where there is one */
  const rest = E.tris - petalSum;
  const rec = { label, live: L.tris, export: E.tris, petals, hubAndStem: rest, fit: Math.floor(budget / E.tris) };
  out.florets.push(rec);
  console.log(`  ${label.padEnd(50)} live ${String(L.tris).padStart(6)} export ${String(E.tris).padStart(6)}  petals ${petals.join('+')}  hub+pedicel ${rest}  -> ${rec.fit} fit ${budget.toLocaleString()}`);
}

/* ---- §2b: the apex row ramp on a floret ---- */
console.log('\n§2b THE TIP-SHAPE ROW RAMP ON A FLORET (shipped tree, EXPORT; rows = the petal record\'s own profileU length)');
out.ramp = [];
for (const n of [1.7, 2.0, 2.3, 2.5, 2.7, 3.0]) {
  const E = build(S, DEFAULTS, { ...FLORET, petalTipShape: n }, { exportMode: true });
  const p = E.b.petalsAll[0];
  out.ramp.push({ tipShape: n, tris: E.tris, rows: p.profileU.length });
  console.log(`  petalTipShape ${n.toFixed(2)}  floret ${E.tris}  rows a petal ${p.profileU.length}  -> ${Math.floor(budget / E.tris)} fit`);
}

/* ---- §2c: reduced lattices ---- */
console.log('\n§2c REDUCED-LATTICE FLORETS (patched copies; EXPORT; chord = max |half-width| of this variant\'s emitted outline polyline');
console.log('    against the 224-row build of the same tree, sampled at the reference\'s 224 stations; root = u < 0.10, mid = 0.10..0.90, apex = u > 0.90)');
const variants = [[56, 10, 4], [40, 10, 4], [28, 10, 4], [20, 10, 4], [14, 10, 4], [56, 6, 4], [28, 8, 4], [28, 6, 4], [56, 10, 2], [56, 6, 2], [40, 6, 2], [28, 6, 2], [20, 6, 2]];
const shapes = { 'flat 20x8': FLORET, 'round 20x18 tip 2.0 cup 0.2': { ...FLORET, petalWidth: 18, petalTipShape: 2.0, petalCup: 0.2, petalTilt: 15 } };
out.lattice = [];
for (const [sname, set] of Object.entries(shapes)) {
  console.log(`  -- ${sname}`);
  for (const [nu, nv, k] of variants) {
    const G = await loadVariant({ nu, nv, k });
    const R = build(await loadVariant({ nu: 224, nv, k }), DEFAULTS, set, { exportMode: true });
    const r = build(G, DEFAULTS, set, { exportMode: true });
    const p = r.b.petalsAll[0], q = R.b.petalsAll[0];
    const pts = (rec) => rec.profileU.map((u, i) => [u, rec.profile[i]]).filter(([u]) => u > 0);
    const C = pts(p), D = pts(q);
    const interp = (P, u) => { for (let i = 1; i < P.length; i++) if (u <= P[i][0]) { const t = (u - P[i - 1][0]) / ((P[i][0] - P[i - 1][0]) || 1); return P[i - 1][1] + t * (P[i][1] - P[i - 1][1]); } return P[P.length - 1][1]; };
    let root = 0, mid = 0, apex = 0;
    for (const [u, h] of D) { if (u < C[0][0]) continue; const e = Math.abs(interp(C, u) - h); if (u < 0.10) root = Math.max(root, e); else if (u <= 0.90) mid = Math.max(mid, e); else apex = Math.max(apex, e); }
    const arcU = p.tipCap && p.tipCap.apex ? p.tipCap.apex.arcU : null;
    const arcRows = arcU == null ? null : p.profileU.filter((u) => u >= arcU).length;
    const ec = edgeCensus(r.acc.positions); const cs = census(r.acc.positions);
    const rec = { shape: sname, nu, nv, k, tris: r.tris, petal: p.triRange[1] - p.triRange[0], rows: p.profileU.length, chordRoot: root, chordMid: mid, chordApex: apex, arcRows, nib: !!(p.tipCap && p.tipCap.apex && p.tipCap.apex.active), ...ec, within: cs.within, fit: Math.floor(budget / r.tris) };
    out.lattice.push(rec);
    console.log(`    NU ${String(nu).padStart(3)} NV ${String(nv).padStart(2)} K ${k}  floret ${String(r.tris).padStart(6)} (petal ${String(rec.petal).padStart(4)}, ${rec.rows} rows)  chord root ${root.toFixed(4)} mid ${mid.toFixed(4)} apex ${apex.toFixed(4)} mm  arc rows ${arcRows}  bnd ${ec.boundary} nm ${ec.nonManifold} dir ${ec.directedMismatch} deg ${ec.degenerate} within ${cs.within}  -> ${rec.fit} fit`);
  }
}

/* ---- §2d: closed forms ---- */
console.log('\n§2d CLOSED FORMS (no build): the cup\'s across-row sagitta c*hb/(NV-1)^2 and the bead\'s facet sagitta r(1-cos(pi/2K))');
out.closed = [];
for (const nv of [10, 8, 6]) for (const [c, hb] of [[0.2, 9], [0.4, 9], [0.4, 4]]) {
  const s = (c * hb) / ((nv - 1) ** 2);
  out.closed.push({ kind: 'cup', nv, c, hb, sagittaMm: s });
  console.log(`  cup ${c} on half-width ${hb} mm, NV ${nv}: ${s.toFixed(4)} mm`);
}
for (const k of [4, 2]) { const r = S.RIM_BEAD_RADIUS_MM; const s = r * (1 - Math.cos(Math.PI / (2 * k))); out.closed.push({ kind: 'bead', k, r, sagittaMm: s }); console.log(`  bead r ${r} mm, K ${k}: ${s.toFixed(4)} mm`); }

/* ---- §2e: a lighter pedicel ---- */
console.log('\n§2e A LIGHTER PEDICEL (patched HUB_SECTORS; EXPORT; the 4-petal 20x8 floret on a 3 mm pedicel, flat end)');
out.pedicel = [];
for (const sectors of [48, 24, 16, 12]) {
  const G = await loadVariant({ sectors });
  const a = build(G, DEFAULTS, FLORET, { exportMode: true }), b = build(G, DEFAULTS, { ...FLORET, stemLength: 5, stemDiameter: 3, stemCut: 'FLAT' }, { exportMode: true });
  const ec = edgeCensus(b.acc.positions);
  out.pedicel.push({ sectors, sessile: a.tris, withPedicel: b.tris, pedicel: b.tris - a.tris, hub: a.tris - 4 * 3062, ...ec });
  console.log(`  HUB_SECTORS ${String(sectors).padStart(2)}  sessile ${a.tris} (hub ${a.tris - 4 * 3062})  with pedicel ${b.tris} (pedicel + join ${b.tris - a.tris})  bnd ${ec.boundary} dir ${ec.directedMismatch} deg ${ec.degenerate}  -> ${Math.floor(budget / b.tris)} fit`);
}

if (jsonArg > 0) fs.writeFileSync(process.argv[jsonArg + 1], JSON.stringify(out, null, 1));
