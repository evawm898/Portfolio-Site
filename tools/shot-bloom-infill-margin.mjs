#!/usr/bin/env node
/* ===================================================================
   tools/shot-bloom-infill-margin.mjs — THE INFILLED PETAL'S OUTER MARGIN,
   BEFORE AND AFTER IT TOOK THE BEAD.

     node tools/shot-bloom-infill-margin.mjs <dir> --base <worktree> [--png <file>]

   Row 1  a TRUE CROSS-SECTION of the infilled default petal's outer margin at
          u 0.55, from the emitted triangles, on the base tree and on this one,
          at the SAME scale as row 2 of docs/img/infill-rim-bevel.png (150 px a
          millimetre) — the box should become a profile — plus the plain
          petal's margin on this tree as the reference the ruling names.
   Row 2  a shaded MACRO of the same stretch of margin at K = 4 SMOOTH (the
          builder's own `captureNormals`, which is what print preview hands
          three.js), base and this tree from one camera.
   Row 3  the WHOLE infilled bloom at the infill's ruled defaults (the shipping
          default has the infill OFF, so its margin is #278's and does not
          move), EXPORT geometry = print preview, base and this tree.

   Every cell is rendered by bloom-soft-render.mjs, which is deterministic, so
   no pixel delta is quoted and none is owed. The base tree's geometry is
   imported from its own worktree; the shipped module is never patched.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import * as L from './bloom-rim-roundness-lib.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base');
if (!DIR || !BASE) { console.error('usage: node tools/shot-bloom-infill-margin.mjs <dir> --base <worktree> [--png <file>]'); process.exit(2); }
const PNG = arg('--png');
fs.mkdirSync(DIR, { recursive: true });
const { DEFAULTS } = await import(new URL('../bloom-registry.js', import.meta.url).href);
const GN = await import(new URL('../bloom-geometry.js', import.meta.url).href);
const GB = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const { sub, dot, cross, nrm } = L;

const ONE = { petalCount: 1, layerCount: 1 };
const INF = { ...ONE, petalInfill: 'VORONOI' };
function marginFrame(B, u) {
  const S = B.surface, d = 1e-4, A = S.at(u, 1).P;
  const N = nrm(sub(S.at(u + d, 1).P, S.at(u - d, 1).P));
  let n = S.at(u, 1).n; n = nrm(sub(n, N.map((x) => x * dot(n, N))));
  let out = nrm(cross(n, N)); if (dot(out, sub(A, S.at(u, 0.8).P)) < 0) out = out.map((x) => -x);
  return { P: A, along: N, n, out };
}
const B = { base: L.build(GB, DEFAULTS, INF, { normals: true }), head: L.build(GN, DEFAULTS, INF, { normals: true }), plain: L.build(GN, DEFAULTS, ONE, { normals: true }) };
const f = marginFrame(B.head, 0.55);
const fp = marginFrame(B.plain, 0.55);

const SW = 360, SH = 300, PX = 150;
function drawSection(Bd, fr, title) {
  const segs = L.section(Bd.pos, fr.P, fr.along, fr.out, fr.n, [1.15, 0.95]);
  const rgb = Buffer.alloc(SW * SH * 3);
  for (let i = 0; i < SW * SH; i++) { rgb[i * 3] = 24; rgb[i * 3 + 1] = 24; rgb[i * 3 + 2] = 28; }
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= SW || y >= SH) return; const i = (y * SW + x) * 3; rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2]; };
  const toPx = ([x, y]) => [SW / 2 + x * PX, SH / 2 + 12 - y * PX];
  const ln = (a, b, c, w = 1) => { const [x0, y0] = toPx(a), [x1, y1] = toPx(b); const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let dx = -w; dx <= w; dx++) for (let dy = -w; dy <= w; dy++) put(Math.round(x + dx), Math.round(y + dy), c); } };
  ln([-1.15, 0], [1.15, 0], [60, 60, 66], 0); ln([0, -0.95], [0, 0.95], [60, 60, 66], 0);
  for (const s of segs) ln(s[0], s[1], [236, 226, 206], 1);
  ln([-1.05, -0.8], [-0.05, -0.8], [111, 183, 174], 1);
  text(rgb, SW, SH, 8, 8, title, [250, 250, 248], 2);
  text(rgb, SW, SH, Math.round(SW / 2 - 1.05 * PX), SH - 26, '1 MM', [111, 183, 174], 2);
  return { rgb, segs: segs.length };
}
const light = { light1: [0.45, -0.35, 0.82], light2: [-0.5, 0.4, 0.3] };
const W = 360, H = 300;
const dir = nrm(f.n.map((v, k) => v * 0.62 + f.out[k] * 0.55 + f.along[k] * 0.56));
const up = nrm(sub(f.n, dir.map((v) => v * dot(f.n, dir))));
const macro = (Bd, label) => { const rgb = render(Bd.pos, W, H, { dir, up, center: f.P, halfHeight: 1.6 }, { ...light, normals: Bd.normals, supersample: 3 }); text(rgb, W, H, 8, 8, label, [250, 250, 248], 2); return rgb; };
/* the whole bloom: its own bounding box, one camera for both trees */
let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
const whole = { base: (() => { const a = new GB.MeshBuilder({ exportMode: true, captureNormals: true }); GB.buildBloomInto(a, { ...DEFAULTS, petalInfill: 'VORONOI' }, { below: null }); return a; })(),
  head: (() => { const a = new GN.MeshBuilder({ exportMode: true, captureNormals: true }); GN.buildBloomInto(a, { ...DEFAULTS, petalInfill: 'VORONOI' }, { below: null }); return a; })() };
for (let i = 0; i < whole.head.positions.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], whole.head.positions[i + k]); mx[k] = Math.max(mx[k], whole.head.positions[i + k]); }
const ctr = mn.map((v, k) => (v + mx[k]) / 2), rad = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2;
const wdir = nrm([0.35, -0.55, 0.76]), wup = nrm(sub([0, 0, 1], wdir.map((v) => v * dot([0, 0, 1], wdir))));
const wholeCell = (acc, label) => { const rgb = render(acc.positions, W, H, { dir: wdir, up: wup, center: ctr, halfHeight: rad * 0.95 }, { ...light, normals: acc.normals, supersample: 2 }); text(rgb, W, H, 8, 8, label, [250, 250, 248], 2); text(rgb, W, H, 8, H - 22, `${acc.triangleCount} TRIS`, [111, 183, 174], 2); return rgb; };

const cells = [
  [drawSection(B.base, f, 'BEFORE: SECTION').rgb, drawSection(B.head, f, 'AFTER: SECTION').rgb, drawSection(B.plain, fp, 'PLAIN PETAL').rgb],
  [macro(B.base, 'BEFORE K=4 SMOOTH'), macro(B.head, 'AFTER K=4 SMOOTH'), macro(B.plain, 'PLAIN K=4 SMOOTH')],
  [wholeCell(whole.base, 'BEFORE: WHOLE'), wholeCell(whole.head, 'AFTER: WHOLE'), null],
];
const titles = ['INFILLED MARGIN AT U 0.55 - TRUE SECTION, 150 PX/MM', 'THE SAME MARGIN - PRINT PREVIEW SHADING', 'THE INFILLED BLOOM AT ITS RULED DEFAULTS - PRINT PREVIEW'];
const LBL = 30, cols = 3, rowsN = 3;
const SHW = cols * W, SHH = rowsN * (H + LBL);
const sheet = Buffer.alloc(SHW * SHH * 3);
for (let i = 0; i < SHW * SHH; i++) { sheet[i * 3] = 14; sheet[i * 3 + 1] = 14; sheet[i * 3 + 2] = 16; }
cells.forEach((line, r) => {
  const y0 = r * (H + LBL);
  text(sheet, SHW, SHH, 8, y0 + 8, titles[r], [111, 183, 174], 2);
  line.forEach((c, k) => { if (c) blit(sheet, SHW, SHH, c, W, H, k * W, y0 + LBL); });
});
const out = PNG || path.join(DIR, 'infill-margin-bead.png');
writePng(out, SHW, SHH, sheet);
console.log(`wrote ${out}  (whole bloom: ${whole.base.triangleCount} -> ${whole.head.triangleCount} triangles, EXPORT)`);
