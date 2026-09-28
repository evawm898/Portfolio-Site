#!/usr/bin/env node
/* ===================================================================
   tools/shot-bloom-rim-bevel.mjs — WHY THE RIM READS AS A BEVEL.
   `node tools/shot-bloom-rim-bevel.mjs <dir> [--png <file>]`

   Three rims, each at K = 4 FLAT, K = 4 SMOOTH, K = 6 SMOOTH and K = 8 SMOOTH,
   one camera per row so the only thing that changes along a row is the
   segment count and the shading:
     row 1  the PLAIN default petal's outer margin (the #278 bead)
     row 2  the INFILLED default petal's outer margin, above the split
     row 3  one HOLE rim on the infilled default petal (the S5 bead)
   and a fourth row of true cross-sections through the same three rims at
   K = 4, drawn from the emitted triangles.

   All EXPORT mode — the geometry print preview shows. "SMOOTH" is the
   builder's own `captureNormals` channel: the closed-form bead normal the
   viewport hands three.js in print preview (bloom.js's exportMode branch);
   "FLAT" is one normal per triangle. The live view's own route (three's
   `toCreasedNormals` at 60 degrees) is a third route and is not drawn; its
   answer on a 45-degree facet is the same (it smooths it).

   K = 6 AND 8 ARE NOT SHIPPABLE AS MEASURED — they cross the 1.5M triangle
   budget on two shipped matrix rows (docs/bloom-infill-roundness-and-bevel.md
   §3). They are drawn so the cause can be seen, not proposed.

   Renders through bloom-soft-render.mjs, which is deterministic, so no pixel
   delta is quoted and none is owed. The geometry comes from a PATCHED COPY of
   bloom-geometry.js (tools/bloom-rim-roundness-lib.mjs) written outside the
   repo; the shipped module is never touched.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import * as L from './bloom-rim-roundness-lib.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-rim-bevel.mjs <dir> [--png <file>]'); process.exit(2); }
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png');
fs.mkdirSync(DIR, { recursive: true });
const { DEFAULTS } = await import(new URL('../bloom-registry.js', import.meta.url).href);
const { sub, dot, cross, nrm } = L;

const ONE = { petalCount: 1, layerCount: 1 };
const INF = { ...ONE, petalInfill: 'VORONOI' };
const Ks = [4, 6, 8];
const variants = {};
for (const K of Ks) variants[K] = await L.loadVariant({ K });

/* THE THREE RIM POINTS AND THEIR FRAMES, read from the K = 4 build (the rim
   point is ON the mid-surface — the bead's apex — so it does not move with K). */
function marginFrame(B, u) {
  const S = B.surface, d = 1e-4, A = S.at(u, 1).P;
  const N = nrm(sub(S.at(u + d, 1).P, S.at(u - d, 1).P));
  let n = S.at(u, 1).n; n = nrm(sub(n, N.map((x) => x * dot(n, N))));
  let out = nrm(cross(n, N)); if (dot(out, sub(A, S.at(u, 0.8).P)) < 0) out = out.map((x) => -x);
  return { P: A, along: N, n, out };
}
function holeFrame(B) {
  const S = B.surface, Ln = S.length;
  const atP = (q) => { const u = Math.min(1, Math.max(0, q.x / Ln)); const h = S.profile.laminaHalfAt(u); const v = Math.max(-1, Math.min(1, h > 1e-9 ? q.y / h : 0)); return S.at(u, v); };
  let best = null;
  for (const lp of B.F.emittedLoops) { let cx = 0, cy = 0; for (const q of lp) { cx += q.x; cy += q.y; } cx /= lp.length; cy /= lp.length; const dd = Math.abs(cx / Ln - 0.55); if (!best || dd < best.d) best = { lp, c: { x: cx, y: cy }, d: dd }; }
  let q0 = best.lp[0], dm = Infinity; for (const q of best.lp) { const dd = Math.hypot(q.x - best.c.x, q.y - best.c.y); if (dd < dm) { dm = dd; q0 = q; } }
  const S0 = atP(q0), Sc = atP(best.c); const n = nrm(S0.n);
  let out = sub(Sc.P, S0.P); out = nrm(sub(out, n.map((v) => v * dot(out, n))));   // INTO the hole: the rim faces the hole
  return { P: S0.P, along: nrm(cross(out, n)), n, out };
}
const base = { plain: L.build(variants[4], DEFAULTS, ONE), infill: L.build(variants[4], DEFAULTS, INF) };
const frames = {
  plain: marginFrame(base.plain, 0.55),
  margin: marginFrame(base.infill, 0.55),
  hole: holeFrame(base.infill),
};
const rows = [
  { key: 'plain', set: ONE, title: 'PLAIN PETAL - OUTER MARGIN' },
  { key: 'margin', set: INF, title: 'INFILLED PETAL - OUTER MARGIN' },
  { key: 'hole', set: INF, title: 'INFILLED PETAL - HOLE RIM' },
];
const W = 360, H = 300;
const light = { light1: [0.45, -0.35, 0.82], light2: [-0.5, 0.4, 0.3] };
const cellsOut = [];
const builds = {};
for (const K of Ks) builds[K] = { plain: L.build(variants[K], DEFAULTS, ONE, { normals: true }), infill: L.build(variants[K], DEFAULTS, INF, { normals: true }) };
for (const row of rows) {
  const f = frames[row.key];
  /* one camera per row: looking along the rim, a little from above and outside */
  const dir = nrm(f.n.map((v, k) => v * 0.62 + f.out[k] * 0.55 + f.along[k] * 0.56));
  const up = nrm(sub(f.n, dir.map((v) => v * dot(f.n, dir))));
  const cam = { dir, up, center: f.P, halfHeight: 1.6 };
  const line = [];
  for (const [K, smooth] of [[4, false], [4, true], [6, true], [8, true]]) {
    const b = builds[K][row.key === 'plain' ? 'plain' : 'infill'];
    const rgb = render(b.pos, W, H, cam, { ...light, normals: smooth ? b.normals : null, supersample: 3 });
    text(rgb, W, H, 8, 8, `K=${K} ${smooth ? 'SMOOTH' : 'FLAT'}`, [250, 250, 248], 2);
    line.push({ rgb, K, smooth });
  }
  cellsOut.push({ row, line });
}
/* THE SECTIONS — the emitted triangles cut by the plane normal to the rim */
const SW = 360, SH = 300, PX = 150;
function drawSection(B, f, title) {
  const segs = L.section(B.pos, f.P, f.along, f.out, f.n, [1.15, 0.95]);
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
  return rgb;
}
const secs = [drawSection(base.plain.pos ? base.plain : null, frames.plain, 'SECTION K=4'), drawSection(base.infill, frames.margin, 'SECTION K=4'), drawSection(base.infill, frames.hole, 'SECTION K=4')];

/* assemble: 3 rows x (section + 4 renders) */
const LBL = 30, cols = 5, rowsN = 3;
const SHW = cols * W, SHH = rowsN * (H + LBL);
const sheet = Buffer.alloc(SHW * SHH * 3);
for (let i = 0; i < SHW * SHH; i++) { sheet[i * 3] = 14; sheet[i * 3 + 1] = 14; sheet[i * 3 + 2] = 16; }
cellsOut.forEach(({ row, line }, r) => {
  const y0 = r * (H + LBL);
  text(sheet, SHW, SHH, 8, y0 + 8, row.title, [111, 183, 174], 2);
  blit(sheet, SHW, SHH, secs[r], SW, SH, 0, y0 + LBL);
  line.forEach((c, k) => blit(sheet, SHW, SHH, c.rgb, W, H, (k + 1) * W, y0 + LBL));
});
const out = PNG || path.join(DIR, 'rim-bevel.png');
writePng(out, SHW, SHH, sheet);
console.log(`wrote ${out}`);
