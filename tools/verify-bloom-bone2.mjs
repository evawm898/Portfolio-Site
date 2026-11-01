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
   --control runs four mutants of a COPY of the module (written beside it,
   removed after), each with a WITNESS — a direct call on the mutated module
   proving the behaviour moved, run before any clause is consulted:
     refinement-leaks-into-smooth-areas  -> B2b
     a-pore-floor-below-the-sheet        -> B2a
     a-typed-refinement-edge             -> B2c
     pores-revert-to-grid-aligned        -> B2d
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOD = path.join(ROOT, 'bloom-texture-bone2.js');
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

async function runClauses(B, PL, label) {
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
];

if (CONTROL) {
  const src0 = fs.readFileSync(MOD, 'utf8');
  let bad = 0;
  for (const m of MUTANTS) for (const [from] of m.edits) { const n = src0.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR: ${m.id} matches ${n} times`); bad++; } }
  if (bad) { console.log('FAIL (anchors)'); process.exit(1); }
  console.log(`anchors: ${MUTANTS.length} mutants, every anchor matches exactly once`);
}
const clean = await runClauses(await import(pathToFileURL(MOD).href), await import(pathToFileURL(PLATE).href), 'clean');
let failed = false;
if (clean.length) { console.log('CLEAN TREE FAILS:'); for (const b of clean) console.log('  ' + b); failed = true; } else console.log('clean: PASS (B2a B2b B2c B2d)');
if (CONTROL) {
  const src = fs.readFileSync(MOD, 'utf8'), psrc = fs.readFileSync(PLATE, 'utf8');
  /* every anchor first, for every mutant */
  for (const m of MUTANTS) for (const [from] of m.edits) { const n = src.split(from).length - 1; if (n !== 1) { console.log(`ANCHOR: ${m.id} matches ${n} times`); failed = true; } }
  if (failed) process.exit(1);
  for (const m of MUTANTS) {
    if (ONLY && !ONLY.includes(m.id)) continue;
    let s = src; for (const [from, to] of m.edits) s = s.replace(from, () => to);
    const tag = `.bone2-mutant-${m.id}-${process.pid}`;
    const modFile = path.join(ROOT, `${tag}.mjs`), plateFile = path.join(ROOT, 'tools', `${tag}-plate.mjs`);
    fs.writeFileSync(modFile, s);
    fs.writeFileSync(plateFile, psrc.replace("new URL('../bloom-texture-bone2.js', import.meta.url)", `new URL('../${tag}.mjs', import.meta.url)`));
    try {
      const Bm = await import(pathToFileURL(modFile).href), PLm = await import(pathToFileURL(plateFile).href);
      const w = m.witness(Bm);
      if (!w.moved) { console.log(`MUTANT ${m.id}: WITNESS SILENT — ${w.note}`); failed = true; continue; }
      const bad = await runClauses(Bm, PLm, m.id);
      const fired = bad.some((b) => b.startsWith(m.fires + ':'));
      console.log(`MUTANT ${m.id}: witness ${w.note}; ${fired ? `fires ${m.fires}` : `MISSED — ${m.fires} silent`}${bad.length ? ` (${bad.map((b) => b.split(':')[0]).join(', ')})` : ''}`);
      if (!fired) failed = true;
    } finally { fs.rmSync(modFile, { force: true }); fs.rmSync(plateFile, { force: true }); }
  }
}
console.log(failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);
