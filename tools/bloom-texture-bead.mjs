#!/usr/bin/env node
/* ===================================================================
   bloom-texture-bead.mjs — THE RELIEF OVER THE BEAD, MEASURED (surface
   texture T3, Eva's rulings Q4/Q5: the relief runs OVER the rim bead, which
   supersedes the edge-profile ruling's fixed outline for TEXTURED petals).
   The brief asks, before shipping it: does the relieved bead FOLD, how far
   does the OUTLINE move, and what happens to the PETAL-TO-PETAL and
   PETAL-TO-NIB clearance — on the default, on the narrowest petal, and on
   the 0.40 mm nib. This tool answers each with a number off the EMITTED
   geometry, in EXPORT mode, textured against its own untextured twin:

     FOLDS       the triangle-triangle census (tools/bloom-self-intersection.mjs)
                 WITHIN each shell — the petal's own bead crossing its own skin
                 reads here; cross-shell is the by-design overlap.
     OUTLINE     the bead's apex moves s along its own w (TX5): the builder's
                 apex samples give max / mean s on the rim, against H.
     CLEARANCE   the nearest approach between NEIGHBOURING petal shells
                 (every vertex of one against every triangle of the next, on a
                 1 mm grid, exact point-triangle distance), untextured and
                 textured, with the site (r, z) and whether it sits in the
                 petal's last 5 % of height (the nib). A NEGATIVE reading is a
                 crossing; the shipping default already crosses its neighbour
                 by ~1.17 mm skin to skin (the accepted look, variance build 1),
                 so the question is how much the relief ADDS.
   Node only, no browser. RUN: node tools/bloom-texture-bead.mjs [--json f]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(HERE, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(HERE, 'bloom-registry.js')).href);
const { census } = await import(pathToFileURL(path.join(HERE, 'tools/bloom-self-intersection.mjs')).href);
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;

function pointTri(P, A, B, C) {
  const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ac = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], ap = [P[0] - A[0], P[1] - A[1], P[2] - A[2]];
  const d1 = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2], d2 = ac[0] * ap[0] + ac[1] * ap[1] + ac[2] * ap[2];
  let q;
  if (d1 <= 0 && d2 <= 0) q = A;
  else {
    const bp = [P[0] - B[0], P[1] - B[1], P[2] - B[2]], d3 = ab[0] * bp[0] + ab[1] * bp[1] + ab[2] * bp[2], d4 = ac[0] * bp[0] + ac[1] * bp[1] + ac[2] * bp[2];
    if (d3 >= 0 && d4 <= d3) q = B;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); q = [A[0] + v * ab[0], A[1] + v * ab[1], A[2] + v * ab[2]]; }
      else {
        const cp = [P[0] - C[0], P[1] - C[1], P[2] - C[2]], d5 = ab[0] * cp[0] + ab[1] * cp[1] + ab[2] * cp[2], d6 = ac[0] * cp[0] + ac[1] * cp[1] + ac[2] * cp[2];
        if (d6 >= 0 && d5 <= d6) q = C;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); q = [A[0] + w * ac[0], A[1] + w * ac[1], A[2] + w * ac[2]]; }
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); q = [B[0] + w * (C[0] - B[0]), B[1] + w * (C[1] - B[1]), B[2] + w * (C[2] - B[2])]; }
            else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; q = [A[0] + ab[0] * v + ac[0] * w, A[1] + ab[1] * v + ac[1] * w, A[2] + ab[2] * v + ac[2] * w]; }
          }
        }
      }
    }
  }
  return Math.sqrt((P[0] - q[0]) ** 2 + (P[1] - q[1]) ** 2 + (P[2] - q[2]) ** 2);
}
/* the nearest approach of blade A's vertices to blade B's triangles (a signed
   crossing reads 0 here — the census says whether skins cross; this is a GAP) */
/* `rMin`: vertices of A inside this radius of the axis are skipped — the feet
   and the root blend overlap their neighbours BY DESIGN (the shipping default
   crosses its neighbour there, the accepted look), so the BLADE's clearance is
   read above the ring */
function nearestBetween(pos, A, B, cell = 1.0, reach = 3.0, rMin = 0) {
  const grid = new Map(); const key = (x, y, z) => `${x},${y},${z}`;
  const c = (v) => Math.floor(v / cell);
  for (let t = B.triStart; t < B.triStart + B.tris; t++) {
    const o = t * 9;
    const xs = [pos[o], pos[o + 3], pos[o + 6]], ys = [pos[o + 1], pos[o + 4], pos[o + 7]], zs = [pos[o + 2], pos[o + 5], pos[o + 8]];
    for (let x = c(Math.min(...xs)); x <= c(Math.max(...xs)); x++) for (let y = c(Math.min(...ys)); y <= c(Math.max(...ys)); y++) for (let z = c(Math.min(...zs)); z <= c(Math.max(...zs)); z++) {
      const k = key(x, y, z); let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(t);
    }
  }
  let best = Infinity, at = null; const r = Math.ceil(reach / cell);
  const seen = new Set();
  for (let t = A.triStart; t < A.triStart + A.tris; t++) for (let k = 0; k < 3; k++) {
    const o = t * 9 + k * 3; const P = [pos[o], pos[o + 1], pos[o + 2]];
    if (Math.hypot(P[0], P[1]) < rMin) continue;
    const sk = `${P[0]},${P[1]},${P[2]}`; if (seen.has(sk)) continue; seen.add(sk);
    const cx = c(P[0]), cy = c(P[1]), cz = c(P[2]);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const b = grid.get(key(cx + dx, cy + dy, cz + dz)); if (!b) continue;
      for (const tb of b) { const q = tb * 9; const d = pointTri(P, [pos[q], pos[q + 1], pos[q + 2]], [pos[q + 3], pos[q + 4], pos[q + 5]], [pos[q + 6], pos[q + 7], pos[q + 8]]); if (d < best) { best = d; at = P; } }
    }
  }
  return { mm: best, at };
}
const STATES = [
  ['the default (8 x 35 x 16)', {}],
  ['the narrowest petal (width 8)', { petalWidth: 8 }],
  ['the 0.40 mm nib (tip shape 0.60)', { petalTipShape: 0.6 }],
  ['the cupped crown (cup 1.2 x curl 180)', { petalCup: 1.2, petalSpineCurl: 180 }],
  ['forty petals on one whorl', { petalCount: 40 }],
];
const out = [];
for (const [name, o] of STATES) for (const type of ['PEBBLE', 'CELLULAR']) for (const H of [0.4, 1.5]) {
  const ui = { ...R.DEFAULTS, ...o, petalTexture: type, textureHeight: H };
  const acc = new G.MeshBuilder({ exportMode: true }); const rec = G.buildBloomInto(acc, ui, { below: null });
  const twin = new G.MeshBuilder({ exportMode: true }); const recU = G.buildBloomInto(twin, { ...ui, petalTexture: 'NONE' }, { below: null });
  const cT = census(acc.positions), cU = census(twin.positions);
  const T = rec.texture.organs.petal;
  const apex = T.apexSamples.map((q) => q.s); const apexMax = Math.max(...apex), apexMean = apex.reduce((a, b) => a + b, 0) / apex.length;
  const n = rec.petalsAll.length;
  let gapT = Infinity, gapU = Infinity, atT = null, atU = null;
  const pairs = Math.min(n, 8);
  const rMin = rec.foot.rings[0].radius + 2;   // above the ring and the root blend's own overlap
  for (let i = 0; i < pairs; i++) {
    const j = (i + 1) % n; if (j === i) break;
    const a = nearestBetween(acc.positions, rec.petalsAll[i], rec.petalsAll[j], 1.0, 3.0, rMin); if (a.mm < gapT) { gapT = a.mm; atT = a.at; }
    const b = nearestBetween(twin.positions, recU.petalsAll[i], recU.petalsAll[j], 1.0, 3.0, rMin); if (b.mm < gapU) { gapU = b.mm; atU = b.at; }
  }
  const zTop = Math.max(...Array.from({ length: rec.petalsAll[0].tris * 3 }, (_, v) => acc.positions[rec.petalsAll[0].triStart * 9 + v * 3 + 2]));
  const site = (p) => (p ? `r ${Math.hypot(p[0], p[1]).toFixed(1)} z ${p[2].toFixed(1)}${p[2] > 0.95 * zTop ? ' (the TIP)' : ''}` : '-');
  const r = { state: name, type, H, rMin, tris: acc.triangleCount, trisTwin: twin.triangleCount, within: cT.within, withinTwin: cU.within, worstMm: cT.worstSpanMm, cross: cT.cross, crossTwin: cU.cross, reliefMax: T.reliefMaxMm, apexMax, apexMean, apexN: apex.length, gapMm: gapT, gapTwinMm: gapU, siteT: site(atT), siteU: site(atU) };
  out.push(r);
  console.log(`${name} | ${type} H ${H}: tris ${r.tris} (twin ${r.trisTwin}) · FOLDS within ${r.within} (twin ${r.withinTwin}) worst ${r.worstMm.toFixed(4)} mm · cross ${r.cross} (twin ${r.crossTwin}) · OUTLINE apex moves max ${apexMax.toFixed(3)} mean ${apexMean.toFixed(3)} of H ${H} over ${apex.length} samples · CLEARANCE (blade, r > ${rMin.toFixed(1)}) neighbour ${gapT === 0 ? 'CROSSING' : gapT >= 3 ? '> 3 mm' : gapT.toFixed(3) + ' mm'} at ${r.siteT} (twin ${gapU === 0 ? 'CROSSING' : gapU >= 3 ? '> 3 mm' : gapU.toFixed(3) + ' mm'} at ${r.siteU})`);
}
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
