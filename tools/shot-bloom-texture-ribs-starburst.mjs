#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-ribs-starburst.mjs — THE STARBURST REACHES THE EDGE
   (docs/bloom-surface-texture-ribs.md §12; Eva's ruling of Nov 9, third round:
   "starburst but have it go further along the center closer to the edges").

     node tools/shot-bloom-texture-ribs-starburst.mjs docs/img/bloom-texture-ribs-starburst.png
          [--data docs/data/bloom-texture-ribs.json]

   Rows: A and B, BEFORE (the second round's starburst: the hub top faded out
   ~1.9 mm inside the petal feet's edge and the rim's curvature fade took the
   rest) and AFTER (the ruled reach: the hub top ribbed over the feet to its
   rim), at H 1.0; then the AFTER at H 2.5. Columns: from directly above at
   raking light, at 45 degrees, and the exact radial section along a petal's
   midline (ribbed in cyan against nothing raised in grey; the feet's inner
   edge and the hub's rim in amber). The default bloom, EXPORT, crest lines;
   Node builds drawn by bloom-soft-render.mjs (deterministic, no pixel figure
   quoted). Triangles and the census from the measure tool's centre section.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-ribs-starburst.mjs <out.png> [--data <json>]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DATA = (() => { const f = arg('--data', path.join(ROOT, 'docs/data/bloom-texture-ribs.json')); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; })();
const GEO = await R.ribsGeometry();
const W = 420, Hc = 420, CAP = 96, COLS = 3, H = 1.0;
const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const fmt = (n) => (n === undefined || n === null ? '-' : Number(n).toLocaleString('en-US'));
const cells = [];
const push = (img, caption) => cells.push({ img, caption });
const WORDS = {
  collar: 'COLLAR: the ribs die into a soft raised ring; the disc inside stays smooth',
  starburst: 'STARBURST: every other rib drops inward, as close to the centre as the 1.6 mm floor allows',
  concentric: 'CONCENTRIC: the ribs end at a ring; the disc inside takes fine concentric ridges',
};
const row = (law, reach, h) => (DATA.centre || []).find((x) => x.law === law && x.centre === 'starburst' && (x.reach || 'hub') === reach && x.H === h);
const stat = (q) => (q ? `${fmt(q.tris)} tris, ${q.withinPairs} within-shell pairs, ${q.shells} shells, ${q.open} open / ${q.doubled} doubled / ${q.degen} degenerate edges` : '(not measured)');

const ROWS = [['A', 'hub', 1.0], ['A', 'edge', 1.0], ['B', 'hub', 1.0], ['B', 'edge', 1.0], ['A', 'edge', 2.5], ['B', 'edge', 2.5]];
for (const [law, reach, H] of ROWS) {
  const ex = { ribLaw: law, ribCentre: 'starburst', ribStarburstReach: reach, textureHeight: H };
  const b = await R.ribsBuild(DEFAULTS, ex, { mode: 'crest', GEO });
  const u = await R.ribsBuild(DEFAULTS, ex, { mode: 'crest', GEO, capability: { boneNoRelief: true } });
  let rFeet = Infinity, rRim = 0;
  for (const g of b.stats.repl) { const PP = g.O.P; for (let i = 0; i < PP.length; i += 3) { const rr = Math.hypot(PP[i], PP[i + 1]); if (g.organ === 'petal') rFeet = Math.min(rFeet, rr); if (g.organ === 'hub') rRim = Math.max(rRim, rr); } }
  const half = 12.5;
  const P = new Float32Array(b.acc.positions);
  const q = row(law, reach, H);
  const tag = `${law}${law === 'A' ? ' (default)' : ''} STARBURST, ${reach === 'edge' ? 'AFTER: reaches the edge' : 'BEFORE: the second round'}, H ${H}`;
  push(render(P, W, Hc, { center: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], halfHeight: half }, { ...RAKE }),
    [`${tag}. From directly above, ${2 * half} mm across, raking light`, reach === 'edge' ? `the hub top ribbed over the feet to its rim (${rRim.toFixed(2)} mm); the rim crease smooth over one lattice edge` : `the ribs fade out ~${(H * 15 / 8).toFixed(2)} mm inside the feet's edge (${rFeet.toFixed(2)} mm); the flat ring is the feet`]);
  push(render(P, W, Hc, { center: [0, 0, 0], dir: [0, -Math.SQRT1_2, Math.SQRT1_2], up: [0, 0, 1], halfHeight: half }, { ...RAKE }),
    [`${law} ${reach.toUpperCase()} at 45 degrees, the same build`, q ? `${stat(q)}` : '(not measured)', q ? `${q.flips} flipped triangles` : '']);
  const img = Buffer.alloc(W * Hc * 3, 26);
  const rMax = 12.5, k = (W - 30) / rMax, ox = 15, oy = Math.round(Hc * 0.62);
  const px = (r, z) => [Math.round(ox + r * k), Math.round(oy - z * k)];
  const dot = (x, y, col) => { if (x < 0 || y < 0 || x >= W || y >= Hc) return; const o = (y * W + x) * 3; img[o] = col[0]; img[o + 1] = col[1]; img[o + 2] = col[2]; };
  const lineP = (A, B, col) => { const n = Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])) + 1; if (n > 3 * W) return; for (let t = 0; t <= n; t++) dot(Math.round(A[0] + (B[0] - A[0]) * t / n), Math.round(A[1] + (B[1] - A[1]) * t / n), col); };
  const section = (PP, col) => {
    for (let t = 0; t < PP.length / 9; t++) {
      const o = t * 9, V = [[PP[o], PP[o + 1], PP[o + 2]], [PP[o + 3], PP[o + 4], PP[o + 5]], [PP[o + 6], PP[o + 7], PP[o + 8]]];
      if (V.every((v) => v[0] < 0 || v[0] > rMax + 2)) continue;
      const pts = [];
      for (let i = 0; i < 3; i++) { const a = V[i], bb = V[(i + 1) % 3]; if ((a[1] <= 0 && bb[1] > 0) || (a[1] > 0 && bb[1] <= 0)) { const s = a[1] / (a[1] - bb[1]); const x = a[0] + s * (bb[0] - a[0]), z = a[2] + s * (bb[2] - a[2]); if (x >= 0) pts.push([x, z]); } }
      if (pts.length === 2) lineP(px(pts[0][0], pts[0][1]), px(pts[1][0], pts[1][1]), col);
    }
  };
  for (let r = 0; r <= rMax; r += 1) { const [gx] = px(r, 0); for (let y = 40; y < Hc - 20; y += 4) dot(gx, y, [55, 55, 55]); }
  section(u.acc.positions, [140, 140, 140]);
  section(b.acc.positions, [70, 210, 230]);
  for (const rr of [rFeet, rRim]) { const [rx] = px(rr, 0); for (let y = 40; y < Hc - 20; y += 2) if ((y >> 2) % 2) dot(rx, y, [235, 170, 70]); }
  text(img, W, Hc, 8, 8, 'RADIAL SECTION, AZIMUTH 0 (A PETAL MIDLINE)   1 MM GRID', [220, 220, 210], 1);
  text(img, W, Hc, 8, 22, 'CYAN: RIBBED   GREY: NOTHING RAISED   AMBER: FEET EDGE, HUB RIM', [220, 220, 210], 1);
  push(img, [`${law} ${reach.toUpperCase()} H ${H}: the section to scale (r 0-${rMax} mm)`, `feet's inner edge ${rFeet.toFixed(2)} mm, hub rim ${rRim.toFixed(2)} mm`]);
  console.log(`${law} ${reach} H ${H}: ${b.acc.triangleCount} tris`);
}
/* ----------------------------------------------------- compose */
const rows = []; for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'RIBS: THE STARBURST REACHES THE EDGE. BEFORE / AFTER, A AND B. DEFAULT BLOOM, CREST LINES.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => r.forEach((c, ci) => { blit(sheet, SW, SH, c.img, W, Hc, ci * W, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((W - 12) / 6)); if (cap.length > 7) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, ci * W + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); }));
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT}: ${SW} x ${SH}, ${cells.length} cells`);
