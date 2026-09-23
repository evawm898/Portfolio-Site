/* ===================================================================
   shot-bloom-infill-shipped.mjs — THE SHIPPING INFILL, FROM THE SHIPPED BUILDER.

     node tools/shot-bloom-infill-shipped.mjs <dir> [--png docs/img/infill-shipped.png]

   WHY IT IS NOT `shot-bloom-infill.mjs`. That sheet renders the PROTOTYPE's
   meshes — `tools/bloom-voronoi-proto.mjs`, `fieldSalvage`, `cutThrough` — which
   is what S2 had to photograph because there was no builder yet. This one calls
   `buildBloomInto` and renders what the page exports: the drop-and-recompute at
   the ruled sixteen, the 1.00 mm wall, the proportional fillet, the basal V, the
   conforming emitter and the seam. Neither picture in S2's §1 is that.

   EVERY NUMBER IN EVERY CAPTION IS THE BUILDER'S OWN RECORD, read off the build
   the cell shows — the asked count, the cells the plan cut, the holes ACHIEVED
   (ruling 3's own distinction), the cells left solid, the drop passes, the hole
   widths and the triangle count. Nothing here re-derives a number the builder
   already reports.

   NO PIXEL DELTA IS QUOTED and none is owed: `bloom-soft-render.mjs` is
   deterministic, so there is no same-tree control to take and nothing on this
   sheet is judged by a pixel count.

   THE SINGLE PETAL IS BUILT AS A WHOLE BLOOM AT ONE PETAL, never as a blade on a
   scratch ring — the foot, the hub and the seam are half of what there is to
   look at, and a petal built some other way would be a picture of a petal this
   generator does not make.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { MeshBuilder, buildBloomInto } from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-infill-shipped.mjs <dir> [--png <file>]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png');

const W = 620, H = 560;
const num = (n) => n.toLocaleString('en-US');
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); }
  return { c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };

function build(set) {
  const st = { ...DEFAULTS, ...set };
  for (const k of Object.keys(st)) if (typeof st[k] === 'string' && st[k] !== '' && !isNaN(Number(st[k]))) st[k] = Number(st[k]);
  const acc = new MeshBuilder({ exportMode: true, captureGrid: true });
  const b = buildBloomInto(acc, st, { below: null });
  /* THE BLADE'S OWN FRAME, from the grid the builder captured — never a tilt
     written down here. `petalTilt`, the roll and the curl all move the blade,
     and a camera keyed to a constant frames a different petal on every state;
     this one is face-on by construction on all of them. */
  let frame = null;
  const p0 = b.petalsAll[0];
  if (p0 && p0.grid && p0.grid.length) {
    const rows = p0.grid[0].rows || p0.grid[0];
    const r = rows[Math.floor(rows.length * 0.6)];
    if (r && r.normal) {
      const n = r.normal[r.normal.length >> 1];
      const a = r.mid[0], c = r.mid[r.mid.length - 1];
      frame = { n: [n[0], n[1], n[2]], across: [c[0] - a[0], c[1] - a[1], c[2] - a[2]] };
    }
  }
  return { pos: Float64Array.from(acc.positions), tris: acc.triangleCount, F: p0 && p0.infill, frame };
}
/* FACE ON: look along the blade's normal, with the ACROSS direction as `up` so
   the long axis lies across the frame. */
function faceOn(b, k = 0.60, at = null) {
  const bb = bbox(b.pos);
  const half = Math.max(bb.d[0], bb.d[1], bb.d[2]) * k;
  if (!b.frame) return { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: at || bb.c, halfHeight: half };
  return { dir: b.frame.n, up: b.frame.across, center: at || bb.c, halfHeight: half };
}
/* THE CAPTION IS THE RECORD. `cells` is what the plan cut, `achieved` is what
   carries a hole and `solid` is the rest — ruling 3's three numbers, which are
   three different things and which a caption saying only "16 cells" would
   flatten into one. */
function caption(b, label) {
  const F = b.F;
  if (!F) return `<b>${label}</b> — no infill record. ${num(b.tris)} triangles.`;
  if (F.refused) return `<b>${label}</b> — NOT CUT (${F.refused}). ${num(b.tris)} triangles.`;
  const w = F.widthsMm.filter((x) => x >= F.bar).sort((a, c) => a - c);
  const span = w.length ? `${w[0].toFixed(2)}–${w[w.length - 1].toFixed(2)} mm across, median ${w[w.length >> 1].toFixed(2)}` : 'none';
  return `<b>${label}</b> — <b>${F.density} cells asked → ${F.cells} built, ${F.achieved} holding a hole</b>, `
    + `${F.solid} left solid${F.passesUsed ? `, ${F.passesUsed} drop pass${F.passesUsed === 1 ? '' : 'es'}` : ''}. `
    + `Holes ${span}; wall ${F.wall.toFixed(2)} mm, bar ${F.bar.toFixed(2)} mm. ${num(b.tris)} triangles.`;
}

/* THE COMPOSITE'S OWN SECOND LINE — the brief asks for the ACHIEVED COUNT in
   the caption, and the composite's captions are BAKED INTO THE PIXELS because
   a doc that points at a sheet in a scratchpad points at nothing once the
   container is reclaimed. The HTML sheet beside it carries the full sentence;
   this is the same three numbers in the 5x7 font's own alphabet, read from the
   SAME record rather than restated, so the two cannot drift. */
function shortCounts(b, whole) {
  const F = b.F;
  if (!F) return 'NO PATTERN CUT - THE CONTROL';
  if (F.refused) return `NOT CUT (${String(F.refused).toUpperCase()})`;
  if (whole) return `${F.achieved} HOLES A PETAL, ${num(b.tris)} TRIANGLES`;
  return `${F.density} ASKED, ${F.cells} CELLS, ${F.achieved} WITH A HOLE, ${F.solid} SOLID`;
}

const cells = [];
function shot(name, b, label, cam, opts = {}) {
  const rgb = render(b.pos, W, H, cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3], ...opts });
  const png = path.join(DIR, `${name}.png`);
  writePng(png, W, H, rgb);
  cells.push({ caption: caption(b, label), png: fs.readFileSync(png).toString('base64'), rgb, b });
  console.log(`rendered ${name.padEnd(22)} ${caption(b, label).replace(/<\/?b>/g, '')}`);
}

/* ---- 1. THE SINGLE PETAL, face on ---- */
{
  const b = build({ petalInfill: 'VORONOI', petalCount: 1, layerCount: 1 });
  shot('01-petal', b, 'ONE PETAL at the ruled defaults, face on', faceOn(b, 0.58));
}
/* ---- 2. THE SAME PETAL, SOLID — the control ---- */
{
  const b = build({ petalCount: 1, layerCount: 1 });
  shot('02-petal-solid', b, 'THE SAME PETAL with the guard OFF \u2014 the control', faceOn(b, 0.58));
}
/* ---- 3. THE BASE, close — the seam and the basal V ---- */
{
  const b = build({ petalInfill: 'VORONOI', petalCount: 1, layerCount: 1 });
  const bb = bbox(b.pos);
  shot('03-petal-base', b, 'THE SAME PETAL, close on the FOOT — the seam where `emitPanel`’s basal sub-panel hands over, and the basal V that tapers the pattern into the solid base',
    { dir: [0, -1, 0.28], up: [0, 0.28, 1], center: [bb.c[0], bb.c[1], bb.c[2] - bb.d[2] * 0.30], halfHeight: bb.d[2] * 0.22 });
}
/* ---- 4. THE WHOLE BLOOM ---- */
{
  const b = build({ petalInfill: 'VORONOI' });
  const bb = bbox(b.pos);
  shot('04-bloom', b, 'THE WHOLE BLOOM at the shipping defaults with the guard ON — eight petals, every one of them this pattern',
    { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: bb.c, halfHeight: Math.max(bb.d[0], bb.d[1], bb.d[2]) * 0.58 });
}
/* ---- 5. THE WHOLE BLOOM, guard off — the control ---- */
{
  const b = build({});
  const bb = bbox(b.pos);
  shot('05-bloom-solid', b, 'THE WHOLE BLOOM with the guard OFF — the shipping default, and what a visitor sees until they choose VORONOI',
    { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: bb.c, halfHeight: Math.max(bb.d[0], bb.d[1], bb.d[2]) * 0.58 });
}
/* ---- 6. THE DENSITY REQUEST, both ends ---- */
for (const [n, d] of [['06-density-8', 8], ['07-density-40', 40]]) {
  const b = build({ petalInfill: 'VORONOI', infillDensity: d, petalCount: 1, layerCount: 1 });
  const bb = bbox(b.pos);
  shot(n, b, `DENSITY ${d} — the request, not the guarantee`,
    { dir: [0, -1, 0.28], up: [0, 0.28, 1], center: bb.c, halfHeight: Math.max(bb.d[0], bb.d[2]) * 0.60 });
}

/* ---- the index, and ONE composite so a doc can point at a file ---- */
const html = `<!doctype html><meta charset="utf-8"><title>The shipping Voronoi infill</title>
<style>body{background:#141416;color:#e8e6e0;font:14px/1.5 system-ui,sans-serif;margin:0;padding:28px}
h1{font-size:19px;font-weight:600;margin:0 0 6px}p.lede{color:#a8a49c;max-width:70ch;margin:0 0 22px}
figure{margin:0 0 26px}img{display:block;width:${W}px;border-radius:5px}
figcaption{color:#b8b4ac;max-width:${W}px;margin-top:7px;font-size:13px}b{color:#e8e6e0}</style>
<h1>The Voronoi infill as it ships</h1>
<p class="lede">Rendered from <code>buildBloomInto</code> in EXPORT mode — the drop-and-recompute at the
ruled sixteen cells, the 1.00 mm wall, the 1.50 mm hole bar and the proportional fillet. Every figure in
every caption is the builder's own record. No pixel delta is quoted: the rasteriser is deterministic.</p>
${cells.map((c) => `<figure><img src="data:image/png;base64,${c.png}"><figcaption>${c.caption}</figcaption></figure>`).join('\n')}`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log(`\nwrote ${path.join(DIR, 'index.html')}`);

if (PNG) {
  /* ONE composite — the petal, its control, and the whole bloom — because a doc
     that points only at a sheet in a scratchpad points at nothing once the
     container is reclaimed. Labelled IN the image for the same reason. */
  const pick = ['01-petal', '02-petal-solid', '04-bloom'].map((n, i) => cells[[0, 1, 3][i]]);
  const LBL = 40, CW = W, CH = H + LBL;
  const cw = CW * pick.length, ch = CH;
  const out = Buffer.alloc(cw * ch * 3, 0x14);
  pick.forEach((c, i) => {
    const strip = Buffer.alloc(CW * CH * 3, 0x14);
    c.rgb.copy(strip, CW * LBL * 3);
    text(strip, CW, CH, 8, 4, ['THE SHIPPING DEFAULT, INFILLED', 'THE SAME PETAL, GUARD OFF', 'THE WHOLE BLOOM, INFILLED'][i]);
    text(strip, CW, CH, 8, 22, shortCounts(c.b, i === 2), [184, 180, 172]);
    blit(out, cw, ch, strip, CW, CH, i * CW, 0);
  });
  fs.mkdirSync(path.dirname(PNG), { recursive: true });
  writePng(PNG, cw, ch, out);
  console.log(`wrote ${PNG} (${cw}x${ch})`);
}
