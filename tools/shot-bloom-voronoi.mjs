/* ===================================================================
   shot-bloom-voronoi.mjs — THE VORONOI SALVAGE SHEET.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. Renders the meshes `bloom-voronoi-proto.mjs`
   wrote (`--in <dir>`, its `--out`) with the software rasteriser and assembles one
   HTML sheet with every measured number in the caption it belongs to.
     node tools/shot-bloom-voronoi.mjs --in <dir> [--out <file.html>] [--quick]
   `--quick` renders two cells (the reference and one other) — prove the tool on two
   rows, then run the grid once (the charter's own convention for a sheet tool).
   Every petal cell shares ONE camera: face-on along the petal's own sheet normal,
   the blade running up the frame; the whole-bloom cells share one camera per view.
   No pixel delta is quoted: the rasteriser is deterministic, and a picture judged by
   eye needs no floor.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { render, writePng } from './bloom-soft-render.mjs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const IN = arg('--in'); if (!IN) { console.error('usage: node tools/shot-bloom-voronoi.mjs --in <dir from bloom-voronoi-proto.mjs --out> [--out sheet.html] [--quick]'); process.exit(2); }
const OUT = arg('--out', path.join(IN, 'voronoi-salvage-sheet.html')); const QUICK = process.argv.includes('--quick');
const R = JSON.parse(fs.readFileSync(path.join(IN, 'report.json'), 'utf8'));
const load = (n) => new Float32Array(fs.readFileSync(path.join(IN, `${n}.bin`)).buffer.slice(0));
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx, c: mn.map((m, k) => (m + mx[k]) / 2) }; };
const W = 520, H = 460;
/* the default petal at slot 0 lies along +x, tilted 25 deg: sheet normal [-sin, 0, cos], blade direction [cos, 0, sin] */
const TILT = 25 * Math.PI / 180; const NRM = [-Math.sin(TILT), 0, Math.cos(TILT)], BLADE = [Math.cos(TILT), 0, Math.sin(TILT)];
const petalCenter = bbox(load('plain')).c;
const petalCam = (hh = 21, shift = [0, 0, 0]) => ({ dir: NRM, up: BLADE, center: [petalCenter[0] + shift[0], petalCenter[1] + shift[1], petalCenter[2] + shift[2]], halfHeight: hh });
const bloomCamAbove = (p) => ({ dir: [0, 0, 1], up: [0, 1, 0], center: bbox(p).c, halfHeight: 46 });
const bloomCamQuarter = (p) => ({ dir: [0.62, -0.55, 0.56], up: [0, 0, 1], center: bbox(p).c, halfHeight: 42 });
const rowOf = (name) => R.rows.find((r) => r.name === name);
const num = (x, d = 2) => x.toFixed(d);
const cells = [];
function cell(name, file, caption, cam, opts = {}) {
  const p = load(file); const rgb = render(p, W, H, typeof cam === 'function' ? cam(p) : cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3], ...opts });
  const png = path.join(IN, `${name}.png`); writePng(png, W, H, rgb); cells.push({ name, caption, png: fs.readFileSync(png).toString('base64') }); console.log('rendered', name, p.length / 9, 'tris');
}
const capPetal = (r, label) => `<b>${label}</b> — ${r.cells} cells, wall ${num(r.wall, 1)} mm: ${r.real} real holes (≥ 1.0 mm), median ${num(r.holeMedian)} mm, wall ${num(100 * r.wallFraction, 0)} % of the lamina, solid apex cap ${num(r.capMm)} mm (floor ${num(r.capFloorMm)}), mid-blade anisotropy ${r.anisoMid === null ? 'n/a' : num(r.anisoMid)}, ${r.tris.toLocaleString()} tris, boundary ${r.boundary}, ${r.shells} shell, ${r.voxel06} voxel piece.`;
if (QUICK) {
  cell('q_legacy', 'legacy_N16_w1.0', capPetal(rowOf('legacy_N16_w1.0'), 'FIRST PROTOTYPE, 16 cells'), petalCam());
  cell('q_salvage', 'salvage_N16_w1.0', capPetal(rowOf('salvage_N16_w1.0'), 'SALVAGED, 16 cells'), petalCam());
} else {
  for (const N of [10, 16, 24]) cell(`legacy${N}`, `legacy_N${N}_w1.0`, capPetal(rowOf(`legacy_N${N}_w1.0`), `FIRST PROTOTYPE, ${N} cells`) + ' Isotropic, uniform, straight inset — the sheet Eva rejected.', petalCam());
  for (const N of [10, 16, 24]) cell(`salvage${N}`, `salvage_N${N}_w1.0`, capPetal(rowOf(`salvage_N${N}_w1.0`), `SALVAGED, ${N} cells`) + ` Fillets ${R.petal.FILLET_MM} mm, metric ${R.petal.ANISO}× along the midrib, ${R.petal.LLOYD_PASSES} density-weighted Lloyd passes in that metric, graded spacing.`, petalCam());
  for (const N of [10, 16, 24]) cell(`salvage${N}w08`, `salvage_N${N}_w0.8`, capPetal(rowOf(`salvage_N${N}_w0.8`), `SALVAGED at a 0.8 mm wall, ${N} cells`), petalCam());
  cell('macro_tip', 'salvage_N24_w1.0', `<b>MACRO — the tip taper</b>, salvaged 24 cells, wall 1.0 mm, 7 mm half-height. Cells shrink with the half-width toward the apex; the last real hole ends ${num(rowOf('salvage_N24_w1.0').capMm)} mm below the apex against an outline floor of ${num(rowOf('salvage_N24_w1.0').capFloorMm)} mm.`, petalCam(7, [BLADE[0] * 13, 0, BLADE[2] * 13]));
  cell('macro_base', 'salvage_N24_w1.0', `<b>MACRO — the basal convergence</b>, the same petal, 7 mm half-height at the top of the solid zone. Holes are suppressed below a V that reaches ${num(100 * R.petal.CONVERGE_FRACTION, 0)} % of the length up the margins, and cells there are narrowed to ${num(100 * R.petal.BASE_NARROWING, 0)} % of the mid-blade spacing, so the walls run into the base instead of ending on a line.`, petalCam(8, [-BLADE[0] * 4, 0, -BLADE[2] * 4]));
  const bp = load('bloom_plain');
  cell('bloom_plain_above', 'bloom_plain', `<b>WHOLE BLOOM, plain, from above.</b> ${R.bloom_plain.tris.toLocaleString()} tris.`, bloomCamAbove);
  cell('bloom_legacy_above', 'bloom_legacy16', `<b>WHOLE BLOOM, FIRST PROTOTYPE, from above.</b> 16 cells a petal, ${R.bloom_legacy16.tris.toLocaleString()} tris — the doily.`, bloomCamAbove);
  cell('bloom_salvage_above', 'bloom_salvage16', `<b>WHOLE BLOOM, SALVAGED, from above.</b> 16 cells a petal, ${R.bloom_salvage16.tris.toLocaleString()} tris, boundary ${R.bloom_salvage16.census.boundary}, ${R.bloom_salvage16.voxel06} voxel piece. The cell that decides it.`, bloomCamAbove);
  cell('bloom_plain_q', 'bloom_plain', `<b>WHOLE BLOOM, plain, three-quarter.</b>`, bloomCamQuarter);
  cell('bloom_legacy_q', 'bloom_legacy16', `<b>WHOLE BLOOM, FIRST PROTOTYPE, three-quarter.</b>`, bloomCamQuarter);
  cell('bloom_salvage_q', 'bloom_salvage16', `<b>WHOLE BLOOM, SALVAGED, three-quarter.</b>`, bloomCamQuarter);
}
const grid = (arr) => `<div class="grid">${arr.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`;
const tableRows = R.rows.map((r) => `<tr><td>${r.kind}</td><td>${r.N}</td><td>${num(r.wall, 1)}</td><td>${r.cells}</td><td>${r.real}</td><td>${num(r.holeMedian)}</td><td>${num(100 * r.wallFraction, 0)} %</td><td>${num(r.capMm)}</td><td>${num(r.capFloorMm)}</td><td>${r.anisoMid === null ? '—' : num(r.anisoMid)}</td><td>${r.tris.toLocaleString()}</td><td>${r.boundary}</td><td>${r.shells}</td><td>${r.voxel06} / ${r.voxel03}</td></tr>`).join('');
const mc = R.metricControls;
const html = `<title>Voronoi Salvage Sheet</title>
<style>
:root{--ground:#f4f3ef;--ink:#1d1c1a;--muted:#5d5a54;--rule:#d6d2c9;--panel:#ebe8e1;--accent:#4c6b62;--mono:"SFMono-Regular",Menlo,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#16161a;--ink:#e6e3dc;--muted:#a09c93;--rule:#33333a;--panel:#1f1f25;--accent:#8fb8ab}}
:root[data-theme="dark"]{--ground:#16161a;--ink:#e6e3dc;--muted:#a09c93;--rule:#33333a;--panel:#1f1f25;--accent:#8fb8ab}
body{background:var(--ground);color:var(--ink);font:15px/1.5 Georgia,"Iowan Old Style",serif;margin:0;padding-block:28px;padding-inline:clamp(16px,4vw,40px);max-width:1280px;margin-inline:auto}
h1{font-size:1.6rem;font-weight:600;margin:0 0 6px;text-wrap:balance}h2{font-size:1.02rem;font-weight:600;margin:30px 0 10px;color:var(--accent);letter-spacing:.01em}
.lead{color:var(--muted);max-width:68ch;font-size:.93rem}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}@media (max-width:760px){.grid{grid-template-columns:1fr}}
.cell img{width:100%;max-width:100%;display:block;border:1px solid var(--rule);border-radius:2px}.cap{font-size:.84rem;color:var(--muted);margin-top:7px;line-height:1.45}.cap b{color:var(--ink);font-weight:600}
.tw{overflow-x:auto;border:1px solid var(--rule);border-radius:2px}table{border-collapse:collapse;font:.8rem/1.4 var(--mono);font-variant-numeric:tabular-nums;min-width:820px}td,th{border-bottom:1px solid var(--rule);padding:5px 9px;text-align:right;white-space:nowrap}th{background:var(--panel);font-weight:600;text-align:right}td:first-child,th:first-child{text-align:left}
.note{color:var(--muted);font-size:.86rem;max-width:80ch}code{font-family:var(--mono);font-size:.86em}
</style>
<h1>Voronoi Salvage Sheet</h1>
<p class="lead">The bloom's Voronoi infill rebuilt with Eva's three changes — rounded wall junctions, an anisotropic metric along the midrib with Lloyd run in that metric, and graded cell density — beside the first prototype and the plain bloom. Every mesh is built on the real <code>petalSurface(u, v)</code> in EXPORT mode at DEFAULTS by <code>tools/bloom-voronoi-proto.mjs</code>; nothing in the repository's geometry changed. Rendered by <code>tools/bloom-soft-render.mjs</code>, a deterministic software rasteriser, so no pixel control is owed. Default petal ${R.petal.L} × 16 mm on a ${R.petal.sheet} mm sheet; solid basal zone u ≤ ${R.petal.boundaryU} (row ${R.petal.boundaryRow}, the derived lamina floor — this sheet was first rendered when it was <code>ROOT_BLEND_END</code> = ${R.petal.U0}); construction B (one shell, cells tiling both skins); seed 7, mirrored about the midrib. ${new Date().toISOString().slice(0, 10)}.</p>
${QUICK ? grid(cells) : `
<h2>1 · The first prototype, the one Eva rejected — 10 / 16 / 24 cells, wall 1.0 mm</h2>${grid(cells.slice(0, 3))}
<h2>2 · Salvaged — the same three densities, wall 1.0 mm</h2>${grid(cells.slice(3, 6))}
<h2>3 · Salvaged at a 0.8 mm wall</h2>${grid(cells.slice(6, 9))}
<h2>4 · Macros — the tip taper, the basal convergence — and the plain bloom from above</h2>${grid(cells.slice(9, 12))}
<h2>5 · The whole bloom from above: first prototype, salvaged — and the plain bloom three-quarter</h2>${grid(cells.slice(12, 15))}
<h2>6 · Three-quarter: first prototype and salvaged</h2>${grid(cells.slice(15))}`}
<h2>Every row, measured</h2>
<div class="tw"><table><tr><th>field</th><th>N</th><th>wall mm</th><th>cells</th><th>real holes</th><th>median hole mm</th><th>wall fraction</th><th>cap built mm</th><th>cap floor mm</th><th>aniso mid-blade</th><th>tris</th><th>boundary</th><th>shells</th><th>voxel 0.6 / 0.3</th></tr>${tableRows}</table></div>
${mc ? `<p class="note">Metric controls, median principal ratio of the mid-blade cells at 16 cells, wall 1.0: seeded, relaxed and cut in the anisotropic metric ${num(mc.shipped)} · relaxed FLAT, cut anisotropic ${num(mc.relaxFlatCellAniso)} · relaxed FLAT, cut FLAT ${num(mc.relaxFlatCellFlat)} · no relaxation, cut anisotropic ${num(mc.noRelaxCellAniso)} · relaxed anisotropic, cut FLAT ${num(mc.relaxAnisoCellFlat)}. The metric the cells are CUT in carries the anisotropy; the relaxation metric evens the lattice.</p>` : ''}
`;
fs.writeFileSync(OUT, html); console.log('sheet written', OUT, (fs.statSync(OUT).size / 1024).toFixed(0), 'KB');
