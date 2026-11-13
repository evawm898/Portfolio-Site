#!/usr/bin/env node
/* verify-frame-flow.mjs — the flow study's gate (docs/frame-flow-study.md §6).
   Node only, no browser. The flow model (frame-flow.js) runs only under the
   hidden param `ornFlow` ('band' | 'contour'); with it absent every frame
   builds as on `main`, by branch.

   ROWS: every default skeleton (oval and rectangle with the bottom run on,
   the arch as it ships) × both layouts, plus the variants a reader of the
   model would reach for: hierarchy 0, leaves off, a 300 mm print, the oval
   with its bottom run off (a flow that runs to a non-source end), and the
   rectangle with its corners off (the corner flows root with no rosette).

     FW watertight: boundary edges = 0 on the welded float32 bytes.
     FC ONE connected region (the relief gate's voxel fill, re-read at 0.2).
     FT the thinnest emitted wire ≥ MIN_FEATURE_MM.
     FB the relief ≤ the 1.5 M triangle budget.
     FH every hand-off is G1 and G2 on the EMITTED centrelines: the child's
        first stations against the parent's nearest — tangent jump ≤ 2°,
        curvature jump ≤ 0.05 /mm, the child's root ≤ 0.5 mm off the parent.
     FM the mirror to the bit: every left wire is its right wire's (−x, y).
     FR repetition: no two scroll elements on one side share a shape (length
        within 5 %, turns within 0.08, curvature profile RMS within 0.15 —
        tools/frame-flow-measure.mjs's tolerances); the closest pair printed.
   COMPOSED rows (ornFlow 'composed', frame-compose.js — round 2: silhouette,
   partition, volutes, sources, leaves): FW FC FT FB FM FR as above, and in
   place of FH (a composed scroll is double-ended — nothing forks off it):
     FN every scroll the partition plans is BUILT (none given up).
     FK every hand-off is two back-to-back volutes whose wires OVERLAP by at
        least half a feature (F/2) with their tangents within 6° there.
     FP the narrowest empty neck in plan (measurePrint's slit, cell 0.2 mm,
        the plan outside included) is ≥ MIN_FEATURE_MM: no near-slit.
     FF0 (with --base <worktree of main>) the param ABSENT is main: the relief
        STL bytes and the SVG string of the default rows (three skeletons,
        filigree off / the rinceau / the groups) identical to that tree's.

   Mutants the flow code will need (docs/frame-flow-study.md §6; not built in
   the study): the fork moved off the parent (FH), the child's curvature not
   inherited (FH), the mirror broken (FM), every element one length (FR), the
   envelope ignored in contour (a new clause), a flow cut at its first element
   (a new count clause), the settle's clearance check removed (FW/FC by a
   graze, or a slit clause). */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTree, flowMetrics } from './frame-flow-measure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const T = await loadTree(ROOT);
const F = (await import(pathToFileURL(path.join(ROOT, 'frame-registry.js')).href)).MIN_FEATURE_MM;
let fails = 0;
const rec = (ok, name, detail) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const SK = [['oval', { skeleton: 'oval', ornBottom: 'on' }], ['rect', { skeleton: 'rect', ornBottom: 'on' }], ['arch', {}]];
const ROWS = [];
for (const [sk, q] of SK) for (const mode of ['band', 'contour']) ROWS.push([`${sk} ${mode}`, { ...q, ornFlow: mode }]);
ROWS.push(['oval contour, hierarchy 0', { skeleton: 'oval', ornBottom: 'on', ornFlow: 'contour', ornHierarchy: 0 }]);
ROWS.push(['rect band, leaves off', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'band', ornLeaves: 'off' }]);
ROWS.push(['oval contour, 300 mm', { skeleton: 'oval', ornBottom: 'on', ornFlow: 'contour', printHeight: 300 }]);
ROWS.push(['oval band, bottom off', { skeleton: 'oval', ornFlow: 'band' }]);
ROWS.push(['rect contour, corners off', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'contour', ornCorners: 'off' }]);
for (const [sk, q] of SK) ROWS.push([`${sk} composed`, { ...q, ornFlow: 'composed' }]);
ROWS.push(['oval composed, leaves off', { skeleton: 'oval', ornBottom: 'on', ornFlow: 'composed', ornLeaves: 'off' }]);
ROWS.push(['rect composed, 300 mm', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'composed', printHeight: 300 }]);
// round 3 (frame-mass.js): the composed spines built as carved MASS
for (const [sk, q] of SK) ROWS.push([`${sk} mass`, { ...q, ornFlow: 'mass' }]);
ROWS.push(['rect mass, 300 mm', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'mass', printHeight: 300 }]);
const only = arg('--only') ? new RegExp(arg('--only')) : null;

for (const [name, q] of ROWS) {
  if (only && !only.test(name)) continue;
  const t0 = Date.now();
  const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, filigree: 'scrolls', ...q }));
  const r = T.RL.buildRelief(m);
  const mass = q.ornFlow === 'mass', composed = q.ornFlow === 'composed' || mass;
  const mt = flowMetrics(m, r, { RL: T.RL, FP: T.FP, print: composed });
  const o = m.ornament;
  const g = o.groups[0];
  let mirror = true;
  if (g) g.curves.forEach((c, i) => { const mm = g.mirrored[i]; c.pts.forEach(([x, y], j) => { if (!Object.is(mm.pts[j][0], -x) || !Object.is(mm.pts[j][1], y)) mirror = false; }); });
  const c = mt.repetition.closest;
  console.log(`\n${name}  (${((Date.now() - t0) / 1000).toFixed(1)} s, ${mt.elements} elements a side, ${mt.print.tris.toLocaleString('en-US')} tris)`);
  rec(mt.print.boundary === 0, 'FW watertight', `boundary ${mt.print.boundary}`);
  rec(mt.print.regions === 1, 'FC one region', `regions ${mt.print.regions}`);
  if (mass) rec(mt.print.feature >= F - 0.1, 'FT narrowest solid feature (no wire: the mass)', `${mt.print.feature.toFixed(3)} mm at the 0.2 mm raster (the open guarantees ${(2 * T.MS.MASS.open).toFixed(2)} mm)`);
  else rec(mt.thinnest >= F - 1e-9, 'FT thinnest wire', `${mt.thinnest.toFixed(3)} mm`);
  rec(mt.print.tris <= 1500000, 'FB budget', `${(100 * mt.print.tris / 1500000).toFixed(1)} %`);
  if (composed) {
    const S = o.flow.scrolls, H = o.flow.handoffs.filter((h) => !h.fill);
    rec(S.length > 0 && S.every((x) => x.built), 'FN every planned scroll built', `${S.filter((x) => x.built).length} of ${S.length}`);
    const worstOv = H.length ? Math.min(...H.map((h) => h.overlap)) : NaN, worstT = H.length ? Math.max(...H.map((h) => h.tanDeg)) : NaN;
    if (!mass) rec(H.length > 0 && worstOv >= F / 2 && worstT <= 6, 'FK hand-offs overlap + tangent', `${H.length} hand-offs, overlap ≥ ${worstOv.toFixed(2)} mm, tangent ≤ ${worstT.toFixed(2)}°`);
    else { const MH = o.massStats.handoffs; rec(MH.length === H.length && MH.every((h) => h.joined) && worstT <= 6, 'FK hand-offs joined IN THE MASS + tangent', `${MH.filter((h) => h.joined).length} of ${MH.length} hand-offs solid between the two volutes' centrelines (centre gap ≤ ${Math.max(...MH.map((h) => h.centreGap)).toFixed(2)} mm; the spines' own wire overlap ≥ ${worstOv.toFixed(2)} mm), tangent ≤ ${worstT.toFixed(2)}°`); }
    if (!mass) rec(mt.print.slit >= F, 'FP no near-slit in plan', `narrowest empty neck ${mt.print.slit.toFixed(2)} mm`);
    else {
      // the mass's piercings: the narrowest empty neck OUTSIDE the frame's silhouette (the frame counted solid —
      // measurePrint's whole-plan slit also reads the arch's own head/light cusp, 0.20 mm with the ornament absent)
      rec(mt.coverage.slit >= F, 'FP no near-slit in plan (outside the frame)', `narrowest pierced neck ${mt.coverage.slit.toFixed(2)} mm (whole plan, frame included: ${mt.print.slit.toFixed(2)} mm)`);
      const el = o.elements.find((e) => e.mass), P = el.positions, key = (x, y, z) => `${x},${y},${z}`, S = new Set();
      for (let k = 0; k < P.length; k += 3) S.add(key(P[k], P[k + 1], P[k + 2]));
      let asym = 0; for (let k = 0; k < P.length; k += 3) if (!S.has(key(-P[k] === 0 ? 0 : -P[k], P[k + 1], P[k + 2])) && !S.has(key(-P[k], P[k + 1], P[k + 2]))) asym++;
      rec(asym === 0, 'FM the mass mirrored to the bit', `${asym} of ${P.length / 3} vertices with no (−x, y, z) twin`);
      rec(mt.coverage.fill >= 0.493 && mt.coverage.fill <= 0.693, 'FV coverage within 10 points of 2.webp (59.3 %)', `fill ${(100 * mt.coverage.fill).toFixed(1)} % of the zone, attached ${(100 * mt.coverage.attach).toFixed(1)} % of the edge`);
    }
  } else
  rec(mt.elements > 0 && mt.continuity.n > 0 && mt.continuity.maxTanDeg <= 2 && mt.continuity.maxKap <= 0.05 && mt.continuity.maxOff <= 0.5, 'FH hand-offs G1 + G2', `${mt.continuity.n} hand-offs, tangent ≤ ${mt.continuity.maxTanDeg.toFixed(2)}°, curvature ≤ ${mt.continuity.maxKap.toFixed(4)}/mm, root off ≤ ${mt.continuity.maxOff.toFixed(3)} mm`);
  rec(mirror, 'FM mirror to the bit');
  rec(mt.repetition.share === 0, 'FR no two elements share a shape', `${mt.repetition.share} of ${mt.repetition.pairs} pairs${c ? `; closest d ${c.d.toFixed(2)} (L ${c.La.toFixed(1)} / ${c.Lb.toFixed(1)} mm, turns ${c.Ta.toFixed(2)} / ${c.Tb.toFixed(2)})` : ''}`);
}

const base = arg('--base');
if (base) {
  const B = await loadTree(path.resolve(base));
  console.log('\nFF0 the param absent is main');
  for (const [sk, q] of SK) for (const [nm, x] of [['filigree off', { filigree: 'none' }], ['the rinceau', { filigree: 'scrolls' }], ['the groups', { filigree: 'scrolls', ornLayout: 'groups' }]]) {
    const bytes = (TT) => { const m = TT.FL.withOrnament(TT.G.buildFrame({ ...TT.G.DEFAULTS, ...q, ...x })); return { stl: TT.RL.exportStl(TT.RL.buildRelief(m)), svg: TT.G.exportSvg(m).svg }; };
    const a = bytes(T), b = bytes(B);
    const same = a.stl.length === b.stl.length && a.stl.every((v, i) => v === b.stl[i]) && a.svg === b.svg;
    rec(same, `FF0 ${sk} · ${nm}`, `${a.stl.length.toLocaleString('en-US')} STL bytes, SVG ${a.svg.length.toLocaleString('en-US')} chars`);
  }
} else console.log('\nFF0 skipped (no --base <worktree of main>)');
console.log(`\n${fails ? `FAIL — ${fails} clause(s)` : 'PASS'}`);
process.exit(fails ? 1 : 0);
