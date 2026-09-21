/* ===================================================================
   shot-bloom-lamina-floor.mjs — BELOW F, AND WHAT THE FLOOR IS PROTECTING.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It drives `tools/bloom-voronoi-proto.mjs`'s
   salvage field at Eva's own grading and renders every boundary from the cell she
   approved down to one row PAST the floor, so what the floor costs and what it
   prevents are both on the page.

     node tools/shot-bloom-lamina-floor.mjs [--out <dir>] [--quick]

   `--quick` renders two cells — prove the tool on two rows, then run the grid once
   (the charter's own convention for a sheet tool).

   F IS THE REFERENCE CELL AND IT IS FIRST. Eva ruled it the best cell on the #252
   sheet, so every cell here is read against it rather than against the field as it
   stands: the question this sheet asks is what the rows BELOW F buy, and the only
   honest control for that is F itself. The field as it stands is on the previous
   sheet and is not repeated.

   THE LAST CELL IS ONE ROW BELOW THE FLOOR AND IT IS THERE ON PURPOSE. The floor is
   derived, so a sheet that stopped at it would be a picture of a rule rather than of
   a reason. Row 6's cell region crosses the blade's own waist; it is the cell the
   floor refuses, and its caption carries the numbers that say why.

   THE STRUCTURAL FIGURES ARE ON EVERY CAPTION, in #252's own units: the solid base
   panel as a share of the blade, and the fraction of the blade's bottom 45 % that is
   SOLID. Nothing is clamped on structural grounds and nothing here argues from them.

   EVERY PETAL CELL IS ONE SEED AND THE CAPTIONS SAY SO; the eight-seed median is
   beside it. The whole-bloom cells are the eight petals at their own eight seeds,
   which IS that population. NO PIXEL DELTA IS QUOTED ANYWHERE — the rasteriser is
   deterministic, so no same-tree control is owed and none is claimed.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as P from './bloom-voronoi-proto.mjs';
import * as M from './bloom-infill-base-panel.mjs';
import * as LF from './bloom-infill-lamina-floor.mjs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', path.join(os.tmpdir(), 'bloom-lamina-floor'));
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });

const ctx = P.context({});
const L = ctx.L, N_CELLS = M.N_CELLS;
const hAt = (u) => ctx.surface.profile.halfWidthAt(u);
const A_BLADE = M.areaU(hAt, L, 0, 1);
const WALLS = QUICK ? [1.0] : M.WALLS;
const FLOOR_ROW = P.basalSplit(ctx, {});
const W8 = LF.waistOf(ctx, 1.0);
const num = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(d));
const pct = (x, d = 1) => `${(100 * x).toFixed(d)} %`;

/* THE CELLS. Eva's grading on every one — `converge` 0.050, `baseNarrow` 1.50 — so the
   only thing that varies down the sheet is the BOUNDARY, which is what she asked to
   see moved. */
const OPTS = LF.F_OPTS;
const SETTINGS = [
  { key: 'f', mSplit: 10, label: 'F — THE CELL EVA APPROVED', ref: true,
    note: 'the boundary at u 0.143, nine rows below where the prototype had it; the panel is a third of what it was. Every cell below is read against THIS one' },
  { key: 'g', mSplit: 9, label: 'ONE ROW BELOW F',
    note: 'the first row past the cell Eva approved; nothing measured binds here' },
  { key: 'h', mSplit: 8, label: 'TWO ROWS BELOW F',
    note: 'nothing measured binds here either — the census is clean and the masked lattice reads the plain petal at this boundary' },
  { key: 'floor', mSplit: 7, label: 'THE FLOOR — THREE ROWS BELOW F',
    note: 'the lowest boundary whose cell region starts at or above the blade’s own WAIST (u 0.0579, where the foot’s width floor hands the outline to the core). This is what ships' },
  { key: 'past', mSplit: 6, label: 'ONE ROW PAST THE FLOOR — WHAT IT REFUSES', refused: true,
    note: 'the cell region now crosses the waist and the answer REVERSES: more solid in the bottom 45 %, not less, on fewer triangles. Shown so the floor is a reason rather than a rule' },
];

const W = 520, H = 460;
const TILT = 25 * Math.PI / 180;
const NRM = [-Math.sin(TILT), 0, Math.cos(TILT)], BLADE = [Math.cos(TILT), 0, Math.sin(TILT)];
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx, c: mn.map((m, k) => (m + mx[k]) / 2) }; };
const plainPetal = (() => { const a = { pos: [], tri(x, y, z) { this.pos.push(...x, ...y, ...z); }, quad(x, y, z, w) { this.tri(x, y, z); this.tri(x, z, w); }, get tris() { return this.pos.length / 9; } }; P.emitBase(a, ctx, ctx.rows.length - 1); return new Float32Array(a.pos); })();
const petalCentre = bbox(plainPetal).c;
const petalCam = (hh = 21, shift = [0, 0, 0]) => ({ dir: NRM, up: BLADE, center: [petalCentre[0] + shift[0], petalCentre[1] + shift[1], petalCentre[2] + shift[2]], halfHeight: hh });
const bloomAbove = (p) => ({ dir: [0, 0, 1], up: [0, 1, 0], center: bbox(p).c, halfHeight: 46 });
const bloomQuarter = (p) => ({ dir: [0.62, -0.55, 0.56], up: [0, 0, 1], center: bbox(p).c, halfHeight: 42 });

const cells = [];
const rows = [];
function shoot(name, positions, caption) { return (cam) => {
  const rgb = render(positions, W, H, typeof cam === 'function' ? cam(positions) : cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3] });
  const png = path.join(OUT, `${name}.png`); writePng(png, W, H, rgb);
  cells.push({ name, caption, png: fs.readFileSync(png).toString('base64') });
  console.log('rendered', name, positions.length / 9, 'tris');
}; }

function petal(S, wall) {
  const target = ctx.rows[S.mSplit].u;
  const F = P.fieldSalvage(ctx, N_CELLS, { ...OPTS, u0: target, seed: P.SEED });
  const m = P.measure(ctx, F, wall);
  const r = P.cutThrough(ctx, F, wall);
  const agg = LF.cell(ctx, S.mSplit, wall);                        /* the same state over all eight seeds */
  const rec = { ...S, wall, target, uPanel: agg.uPanel, uOv: agg.uOv, m, agg };
  rows.push(rec);
  return { rec, pos: new Float32Array(r.acc.pos) };
}
const refOf = (wall) => rows.find((x) => x.ref && x.wall === wall);
const vsF = (r) => {
  const ref = refOf(r.wall);
  if (!ref || ref === r) return '';
  const d = 100 * (r.agg.bottom45Solid - ref.agg.bottom45Solid);
  const dp = 100 * (r.agg.panelShare - ref.agg.panelShare);
  return ` <b>Against F: the panel is ${dp <= 0 ? '' : '+'}${dp.toFixed(2)} points of the blade and the bottom 45 % is ${d <= 0 ? '' : '+'}${d.toFixed(1)} points ${d <= 0 ? 'LIGHTER' : 'HEAVIER'}.</b>`;
};
const cap = (r) => {
  const m = r.m, a = r.agg;
  return `<b>${r.label}</b> — wall ${num(r.wall, 1)} mm, boundary row ${r.mSplit} (panel to u ${num(a.uPanel, 4)}, cells from u ${num(a.uOv, 4)}), converge ${num(OPTS.converge, 3)}, base ${num(OPTS.baseNarrow, 2)}.
  <b>THE SOLID BASE PANEL IS ${num(a.panelMm2, 1)} mm&sup2; OF THE BLADE'S ${num(a.bladeMm2, 1)} — ${pct(a.panelShare)}</b>, and no grading moves any of it.
  <b>The bottom 45 % of the blade is ${pct(a.bottom45Solid)} solid</b> (the panel and the pattern's wall together).${vsF(r)}
  <b>This seed:</b> ${m.cells} cells, ${m.real} real holes (&ge; ${num(G.MIN_FEATURE_MM, 1)} mm), lowest hole u ${num(m.lowestHoleU, 4)}; ${m.tris.toLocaleString('en-US')} tris.
  Boundary edges ${m.boundary}, ${m.shells} shell, ${m.voxel06} voxel piece at 0.6 mm and ${m.voxel03} at 0.3.
  <i>Over all eight seeds: ${a.holes} holes of which ${a.real} are real, ${a.nullHoles} cell(s) carry none; the lamina is ${pct(a.laminaWall)} wall and the blade ${pct(a.bladeOpen)} open; smallest hole anywhere ${num(a.holeMin)} mm; ${a.tris.toLocaleString('en-US')} tris. ${r.note}.</i>`;
};

if (QUICK) {
  /* `--quick` takes F and THE FLOOR — the two cells this sheet is about — rather than
     the first two in order, so a two-cell proof still exercises both ends of the claim. */
  for (const S of SETTINGS.filter((x) => x.key === 'f' || x.key === 'floor')) { const { rec, pos } = petal(S, 1.0); shoot(`q_${S.key}`, pos, cap(rec))(petalCam()); }
} else {
  for (const wall of WALLS) for (const S of SETTINGS) { const { rec, pos } = petal(S, wall); shoot(`petal_${S.key}_w${wall.toFixed(1)}`, pos, cap(rec))(petalCam()); }
  /* THE MACRO IS WHERE THE PROPORTION READS — framed on the base, one camera for all five. */
  for (const S of SETTINGS) {
    const target = ctx.rows[S.mSplit].u;
    const F = P.fieldSalvage(ctx, N_CELLS, { ...OPTS, u0: target, seed: P.SEED });
    const m = P.measure(ctx, F, 1.0); const r = P.cutThrough(ctx, F, 1.0);
    const rec = rows.find((x) => x.key === S.key && x.wall === 1.0); const a = rec.agg;
    shoot(`macro_${S.key}`, new Float32Array(r.acc.pos),
      `<b>MACRO — ${S.label}</b>, wall 1.0 mm, 9 mm half-height at the base. <b>The panel runs to u ${num(a.uPanel, 4)} and is ${pct(a.panelShare)} of the blade</b>; the cells start at u ${num(a.uOv, 4)} and the lowest hole bottoms at u ${num(m.lowestHoleU, 4)}.
      The blade's WAIST is at u ${num(W8.u, 4)} — ${num(W8.acrossMm, 3)} mm across, the narrowest it gets between the foot and the tip — and this cell's region starts ${a.aboveFloor ? 'ABOVE' : '<b>BELOW</b>'} it.
      The bottom 45 % is <b>${pct(a.bottom45Solid)} solid</b>.${vsF(rec)} <i>${S.note}.</i>`)(petalCam(9, [-BLADE[0] * 5.5, 0, -BLADE[2] * 5.5]));
  }
  /* ---- the whole bloom: eight petals at their own eight seeds, plus the shipped hub ---- */
  const accP = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(accP, { ...DEFAULTS });
  const blooms = [{ key: 'plain', pos: new Float32Array(accP.positions), label: 'PLAIN (what ships)', tris: accP.triangleCount, note: 'no infill at all — the control', wall: null, share: null }];
  for (const wall of WALLS) for (const S of SETTINGS) {
    const target = ctx.rows[S.mSplit].u;
    const wb = P.wholeBloom('salvage', N_CELLS, wall, { ...DEFAULTS }, { ...OPTS, u0: target });
    const c = P.census(wb.acc.pos);
    const a = rows.find((x) => x.key === S.key && x.wall === wall).agg;
    blooms.push({ key: `${S.key}_w${wall.toFixed(1)}`, pos: new Float32Array(wb.acc.pos), label: S.label, tris: wb.tris, wall, share: a.panelShare, bottom: a.bottom45Solid,
      note: `${S.note}. Boundary edges ${c.boundary}, ${P.floodFill(wb.acc.pos, 0.6)} voxel piece at 0.6 mm` });
  }
  for (const v of ['above', 'quarter']) for (const bl of blooms) {
    shoot(`bloom_${v}_${bl.key}`, bl.pos,
      `<b>WHOLE BLOOM, ${bl.label}${bl.wall ? `, wall ${num(bl.wall, 1)} mm` : ''}, ${v === 'above' ? 'from above' : 'three-quarter'}.</b> ${bl.tris.toLocaleString('en-US')} tris${bl.wall ? `, ${N_CELLS} cells a petal, each petal from its own seed. <b>The panel is ${pct(bl.share)} of each blade</b> and its bottom 45 % is ${pct(bl.bottom)} solid` : ''}. <i>${bl.note}.</i>`)(v === 'above' ? bloomAbove : bloomQuarter);
  }
}

/* ---- the page ---- */
const tRows = rows.map((r) => `<tr${r.ref ? ' style="font-weight:700"' : ''}><td>${r.label.split(' — ')[0]}</td><td>${r.mSplit}</td><td>${num(r.agg.uPanel, 4)}</td><td>${num(r.agg.uOv, 4)}</td><td>${r.agg.aboveFloor ? 'above' : 'BELOW'}</td><td><b>${pct(r.agg.panelShare)}</b></td><td>${num(r.wall, 1)}</td><td><b>${pct(r.agg.bottom45Solid)}</b></td><td>${num(r.agg.openBotMm2)}</td><td>${pct(r.agg.laminaWall)}</td><td>${pct(r.agg.bladeOpen)}</td><td>${r.agg.real}</td><td>${r.agg.nullHoles}</td><td>${num(r.agg.holeMin)}</td><td>${r.agg.tris.toLocaleString('en-US')}</td><td>${r.agg.clean ? 'clean' : 'NOT CLEAN'}</td></tr>`).join('');
const html = `<title>Infill Lamina Floor</title>
<style>
:root{--ground:#f4f3ef;--ink:#1d1c1a;--muted:#5d5a54;--rule:#d6d2c9;--panel:#ebe8e1;--accent:#3f6b5e;--mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ground:#15161a;--ink:#ebe8e1;--muted:#9d998f;--rule:#32332f;--panel:#1e2024;--accent:#79b3a2}}
:root[data-theme="dark"]{--ground:#15161a;--ink:#ebe8e1;--muted:#9d998f;--rule:#32332f;--panel:#1e2024;--accent:#79b3a2}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:15px/1.62 Georgia,"Iowan Old Style","Times New Roman",serif;padding-inline:16px;padding-block:0 64px}
.wrap{max-width:1180px;margin:0 auto}
h1{font-size:clamp(23px,4.4vw,29px);margin:36px 0 8px;letter-spacing:-.012em;text-wrap:balance}
h2{font-size:16px;margin:40px 0 10px;color:var(--accent);border-bottom:1px solid var(--rule);padding-bottom:6px;letter-spacing:.04em;text-transform:uppercase;font-family:var(--mono);font-weight:600}
p.lede{color:var(--muted);margin:0 0 6px;max-width:66ch}
.grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))}
.cell{background:var(--panel);border:1px solid var(--rule);border-radius:6px;overflow:hidden}
.cell img{width:100%;max-width:100%;display:block}
.cap{padding:11px 13px;font-size:12.5px;line-height:1.55;color:var(--muted)}
.cap b{color:var(--ink)}.cap i{color:var(--accent);font-style:italic}
.scroll{overflow-x:auto;margin-top:8px}
table{border-collapse:collapse;width:100%;font-size:12.5px;font-family:var(--mono);font-variant-numeric:tabular-nums}
th,td{border-bottom:1px solid var(--rule);padding:5px 8px;text-align:right;white-space:nowrap}
th:first-child,td:first-child{text-align:left}
th{color:var(--accent);font-weight:600;letter-spacing:.02em}
.note{background:var(--panel);border-left:3px solid var(--accent);padding:13px 17px;margin:20px 0;font-size:13.5px;max-width:78ch}
code{font-family:var(--mono);font-size:.92em}
</style>
<div class="wrap">
<h1>Below F — how far the lattice reaches, and what stops it</h1>
<p class="lede">The salvaged Voronoi field at ${N_CELLS} cells at the grading of the cell Eva approved (<code>converge</code> 0.050,
<code>baseNarrow</code> 1.50), with ONLY the boundary varying. <b>F is first and every other cell is read against it</b>, because the
question this sheet asks is what the rows below F buy. The field as it stands is on the previous sheet and is not repeated.
Each petal picture is ONE SEED; the eight-seed median is in every caption and in the table.</p>
<div class="note"><b>THE FLOOR IS THE BLADE'S OWN WAIST, AND IT IS A LENGTH.</b> <code>halfWidthAt</code> is a <code>max</code>, and at
u ${num(W8.u, 7)} the foot's width floor hands the outline to the core. The blade is <b>${num(W8.acrossMm, 3)} mm across</b> there —
against ${num(W8.footAcrossMm, 3)} at the foot and ${num(W8.peakAcrossMm, 3)} at its widest — so it is the narrowest section the blade
has between the foot and the tip, and <b>below it the outline turns and widens again</b>. A cell region that contains that turn is
measurably worse, which is the last cell on this sheet. The floor is read off the geometry's own MODE-FREE break list, so it moves with
the petal: row ${FLOOR_ROW} here, row 6 on <code>petalWidth</code> 30, row 4 on the seam-shifted corner.</div>
<div class="note"><b>THE STRUCTURAL FIGURES, stated and not acted on.</b> A petal is a cantilever and the base carries the peak bending
moment, so the solid basal panel is load-bearing rather than decorative. Every caption carries the panel's share of the blade and the
fraction of the blade's bottom 45 % that is SOLID, in the same units as the previous sheet: the prototype shipped 27.5 % panel with the
bottom 45 % at 84.0 % solid; F is 8.8 % and 54.3 %; the floor is ${(() => { const f = rows.find((r) => r.key === 'floor' && r.wall === 1.0); return f ? `${pct(f.agg.panelShare)} and ${pct(f.agg.bottom45Solid)}` : 'not rendered in this run'; })()}. The section at the waist is
<b>${num(W8.acrossMm * ctx.t, 2)} mm&sup2;</b> against ${num(W8.footAcrossMm * ctx.t, 2)} at the foot and ${num(W8.peakAcrossMm * ctx.t, 2)} at the peak.
<b>Nothing here is clamped on structural grounds and nothing above argues from them</b> — no coupon has ever been printed.</div>
<h2>The petal alone</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('petal_') || c.name.startsWith('q_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The base, close — where the proportion reads</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('macro_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, from above</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_above')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, three-quarter</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_quarter')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>Every number on this sheet — medians over eight seeds</h2>
<div class="scroll"><table><thead><tr><th>setting</th><th>row</th><th>panel to u</th><th>cells from u</th><th>vs the floor</th><th>panel % of blade</th><th>wall</th><th>bottom 45 % solid</th><th>open mm&sup2;</th><th>lamina wall</th><th>blade open</th><th>real holes</th><th>cells with none</th><th>smallest mm</th><th>tris</th><th>census</th></tr></thead><tbody>${tRows}</tbody></table></div>
<p class="lede" style="margin-top:14px">Default petal ${L} mm long, sheet ${ctx.t} mm, EXPORT mode; the plain petal is ${ctx.plainTris.toLocaleString('en-US')} triangles and the plain bloom 19,040.
The blade's plan area is ${num(A_BLADE, 1)} mm&sup2;. Census on every state, every seed, both walls: boundary edges 0, one vertex-welded shell, one voxel piece at 0.6 mm and at 0.3 mm — the two non-manifold edges are the base panel's own overlap weld, unrated here as in the gates.
No pixel delta is quoted anywhere: the rasteriser is deterministic, so no same-tree control is owed and none is claimed.</p>
</div>`;
const file = path.join(OUT, 'infill-lamina-floor.html');
fs.writeFileSync(file, html);
console.log(`\nsheet: ${file}`);
