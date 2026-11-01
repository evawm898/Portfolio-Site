#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone2-measure.mjs — EVERY NUMBER THE BONE v2 DOC QUOTES
   (docs/bloom-surface-texture-bone-v2.md). Not a gate; an instrument. Node,
   EXPORT, the prototype (bloom-texture-bone2.js) on a PATCHED COPY of the
   shipped geometry; no shipped file is read for writing.

     node tools/bloom-texture-bone2-measure.mjs [--section plate,round,bloom,print]
       [--out docs/data/bloom-texture-bone-v2.json] [--quick]

   plate — the meshing comparison on a flat plate and a 6 mm cylinder patch at
           the default and the extremes: triangles and build time per mm2,
           pore roundness (edges per circumference, the drawn mid-wall's
           largest radial deviation from its circle), drawn depth / diameter,
           and the thinnest wall between adjacent pores (on the field).
   round — the smallest pore that READS ROUND (median deviation <= 5% of the
           radius) per mesh, on a sweep of pore sizes.
   bloom — the budget: per state, the shipped (v1) count, the porous area,
           the derived grid's EXACT count (counted by the bisection on lengths,
           never built), the grid at 0.1 and 0.05 mm, and the rings ESTIMATED
           (the porous area x the plate's measured density — the rings run on
           charted patches only, §6 of the doc). Node build times.
   print — on the default bloom at 0.4 and 2.5 mm: the within-shell census
           (folds) on the grid at 0.1 mm, the bead and the nib (relieved
           corners near the apex), and printable gaps newly closed between
           parts (sampled).
   Each section writes its block of the JSON as soon as it closes (a section
   is a chunk; rerun one with --section).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2.js')).href);
const PL = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SECTIONS = arg('--section', 'plate,round,bloom,print').split(',');
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2.json'));
const QUICK = args.includes('--quick');
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1)); };
const BUDGET = 1500000;
const pct = (t) => +(100 * t / BUDGET).toFixed(1);
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? x : +x.toFixed(3));

/* ----------------------------------------------------------- PLATE --- */
function plateRow(dom, params, sizeMm = 10) {
  const field = B.bone2Field(params);
  const win = { x0: 10, x1: 10 + sizeMm, y0: -sizeMm / 2, y1: sizeMm / 2 };
  const rings = PL.meshPatch('rings', dom, field, params, win);
  const lean = PL.meshPatch('rings', dom, field, params, win, { layout: 'lean' });
  const grid = PL.meshPatch('grid', dom, field, params, win);
  const g01 = PL.meshPatch('grid=', dom, field, params, win, { edge: 0.1 * 1.0001 });
  const lat = PL.meshPatch('lattice', dom, field, params, win);
  const row = { domain: dom.name, params, gridEdgeMm: r3(B.bone2GridEdgeMm(params)), poresPerMm2: r3(rings.ringPores / ((win.x1 - win.x0 + 2 * params.Dmax * 1.3) * (win.y1 - win.y0 + 2 * params.Dmax * 1.3))), wall: PL.wallThickness(dom, field, params, win), methods: {} };
  for (const [m, M] of [['lattice', lat], ['grid', grid], ['grid0.1', g01], ['rings', rings], ['rings-lean', lean]]) {
    const rr = PL.poreRoundness(M, dom, field, params, win);
    const med = (k) => { const v = rr.map((q) => q[k]).filter((x) => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const mx = (k) => { const v = rr.map((q) => q[k]).filter((x) => x !== null); return v.length ? Math.max(...v) : null; };
    const dd = rr.map((q) => q.depthMm / q.diameterMm).sort((a, b) => a - b);
    row.methods[m] = { trisPerMm2: r3(M.trisPerMm2), msPerMm2: r3(M.msPerMm2), edgeMm: M.eUsed === null ? 0.4 : r3(M.eUsed), poresMeasured: rr.length, edgesPerCircMedian: med('edges'), devPctMedian: r3(med('devPct')), devPctMax: r3(mx('devPct')), devMmMax: r3(mx('devMm')), depthOverDiamMedian: dd.length ? r3(dd[Math.floor(dd.length / 2)]) : null, depthOverDiamRange: dd.length ? [r3(dd[0]), r3(dd[dd.length - 1])] : null, depthMmMedian: r3(med('depthMm')) };
  }
  return row;
}
if (SECTIONS.includes('plate')) {
  const rows = [];
  const cases = QUICK ? [[0.5, 3, 0.4, 'overlap'], [0.5, 3, 0.4, 'hardcore']] : [[0.5, 3, 0.4, 'overlap'], [0.5, 3, 1.0, 'overlap'], [0.5, 3, 2.5, 'overlap'], [1.0, 3, 0.4, 'overlap'], [1.0, 3, 2.5, 'overlap'], [0.5, 1.5, 0.4, 'overlap'], [0.5, 1.5, 2.5, 'overlap'], [0.5, 3, 0.4, 'hardcore'], [0.5, 3, 2.5, 'hardcore'], [1.0, 3, 0.4, 'hardcore']];
  for (const dom of [PL.plateDomain(), PL.cylinderDomain(6)]) for (const [D, sp, H, packing] of cases) {
    if (dom.name !== 'plate' && !(D === 0.5 && sp === 3 && H !== 1.0)) continue;   // the cylinder at the default spread only
    const params = { ...B.bone2Params({ bonePoreSize: D, boneBandRatio: sp, textureHeight: H }), packing };
    const t0 = Date.now();
    const row = plateRow(dom, params);
    rows.push(row);
    console.log(`plate ${dom.name} ${packing} D ${D} x${sp} H ${H} (${Date.now() - t0} ms): pores/mm2 ${row.poresPerMm2}; wall thinnest ${r3(row.wall.thinnestMm)} p10 ${r3(row.wall.p10Mm)} median ${r3(row.wall.medianMm)} (${row.wall.merged}/${row.wall.pairs} merged)`);
    for (const [m, v] of Object.entries(row.methods)) console.log(`   ${m.padEnd(11)} ${String(v.trisPerMm2).padStart(9)}/mm2 ${String(v.msPerMm2).padStart(7)} ms/mm2  edge ${v.edgeMm}  n ${v.poresMeasured}  edges/circ ${v.edgesPerCircMedian}  dev ${v.devPctMedian}% (max ${v.devPctMax}%, ${v.devMmMax} mm)  depth/diam ${v.depthOverDiamMedian} ${JSON.stringify(v.depthOverDiamRange)}`);
  }
  data.plate = rows; save();
}

/* ----------------------------------------------------------- ROUND --- */
if (SECTIONS.includes('round')) {
  const dom = PL.plateDomain();
  const out = {};
  const PK = arg('--packing', 'hardcore');
  const sweep = { lattice: [0.5, 1, 1.5, 2, 2.5, 3, 4], 'grid0.1': [0.5, 0.75, 1, 1.5, 2], rings: [0.5, 0.75, 1, 1.5], 'rings-lean': [0.5, 0.75, 1, 1.5] };
  for (const [m, Ds] of Object.entries(sweep)) {
    out[m] = [];
    for (const D of Ds) {
      /* a narrow spread (1.5) so the size under test is the size drawn; the
         clamp is bypassed on purpose — a sweep past the slider's range */
      const params = { D, spread: 1.5, Dmax: 1.5 * D, H: 1.0, density: 0.9, packing: PK };
      const field = B.bone2Field(params);
      const size = Math.max(10, 7 * D);
      const win = { x0: 10, x1: 10 + size, y0: -size / 2, y1: size / 2 };
      const M = m === 'lattice' ? PL.meshPatch('lattice', dom, field, params, win) : m === 'grid0.1' ? PL.meshPatch('grid=', dom, field, params, win, { edge: 0.1 * 1.0001 }) : PL.meshPatch('rings', dom, field, params, win, { layout: m === 'rings' ? 'full' : 'lean' });
      const rr = PL.poreRoundness(M, dom, field, params, win);
      const v = rr.map((q) => q.devPct).sort((a, b) => a - b);
      const med = v.length ? v[Math.floor(v.length / 2)] : null;
      out[m].push({ D, poresMeasured: rr.length, devPctMedian: r3(med), readsRound: med !== null && med <= 5 });
    }
    const first = out[m].find((q) => q.readsRound);
    console.log(`round ${m.padEnd(11)} ${out[m].map((q) => `${q.D}:${q.devPctMedian}%`).join('  ')}  -> smallest that reads round: ${first ? first.D : 'none in the sweep'}`);
  }
  data.round = out; save();
}

/* ----------------------------------------------------------- BLOOM --- */
export const STATES = [
  ['the default', {}],
  ['whole bloom (60 mm stem, a leaf, 5 sepals, 12 stamens, the style)', { stemLength: 60, leafLength: 30, sepalCount: 5, stamenCount: 12, gynoecium: 'STYLE' }],
  ['Voronoi infill (texture refused)', { petalInfill: 'VORONOI' }],
  ['closed tube', { tubeLayer1: 0 }],
  ['umbel, head ON', { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 }],
  ['40 x 3 whorls', { petalCount: 40, layerCount: 3 }],
  ['the mophead (depth 2)', { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 }],
];
if (SECTIONS.includes('bloom')) {
  const densOf = (pk) => (data.plate || []).find((r) => r.domain === 'plate' && r.params.D === 0.5 && r.params.spread === 3 && r.params.H === 0.4 && r.params.packing === pk);
  if (!densOf('overlap') || !densOf('hardcore')) throw new Error('bloom: run --section plate first (the rings estimate is the plate density)');
  const ringsD = densOf('overlap').methods.rings.trisPerMm2, leanD = densOf('overlap').methods['rings-lean'].trisPerMm2, ringsHD = densOf('hardcore').methods.rings.trisPerMm2;
  const rows = [];
  for (const [name, o] of (QUICK ? STATES.slice(0, 1) : STATES)) {
    const t1 = Date.now();
    const v1 = await B.bone2Bloom({ ...DEFAULTS, petalTexture: 'BONE', ...o }, { mode: 'v1' });
    const v1ms = Date.now() - t1, v1tris = v1.acc.triangleCount, v1edge = v1.rec.texture && v1.rec.texture.edgeMm;
    const t2 = Date.now();
    const c = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'count', countEdges: [0.1, 0.05] });
    const cms = Date.now() - t2;
    const organs = c.stats.organs || {};
    let porousArea = 0, porousTris = 0, derived = 0, area = 0;
    for (const v of Object.values(organs)) { porousArea += v.porousAreaMm2; porousTris += v.porousTris; derived += v.derivedGridTris; area += v.areaMm2; }
    const base = c.acc.triangleCount;
    const at = c.stats.countAt || {};
    const row = { name, v1Tris: v1tris, v1Pct: pct(v1tris), v1EdgeMm: v1edge, v1Ms: v1ms, baseTris: base, edgeMm: c.rec.texture && c.rec.texture.edgeMm, refused: c.rec.texture && c.rec.texture.refused, countMs: cms, areaMm2: r3(area), porousAreaMm2: r3(porousArea), porousTris,
      derivedGridEdgeMm: r3(c.stats.edgeDerivedMm), derivedGridTris: base + derived, derivedGridPct: pct(base + derived),
      grid01Tris: base + (at[0.1] || 0), grid01Pct: pct(base + (at[0.1] || 0)), grid005Tris: base + (at[0.05] || 0), grid005Pct: pct(base + (at[0.05] || 0)),
      ringsEstTris: Math.round(base - porousTris + porousArea * ringsD), ringsLeanEstTris: Math.round(base - porousTris + porousArea * leanD), ringsHardcoreEstTris: Math.round(base - porousTris + porousArea * ringsHD) };
    row.ringsEstPct = pct(row.ringsEstTris); row.ringsLeanEstPct = pct(row.ringsLeanEstTris); row.ringsHardcoreEstPct = pct(row.ringsHardcoreEstTris);
    rows.push(row);
    console.log(`bloom ${name}: v1 ${v1tris} (${row.v1Pct}%, edge ${v1edge}, ${v1ms} ms) | v2 base ${base} edge ${row.edgeMm}${row.refused ? ' REFUSED ' + row.refused : ''} porous ${row.porousAreaMm2} of ${row.areaMm2} mm2 (${porousTris} tris) | grid derived ${row.derivedGridEdgeMm} mm: ${row.derivedGridTris} (${row.derivedGridPct}%) | grid 0.1: ${row.grid01Tris} (${row.grid01Pct}%) | grid 0.05: ${row.grid005Tris} (${row.grid005Pct}%) | rings est ${row.ringsEstTris} (${row.ringsEstPct}%) lean ${row.ringsLeanEstTris} (${row.ringsLeanEstPct}%) hard-core ${row.ringsHardcoreEstTris} (${row.ringsHardcoreEstPct}%)`);
    data.bloom = rows; save();
  }
  /* the grid at 0.1 BUILT on the default, the cross-check of the count, and its time */
  const t3 = Date.now();
  const g = await B.bone2Bloom(B.bone2State(DEFAULTS), { mode: 'grid', edgeMm: 0.1 });
  data.bloomGridBuilt = { state: 'the default', edgeMm: 0.1, tris: g.acc.triangleCount, ms: Date.now() - t3, passMs: r3(g.stats.passMs), countSays: rows[0].grid01Tris };
  console.log(`bloom: the default BUILT at 0.1 mm: ${g.acc.triangleCount} tris in ${Date.now() - t3} ms (the count said ${rows[0].grid01Tris})`);
  save();
}

/* ----------------------------------------------------------- PRINT --- */
if (SECTIONS.includes('print')) {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
  const { triGrid, nearest } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-inflo-approach.mjs')).href);
  const out = [];
  for (const H of [0.4, 2.5]) {
    const row = { H };
    /* folds: the census within shells, v1 / v2 lattice / v2 grid 0.1 */
    for (const [m, st, opt] of [['v1', { ...DEFAULTS, petalTexture: 'BONE', textureHeight: Math.min(H, 1.5) }, { mode: 'v1' }], ['v2-lattice', B.bone2State(DEFAULTS, { textureHeight: H }), { mode: 'lattice' }], ['v2-grid0.1', B.bone2State(DEFAULTS, { textureHeight: H }), { mode: 'grid', edgeMm: 0.1 }]]) {
      const r = await B.bone2Bloom(st, opt);
      const t0 = Date.now();
      const c = census(new Float64Array(r.acc.positions));
      row[m] = { tris: r.acc.triangleCount, withinPairs: c.within, crossPairs: c.cross, worstSpanMm: r3(c.worstSpanMm), shells: c.shells, censusMs: Date.now() - t0 };
      console.log(`print H ${H} ${m}: ${r.acc.triangleCount} tris, census ${JSON.stringify(row[m])}`);
    }
    /* the bead and the nib: corners near the apex of petal 0, relieved or not */
    const st = B.bone2State(DEFAULTS, { textureHeight: H });
    const off = await B.bone2Bloom(st, { mode: 'lattice', capability: { organReliefOff: true } });
    const on = await B.bone2Bloom(st, { mode: 'lattice' });
    const pr = off.rec.petalsAll[0].triRange;
    let apex = null, best = -Infinity;
    for (let i = pr[0] * 9; i < pr[1] * 9; i += 3) { const r = Math.hypot(off.acc.positions[i], off.acc.positions[i + 1]); if (r > best) { best = r; apex = [off.acc.positions[i], off.acc.positions[i + 1], off.acc.positions[i + 2]]; } }
    let nibN = 0, nibRaised = 0, nibMax = 0, nearestRaisedToApex = Infinity;
    for (let i = pr[0] * 9; i < pr[1] * 9; i += 3) {
      const d = Math.hypot(off.acc.positions[i] - apex[0], off.acc.positions[i + 1] - apex[1], off.acc.positions[i + 2] - apex[2]);
      const m = Math.hypot(on.acc.positions[i] - off.acc.positions[i], on.acc.positions[i + 1] - off.acc.positions[i + 1], on.acc.positions[i + 2] - off.acc.positions[i + 2]);
      if (m > 1e-9 && d < nearestRaisedToApex) nearestRaisedToApex = d;
      if (d > 1.2) continue;
      nibN++; if (m > 1e-9) nibRaised++; if (m > nibMax) nibMax = m;
    }
    row.nib = { cornersWithin1_2mm: nibN, raised: nibRaised, maxMm: r3(nibMax), nearestRaisedToApexMm: r3(nearestRaisedToApex), fadeMm: r3(Math.max((H * 15) / 8, 0.4)) };
    console.log(`print H ${H} nib: ${JSON.stringify(row.nib)}`);
    /* printable gaps newly closed between PARTS: every relieved petal vertex
       (sampled) against every other part's triangles, untextured -> textured */
    const owners = (b, tc) => { const rs = []; (b.petalsAll || []).forEach((p, k) => { if (p && p.triRange) rs.push({ lo: p.triRange[0] * 9, hi: p.triRange[1] * 9, owner: `petal${k}` }); }); rs.push({ lo: (b.petalsAll || []).reduce((m, p) => Math.max(m, p && p.triRange ? p.triRange[1] : 0), 0) * 9, hi: tc * 9, owner: 'rest' }); return rs; };
    const gU = triGrid(off.acc.positions, owners(off.rec, off.acc.triangleCount)), gT = triGrid(on.acc.positions, owners(on.rec, on.acc.triangleCount));
    let n = 0, closed = 0, touch = 0, minT = Infinity;
    (on.rec.petalsAll || []).forEach((p, k) => {
      if (!p || !p.triRange) return;
      for (let t = p.triRange[0]; t < p.triRange[1]; t += 3) for (let cc = 0; cc < 3; cc++) {
        const o = t * 9 + cc * 3;
        const pu = [off.acc.positions[o], off.acc.positions[o + 1], off.acc.positions[o + 2]], pt = [on.acc.positions[o], on.acc.positions[o + 1], on.acc.positions[o + 2]];
        if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;
        const dU = nearest(gU, pu, `petal${k}`, 4), dT = nearest(gT, pt, `petal${k}`, 4);
        if (!(dU < 4)) continue;
        n++; if (dT < minT) minT = dT;
        if (dU >= 1.0 && dT < 1.0) closed++;
        if (dU > 1e-6 && dT <= 1e-6) touch++;
      }
    });
    row.gaps = { sampledRelievedVerticesNearAnotherPart: n, newlyClosedPrintableGaps: closed, newlyTouching: touch, nearestTexturedMm: r3(minT) };
    console.log(`print H ${H} gaps (lattice vertices, every 3rd triangle): ${JSON.stringify(row.gaps)}`);
    out.push(row);
    data.print = out; save();
  }
}
console.log(`wrote ${OUT}`);
