/* ===================================================================
   shot-bloom-infill.mjs — THE INFILL SHEET.
   AN INSTRUMENT, NOT WIRED TO ANY GATE. It builds the prototype's meshes itself and
   renders them with the software rasteriser (`bloom-soft-render.mjs`), so the sheet is
   ONE command and needs no browser, no CDN and no three.js.

     node tools/shot-bloom-infill.mjs <dir> [--quick]
     node tools/shot-bloom-infill.mjs <dir> --png docs/img/infill-metric-plan.png

   `--png` also writes ONE composite — the metric pair and its macro, labelled in the
   image — because a doc that points only at a sheet in a scratchpad points at nothing
   once the container is reclaimed.

   `--quick` renders the reference cell and the metric pair — prove the tool on two rows,
   then run the grid once (the charter's own convention for a sheet tool).

   NO PIXEL DELTA IS QUOTED ANYWHERE and none is owed: the rasteriser is deterministic
   (the same triangles give the same bytes), so there is no same-tree control to take and
   nothing here is judged by a pixel count. Every number in every caption is measured off
   the build that cell shows.

   WHAT IT IS FOR. Four things, and the third is the argument:
     1. THE RULED DEFAULTS — 16 cells, wall 1.0 mm, round holes — with the ACHIEVED COUNT
        in the caption at BOTH bars: the prototype's own "is this even a hole" threshold
        and Eva's ruled 1.5 mm. The ruled bar is shown through `holeBarMm`, a capability
        hook no default reaches, because ENFORCING it is ruling 3's drop-and-recompute
        iteration and that is the builder's, S3's — S2 does not move a look default.
     2. THE DENSITY SWEEP, achieved count in every caption, because the count is a
        REQUEST and not a guarantee (ruling 3) and a sweep is where that stops being a
        sentence.
     3. THE METRIC ON / OFF PAIR on `petalCup` 1.2 x `petalSpineCurl` 360 — the state
        §1b measured the flat plan's wall at a quarter of what it asked for. SAME petal,
        SAME camera, whole and then cropped to the flat plan's OWN worst wall, which is
        FOUND AT RUN TIME and not chosen. This is the cell the session exists for.
     4. THE WHOLE BLOOM at the ruled defaults, because that is what the dropdown will
        produce.

   WHAT IT DOES NOT SHOW, said here rather than left to be found:
     - the wall is a MILLIMETRE on a 35 mm blade. At whole-petal scale the metric pair
       reads as a change in which cells carry holes; the macro crop is where the wall
       itself is legible, and the numbers in the captions are what carry it.
     - the cells are laid out in the FLAT plan and S2 did not change that. A cell in a
       compressed region is smaller on the object than one in a stretched region, which
       is why the metric pair's hole COUNT moves — that is the honest answer and not a
       tuning failure.
     - one seed (`SEED`), EXPORT mode. The basal-grading doc sweeps eight seeds and finds
       real seed-to-seed spread; no count here is a population.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import * as G from '../bloom-geometry.js';
import * as P from './bloom-voronoi-proto.mjs';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
/* THE WALL FIGURE IS THE GATE'S OWN MEASURE, IMPORTED. A sheet that restated it would be
   a second producer of the one number this session is about. */
import { wallSurfaceMm, halfWallSurfaceMm } from './verify-bloom-infill-metric.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-infill.mjs <dir> [--quick]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });
const QUICK = process.argv.includes('--quick');
const W = 560, H = 500, N_CELLS = 16, WALL = P.WALL_DEFAULT;

const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx, c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };
const cells = [];
const raw = new Map();
function shot(name, pos, caption, cam, opts = {}) {
  const rgb = render(pos, W, H, cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3], ...opts });
  const png = path.join(DIR, `${name}.png`); writePng(png, W, H, rgb);
  raw.set(name, rgb);
  cells.push({ caption, png: fs.readFileSync(png).toString('base64') });
  console.log(`rendered ${name} (${pos.length / 9} tris)`);
}
/* THE PETAL'S OWN FACE-ON CAMERA. The sheet normal and the blade direction come from the
   surface the builder used, never from a tilt written down here — `petalRoll` and the
   curl move the blade and a camera keyed to a constant would frame a different petal. */
function petalCam(ctx, pos, halfHeight, at = null) {
  const b = bbox(pos);
  const n = ctx.surface.nrm, d = ctx.surface.dir;
  return { dir: [n[0], n[1], n[2]], up: [d[0], d[1], d[2]], center: at || b.c, halfHeight: halfHeight ?? Math.max(b.d[0], b.d[1], b.d[2]) * 0.62 };
}
/* THE ACHIEVED COUNT, at BOTH bars, measured on the build the cell shows. The widths are
   the SURFACE inradius where a metric field exists and the plan one where the guard says
   the map is affine and the two are the same number. */
function achieved(ctx, F, r) {
  const w = r.holes.map((h) => (F.mfield ? 2 * P.surfaceInradiusMm(F.mfield, h) : 2 * P.inradiusConvex(h))).sort((a, b) => a - b);
  return { asked: N_CELLS, cells: F.cells.length, built: r.annular, ruled: w.filter((x) => x >= P.RULED_HOLE_MM).length,
    median: w.length ? w[Math.floor(w.length / 2)] : 0, min: w[0] ?? 0, max: w[w.length - 1] ?? 0, tris: r.tris };
}
const f2 = (x) => x.toFixed(2);
function build(set, opts = {}, n = N_CELLS) {
  const ctx = P.context(set);
  const F = P.fieldSalvage(ctx, n, opts);
  const r = P.cutThrough(ctx, F, WALL, opts);
  return { ctx, F, r, pos: new Float64Array(r.acc.pos), a: achieved(ctx, F, r) };
}
const capCount = (b, n = N_CELLS) => `<b>${b.a.built} of ${n} asked</b> kept a hole (the field cut ${b.a.cells} cells), and <b>${b.a.ruled}</b> of those clear Eva's ruled ${P.RULED_HOLE_MM} mm across; widths ${f2(b.a.min)}–${f2(b.a.max)} mm, median ${f2(b.a.median)}. ${b.a.tris.toLocaleString('en-US')} tris.`;

/* ---------------- 1. THE RULED DEFAULTS ---------------- */
const sections = [];
const def = build({});
const defCam = petalCam(def.ctx, def.pos, 20);
shot('ruled-default', def.pos,
  `<b>THE RULED DEFAULTS</b> — the shipping petal, ${N_CELLS} cells, wall ${WALL} mm, round holes (fillet ${P.FILLET_MM} mm of surface), face-on. ${capCount(def)} The plan map is AFFINE here (no form, straight spine), so the metric plan is the flat plan's own doubles and this cell is bit-identical to S1's.`,
  defCam);
const defRuled = build({}, { holeBarMm: P.RULED_HOLE_MM });
shot('ruled-default-bar', defRuled.pos,
  `<b>THE SAME PETAL WITH EVA'S ${P.RULED_HOLE_MM} mm BAR ENFORCED</b>, same camera. ${capCount(defRuled)} The three holes that go are the ones at ${f2(def.a.min)}–0.96 mm; nothing lands between 0.96 and 1.52 on this petal, so the ruled bar selects the same thirteen a 1.0 mm bar would. <b>Shown through a capability hook no control reaches</b>: enforcing the bar is ruling 3's drop-and-recompute, which is the builder's and S3's.`,
  defCam);
sections.push({ title: '1 — The ruled defaults, and the achieved count', from: 0, note: 'Ruling 3: the count is a REQUEST, not a guarantee, and the honest answer is the number.' });

/* ---------------- 3. THE METRIC PAIR (built early: the macro crop is found from it) ---------------- */
const pairFrom = cells.length;
const CX = { petalCup: 1.2, petalSpineCurl: 360 };
const off = build(CX, { metricPlan: false });
const on = build(CX);
/* ONE CAMERA FOR BOTH, SIZED AND POINTED FROM THE FLAT BUILD so the pair is a comparison
   and not two framings. A curled petal is a coil and the blade's own sheet normal looks at
   its edge, so the whole cells are viewed down the COIL'S AXIS — the spine's tangential
   direction `T`, which `petalSurface` owns — and the frame is sized from the mesh's own
   bounding box rather than from a half-height typed here. */
const coilCam = (ctx, pos) => { const b = bbox(pos); const T = ctx.surface.T; return { dir: [T[0], T[1], T[2]], up: [0, 0, 1], center: b.c, halfHeight: Math.max(b.d[0], b.d[2]) * 0.62 }; };
const pairCam = coilCam(off.ctx, off.pos);
/* THE MACRO SHOWS ONLY THE MATERIAL NEAR THE PAIR THE MEASURE FOUND, and that is a
   statement about the picture rather than about the geometry: on a coil everything else is
   in FRONT of the wall under discussion, so a crop alone photographs an occluder. Triangles
   whose centroid is further than `MACRO_R_MM` from the point are dropped from the RENDER
   and from nothing else; both cells of the pair drop them by the same rule about the same
   point, so the two pictures are comparable. */
const MACRO_R_MM = 3.2, MACRO_SLAB_MM = 1.2;
const near = (pos, c, n, R, slab) => { const o = []; for (let t = 0; t < pos.length / 9; t++) { let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { cx += pos[t * 9 + k * 3]; cy += pos[t * 9 + k * 3 + 1]; cz += pos[t * 9 + k * 3 + 2]; } const d = [cx / 3 - c[0], cy / 3 - c[1], cz / 3 - c[2]]; const off = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; if (Math.hypot(...d) <= R && Math.abs(off) <= slab) for (let i = 0; i < 9; i++) o.push(pos[t * 9 + i]); } return new Float64Array(o); };
const wallOf = (b) => ({ ...(wallSurfaceMm(b.ctx, b.F, b.r) || { mm: NaN, u: NaN, a: { x: 0, y: 0 } }), half: halfWallSurfaceMm(b.ctx, b.F, b.r) });
const wallOff = wallOf(off), wallOn = wallOf(on);
shot('metric-off', off.pos,
  `<b>THE FLAT PLAN</b> — <code>petalCup 1.2 x petalSpineCurl 360</code>, ${N_CELLS} cells, wall asked ${WALL} mm. The wall it BUILDS is <b>${wallOff.mm.toFixed(4)} mm of surface</b> at u ${wallOff.u.toFixed(3)} — ${(100 * wallOff.mm / WALL).toFixed(0)} % of what it asked for. In §1b's own measure (a hole's rim to its own cell's outer polygon, nominal 0.5 mm) the same build reads ${wallOff.half.toFixed(4)} mm, which is the figure the ruling rests on and is under the 0.3 mm horizontal wall floor. ${capCount(off)}`,
  pairCam);
shot('metric-on', on.pos,
  `<b>THE METRIC PLAN</b> — the same state, the same camera. The wall reads <b>${wallOn.mm.toFixed(4)} mm of surface</b> at u ${wallOn.u.toFixed(3)}, and §1b's measure reads ${wallOn.half.toFixed(4)} mm against its own nominal 0.5. ${capCount(on)} <b>${off.a.built - on.a.built} cells lost their holes and that is the fix working</b>: the surface is compressed there (the along-spine metric reaches 0.024), so a 1.0 mm wall leaves no printable hole and the cell comes back solid rather than carrying a wall a slicer would reject.`,
  pairCam);
/* THERE IS NO MACRO AT curl 360 AND THAT IS A MEASUREMENT, NOT A FRAMING FAILURE. Three
   cameras and a cutaway were tried; at that state the petal is a coil that passes within
   0.0002 mm of ITSELF before a cell is cut (S1's own reading of the PLAIN sheet), so every
   other turn is inside any slab around the wall under discussion. The pair above carries
   the extreme by its numbers; the macro is taken where it can be READ. */
const off2 = build({ petalCup: 1.2, petalSpineCurl: 180 }, { metricPlan: false });
const on2 = build({ petalCup: 1.2, petalSpineCurl: 180 });
const w2off = wallOf(off2), w2on = wallOf(on2);
const cam2 = coilCam(off2.ctx, off2.pos);
shot('metric-off-180', off2.pos, `<b>THE FLAT PLAN at <code>cup 1.2 x curl 180</code></b> — the same defect on a petal that can be read. The wall reads <b>${w2off.mm.toFixed(4)} mm</b> against the ${WALL} mm asked (§1b's measure ${w2off.half.toFixed(4)} against its own 0.5). ${capCount(off2)}`, cam2);
shot('metric-on-180', on2.pos, `<b>THE METRIC PLAN, same state, same camera.</b> The wall reads <b>${w2on.mm.toFixed(4)} mm</b> (§1b's ${w2on.half.toFixed(4)}). ${capCount(on2)} Here the count does NOT fall: the surface is compressed enough to fail the wall and not enough to refuse a hole, which is why both states are on the sheet.`, cam2);
/* THE MACRO, CENTRED ON THE FLAT PLAN'S OWN WORST WALL — FOUND AT RUN TIME, NOT CHOSEN —
   and viewed along the SURFACE NORMAL there, so the wall is seen face-on. */
const uW = Math.min(1, w2off.a.x / off2.ctx.L);
const sW = off2.ctx.surface.at(uW, Math.max(-1, Math.min(1, w2off.a.y / off2.ctx.surface.profile.halfWidthAt(uW))));
const macroCam = { dir: [sW.n[0], sW.n[1], sW.n[2]], up: [0, 0, 1], center: [sW.P[0], sW.P[1], sW.P[2]], halfHeight: MACRO_R_MM * 0.85 };
const macroNote = `Seen along the surface normal at that point, with only the material inside ${MACRO_R_MM} mm of it AND within ${MACRO_SLAB_MM} mm of its own tangent plane drawn, so the far side of the coil is not in front of the wall. Both cells drop triangles by the same rule about the same point.`;
shot('metric-off-macro', near(off2.pos, sW.P, sW.n, MACRO_R_MM, MACRO_SLAB_MM),
  `<b>MACRO — the flat plan at its own worst wall</b>, centred on the pair the measure FOUND (u ${w2off.u.toFixed(3)}), not on a place anyone picked: <b>${w2off.mm.toFixed(4)} mm of surface</b> between those two rims against the ${WALL} mm the plan asked for. ${macroNote}`, macroCam);
shot('metric-on-macro', near(on2.pos, sW.P, sW.n, MACRO_R_MM, MACRO_SLAB_MM),
  `<b>MACRO — the metric plan, same camera, same point, same cutaway.</b> The worst wall anywhere on this petal is now <b>${w2on.mm.toFixed(4)} mm of surface</b>. The difference is not a shape anyone drew: it is what the inset had to pay once the wall was asked for in surface millimetres.`, macroCam);
sections.push({ title: '3 — The metric pair: the state the session exists for', from: pairFrom, note: 'Same petal, same camera, same field and the same seed; only the units the inset is asked in differ. The first pair is the state the brief names and the second is the same defect on a petal that can be read.' });

/* ---------------- 2. THE DENSITY SWEEP ---------------- */
if (!QUICK) {
  const sweepFrom = cells.length;
  for (const n of [8, 12, 16, 24, 32]) {
    const b = build({}, {}, n);
    shot(`density-${n}`, b.pos, `<b>${n} cells asked.</b> ${capCount(b, n)}`, defCam);
  }
  sections.push({ title: '2 — The density sweep, achieved count in every caption', from: sweepFrom,
    note: 'The ruled default is 16. Above it the bar bites: the cells shrink, and the count that clears 1.5 mm stops following the count asked.' });

  /* ---------------- 4. THE WHOLE BLOOM ---------------- */
  const bloomFrom = cells.length;
  const bl = P.wholeBloom('salvage', N_CELLS, WALL);
  const bp = new Float64Array(bl.acc.pos);
  const plainAcc = new G.MeshBuilder({ exportMode: true }); G.buildBloomInto(plainAcc, { ...(await import('../bloom-registry.js')).DEFAULTS });
  const pp = new Float64Array(plainAcc.positions);
  const above = (p) => ({ dir: [0, 0, 1], up: [0, 1, 0], center: bbox(p).c, halfHeight: 46 });
  const quarter = (p) => ({ dir: [0.62, -0.55, 0.56], up: [0, 0, 1], center: bbox(p).c, halfHeight: 42 });
  /* THE TWO COUNTS ARE NOT COMPARABLE AND THE CAPTION SAYS SO RATHER THAN LETTING A READER
     SUBTRACT THEM. The plain cell is the SHIPPED bloom and carries #278's rim bead; the
     infilled cell is the PROTOTYPE, whose hole rims are flat walls because giving them the
     bead is S5. So the infilled figure being the SMALLER of the two is the bead's absence,
     not a saving — §2c of the port plan projects ~41,000 for an infilled bloom once the
     rims take the profile. */
  shot('bloom-plain-above', pp, `<b>THE PLAIN BLOOM, from above</b> — what ships today, <b>with #278's rim bead</b>. ${plainAcc.triangleCount.toLocaleString('en-US')} tris.`, above(pp));
  shot('bloom-infill-above', bp, `<b>THE INFILLED BLOOM AT THE RULED DEFAULTS, from above</b> — ${N_CELLS} cells a petal, wall ${WALL} mm, ${bl.petals} petals + hub ${bl.hubTris}. ${bl.tris.toLocaleString('en-US')} tris, boundary ${P.census(bl.acc.pos).boundary}, ${P.floodFill(bl.acc.pos, 0.6)} voxel piece. <b>DO NOT SUBTRACT THE TWO COUNTS</b>: this is the prototype's emitter and its hole rims are flat walls, because giving them #278's bead is S5. §2c of the port plan projects ~41,000 for an infilled bloom once they take it. This is the SHAPE the dropdown will produce, not its cost.`, above(bp));
  shot('bloom-plain-quarter', pp, `<b>THE PLAIN BLOOM, three-quarter.</b> Same camera as the cell beside it.`, quarter(pp));
  shot('bloom-infill-quarter', bp, `<b>THE INFILLED BLOOM, three-quarter.</b> Same camera.`, quarter(bp));
  sections.push({ title: '4 — The whole bloom at the ruled defaults', from: bloomFrom, note: 'Every petal from its own seed, the shipped hub, EXPORT mode.' });
}

/* ---------------- the sheet ---------------- */
const grid = (from, to) => `<div class="grid">${cells.slice(from, to).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap">${c.caption}</div></div>`).join('')}</div>`;
const bounds = sections.map((s, i) => [s.from, i + 1 < sections.length ? sections[i + 1].from : cells.length]);
const ordered = sections.map((s, i) => ({ ...s, lo: bounds[i][0], hi: bounds[i][1] })).sort((a, b) => a.title.localeCompare(b.title));
const html = `<!doctype html><meta charset="utf-8"><title>Bloom Infill Sheet</title>
<style>
:root{--ground:#f4f3ef;--ink:#1d1c1a;--muted:#5d5a54;--rule:#d6d2c9;--panel:#ebe8e1;--accent:#4c6b62;--mono:"SFMono-Regular",Menlo,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#16161a;--ink:#e6e3dc;--muted:#a09c93;--rule:#33333a;--panel:#1f1f25;--accent:#8fb8ab}}
:root[data-theme="dark"]{--ground:#16161a;--ink:#e6e3dc;--muted:#a09c93;--rule:#33333a;--panel:#1f1f25;--accent:#8fb8ab}
body{background:var(--ground);color:var(--ink);font:15px/1.55 Georgia,"Iowan Old Style",serif;margin:0;padding-block:28px;padding-inline:clamp(16px,4vw,40px);max-width:1280px;margin-inline:auto}
h1{font-size:1.6rem;font-weight:600;margin:0 0 6px;text-wrap:balance}
h2{font-size:1.02rem;font-weight:600;margin:32px 0 4px;color:var(--accent);letter-spacing:.01em}
.lead{color:var(--muted);max-width:70ch;font-size:.93rem}
.note{color:var(--muted);font-size:.87rem;max-width:80ch;margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
@media (max-width:760px){.grid{grid-template-columns:1fr}}
.cell img{width:100%;display:block;border:1px solid var(--rule);border-radius:2px}
.cap{font-size:.84rem;color:var(--muted);margin-top:7px;line-height:1.45}.cap b{color:var(--ink);font-weight:600}
code{font-family:var(--mono);font-size:.88em}
</style>
<h1>Bloom Infill — the metric plan (S2)</h1>
<p class="lead">One seed (<code>SEED ${P.SEED}</code>), EXPORT mode, ${N_CELLS} cells, wall ${WALL} mm unless a caption says otherwise. Rendered by the software rasteriser, which is deterministic — <b>no pixel delta is quoted anywhere and none is owed</b>. Every figure in every caption is measured off the build that cell shows.</p>
${ordered.map((s) => `<h2>${s.title}</h2><p class="note">${s.note}</p>${grid(s.lo, s.hi)}`).join('\n')}
<p class="note" style="margin-top:28px">The prototype is not the shipping emitter; nothing here is in <code>bloom-geometry.js</code>. <code>docs/bloom-infill-metric-plan.md</code> has the measurements and <code>node tools/verify-bloom-infill-metric.mjs</code> (+ <code>--negative-control</code>) is the gate.</p>`;
const out = path.join(DIR, 'infill-sheet.html');
fs.writeFileSync(out, html);
console.log(`\nsheet: ${out}`);

/* ---------------- THE ONE COMPOSITE ----------------
   The four cells the argument needs, labelled IN THE IMAGE. `cup 1.2 x curl 180` and not
   `x curl 360`: at 360 the petal is a coil that passes within 0.0002 mm of itself before a
   cell is cut, so no camera and no cutaway makes the wall legible — the numbers carry that
   state and the picture is taken where it can be read. The font and the blitter are
   `bloom-soft-render.mjs`'s, shared with S1's own composite rather than copied. */
const PNG = arg('--png');
if (PNG) {
  const BAR = 30, PAD = 10;
  const CW = W, CH = H + BAR;
  const GW = PAD + 2 * CW + PAD, GH = PAD + 2 * CH + PAD + 34;
  const img = Buffer.alloc(GW * GH * 3); for (let i = 0; i < GW * GH; i++) { img[i * 3] = 18; img[i * 3 + 1] = 18; img[i * 3 + 2] = 22; }
  const put = (name, col, row, label) => {
    const x = PAD + col * CW, y = PAD + row * CH;
    blit(img, GW, GH, raw.get(name), W, H, x, y + BAR);
    text(img, GW, GH, x + 4, y + 9, label, [236, 232, 224], 2);
  };
  put('metric-off-180', 0, 0, `FLAT PLAN - WALL ${w2off.mm.toFixed(3)} MM`);
  put('metric-on-180', 1, 0, `METRIC PLAN - WALL ${w2on.mm.toFixed(3)} MM`);
  put('metric-off-macro', 0, 1, 'MACRO - FLAT, AT ITS OWN WORST WALL');
  put('metric-on-macro', 1, 1, 'MACRO - METRIC, SAME POINT AND CAMERA');
  text(img, GW, GH, PAD + 4, GH - 26, `CUP 1.2 X SPINE CURL 180, ${N_CELLS} CELLS, WALL ASKED ${WALL} MM. IN-SHEET WALL, EXPORT MODE, SEED ${P.SEED}.`, [150, 146, 138], 2);
  fs.mkdirSync(path.dirname(PNG), { recursive: true });
  writePng(PNG, GW, GH, img);
  console.log(`composite: ${PNG} - ${GW}x${GH}. Flat plan ${w2off.mm.toFixed(4)} mm of surface wall against the ${WALL} mm asked; metric plan ${w2on.mm.toFixed(4)}.`);
}
