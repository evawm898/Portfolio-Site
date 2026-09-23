/* ===================================================================
   bloom-basal-grading.mjs — HOW FAR DOWN THE BLADE THE INFILL REACHES.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it drives `tools/bloom-voronoi-proto.mjs`'s salvage field at a range
   of values of its BASAL V and its BASE CELL-SIZE RATE and reports what each
   costs, so the "still a lot of solid area at the bottom" complaint can be ruled
   on from numbers rather than from an impression.

     node tools/bloom-basal-grading.mjs [--json <file>] [--quick]
     node tools/bloom-basal-grading.mjs --inert <base-tree>   (the must-run control)

   `--inert` CANNOT BE RUN ACROSS THE CONFORMING-EMITTER COMMIT. It compares this tree's
   `cutThrough` against a base tree's float for float, to prove that defaulting `u0`
   changes nothing; S1 of the infill port plan replaced the tessellation, so pointed at a
   base from before it the comparison is between two EMITTERS and every float differs by
   construction. It remains exactly as valid between two trees that share the emitter.
   `docs/bloom-infill-conforming-emitter.md` §6 measures what did move: the triangle count
   in this tool's own table, and nothing else — every published figure here is a property
   of the PLAN, and the two outputs are IDENTICAL with the count column masked.

   WHAT MOVES AND WHAT DOES NOT. The BASE BOUNDARY IS FIXED at `ROOT_BLEND_END`
   (Eva's ruling, Sep 18) — `docs/bloom-infill-base-boundary.md` measured it as
   already the floor, and this tool never moves it. What moves is the field's own
   grading: `converge` (the basal V's reach up the margins) and `baseNarrow` /
   `baseReach` (the BASE's cell-size rate, independent of `tipGamma`, which is the
   tip's). The metric, the seeding law, the relaxation, the fillet radius and the
   wall law are the salvage's own and are untouched.

   EIGHT SEEDS, ALWAYS. One layout is not a measurement: the seeds are
   `SEED + i*131` for i = 0..7, which is exactly the set `wholeBloom` gives the
   eight petals of the shipping whorl, so the sweep's population IS the bloom's.
   Every figure is the MEDIAN over those eight with the range beside it.

   WHAT IT MEASURES, per (setting, wall): the lowest hole's u; the hole count
   below u = 0.15 (the brief's own line — see the header note below); the BASAL
   BAND (u 0.2857..0.45) hole count, real-hole count, solid-cell count and wall
   fraction; the global wall fraction; and the TIP BAND (u 0.75..1) real-hole
   count, median hole and the solid apex cap, so a base change that pays for
   itself at the tip is caught rather than reported as a win.

   THE BRIEF'S "BELOW u = 0.15" IS STRUCTURALLY ZERO AND IS PRINTED ANYWAY. With
   the boundary fixed at `ROOT_BLEND_END` the cells' own region starts at
   u = 0.2857, so no hole can be below 0.15 at any grading whatever. The column is
   reported because it was asked for and because a reader should see it read zero
   rather than be told; the BASAL BAND beside it is the same question asked where
   the pattern actually is.

   WHAT IT DOES NOT COVER. The census here is the proto's own scratch one
   (sorted-pair edges, exact-position weld) and quotes no gate; the two
   non-manifold edges on every row are the base panel's overlap weld, unrated here
   as in the gates. The plan is flat-computed, which is exact on the flat default
   and is not the build's arc-length plan.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import * as P from './bloom-voronoi-proto.mjs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';

const IS_MAIN = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
export const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P.SEED + i * 131);
const N_CELLS = 16;                                   // the salvage doc's own reading: 16 is where this pattern reads best on the default petal
const WALLS = [1.0, 0.8];

const ctx = P.context({});
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rng = (a) => [Math.min(...a), Math.max(...a)];
const n2 = (x, d = 2) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));

/* One (grading, wall) state, over all eight seeds. */
export function state(opts, wall, seeds = SEEDS) {
  const per = seeds.map((seed) => {
    const F = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, ...opts, seed });
    const m = P.measure(ctx, F, wall);
    return { F, m };
  });
  const m = per.map((p) => p.m);
  const pick = (f) => m.map(f);
  const clean = m.every((x) => x.boundary === 0 && x.shells === 1 && x.voxel06 === 1 && x.voxel03 === 1);
  const worstNonMan = Math.max(...pick((x) => x.nonManifold));
  return {
    opts, wall, uOv: per[0].F.uOv, seeds: seeds.length,
    lowestHoleU: med(pick((x) => x.lowestHoleU ?? 1)), lowestHoleURange: rng(pick((x) => x.lowestHoleU ?? 1)),
    below015: med(pick((x) => x.below015.holes)), below015Max: Math.max(...pick((x) => x.below015.holes)),
    basalHoles: med(pick((x) => x.basal.holes)), basalHolesRange: rng(pick((x) => x.basal.holes)),
    basalReal: med(pick((x) => x.basal.real)), basalRealRange: rng(pick((x) => x.basal.real)),
    basalSolid: med(pick((x) => x.basal.solid)), basalSolidRange: rng(pick((x) => x.basal.solid)),
    basalWall: med(pick((x) => x.basal.wallFraction)), basalWallRange: rng(pick((x) => x.basal.wallFraction)),
    basalAniso: med(pick((x) => x.basal.aniso ?? 0)),
    basalEdgeRangeMm: med(pick((x) => x.basal.edgeRangeMm)), basalOnLine: med(pick((x) => x.basal.onLine)),
    basalCells: med(pick((x) => x.basal.cells)), basalMedianOpen: med(pick((x) => x.basal.medianOpen)),
    tipCells: med(pick((x) => x.tip.cells)), below015Cells: Math.max(...pick((x) => x.below015.cells)),
    wallFraction: med(pick((x) => x.wallFraction)), wallFractionRange: rng(pick((x) => x.wallFraction)),
    anisoMid: med(pick((x) => x.anisoMid ?? 0)),
    tipReal: med(pick((x) => x.tip.real)), tipRealRange: rng(pick((x) => x.tip.real)),
    tipMedian: med(pick((x) => x.tip.medianOpen)), tipWall: med(pick((x) => x.tip.wallFraction)),
    capMm: med(pick((x) => x.capMm)), capMmRange: rng(pick((x) => x.capMm)), capFloorMm: m[0].capFloorMm,
    real: med(pick((x) => x.real)), holeMedian: med(pick((x) => x.holeMedian)), holeMin: Math.min(...pick((x) => x.holeMin)),
    tris: med(pick((x) => x.tris)), trisRange: rng(pick((x) => x.tris)),
    clean, worstNonMan,
    boundary: rng(pick((x) => x.boundary)), shells: rng(pick((x) => x.shells)), voxel06: rng(pick((x) => x.voxel06)), voxel03: rng(pick((x) => x.voxel03)),
  };
}

const HEAD = 'setting          | wall | lowest hole u | <0.15 | BASAL: holes  real  solid  wall  aniso  onLine  edgeRng | global wall | TIP: real  median  wall | cap mm | tris  | census';
const line = (name, s) => `${name.padEnd(16)} | ${s.wall.toFixed(1)}  | ${n2(s.lowestHoleU, 4)}        | ${String(s.below015).padStart(5)} | ` +
  `${String(s.basalHoles).padStart(12)} ${String(s.basalReal).padStart(5)} ${String(s.basalSolid).padStart(6)} ${(100 * s.basalWall).toFixed(0).padStart(4)}% ${n2(s.basalAniso).padStart(6)} ${String(s.basalOnLine).padStart(7)} ${n2(s.basalEdgeRangeMm).padStart(8)} | ` +
  `${(100 * s.wallFraction).toFixed(0).padStart(10)}% | ${String(s.tipReal).padStart(9)} ${n2(s.tipMedian).padStart(7)} ${(100 * s.tipWall).toFixed(0).padStart(4)}% | ${n2(s.capMm).padStart(6)} | ${String(s.tris).padStart(5)} | ` +
  `${s.clean ? 'CLEAN' : '**NOT CLEAN**'} b${s.boundary[1]} nm${s.worstNonMan} sh${s.shells[0]}-${s.shells[1]} vx${s.voxel06[1]}/${s.voxel03[1]}`;

/* ---------------- the inertness control ---------------- */
async function inert(baseDir) {
  const B = await import(pathToFileURL(path.resolve(baseDir, 'tools/bloom-voronoi-proto.mjs')).href);
  const cB = B.context({});
  let floats = 0, diffs = 0, states = 0;
  const cmp = (opts, wall, seed, useOpts) => {
    const Fh = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, ...opts, seed });
    const Fb = B.fieldSalvage(cB, N_CELLS, { u0: B.U0, seed });
    const a = P.cutThrough(ctx, Fh, wall).acc.pos, b = B.cutThrough(cB, Fb, wall).acc.pos;
    states++;
    if (a.length !== b.length) { diffs += Math.max(a.length, b.length); floats += Math.max(a.length, b.length); return; }
    floats += a.length;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) diffs++;
  };
  for (const wall of WALLS) for (const seed of SEEDS) cmp({}, wall, seed);
  console.log(`INERT AT THE DEFAULTS: ${diffs} of ${floats.toLocaleString('en-US')} floats differ over ${states} states (${SEEDS.length} seeds x ${WALLS.length} walls), head against ${baseDir}, Object.is.`);
  /* the positive control: the comparison must be able to fail */
  /* A LENGTH CHANGE AND A VALUE CHANGE MUST NOT SHARE ONE WORD (session 34): a grading move
     usually changes the TRIANGLE COUNT, and "N floats differ" over two arrays that cannot line
     up is a number meaning nothing. The control therefore says which of the two it got, and it
     is satisfied by either — both are proof that the option is reached. */
  let cFloats = 0, cDiffs = 0, cLen = false, cMsg = '';
  { const Fh = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, converge: 0.05, baseNarrow: 0.45, seed: SEEDS[0] });
    const Fb = B.fieldSalvage(cB, N_CELLS, { u0: B.U0, seed: SEEDS[0] });
    const a = P.cutThrough(ctx, Fh, 1.0).acc.pos, b = B.cutThrough(cB, Fb, 1.0).acc.pos;
    cFloats = a.length;
    if (a.length !== b.length) { cLen = true; cMsg = `the streams differ in LENGTH — ${a.length / 9} triangles against ${b.length / 9}`; }
    else { for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) cDiffs++; cMsg = `${cDiffs} of ${cFloats.toLocaleString('en-US')} floats differ at an identical triangle count`; }
  }
  console.log(`CONTROL (converge 0.05 x baseNarrow 0.45 on the head, the shipped field on the base): ${cMsg} — the option is reached, so the comparison can fail.`);
  const ok = diffs === 0 && (cLen || cDiffs > 0);
  console.log(ok ? 'PASS' : 'FAIL');
  if (!ok) process.exit(1);
}

/* ---------------- main ---------------- */
/* GUARDED, because the sheet tool IMPORTS `state()` from here: an unguarded top level would
   run the whole sweep every time a caller wanted one number out of it. */
const baseTree = IS_MAIN ? arg('--inert', null) : null;
if (!IS_MAIN) { /* imported — export the machinery and run nothing */ }
else if (baseTree) { await inert(baseTree); }
else {
  const out = { petal: { L: ctx.L, sheet: ctx.t, plainTris: ctx.plainTris, N: N_CELLS, seeds: SEEDS, uOv: null },
    shipped: { converge: P.CONVERGE_FRACTION, baseNarrow: P.BASE_NARROWING, baseReach: P.BASE_REACH, tipGamma: P.TIP_GAMMA },
    vSweep: [], baseSweep: [], grid: [] };
  console.log(`default petal ${ctx.L} x ${(2 * ctx.surface.profile.halfWidthAt(0.538)).toFixed(2)} mm, sheet ${ctx.t} mm, EXPORT mode; ${N_CELLS} cells; ${SEEDS.length} seeds; boundary FIXED at ROOT_BLEND_END.`);
  console.log(`shipped grading: converge ${P.CONVERGE_FRACTION}, baseNarrow ${P.BASE_NARROWING}, baseReach ${P.BASE_REACH}, tipGamma ${P.TIP_GAMMA}\n`);

  const V = QUICK ? [0, 0.10] : [0, 0.025, 0.05, 0.075, 0.10, 0.15, 0.20];
  console.log('1. THE BASAL V — `converge`, the fraction of the length the solid zone reaches UP THE MARGINS. Everything else shipped.');
  console.log(HEAD);
  for (const wall of (QUICK ? [1.0] : WALLS)) { for (const c of V) { const s = state({ converge: c }, wall); s.name = `V ${c.toFixed(3)}`; out.vSweep.push(s); out.petal.uOv = s.uOv; console.log(line(`V ${c.toFixed(3)}${c === P.CONVERGE_FRACTION ? ' *' : ''}`, s)); } console.log(''); }

  /* BOTH DIRECTIONS. Below 1 the cells at the base are SMALLER than the mid-blade spacing (the
     brief's "shrink toward both ends"); above 1 they are LARGER. The sweep runs both because a
     fixed printable wall makes the direction an open question rather than an obvious one. */
  const BN = QUICK ? [0.75, 0.35] : [1.80, 1.50, 1.25, 1.00, 0.85, 0.75, 0.60, 0.45, 0.35, 0.25];
  console.log('2. THE BASE CELL-SIZE RATE — `baseNarrow`, the fraction of the mid-blade spacing a cell has AT the boundary, relaxing back over `baseReach` (0.30 of the length). `tipGamma` untouched at 1.0. Basal V shipped at 0.10.');
  console.log(HEAD);
  for (const wall of (QUICK ? [1.0] : WALLS)) { for (const b of BN) { const s = state({ baseNarrow: b }, wall); s.name = `base ${b.toFixed(2)}`; out.baseSweep.push(s); console.log(line(`base ${b.toFixed(2)}${b === P.BASE_NARROWING ? ' *' : ''}`, s)); } console.log(''); }

  if (!QUICK) {
    const GRID = [];
    for (const c of [0, 0.025, 0.05, 0.10]) for (const b of [1.50, 1.25, 1.00, 0.75, 0.45]) GRID.push({ converge: c, baseNarrow: b });
    console.log('3. THE TWO TOGETHER. `V x base`; the shipped state is V 0.100 x base 0.75.');
    console.log(HEAD);
    for (const wall of WALLS) { for (const g of GRID) { const s = state(g, wall); s.name = `V${g.converge.toFixed(3)} b${g.baseNarrow.toFixed(2)}`; out.grid.push(s); console.log(line(s.name, s)); } console.log(''); }
  }
  const jf = arg('--json', null);
  if (jf) { fs.writeFileSync(jf, JSON.stringify(out, null, 1)); console.log(`json: ${jf}`); }
}
