#!/usr/bin/env node
/* ===================================================================
   tools/shot-bloom-infill-roundness-shipped.mjs — THE ROUNDNESS SWEEP ON THE
   SHIPPED CONTROL AND THE CURRENT TREE (the roundness-control session).

     node tools/shot-bloom-infill-roundness-shipped.mjs <dir> [--quick]

   Writes two sheets:
     roundness-sweep.png   — `infillRound` 0.0 -> 1.0 in 0.1 steps (the whole
                             live range: the law is unreparameterised, so the
                             travel below a hole's own onset rounds only its
                             clamped corners — the law being honest, told on
                             the control), the default 0.60 inserted and
                             MARKED. Petal face-on and the whole bloom per
                             column; every caption carries the ACHIEVED count,
                             the rounded / at-fillet split, the hole area and
                             the solid fraction, read off the BUILDER's record.
     roundness-default.png — the infilled petal and the whole bloom at the
                             ruled defaults (roundness 0.60), print preview's
                             geometry and shading (EXPORT mode, the builder's
                             captureNormals channel).
   The previous sweep, `docs/img/infill-roundness-sweep.png`, was rendered
   through a patched copy BEFORE the outer margin took the bead (#297) and its
   triangle figures are stale; it stays put as the record of that measurement
   pass. This one runs the SHIPPED module, so its numbers are the tree's.
   Deterministic renderer: no pixel delta is quoted.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (!DIR) { console.error('usage: node tools/shot-bloom-infill-roundness-shipped.mjs <dir> [--quick]'); process.exit(2); }
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(DIR, { recursive: true });
const G = await import(new URL('../bloom-geometry.js', import.meta.url).href);
const { DEFAULTS } = await import(new URL('../bloom-registry.js', import.meta.url).href);
const { firstSlot } = await import(new URL('./bloom-first-slot.mjs', import.meta.url).href);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const bbox = (p) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { c: mn.map((m, k) => (m + mx[k]) / 2), d: mx.map((m, k) => m - mn[k]) }; };
function build(set) {
  const st = { ...DEFAULTS, petalInfill: 'VORONOI', ...set };
  const acc = new G.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  const acc0 = new G.MeshBuilder({ exportMode: true });
  const fs0 = firstSlot(st, acc0);
  const surface = G.petalSurface(st, fs0.ring, fs0.slot, null, acc0);
  return { pos: Float64Array.from(acc.positions), normals: acc.normals ? Float64Array.from(acc.normals) : null, tris: acc.triangleCount, F: b.petalsAll[0].infill, surface };
}
const light = { light1: [0.45, -0.45, 0.78], light2: [-0.5, 0.4, 0.3] };
const PW = 300, PH = 440, BW = 300, BH = 300;
const WHITE = [250, 250, 248], TEAL = [111, 183, 174], GREY = [180, 176, 168], ROSE = [214, 111, 154];
function petalCell(one, label, lines, mark) {
  const n0 = one.surface.at(0.5, 0).n; const bb = bbox(one.pos);
  const up = nrm(sub(one.surface.at(0.9, 0).P, one.surface.at(0.1, 0).P));
  const rgb = render(one.pos, PW, PH, { dir: n0, up, center: bb.c, halfHeight: Math.max(...bb.d) * 0.52 }, { ...light, normals: one.normals, supersample: 3 });
  text(rgb, PW, PH, 8, 8, label, mark ? ROSE : WHITE, 2);
  lines.forEach((l, i) => text(rgb, PW, PH, 8, 28 + 18 * i, l, i === 0 ? TEAL : GREY, 2));
  return rgb;
}
function bloomCell(bloom, label, sub1) {
  const bb = bbox(bloom.pos);
  const rgb = render(bloom.pos, BW, BH, { dir: [0.2, -0.45, 0.87], up: [0, 1, 0], center: bb.c, halfHeight: Math.max(...bb.d) * 0.55 }, { ...light, normals: bloom.normals, supersample: 2 });
  text(rgb, BW, BH, 8, 8, label, WHITE, 2);
  text(rgb, BW, BH, 8, BH - 22, sub1, GREY, 2);
  return rgb;
}
const linesOf = (F) => {
  const R = F.roundShape;
  return [`${F.achieved} OF ${F.cells} HOLES`,
    R.rounded + R.atFillet ? `${R.rounded} ROUNDED, ${R.atFillet} AT FILLET` : 'TODAY: FILLETED POLYGONS',
    `HOLES ${R.holeAreaMm2.toFixed(1)} MM2`, `${(100 * R.solidFrac).toFixed(1)}% SOLID`, `ROUNDNESS MED ${R.medianRoundness.toFixed(3)}`];
};

const STEPS = QUICK ? [0, 0.6, 1] : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const table = [], petals = [], blooms = [];
for (const s of STEPS) {
  const one = build({ petalCount: 1, layerCount: 1, infillRound: s });
  const bloom = build({ infillRound: s });
  const corner = QUICK ? null : build({ infillRound: s, petalCount: 40, layerCount: 3 });
  const F = one.F, R = F.roundShape;
  const row = { s, achieved: F.achieved, cells: F.cells, rounded: R.rounded, atFillet: R.atFillet, heldByBar: R.heldByBar, holeAreaMm2: R.holeAreaMm2, solidFrac: R.solidFrac,
    medianRoundness: R.medianRoundness, minRoundness: R.minRoundness, onsetMin: R.onsetMin, onsetMax: R.onsetMax, trisPetal: one.tris, trisBloom: bloom.tris, trisCorner: corner ? corner.tris : null };
  table.push(row);
  console.log(`roundness ${s.toFixed(2)}${s === DEFAULTS.infillRound ? ' (DEFAULT)' : ''}  ${F.achieved}/${F.cells} holes  ${R.rounded} rounded / ${R.atFillet} at fillet  area ${R.holeAreaMm2.toFixed(1)} mm2  ${(100 * R.solidFrac).toFixed(1)}% solid  roundness med ${R.medianRoundness.toFixed(3)} min ${R.minRoundness.toFixed(3)}  onset ${R.onsetMin === null ? '-' : `${R.onsetMin.toFixed(3)}..${R.onsetMax.toFixed(3)}`}  tris petal ${one.tris} bloom ${bloom.tris}${corner ? ` 40x3 ${corner.tris} (${(100 * corner.tris / G.EXPORT_TRI_BUDGET).toFixed(1)}%)` : ''}`);
  const isDef = s === DEFAULTS.infillRound;
  petals.push(petalCell(one, `ROUNDNESS ${s.toFixed(2)}${isDef ? ' DEFAULT' : ''}`, linesOf(F), isDef));
  blooms.push(bloomCell(bloom, `ROUNDNESS ${s.toFixed(2)}${isDef ? ' DEFAULT' : ''}`, `${bloom.tris} TRIS`));
}
fs.writeFileSync(path.join(DIR, 'roundness-sweep.json'), JSON.stringify(table, null, 1));
{
  const cols = STEPS.length, W = cols * PW, H = PH + BH;
  const sheet = Buffer.alloc(W * H * 3);
  for (let i = 0; i < cols; i++) { blit(sheet, W, H, petals[i], PW, PH, i * PW, 0); blit(sheet, W, H, blooms[i], BW, BH, i * PW, PH); }
  writePng(path.join(DIR, 'roundness-sweep.png'), W, H, sheet);
}
/* the ruled default, larger */
{
  const QW = 600, QH = 800;
  const one = build({ petalCount: 1, layerCount: 1 });
  const bloom = build({});
  const n0 = one.surface.at(0.5, 0).n; const bb = bbox(one.pos);
  const up = nrm(sub(one.surface.at(0.9, 0).P, one.surface.at(0.1, 0).P));
  const a = render(one.pos, QW, QH, { dir: n0, up, center: bb.c, halfHeight: Math.max(...bb.d) * 0.52 }, { ...light, normals: one.normals, supersample: 3 });
  text(a, QW, QH, 12, 12, 'INFILLED PETAL - RULED DEFAULTS, ROUNDNESS 0.60', WHITE, 2);
  linesOf(one.F).forEach((l, i) => text(a, QW, QH, 12, 36 + 20 * i, l, i === 0 ? TEAL : GREY, 2));
  text(a, QW, QH, 12, QH - 26, `PRINT PREVIEW (EXPORT) - ${one.tris} TRIS`, GREY, 2);
  const bb2 = bbox(bloom.pos);
  const b = render(bloom.pos, QW, QH, { dir: [0.2, -0.45, 0.87], up: [0, 1, 0], center: bb2.c, halfHeight: Math.max(...bb2.d) * 0.55 }, { ...light, normals: bloom.normals, supersample: 2 });
  text(b, QW, QH, 12, 12, 'WHOLE BLOOM - RULED DEFAULTS, ROUNDNESS 0.60', WHITE, 2);
  text(b, QW, QH, 12, QH - 26, `PRINT PREVIEW (EXPORT) - ${bloom.tris} TRIS`, GREY, 2);
  const sheet = Buffer.alloc(2 * QW * QH * 3);
  blit(sheet, 2 * QW, QH, a, QW, QH, 0, 0); blit(sheet, 2 * QW, QH, b, QW, QH, QW, 0);
  writePng(path.join(DIR, 'roundness-default.png'), 2 * QW, QH, sheet);
  console.log(`default: petal ${one.tris} tris, bloom ${bloom.tris} tris`);
}
console.log(`wrote ${path.join(DIR, 'roundness-sweep.png')} and roundness-default.png`);
