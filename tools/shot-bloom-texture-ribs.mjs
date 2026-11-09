#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-ribs.mjs — THE RIBS LOOK SHEET (docs/bloom-surface-texture-ribs.md).

     node tools/shot-bloom-texture-ribs.mjs docs/img/bloom-texture-ribs.png
          [--data docs/data/bloom-texture-ribs.json]

   Every cell is a NODE build of the RIBS prototype (`bloom-texture-ribs.js`,
   the patched copy of the shipped geometry), EXPORT, drawn by
   `bloom-soft-render.mjs` (deterministic: no pixel figure is quoted and none
   is owed); every number in a caption is read off that build or the
   instruments' JSON. Rows:
     1  A against B on the default bloom, raking light from above (H 1.0, crest lines)
     2  the same from the side
     3  THE AXIS on the hub top: A fade / start / thin, B fade / start
     4  the stem's flutes: A, A thin, B (a 60 mm stem)
     5  the crest close-up with the wireframe: the shipped 0.4 mm lattice,
        crest lines as edges, crest + flank lines (B, a petal, H 1.0)
     6  the height sweep 0.4 / 1.0 / 1.5 / 2.5 (B, crest lines, a petal)
     7  the curvature rule at the petal's bead and nib (BONE's mask, 1 /mm, against 4)
     8+ the budget, time, print and crest-quality tables
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-ribs.mjs <out.png> [--data <json>]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DATA = (() => { const f = arg('--data', path.join(ROOT, 'docs/data/bloom-texture-ribs.json')); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; })();
const GEO = await R.ribsGeometry();
const W = 420, Hc = 420, CAP = 96, COLS = 3;
const RAKE_TOP = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const RAKE_SIDE = { light1: [0.2, -0.9, 0.35], light2: [-0.5, 0.3, 0.6] };
const fmt = (n) => (n === undefined || n === null ? '-' : Number(n).toLocaleString('en-US'));
const norm = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cells = [];
const push = (img, caption, wide = 1) => cells.push({ img, caption, wide });
const build = (extra, mode, samples = null) => R.ribsBuild(DEFAULTS, extra, { mode, GEO, samples });
const sched = (b) => { const S = b.stats.schedule; return `${S.levels.filter((l) => l.rStart < 60).map((l) => `${l.n}@${l.rStart.toFixed(1)}`).join(' ')} mm; axis r0 ${S.r0.toFixed(2)} mm (cut ${S.rCut.toFixed(2)})`; };
const crestQ = (law, mode, state, H, organ) => { const r = (DATA.crest || []).find((x) => x.law === law && x.mode === mode && x.state === state && x.H === H); return r && r.organs[organ] ? r.organs[organ] : null; };
const qtxt = (q) => (q ? `crest ${q.angle8.median} deg (asked ${q.ideal8.median}), zigzag ${q.zigzagMm.median}/${q.zigzagMm.max} mm, lost ${q.deficitMm.median} mm, ${q.trisPerMm2} tris/mm2` : '(no full-strength crest sampled here)');
/* a wireframe over an image, every emitted triangle within the window */
function wire(img, P, cam) {
  const c = cam.center, fwd = norm(cam.dir.map((v) => -v)), right = norm(cross(fwd, cam.up)), up = norm(cross(right, fwd)), sc = (Hc / 2) / cam.halfHeight, n = norm(cam.dir);
  const pr = (p) => { const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]]; return [W / 2 + dot(d, right) * sc, Hc / 2 - dot(d, up) * sc, dot(d, n)]; };
  const line = (A, B, col) => { const k = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])) + 1; if (k > 2 * W) return; for (let i = 0; i <= k; i++) { const x = Math.round(A[0] + (B[0] - A[0]) * i / k), y = Math.round(A[1] + (B[1] - A[1]) * i / k); if (x < 0 || y < 0 || x >= W || y >= Hc) continue; const o = (y * W + x) * 3; for (let q = 0; q < 3; q++) img[o + q] = Math.round(img[o + q] * 0.45 + col[q] * 0.55); } };
  let nAll = 0;
  for (let t = 0; t < P.length / 9; t++) {
    const o = t * 9, q = [0, 1, 2].map((k) => pr([P[o + k * 3], P[o + k * 3 + 1], P[o + k * 3 + 2]]));
    if (q.some((v) => v[2] < -3 || v[0] < -20 || v[0] > W + 20 || v[1] < -20 || v[1] > Hc + 20)) continue;
    /* front faces only: the facet's normal toward the camera */
    const e1 = [P[o + 3] - P[o], P[o + 4] - P[o + 1], P[o + 5] - P[o + 2]], e2 = [P[o + 6] - P[o], P[o + 7] - P[o + 1], P[o + 8] - P[o + 2]];
    if (dot(cross(e1, e2), n) <= 0) continue;
    nAll++;
    for (let k = 0; k < 3; k++) line(q[k], q[(k + 1) % 3], [40, 200, 220]);
  }
  return nAll;
}

/* ------------------------------------------------ 1-2: A against B */
const H1 = 1.0;
const AB = {};
for (const law of ['A', 'B']) {
  const b = await build({ ribLaw: law, textureHeight: H1 }, 'crest', { petal: 6 });
  AB[law] = b;
  push(render(new Float32Array(b.acc.positions), W, Hc, { center: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], halfHeight: 44 }, { ...RAKE_TOP }),
    [`LAW ${law}${law === 'A' ? ' (a FIXED spoke count, fanning)' : ' (CONSTANT spacing, branching)'}, raking light from above: the default bloom, H ${H1} mm, spacing ${b.stats.params.s} mm${law === 'A' ? ` at ${R.RIB_REF_RADIUS_MM} mm` : ''}, crest lines as edges`,
      `${fmt(b.acc.triangleCount)} tris (${(100 * b.acc.triangleCount / GEO.EXPORT_TRI_CAP).toFixed(1)}% of the 2.0 M cap)`, `spokes (count@from mm): ${sched(b)}`]);
}
{
  const pane = Buffer.alloc(W * Hc * 3, 30);
  ['THE QUESTION (Eva):', '', 'A: a fixed spoke count; the spacing', '   widens with radius.', 'B: constant spacing; new ribs begin', '   partway out (branching).', '', 'Both: one world field about the', 'bloom axis, outward only, sharp', 'crests, everywhere visible.', '', 'Rows 3-4 the axis, 5 the stem,', '6 meshing, 7-8 height, 9 curvature.'].forEach((l, i) => text(pane, W, Hc, 14, 16 + i * 26, l, [230, 220, 190], 2));
  push(pane, ['The sheet\'s question, and where each part of it is answered']);
}
for (const law of ['A', 'B']) {
  const b = AB[law];
  push(render(new Float32Array(b.acc.positions), W, Hc, { center: [0, 0, 4], dir: norm([0.25, -1, 0.42]), up: [0, 0, 1], halfHeight: 34 }, { ...RAKE_SIDE }),
    [`LAW ${law} from the side, the same build: ${law === 'A' ? 'the pitch widens outward (2 pi r / K); inside r0 the fixed count is too dense to print and the axis rule fades it, so the hub top is smooth and the petals\' inner thirds lose their ribs' : 'the pitch stays between s/sqrt2 and s x sqrt2: a new rib rises from a flute\'s floor where the spacing would pass s x sqrt2 (r 2.25, 4.50, 9.00, 18.0, 36.0 mm)'}`]);
}
{
  const pane = Buffer.alloc(W * Hc * 3, 30);
  ['WHY A NEEDS A RULE FAR OUT:', '', 'A at 2.5 mm spacing counts 50', 'spokes (2 pi x 20 / 2.5). Their', 'spacing reaches the 1.6 mm floor', 'at r0 = 12.7 mm, outside the hub', '(8.8 mm) — so FADE and START smooth', 'the whole hub top AND the stem.', 'THIN keeps ribs on both by halving.', '', 'B is a thinning law by definition:', 'only its last 4 spokes need a', 'rule, inside r0 = 1.02 mm.'].forEach((l, i) => text(pane, W, Hc, 14, 16 + i * 26, l, [230, 220, 190], 2));
  push(pane, ['Read with row 3: where each law\'s axis rule acts, from the schedule\'s own numbers']);
}

/* ------------------------------------------------ 3: the axis on the hub top */
for (const [law, axis] of [['A', 'fade'], ['A', 'start'], ['A', 'thin'], ['B', 'fade'], ['B', 'start']]) {
  const b = await build({ ribLaw: law, ribAxis: axis, textureHeight: H1 }, 'crest');
  const S = b.stats.schedule;
  const words = { fade: `the height eases to 0 between r0/2 and r0 (${(S.r0 / 2).toFixed(2)}-${S.r0.toFixed(2)} mm)`, start: `full height down to r0 ${S.r0.toFixed(2)} mm, dropped over one lattice edge inside it`, thin: `every other spoke ends inward where the spacing would fall under ${R.RIB_SPACING_FLOOR_MM} mm, down to ${R.RIB_MIN_SPOKES}; those fade inside r0 ${S.r0.toFixed(2)} mm` }[axis];
  push(render(new Float32Array(b.acc.positions), W, Hc, { center: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], halfHeight: 11 }, { ...RAKE_TOP }),
    [`THE AXIS, ${law} ${axis.toUpperCase()}: the hub top from above (22 mm across), H ${H1}`, words, `spokes ${S.levels.filter((l) => l.rStart < 12).map((l) => `${l.n} from ${l.rStart.toFixed(2)}`).join(', ')} mm; the floor spacing ${R.RIB_SPACING_FLOOR_MM} mm (four 0.4 mm lattice edges). The hub's outer ring sits under the feet and stays smooth (T5's coverage).`]);
}
{
  const pane = Buffer.alloc(W * Hc * 3, 30);
  ['B\'S AXIS:', '', 'B keeps 4 spokes inside 2.25 mm', '(8 to 4.50, 16 to 9.00 ...), so', 'only those 4 converge; the rule', 'acts inside r0 = 1.02 mm. FADE', 'leaves a soft cross; START a', 'crisp one ending in a 1.02 mm', 'flat disc. B has no THIN: it', 'thins by definition.'].forEach((l, i) => text(pane, W, Hc, 14, 16 + i * 26, l, [230, 220, 190], 2));
  push(pane, ['Read with row 4: B\'s last level and its two axis rules']);
}

/* ------------------------------------------------ 4: the stem's flutes */
for (const [law, axis] of [['A', 'fade'], ['A', 'thin'], ['B', 'fade']]) {
  const b = await build({ ribLaw: law, ribAxis: axis, textureHeight: H1, stemLength: 60 }, 'crest', { stem: 12 });
  const S = b.stats.schedule;
  const rS = 3, L = S.levels.filter((l) => l.rStart <= rS).pop();
  const flutes = rS <= S.rCut ? 0 : L.n;
  const q = crestQ(law, 'crest', 'stem', 0.4, 'stem');
  push(render(new Float32Array(b.acc.positions), W, Hc, { center: [0, 0, -30], dir: norm([0.6, -1, 0.15]), up: [0, 0, 1], halfHeight: 16 }, { ...RAKE_SIDE }),
    [`THE STEM, ${law} ${axis}: a 60 mm stem of radius 3 mm, H ${H1}, from the side`, flutes ? `${flutes} vertical flutes (the ${L.n} spokes standing at r 3 mm, pitch ${(2 * Math.PI * rS / L.n).toFixed(2)} mm)` : `SMOOTH: r 3 mm is inside the axis rule's cut (${S.rCut.toFixed(2)} mm) — A's ${S.n0} spokes would stand ${(2 * Math.PI * rS / S.n0).toFixed(2)} mm apart there`, q ? `at H 0.4: ${qtxt(q)}` : '']);
}

/* ------------------------------------------------ 5: crest close-up + wireframe */
const sB = AB.B.stats.samples.filter((q) => q.organ === 'petal' && q.r > 18 && q.r < 30 && q.n[2] > 0.3);
const focus = sB[0] || AB.B.stats.samples[0];
for (const mode of R.RIB_MODES) {
  const b = await build({ ribLaw: 'B', textureHeight: H1 }, mode);
  const n = focus.n, cam = { center: focus.p, dir: norm([n[0] + 0.25 * focus.tc[0], n[1] + 0.25 * focus.tc[1], n[2] + 0.25 * focus.tc[2]]), up: focus.tc, halfHeight: 2.6 };
  const img = render(new Float32Array(b.acc.positions), W, Hc, cam, { ...RAKE_TOP, color: [205, 197, 182] });
  const nW = wire(img, b.acc.positions, cam);
  const q = crestQ('B', mode, 'default', 2.5, 'petal'), q4 = crestQ('B', mode, 'default', 0.4, 'petal');
  push(img, [`MESHING: ${mode === 'lattice' ? 'the shipped 0.4 mm lattice (release)' : mode === 'crest' ? 'crest lines as edges' : 'crest + flank lines (4 a pitch)'}; B, a petal ${focus.r.toFixed(1)} mm out, 5.2 mm wide, H ${H1}; ${fmt(nW)} front triangles (cyan); ${fmt(b.acc.triangleCount)} tris whole bloom`,
    q4 ? `H 0.4: ${qtxt(q4)}` : '', q ? `H 2.5: ${qtxt(q)}` : '']);
}

/* ------------------------------------------------ 6: the height sweep */
for (const H of [0.4, 1.0, 1.5, 2.5]) {
  const b = await build({ ribLaw: 'B', textureHeight: H }, 'crest');
  const n = focus.n, cam = { center: focus.p, dir: norm([n[0] + 0.9 * focus.tc[0] + 0.3, n[1] + 0.9 * focus.tc[1], n[2] + 0.9 * focus.tc[2]]), up: n, halfHeight: 4.5 };
  const pr = (DATA.print || []).find((x) => x.law === 'B' && x.mode === 'crest' && x.H === H);
  const flank = 180 - 2 * Math.atan(4 * H / focus.pitch) * 180 / Math.PI;
  push(render(new Float32Array(b.acc.positions), W, Hc, cam, { ...RAKE_SIDE }),
    [`HEIGHT ${H} mm (B, crest lines), a petal ${focus.r.toFixed(1)} mm out, pitch ${focus.pitch.toFixed(2)} mm, 9 mm across`, `the crest's tangent angle (flank slope 4H/pitch): ${flank.toFixed(1)} deg`, pr ? `the default bloom at H ${H}: ${pr.withinPairs} within-shell pairs, ${pr.shells} shells, ${pr.open} open edges, ${pr.gaps.newlyClosedPrintableGaps} printable gaps closed` : `${fmt(b.acc.triangleCount)} tris`]);
}
{
  const pane = Buffer.alloc(W * Hc * 3, 30);
  ['PRINT (SLS PA12), UNVALIDATED:', '', 'A sharp crest prints ROUNDED:', 'nothing finer than a crest radius', 'of about 0.2 mm is likely to', 'survive (half the ~0.35-0.4 mm', 'resolvable detail, laser spot', 'and powder fusing). Nothing here', 'has been printed.', '', 'At H 2.5 on a 2.5 mm pitch the', 'crest is ~22-30 deg: a knife', 'edge the process will round.'].forEach((l, i) => text(pane, W, Hc, 14, 16 + i * 26, l, [230, 220, 190], 2));
  push(pane, ['Read with row 6: what the print will do to the sharp crest (a stated assumption, not a measurement)']);
}

/* ------------------------------------------------ 7: the curvature rule at the bead / nib */
{
  const tip = AB.B.stats.samples.filter((q) => q.organ === 'petal').sort((a, b2) => b2.r - a.r)[0] || focus;
  for (const curv of [1, 4]) {
    const b = await build({ ribLaw: 'B', textureHeight: 1.5, boneCurvature: curv }, 'crest');
    const ang = Math.atan2(tip.p[1], tip.p[0]), rr = Math.hypot(tip.p[0], tip.p[1]) + 4;
    const c = [Math.cos(ang) * rr, Math.sin(ang) * rr, tip.p[2] + 1];
    const rods = (DATA.rods || []).find((x) => x.state === 'default' && x.curvature === curv);
    push(render(new Float32Array(b.acc.positions), W, Hc, { center: c, dir: norm([tip.n[0] - 0.5 * Math.sin(ang), tip.n[1] + 0.5 * Math.cos(ang), tip.n[2] + 0.4]), up: [Math.cos(ang), Math.sin(ang), 0], halfHeight: 7 }, { ...RAKE_TOP }),
      [`THE CURVATURE RULE (BONE's mask, read as shipped): a petal's tip and bead at boneCurvature ${curv} /mm${curv === 1 ? ' (BONE\'s default)' : ' (its maximum)'}, B, H 1.5`, rods ? `petal vertices relieved ${rods.parts.petal.displaced} of ${rods.parts.petal.vertices}; ${rods.parts.petal.ridges} ridge vertices (the bead, the nib) smoothed` : '', curv === 1 ? 'the stamens, the style and the braid are SMOOTH at 1 /mm (every vertex a ridge, kappa >= 1.04 /mm): a question, not special-cased' : 'at 4 /mm the stamens and style take the ribs (72% of their vertices) and the bead carries them to its apex']);
  }
}
{
  const b = await build({ ribLaw: 'B', textureHeight: 1.0, boneCurvature: 4, stemLength: 60, stamenCount: 12, gynoecium: 'STYLE' }, 'crest');
  const rods = (DATA.rods || []).find((x) => x.state === 'rods' && x.curvature === 4);
  push(render(new Float32Array(b.acc.positions), W, Hc, { center: [0, 0, 12], dir: norm([0.3, -1, 0.5]), up: [0, 0, 1], halfHeight: 12 }, { ...RAKE_SIDE }),
    ['THE RODS at boneCurvature 4 /mm: 12 stamens and the style take the spokes (B, H 1.0)', rods ? `stamens ${rods.parts.stamen.displaced}/${rods.parts.stamen.vertices} vertices relieved, style ${rods.parts.style.displaced}/${rods.parts.style.vertices}` : '', 'at the default 1 /mm all of them are smooth: the curvature rule decides, as it does for BONE']);
}
{
  const pane = Buffer.alloc(W * Hc * 3, 30);
  const lines = ['THE CROSSING (reported, not ruled):', '', 'Ribs relieve EVERY visible face,', 'so a petal\'s underside and the', 'hub\'s underside take spokes too.', '', 'Under the feet and on buried faces', 'the shipped T5 rules hold: smooth.', '', 'The fade at a covered edge is', 'max(H x 15/8, e): 0.75-4.7 mm.'];
  lines.forEach((l, i) => text(pane, W, Hc, 14, 16 + i * 26, l, [230, 220, 190], 2));
  push(pane, ['Read with row 7: what the shipped visibility and coverage rules do under ribs']);
}

/* ------------------------------------------------ 8+: the tables */
{
  const lines = ['CREST QUALITY AS BUILT (EXPORT, Node; section of the emitted triangles square to the crest, pitch/8 secant angle, median of the samples):', ''];
  lines.push('law mode         state   H    organ  samples  angle built (asked)   local/40 (asked)   zigzag med/max mm   height lost mm   tris/mm2');
  for (const r of DATA.crest || []) for (const [o, s] of Object.entries(r.organs)) lines.push(`${r.law}   ${r.mode.padEnd(12)} ${r.state.padEnd(7)} ${String(r.H).padEnd(4)} ${o.padEnd(6)} ${String(s.samples).padStart(5)}    ${String(s.angle8.median).padStart(7)} (${String(s.ideal8.median).padStart(7)})   ${String(s.angle40.median).padStart(7)} (${String(s.ideal40.median).padStart(7)})   ${String(s.zigzagMm.median).padStart(6)}/${String(s.zigzagMm.max).padEnd(6)}       ${String(s.deficitMm.median).padStart(6)}        ${s.trisPerMm2}`);
  lines.push('');
  lines.push('BUDGET (Node, EXPORT): triangles and % of the 2,000,000 cap (PROVISIONAL)');
  lines.push('state     law  LATTICE (release)         CREST (export)                 CREST+FLANK');
  for (const r of DATA.budget || []) lines.push(`${r.key.padEnd(9)} ${r.law}    ${fmt(r.latticeTris).padStart(10)} ${String(r.latticePct).padStart(5)}% ${String((r.latticeMs / 1000).toFixed(1)).padStart(5)} s   ${fmt(r.crestTris).padStart(10)} ${String(r.crestPct).padStart(5)}% ${String((r.crestMs / 1000).toFixed(1)).padStart(5)} s (cut ${(r.crestPassMs / 1000).toFixed(1)} s)   ${fmt(r.flankTris).padStart(10)} ${String(r.flankPct).padStart(5)}%${r.flankPct > 100 ? ' OVER' : ''}`);
  lines.push('');
  if (DATA.browser) {
    lines.push('CHROMIUM (a fresh page each, the prototype\'s own module): seconds, heap at the end, AGREE = Node count + float32 hash');
    for (const r of DATA.browser) lines.push(`${r.key.padEnd(9)} ${r.law} ${r.mode.padEnd(8)} ${fmt(r.node.tris).padStart(10)}  node ${String(r.node.s).padStart(6)} s  chromium ${r.chromium && !r.chromium.error ? `${String(r.chromium.s).padStart(6)} s  heap ${r.chromium.heapEndGB} GB` : 'ERROR ' + (r.chromium ? r.chromium.error : '').slice(0, 50)}  ${r.agree ? 'AGREE' : 'DIFFER'}`);
    lines.push('');
  }
  if (DATA.print) { lines.push('PRINT (the default bloom, EXPORT): census, closure, printable gaps newly closed between parts'); for (const p of DATA.print) lines.push(`${p.law} ${p.mode.padEnd(8)} H ${String(p.H).padEnd(4)} ${fmt(p.tris).padStart(9)} tris: ${p.withinPairs} within-shell pairs (worst span ${p.worstSpanMm} mm), ${p.shells} shells, ${p.open} open, ${p.doubled} doubled, ${p.degen} degenerate; gaps closed ${p.gaps.newlyClosedPrintableGaps} of ${fmt(p.gaps.sampled)} sampled; cutter flips ${p.flips}`); }
  for (let at = 0, k = 1; at < lines.length; at += 26, k++) {
    const pane = Buffer.alloc(W * 3 * Hc * 3, 30);
    lines.slice(at, at + 26).forEach((l, i) => text(pane, W * 3, Hc, 10, 12 + i * 15, l, [215, 215, 205], 1));
    cells.push({ img: pane, caption: [`THE CREST-QUALITY, BUDGET, TIME AND PRINT TABLES, part ${k} (docs/data/bloom-texture-ribs.json; tools/bloom-texture-ribs-measure.mjs, tools/bloom-texture-ribs-browser.mjs)`], wide: 3 });
  }
}

/* ----------------------------------------------------- compose */
const rows = []; let row = [], used = 0;
for (const c of cells) { const w = c.wide || 1; if (used + w > COLS) { rows.push(row); row = []; used = 0; } row.push(c); used += w; }
if (row.length) rows.push(row);
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'RIBS: RADIAL SPOKE RIBBING, A AGAINST B. PROTOTYPE, EXPORT, NODE BUILDS, SOFT RENDER.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => { let x = 0; for (const c of r) { const w = (c.wide || 1) * W; blit(sheet, SW, SH, c.img, w, Hc, x, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((w - 12) / 6)); if (cap.length > 7) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, x + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); x += w; } });
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT}: ${SW} x ${SH}, ${cells.length} cells`);
