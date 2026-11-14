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

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
// --root <dir>: measure the tree there (the drawn negative control's mutated copies, tools/verify-frame-drawn.mjs)
const ROOT = arg('--root') ? path.resolve(arg('--root')) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = await loadTree(ROOT);
T.SI = await import(pathToFileURL(path.join(ROOT, 'frame-svg-import.js')).href);
T.PH = await import(pathToFileURL(path.join(ROOT, 'frame-drawn-placeholders.js')).href);
T.DR = await import(pathToFileURL(path.join(ROOT, 'frame-drawn.js')).href);
const TEMPLATE = (await import('node:fs')).readFileSync(path.join(ROOT, 'docs/frame-drawing-template.svg'), 'utf8');
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
// round 4 (frame-forms.js): the composed placements, each element's outline built from the measured profiles
for (const [sk, q] of SK) ROWS.push([`${sk} forms`, { ...q, ornFlow: 'forms' }]);
ROWS.push(['rect forms, 300 mm', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'forms', printHeight: 300 }]);
// the hand-drawn filigree (frame-drawn.js): the template's PLACEHOLDER drawings bent along the forms round's placements
for (const [sk, q] of SK) ROWS.push([`${sk} drawn`, { ...q, ornFlow: 'drawn' }]);
ROWS.push(['rect drawn, 300 mm', { skeleton: 'rect', ornBottom: 'on', ornFlow: 'drawn', printHeight: 300 }]);
const only = arg('--only') ? new RegExp(arg('--only')) : null;

for (const [name, q] of ROWS) {
  if (only && !only.test(name)) continue;
  const t0 = Date.now();
  const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, filigree: 'scrolls', ...q }));
  const r = T.RL.buildRelief(m);
  const forms = q.ornFlow === 'forms', drawn = q.ornFlow === 'drawn';
  const mass = q.ornFlow === 'mass', composed = q.ornFlow === 'composed' || mass;
  const mt = flowMetrics(m, r, { RL: T.RL, FP: T.FP, print: composed || forms || drawn });
  const o = m.ornament;
  const g = o.groups[0];
  let mirror = true;
  if (g) g.curves.forEach((c, i) => { const mm = g.mirrored[i]; c.pts.forEach(([x, y], j) => { if (!Object.is(mm.pts[j][0], -x) || !Object.is(mm.pts[j][1], y)) mirror = false; }); });
  const c = mt.repetition.closest;
  console.log(`\n${name}  (${((Date.now() - t0) / 1000).toFixed(1)} s, ${mt.elements} elements a side, ${mt.print.tris.toLocaleString('en-US')} tris)`);
  rec(mt.print.boundary === 0, 'FW watertight', `boundary ${mt.print.boundary}`);
  if (forms) { formsClauses(o, mt); continue; }
  if (drawn) { drawnClauses(o, mt); continue; }
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

/* round 4's clauses: the mass's own (FC FT FB FP FM FV) and the FORMS':
     FE every C-scroll's volute winds ≥ 1.1 turns round a pierced eye ≥ FORMS.eyeHole across, and every closed
        curl (the foot) has a pierced hollow ≥ FORMS.eyeHole;
     FD the node motifs differ in kind: a fan at the meeting, a sheath at the flames' root, a curl-under at the
        stem's root — each present wherever the skeleton has its place, and no place with two of one kind;
     FR no two elements of one kind on a side share a shape (length within 5 %, turns within 0.08). */
function formsClauses(o, mt) {
  const FS = o.formsStats, E = FS.elements, FORMS = T.FF.FORMS;
  rec(mt.print.regions === 1, 'FC one region', `regions ${mt.print.regions}`);
  rec(mt.print.feature >= F - 0.1, 'FT narrowest solid feature', `${mt.print.feature.toFixed(3)} mm at the 0.2 mm raster (the open guarantees ${(2 * FORMS.open).toFixed(2)} mm)`);
  rec(mt.print.tris <= 1500000, 'FB budget', `${(100 * mt.print.tris / 1500000).toFixed(1)} %`);
  rec(mt.coverage.slit >= F, 'FP no near-slit in plan (outside the frame)', `narrowest pierced neck ${mt.coverage.slit.toFixed(2)} mm (whole plan: ${mt.print.slit.toFixed(2)} mm)`);
  const el = o.elements.find((e) => e.mass), P = el.positions, key = (x, y, z) => `${x},${y},${z}`, S = new Set();
  for (let k = 0; k < P.length; k += 3) S.add(key(P[k], P[k + 1], P[k + 2]));
  let asym = 0; for (let k = 0; k < P.length; k += 3) if (!S.has(key(-P[k] === 0 ? 0 : -P[k], P[k + 1], P[k + 2])) && !S.has(key(-P[k], P[k + 1], P[k + 2]))) asym++;
  rec(asym === 0, 'FM the forms mirrored to the bit', `${asym} of ${P.length / 3} vertices with no (−x, y, z) twin`);
  rec(mt.coverage.fill >= 0.493 && mt.coverage.fill <= 0.693, 'FV coverage within 10 points of 2.webp (59.3 %)', `fill ${(100 * mt.coverage.fill).toFixed(1)} % of the zone, attached ${(100 * mt.coverage.attach).toFixed(1)} % of the edge`);
  const Cs = E.filter((e) => e.kind === 'C'), curls = E.filter((e) => e.closed);
  const badC = Cs.filter((c) => !(c.turns >= 1.1 - 1e-9 && c.eye >= FORMS.eyeHole - 1e-9 && c.pierced));
  rec(Cs.length > 0 && !badC.length && curls.every((c) => c.hollow * o.length >= FORMS.eyeHole - 1e-9), 'FE every C volute ≥ 1.1 turns round a pierced eye; every closed curl pierced', `${Cs.length} C's (eyes ${Cs.map((c) => c.eye.toFixed(2)).join(' / ')} mm, turns ${Cs.map((c) => c.turns.toFixed(2)).join(' / ')})${curls.length ? `, ${curls.length} closed curl${curls.length > 1 ? 's' : ''} (hollow ${curls.map((c) => (c.hollow * o.length).toFixed(2)).join(' / ')} mm)` : ''}`);
  const kinds = FS.nodes || [];
  const want = FS.nodePlaces || [];
  const dup = want.some((pl) => kinds.filter((k) => k.place === pl.place).length !== 1);
  const distinct = new Set(kinds.map((k) => k.kind)).size;
  rec(kinds.length > 0 && !dup && distinct === Math.min(3, new Set(want.map((w) => w.kind)).size), 'FD node motifs differ in kind by place', kinds.map((k) => `${k.kind} at ${k.place}`).join(', '));
  let share = 0, pairs = 0;
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    if (E[i].kind !== E[j].kind || E[i].L == null) continue; pairs++;
    if (Math.abs(E[i].L - E[j].L) / ((E[i].L + E[j].L) / 2) < 0.05 && Math.abs(E[i].turns - E[j].turns) < 0.08) share++;
  }
  rec(share === 0, 'FR no two elements of one kind share a shape', `${share} of ${pairs} same-kind pairs`);
}

/* the HAND-DRAWN filigree's clauses (frame-drawn.js, the template's placeholders): the relief's own (FC FT FB FP FM
   FV, as the forms round's) and the DRAWN ones:
     DI the drawing imports with no error and no warning (frame-svg-import.js: every outline and hole closed and
        simple, every hole ≥ the floor, the units read off the ruler) — and the template's copy the generator reads
        (frame-drawn-placeholders.js) IS docs/frame-drawing-template.svg, to the byte;
     DP every slot the forms round records is placed (none left out), and every body with an END has its volute;
     DW the bend folds nothing: every placed part's outline, bent onto its slot, is still a SIMPLE ring (no
        crossing), and no point was held at the fold limit;
     DD depth stacks: where a part lies over a lower one, the LEVEL field the relief is built from (blurred, before
        the edge rounding and the detail ridges) stands at least ¾ of DRAWN.stack above the lower part's own height
        there, read on the shared region's interior (median) — the front part lies OVER it. (Read on the finished
        relief instead, the comparison is confounded by the edge rounding of a thin coil and by a back leaf's own
        midrib; measured, it read −0.16 mm on a pair the level field stacks by 0.4.)
     DH every drawn hole is open: no solid cell strictly inside a hole (one cell in from its edge) is owned by its
        element or anything beneath it. */
function drawnClauses(o, mt) {
  const S = o.drawnStats, DBG = o.drawnDebug;
  rec(mt.print.regions === 1, 'FC one region', `regions ${mt.print.regions}`);
  rec(mt.print.feature >= F - 0.1, 'FT narrowest solid feature', `${mt.print.feature.toFixed(3)} mm at the 0.2 mm raster (the open guarantees ${(2 * T.FF.FORMS.open).toFixed(2)} mm)`);
  rec(mt.print.tris <= 1500000, 'FB budget', `${(100 * mt.print.tris / 1500000).toFixed(1)} %`);
  rec(mt.coverage.slit >= F, 'FP no near-slit in plan (outside the frame)', `narrowest pierced neck ${mt.coverage.slit.toFixed(2)} mm (whole plan: ${mt.print.slit.toFixed(2)} mm)`);
  const el = o.elements.find((e) => e.mass), P = el.positions, key = (x, y, z) => `${x},${y},${z}`, SS = new Set();
  for (let k = 0; k < P.length; k += 3) SS.add(key(P[k], P[k + 1], P[k + 2]));
  let asym = 0; for (let k = 0; k < P.length; k += 3) if (!SS.has(key(-P[k] === 0 ? 0 : -P[k], P[k + 1], P[k + 2])) && !SS.has(key(-P[k], P[k + 1], P[k + 2]))) asym++;
  rec(asym === 0, 'FM the drawn relief mirrored to the bit', `${asym} of ${P.length / 3} vertices with no (−x, y, z) twin`);
  rec(mt.coverage.fill >= 0.493 && mt.coverage.fill <= 0.693, 'FV coverage within 10 points of 2.webp (59.3 %)', `fill ${(100 * mt.coverage.fill).toFixed(1)} % of the zone, attached ${(100 * mt.coverage.attach).toFixed(1)} % of the edge`);
  const errs = S.problems.filter((q) => q.level === 'error'), warns = S.problems.filter((q) => q.level === 'warn');
  const same = T.PH.PLACEHOLDER_SVG === TEMPLATE;
  rec(!errs.length && !warns.length && same, 'DI the placeholder drawing imports clean; the generator\'s copy is the template', `${S.drawn.length} drawings (${S.unitsPerMm} units/mm), ${errs.length} errors, ${warns.length} warnings${errs.concat(warns).length ? ' — ' + errs.concat(warns).slice(0, 2).map((q) => `${q.element || ''} ${q.message}`).join('; ') : ''}; frame-drawn-placeholders.js ${same ? '=' : '≠'} docs/frame-drawing-template.svg`);
  const bodies = S.placed.filter((p) => !/— end$/.test(p.slot)), ends = S.placed.filter((p) => /— end$/.test(p.slot));
  const wantEnds = bodies.filter((p) => /^(crest C|shoulder C|corner C|flame \d|foot|stem)/.test(p.slot));
  const leftOut = o.told.filter((t) => /left out|nothing drawn/.test(t));
  rec(bodies.length === S.slots && !leftOut.length && wantEnds.every((b) => b.end), 'DP every slot placed; every body with an end has its volute', `${bodies.length} of ${S.slots} slots placed, ${ends.length} volute ends on ${wantEnds.length} bodies that take one${leftOut.length ? ' — ' + leftOut.join('; ') : ''}`);
  let crossed = 0, crossAt = null; const held = bodies.reduce((a, p) => a + (p.held || 0), 0);
  for (const e of DBG.els) for (const r of e.rings) { const x = T.SI.selfCrossings(r, 1); if (x.length) { crossed++; if (!crossAt) crossAt = `${e.from} near (${x[0][0].toFixed(1)}, ${x[0][1].toFixed(1)})`; } }
  const foldMax = Math.max(...bodies.filter((p) => p.foldMax != null).map((p) => p.foldMax));
  rec(!crossed && !held, 'DW the bend folds nothing', `${crossed} of ${DBG.els.reduce((a, e) => a + e.rings.length, 0)} bent rings cross themselves${crossAt ? ' (' + crossAt + ')' : ''}, ${held} points held at the fold limit; the worst κ·y ${foldMax.toFixed(2)} (fold at 1)`);
  const { raw, pri, g } = DBG;
  const med = (a) => { if (!a.length) return NaN; const b = Float64Array.from(a).sort(); return b[b.length >> 1]; };
  let pairs = 0, badPairs = 0, worst = Infinity;
  const els = DBG.els.filter((e) => e.cells && e.cells.length), stack = T.DR.DRAWN.stack;
  for (let i = 0; i < els.length; i++) for (let j = 0; j < els.length; j++) {
    const A = els[i], B = els[j]; if (!(A.pri > B.pri)) continue;
    const inA = new Set(A.cells), sh = new Map();
    B.cells.forEach((k, q) => { if (inA.has(k)) sh.set(k, B.est[q]); });
    // the shared region's INTERIOR (3 cells in from its edge, clear of the level field's blur)
    const deep = [...sh.keys()].filter((k) => [3, -3, 3 * g.nx, -3 * g.nx, 2 + 2 * g.nx, 2 - 2 * g.nx, -2 + 2 * g.nx, -2 - 2 * g.nx].every((d) => sh.has(k + d)));
    if (deep.length < 20) continue;
    pairs++;
    const d = med(deep.map((k) => raw[k] - sh.get(k)));
    worst = Math.min(worst, d); if (!(d >= 0.75 * stack)) badPairs++;
  }
  // DL: a part DECLARED deeper in front owns the cells it shares with one declared further back
  let dlPairs = 0, dlBad = 0; const rank = { back: 0, mid: 1, front: 2 };
  for (const A of els) for (const B of els) { if (!(rank[A.depth] > rank[B.depth])) continue; const inA = new Set(A.cells); let shared = 0, lost = 0; for (const k of B.cells) if (inA.has(k)) { shared++; if (pri[k] !== A.pri && pri[k] < A.pri) lost++; } if (shared < 20) continue; dlPairs++; if (lost || !(A.pri > B.pri)) dlBad++; }
  rec(dlPairs > 0 && !dlBad, 'DL a deeper-declared part lies over a shallower one', `${dlPairs} overlapping pairs of different declared depth, ${dlBad} where the deeper part does not own the shared cells`);
  // DE: every END (a volute placed whole) curls to the side its slot's own end curled to (the forms round's centre)
  let deN = 0, deBad = 0;
  for (const b of S.placed.filter((p) => p.end && p.cen && p.endT && p.endAt)) {
    deN++;   // the body's OWN end (two slots can share a role name — the rectangle's two corner C's)
    const cr = (q) => b.endT[0] * (q[1] - b.endP[1]) - b.endT[1] * (q[0] - b.endP[0]);
    if (Math.sign(cr(b.endAt)) !== Math.sign(cr(b.cen))) deBad++;
  }
  rec(deN > 0 && !deBad, 'DE every volute end curls to its slot\'s own side', `${deN} ends, ${deBad} curling to the other side of their body's end tangent`);
  rec(pairs > 0 && !badPairs, 'DD depth stacks: a part over a lower one stands a step above it', `${pairs} overlapping pairs (higher priority over lower), ${badPairs} not a step above; the level over the shared cells less the back part's own there: worst median ${worst.toFixed(2)} mm (the step ${stack} mm, the bar ${(0.75 * stack).toFixed(2)})`);
  let shut = 0, holeCells = 0;
  const { nx, ny, n, c, y0 } = g;
  for (const h of DBG.holes.filter((q) => q.poly)) {
    let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity; for (const [x, y] of h.poly) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
    for (let j = Math.max(0, Math.floor((by0 - y0) / c)); j <= Math.min(ny - 1, Math.ceil((by1 - y0) / c)); j++) for (let i = Math.max(0, Math.floor(bx0 / c) + n); i <= Math.min(nx - 1, Math.ceil(bx1 / c) + n); i++) {
      const q = [(i - n) * c, y0 + j * c]; if (!T.SI.pointInRing(q, h.poly)) continue;
      let dm = Infinity; for (let a = 0; a < h.poly.length; a++) { const p0 = h.poly[a], p1 = h.poly[(a + 1) % h.poly.length], dx = p1[0] - p0[0], dy = p1[1] - p0[1], t = Math.max(0, Math.min(1, ((q[0] - p0[0]) * dx + (q[1] - p0[1]) * dy) / (dx * dx + dy * dy || 1e-12))); dm = Math.min(dm, Math.hypot(q[0] - p0[0] - t * dx, q[1] - p0[1] - t * dy)); }
      if (dm <= 1.5 * c) continue;
      holeCells++; const k = j * nx + i;
      if (DBG.Rg[k] && pri[k] <= h.pri) shut++;
    }
  }
  rec(holeCells > 0 && !shut, 'DH every drawn hole is open', `${DBG.holes.filter((q) => q.poly).length} holes (${holeCells} cells inside), ${shut} solid and owned by their element or beneath`);
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
