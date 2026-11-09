#!/usr/bin/env node
/* ===================================================================
   shot-bloom-texture-ribs-shipped.mjs — THE SHIPPED RIBS, BESIDE THE OCTOBER
   LAB AT THE SAME SETTINGS (docs/bloom-surface-texture-ribs-shipped.md).

     node tools/shot-bloom-texture-ribs-shipped.mjs docs/img/bloom-texture-ribs-shipped.png

   Every cell is a NODE build drawn by bloom-soft-render.mjs (deterministic, no
   pixel figure quoted), EXPORT mode, raking light. The LAB cells are the
   October lab's own B arm ("emitter field") rebuilt through
   bloom-texture-lab-core.js exactly as bloom-texture-lab.html builds it
   (`buildTagged` -> `prepare(0.4 mm, rows)` -> `displace('B', ribbing, lambda,
   H, outward, the four masks on)`) — the screenshot's own route, not a copy.
   The SHIPPED cells are bloom-geometry.js with `petalTexture: 'RIBS'`.
   Rows: the default bloom from above (lab | shipped), the hub centre close up,
   Eva's screenshot settings (5.75 mm), law A against law B, law B's centre,
   leaves and sepals, the height's maximum and the named exclusion.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const L = await import(pathToFileURL(path.join(ROOT, 'bloom-texture-lab-core.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const { render, writePng, text, blit } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-soft-render.mjs')).href);
const OUT = process.argv[2];
if (!OUT) { console.error('usage: shot-bloom-texture-ribs-shipped.mjs <out.png>'); process.exit(2); }
const W = 560, Hc = 560, CAP = 84, COLS = 2;
const RAKE = { light1: [0.95, -0.15, 0.25], light2: [-0.3, 0.4, 0.3] };
const TOP = (half, c = [0, 0, 0]) => ({ center: c, dir: [0, 0, 1], up: [0, 1, 0], halfHeight: half });
const OBL = (half, c = [0, 0, 0]) => ({ center: c, dir: [0.45, -0.55, 0.7], up: [0, 0, 1], halfHeight: half });
const fmt = (n) => Number(n).toLocaleString('en-US');
const CAPT = 2000000;
const cells = [];

function lab(lambda, H) {
  const soup = L.buildTagged({ ...DEFAULTS });
  const prep = L.prepare(soup, 0.4, { split: 'rows' });
  const d = L.displace(prep, 'B', { type: 'ribbing', lambda, heightMm: H, mode: 'outward', maskBeads: true, maskHoleRims: true, maskFeet: true, maskCreases: true });
  const P = new Float32Array(prep.tri.length * 3);
  for (let i = 0; i < prep.tri.length; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = d.P[prep.tri[i] * 3 + k];
  return { P, tris: prep.tri.length / 3, K: Math.max(1, Math.round((2 * Math.PI * 20) / lambda)) };
}
function ship(extra) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const t0 = performance.now();
  const rec = G.buildBloomInto(acc, { ...DEFAULTS, petalTexture: 'RIBS', ...extra }, { below: null, scopes: null });
  const ms = performance.now() - t0;
  const T = rec.texture;
  const raised = Object.entries(T.organs).filter(([, o]) => o.bone).map(([k, o]) => `${k} ${fmt(o.bone.displaced)}`).join(', ');
  return { P: new Float32Array(acc.positions), tris: acc.triangleCount, T, raised, ms, rec };
}
const pct = (n) => `${(100 * n / CAPT).toFixed(1)}% of the 2.0 M cap`;
const lawWords = (T) => T.ribs.law === 'A' ? `law A, ${T.ribs.spokes} spokes` : 'law B (4 x 2^L, branching)';

/* 1-2. the default bloom, from above, and the hub centre close up */
const lab2 = lab(2, 0.3), sh2 = ship({});
cells.push({ img: render(lab2.P, W, Hc, TOP(50), RAKE), cap: [`THE OCTOBER LAB (bloom-texture-lab.html, B "emitter field"): ribbing, height 0.30 mm, feature 2.00 mm, rows split at 0.40 mm, the four masks on. Default bloom from above, raking light.`, `${lab2.K} spokes; ${fmt(lab2.tris)} tris`] });
cells.push({ img: render(sh2.P, W, Hc, TOP(50), RAKE), cap: [`SHIPPED RIBS, the ruled defaults: ${lawWords(sh2.T)}, 2.00 mm apart 20 mm out, 0.30 mm, the soft wave. Same view.`, `${fmt(sh2.tris)} tris (${pct(sh2.tris)}); vertices raised: ${sh2.raised}`] });
cells.push({ img: render(lab2.P, W, Hc, TOP(12), RAKE), cap: ['THE LAB, the hub centre close up (24 mm across): the spokes converge freely to the axis; the hub top is ribbed over the petal feet to its rim.', ''] });
cells.push({ img: render(sh2.P, W, Hc, TOP(12), RAKE), cap: ['SHIPPED, the same close-up: the centre converges freely on the fan\'s own spokes (the rows split, TXR9) — the lab\'s radial hatch. The hub top under the feet is SMOOTH (the shipped coverage rule, kept by the brief): the octagon.', `hub: ${fmt(sh2.T.organs.hub.organ.refinedTris)} lattice tris, ${sh2.T.organs.hub.bone.displaced} of ${sh2.T.organs.hub.bone.vertices} vertices raised, ${sh2.T.organs.hub.bone.covered} covered by a foot`] });
/* 3. Eva's screenshot settings */
const lab575 = lab(5.75, 0.3), sh575 = ship({ ribSpacing: 5.75 });
cells.push({ img: render(lab575.P, W, Hc, TOP(50), RAKE), cap: [`THE LAB at the screenshot's settings: feature 5.75 mm, height 0.30 mm.`, `${lab575.K} spokes; ${fmt(lab575.tris)} tris`] });
cells.push({ img: render(sh575.P, W, Hc, TOP(50), RAKE), cap: [`SHIPPED at spacing 5.75 mm, 0.30 mm: ${lawWords(sh575.T)}.`, `${fmt(sh575.tris)} tris; raised: ${sh575.raised}`] });
/* 4. law A against law B */
const shB = ship({ ribLaw: 'B' });
cells.push({ img: render(sh2.P, W, Hc, OBL(48), RAKE), cap: ['SHIPPED law A (the default): a fixed count, the spokes fanning out — 1.0 mm apart at 10 mm, 2.0 at 20, 4.5 at 45. At 45 degrees.', `${fmt(sh2.tris)} tris`] });
cells.push({ img: render(shB.P, W, Hc, OBL(48), RAKE), cap: ['SHIPPED law B (a choice): constant spacing near 2.0 mm, 4 spokes at the centre doubling outward, each new rib growing over one spacing. Same view.', `${fmt(shB.tris)} tris; raised: ${shB.raised}`] });
cells.push({ img: render(shB.P, W, Hc, TOP(12), RAKE), cap: [`SHIPPED law B, the hub centre (24 mm across): its ${shB.T.ribs.levels.slice(1, 5).map((l) => l.n).join(' / ')} spoke levels begin at ${shB.T.ribs.levels.slice(1, 5).map((l) => l.rStart.toFixed(2)).join(' / ')} mm; the innermost ${shB.T.ribs.levels[0].n} spokes converge freely.`, ''] });
/* 5. leaves and sepals */
const shL = ship({ stemLength: 60, sepalCount: 5, leafLength: 30 });
cells.push({ img: render(shL.P, W, Hc, { center: [0, 0, -20], dir: [0.3, -0.85, 0.42], up: [0, 0, 1], halfHeight: 52 }, RAKE), cap: ['SHIPPED x 5 sepals and simple leaves on a 60 mm stem: every sheet reads the one field about the axis; the stem and the petioles are smooth (Eva\'s named exclusion).', `${fmt(shL.tris)} tris (${pct(shL.tris)}); raised: ${shL.raised}`] });
/* 6. the height's maximum, and the exclusion */
const shH = ship({ ribHeight: 2.5 });
cells.push({ img: render(shH.P, W, Hc, OBL(30), RAKE), cap: ['SHIPPED at the height\'s maximum, 2.50 mm (UNVALIDATED for SLS), law A, at 45 degrees.', `${fmt(shH.tris)} tris; max relief ${Math.max(...Object.values(shH.T.organs).map((o) => o.reliefMaxMm)).toFixed(3)} mm`] });
const shX = ship({ stemLength: 60, stamenCount: 12, gynoecium: 'STYLE', ribHeight: 1 });
cells.push({ img: render(shX.P, W, Hc, { center: [0, 0, 4], dir: [0.4, -0.7, 0.6], up: [0, 0, 1], halfHeight: 24 }, RAKE), cap: ['SHIPPED x 12 stamens, the style and a 60 mm stem at 1.0 mm: the rods and the stem are the untextured build\'s to the bit (TXR7); only the sheets and the hub top carry ribs.', `${fmt(shX.tris)} tris; raised: ${shX.raised}`] });

const rows = []; for (let i = 0; i < cells.length; i += COLS) rows.push(cells.slice(i, i + COLS));
const SW = W * COLS, SH = rows.length * (Hc + CAP) + 40;
const sheet = Buffer.alloc(SW * SH * 3, 18);
text(sheet, SW, SH, 10, 10, 'RIBS SHIPPED BESIDE THE OCTOBER LAB. DEFAULT BLOOM, EXPORT, RAKING LIGHT.', [240, 200, 120], 2);
const wrap = (lines, cols) => { const out = []; for (const l of lines) { if (!l) continue; let cur = ''; for (const w of l.split(' ')) { if (cur && (cur + ' ' + w).length > cols) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); } return out; };
rows.forEach((r, ri) => r.forEach((c, ci) => { blit(sheet, SW, SH, c.img, W, Hc, ci * W, 40 + ri * (Hc + CAP)); const cap = wrap(c.cap, Math.floor((W - 12) / 6)); if (cap.length > 6) throw new Error(`a caption needs ${cap.length} lines: ${cap.join(' / ')}`); cap.forEach((l, k) => text(sheet, SW, SH, ci * W + 6, 40 + ri * (Hc + CAP) + Hc + 4 + k * 12, l, [220, 220, 210], 1)); }));
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writePng(OUT, SW, SH, sheet);
console.log(`wrote ${OUT}: ${SW} x ${SH}, ${cells.length} cells`);
