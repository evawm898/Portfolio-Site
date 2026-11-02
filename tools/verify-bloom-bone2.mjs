#!/usr/bin/env node
/* ===================================================================
   verify-bloom-bone2.mjs — THE B2 FAMILY: BONE v2's claims, on the
   PROTOTYPE (bloom-texture-bone2.js). Read docs/bloom-surface-texture-
   bone-v2.md §7. Not in CI: the prototype is not shipped, and these
   clauses are the ones a shipping session ports into TXB (the doc says
   where each lands).

     node tools/verify-bloom-bone2.mjs [--control] [--only <mutant,...>]

   B2a  OUTWARD ONLY, FLOORS ON THE SHEET. The field is never below 0 at any
        emitted vertex (plate meshes AND a whole-bloom grid build), and the
        deepest point of every fully admitted pore reaches exactly 0: a plain
        pore's centre, a shelved pore's nested pit centres. The restatement
        here reads the pores off the module's list and evaluates the field at
        their centres — the reference is the pore list's geometry, the
        quantity the field's value.
   B2b  REFINEMENT ONLY WHERE THE MASKS ARE > 0. On the default bloom, the
        v2 field on the shipped lattice is built with the masks read out per
        corner (the shipped `boneMaskOut` channel); every lattice triangle
        whose own corners AND every corner of every triangle sharing one of
        its vertices are mask 0 must reappear VERBATIM (its nine floats) in
        the grid build. A refinement that leaked into a smooth area replaces
        exactly those.
   B2c  THE PORE EDGE IS DERIVED. The gate restates the cup and the lip's
        smooth minimum from the constants and bisects the lip's 20-80% width
        itself; the grid's edge must be half of it at the smallest pore, and
        it must halve when the smallest pore halves. And the grid build's
        refined triangles (those not in the lattice) have no edge longer than
        it, measured on the output.
   B2d  PORES ARE ROUND. On the plate, the rings' drawn mid-wall outline is
        within 5% of its circle (median over the isolated pores) with at least
        24 segments a circumference; the derived grid within 5% too.
   ROUND 2 (the HYBRID mesher, bloom-texture-bone2-hybrid.js; the doc's §17):
   B2d  also: the hybrid on the MERGING plate — free and merged pores alike
        within 5% of their circle (median), with at least 24 segments.
   B2e  THE HYBRID'S FOUR CLAIMS. The gate RESTATES the merged pairs from the
        discs (two outer rings overlapping), each pair's crease (equal
        normalised radius, as a length), its derived edge h (half the lip's
        drawn width at the smaller pore, from the restated profile) and every
        triple junction (equal radii, solved here), and reads the emitted
        point kinds against them:
        B2e1 NO REGULAR GRID IN A PATCH INTERIOR: every fine point (seam,
             seam crossing, junction) lies within one h of a restated crease or
             within (HY_JUNCTION_H + 0.5) h of a restated junction;
        B2e2 SEAMS ONLY WHERE PORES MERGE: every fine point lies inside a
             restated merged lens (two outer discs, plus one h), and no free
             pore's outer disc holds one;
        B2e3 ZERO OPEN EDGES: on a bloom window the emitted file's directed
             edges (float32 keys) are every one matched by its reverse, none
             doubled; and the exact count (b + 2i - 2) is the built count;
        B2e4 NO CROSS-PART COINCIDENT VERTEX: no new vertex of one organ shares
             a float32 key with any vertex of another — on the bloom window,
             and on a PLANTED fixture (a second organ given a vertex exactly on
             one the hybrid emits), where the rule must withdraw (>= 1) and
             leave none.
   B2f  COARSE AND FULL ARE THE SAME PORES: on the bloom window the coarse
        build's disc list and the full build's are the same pores at the same
        centres, to the bit.
   --control runs ten mutants of COPIES of the two modules (written beside
   them, removed after), each with a WITNESS — a direct call on the mutated
   module proving the behaviour moved, run before any clause is consulted:
     refinement-leaks-into-smooth-areas        -> B2b
     a-pore-floor-below-the-sheet              -> B2a
     a-typed-refinement-edge                   -> B2c
     pores-revert-to-grid-aligned              -> B2d
     merged-rings-are-clipped-away             -> B2d   (hybrid)
     the-junction-patch-covers-the-pores       -> B2e1  (hybrid)
     seam-rows-run-outside-the-lens            -> B2e2  (hybrid)
     a-transition-fan-ignores-its-edge-points  -> B2e3  (hybrid)
     the-weld-withdrawal-is-removed            -> B2e4
     the-coarse-build-moves-the-pores          -> B2f
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOD = path.join(ROOT, 'bloom-texture-bone2.js');
const HYB = path.join(ROOT, 'bloom-texture-bone2-hybrid.js');
const MEASURE = path.join(ROOT, 'tools/bloom-texture-bone2b-measure.mjs');
const PLATE = path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs');
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const args = process.argv.slice(2);
const CONTROL = args.includes('--control');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

/* ---------------------------------------------------- the restatements */
const RS = {
  smin(a, b, k) { const m = a < b ? a : b; const h = k - Math.abs(a - b); return h > 0 ? m - (h * h) / (4 * k) : m; },
  /* the lip-rounded profile, from the constants (the module's exports are the
     DECLARATION; the law is restated) */
  level(B, u) { const cup = u >= 1 ? 1 + B.B2_LIP_SLOPE * (u - 1) : 1 - Math.cbrt(1 - u * u * u); return RS.smin(1, cup, B.B2_LIP_K); },
  levelU(B, L) { let lo = 0, hi = 2; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (RS.level(B, m) < L) lo = m; else hi = m; } return (lo + hi) / 2; },
  edge(B, D) { return ((RS.levelU(B, 0.8) - RS.levelU(B, 0.2)) * (D / 2)) / 2; },
};

/* ------------------------------------------- the round-2 restatements */
/* the merged pairs, their creases, h and the junctions, from the DISCS (the
   field's own pores) and the RESTATED profile — never the mesher's pairs */
const JUNCTION_H_RESTATED = 2;   // HY_JUNCTION_H, restated; checked against the CLEAN module at load
function restateSeams(B, discs) {
  const wallU = RS.levelU(B, 0.8) - RS.levelU(B, 0.2);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (v) => Math.hypot(v[0], v[1], v[2]);
  const pairs = [];
  for (let i = 0; i < discs.length; i++) for (let j = i + 1; j < discs.length; j++) {
    const a = discs[i], b = discs[j];
    if (a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2] <= 0.5) continue;
    if (!(len(sub(a.c, b.c)) < 1.15 * (a.rho + b.rho))) continue;
    pairs.push({ i, j, h: (wallU * Math.min(a.rho, b.rho)) / 2, sd: (x) => (len(sub(x, a.c)) / a.rho - len(sub(x, b.c)) / b.rho) / (1 / a.rho + 1 / b.rho), inLens: (x, m) => len(sub(x, a.c)) < 1.15 * a.rho + m && len(sub(x, b.c)) < 1.15 * b.rho + m });
  }
  const nb = discs.map(() => new Set()); for (const p of pairs) { nb[p.i].add(p.j); nb[p.j].add(p.i); }
  const junctions = [];
  for (let i = 0; i < discs.length; i++) for (const j of nb[i]) { if (j <= i) continue; for (const k of nb[j]) {
    if (k <= j || !nb[i].has(k)) continue;
    const D3 = [discs[i], discs[j], discs[k]], u = (q, x) => len(sub(x, q.c)) / q.rho;
    /* Gauss-Newton on (u_i - u_j, u_i - u_k) = 0 over the plane of disc i */
    const d = D3[0]; let x = [0, 0, 0]; const W = D3.reduce((s2, q) => s2 + q.rho, 0); for (const q of D3) for (let c = 0; c < 3; c++) x[c] += (q.c[c] * q.rho) / W;
    const t1 = d.t1, t2 = d.t2; let ok = false;
    for (let it = 0; it < 30; it++) {
      const f = (p) => [u(D3[0], p) - u(D3[1], p), u(D3[0], p) - u(D3[2], p)], e = 1e-6;
      const f0 = f(x), fa = f([x[0] + e * t1[0], x[1] + e * t1[1], x[2] + e * t1[2]]), fb = f([x[0] + e * t2[0], x[1] + e * t2[1], x[2] + e * t2[2]]);
      const J = [[(fa[0] - f0[0]) / e, (fb[0] - f0[0]) / e], [(fa[1] - f0[1]) / e, (fb[1] - f0[1]) / e]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      if (!(Math.abs(det) > 1e-12)) break;
      const da = (f0[0] * J[1][1] - f0[1] * J[0][1]) / det, db = (J[0][0] * f0[1] - J[1][0] * f0[0]) / det;
      x = [x[0] - da * t1[0] - db * t2[0], x[1] - da * t1[1] - db * t2[1], x[2] - da * t1[2] - db * t2[2]];
      if (Math.hypot(da, db) < 1e-9) { ok = true; break; }
    }
    if (ok && D3.every((q) => u(q, x) < 1.15)) junctions.push({ x, h: (wallU * Math.min(...D3.map((q) => q.rho))) / 2 });
  } }
  return { pairs, junctions, wallU };
}
/* B2e1 and B2e2 over a list of fine points (positions) and the discs */
function seamClauses(B, H2, fine, discs, tag) {
  const bad = [], { pairs, junctions } = restateSeams(B, discs);
  /* the junction patch's reach RESTATED, never read from the module under test: a reference read from
     H2 would widen with the mutation that widens the patch (the fourth durable rule), and did — the
     junction-patch mutant went silent the day the patch stopped leaving the lenses */
  const JH = JUNCTION_H_RESTATED + 0.5;
  let unexplained = 0, outside = 0, inFree = 0;
  const merged = new Set(); for (const p of pairs) { merged.add(p.i); merged.add(p.j); }
  const free = discs.filter((d, i) => !merged.has(i));
  for (const x of fine) {
    const nearCrease = pairs.some((p) => p.inLens(x, p.h) && Math.abs(p.sd(x)) <= p.h);
    const nearJ = junctions.some((J) => Math.hypot(x[0] - J.x[0], x[1] - J.x[1], x[2] - J.x[2]) <= JH * J.h);
    if (!nearCrease && !nearJ) unexplained++;
    if (!pairs.some((p) => p.inLens(x, p.h))) outside++;
    if (free.some((d) => Math.hypot(x[0] - d.c[0], x[1] - d.c[1], x[2] - d.c[2]) < 1.15 * d.rho)) inFree++;
  }
  if (!fine.length) bad.push(`B2e1: ${tag}: no fine point at all (vacuous)`);
  if (unexplained) bad.push(`B2e1: ${tag}: ${unexplained} of ${fine.length} fine points lie on no restated crease (within h) and at no restated junction — a regular grid in a patch interior`);
  if (outside) bad.push(`B2e2: ${tag}: ${outside} of ${fine.length} fine points lie in no restated merged lens`);
  if (inFree) bad.push(`B2e2: ${tag}: ${inFree} fine points sit in a FREE pore's outer disc`);
  return { bad, note: `${fine.length} fine points, ${pairs.length} restated pairs, ${junctions.length} junctions, ${free.length} free pores: ${unexplained} unexplained, ${outside} outside every lens, ${inFree} in a free pore` };
}
/* the PLANTED coincidence: organ A a lattice patch, organ B one triangle with a
   corner put EXACTLY on a vertex the hybrid emits in A */
async function plantedCoincidence(B, PL) {
  const H = 0.4, params = B.bone2Params({ textureHeight: H }), FIELD = B.bone2Field(params);
  const L = PL.latticeChart(10, 14, -2, 2, 0.4);
  const nV = L.xy.length / 2, nT = L.tri.length / 3;
  const PA = new Float64Array(nV * 3), NA = new Float64Array(nV * 3), sA = new Float64Array(nV);
  for (let i = 0; i < nV; i++) { PA[i * 3] = L.xy[i * 2]; PA[i * 3 + 1] = L.xy[i * 2 + 1]; NA[i * 3 + 2] = 1; sA[i] = H * FIELD.F([PA[i * 3], PA[i * 3 + 1], 0], [0, 0, 1]); }
  const T = { heightMm: H, f: FIELD.F, mp: () => 1 };
  const organ = (name, P, N, tri, s, porous, from) => { const n = P.length / 3; return { X: { O: { P, N, tri, organ: name, from, to: from + tri.length / 3 }, nV: n, s, clr: new Float64Array(n) }, mw: new Float64Array(n).fill(porous ? 1 : 0), porous: new Uint8Array(tri.length / 3).fill(porous ? 1 : 0), porousTris: porous ? tri.length / 3 : 0 }; };
  const stream = (plans) => { const pos = []; for (const pl of plans) { const { O } = pl.X; for (const v of O.tri) for (let k = 0; k < 3; k++) pos.push(O.P[v * 3 + k] + O.N[v * 3 + k] * Math.max(0, pl.X.s[v])); } return { positions: pos, normals: null, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity], get triangleCount() { return this.positions.length / 9; } }; };
  /* run 1: A alone — a vertex the hybrid adds */
  const A1 = organ('A', PA, NA, Array.from(L.tri), sA, true, 0);
  const acc1 = stream([A1]);
  B.__hybridWrite(acc1, T, null, [A1], FIELD, 'hybrid', {}, 0);
  const old = new Set(); for (let i = 0; i < nV; i++) old.add(`${Math.fround(PA[i * 3])}|${Math.fround(PA[i * 3 + 1])}|${Math.fround(PA[i * 3 + 2] + sA[i])}`);
  let q = null;
  for (let i = 0; i < acc1.positions.length && !q; i += 3) { const k = `${Math.fround(acc1.positions[i])}|${Math.fround(acc1.positions[i + 1])}|${Math.fround(acc1.positions[i + 2])}`; if (!old.has(k) && Math.hypot(acc1.positions[i] - 12, acc1.positions[i + 1]) < 1) q = [acc1.positions[i], acc1.positions[i + 1], acc1.positions[i + 2]]; }
  /* run 2: A with B — B's corner ON q (B unrelieved, so its emitted corner IS q) */
  const A2 = organ('A', PA, NA, Array.from(L.tri), sA, true, 0);
  const PB = new Float64Array([q[0], q[1], q[2], q[0] + 0.3, q[1], q[2] + 0.2, q[0], q[1] + 0.3, q[2] + 0.2]);
  const Bo = organ('B', PB, new Float64Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), [0, 1, 2], new Float64Array(3), false, nT);
  const acc2 = stream([A2, Bo]);
  const st = {};
  B.__hybridWrite(acc2, T, null, [A2, Bo], FIELD, 'hybrid', st, 0);
  const keyB = `${Math.fround(q[0])}|${Math.fround(q[1])}|${Math.fround(q[2])}`;
  let shared = 0; const rA = st.ranges.find((r) => r.organ === 'A');
  for (let i = rA.from * 9; i < rA.to * 9; i += 3) if (`${Math.fround(acc2.positions[i])}|${Math.fround(acc2.positions[i + 1])}|${Math.fround(acc2.positions[i + 2])}` === keyB) shared++;
  return { withdrawn: st.coincidentWithdrawn || 0, shared, planted: !!q };
}

async function runClauses(B, PL, label, H2 = null, MS = null) {
  const bad = [];
  const say = (s) => console.log(`  [${label}] ${s}`);
  /* ---- B2a (plate) ---- */
  {
    const params = { ...B.bone2Params({ textureHeight: 1.0 }), packing: 'hardcore' };
    const field = B.bone2Field(params);
    const dom = PL.plateDomain();
    const win = { x0: 10, x1: 18, y0: -4, y1: 4 };
    let neg = 0, floorsOk = 0, floorsBad = 0;
    for (const m of ['rings', 'grid=']) { const M = PL.meshPatch(m, dom, field, params, win, { edge: 0.1001 }); for (let i = 0; i < M.F.length; i++) if (M.F[i] < 0) neg++; }
    for (const pore of field.poresIn([10, -4, -2], [18, 4, 2])) {
      const disc = field.discOf(pore, [pore.centre[0], pore.centre[1], 0], [0, 0, 1]);
      if (!disc || disc.a !== 1 || disc.centre[0] < 10 || disc.centre[0] > 18 || Math.abs(disc.centre[1]) > 4) continue;
      /* the deepest point: the centre of a plain pore, a nested pit's centre on a shelved one */
      const fr = field.frame([0, 0, 1]), c = disc.centre;
      const deep = disc.nested.length ? disc.nested.map((q) => [c[0] + q.ox * fr.t1[0] + q.oy * fr.t2[0], c[1] + q.ox * fr.t1[1] + q.oy * fr.t2[1], 0]) : [c];
      for (const p of deep) { if (field.F(p, [0, 0, 1]) === 0) floorsOk++; else floorsBad++; }
    }
    if (neg) bad.push(`B2a: ${neg} emitted plate vertices below the original sheet (F < 0)`);
    if (!floorsOk) bad.push('B2a: no fully admitted pore in the window (vacuous)');
    if (floorsBad) bad.push(`B2a: ${floorsBad} deepest points of fully admitted pores do not reach the sheet exactly (F != 0); ${floorsOk} do`);
    say(`B2a plate: ${neg} below the sheet; ${floorsOk} deepest points at exactly 0, ${floorsBad} not`);
  }
  /* ---- B2c ---- */
  {
    const e5 = B.bone2GridEdgeMm(B.bone2Params({ bonePoreSize: 0.5 })), e10 = B.bone2GridEdgeMm(B.bone2Params({ bonePoreSize: 1.0 }));
    const r5 = RS.edge(B, 0.5), r10 = RS.edge(B, 1.0);
    if (Math.abs(e5 - r5) > 1e-9 * r5) bad.push(`B2c: the grid edge at a 0.5 mm pore is ${e5} mm; the profile restated says ${r5}`);
    if (Math.abs(e10 - r10) > 1e-9 * r10) bad.push(`B2c: the grid edge at a 1.0 mm pore is ${e10} mm; the profile restated says ${r10}`);
    say(`B2c edge: ${e5.toFixed(5)} / ${e10.toFixed(5)} mm at 0.5 / 1.0 mm pores (restated ${r5.toFixed(5)} / ${r10.toFixed(5)})`);
  }
  /* ---- B2d ---- the rings on the HARD-CORE field (their claim: a pore that
     keeps its rings is round; where pores merge it keeps fewer — measured and
     reported, the doc's §5), the derived grid on the default (merging) field */
  {
    const dom = PL.plateDomain();
    const win = { x0: 10, x1: 20, y0: -5, y1: 5 };
    for (const [m, packing] of [['rings', 'hardcore'], ['grid', 'overlap']]) {
      const params = { ...B.bone2Params({ textureHeight: 1.0 }), packing };
      const field = B.bone2Field(params);
      const M = PL.meshPatch(m, dom, field, params, win);
      const rr = PL.poreRoundness(M, dom, field, params, win);
      const dev = rr.map((q) => q.devPct).sort((a, b) => a - b), ed = rr.map((q) => q.edges).sort((a, b) => a - b);
      const md = dev.length ? dev[Math.floor(dev.length / 2)] : null, me = ed.length ? ed[Math.floor(ed.length / 2)] : null;
      if (rr.length < 5) bad.push(`B2d: ${m} (${packing}): only ${rr.length} pores measured (vacuous under 5)`);
      else {
        if (!(md <= 5)) bad.push(`B2d: ${m} (${packing}): the drawn mid-wall is ${md.toFixed(1)}% off its circle (median of ${rr.length}); the bar is 5%`);
        if (m === 'rings' && !(me >= 24)) bad.push(`B2d: rings: ${me} segments a circumference (median); the bar is 24`);
      }
      say(`B2d ${m} (${packing}): ${rr.length} pores, median ${md?.toFixed(2)}% off the circle, ${me} segments`);
    }
    /* the HYBRID on the merging field: free and merged pores alike */
    if (H2) {
      const params = { ...B.bone2Params({ textureHeight: 1.0 }), packing: 'overlap' };
      const field = B.bone2Field(params);
      const opts = {};
      const M = PL.meshPatch('hybrid', dom, field, params, win, opts);
      const rr = PL.poreRoundness(M, dom, field, params, win, { minOwned: Math.PI / 2 });
      for (const [cls, sel] of [['free', rr.filter((q) => !q.merged)], ['merged', rr.filter((q) => q.merged)]]) {
        const dev = sel.map((q) => q.devPct).sort((a, b) => a - b), ed = sel.map((q) => q.edges).sort((a, b) => a - b);
        const md = dev.length ? dev[Math.floor(dev.length / 2)] : null, me = ed.length ? ed[Math.floor(ed.length / 2)] : null;
        if (!sel.length) bad.push(`B2d: hybrid: no ${cls} pore measured (vacuous)`);
        else { if (!(md <= 5)) bad.push(`B2d: hybrid (${cls}): the drawn mid-wall is ${md.toFixed(1)}% off its circle (median of ${sel.length}); the bar is 5%`); if (!(me >= 24)) bad.push(`B2d: hybrid (${cls}): ${me} segments a circumference (median); the bar is 24`); }
        say(`B2d hybrid (merging, ${cls}): ${sel.length} pores, median ${md?.toFixed(2)}% off the circle, ${me} segments`);
      }
      /* ---- B2e1 / B2e2 on the plate ---- */
      const HM = opts.hybrid, fine = [];
      for (let v = HM.nV0; v < HM.P.length / 3; v++) { const k = HM.kind[v - HM.nV0]; if (k === H2.HY_KIND.seam || k === H2.HY_KIND.seamCross || k === H2.HY_KIND.junction) fine.push([HM.P[v * 3], HM.P[v * 3 + 1], HM.P[v * 3 + 2]]); }
      const SC = seamClauses(B, H2, fine, HM.discs, 'plate');
      bad.push(...SC.bad);
      say(`B2e1/B2e2 plate: ${SC.note}`);
    }
  }
  /* ---- B2a (bloom) and B2b ---- */
  {
    const st = B.bone2State(DEFAULTS, { textureHeight: 1.0 });
    const G = await B.bone2Geometry();
    /* the lattice with the masks read out per corner */
    const L = await B.bone2Bloom(st, { mode: 'lattice' });
    const MO = new Float32Array(L.acc.triangleCount * 12 + 8);
    const L2 = await B.bone2Bloom(st, { mode: 'lattice', capability: { boneMaskOut: MO } });
    const Gd = await B.bone2Bloom(st, { mode: 'grid', edgeMm: 0.1 });
    void G;
    const lat = L2.acc.positions, gr = Gd.acc.positions, nL = L2.acc.triangleCount;
    /* a POROUS triangle has a corner with mask > 0 (the hook's own rule, restated
       on the masks the shipped pass read out); every vertex of one is
       refinable or must close against it (a transition fan) */
    const vk = (p, o) => `${p[o]}|${p[o + 1]}|${p[o + 2]}`;
    const porousV = new Set();
    for (let t = 0; t < nL; t++) {
      let por = false;
      for (let c = 0; c < 3; c++) { const o = (t * 3 + c) * 4; if (MO[o] * MO[o + 1] * MO[o + 2] > 0) por = true; }
      if (por) for (let c = 0; c < 3; c++) porousV.add(vk(lat, t * 9 + c * 3));
    }
    const want = new Map();
    let smooth = 0;
    for (let t = 0; t < nL; t++) {
      let ok = true;
      for (let c = 0; c < 3 && ok; c++) if (porousV.has(vk(lat, t * 9 + c * 3))) ok = false;
      /* (a triangle sharing an EDGE with a porous one shares two of its vertices) */
      if (!ok) continue;
      smooth++;
      const k = Array.from(lat.slice(t * 9, t * 9 + 9)).join(',');
      want.set(k, (want.get(k) || 0) + 1);
    }
    const have = new Map();
    for (let t = 0; t < gr.length / 9; t++) { const k = Array.from(gr.slice(t * 9, t * 9 + 9)).join(','); if (want.has(k)) have.set(k, (have.get(k) || 0) + 1); }
    let missing = 0; for (const [k, n] of want) missing += Math.max(0, n - (have.get(k) || 0));
    if (!smooth) bad.push('B2b: no smooth-interior lattice triangle (vacuous)');
    if (missing) bad.push(`B2b: ${missing} of ${smooth} smooth-interior lattice triangles do not reappear verbatim in the grid build — the refinement reached where the masks are 0`);
    say(`B2b: ${smooth} smooth-interior lattice triangles, ${missing} missing from the grid build`);
    say(`B2b grid build at 0.1 mm: ${Gd.acc.triangleCount} tris`);
    if (!(Gd.stats.edgeMm === 0.1)) bad.push(`B2c: the grid build asked 0.1 mm and used ${Gd.stats.edgeMm}`);
    if (!(Gd.stats.edgeDerivedMm === B.bone2GridEdgeMm(B.bone2Params(st)))) bad.push('B2c: the build\'s derived edge is not the module\'s derivation');
  }
  /* ---- B2e3 / B2e4 / B2f: the hybrid on a bloom WINDOW (the default bloom,
     petal 0's most porous flat spot, 3 mm; every organ's triangles there) ---- */
  if (H2 && MS) {
    const focus = await MS.petalFocus();
    const st = B.bone2State(DEFAULTS, { textureHeight: 0.4 });
    const foc = { centre: focus.centre, normal: focus.normal, radiusMm: 3.0 };
    const hy = await B.bone2Bloom(st, { mode: 'hybrid', focus: foc });
    const hc = await B.bone2Bloom(st, { mode: 'hybrid-count', focus: foc });
    const co = await B.bone2Bloom(st, { mode: 'coarse', focus: foc, discs: true });
    const pos = hy.acc.positions, key = (i) => `${Math.fround(pos[i])}|${Math.fround(pos[i + 1])}|${Math.fround(pos[i + 2])}`;
    const em = new Map();
    for (let t = 0; t < pos.length; t += 9) { const k = [key(t), key(t + 3), key(t + 6)]; for (let q = 0; q < 3; q++) { const e = k[q] + '>' + k[(q + 1) % 3]; em.set(e, (em.get(e) || 0) + 1); } }
    let open = 0, dup = 0; for (const [e, n] of em) { const [a, b] = e.split('>'); if (!em.has(b + '>' + a)) open++; if (n > 1) dup++; }
    if (open || dup) bad.push(`B2e3: the hybrid bloom window emits ${open} unmatched and ${dup} doubled directed edges`);
    if (!(hy.acc.triangleCount === hc.stats.hybrid.count)) bad.push(`B2e3: the exact count says ${hc.stats.hybrid.count}, the build emitted ${hy.acc.triangleCount}`);
    if (!(hy.stats.hybrid.kinds[H2.HY_KIND.cross] > 0)) bad.push('B2e3: the window re-meshed nothing (vacuous)');
    say(`B2e3 bloom window: ${hy.acc.triangleCount} tris (count ${hc.stats.hybrid.count}), ${open} open / ${dup} doubled directed edges`);
    /* B2e4: new vertices of one organ against every other organ's vertices */
    const owner = new Map();
    for (const r of hy.stats.ranges) for (let i = r.from * 9; i < r.to * 9; i += 3) { const k = key(i); const o = owner.get(k); if (o === undefined) owner.set(k, r.organ + '#' + r.from); else if (o !== r.organ + '#' + r.from) owner.set(k, '*'); }
    let sharedW = 0; for (const v of owner.values()) if (v === '*') sharedW++;
    const plant = await plantedCoincidence(B, PL);
    if (sharedW) bad.push(`B2e4: ${sharedW} float32 positions on the bloom window are emitted by two organs`);
    if (!plant.planted) bad.push('B2e4: the planted fixture found no hybrid vertex to plant on (vacuous)');
    if (!(plant.withdrawn >= 1)) bad.push(`B2e4: the planted coincidence withdrew ${plant.withdrawn} triangles (the rule must act)`);
    if (plant.shared) bad.push(`B2e4: the planted coincidence leaves ${plant.shared} of organ A's emitted positions ON organ B's vertex`);
    say(`B2e4: bloom window ${sharedW} shared positions; planted: withdrew ${plant.withdrawn}, ${plant.shared} left shared`);
    /* B2f: coarse and full read the same pores */
    const A = hy.stats.hybrid.discList, Cq = co.stats.coarseDiscs || [];
    const ka = new Map(A.map((d) => [d.key + '@' + d.c.join(','), d])), kc = new Map(Cq.map((d) => [d.key + '@' + d.c.join(','), d]));
    let onlyFull = 0, onlyCoarse = 0; for (const k of ka.keys()) if (!kc.has(k)) onlyFull++; for (const k of kc.keys()) if (!ka.has(k)) onlyCoarse++;
    if (!A.length) bad.push('B2f: the full build meshed no pore (vacuous)');
    if (onlyFull || onlyCoarse) bad.push(`B2f: the coarse and full builds read different pores: ${onlyFull} only in the full build, ${onlyCoarse} only in the coarse`);
    say(`B2f: ${A.length} pores in the full build, ${Cq.length} in the coarse; ${onlyFull} / ${onlyCoarse} differ`);
  }
  return bad;
}

/* ------------------------------------------------------------ mutants */
const MUTANTS = [
  { id: 'refinement-leaks-into-smooth-areas', fires: 'B2b', edits: [["    if (porous[t]) { bisect(a, b, c, t, 0); continue; }", "    { bisect(a, b, c, t, 0); continue; }"]],
    witness: (B) => { const R = B.gridRefine([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], [0, 1, 2, 1, 3, 2], [], new Uint8Array([1, 0]), 0.2); const n1 = R.parent.filter((p) => p === 1).length; return { moved: n1 > 8, note: `the smooth triangle emits ${n1} triangles (a closing fan is at most 8 here)` }; } },
  { id: 'a-pore-floor-below-the-sheet', fires: 'B2a', edits: [['      const floor = 1 - a;                                   // a fully admitted pore floors on the sheet', '      const floor = (1 - a) - 0.2 * a;'], ['    return v < 0 ? 0 : v > 1 ? 1 : v;', '    return v > 1 ? 1 : v;']],
    witness: (B) => { const params = B.bone2Params({}); const f = B.bone2Field(params); let lo = Infinity; for (const pore of f.poresIn([0, -5, -1], [10, 5, 1])) { const c = [pore.centre[0], pore.centre[1], pore.centre[2]]; if (f.admission(pore, c, [0, 0, 1]) === 1) lo = Math.min(lo, f.F(c, [0, 0, 1])); } return { moved: lo < 0, note: `the field at a pore centre reads ${lo.toFixed(3)}` }; } },
  { id: 'a-typed-refinement-edge', fires: 'B2c', edits: [['  return (bone2WallU() * Rmin) / B2_GRID_WALL_EDGES;', '  void Rmin; return 0.05;']],
    witness: (B) => { const a = B.bone2GridEdgeMm(B.bone2Params({ bonePoreSize: 0.5 })), b = B.bone2GridEdgeMm(B.bone2Params({ bonePoreSize: 1.0 })); return { moved: a === b, note: `the edge reads ${a} and ${b} mm at 0.5 and 1.0 mm pores` }; } },
  { id: 'pores-revert-to-grid-aligned', fires: 'B2d', edits: [['      const u = Math.sqrt(tx * tx + ty * ty + tz * tz) / rho;', '      const u = Math.max(Math.abs(tx), Math.abs(ty), Math.abs(tz)) / rho;']],
    witness: (B) => { const f = B.bone2Field(B.bone2Params({})); let diff = 0; for (const pore of f.poresIn([0, -5, -1], [10, 5, 1])) { const c = pore.centre; if (f.admission(pore, c, [0, 0, 1]) !== 1 || pore.nested.length) continue; const r = pore.R * 0.95; const ax = f.F([c[0] + r, c[1], c[2]], [0, 0, 1]), dg = f.F([c[0] + r / Math.SQRT2, c[1] + r / Math.SQRT2, c[2]], [0, 0, 1]); diff = Math.max(diff, Math.abs(ax - dg)); } return { moved: diff > 0.05, note: `the field on a pore's axis and its diagonal at one radius differ by ${diff.toFixed(3)}` }; } },
  /* ---- ROUND 2: the hybrid ---- */
  { id: 'merged-rings-are-clipped-away', file: 'hybrid', fires: 'B2d', edits: [['export let HY_BAND_H = 0.5;', 'export let HY_BAND_H = 6;']],
    witness: async (B, { Hm, PLm, Hc, PLc }) => { const k = (H, PL) => { const params = B.bone2Params({ textureHeight: 1 }), f = B.bone2Field(params), o = {}; PL.meshPatch('hybrid', PL.plateDomain(), f, params, { x0: 10, x1: 14, y0: -2, y1: 2 }, o); return o.hybrid.kind.filter((q) => q === H.HY_KIND.ring).length; }; const a = k(Hc, PLc), b = k(Hm, PLm); return { moved: b < a * 0.8, note: `ring vertices on a 4 mm plate ${a} -> ${b}` }; } },
  { id: 'the-junction-patch-covers-the-pores', file: 'hybrid', fires: 'B2e1', edits: [['export const HY_JUNCTION_H = 2;', 'export const HY_JUNCTION_H = 12;']],
    witness: async (B, { Hm, PLm, Hc, PLc }) => { const k = (H, PL) => { const params = B.bone2Params({ textureHeight: 1 }), f = B.bone2Field(params), o = {}; PL.meshPatch('hybrid', PL.plateDomain(), f, params, { x0: 10, x1: 14, y0: -2, y1: 2 }, o); return o.hybrid.kind.filter((q) => q === H.HY_KIND.junction).length; }; const a = k(Hc, PLc), b = k(Hm, PLm); return { moved: b > a * 2, note: `junction points on a 4 mm plate ${a} -> ${b}` }; } },
  { id: 'seam-rows-run-outside-the-lens', file: 'hybrid', fires: 'B2e2', edits: [['        if (di < pr.Ri && dj < pr.Rj) pts.push([x, y, x3]);', '        if (di < 3 * pr.Ri && dj < 3 * pr.Rj) pts.push([x, y, x3]);']],
    witness: async (B, { Hm, PLm, Hc, PLc }) => { const k = (H, PL) => { const params = B.bone2Params({ textureHeight: 1 }), f = B.bone2Field(params), o = {}; PL.meshPatch('hybrid', PL.plateDomain(), f, params, { x0: 10, x1: 14, y0: -2, y1: 2 }, o); return o.hybrid.kind.filter((q) => q === H.HY_KIND.seam).length; }; const a = k(Hc, PLc), b = k(Hm, PLm); return { moved: b > a, note: `seam points on a 4 mm plate ${a} -> ${b}` }; } },
  { id: 'a-transition-fan-ignores-its-edge-points', file: 'hybrid', fires: 'B2e3', edits: [['        for (let q = 0; q < loop.length; q++) outTri.push(loop[q], loop[(q + 1) % loop.length], g);', '        outTri.push(tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2]); void g;']],
    witness: async (B, { Hm, PLm, Hc, PLc }) => { const open = (H, PL) => { const params = B.bone2Params({ textureHeight: 1 }), f = B.bone2Field(params), L = PL.latticeChart(10, 14, -2, 2, 0.4); const P = []; for (let i = 0; i < L.xy.length / 2; i++) P.push(L.xy[i * 2], L.xy[i * 2 + 1], 0); const nT = L.tri.length / 3, por = new Uint8Array(nT); for (let t = 0; t < nT; t++) por[t] = t % 2; const discs = PL.chartDiscs(PL.plateDomain(), f, params, { x0: 9, x1: 15, y0: -3, y1: 3 }); const R = H.hybridOrganMesh({ P, tri: L.tri, porous: por }, discs, { layout: H.HYBRID_LAYOUTS.full, wallU: B.bone2WallU() }); const em = new Map(); for (let t = 0; t < R.tri.length; t += 3) for (let q = 0; q < 3; q++) { const e = R.tri[t + q] + '>' + R.tri[t + (q + 1) % 3]; em.set(e, (em.get(e) || 0) + 1); } let n = 0; for (const [e] of em) { const [x, y] = e.split('>'); if (!em.has(y + '>' + x)) n++; } return n; }; const a = open(Hc, PLc), b = open(Hm, PLm); return { moved: b > a, note: `unmatched directed edges on a half-porous plate ${a} -> ${b} (the clean count is the plate's own border)` }; } },
  { id: 'the-weld-withdrawal-is-removed', file: 'bone2', fires: 'B2e4', edits: [['  for (let pass = 0; pass < 6; pass++) {\n    const seen = new Map();\n    plans.forEach((pl, i) => {\n      const n = results[i]', '  for (let pass = 0; pass < 0; pass++) {\n    const seen = new Map();\n    plans.forEach((pl, i) => {\n      const n = results[i]']],
    witness: async (B, { PLm }) => { const p = await plantedCoincidence(B, PLm); return { moved: p.shared > 0, note: `the planted coincidence leaves ${p.shared} shared position(s), ${p.withdrawn} withdrawn` }; } },
  { id: 'the-coarse-build-moves-the-pores', file: 'bone2', fires: 'B2f', edits: [['      if (key !== FIELD_KEY) { FIELD = bone2Field(params); FIELD_KEY = key; }', '      if (key !== FIELD_KEY) { FIELD = bone2Field(params, mode === \'coarse\' ? B2_SEED + 1 : B2_SEED); FIELD_KEY = key; }']],
    witness: async (B) => { const st = { textureHeight: 0.4 }; const fc = B.bone2Hook({ mode: 'coarse' }).field(st, 0.4), fh = B.bone2Hook({ mode: 'hybrid' }).field(st, 0.4); let d = 0; for (let i = 0; i < 400; i++) { const p = [10 + (i % 20) * 0.2, -2 + Math.floor(i / 20) * 0.2, 0]; d = Math.max(d, Math.abs(fc(p, [0, 0, 1]) - fh(p, [0, 0, 1]))); } return { moved: d > 0.1, note: `the coarse and full fields differ by up to ${d.toFixed(3)} on a 4 mm plate` }; } },
];

if (CONTROL) {
  const src0 = fs.readFileSync(MOD, 'utf8'), hsrc0 = fs.readFileSync(HYB, 'utf8');
  let bad = 0;
  for (const m of MUTANTS) for (const [from] of m.edits) { const n = (m.file === 'hybrid' ? hsrc0 : src0).split(from).length - 1; if (n !== 1) { console.log(`ANCHOR: ${m.id} matches ${n} times`); bad++; } }
  if (bad) { console.log('FAIL (anchors)'); process.exit(1); }
  console.log(`anchors: ${MUTANTS.length} mutants, every anchor matches exactly once`);
}
const H2c = await import(pathToFileURL(HYB).href), MSc = await import(pathToFileURL(MEASURE).href);
if (H2c.HY_JUNCTION_H !== JUNCTION_H_RESTATED) { console.log(`FAIL: HY_JUNCTION_H is ${H2c.HY_JUNCTION_H}, the gate restates ${JUNCTION_H_RESTATED} — a ruling or a gate edit, never silently`); process.exit(1); }
const clean = await runClauses(await import(pathToFileURL(MOD).href), await import(pathToFileURL(PLATE).href), 'clean', H2c, MSc);
let failed = false;
if (clean.length) { console.log('CLEAN TREE FAILS:'); for (const b of clean) console.log('  ' + b); failed = true; } else console.log('clean: PASS (B2a B2b B2c B2d B2e B2f)');
if (CONTROL) {
  const src = fs.readFileSync(MOD, 'utf8'), hsrc = fs.readFileSync(HYB, 'utf8'), psrc = fs.readFileSync(PLATE, 'utf8'), msrc = fs.readFileSync(MEASURE, 'utf8');
  const srcOf = (f) => (f === 'hybrid' ? hsrc : src);
  /* every anchor first, for every mutant */
  for (const m of MUTANTS) for (const [from] of m.edits) { const n = srcOf(m.file).split(from).length - 1; if (n !== 1) { console.log(`ANCHOR: ${m.id} matches ${n} times`); failed = true; } }
  if (failed) process.exit(1);
  for (const m of MUTANTS) {
    if (ONLY && !ONLY.includes(m.id)) continue;
    let s = src, h = hsrc;
    if (m.file === 'hybrid') { for (const [from, to] of m.edits) h = h.replace(from, () => to); } else for (const [from, to] of m.edits) s = s.replace(from, () => to);
    const tag = `.bone2-mutant-${m.id}-${process.pid}`;
    const modFile = path.join(ROOT, `${tag}.mjs`), hybFile = path.join(ROOT, `${tag}-hybrid.mjs`), plateFile = path.join(ROOT, 'tools', `${tag}-plate.mjs`), measFile = path.join(ROOT, 'tools', `${tag}-measure.mjs`);
    fs.writeFileSync(hybFile, h);
    fs.writeFileSync(modFile, s.replace("from './bloom-texture-bone2-hybrid.js'", `from './${tag}-hybrid.mjs'`));
    fs.writeFileSync(plateFile, psrc.replace("new URL('../bloom-texture-bone2.js', import.meta.url)", `new URL('../${tag}.mjs', import.meta.url)`).replace("new URL('../bloom-texture-bone2-hybrid.js', import.meta.url)", `new URL('../${tag}-hybrid.mjs', import.meta.url)`));
    fs.writeFileSync(measFile, msrc.replace("path.join(ROOT, 'bloom-texture-bone2.js')", `path.join(ROOT, '${tag}.mjs')`).replace("path.join(ROOT, 'bloom-texture-bone2-hybrid.js')", `path.join(ROOT, '${tag}-hybrid.mjs')`).replace("path.join(ROOT, 'tools/bloom-texture-bone2-plate.mjs')", `path.join(ROOT, 'tools/${tag}-plate.mjs')`));
    try {
      const Bm = await import(pathToFileURL(modFile).href), Hm = await import(pathToFileURL(hybFile).href), PLm = await import(pathToFileURL(plateFile).href), MSm = await import(pathToFileURL(measFile).href);
      const w = await m.witness(Bm, { Hm, PLm, Bc: await import(pathToFileURL(MOD).href), Hc: H2c, PLc: await import(pathToFileURL(PLATE).href) });
      if (!w.moved) { console.log(`MUTANT ${m.id}: WITNESS SILENT — ${w.note}`); failed = true; continue; }
      const bad = await runClauses(Bm, PLm, m.id, Hm, MSm);
      const fired = bad.some((b) => b.startsWith(m.fires + ':'));
      console.log(`MUTANT ${m.id}: witness ${w.note}; ${fired ? `fires ${m.fires}` : `MISSED — ${m.fires} silent`}${bad.length ? ` (${[...new Set(bad.map((b) => b.split(':')[0]))].join(', ')})` : ''}`);
      if (!fired) failed = true;
    } finally { for (const f of [modFile, hybFile, plateFile, measFile]) fs.rmSync(f, { force: true }); }
  }
}
console.log(failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);
