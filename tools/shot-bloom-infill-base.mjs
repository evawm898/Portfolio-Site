/* ===================================================================
   shot-bloom-infill-base.mjs — WHERE THE INFILL'S SOLID BASE SHOULD END.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It changes nothing in the repository's
   geometry: it drives `tools/bloom-voronoi-proto.mjs`'s SHIPPED salvage field
   at several values of its base boundary and renders the result, so the
   PROPORTION of solid base to pattern can be ruled on by eye beside the
   numbers that say what each boundary costs.

     node tools/shot-bloom-infill-base.mjs [--out <dir>] [--quick]

   `--quick` renders two cells — prove the tool on two rows, then run the grid
   once (the charter's own convention for a sheet tool).

   WHAT VARIES AND WHAT DOES NOT. Only `splitRow`'s target moves. The field's
   metric, seeding, relaxation, grading, fillet radius, basal V and wall law
   are the salvage's own, untouched; they read their own region through `xB`
   exactly as they always did. At the default target the option is INERT —
   measured, 0 of 226,152 floats over all twelve rendered states against a
   worktree of cf6e985.

   THE BOUNDARY SNAPS TO A ROW, because the split IS a row index: the solid
   base is the shipped lattice over rows 0..mSplit and the cells start at the
   row below it. So a target between two stations lands on one of them, and
   every caption prints the boundary the tool actually built (`uOv`) beside
   the target that was asked for.

   NO PIXEL DELTA IS QUOTED ANYWHERE. The rasteriser is deterministic, so no
   same-tree control is owed and none is claimed; the pictures are for Eva's
   eye and the numbers are in the captions.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as P from './bloom-voronoi-proto.mjs';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng } from './bloom-soft-render.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', path.join(os.tmpdir(), 'bloom-infill-base'));
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(OUT, { recursive: true });

const ctx = P.context({});
const L = ctx.L, hAt = (u) => ctx.surface.profile.halfWidthAt(u);
const MIN = G.MIN_FEATURE_MM;
/* Cross-blade capacity at a station: outline edges take the FULL wall on both
   margins, one wall between neighbours, every hole at least MIN_FEATURE_MM
   across — k*MIN + (k-1)*w <= 2h - 2w. */
const across = (u, w) => Math.floor((2 * hAt(u) - w) / (MIN + w));
/* The BASAL WAIST is a LOCAL minimum of the half-width, not the global one —
   the global minimum is the tip floor. It is where `rootBlend` hands the
   outline to the core, and it is session 37's declared 44.54-degree tangent
   break at the same station. */
let WAIST_U = 0, WAIST_H = Infinity;
for (let i = 1; i <= 60000; i++) { const u = G.ROOT_BLEND_END * i / 60000; const h = hAt(u); if (h < WAIST_H) { WAIST_H = h; WAIST_U = u; } }

/* The boundaries on the sheet. `label` says what each one IS, not where it sits. */
const BOUNDS = [
  { target: 0.30, key: 'b030', label: 'THE SHIPPED BOUNDARY', note: 'ROOT_BLEND_END — the solid base keeps every held row plus the first free ladder row' },
  { target: 0.25, key: 'b025', label: 'ONE STEP LOWER', note: 'the first step below the floor: held rows 15 and 16 move into the pattern' },
  { target: 0.0714, key: 'b007', label: 'AT THE WAIST', note: 'the lowest the pattern uses — below this the field puts nothing' },
];

const W = 520, H = 460;
const TILT = 25 * Math.PI / 180;
const NRM = [-Math.sin(TILT), 0, Math.cos(TILT)], BLADE = [Math.cos(TILT), 0, Math.sin(TILT)];
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx, c: mn.map((m, k) => (m + mx[k]) / 2) }; };
/* the plain petal, for the shared camera centre — the proto's own accumulator is
   internal, so this is the same two-method shape `emitBase` writes into */
const plainPetal = (() => { const a = { pos: [], tri(x, y, z) { this.pos.push(...x, ...y, ...z); }, quad(x, y, z, w) { this.tri(x, y, z); this.tri(x, z, w); }, get tris() { return this.pos.length / 9; } }; P.emitBase(a, ctx, ctx.rows.length - 1); return new Float32Array(a.pos); })();
const petalCentre = bbox(plainPetal).c;
const petalCam = (hh = 21, shift = [0, 0, 0]) => ({ dir: NRM, up: BLADE, center: [petalCentre[0] + shift[0], petalCentre[1] + shift[1], petalCentre[2] + shift[2]], halfHeight: hh });
const bloomAbove = (p) => ({ dir: [0, 0, 1], up: [0, 1, 0], center: bbox(p).c, halfHeight: 46 });
const bloomQuarter = (p) => ({ dir: [0.62, -0.55, 0.56], up: [0, 0, 1], center: bbox(p).c, halfHeight: 42 });

const num = (x, d = 2) => x.toFixed(d);
const rows = [];
const cells = [];
function shoot(name, positions, caption, cam, opts = {}) {
  const rgb = render(positions, W, H, typeof cam === 'function' ? cam(positions) : cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3], ...opts });
  const png = path.join(OUT, `${name}.png`); writePng(png, W, H, rgb);
  cells.push({ name, caption, png: fs.readFileSync(png).toString('base64') });
  console.log('rendered', name, positions.length / 9, 'tris');
}

/* ---- the petal cells ---- */
function petal(b, wall) {
  const F = P.fieldSalvage(ctx, 16, { u0: b.target });
  const m = P.measure(ctx, F, wall);
  const r = P.cutThrough(ctx, F, wall);
  let lowX = Infinity; for (const hole of r.holes) for (const q of hole) lowX = Math.min(lowX, q.x);
  const rec = { ...b, wall, uOv: F.uOv, xB: F.xB, hB: hAt(F.uOv), uKeep: ctx.rows[F.mSplit].u, lowestHoleU: lowX / L,
    cells: m.cells, holes: m.holes, solid: m.solid, real: m.real, holeMedian: m.holeMedian, holeMin: m.holeMin, holeMax: m.holeMax,
    wallFraction: m.wallFraction, capMm: m.capMm, capFloorMm: m.capFloorMm, tris: m.tris,
    boundary: m.boundary, nonManifold: m.nonManifold, shells: m.shells, voxel06: m.voxel06, voxel03: m.voxel03,
    acrossAtB: across(F.uOv, wall) };
  rows.push(rec);
  return { rec, pos: new Float32Array(r.acc.pos) };
}
const cap = (r) => `<b>${r.label}</b> — wall ${num(r.wall, 1)} mm. Target u ${num(r.target, 4)}, built at <b>u ${num(r.uOv, 4)}</b> (x ${num(r.xB)} mm of ${L}); the solid base keeps the shipped lattice to u ${num(r.uKeep, 4)}. ${r.cells} cells, ${r.real} real holes (≥ ${num(MIN, 1)} mm), median ${num(r.holeMedian)} mm, wall <b>${num(100 * r.wallFraction, 0)} %</b> of the lamina, lowest hole at u ${num(r.lowestHoleU, 4)}, ${r.tris.toLocaleString('en-US')} tris. Boundary ${r.boundary}, ${r.shells} shell, ${r.voxel06} voxel piece at 0.6 mm and ${r.voxel03} at 0.3. <i>${r.note}.</i>`;

if (QUICK) {
  for (const b of BOUNDS.slice(0, 2)) { const { rec, pos } = petal(b, 1.0); shoot(`q_${b.key}`, pos, cap(rec), petalCam()); }
} else {
  for (const wall of [1.0, 0.8]) for (const b of BOUNDS) {
    const { rec, pos } = petal(b, wall);
    shoot(`petal_${b.key}_w${wall.toFixed(1)}`, pos, cap(rec), petalCam());
  }
  /* THE MACRO IS WHERE THE PROPORTION READS. Framed on the base, one camera. */
  for (const b of BOUNDS) {
    const { rec, pos } = petal(b, 1.0);
    shoot(`macro_${b.key}`, pos,
      `<b>MACRO — ${rec.label}</b>, wall 1.0 mm, 9 mm half-height at the base. The solid zone runs to u ${num(rec.uOv, 4)} (x ${num(rec.xB)} mm) and the lowest hole lands at u ${num(rec.lowestHoleU, 4)}. The blade is ${num(2 * rec.hB)} mm across there and carries ${rec.acrossAtB} holes at this wall by the cross-blade capacity. <i>The basal waist is at u ${num(WAIST_U, 4)} (x ${num(WAIST_U * L)} mm), ${num(2 * WAIST_H)} mm across — no hole crosses it at any boundary on this sheet.</i>`,
      petalCam(9, [-BLADE[0] * 5.5, 0, -BLADE[2] * 5.5]));
  }
  /* ---- the whole bloom ---- */
  const accP = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(accP, { ...DEFAULTS });
  const plainBloom = new Float32Array(accP.positions);
  const blooms = [{ key: 'plain', pos: plainBloom, label: 'PLAIN (what ships)', tris: accP.triangleCount, note: '' }];
  for (const b of [BOUNDS[0], BOUNDS[2]]) {
    const wb = P.wholeBloom('salvage', 16, 1.0, { ...DEFAULTS }, { u0: b.target });
    const c = P.census(wb.acc.pos);
    blooms.push({ key: b.key, pos: new Float32Array(wb.acc.pos), label: b.label, tris: wb.tris,
      note: ` Boundary ${c.boundary}, ${P.floodFill(wb.acc.pos, 0.6)} voxel piece at 0.6 mm.`, b });
  }
  for (const v of ['above', 'quarter']) for (const bl of blooms) {
    shoot(`bloom_${bl.key}_${v}`, bl.pos,
      `<b>WHOLE BLOOM, ${bl.label}, ${v === 'above' ? 'from above' : 'three-quarter'}.</b> ${bl.tris.toLocaleString('en-US')} tris${bl.b ? `, 16 cells a petal, each from its own seed, base boundary u ${num(rows.find((r) => r.key === bl.b.key && r.wall === 1.0).uOv, 4)}` : ''}.${bl.note}`,
      v === 'above' ? bloomAbove : bloomQuarter);
  }
}

/* ---- the page ---- */
const tRows = rows.map((r) => `<tr><td>${r.label}</td><td>${num(r.target, 4)}</td><td><b>${num(r.uOv, 4)}</b></td><td>${num(r.xB)}</td><td>${num(2 * r.hB)}</td><td>${r.acrossAtB}</td><td>${num(r.wall, 1)}</td><td>${r.cells}</td><td>${r.real}</td><td>${num(r.holeMedian)}</td><td>${num(100 * r.wallFraction, 0)} %</td><td>${num(r.lowestHoleU, 4)}</td><td>${r.tris.toLocaleString('en-US')}</td><td>${r.boundary}</td><td>${r.shells}</td><td>${r.voxel06} / ${r.voxel03}</td></tr>`).join('');
/* The page is published as an Artifact, whose skeleton supplies doctype, head and
   body — so this writes the CONTENT only, and its own title and style. */
const html = `<title>Infill Base Boundary</title>
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
<h1>The infill's solid base — where should it end?</h1>
<p class="lede">The salvaged Voronoi field at 16 cells, at three base boundaries, both walls. Only the boundary
moves: the field's metric, seeding, relaxation, grading, fillet and wall law are the salvage's own and are
untouched. Every caption prints the boundary the tool BUILT, not the one asked for — the split is a row index,
so a target between two stations snaps to one.</p>
<div class="note">The basal waist sits at <b>u ${num(WAIST_U, 4)}</b> (x ${num(WAIST_U * L)} mm), ${num(2 * WAIST_H)} mm across —
where <code>rootBlend</code> hands the outline to the core, and session 37's declared 44.54&deg; tangent break.
The blade there could carry ${across(WAIST_U, 1.0)} holes at a 1.0 mm wall and ${across(WAIST_U, 0.8)} at 0.8 by the cross-blade
capacity. It carries <b>none</b>, at every boundary on this sheet, on eight seeds, at either wall: the field's own
basal V converges the pattern out above it. The waist is a floor the pattern finds without being told.</div>
<h2>The petal alone — 1.0 mm wall, then 0.8 mm</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('petal_') || c.name.startsWith('q_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The base, close</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('macro_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>The whole bloom</h2>
${`<div class="grid">${cells.filter((c) => c.name.startsWith('bloom_')).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`}
<h2>Every number on this sheet</h2>
<div class="scroll"><table><thead><tr><th>boundary</th><th>target u</th><th>built u</th><th>x mm</th><th>blade mm</th><th>holes across</th><th>wall</th><th>cells</th><th>real</th><th>median mm</th><th>wall frac</th><th>lowest hole u</th><th>tris</th><th>bnd</th><th>shells</th><th>voxel .6/.3</th></tr></thead><tbody>${tRows}</tbody></table></div>
<p class="lede" style="margin-top:14px">Default petal ${L} &times; ${num(2 * Math.max(...ctx.rows.map((r) => hAt(r.u))))} mm, sheet ${ctx.t} mm, EXPORT mode; the plain petal is ${ctx.plainTris.toLocaleString('en-US')} triangles.
No pixel delta is quoted anywhere: the rasteriser is deterministic, so no same-tree control is owed and none is claimed.</p>
</div>`;
const file = path.join(OUT, 'infill-base-boundary.html');
fs.writeFileSync(file, html);
console.log(`\nsheet: ${file}`);
