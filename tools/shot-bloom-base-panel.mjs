/* ===================================================================
   shot-bloom-base-panel.mjs — THE SOLID BASE PANEL AGAINST THE PATTERN.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it drives `tools/bloom-voronoi-proto.mjs`'s salvage field at the
   shortlist `tools/bloom-infill-base-panel.mjs` measured, and renders each beside
   the field as it stands.

     node tools/shot-bloom-base-panel.mjs [--out <dir>] [--quick]

   `--quick` renders two cells — prove the tool on two rows, then run the grid once
   (the charter's own convention for a sheet tool).

   WHAT VARIES. BOTH LEVERS AT ONCE, which is the point: the BOUNDARY (where the solid
   base panel stops) and the field's own BASAL V and BASE CELL SIZE. Every session
   before this one moved one at a time, and each alone does nothing — lowering the
   boundary leaves the V converging the pattern out above it, and shallowing the V
   leaves the panel filling the bottom of the picture. The metric, the seeding law,
   the four Lloyd passes, the 0.8 mm fillet, `tipGamma` and the wall law are the
   salvage's own and are untouched.

   THE NUMBER ON EVERY CELL IS THE PANEL'S SHARE OF THE BLADE. It is a function of the
   BOUNDARY ALONE — no grading moves a square millimetre of it — and it is what Eva is
   actually judging, so it is in every caption and in the table rather than left to be
   inferred from a picture. Beside it is the fraction of the blade's own bottom 45 %
   that is SOLID: the panel AND the pattern's wall together.

   EVERY PETAL CELL IS ONE SEED AND THE CAPTIONS SAY SO. A petal picture is seed `SEED`
   alone — a LAYOUT, not a measurement — and each caption carries the sweep's own
   eight-seed median beside it. The whole-bloom cells are the eight petals at their own
   eight seeds, which IS that population.

   NO PIXEL DELTA IS QUOTED ANYWHERE. The rasteriser is deterministic, so no same-tree
   control is owed and none is claimed; the pictures are for Eva's eye and the numbers
   are in the captions.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as P from './bloom-voronoi-proto.mjs';
import * as M from './bloom-infill-base-panel.mjs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', path.join(os.tmpdir(), 'bloom-base-panel'));
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });

const ctx = P.context({});
const L = ctx.L, N_CELLS = M.N_CELLS;
const hAt = (u) => ctx.surface.profile.halfWidthAt(u);
const A_BLADE = M.areaU(hAt, L, 0, 1);
const WALLS = QUICK ? [1.0] : M.WALLS;
const num = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(d));
const pct = (x, d = 1) => `${(100 * x).toFixed(d)} %`;

/* THE SHORTLIST. `mSplit` is the boundary as a ROW INDEX, because the split is a row
   index and a target between two stations snaps to one — naming the row is naming the
   boundary exactly. Each caption prints the boundary the tool BUILT. */
const SETTINGS = [
  { key: 'now', mSplit: 19, opts: { converge: P.CONVERGE_FRACTION, baseNarrow: P.BASE_NARROWING },
    label: 'THE FIELD AS IT STANDS',
    note: 'the boundary at <code>ROOT_BLEND_END</code>, basal V 0.10 of the length, cells at the boundary 0.75 of the mid-blade spacing — what ships in the prototype today, and the control every other cell is read against' },
  { key: 'd', mSplit: 18, opts: { converge: 0.050, baseNarrow: 1.50 },
    label: 'D — ONE LATTICE ROW DOWN, BOTH LEVERS MOVED',
    note: 'the lowest boundary at which #250’s OWN truncation still reproduces the roll-330 readings EXACTLY, so this cell is available even under the superseded reading; with the V halved and the base cells enlarged' },
  { key: 'e', mSplit: 14, opts: { converge: 0.050, baseNarrow: 1.50 },
    label: 'E — THE BOUNDARY AT u 0.214',
    note: 'five rows down; the same grading. Nothing measured binds here — the self-approach constraint does not bind on an infilled state at any boundary swept' },
  { key: 'f', mSplit: 10, opts: { converge: 0.050, baseNarrow: 1.50 },
    label: 'F — THE BOUNDARY AT u 0.143',
    note: 'nine rows down, the lowest on this sheet; the same grading. The panel is a third of what it is today' },
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
  const F = P.fieldSalvage(ctx, N_CELLS, { ...S.opts, u0: target, seed: P.SEED });
  const m = P.measure(ctx, F, wall);
  const r = P.cutThrough(ctx, F, wall);
  const agg = M.gridState(ctx, target, S.opts, wall);              /* the same state over all eight seeds */
  const rec = { ...S, wall, target, uPanel: agg.uPanel, uOv: F.uOv, m, agg };
  rows.push(rec);
  return { rec, pos: new Float32Array(r.acc.pos) };
}
const cap = (r) => {
  const m = r.m, a = r.agg;
  return `<b>${r.label}</b> — wall ${num(r.wall, 1)} mm, boundary row ${r.mSplit} (panel to u ${num(a.uPanel, 4)}, cells from u ${num(a.uOv, 4)}), converge ${num(r.opts.converge, 3)}, base ${num(r.opts.baseNarrow, 2)}.
  <b>THE SOLID BASE PANEL IS ${num(a.panelMm2, 1)} mm&sup2; OF THE BLADE'S ${num(a.bladeMm2, 1)} — ${pct(a.panelShare)}</b>, and no grading moves any of it.
  <b>The bottom 45 % of the blade is ${pct(a.bottom45Solid)} solid</b> (panel and wall together) against ${pct(rows[0].agg.bottom45Solid)} as the field stands.
  <b>This seed:</b> ${m.cells} cells, ${m.real} real holes (&ge; ${num(G.MIN_FEATURE_MM, 1)} mm), lowest hole u ${num(m.lowestHoleU, 4)}, the basal band is ${pct(m.basal.wallFraction)} wall, bottoms spread ${num(m.basal.edgeRangeMm)} mm; ${m.tris.toLocaleString('en-US')} tris.
  Boundary edges ${m.boundary}, ${m.shells} shell, ${m.voxel06} voxel piece at 0.6 mm and ${m.voxel03} at 0.3.
  <i>Over all eight seeds: basal band ${pct(a.basalWall)} wall [${pct(a.basalWallRange[0])}&ndash;${pct(a.basalWallRange[1])}], ${a.basalHoles} basal holes of which ${a.basalReal} are real, bottoms spread ${num(a.basalEdgeRangeMm)} mm; the blade is ${pct(a.bladeOpen)} open; tip band ${a.tipReal} real holes, median ${num(a.tipMedian)} mm, apex cap ${num(a.capMm)} mm; smallest hole anywhere ${num(a.holeMin)} mm. ${r.note}.</i>`;
};

if (QUICK) {
  for (const S of SETTINGS.slice(0, 2)) { const { rec, pos } = petal(S, 1.0); shoot(`q_${S.key}`, pos, cap(rec))(petalCam()); }
} else {
  for (const wall of WALLS) for (const S of SETTINGS) { const { rec, pos } = petal(S, wall); shoot(`petal_${S.key}_w${wall.toFixed(1)}`, pos, cap(rec))(petalCam()); }
  /* THE MACRO IS WHERE THE PROPORTION READS — framed on the base, one camera for all four. */
  for (const S of SETTINGS) {
    const target = ctx.rows[S.mSplit].u;
    const F = P.fieldSalvage(ctx, N_CELLS, { ...S.opts, u0: target, seed: P.SEED });
    const m = P.measure(ctx, F, 1.0); const r = P.cutThrough(ctx, F, 1.0);
    const a = rows.find((x) => x.key === S.key && x.wall === 1.0).agg;
    shoot(`macro_${S.key}`, new Float32Array(r.acc.pos),
      `<b>MACRO — ${S.label}</b>, wall 1.0 mm, 9 mm half-height at the base. <b>The solid base panel runs to u ${num(a.uPanel, 4)} and is ${pct(a.panelShare)} of the blade</b>; the cells start at u ${num(a.uOv, 4)} and the lowest hole bottoms at u ${num(m.lowestHoleU, 4)}.
      The bottom 45 % of the blade is <b>${pct(a.bottom45Solid)} solid</b> here against ${pct(rows[0].agg.bottom45Solid)} as the field stands; the basal band is ${pct(m.basal.wallFraction)} wall on this seed and ${pct(a.basalWall)} over eight. <i>${S.note}.</i>`)(petalCam(9, [-BLADE[0] * 5.5, 0, -BLADE[2] * 5.5]));
  }
  /* ---- the whole bloom: eight petals at their own eight seeds, plus the shipped hub ---- */
  const accP = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(accP, { ...DEFAULTS });
  const blooms = [{ key: 'plain', pos: new Float32Array(accP.positions), label: 'PLAIN (what ships)', tris: accP.triangleCount, note: 'no infill at all — the control', wall: null, share: null }];
  for (const wall of WALLS) for (const S of SETTINGS) {
    const target = ctx.rows[S.mSplit].u;
    const wb = P.wholeBloom('salvage', N_CELLS, wall, { ...DEFAULTS }, { ...S.opts, u0: target });
    const c = P.census(wb.acc.pos);
    const a = rows.find((x) => x.key === S.key && x.wall === wall).agg;
    blooms.push({ key: `${S.key}_w${wall.toFixed(1)}`, pos: new Float32Array(wb.acc.pos), label: S.label, tris: wb.tris, wall, share: a.panelShare, bottom: a.bottom45Solid,
      note: `${S.note}. Boundary edges ${c.boundary}, ${P.floodFill(wb.acc.pos, 0.6)} voxel piece at 0.6 mm` });
  }
  for (const v of ['above', 'quarter']) for (const bl of blooms) {
    shoot(`bloom_${v}_${bl.key}`, bl.pos,
      `<b>WHOLE BLOOM, ${bl.label}${bl.wall ? `, wall ${num(bl.wall, 1)} mm` : ''}, ${v === 'above' ? 'from above' : 'three-quarter'}.</b> ${bl.tris.toLocaleString('en-US')} tris${bl.wall ? `, ${N_CELLS} cells a petal, each petal from its own seed. <b>The solid base panel is ${pct(bl.share)} of each blade</b> and its bottom 45 % is ${pct(bl.bottom)} solid` : ''}. <i>${bl.note}.</i>`)(v === 'above' ? bloomAbove : bloomQuarter);
  }
}

/* ---- the page ---- */
const tRows = rows.map((r) => `<tr><td>${r.label.split(' — ')[0]}</td><td>${r.mSplit}</td><td>${num(r.agg.uPanel, 4)}</td><td><b>${pct(r.agg.panelShare)}</b></td><td>${num(r.opts.converge, 3)}</td><td>${num(r.opts.baseNarrow, 2)}</td><td>${num(r.wall, 1)}</td><td><b>${pct(r.agg.bottom45Solid)}</b></td><td>${num(r.agg.lowestHoleU, 4)}</td><td>${pct(r.agg.basalWall)}</td><td>${num(r.agg.basalEdgeRangeMm)}</td><td>${pct(r.agg.bladeOpen)}</td><td>${r.agg.real}</td><td>${num(r.agg.holeMin)}</td><td>${r.agg.tipReal}</td><td>${num(r.agg.tipMedian)}</td><td>${num(r.agg.capMm)}</td><td>${r.agg.tris.toLocaleString('en-US')}</td><td>${r.agg.clean ? 'clean' : 'NOT CLEAN'}</td></tr>`).join('');
const html = `<title>Infill Base Panel</title>
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
<h1>The solid base panel — the boundary and the field moved together</h1>
<p class="lede">The salvaged Voronoi field at ${N_CELLS} cells, with BOTH levers moved at once: where the solid base panel stops, and
how the field grades into it. Every session before this one moved one at a time, and each alone does nothing — lowering the boundary
leaves the V converging the pattern out above it, and shallowing the V leaves the panel filling the bottom of the picture. Everything
else — the anisotropic metric, the seeding law, the four Lloyd passes, the 0.8 mm fillet, the tip grading and the wall law — is the
salvage's own and is untouched. Each petal picture is ONE SEED; the eight-seed median is in every caption and in the table.</p>
<div class="note"><b>THE NUMBER TO READ IS THE PANEL'S SHARE OF THE BLADE.</b> The blade's plan area is ${num(A_BLADE, 1)} mm&sup2;.
The solid base panel is everything below the boundary, it is a function of the BOUNDARY ALONE, and no grading on this sheet or the
last one moves a square millimetre of it. As the field stands it is <b>${num(rows[0] ? rows[0].agg.panelMm2 : 0, 1)} mm&sup2;,
${rows[0] ? pct(rows[0].agg.panelShare) : 'n/a'} of the blade</b>. It is on every caption below, and beside it the fraction of the
blade's own bottom 45 % that is SOLID — the panel and the pattern's wall together, which is what the eye actually reads.</div>
<div class="note"><b>WHAT THE BOUNDARY COSTS, in one line.</b> The constraint that pinned it — <code>measureWall</code>'s SELF reading
on <code>SHIPPED roll 330</code> — does NOT bind on an infilled state at any boundary swept: the shipped lattice masked by the holes
reproduces the plain petal's 0.6586 mm at every one of them, and on none of 120 (state &times; wall &times; boundary) rows does the
infilled sheet come closer to itself than the plain one. On the plain reading the lowest boundary that reproduces it exactly is one
lattice row below where it sits today. <b>The structural note, said once and not solved: the base is where a cantilevered petal's
bending moment is highest, so removing material there is structurally the worst place for it — and nothing in this project has ever
been printed.</b></div>
<h2>The petal alone</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('petal_') || c.name.startsWith('q_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The base, close</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('macro_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, from above</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_above')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, three-quarter</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_quarter')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>Every number on this sheet — medians over eight seeds</h2>
<div class="scroll"><table><thead><tr><th>setting</th><th>row</th><th>panel to u</th><th>panel % of blade</th><th>converge</th><th>base</th><th>wall</th><th>bottom 45 % solid</th><th>lowest hole u</th><th>basal wall</th><th>bottoms mm</th><th>blade open</th><th>real holes</th><th>smallest mm</th><th>tip real</th><th>tip median</th><th>cap mm</th><th>tris</th><th>census</th></tr></thead><tbody>${tRows}</tbody></table></div>
<p class="lede" style="margin-top:14px">Default petal ${L} mm long, sheet ${ctx.t} mm, EXPORT mode; the plain petal is ${ctx.plainTris.toLocaleString('en-US')} triangles and the plain bloom 19,040.
Census on every state, every seed, both walls: boundary edges 0, one vertex-welded shell, one voxel piece at 0.6 mm and at 0.3 mm — the two non-manifold edges are the base panel's own overlap weld, unrated here as in the gates.
No pixel delta is quoted anywhere: the rasteriser is deterministic, so no same-tree control is owed and none is claimed.</p>
</div>`;
const file = path.join(OUT, 'infill-base-panel.html');
fs.writeFileSync(file, html);
console.log(`\nsheet: ${file}`);
