#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bone2b-measure.mjs — EVERY NUMBER ROUND 2 OF BONE v2
   QUOTES (docs/bloom-surface-texture-bone-v2.md §13-§19). Not a gate; an
   instrument. Node, the prototype on a PATCHED COPY of the shipped geometry;
   no shipped file is read for writing.

     node tools/bloom-texture-bone2b-measure.mjs [--section plate,petal,budget,depth,print]
       [--out docs/data/bloom-texture-bone-v2b.json]

   plate  — grid 0.1 vs rings vs HYBRID (and the two coarse builds) on a flat
            plate and a 6 mm cylinder, the merging field at H 1.0: triangles a
            mm2, roundness of FREE and MERGED pores (the drawn mid-wall against
            its circle over the outline each owns; a merged pore counts when it
            owns a quarter of its outline), and the SEAM error (each merged
            pair's lens sampled against the field, mm of relief).
   petal  — the same on a REAL PETAL: a 4.5 mm window on petal 0 of the
            default bloom (the most porous flat-ish spot), each mesh captured
            undisplaced with F at its vertices, each pore measured in its own
            tangent chart.
   budget — EXPORT counts against the 1.5 M budget, per state: v1, COARSE (the
            v2 field on the lattice: v1's count by construction), the HYBRID
            (the full build, counted exactly: b + 2i - 2 a lattice triangle)
            and the coarse-rings alternative.
   depth  — drawn depth / drawn diameter on the hybrid plate at H 1.0, 1.5, 2.5.
   print  — the default bloom, hybrid FULL, at H 0.4 and 2.5: the census
            (folds within shells, shells), open and doubled directed edges, the
            coincidence rule's withdrawals; and the walls on the field.
   Each section writes its block as soon as it closes.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2.js')).href);
const H2 = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-bone2-hybrid.js')).href);
const PL = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
/* imported (for `petalFocus` / `STATES`) it runs nothing */
const RUN = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const SECTIONS = RUN ? arg('--section', 'plate,petal,budget,depth,nib,print').split(',') : [];
const OUT = arg('--out', path.join(ROOT, 'docs/data/bloom-texture-bone-v2b.json'));
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(data, null, 1)); };
const BUDGET = 1500000;
const pct = (t) => +(100 * t / BUDGET).toFixed(1);
const r3 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? x : +x.toFixed(3));
const stat = (v) => { v = v.slice().sort((a, b) => a - b); return v.length ? { n: v.length, median: r3(v[Math.floor(v.length / 2)]), p90: r3(v[Math.floor(v.length * 0.9)]), max: r3(v[v.length - 1]) } : { n: 0 }; };
const KIND = Object.fromEntries(Object.entries(H2.HY_KIND).map(([k, v]) => [v, k]));

/* ----------------------------------------------------------- PLATE --- */
if (SECTIONS.includes('plate')) {
  const out = [];
  const params = B.bone2Params({ textureHeight: 1.0 });
  const field = B.bone2Field(params);
  for (const dom of [PL.plateDomain(), PL.cylinderDomain(6)]) {
    const win = { x0: 10, x1: 18, y0: -4, y1: 4 };
    const row = { domain: dom.name, H: params.H, methods: {} };
    for (const [m, method, o] of [['lattice (= coarse)', 'lattice', {}], ['grid 0.1', 'grid=', { edge: 0.1 * 1.0001 }], ['rings', 'rings', {}], ['HYBRID', 'hybrid', {}], ['coarse-rings', 'coarse', {}]]) {
      const opts = { ...o };
      const M = PL.meshPatch(method, dom, field, params, win, opts);
      const rr = PL.poreRoundness(M, dom, field, params, win, { minOwned: Math.PI / 2 });
      const se = PL.seamError(M, dom, field, params, win);
      const r = { trisPerMm2: Math.round(M.trisPerMm2), ms: Math.round(M.ms), free: stat(rr.filter((q) => !q.merged).map((q) => q.devPct)), merged: stat(rr.filter((q) => q.merged).map((q) => q.devPct)), edgesMedian: stat(rr.map((q) => q.edges)).median, seam: { lenses: se.lenses, maxMm: r3(se.maxMm), rmsMm: r3(se.rmsMm) } };
      if (opts.hybrid) { const st = opts.hybrid.stats; const k = {}; for (const q of opts.hybrid.kind) k[KIND[q]] = (k[KIND[q]] || 0) + 1; r.hybrid = { discs: st.discs, free: st.free, merged: st.merged, pairs: st.pairs, junctions: st.junctions, consFail: st.consFail, points: k }; }
      row.methods[m] = r;
      console.log(`plate ${dom.name} ${m.padEnd(19)} ${String(r.trisPerMm2).padStart(5)}/mm2  free ${r.free.median}% (n ${r.free.n})  merged ${r.merged.median}% p90 ${r.merged.p90}% (n ${r.merged.n})  seam max ${r.seam.maxMm} rms ${r.seam.rmsMm}`);
    }
    out.push(row);
  }
  data.plate = out; save();
}

/* ----------------------------------------------------------- PETAL --- */
/* the focus: petal 0's upward-facing point whose 2.6 mm neighbourhood is the
   most porous AND whose 4.5 mm window is the flattest (the sheet's own rule) */
export async function petalFocus() {
  const st0 = B.bone2State(DEFAULTS);
  const L = await B.bone2Bloom(st0, { mode: 'lattice' });
  const MO = new Float32Array(L.acc.triangleCount * 12 + 8);
  await B.bone2Bloom(st0, { mode: 'lattice', capability: { boneMaskOut: MO } });
  const pr0 = L.rec.petalsAll[0].triRange, pos = L.acc.positions, tris = [];
  const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  for (let t = pr0[0]; t < pr0[1]; t++) {
    const o = t * 9; let m = 1; for (let c = 0; c < 3; c++) { const q = (t * 3 + c) * 4; m = Math.min(m, MO[q] * MO[q + 1] * MO[q + 2]); }
    const u = [pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]], v = [pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]];
    tris.push({ m, n: norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]), c: [(pos[o] + pos[o + 3] + pos[o + 6]) / 3, (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3, (pos[o + 2] + pos[o + 5] + pos[o + 8]) / 3] });
  }
  let focus = null, best = -1;
  for (let i = 0; i < tris.length; i += 3) {
    const T0 = tris[i]; if (T0.n[2] < 0.5 || T0.m < 0.9) continue;
    let tot = 0, por = 0, win = 0, flat = 0;
    for (const q of tris) { const d = Math.hypot(q.c[0] - T0.c[0], q.c[1] - T0.c[1], q.c[2] - T0.c[2]); if (d <= 4.5) { win++; if (q.n[0] * T0.n[0] + q.n[1] * T0.n[1] + q.n[2] * T0.n[2] >= 0.9) flat++; } if (d > 2.6) continue; tot++; if (q.m > 0.5) por++; }
    const sc = tot && win ? (por / tot) * (flat / win) : 0;
    if (sc > best) { best = sc; focus = { centre: T0.c, normal: T0.n }; }
  }
  return { ...focus, score: best };
}
if (SECTIONS.includes('petal')) {
  const focus = await petalFocus();
  const H = 1.0, st = B.bone2State(DEFAULTS, { textureHeight: H });
  const params = B.bone2Params({ ...st, textureHeight: H }), field = B.bone2Field(params);
  const win = { centre: focus.centre, radiusMm: 3.0 };
  const cap = { organ: 'petal', centre: focus.centre, normal: focus.normal, radiusMm: 3.2 };
  const foc = { organ: 'petal', centre: focus.centre, normal: focus.normal, radiusMm: 4.5 };
  /* the discs: the field's own, cut by the petal's lattice (one owner for every mesh's measure) */
  const lat = await B.bone2Bloom(st, { mode: 'lattice', capture: cap });
  const LC = lat.stats.capture.lattice;
  const discs = H2.organDiscs(LC.P, LC.N, LC.tri, LC.porous.map(() => 1), field);
  const row = { focus: { centre: focus.centre.map(r3), normal: focus.normal.map(r3), score: r3(focus.score) }, H, windowMm: win.radiusMm, methods: {} };
  for (const [m, opt] of [['lattice (= coarse)', { mode: 'lattice' }], ['grid 0.1', { mode: 'grid', edgeMm: 0.1, focus: foc }], ['rings', { mode: 'rings', focus: { ...foc, layout: 'full' } }], ['HYBRID', { mode: 'hybrid', focus: foc }], ['coarse-rings', { mode: 'coarse-rings', focus: foc }]]) {
    const t0 = Date.now();
    const r = await B.bone2Bloom(st, { ...opt, capture: cap });
    const mesh = r.stats.capture.mesh;
    const S = PL.sheetMeasures(mesh, discs, field, params, win);
    /* triangles a mm2 over the window: the captured mesh's triangles whose three corners are within it, over their area */
    let area = 0, n = 0;
    for (let t = 0; t < mesh.tri.length; t += 3) { const q = [mesh.tri[t], mesh.tri[t + 1], mesh.tri[t + 2]].map((v) => [mesh.P[v * 3], mesh.P[v * 3 + 1], mesh.P[v * 3 + 2]]); if (q.some((x) => Math.hypot(x[0] - win.centre[0], x[1] - win.centre[1], x[2] - win.centre[2]) > win.radiusMm)) continue; n++; const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], v = [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]]; area += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2; }
    const res = { trisPerMm2: Math.round(n / area), free: stat(S.pores.filter((q) => !q.merged).map((q) => q.devPct)), merged: stat(S.pores.filter((q) => q.merged).map((q) => q.devPct)), edgesMedian: stat(S.pores.map((q) => q.edges)).median, seam: { lenses: S.seam.lenses, maxMm: r3(S.seam.maxMm), rmsMm: r3(S.seam.rmsMm) }, ms: Date.now() - t0 };
    row.methods[m] = res;
    console.log(`petal ${m.padEnd(19)} ${String(res.trisPerMm2).padStart(5)}/mm2  free ${res.free.median}% (n ${res.free.n})  merged ${res.merged.median}% p90 ${res.merged.p90}% (n ${res.merged.n})  seam max ${res.seam.maxMm} rms ${res.seam.rmsMm}`);
  }
  data.petal = row; save();
}

/* ---------------------------------------------------------- BUDGET --- */
export const STATES = [
  ['the default', {}],
  ['whole bloom (60 mm stem, a leaf, 5 sepals, 12 stamens, the style)', { stemLength: 60, leafLength: 30, sepalCount: 5, stamenCount: 12, gynoecium: 'STYLE' }],
  ['umbel, head ON', { inflorescence: 'UMBEL', umbelHead: 'ON', stemLength: 60 }],
  ['the mophead (depth 2)', { inflorescence: 'UMBEL', umbelDepth: '2', stemLength: 120, umbelFlorets: 12, floretPetals: 4, floretScale: 0.2, pedicelLength: 12, pedicelAngle: 20, petalTipShape: 2, petalCup: 0.2, petalTilt: 15 }],
  ['40 x 3 whorls', { petalCount: 40, layerCount: 3 }],
];
if (SECTIONS.includes('budget')) {
  const rows = data.budget || [];
  const only = arg('--states', null);
  for (const [name, o] of STATES) {
    if (only && !only.split(',').some((k) => name.includes(k))) continue;
    const t1 = Date.now();
    const v1 = await B.bone2Bloom({ ...DEFAULTS, petalTexture: 'BONE', ...o }, { mode: 'v1' });
    const v1ms = Date.now() - t1;
    const t2 = Date.now();
    const co = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'coarse' });
    const cms = Date.now() - t2;
    const t3 = Date.now();
    const hy = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'hybrid-count' });
    const hms = Date.now() - t3;
    const cr = await B.bone2Bloom(B.bone2State(DEFAULTS, o), { mode: 'coarse-rings-count' });
    const H = hy.stats.hybrid;
    const row = { name, v1Tris: v1.acc.triangleCount, v1Pct: pct(v1.acc.triangleCount), v1EdgeMm: v1.rec.texture && v1.rec.texture.edgeMm, v1Ms: v1ms,
      coarseTris: co.acc.triangleCount, coarsePct: pct(co.acc.triangleCount), coarseMs: cms, coarseEdgeMm: co.rec.texture && co.rec.texture.edgeMm,
      hybridTris: H.count, hybridPct: pct(H.count), hybridCountMs: hms, discs: H.discs, free: H.free, merged: H.merged, pairs: H.pairs, junctions: H.junctions, points: Object.fromEntries(Object.entries(H.kinds).map(([k, v]) => [KIND[k] || k, v])),
      coarseRingsTris: cr.stats.hybrid.count, coarseRingsPct: pct(cr.stats.hybrid.count) };
    const at = rows.findIndex((q) => q.name === name); if (at >= 0) rows[at] = row; else rows.push(row);
    console.log(`budget ${name}: v1 ${row.v1Tris} (${row.v1Pct}%) | coarse ${row.coarseTris} (${row.coarsePct}%) | HYBRID ${row.hybridTris} (${row.hybridPct}%) | coarse-rings ${row.coarseRingsTris} (${row.coarseRingsPct}%) | discs ${row.discs} (free ${row.free}, merged ${row.merged}) pairs ${row.pairs} junctions ${row.junctions}`);
    data.budget = rows; save();
  }
}

/* ----------------------------------------------------------- DEPTH --- */
if (SECTIONS.includes('depth')) {
  const out = [];
  for (const H of [0.4, 1.0, 1.5, 2.5]) {
    const params = B.bone2Params({ textureHeight: H }), field = B.bone2Field(params), dom = PL.plateDomain();
    const win = { x0: 10, x1: 20, y0: -5, y1: 5 };
    const M = PL.meshPatch('hybrid', dom, field, params, win, {});
    const rr = PL.poreRoundness(M, dom, field, params, win, { minOwned: Math.PI / 2 });
    const dd = stat(rr.map((q) => q.depthMm / q.diameterMm));
    const big = rr.filter((q) => q.D >= 1.4).map((q) => q.depthMm / q.diameterMm), small = rr.filter((q) => q.D <= 0.7).map((q) => q.depthMm / q.diameterMm);
    out.push({ H, depthOverDiameter: dd, smallestPores: stat(small), largestPores: stat(big) });
    console.log(`depth H ${H}: depth/diameter median ${dd.median} (range ${stat(rr.map((q) => q.depthMm / q.diameterMm)).max}), small pores ${stat(small).median}, large ${stat(big).median}`);
  }
  data.depth = out; save();
}

/* ------------------------------------------------------------- NIB --- */
/* petal 0's apex: every vertex of the build within 1.2 mm of it (the lattice's
   and the hybrid's own), and how far each is RAISED — curvature decides (ruling
   5), no nib mask; v2's 6 mm patches put relief this close to the tips */
export async function petalApex(st) {
  const off = await B.bone2Bloom(st, { mode: 'lattice', capability: { organReliefOff: true } });
  const pr = off.rec.petalsAll[0].triRange, P0 = off.acc.positions;
  let apex = null, best = -Infinity;
  for (let i = pr[0] * 9; i < pr[1] * 9; i += 3) { const r = Math.hypot(P0[i], P0[i + 1]); if (r > best) { best = r; apex = [P0[i], P0[i + 1], P0[i + 2]]; } }
  return apex;
}
if (SECTIONS.includes('nib')) {
  const out = [];
  for (const H of [0.4, 2.5]) {
    const st = B.bone2State(DEFAULTS, { textureHeight: H });
    const apex = await petalApex(st);
    const row = { H, apex: apex.map(r3) };
    for (const [m, opt] of [['coarse', { mode: 'coarse' }], ['hybrid', { mode: 'hybrid', focus: { organ: 'petal', centre: apex, normal: [0, 0, 1], radiusMm: 2.5 } }]]) {
      const cap = { organ: 'petal', centre: apex, normal: [0, 0, 1], radiusMm: 1.2 };
      /* the capture's plan must face the apex's own normal: try both skins */
      let r = null;
      for (const nz of [[0, 0, 1], [0, 0, -1]]) { r = await B.bone2Bloom(st, { ...opt, ...(opt.focus ? { focus: { ...opt.focus, normal: nz } } : {}), capture: { ...cap, normal: nz } }); if (r.stats.capture.mesh) break; }
      const M = r.stats.capture.mesh;
      let n = 0, raised = 0, tail = 0, mx = 0, nearest = Infinity;
      for (let v = 0; v < M.P.length / 3; v++) {
        const d = Math.hypot(M.P[v * 3] - apex[0], M.P[v * 3 + 1] - apex[1], M.P[v * 3 + 2] - apex[2]), s = M.relief[v] || 0;
        if (d > 1.2) continue;
        n++; if (s > 0.05) { raised++; nearest = Math.min(nearest, d); } else if (s > 1e-9) tail++;
        mx = Math.max(mx, s);
      }
      row[m] = { verticesWithin1_2mm: n, raisedOver005: raised, tailUnder005: tail, maxMm: r3(mx), nearestRaisedToApexMm: r3(nearest), fadeMm: r3(Math.max((H * 15) / 8, 0.4)) };
      console.log(`nib H ${H} ${m}: ${JSON.stringify(row[m])}`);
    }
    out.push(row);
  }
  data.nib = out; save();
}

/* ----------------------------------------------------------- PRINT --- */
/* every 41st triangle of a sheet organ (prime, so no lattice period aliases it): about 10^4 vertices near another part, round 1's own sample size */
const GAP_STRIDE = 41;
if (SECTIONS.includes('print')) {
  const { census } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-self-intersection.mjs')).href);
  const out = data.print || [];
  for (const H of (arg('--heights', '0.4,2.5')).split(',').map(Number)) {
    const tp = Date.now(), lg = (m) => console.log(`print H ${H} … ${m} (${((Date.now() - tp) / 1000).toFixed(0)} s)`);
    const r = await B.bone2Bloom(B.bone2State(DEFAULTS, { textureHeight: H }), { mode: 'hybrid' });
    lg(`built ${r.acc.triangleCount}`);
    const c = census(new Float64Array(r.acc.positions));
    lg('census');
    const pos = r.acc.positions, key = (i) => `${Math.fround(pos[i])},${Math.fround(pos[i + 1])},${Math.fround(pos[i + 2])}`;
    const em = new Map();
    for (let t = 0; t < pos.length; t += 9) { const k = [key(t), key(t + 3), key(t + 6)]; for (let q = 0; q < 3; q++) { const e = k[q] + '>' + k[(q + 1) % 3]; em.set(e, (em.get(e) || 0) + 1); } }
    let open = 0, dup = 0; for (const [e, n] of em) { const [a, b] = e.split('>'); if (!em.has(b + '>' + a)) open++; if (n > 1) dup++; }
    const row = { H, tris: r.acc.triangleCount, withinPairs: c.within, worstSpanMm: r3(c.worstSpanMm), crossPairs: c.cross, shells: c.shells, openDirected: open, doubledDirected: dup, withdrawn: r.stats.coincidentWithdrawn, consFail: r.stats.hybrid.consFail };
    { const at = out.findIndex((q) => q.H === H); if (at >= 0) out[at] = { ...row }; else out.push({ ...row }); data.print = out; save(); lg('census saved'); }
    /* printable gaps newly closed between PARTS: the same mesh built with nothing raised (noRelief), paired vertex
       for vertex; every relieved vertex of a sheet organ (every GAP_STRIDE-th triangle) against every OTHER range's triangles */
    {
      const { triGrid, nearest } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-inflo-approach.mjs')).href);
      const u = await B.bone2Bloom(B.bone2State(DEFAULTS, { textureHeight: H }), { mode: 'hybrid', noRelief: true });
      const same = u.acc.triangleCount === r.acc.triangleCount; lg(`twin built, same mesh ${same}`);
      const owners = (rs, tc) => { const o = []; let cur = 0; rs.forEach((q, k) => { if (q.from > cur) o.push({ lo: cur * 9, hi: q.from * 9, owner: 'rest' + k }); o.push({ lo: q.from * 9, hi: q.to * 9, owner: q.organ + '#' + k }); cur = q.to; }); if (cur < tc) o.push({ lo: cur * 9, hi: tc * 9, owner: 'tail' }); return o; };
      const oU = owners(r.stats.ranges, u.acc.triangleCount), gU = triGrid(u.acc.positions, oU), gT = triGrid(r.acc.positions, oU);
      let n = 0, closed = 0, touch = 0, minT = Infinity, minU = Infinity;
      if (same) r.stats.ranges.forEach((q, k) => {
        if (!/petal|sepal|leaf|floret/.test(q.organ)) return;
        const me = q.organ + '#' + k;
        for (let t = q.from; t < q.to; t += GAP_STRIDE) for (let cc = 0; cc < 3; cc++) {
          const o = t * 9 + cc * 3, P0 = u.acc.positions, P1 = r.acc.positions;
          const pu = [P0[o], P0[o + 1], P0[o + 2]], pt = [P1[o], P1[o + 1], P1[o + 2]];
          if (pu[0] === pt[0] && pu[1] === pt[1] && pu[2] === pt[2]) continue;
          /* a gap that closes under 1 mm was under 1 + H before the relief (a vertex moves at most H), so that is the reach */
          const R = 1 + H + 0.01, dU = nearest(gU, pu, me, R);
          if (!(dU < R)) continue;
          const dT = nearest(gT, pt, me, R);
          n++; if (dT < minT) minT = dT; if (dU < minU) minU = dU; if (n % 50000 === 0) lg(`gaps: ${n} near vertices so far`);
          if (dU >= 1.0 && dT < 1.0) closed++;
          if (dU > 1e-6 && dT <= 1e-6) touch++;
        }
      });
      row.gaps = { sameMesh: same, everyNthTriangle: GAP_STRIDE, sampledRelievedVerticesWithin1PlusHOfAnotherPart: n, newlyClosedPrintableGaps: closed, newlyTouching: touch, nearestUnraisedMm: r3(minU), nearestRaisedMm: r3(minT) };
    }
    const at = out.findIndex((q) => q.H === H); if (at >= 0) out[at] = row; else out.push(row);
    console.log(`print H ${H}: ${JSON.stringify(row)}`);
    data.print = out; save();
  }
  /* the walls, on the field (the mesh does not change them) */
  const params = B.bone2Params({ textureHeight: 1.0 }), field = B.bone2Field(params);
  data.walls = PL.wallThickness(PL.plateDomain(), field, params, { x0: 10, x1: 20, y0: -5, y1: 5 });
  console.log('walls (merging, on the field):', JSON.stringify(data.walls));
  save();
}
if (RUN) console.log(`wrote ${OUT}`);
