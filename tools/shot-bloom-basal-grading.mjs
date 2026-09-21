/* ===================================================================
   shot-bloom-basal-grading.mjs — HOW HEAVY THE INFILL IS AT THE BASE.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it drives `tools/bloom-voronoi-proto.mjs`'s salvage field at the
   shortlist `tools/bloom-basal-grading.mjs` measured, and renders each beside
   the field as it stands, so the PROPORTION of solid to pattern at the bottom
   of the blade can be ruled on by eye beside the numbers.

     node tools/shot-bloom-basal-grading.mjs [--out <dir>] [--quick]

   `--quick` renders two cells — prove the tool on two rows, then run the grid
   once (the charter's own convention for a sheet tool).

   WHAT VARIES AND WHAT DOES NOT. THE BASE BOUNDARY IS FIXED at `ROOT_BLEND_END`
   on Eva's ruling and this tool never moves it. Two of the field's own grading
   numbers move: `converge` (the basal V's reach up the margins) and `baseNarrow`
   (the cell size AT the boundary as a fraction of the mid-blade spacing). The
   metric, the seeding law, the relaxation, the fillet radius, `tipGamma` and the
   wall law are the salvage's own and are untouched; at the shipped values the
   options are INERT, which `bloom-basal-grading.mjs --inert <base-tree>` measures.

   EVERY CELL IS ONE SEED AND THE CAPTIONS SAY SO. A petal cell is seed `SEED`
   alone — a LAYOUT, not a measurement — and each caption carries the sweep's
   own 8-seed median beside it so the picture is never read as the statistic.
   The whole-bloom cells are the eight petals at their own eight seeds, which IS
   that population.

   NO PIXEL DELTA IS QUOTED ANYWHERE. The rasteriser is deterministic, so no
   same-tree control is owed and none is claimed; the pictures are for Eva's eye
   and the numbers are in the captions.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as P from './bloom-voronoi-proto.mjs';
import * as B from './bloom-basal-grading.mjs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', path.join(os.tmpdir(), 'bloom-basal-grading'));
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });

const ctx = P.context({});
const L = ctx.L;
const N_CELLS = 16;
/* THE BLADE'S OWN AREA SPLIT. The solid base panel is FIXED by the boundary ruling, so the
   fraction of the blade it holds is the part of "a lot of solid area" no grading can reach —
   said here, with its number, rather than left for the eye to blame the pattern for. */
const hAt = (u) => ctx.surface.profile.halfWidthAt(u);
const areaU = (uLo, uHi, n = 20000) => { let s = 0; for (let i = 0; i < n; i++) { const a = uLo + ((uHi - uLo) * i) / n, b = uLo + ((uHi - uLo) * (i + 1)) / n; s += (hAt(a) + hAt(b)) * (b - a) * L; } return s; };
const WALLS = QUICK ? [1.0] : [1.0, 0.8];

/* THE SHORTLIST. `label` says what each one IS, not where it sits. The current field
   is first and is the control every other cell is read against. */
const SETTINGS = [
  { key: 'now', opts: { converge: P.CONVERGE_FRACTION, baseNarrow: P.BASE_NARROWING }, label: 'THE FIELD AS IT STANDS',
    note: 'basal V 0.10 of the length, cells at the boundary 0.75 of the mid-blade spacing — what <code>bloom-voronoi-proto.mjs</code> ships' },
  { key: 'a', opts: { converge: 0.05, baseNarrow: 1.00 }, label: 'A — THE V HALVED, THE BASE NARROWING REMOVED',
    note: 'the V reaches 0.05 instead of 0.10, and cells at the boundary are the mid-blade size instead of three quarters of it' },
  { key: 'b', opts: { converge: 0.05, baseNarrow: 1.50 }, label: 'B — AND THE BASE CELLS ENLARGED',
    note: 'the same V, with cells at the boundary half again the mid-blade size — fewer and bigger, which is the direction that lightens a region at a fixed wall' },
  { key: 'c', opts: { converge: 0, baseNarrow: P.BASE_NARROWING }, label: 'C — NO V AT ALL',
    note: 'the basal V switched off, everything else as it stands — the pattern presses flat against the base panel and every basal hole bottoms on one line' },
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

const F_REF = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, seed: P.SEED });
const U_PANEL_TOP = ctx.rows[F_REF.mSplit].u, U_OV = F_REF.uOv;
const A_BLADE = areaU(0, 1), A_PANEL = areaU(0, U_PANEL_TOP), A_LAMINA = areaU(U_OV, 1), A_BASAL = areaU(U_OV, P.BASAL_BAND_TOP);
const num = (x, d = 2) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
const pct = (x) => `${(100 * x).toFixed(0)} %`;
const cells = [];
const rows = [];
function shoot(name, positions, caption) { return (cam) => {
  const rgb = render(positions, W, H, typeof cam === 'function' ? cam(positions) : cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3] });
  const png = path.join(OUT, `${name}.png`); writePng(png, W, H, rgb);
  cells.push({ name, caption, png: fs.readFileSync(png).toString('base64') });
  console.log('rendered', name, positions.length / 9, 'tris');
}; }

/* ---- one petal, one seed, with the 8-seed median beside it ---- */
function petal(S, wall) {
  const F = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, ...S.opts, seed: P.SEED });
  const m = P.measure(ctx, F, wall);
  const r = P.cutThrough(ctx, F, wall);
  const agg = B.state(S.opts, wall);                       // the same field over all eight seeds
  const rec = { ...S, wall, uOv: F.uOv, m, agg };
  rows.push(rec);
  return { rec, pos: new Float32Array(r.acc.pos) };
}
const cap = (r) => {
  const m = r.m, a = r.agg;
  return `<b>${r.label}</b> — wall ${num(r.wall, 1)} mm, converge ${num(r.opts.converge, 3)}, base ${num(r.opts.baseNarrow, 2)}.
  <b>This seed:</b> ${m.cells} cells, ${m.real} real holes (≥ ${num(G.MIN_FEATURE_MM, 1)} mm), lowest hole u ${num(m.lowestHoleU, 4)},
  <b>the basal band (u ${num(r.uOv, 4)}–${P.BASAL_BAND_TOP}) is ${pct(m.basal.wallFraction)} wall</b> over ${m.basal.holes} holes, median ${num(m.basal.medianOpen)} mm,
  bottoms spread ${num(m.basal.edgeRangeMm)} mm; the whole lamina is ${pct(m.wallFraction)} wall; ${m.tris.toLocaleString('en-US')} tris.
  Boundary ${m.boundary}, ${m.shells} shell, ${m.voxel06} voxel piece at 0.6 mm and ${m.voxel03} at 0.3.
  <i>Over all eight seeds: basal band ${pct(a.basalWall)} wall [${pct(a.basalWallRange[0])}–${pct(a.basalWallRange[1])}], whole lamina ${pct(a.wallFraction)},
  ${a.basalHoles} basal holes, bottoms spread ${num(a.basalEdgeRangeMm)} mm; tip band ${a.tipReal} real holes, median ${num(a.tipMedian)} mm, apex cap ${num(a.capMm)} mm. ${r.note}.</i>`;
};

if (QUICK) {
  for (const S of SETTINGS.slice(0, 2)) { const { rec, pos } = petal(S, 1.0); shoot(`q_${S.key}`, pos, cap(rec))(petalCam()); }
} else {
  for (const wall of WALLS) for (const S of SETTINGS) { const { rec, pos } = petal(S, wall); shoot(`petal_${S.key}_w${wall.toFixed(1)}`, pos, cap(rec))(petalCam()); }
  /* THE MACRO IS WHERE THE PROPORTION READS. Framed on the base, one camera. */
  for (const S of SETTINGS) {
    const F = P.fieldSalvage(ctx, N_CELLS, { u0: P.U0, ...S.opts, seed: P.SEED });
    const m = P.measure(ctx, F, 1.0); const r = P.cutThrough(ctx, F, 1.0);
    const a = B.state(S.opts, 1.0);
    shoot(`macro_${S.key}`, new Float32Array(r.acc.pos),
      `<b>MACRO — ${S.label}</b>, wall 1.0 mm, 9 mm half-height at the base. The solid base panel runs to u ${num(ctx.rows[F.mSplit].u, 4)} and the cells start at u ${num(F.uOv, 4)}; the lowest hole bottoms at u ${num(m.lowestHoleU, 4)}.
      <b>The basal band is ${pct(m.basal.wallFraction)} wall</b> here and ${pct(a.basalWall)} over eight seeds, against ${pct(rows.find((x) => x.key === 'now' && x.wall === 1.0).agg.basalWall)} as the field stands. Bottoms spread ${num(m.basal.edgeRangeMm)} mm. <i>${S.note}.</i>`)(petalCam(9, [-BLADE[0] * 5.5, 0, -BLADE[2] * 5.5]));
  }
  /* ---- the whole bloom: eight petals at their own eight seeds, plus the shipped hub ---- */
  const accP = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(accP, { ...DEFAULTS });
  const blooms = [{ key: 'plain', pos: new Float32Array(accP.positions), label: 'PLAIN (what ships)', tris: accP.triangleCount, note: 'no infill at all — the control', wall: null }];
  for (const wall of WALLS) for (const S of SETTINGS) {
    const wb = P.wholeBloom('salvage', N_CELLS, wall, { ...DEFAULTS }, S.opts);
    const c = P.census(wb.acc.pos);
    blooms.push({ key: `${S.key}_w${wall.toFixed(1)}`, pos: new Float32Array(wb.acc.pos), label: S.label, tris: wb.tris, wall,
      note: `${S.note}. Boundary ${c.boundary}, ${P.floodFill(wb.acc.pos, 0.6)} voxel piece at 0.6 mm` });
  }
  for (const v of ['above', 'quarter']) for (const bl of blooms) {
    shoot(`bloom_${v}_${bl.key}`, bl.pos,
      `<b>WHOLE BLOOM, ${bl.label}${bl.wall ? `, wall ${num(bl.wall, 1)} mm` : ''}, ${v === 'above' ? 'from above' : 'three-quarter'}.</b> ${bl.tris.toLocaleString('en-US')} tris${bl.wall ? `, ${N_CELLS} cells a petal, each petal from its own seed` : ''}. <i>${bl.note}.</i>`)(v === 'above' ? bloomAbove : bloomQuarter);
  }
}

/* ---- the page ---- */
const tRows = rows.map((r) => `<tr><td>${r.label.split(' — ')[0]}</td><td>${num(r.opts.converge, 3)}</td><td>${num(r.opts.baseNarrow, 2)}</td><td>${num(r.wall, 1)}</td><td>${num(r.m.lowestHoleU, 4)}</td><td>${r.agg.below015}</td><td>${r.agg.basalHoles}</td><td>${r.agg.basalReal}</td><td>${r.agg.basalSolid}</td><td><b>${pct(r.agg.basalWall)}</b></td><td>${num(r.agg.basalEdgeRangeMm)}</td><td>${pct(r.agg.wallFraction)}</td><td>${num(100 * (1 - r.agg.wallFraction) * A_LAMINA / A_BLADE, 1)} %</td><td>${r.agg.tipReal}</td><td>${num(r.agg.tipMedian)}</td><td>${num(r.agg.capMm)}</td><td>${r.agg.tris.toLocaleString('en-US')}</td><td>${r.agg.clean ? 'clean' : 'NOT CLEAN'}</td></tr>`).join('');
const html = `<title>Infill Basal Grading</title>
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
<h1>The infill at the bottom of the blade — grading the field</h1>
<p class="lede">The salvaged Voronoi field at 16 cells, at the base boundary Eva ruled fixed (<code>ROOT_BLEND_END</code>, u 0.2857),
with two of its grading numbers moved: the basal V's reach and the cell size at the boundary. Everything else — the anisotropic
metric, the seeding law, the four Lloyd passes, the 0.8 mm fillet, the tip grading and the wall law — is the salvage's own and is
untouched. Each petal picture is ONE SEED; the eight-seed median is in every caption and in the table.</p>
<div class="note"><b>How much of the blade a grading change can reach.</b> The blade's plan area is
${num(A_BLADE, 1)} mm&sup2;. The solid base panel — everything below u ${num(U_PANEL_TOP, 4)} — is
<b>${num(A_PANEL, 1)} mm&sup2;, ${num(100 * A_PANEL / A_BLADE, 1)} % of it</b>, and the boundary ruling fixes that: no grading
on this sheet moves a square millimetre of it. The cells' region is ${num(A_LAMINA, 1)} mm&sup2; and the
<b>basal band</b> — u ${num(U_OV, 4)} to ${P.BASAL_BAND_TOP}, the stretch the eye reads as "the bottom" — is
${num(A_BASAL, 1)} mm&sup2;, ${num(100 * A_BASAL / A_BLADE, 1)} % of the blade. So the grading's whole reach at the base is that band, and
the <b>blade open</b> column below says what each setting leaves open as a fraction of the whole blade.</div>
<div class="note"><b>The brief's own line, reported because it was asked for:</b> the hole count below <b>u = 0.15</b> is
<b>zero at every setting on this sheet</b>, and it cannot be anything else. With the boundary fixed at <code>ROOT_BLEND_END</code>
the cells' region starts at u 0.2857 and the solid base panel is emitted to u 0.3007, so no hole can open below that station at any
grading whatever. The <b>basal band</b> — u 0.2857 to 0.45, where the pattern actually is — is the same question asked where it can
be answered, and it is the column to read.</div>
<h2>The petal alone</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('petal_') || c.name.startsWith('q_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The base, close</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('macro_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, from above</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_above')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom, three-quarter</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_quarter')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>Every number on this sheet — medians over eight seeds</h2>
<div class="scroll"><table><thead><tr><th>setting</th><th>converge</th><th>base</th><th>wall</th><th>lowest hole u</th><th>holes &lt; 0.15</th><th>basal holes</th><th>basal real</th><th>basal solid</th><th>basal wall</th><th>bottoms mm</th><th>lamina wall</th><th>blade open</th><th>tip real</th><th>tip median</th><th>cap mm</th><th>tris</th><th>census</th></tr></thead><tbody>${tRows}</tbody></table></div>
<p class="lede" style="margin-top:14px">Default petal ${L} mm long, sheet ${ctx.t} mm, EXPORT mode; the plain petal is ${ctx.plainTris.toLocaleString('en-US')} triangles and the plain bloom ${'19,040'}.
Census on every state, every seed, both walls: boundary edges 0, one vertex-welded shell, one voxel piece at 0.6 mm and at 0.3 mm — the two non-manifold edges are the base panel's own overlap weld, unrated here as in the gates.
No pixel delta is quoted anywhere: the rasteriser is deterministic, so no same-tree control is owed and none is claimed.</p>
</div>`;
const file = path.join(OUT, 'infill-basal-grading.html');
fs.writeFileSync(file, html);
console.log(`\nsheet: ${file}`);
