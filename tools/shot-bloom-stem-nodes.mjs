#!/usr/bin/env node
/* ===================================================================
   shot-bloom-stem-nodes.mjs — THE SHEET FOR THE STEM'S NODES (#299's port).

     node tools/shot-bloom-stem-nodes.mjs <out.png>

   Eva's approved configuration (`stemDiameter` 3, the SOLID stem) with a
   bloom on top, and the shipped 6 mm stem beside it for comparison, each at
   node prominence 0, 0.24 and 0.48, leaves on (three alternate leaves, 40 mm
   at the ruled 35 degrees, on a 100 mm stem). A third row is the middle node
   of each 0.48 stem close up, where the phasing lives: the bend is drawn just
   below the node, inside the swelling.

   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no pixel delta is quoted and none is
   owed. EXPORT mode: the object a print gets. Every cell is the SHIPPED
   `buildBloomInto`; every caption's numbers are read off the build's own plan
   (tip offset, worst lean, the wall square to the axis, stations, triangles),
   never restated here. One camera per row: side-on along +y, so the
   alternate leaves' zig-zag lies in the picture plane; mm per pixel printed.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-bloom-stem-nodes.mjs <out.png>'); process.exit(2); }

const CW = 330, CH = 700, CAP = 58;
function build(d, prom) {
  const st = { ...DEFAULTS, stemLength: 100, stemDiameter: d, leafLength: 40, leafNodes: 3, stemNodeProminence: prom };
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  return { acc, S: b.stem, SB: b.stemBuilt };
}
function cell(built, cam, lines) {
  const img = render(built.acc.positions, CW, CH - CAP, cam, { color: [214, 206, 190] });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, CH - CAP, 0, CAP);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  return rgb;
}
const cells = [];
const rows = [];
for (const d of [3, 6]) {
  const row = [];
  for (const prom of [0, 0.24, 0.48]) {
    const bl = build(d, prom);
    const S = bl.S;
    /* one camera per row: side-on, centred on the stem's mid-height, sized to
       hold the head and the stem */
    const cam = { dir: [0, -1, 0], up: [0, 0, 1], center: [0, 0, S.rootZ - 45], halfHeight: 72 };
    const mmpx = (2 * cam.halfHeight) / (CH - CAP);
    const L = S.nodeLaw;
    const lines = [
      `${d} MM STEM${d === 3 ? ' SOLID' : ' HOLLOW'} - PROMINENCE ${prom.toFixed(2)}`,
      L ? `TIP ${S.nodeTipOffsetMm.toFixed(2)} MM OFF STRAIGHT, LEAN ${S.nodeTiltMaxDeg.toFixed(2)}` : 'STRAIGHT - NO NODES (THE IDENTITY)',
      L ? `SWELL +${(L.swell * 100).toFixed(1)}%, SPINDLE ${L.spreadMm.toFixed(1)} MM, TURN ${L.turnDeg.toFixed(2)}` : `${S.stations.length} STATIONS`,
      `STEM ${bl.SB.tris} TRIS, ${S.stations.length} STATIONS, ${mmpx.toFixed(3)} MM/PX`,
    ];
    row.push(cell(bl, cam, lines));
  }
  rows.push(row);
}
/* the close-up row: the middle node of each 0.48 stem */
const close = [];
for (const d of [3, 6]) {
  const bl = build(d, 0.48);
  const S = bl.S, L = S.nodeLaw, nd = L.nodes[1];
  const c = G.stemNodeAxisMm(L, nd.s + 0.375 * L.rampMm);
  const cam = { dir: [0, -1, 0], up: [0, 0, 1], center: [c[0], 0, S.rootZ - nd.s - 0.4 * L.rampMm], halfHeight: 2.2 * L.spreadMm };
  const mmpx = (2 * cam.halfHeight) / (CH - CAP);
  close.push(cell(bl, cam, [
    `${d} MM - MIDDLE NODE AT 0.48, CLOSE`,
    `NODE AT ${nd.s.toFixed(1)} MM, BEND PEAKS ${L.bendPeakBelowMm.toFixed(1)} MM BELOW`,
    `= ${L.bendPeakInSpreads.toFixed(3)} OF THE ${L.spreadMm.toFixed(1)} MM SPINDLE`,
    `${mmpx.toFixed(3)} MM/PX`,
  ]));
}
/* a blank third close-up slot carries the legend */
const legend = Buffer.alloc(CW * CH * 3, 18);
[
  'THE STEM NODES - ONE CONTROL',
  'THE FLOWER SWELLING AND KINK',
  'SPINDLE 3.27 STEM RADII (THE FLOWER)',
  'TURN ATAN(0.13 X PROMINENCE)',
  'EACH BEND PEAKS INSIDE THE SWELLING',
  'KINK TURNS AWAY FROM ITS LEAF',
  'EXPORT MODE, FLAT SHADED',
  'DETERMINISTIC RENDER - NO PIXEL DELTA',
].forEach((l, i) => text(legend, CW, CH, 10, 20 + i * 18, l, [240, 236, 226], 1));
close.push(legend);
rows.push(close);

const W = CW * 3 + 8, H = CH * 3 + 8;
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
