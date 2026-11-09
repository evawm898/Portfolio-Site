#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-ribs-centre.mjs — THE RIBS CENTRE SHEET
   (docs/bloom-surface-texture-ribs.md §10; Eva's rulings of Nov 9 on #541).

     node tools/shot-bloom-texture-ribs-centre.mjs docs/img/bloom-texture-ribs-centre.png
          [--data docs/data/bloom-texture-ribs.json]

   Six rows — COLLAR, STARBURST, CONCENTRIC under law A (the default) and law
   B — each: the hub from directly above at raking light, the same at 45
   degrees, and the exact radial section through the ring (the emitted
   triangles cut by a vertical half-plane through the axis, along a petal's
   midline, raised in cyan against the same mesh built with nothing raised in
   grey; the derived radius in amber). The default bloom, petal feet in place,
   EXPORT, crest lines, H 1.0; Node builds of the prototype drawn by
   `bloom-soft-render.mjs` (deterministic, no pixel figure quoted). The
   triangles, the census and the closure in every caption are the measure
   tool's (`--section centre`), at H 1.0 and 2.5.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-ribs.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-ribs-centre.mjs <out.png> [--data <json>]'); process.exit(2); }
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
const row = (law, c, h) => (DATA.centre || []).find((x) => x.law === law && x.centre === c && x.H === h);
const stat = (q) => (q ? `${fmt(q.tris)} tris, ${q.withinPairs} within-shell pairs, ${q.shells} shells, ${q.open} open / ${q.doubled} doubled / ${q.degen} degenerate edges` : '(not measured)');

for (const law of ['A', 'B']) for (const c of R.RIB_CENTRES) {
  const b = await R.ribsBuild(DEFAULTS, { ribLaw: law, ribCentre: c, textureHeight: H }, { mode: 'crest', GEO });
  const u = await R.ribsBuild(DEFAULTS, { ribLaw: law, ribCentre: c, textureHeight: H }, { mode: 'crest', GEO, capability: { boneNoRelief: true } });
  const C = b.stats.centre, Sd = b.stats.schedule;
  const radius = C ? `R ${C.R.toFixed(2)} mm = max(r0 ${C.rFloor.toFixed(2)}, feet ${C.rFeet.toFixed(2)}): ${C.from}` : `spokes ${Sd.levels.filter((l) => l.rStart < 12).map((l) => `${l.n} from ${l.rStart.toFixed(2)}`).join(', ')} mm; the last 4 fade inside ${Sd.r0.toFixed(2)} mm`;
  const half = C && C.R > 9 ? 16 : 9.5;
  const P = new Float32Array(b.acc.positions);
  const q1 = row(law, c, 1.0), q25 = row(law, c, 2.5);
  push(render(P, W, Hc, { center: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0], halfHeight: half }, { ...RAKE }),
    [`${law}${law === 'A' ? ' (the default)' : ''}, ${WORDS[c]}. From directly above, ${2 * half} mm across, raking light, H ${H}`, radius]);
  push(render(P, W, Hc, { center: [0, 0, 0], dir: [0, -Math.SQRT1_2, Math.SQRT1_2], up: [0, 0, 1], halfHeight: half }, { ...RAKE }),
    [`${law} ${c.toUpperCase()} at 45 degrees, the same build`, `H 1.0: ${stat(q1)}`, `H 2.5: ${stat(q25)}`]);
  /* the radial section along a petal's midline (azimuth 0): every triangle cut by y = 0, x > 0 */
  const img = Buffer.alloc(W * Hc * 3, 26);
  const rMax = half * 1.15, k = (W - 30) / rMax, ox = 15, oy = Math.round(Hc * 0.62);
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
  if (C) { const [rx] = px(C.R, 0); for (let y = 40; y < Hc - 20; y += 2) if ((y >> 2) % 2) dot(rx, y, [235, 170, 70]); }
  text(img, W, Hc, 8, 8, `RADIAL SECTION, AZIMUTH 0 (A PETAL MIDLINE)   1 MM GRID`, [220, 220, 210], 1);
  text(img, W, Hc, 8, 22, `CYAN: RIBBED   GREY: NOTHING RAISED${C ? '   AMBER: R' : ''}`, [220, 220, 210], 1);
  push(img, [`${law} ${c.toUpperCase()}: the section to scale (r 0-${rMax.toFixed(0)} mm), through the hub, the petal foot and the blade`, C ? `the ring at R ${C.R.toFixed(2)} mm (${c === 'collar' ? `half-width ${C.wC} mm, the floor spacing` : `concentric ridges every ${C.sc} mm inside: ${C.circles.map((x) => x.toFixed(2)).join(', ')} mm`})` : 'no ring: the spokes thin inward and fade at the axis']);
  console.log(`${law} ${c}: ${b.acc.triangleCount} tris`);
}
/* ----------------------------------------------------- compose */
const rows = []; for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'RIBS: THE CENTRE. COLLAR / STARBURST / CONCENTRIC UNDER A AND B. DEFAULT BLOOM, FEET IN PLACE, H 1.0, CREST LINES.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => r.forEach((c, ci) => { blit(sheet, SW, SH, c.img, W, Hc, ci * W, 40 + ri * (Hc + CAP)); const cap = wrap(c.caption, Math.floor((W - 12) / 6)); if (cap.length > 7) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, ci * W + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); }));
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT}: ${SW} x ${SH}, ${cells.length} cells`);
