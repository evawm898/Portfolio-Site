#!/usr/bin/env node
/* verify-lantern-export.mjs — the paper star lantern's MATERIAL, MODULE and
   SHEET gate (pure Node; lantern-design-doc.md §5, §6, §8, §13). Reads
   lantern-material.js and lantern-export.js through the page's own front door:

     X0  the material rules: every derived rule is at or above its floor on
         every stock, monotone in the caliper, rounded to 0.05 mm, and the
         default stock reproduces the pattern module's RULES_DEFAULT number
         for number (so the default pattern is byte-identical to phase 2).
     X1  THE MODULES COVER THE HALF: the N point modules' outlines, laid back
         in the half's frame, enclose the same area as the half's outline
         (±0.5 %) on the front, and the back's modules the half's area less
         the opening; every rim tab of the half is on exactly one module.
     X2  EVERY SEAM HAS A TAB AND A LABEL PAIR: N seam tabs per half, each on
         its module's right valley and outside the module's own outline; the
         label S_k appears on module k (right) and module k + 1 (left) and on
         no other; the seam tab's long edge lies within the tab width of the
         valley line.
     X3  NESTING: on a bed smaller than the half, every placement lies inside
         the bed less the margin, no two placed boxes overlap, every piece is
         placed exactly once, and on a bed larger than the half there are two
         sheets with no split.
     X4  THE SHEET SVG: balanced tags, the four named layers in their colours,
         the CUT layer holding every outline, tab, cut and hole of its pieces
         (counted), the PERF layer holding the N valleys as dashes on a laser and
         nothing on a blade (whose SCORE then carries the valleys), every label
         engraved.
     X5  perforation dashes: a 50 mm valley carries 24 dashes of 1 mm, the
         first and last ending inside the line, the gaps exactly 1 mm.
     X6  a piece too large for the bed is REPORTED as a bad note, and the plan
         still nests it on a sheet of its own rather than dropping it.
     X7  the export fields round-trip through the design file; an unknown bed
         and an off-range caliper are clamped and told; a preset stock pins
         its own gsm and caliper whatever the file says.
     X8  the sag warning fires above the limit and not under it; the weight
         estimate is paper area × gsm less the cut fraction.

     X9  BACKING (phase 4): one tissue piece per point per half, each inside
         its own point's outline, every vertex at least a quarter of the fold
         keep-out from the two valleys and off the spine's inner half, the
         colours cycling by point for 1, 2 and 3 colours; none with alternate
         points solid on the odd points; none when the pattern is none.
     X10 the TEST GRID marks the stock's own four values (◀) and carries the
         four series; the COUPON is one front module alone, placed on the bed;
         the INSTRUCTIONS are eleven steps on a split plan with backing (nine
         whole with neither), at least nine of them naming a count of this
         star (fold and hang carry none).

   --negative-control re-imports COPIES of lantern-material.js / lantern-export.js / lantern-build.js
   with one deliberate defect at a time and requires each to redden exactly the
   clauses it names (every anchor checked before any runs). */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const NEG = args.includes('--negative-control');

const polyArea = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); };
const rot = ([x, y], g) => [x * Math.cos(g) - y * Math.sin(g), x * Math.sin(g) + y * Math.cos(g)];

async function run(G, P, M, X, B) {
  const res = [];
  const ok = (c, m) => res.push([!!c, m]);
  const base = { ...G.DEFAULTS, ...P.PATTERN_STATE_DEFAULTS, ...M.EXPORT_STATE_DEFAULTS, ...B.BACKING_STATE_DEFAULTS };
  const model = G.solveLantern(base);
  const rules = M.rulesFor(M.stockOf(base), M.machineOf(base));
  const pattern = P.patternForModel(model, base, rules, { validate: false });
  const N = model.N;

  // X0
  {
    const keys = ['bridge', 'minHole', 'minCut', 'foldKeepout', 'rimMargin', 'spine', 'tabWidth', 'strokeWidth'];
    const floors = { bridge: 1.0, minHole: 1.5, minCut: 1.0, foldKeepout: 3.5, rimMargin: 4.5, spine: 9, tabWidth: 7, strokeWidth: 1.5 };
    const stocks = M.MATERIALS.filter((m) => m.id !== 'custom').sort((a, b) => a.t - b.t);
    let bad = [];
    let prev = null;
    for (const m of stocks) { const r = M.rulesFor(m, M.MACHINES[0]); for (const k of keys) { if (r[k] < floors[k] - 1e-9) bad.push(`${m.id}.${k} under its floor`); if (Math.abs(r[k] * 20 - Math.round(r[k] * 20)) > 1e-9) bad.push(`${m.id}.${k} not on 0.05`); if (prev && r[k] < prev[k] - 1e-9) bad.push(`${m.id}.${k} falls with a thicker stock`); } prev = r; }
    const thin = M.rulesFor(stocks[0], M.MACHINES[0]), thick = M.rulesFor(stocks[stocks.length - 1], M.MACHINES[0]);
    for (const k of keys) if (!(thick[k] > thin[k] + 1e-9)) bad.push(`${k} does not move between ${stocks[0].id} and ${stocks[stocks.length - 1].id}`);   // a rule that ignores the caliper passes every floor
    const d = M.rulesFor(M.MATERIALS.find((m) => m.id === M.MATERIAL_DEFAULT), M.MACHINES[0]);
    const same = Object.keys(P.RULES_DEFAULT).filter((k) => Math.abs(d[k] - P.RULES_DEFAULT[k]) > 1e-9);
    ok(!bad.length && !same.length && d.tabWidth === G.TAB_WIDTH_MM, `X0: ${stocks.length} stocks × ${keys.length} rules at or above their floors, monotone, on 0.05 mm (${bad.join('; ') || 'no defect'}); the default stock reproduces RULES_DEFAULT (${same.length ? 'differs on ' + same.join(', ') : 'exactly'}) and the geometry's tab width ${d.tabWidth} = ${G.TAB_WIDTH_MM}`);
  }
  // X1 modules cover the half
  {
    const rows = [];
    for (const which of ['front', 'back']) {
      const half = X.halfPiece(model, pattern, base, which), mods = X.modulePieces(model, pattern, base, which, rules);
      const aHalf = polyArea(half.outline) - (which === 'back' ? Math.PI * (model.opening / 2) ** 2 : 0);
      const aMods = mods.reduce((s, p) => s + polyArea(p.outline), 0);
      const rimTabs = mods.reduce((s, p) => s + p.tabs.filter((t) => t.seam === undefined).length, 0);
      rows.push({ which, n: mods.length, rel: Math.abs(aMods - aHalf) / aHalf, rimTabs, halfTabs: half.tabs.length });
    }
    ok(rows.every((r) => r.n === N && r.rel < 5e-3) && rows[0].rimTabs === rows[0].halfTabs && rows[0].halfTabs === 2 * N && rows[1].rimTabs === 0, `X1: ${rows.map((r) => `${r.which}: ${r.n} modules, area within ${(r.rel * 100).toFixed(2)}% of the half, ${r.rimTabs} of the half's ${r.halfTabs} rim tabs carried`).join('; ')}`);
  }
  // X2 seams
  {
    const mods = X.modulePieces(model, pattern, base, 'front', rules);
    let bad = [];
    const inside = (poly, p) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if ((poly[i][1] > p[1]) !== (poly[j][1] > p[1]) && p[0] < poly[i][0] + ((p[1] - poly[i][1]) * (poly[j][0] - poly[i][0])) / (poly[j][1] - poly[i][1])) c = !c; return c; };
    mods.forEach((p, j) => {
      const seam = p.tabs.filter((t) => t.seam !== undefined);
      if (seam.length !== 1) { bad.push(`module ${j + 1} has ${seam.length} seam tabs`); return; }
      const t = seam[0];
      const centre = t.poly.reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
      if (inside(p.outline, centre)) bad.push(`module ${j + 1}'s seam tab lies inside its outline`);
      const right = p.labels.find((l) => l.side === 'right'), left = p.labels.find((l) => l.side === 'left');
      if (!right || right.text !== `S${j + 1}`) bad.push(`module ${j + 1} right label ${right && right.text}`);
      if (!left || left.text !== `S${((j + N - 1) % N) + 1}`) bad.push(`module ${j + 1} left label ${left && left.text}`);
      // the tab's inner edge is ON the valley line: the valley direction is the inner vertex's azimuth (the outline's last point)
      const V = p.outline[p.outline.length - 1], g = Math.atan2(V[1], V[0]);
      for (const q of [t.poly[0], t.poly[3]]) { const r = rot(q, -g); if (Math.abs(r[1]) > 1e-6) bad.push(`module ${j + 1}'s seam tab root is ${r[1].toFixed(3)} mm off the valley`); }
      for (const q of [t.poly[1], t.poly[2]]) { const r = rot(q, -g); if (Math.abs(Math.abs(r[1]) - rules.tabWidth) > 1e-6) bad.push(`module ${j + 1}'s seam tab is ${Math.abs(r[1]).toFixed(2)} wide`); }
    });
    ok(!bad.length, `X2: ${N} seam tabs on the right valleys, each outside its module, ${rules.tabWidth} mm wide from the valley line, labels S1–S${N} paired (${bad.join('; ') || 'no defect'})`);
  }
  // X3 nesting
  {
    const small = { ...base, bed: 'glowforge' }, big = { ...base, bed: 'laser900' };
    const plan = X.exportPlan(model, pattern, small, rules), planBig = X.exportPlan(model, pattern, big, rules);
    const bed = plan.bed, W = bed.w - M.BED_MARGIN_MM, H = bed.h - M.BED_MARGIN_MM;
    let outside = 0, overlaps = 0, placed = 0;
    for (const sh of plan.sheets) {
      const boxes = sh.items.map((it) => { placed++; const pts = [...it.piece.outline, ...it.piece.tabs.flatMap((t) => t.poly)].map((q) => { const r = rot(q, it.rot); return [r[0] + it.x, r[1] + it.y]; }); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } if (x0 < M.BED_MARGIN_MM - 1e-6 || y0 < M.BED_MARGIN_MM - 1e-6 || x1 > W + 1e-6 || y1 > H + 1e-6) outside++; return [x0, y0, x1, y1]; });
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) if (boxes[a][0] < boxes[b][2] && boxes[b][0] < boxes[a][2] && boxes[a][1] < boxes[b][3] && boxes[b][1] < boxes[a][3]) overlaps++;
    }
    ok(plan.split && plan.fitsBed && placed === plan.pieces.length && plan.pieces.length === 2 * N + 1 && outside === 0 && overlaps === 0 && !planBig.split && planBig.sheets.length === 2 && planBig.pieces.length === 3,
      `X3: on the ${bed.name.split(' — ')[0]} the half splits into ${plan.pieces.length} pieces over ${plan.sheets.length} sheets, ${placed} placed, ${outside} outside the bed, ${overlaps} overlapping boxes; on a 900 × 600 bed no split, ${planBig.sheets.length} sheets of ${planBig.pieces.length} pieces`);
  }
  // X4 the sheet SVG
  {
    const plan = X.exportPlan(model, pattern, { ...base, bed: 'laser900' }, rules);   // a whole half on one sheet: it carries the valleys a module does not (a module's valleys are its seams, cut)
    const sh = plan.sheets[0]; sh.machine = plan.machine;
    const svg = X.sheetSvg(sh, 0, plan.sheets.length);
    const layer = (id) => (svg.split(`<g id="${id}"`)[1] || '').split('</g>')[0];
    const want = sh.items.reduce((s, it) => s + 1 + it.piece.tabs.length + it.piece.cuts.length + it.piece.holes.length + (it.piece.openings || []).length, 0);
    const got = (layer('CUT').match(/<path|<circle/g) || []).length;
    const labels = (layer('ENGRAVE').match(/<text/g) || []).length, wantLabels = sh.items.reduce((s, it) => s + it.piece.labels.length, 0);
    const perfs = (layer('PERF').match(/<path/g) || []).length, wantPerf = sh.items.reduce((s, it) => s + it.piece.creases.filter((c) => c.kind === 'valley').length, 0);
    const balanced = (svg.match(/<g\b/g) || []).length === (svg.match(/<\/g>/g) || []).length && /<\/svg>\s*$/.test(svg);
    const colours = /id="CUT"[^>]*stroke="#ff0000"/.test(svg) && /id="SCORE"[^>]*stroke="#0000ff"/.test(svg) && /id="PERF"[^>]*stroke="#00a000"/.test(svg) && /id="ENGRAVE"[^>]*fill="#000000"/.test(svg);
    sh.machine = M.MACHINES.find((m) => m.id === 'blade');
    const svgB = X.sheetSvg(sh, 0, plan.sheets.length);
    const perfB = ((svgB.split('<g id="PERF"')[1] || '').split('</g>')[0].match(/<path/g) || []).length;
    const scoreA = (layer('SCORE').match(/<path/g) || []).length, scoreB = ((svgB.split('<g id="SCORE"')[1] || '').split('</g>')[0].match(/<path/g) || []).length;
    ok(balanced && colours && got === want && labels === wantLabels && perfs === wantPerf && wantPerf === N && perfB === 0 && scoreB === scoreA + wantPerf, `X4: the front half's sheet — balanced, layers coloured, CUT holds ${got} of ${want} shapes, ENGRAVE ${labels} of ${wantLabels} labels, PERF ${perfs} valley paths on the laser (${perfB} on a blade, whose SCORE goes ${scoreA} → ${scoreB})`);
  }
  // X5 perforation dashes
  {
    const d = X.perfDashes([0, 0], [50, 0]);
    const lens = d.map(([a, b]) => b[0] - a[0]), gaps = d.slice(1).map((s, i) => s[0][0] - d[i][1][0]);
    ok(d.length === 24 && lens.every((l) => Math.abs(l - M.PERF_CUT_MM) < 1e-9) && gaps.every((g) => Math.abs(g - M.PERF_GAP_MM) < 1e-9) && d[0][0][0] > 0 && d[23][1][0] < 50, `X5: a 50 mm valley → ${d.length} dashes of ${lens[0]} mm, gaps ${gaps[0]} mm, from ${d[0][0][0].toFixed(2)} to ${d[23][1][0].toFixed(2)}`);
  }
  // X6 too big
  {
    const plan = X.exportPlan(model, pattern, { ...base, bed: 'k40' }, rules);
    const note = plan.notes.find((n) => n.id === 'bed');
    const placed = plan.sheets.reduce((s, sh) => s + sh.items.length, 0);
    ok(!plan.fitsBed && note && note.kind === 'bad' && placed === plan.pieces.length, `X6: on the K40 bed fitsBed=${plan.fitsBed}, note "${note && note.text.slice(0, 70)}…", ${placed} of ${plan.pieces.length} pieces still placed`);
  }
  // X7 design fields
  {
    const st = { ...base, material: 'custom', gsm: 180, caliper: 0.22, machine: 'blade', bed: 'cricut24' };
    const r = G.readDesign(G.serializeDesign(st), base);
    const same = M.EXPORT_FIELDS.every((k) => r.state[k] === st[k]);
    const r2 = G.readDesign(G.serializeDesign({ ...st, bed: 'moon', caliper: 9 }), base);
    const r3 = G.readDesign(G.serializeDesign({ ...base, material: 'cover300', gsm: 50, caliper: 0.1 }), base);
    ok(r.ok && same && !r.notes.length && r2.state.bed === M.BED_DEFAULT && r2.state.caliper === M.CALIPER_RANGE[1] && r2.notes.some((n) => /bed/.test(n)) && r2.notes.some((n) => /caliper/.test(n)) && r3.state.gsm === 300 && r3.state.caliper === 0.38,
      `X7: the export fields round-trip (${r.notes.length} notes); bed "moon" → ${r2.state.bed}, caliper 9 → ${r2.state.caliper}, told; a preset stock pins gsm ${r3.state.gsm} and caliper ${r3.state.caliper}`);
  }
  // X8 sag and weight
  {
    const lim = M.sagLimitMm(0.25), limThin = M.sagLimitMm(0.16);
    const w = M.weightEstimate(1e6, 0.25, 200);
    ok(Math.abs(lim - 300) < 1e-9 && limThin < lim && Math.abs(w - 150) < 1e-9, `X8: the sag limit is ${lim.toFixed(0)} mm at 0.25 mm and ${limThin.toFixed(0)} at 0.16; a square metre of 200 gsm a quarter cut away weighs ${w} g`);
  }
  // X9 backing
  {
    const inside = (poly, p) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if ((poly[i][1] > p[1]) !== (poly[j][1] > p[1]) && p[0] < poly[i][0] + ((p[1] - poly[i][1]) * (poly[j][0] - poly[i][0])) / (poly[j][1] - poly[i][1])) c = !c; return c; };
    const mods = X.modulePieces(model, pattern, base, 'front', rules);
    const st = { ...base, backing: true, backingColours: 2 };
    const bk = B.backingPieces(model, st, rules, 'front');
    let out = 0, nearFold = 0, onSpine = 0;
    const t = model.facets[0], tanA = Math.tan(t.a);
    for (const p of bk) { const mod = mods[p.j]; for (const q of p.outline) { if (!inside(mod.outline, q)) out++; } const reg = B.backingRegion(t, rules); for (const [x, y] of reg) { if ((x * tanA - y) * Math.cos(t.a) < rules.foldKeepout * 0.25 - 1e-9) nearFold++; if (y < rules.spine * 0.25 - 1e-9) onSpine++; } }
    const cols = (n) => B.backingPieces(model, { ...st, backingColours: n }, rules, 'front').map((p) => p.colour);
    const pal = B.paletteOf(st).colours;
    const cyc = [1, 2, 3].every((n) => cols(n).every((c, j) => c === pal[j % n]));
    const alt = B.backingPieces(model, { ...st, patSolidAlt: true }, rules, 'front');
    const none = B.backingPieces(model, { ...st, patMode: 'none' }, rules, 'front');
    ok(bk.length === N && out === 0 && nearFold === 0 && onSpine === 0 && cyc && alt.length === Math.ceil(N / 2) && alt.every((p) => p.j % 2 === 0) && none.length === N, `X9: ${bk.length} tissue pieces, ${out} vertices outside their point, ${nearFold} inside the fold keep-out, ${onSpine} on the spine; colours cycle for 1 / 2 / 3; ${alt.length} with alternate solid (the even points); ${none.length} pieces are laid out for a plain star (the page gates them)`);
  }
  // X10 grid, coupon, steps
  {
    const grid = B.testGridSvg(rules, { stamp: 'gate' });
    const marks = ((grid.split('<g id="ENGRAVE"')[1] || '').split('</g>')[0].match(/◀/g) || []).length, rects = (grid.match(/<rect/g) || []).length, circles = (grid.match(/<circle/g) || []).length;
    const mods = X.modulePieces(model, pattern, base, 'front', rules);
    const coupon = B.couponPieces(mods), sheet = X.nest(coupon, M.bedOf(base))[0];
    const plan = X.exportPlan(model, pattern, base, rules);
    const stepsSplit = B.buildSteps(model, plan, base, rules, { backing: 10 }), stepsWhole = B.buildSteps(model, X.exportPlan(model, pattern, { ...base, bed: 'laser900' }, rules), base, rules, { backing: 0 });
    const counted = stepsSplit.filter((st) => /\d/.test(st.text)).length;
    ok(marks === 4 && rects >= 26 && circles === 7 && coupon.length === 1 && coupon[0].which === 'front' && coupon[0].j === 0 && sheet.items.length === 1 && stepsSplit.length === 11 && stepsWhole.length === 9 && counted >= 9 && stepsSplit.some((st) => /LED only/.test(st.text)),
      `X10: the test grid marks ${marks} derived values over ${rects} rects and ${circles} holes; the coupon is ${coupon.length} piece (${coupon[0] && coupon[0].label}) on a sheet of ${sheet.items.length}; ${stepsSplit.length} steps split with backing, ${stepsWhole.length} whole without, ${counted} carrying a number, LED-only present`);
  }
  return res;
}

const MUTANTS = [
  { id: 'the-backing-crosses-the-fold', file: 'lantern-build.js', from: "Math.max(yLo, Math.min(F.yHi(x) + g, F.rimY(x) - rules.rimMargin * 0.6, x * Math.tan(t.a) - rules.foldKeepout * 0.5 / Math.cos(t.a)))", to: "Math.max(yLo, F.yHi(x) + g + 6)", breaks: ['X9'] },
  { id: 'the-backing-colours-do-not-cycle', file: 'lantern-build.js', from: "export const colourOfPoint = (state, j) => paletteOf(state).colours[j % state.backingColours];", to: "export const colourOfPoint = (state, j) => paletteOf(state).colours[0];", breaks: ['X9'] },
  { id: 'the-grid-marks-nothing', file: 'lantern-build.js', from: "engrave.push(txt(x, y + 13, `${b}${Math.abs(b - rules.bridge) < 1e-9 ? ' ◀' : ''}`)); });", to: "engrave.push(txt(x, y + 13, `${b}`)); });", breaks: ['X10'] },
  { id: 'the-steps-skip-the-modules', file: 'lantern-build.js', from: "...(modules ? [{ title: 'Join the modules',", to: "...(false ? [{ title: 'Join the modules',", breaks: ['X10'] },
  { id: 'the-rules-ignore-the-caliper', file: 'lantern-material.js', from: 'bridge: clamp(4.8 * t, 1.0, 2.2),', to: 'bridge: 1.2,', breaks: ['X0'] },
  { id: 'a-module-drops-its-left-edge', file: 'lantern-export.js', from: 'const outline = [...apex, ...left, ...right.slice(1)];', to: 'const outline = [...apex, ...right];', breaks: ['X1', 'X9'] },   // the seams, the nest and the sheet do not read the left edge: X1's area is the witness, and the backing then falls outside its point
  { id: 'the-seam-tab-is-on-the-module', file: 'lantern-export.js', from: 'const n2 = [nR[0] * sgn, nR[1] * sgn];', to: 'const n2 = [-nR[0] * sgn, -nR[1] * sgn];', breaks: ['X2'] },
  { id: 'the-seam-labels-do-not-pair', file: 'lantern-export.js', from: "{ text: `S${((j + N - 1) % N) + 1}`,", to: "{ text: `S${j + 1}`,", breaks: ['X2'] },
  { id: 'the-nest-ignores-the-margin', file: 'lantern-export.js', from: 'const W = bed.w - 2 * BED_MARGIN_MM, H = bed.h - 2 * BED_MARGIN_MM, gap = 4;', to: 'const W = bed.w, H = bed.h, gap = 4;', breaks: ['X3'] },
  { id: 'the-nest-stacks-shelves-on-each-other', file: 'lantern-export.js', from: 'const yTop = sh.shelves.length ? sh.shelves[sh.shelves.length - 1].y + sh.shelves[sh.shelves.length - 1].h + gap : 0;', to: 'const yTop = 0;', breaks: ['X3', 'X4'] },   // the halves then share a sheet and X4 counts ten valleys
  { id: 'the-cuts-are-left-off-the-sheet', file: 'lantern-export.js', from: 'for (const c of p.cuts) cut.push(`<path d="${path(c, true)}"/>`);', to: '0;', breaks: ['X4'] },
  { id: 'the-blade-perforates', file: 'lantern-export.js', from: "else if (machine.valley === 'perforated') perf.push(", to: "else if (true) perf.push(", breaks: ['X4'] },
  { id: 'the-dashes-run-off-the-end', file: 'lantern-export.js', from: 'const start = (L - (n * pitch - PERF_GAP_MM)) / 2, out = [];', to: 'const start = 0, out = [];', breaks: ['X5'] },
  { id: 'a-piece-too-big-is-not-told', file: 'lantern-export.js', from: "if (tooBig.length) notes.push({ kind: 'bad', id: 'bed',", to: "if (false) notes.push({ kind: 'bad', id: 'bed',", breaks: ['X6'] },
  { id: 'the-bed-is-not-checked-on-read', file: 'lantern-material.js', from: 'o.bed = BEDS.some((x) => x.id === raw.bed) ? raw.bed : BED_DEFAULT;', to: 'o.bed = raw.bed;', breaks: ['X7'] },
];

function print(res, label) { let f = 0; for (const [p, m] of res) { console.log(`${p ? 'ok  ' : 'FAIL'} ${m}`); if (!p) f++; } console.log(`\n${label}: ${res.length - f} of ${res.length} passed`); return f; }

const G = await import('../lantern-geometry.js');
const P = await import('../lantern-pattern.js');
if (!NEG) {
  const M = await import('../lantern-material.js'), X = await import('../lantern-export.js');
  process.exit(print(await run(G, P, M, X, await import('../lantern-build.js')), 'verify-lantern-export') ? 1 : 0);
} else {
  const srcs = { 'lantern-material.js': fs.readFileSync(path.join(REPO, 'lantern-material.js'), 'utf8'), 'lantern-export.js': fs.readFileSync(path.join(REPO, 'lantern-export.js'), 'utf8'), 'lantern-build.js': fs.readFileSync(path.join(REPO, 'lantern-build.js'), 'utf8') };
  let bad = 0;
  for (const m of MUTANTS) { const n = srcs[m.file].split(m.from).length - 1; if (n !== 1) { console.log(`ANCHOR ${m.id}: matches ${n} times`); bad++; } }
  if (bad) process.exit(1);
  const clean = await run(G, P, await import('../lantern-material.js'), await import('../lantern-export.js'), await import('../lantern-build.js'));
  const names = clean.map(([, msg]) => msg.split(':')[0]);
  for (const m of MUTANTS) for (const b of m.breaks) if (!names.includes(b)) { console.log(`STALE NAME ${m.id} claims ${b}, which the gate does not run`); bad++; }
  if (clean.some(([p]) => !p)) { console.log('the clean tree does not pass; the control cannot run'); process.exit(1); }
  if (bad) process.exit(1);
  for (const m of MUTANTS) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lantern-export-mutant-'));
    const abs = (f) => pathToFileURL(path.join(REPO, f)).href;
    for (const f of Object.keys(srcs)) { let s = srcs[f]; if (f === m.file) s = s.replace(m.from, m.to); s = s.replace("from './lantern-geometry.js'", `from '${abs('lantern-geometry.js')}'`).replace("from './lantern-pattern.js'", `from '${abs('lantern-pattern.js')}'`); fs.writeFileSync(path.join(dir, f), s); }
    let res;
    try { res = await run(G, P, await import(pathToFileURL(path.join(dir, 'lantern-material.js')).href), await import(pathToFileURL(path.join(dir, 'lantern-export.js')).href), await import(pathToFileURL(path.join(dir, 'lantern-build.js')).href)); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    const red = res.filter(([p]) => !p).map(([, msg]) => msg.split(':')[0]);
    const missed = m.breaks.filter((b) => !red.includes(b)), unclaimed = red.filter((r) => !m.breaks.includes(r));
    const good = !missed.length && !unclaimed.length;
    console.log(`${good ? 'ok  ' : 'BAD '} ${m.id}: reddened ${red.join(', ') || 'nothing'}${missed.length ? ` — MISSED ${missed.join(', ')}` : ''}${unclaimed.length ? ` — UNCLAIMED ${unclaimed.join(', ')}` : ''}`);
    if (!good) bad++;
  }
  console.log(`\nnegative control: ${MUTANTS.length - bad} of ${MUTANTS.length} mutants behave`);
  process.exit(bad ? 1 : 0);
}
