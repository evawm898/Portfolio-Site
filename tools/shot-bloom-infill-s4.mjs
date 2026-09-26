/* ===================================================================
   shot-bloom-infill-s4.mjs — THE FOUR S4 CONTROLS, SWEPT, ON THE DEFAULT
   PETAL AND ON THE WHOLE BLOOM (the Voronoi infill, S4).

     node tools/shot-bloom-infill-s4.mjs <dir> [--quick] [--png-dir docs/img]

   THE QUESTION EVERY SWEEP ANSWERS IS EVA'S: "does this fill the tip and base,
   or does it just move holes around the middle." So every caption carries the
   ACHIEVED count (ruling 3's own number) and the ALONG-u HOLE DISTRIBUTION —
   holes by fifths of the drawn length, base to tip — read off the BUILDER's
   own `holeU` record, never re-derived from the picture.

   FOUR SWEEPS, one per control, each on the single petal FACE ON (built as a
   whole bloom at one petal, never a blade on a scratch ring) and on the whole
   bloom at eight; the density beside them as the fifth, because the four are
   ruled against it. The composites are written to `--png-dir` so a doc can
   point at a file: one image per control, the petal row above the bloom row,
   the caption's three numbers baked into the pixels in the 5x7 font.

   NO PIXEL DELTA IS QUOTED and none is owed: `bloom-soft-render.mjs` is
   deterministic.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { MeshBuilder, buildBloomInto, INFILL_RELAX_RANGE, INFILL_LAW_RANGE, INFILL_ANISO_RANGE, INFILL_BASE_RANGE, INFILL_DENSITY_RANGE } from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-infill-s4.mjs <dir> [--quick] [--png-dir <dir>]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const QUICK = process.argv.includes('--quick');
const PNG_DIR = arg('--png-dir');

const W = 420, H = 380;
const num = (n) => n.toLocaleString('en-US');
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); }
  return { c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };

function build(set) {
  const st = { ...DEFAULTS, ...set, petalInfill: 'VORONOI' };
  const acc = new MeshBuilder({ exportMode: true, captureGrid: true });
  const b = buildBloomInto(acc, st, { below: null });
  let frame = null;
  const p0 = b.petalsAll && b.petalsAll.find((p) => p);
  if (p0 && p0.grid && p0.grid.length) {
    const rows = p0.grid[0].rows || p0.grid[0];
    const r = rows[Math.floor(rows.length * 0.6)];
    if (r && r.normal) { const n = r.normal[r.normal.length >> 1]; const a = r.mid[0], c = r.mid[r.mid.length - 1]; frame = { n: [n[0], n[1], n[2]], across: [c[0] - a[0], c[1] - a[1], c[2] - a[2]] }; }
  }
  return { pos: Float64Array.from(acc.positions), tris: acc.triangleCount, F: p0 && p0.infill, frame };
}
function faceOn(b, k = 0.58) {
  const bb = bbox(b.pos); const half = Math.max(bb.d[0], bb.d[1], bb.d[2]) * k;
  if (!b.frame) return { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: bb.c, halfHeight: half };
  return { dir: b.frame.n, up: b.frame.across, center: bb.c, halfHeight: half };
}
function whole(b) { const bb = bbox(b.pos); return { dir: [0.35, -0.75, 0.56], up: [0, 0, 1], center: bb.c, halfHeight: Math.max(bb.d[0], bb.d[1], bb.d[2]) * 0.58 }; }

/* THE DISTRIBUTION, from the record: holes by fifths, base -> tip. */
function fifths(F) { const f = [0, 0, 0, 0, 0]; for (const u of F.holeU || []) f[Math.min(4, Math.floor(u * 5))]++; return f; }
function caption(b, label) {
  const F = b.F;
  if (!F) return `<b>${label}</b> — no infill record. ${num(b.tris)} triangles.`;
  if (F.refused) return `<b>${label}</b> — NOT CUT (${F.refused}). ${num(b.tris)} triangles.`;
  const hu = F.holeU || [];
  const span = hu.length ? `u ${Math.min(...hu).toFixed(2)}–${Math.max(...hu).toFixed(2)}` : 'none';
  return `<b>${label}</b> — <b>${F.density} asked → ${F.cells} cells, ${F.achieved} holes</b>, ${F.solid} solid. `
    + `Holes along the blade ${span}, by fifths base→tip <b>${fifths(F).join(' / ')}</b>. `
    + `Cells start at u ${F.floorU.toFixed(3)}${F.baseTravel > 0 ? ` (travel to ${(F.baseFloorU + F.baseTravel).toFixed(3)})` : ' (no basal travel on this blade)'}. ${num(b.tris)} triangles.`;
}
function short(b) { const F = b.F; if (!F || F.refused) return F && F.refused ? `NOT CUT (${String(F.refused).toUpperCase()})` : 'NO RECORD'; return `${F.achieved} HOLES OF ${F.cells} CELLS  FIFTHS ${fifths(F).join('/')}`; }

const cells = [];
function shot(name, b, label, cam) {
  const rgb = render(b.pos, W, H, cam, { light1: [0.55, -0.55, 0.62], light2: [-0.5, 0.4, 0.3] });
  const png = path.join(DIR, `${name}.png`);
  writePng(png, W, H, rgb);
  cells.push({ name, caption: caption(b, label), png: fs.readFileSync(png).toString('base64'), rgb, b });
  console.log(`rendered ${name.padEnd(28)} ${caption(b, label).replace(/<\/?b>/g, '')}`);
}

/* THE SWEEPS. Values across each range, the default MARKED. */
const SWEEPS = [
  { key: 'density', id: 'infillDensity', title: 'DENSITY (the request)', values: QUICK ? [8, 16, 40] : [8, 12, 16, 20, 24, 32, 40], fmt: (v) => `${v} cells asked` },
  { key: 'relax', id: 'infillRelax', title: 'RELAXATION (Lloyd passes)', values: QUICK ? [0, 4, 12] : [0, 1, 2, 4, 8, 12], fmt: (v) => `${v} pass${v === 1 ? '' : 'es'}` },
  { key: 'law', id: 'infillLaw', title: 'DENSITY LAW (cells shrink as width^g)', values: QUICK ? [0, 1, 2] : [0, 0.25, 0.5, 0.75, 1, 1.5, 2], fmt: (v) => `law ${v.toFixed(2)}` },
  { key: 'aniso', id: 'infillAniso', title: 'STRETCH (the metric along the midrib)', values: QUICK ? [1, 2.2, 3] : [1, 1.5, 2, 2.2, 2.5, 3], fmt: (v) => `stretch ${v.toFixed(2)}x` },
  { key: 'base', id: 'infillBase', title: 'SOLID BASE (fraction of the travel from the floor to ROOT_BLEND_END)', values: QUICK ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1], fmt: (v) => `base ${v.toFixed(2)}` },
];
const ranges = { infillDensity: INFILL_DENSITY_RANGE, infillRelax: INFILL_RELAX_RANGE, infillLaw: INFILL_LAW_RANGE, infillAniso: INFILL_ANISO_RANGE, infillBase: INFILL_BASE_RANGE };
for (const sw of SWEEPS) {
  const r = ranges[sw.id];
  for (const v of sw.values) if (v < r[0] || v > r[1]) throw new Error(`${sw.id} ${v} is outside the registry's range ${r}`);
  sw.cells = [];
  for (const v of sw.values) {
    const isDefault = v === DEFAULTS[sw.id];
    const tag = `${sw.fmt(v)}${isDefault ? ' (the default)' : ''}`;
    const bp = build({ [sw.id]: v, petalCount: 1, layerCount: 1 });
    shot(`${sw.key}-${String(v).replace('.', 'p')}-petal`, bp, `${sw.title} — ${tag}, ONE PETAL face on`, faceOn(bp));
    const bw = build({ [sw.id]: v });
    shot(`${sw.key}-${String(v).replace('.', 'p')}-bloom`, bw, `${sw.title} — ${tag}, THE WHOLE BLOOM`, whole(bw));
    sw.cells.push({ v, tag, petal: cells[cells.length - 2], bloom: cells[cells.length - 1] });
  }
}

/* ---- the index ---- */
const html = `<!doctype html><meta charset="utf-8"><title>The infill's four S4 controls, swept</title>
<style>body{background:#141416;color:#e8e6e0;font:14px/1.5 system-ui,sans-serif;margin:0;padding:28px}
h1{font-size:19px;font-weight:600;margin:0 0 6px}h2{font-size:16px;margin:30px 0 8px}p.lede{color:#a8a49c;max-width:78ch;margin:0 0 22px}
.row{display:flex;gap:10px;flex-wrap:wrap}figure{margin:0 0 18px;width:${W}px}img{display:block;width:${W}px;border-radius:5px}
figcaption{color:#b8b4ac;margin-top:6px;font-size:12px}b{color:#e8e6e0}</style>
<h1>The Voronoi infill — relaxation, density law, stretch and the solid base, swept</h1>
<p class="lede">Rendered from <code>buildBloomInto</code> in EXPORT mode. Every caption is the builder's own record:
the asked density, the cells cut, the holes ACHIEVED, and WHERE the holes are — by fifths of the drawn length, base to tip.
The question each sweep answers is whether the control fills the tip and the base or moves holes around the middle.
No pixel delta is quoted: the rasteriser is deterministic.</p>
${SWEEPS.map((sw) => `<h2>${sw.title}</h2>` + sw.cells.map((c) => `<div class="row"><figure><img src="data:image/png;base64,${c.petal.png}"><figcaption>${c.petal.caption}</figcaption></figure><figure><img src="data:image/png;base64,${c.bloom.png}"><figcaption>${c.bloom.caption}</figcaption></figure></div>`).join('\n')).join('\n')}`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log(`\nwrote ${path.join(DIR, 'index.html')}`);

/* ---- one composite per control: the petal row over the bloom row ---- */
if (PNG_DIR) {
  fs.mkdirSync(PNG_DIR, { recursive: true });
  for (const sw of SWEEPS) {
    const LBL = 40, CW = W, CH = H + LBL;
    const n = sw.cells.length; const cw = CW * n, ch = CH * 2;
    const out = Buffer.alloc(cw * ch * 3, 0x14);
    sw.cells.forEach((c, i) => {
      for (const [k, cell] of [[0, c.petal], [1, c.bloom]]) {
        const strip = Buffer.alloc(CW * CH * 3, 0x14);
        blit(strip, CW, CH, cell.rgb, W, H, 0, LBL);
        text(strip, CW, CH, 8, 4, c.tag.toUpperCase().slice(0, 34));
        text(strip, CW, CH, 8, 22, short(cell.b), [184, 180, 172]);
        blit(out, cw, ch, strip, CW, CH, i * CW, k * CH);
      }
    });
    const file = path.join(PNG_DIR, `infill-s4-${sw.key}.png`);
    writePng(file, cw, ch, out);
    console.log(`wrote ${file} (${cw}x${ch})`);
  }
}
