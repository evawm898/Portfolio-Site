#!/usr/bin/env node
/* ===================================================================
   bloom-texture-lab-measure.mjs — PRINT REALITY FOR THE SURFACE-TEXTURE
   PROTOTYPE (discovery, NOT a gate; nothing runs it in CI).

   For each demo state x arm (A post-pass / B emitter field), OUTWARD relief
   (the one ruled mode — discovery doc §0 ruling 2; the discovery's inward /
   centred / emboss rows are its record, docs/data/bloom-surface-texture-
   measure.json, and this tool no longer makes them) is applied by bloom-texture-lab-core.js and two lengths are read off
   the DISPLACED mesh at every `--every`-th vertex, against the SAME vertex on
   the undisplaced subdivided mesh (same topology, so the comparison is per
   vertex rather than per population):

     WALL  — distance along the inward normal to the vertex's OWN shell (the
             material under that point). Floor: MIN_FEATURE_MM (1.0 mm).
     GAP   — distance along the outward normal to ANY triangle (a neighbour
             organ, the far side of a Voronoi hole). Floor: MIN_FEATURE_MM;
             on a hole rim, the hole bar 1.50 mm.

   "newly under" counts a vertex that was at or over the floor before relief
   and is under it after. A vertex already under (the bead's own flanks read
   under 1.0 along their normal by geometry; overlapping shells read a gap of
   0 by design) is NOT counted, and its baseline is reported instead.

   SAMPLING, NAMED (CLAUDE.md, durable rule 1): EXPORT mode, the split
   --split (default 'rows', T1's; 'redgreen' is the discovery's), edge target
   --edge (default 0.4 mm), every --every-th vertex (default 5), rays capped at
   2.5 mm. A per-vertex ray measure, not a medial-axis thickness: at a vertex
   whose normal is oblique to the sheet it reads LONGER than the sheet.

   THE CONFIGS. Each state at 0.4 mm and a 2.0 mm feature; the whole bloom
   ALSO at 0.6 mm and 2.5 mm (`whole@0.6`), the discovery's own setting for it,
   so its rows compare like for like with §4's (at 0.4 mm the red-green split
   made it 1.92 M triangles; the rows split makes it 420 k).

   Usage: node tools/bloom-texture-lab-measure.mjs [--out <json>] [--every N]
          [--edge MM] [--split rows|redgreen] [--no-pairs] [--only default,whole,whole@0.6,infill,tube]
          [--quick] [--resume]
   =================================================================== */
import fs from 'node:fs';
import * as C from '../bloom-texture-lab-core.js';
import * as L from '../bloom-texture-lab-lattice.js';
import { DEFAULTS } from '../bloom-registry.js';
import { MIN_FEATURE_MM } from '../bloom-geometry.js';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const EVERY = Number(arg('--every', 5));
const EDGE = Number(arg('--edge', 0.4));
const OUT = arg('--out', null);
const SPLIT = arg('--split', 'rows');
/* --no-pairs: the rows split with every triangle cut alone (no quad pairs) — T1's intermediate */
const PAIRS = !args.includes('--no-pairs');
const ALL = ['default', 'whole', 'whole@0.6', 'infill', 'tube'];
const ONLY = (arg('--only', ALL.join(','))).split(',');
const QUICK = args.includes('--quick');
/* --lattice (T2): the mesh is B's own lattice (bloom-texture-lab-lattice.js)
   for every petal, sepal and leaf panel, T1's snapped split for the rest, and
   B's direction on a lattice skin vertex is the EXACT sheet normal the lattice
   evaluated it from — not the nearest ladder sample. --split is then ignored. */
const LATTICE = args.includes('--lattice');
/* --resume: the out file is rewritten after EVERY run with complete:false, and
   a resumed run skips every (state, type, H, arm, mode) already in it. A
   container restart then costs one run, not the sweep (CLAUDE.md: background
   work does not survive the end of a turn here; run in timeout-bounded
   foreground chunks). */
const RESUME = args.includes('--resume');
/* `whole@0.6` is the whole bloom at the discovery's own setting for it */
const STATE_EDGE = { 'whole@0.6': 0.6 };
const STATE_LAMBDA = { 'whole@0.6': 2.5 };
const HOLE_BAR_MM = 1.5;
const TMAX = 2.5;

const CLASSES = ['skin', 'bead', 'holeRim', 'rod', 'hub', 'stem', 'tubeRing', 'other'];
function classOf(prep, v) {
  if (C.ORGANS[prep.vOrgan[v]] === 'tube') return 'tubeRing';
  const f = C.FEATURES[prep.vFeat[v]];
  if (f === 'skin' || f === 'cellSkin') return 'skin';
  if (f === 'bead' || f === 'cellMargin') return 'bead';
  if (f === 'holeRim' || f === 'rod' || f === 'hub' || f === 'stem') return f;
  return 'other';
}

const RUNS = [];
const ARMS = [['A', 'outward'], ['B', 'outward']];
const B_MASKS = { maskBeads: true, maskHoleRims: true, maskFeet: true, maskCreases: true, fadeMm: 0.6 };

const report = (RESUME && OUT && fs.existsSync(OUT)) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { split: LATTICE ? 'lattice' : SPLIT, pairs: PAIRS, edgeMm: EDGE, every: EVERY, tMax: TMAX, floorMm: MIN_FEATURE_MM, holeBarMm: HOLE_BAR_MM, states: {} };
if (report.split !== (LATTICE ? 'lattice' : SPLIT)) throw new Error(`--resume: ${OUT} was measured on the ${report.split} split, not ${SPLIT}`);
report.complete = false;
const save = () => { if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); };
const runKey = (r) => `${r.type}|${r.heightMm}|${r.arm}|${r.mode}`;
for (const name of ONLY) {
  const state = { ...DEFAULTS, ...C.DEMO_STATES[name.split('@')[0]] };
  const typesFor = (name === 'default' && !QUICK) ? C.RELIEF_TYPES : ['pebble'];
  const heightsFor = (name === 'default' && !QUICK) ? [0.1, 0.2, 0.3, 0.5] : [0.3];
  const wanted = [];
  for (const type of typesFor) for (const H of heightsFor) for (const [arm, mode] of ARMS) if (type === 'pebble' || H === 0.3) wanted.push(`${type}|${H}|${arm}|${mode}`);
  const have = new Set(((report.states[name] || {}).runs || []).map(runKey));
  if (wanted.every((k) => have.has(k))) { console.log(`== ${name}: complete in ${OUT}, skipped`); continue; }
  const t0 = Date.now();
  const edge = STATE_EDGE[name] ?? EDGE, lambda = STATE_LAMBDA[name] ?? 2.0;
  let soup, prep;
  if (LATTICE) { const B = await L.buildLattice(state, edge, { record: true }); soup = B.soup; prep = C.prepare(soup, edge, { lattice: B.ctx }); }
  else { soup = C.buildTagged(state); prep = C.prepare(soup, edge, { split: SPLIT, pairs: PAIRS }); }
  const base = C.wallAndGap(prep, prep.P, { every: EVERY, tMax: TMAX });
  const cls = base.idx.map((v) => classOf(prep, v));
  const st = report.states[name] = { shippedTris: LATTICE ? C.buildTagged(state).triCount : soup.triCount, subdividedTris: prep.tri.length / 3, edgeMm: edge, lambdaMm: lambda, split: LATTICE ? 'lattice' : SPLIT, exactMidVertices: prep.exactMid, baselineCensus: C.edgeCensus(prep.P, prep.tri), baseline: {}, runs: (report.states[name] || {}).runs || [] };
  for (const c of CLASSES) {
    const w = [], g = [];
    base.idx.forEach((v, i) => { if (cls[i] === c) { w.push(base.wall[i]); g.push(base.gap[i]); } });
    if (w.length) st.baseline[c] = { n: w.length, minWall: Math.min(...w), underWall: w.filter((x) => x < MIN_FEATURE_MM).length, minGap: Math.min(...g) };
  }
  console.log(`== ${name}: shipped ${st.shippedTris} tris -> ${prep.tri.length / 3} at ${edge} mm, ${st.split}${LATTICE ? ` (${prep.exactMid} vertices on the exact sheet normal)` : ' split'} (${Date.now() - t0} ms)`);
  for (const type of typesFor) for (const H of heightsFor) for (const [arm, mode] of ARMS) {
    if (type !== 'pebble' && H !== 0.3) continue;
    if (have.has(`${type}|${H}|${arm}|${mode}`)) continue;
    const t1 = Date.now();
    const d = C.displace(prep, arm, { type, lambda, heightMm: H, mode, ...B_MASKS });
    const census = C.edgeCensus(d.P, prep.tri);
    const after = C.wallAndGap(prep, d.P, { every: EVERY, tMax: TMAX });
    const per = {};
    const pct = (arr, q) => { if (!arr.length) return null; const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
    for (const c of CLASSES) {
      let n = 0, newlyWall = 0, newlyGap = 0, newlyHole = 0, folds = 0;
      const w1s = [], thins = [], g1s = [];
      after.idx.forEach((v, i) => {
        if (cls[i] !== c) return;
        n++;
        const w0 = base.wall[i], w1 = after.wall[i], g0 = base.gap[i], g1 = after.gap[i];
        /* a capped baseline (no material within TMAX along an in-plane bead
           normal) is not a wall, and a ray that newly grazes a neighbouring
           bump there is not a thinning — only finite baselines count */
        if (w0 < TMAX) {
          w1s.push(w1); thins.push(w0 - w1);
          if (w0 >= MIN_FEATURE_MM && w1 < MIN_FEATURE_MM) newlyWall++;
          if (w0 >= 0.5 && w1 < 0.05) folds++;
        }
        if (g0 < TMAX) {
          g1s.push(g1);
          if (g0 >= MIN_FEATURE_MM && g1 < MIN_FEATURE_MM) newlyGap++;
          if (c === 'holeRim' && g0 >= HOLE_BAR_MM && g1 < HOLE_BAR_MM) newlyHole++;
        }
      });
      const r4 = (x) => (x == null ? null : +x.toFixed(4));
      if (n) per[c] = { n, finiteWall: w1s.length, newlyWall, folds, wallP01: r4(pct(w1s, 0.01)), wallMin: r4(pct(w1s, 0)), thinP99: r4(pct(thins, 0.99)), thinMax: r4(pct(thins, 1 - 1e-12)), newlyGap, gapP01: r4(pct(g1s, 0.01)), ...(c === 'holeRim' ? { newlyUnderHoleBar: newlyHole } : {}) };
    }
    const run = { type, heightMm: H, arm, mode, census, per };
    st.runs.push(run); save();
    const brief = (c) => per[c] ? ` | ${c} newly<1 ${per[c].newlyWall}/${per[c].finiteWall} p01 ${per[c].wallP01} thinP99 ${per[c].thinP99} folds ${per[c].folds} gapNewly ${per[c].newlyGap}${c === 'holeRim' ? ` hole<1.5 ${per[c].newlyUnderHoleBar}` : ''}` : '';
    console.log(`  ${type.padEnd(8)} H ${H} ${arm} ${mode.padEnd(7)} bnd ${census.boundary} nm ${census.nonManifold}${CLASSES.map(brief).join('')} (${Date.now() - t1} ms)`);
  }
}
report.complete = ALL.every((n) => report.states[n] && report.states[n].runs.length === (n === 'default' && !QUICK ? 12 : 2));
save();
console.log(report.complete ? 'done (complete)' : 'done (partial — run again with --resume)');
