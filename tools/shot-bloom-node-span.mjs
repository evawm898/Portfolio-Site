#!/usr/bin/env node
/* ===================================================================
   shot-bloom-node-span.mjs — THE SHEET FOR BLOOM P1 (Eva's rulings, Oct 28:
   where the nodes go — a run start, end and spacing — and leaf size along
   the stem). docs/bloom-node-span-taper-outcome.md.

     node tools/shot-bloom-node-span.mjs <out.png>

   THREE STEMS, FIVE CELLS EACH, side-on:
     the CARNATION — SIMPLE leaves, OPPOSITE (decussate), swelling 1;
     the ROSE — COMPOUND leaves, ALTERNATE at 137.5 deg, kink 0.8, swelling
       0.25 (the matrix's own rose row);
     the MUM — LOBED leaves at the ruled mum form, ALTERNATE.
   Each at: the DEFAULTS (0.16 .. 0.86, even), a NARROW run HIGH on the stem
   (0.20 .. 0.45), CROWDED toward the BASE (spacing 0.8), CROWDED toward the
   TOP (spacing -0.8), and a 0.5 SIZE TAPER (smaller toward the top).
   ROW 4: the INSET CLAMP binding (start 0.05 under a 60 mm leaf at 60 deg —
   the slider asks 5 mm, the top leaf's rise raises it), a START PAST END
   (told: one node at the end), and a RACEME (every one of the four controls
   dead — the pedicels own the nodes).

   Every node is ticked on the cell's left edge at its depth with the depth in
   mm beside it, read off the build's own leaf plan (`nodeDepthsMm`), never
   restated; the caption carries the run as built (and the scale per node
   under a taper). RENDERED BY `bloom-soft-render.mjs`, deterministic — no
   pixel delta is quoted and none is owed. EXPORT mode (the object a print
   gets). Side-on cells look along +y; mm per pixel on every cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-bloom-node-span.mjs <out.png>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

const CW = 300, CH = 680, CAP = 84;
const IMG_H = CH - CAP;
function build(over) {
  const st = { ...R.DEFAULTS, ...over };
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  return { acc, st, S: b.stem, leaf: b.leaf, b };
}
const cam = (S, L) => ({ dir: [0, -1, 0], up: [0, 0, 1], center: [0, 0, S.rootZ - L / 2 - 4], halfHeight: L / 2 + 22 });
const mmpx = (c) => ((2 * c.halfHeight) / IMG_H).toFixed(3);
/* the pixel row of a world height under the side camera */
const rowOf = (c, z) => Math.round(IMG_H / 2 - ((z - c.center[2]) / (2 * c.halfHeight)) * IMG_H);
function cell(bl, lines, L) {
  const c = cam(bl.S, L);
  /* (P1b, Job 0) LEAVES IN THEIR OWN TONE AND A FILL LIGHT FROM THE CAMERA's
     SIDE: lit only from above, the carnation's decussate leaves at nodes 2 and
     4 — pointing straight at this side camera — showed their undersides at
     ambient light inside a same-coloured stem and read as dark lozenges, holes
     in a stem whose wall is >= 1.5 mm everywhere (docs/bloom-node-swelling-
     tight-outcome.md §1). The committed P1 image predates this and stays put. */
  const img = render(bl.acc.positions, CW, IMG_H, c, { color: [214, 206, 190],
    colorOf: (t) => (t < bl.b.stemTriEnd ? [214, 206, 190] : [150, 178, 132]), light2: [0, -0.8, -0.6] });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IMG_H, 0, CAP);
  /* the node ticks — the PLAN's own depths, below the hub's underside */
  const D = bl.leaf && bl.leaf.present ? bl.leaf.nodeDepthsMm : (bl.S.nodeLaw ? bl.S.nodeLaw.nodes.map((q) => q.s) : []);
  for (const d of D) {
    const y = CAP + rowOf(c, bl.S.rootZ - d);
    if (y < CAP || y >= CH - 2) continue;
    for (let x = 0; x < 16; x++) for (let t = 0; t < 2; t++) { const o = ((y + t) * CW + x) * 3; rgb[o] = 120; rgb[o + 1] = 210; rgb[o + 2] = 200; }
    text(rgb, CW, CH, 18, y - 3, `${d.toFixed(1)}`, [120, 210, 200], 1);
  }
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  text(rgb, CW, CH, 6, CH - 12, `${mmpx(c)} MM/PX  TICKS: NODE DEPTH MM BELOW THE HUB`, [170, 170, 160], 1);
  return rgb;
}
const runLine = (bl) => {
  const N = bl.leaf && bl.leaf.nodeRun;
  if (!N) return 'NO LEAF PLAN';
  if (N.shared) return 'RACEME: THE PEDICELS OWN THE NODES - ALL FOUR DEAD';
  return `RUN ${N.start.toFixed(2)}..${N.end.toFixed(2)}  SPACING ${N.spacingBuilt.toFixed(2)}${N.spacingClamped ? ' (CLAMPED)' : ''}${N.inverted ? '  START PAST END' : ''}`;
};
const gapLine = (bl) => {
  const d = bl.leaf && bl.leaf.present ? bl.leaf.nodeDepthsMm : [];
  if (d.length < 2) return `${d.length} NODE`;
  const g = d.slice(1).map((q, i) => q - d[i]);
  return `${d.length} NODES  INTERNODE TOP ${g[0].toFixed(1)}  BASE ${g[g.length - 1].toFixed(1)} MM`;
};
const sizeLine = (bl) => {
  const NS = bl.leaf && bl.leaf.nodeSizes;
  return NS ? `SIZE BY NODE ${NS.map((q) => `${Math.round(100 * q.scale)}%`).join(' ')}` : 'EVERY LEAF THE ASKED SIZE';
};
const insetLine = (bl) => bl.leaf ? `INSET ASKED ${bl.leaf.insetAskedMm.toFixed(1)} BUILT ${bl.leaf.insetMm.toFixed(1)} MM${bl.leaf.insetClamped ? ' (RAISED)' : ''}` : '';

const STEMS = [
  ['CARNATION - SIMPLE, OPPOSITE', { stemLength: 100, stemDiameter: 6, leafLength: 40, leafWidth: 6, leafNodes: 5, leafPhyllotaxy: 'opposite', stemNodeSwelling: 1, stemNodeKink: 0 }],
  ['ROSE - COMPOUND, ALTERNATE 137.5', { stemLength: 100, stemDiameter: 6, leafLength: 40, leafType: 'COMPOUND', leafNodes: 4, leafDivergence: 137.5, stemNodeSwelling: 0.25, stemNodeKink: 0.8 }],
  ['MUM - LOBED, ALTERNATE', { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4 }],
];
const VARIANTS = [
  ['THE DEFAULTS', {}],
  ['NARROW RUN HIGH 0.20..0.45', { leafNodeStart: 0.2, leafNodeEnd: 0.45 }],
  ['CROWDED TOWARD THE BASE 0.8', { leafNodeSpacing: 0.8 }],
  ['CROWDED TOWARD THE TOP -0.8', { leafNodeSpacing: -0.8 }],
  ['SIZE TAPER 0.5 (SMALLER UP)', { leafSizeTaper: 0.5 }],
];
const rows = [];
for (const [name, base] of STEMS) {
  const r = [];
  for (const [vname, v] of VARIANTS) {
    const bl = build({ ...base, ...v });
    r.push(cell(bl, [name, vname, runLine(bl), gapLine(bl), sizeLine(bl), insetLine(bl)], Number(base.stemLength)));
  }
  rows.push(r);
}
{
  const r = [];
  const clamp = build({ stemLength: 100, stemDiameter: 6, leafLength: 60, leafAngle: 60, leafNodes: 5, leafNodeStart: 0.05 });
  r.push(cell(clamp, ['THE INSET CLAMP BINDS', 'START 0.05 UNDER A 60 MM LEAF AT 60 DEG', runLine(clamp), gapLine(clamp), insetLine(clamp), 'THE SLIDER KEEPS 0.05 (TOLD)'], 100));
  const past = build({ stemLength: 100, stemDiameter: 6, leafLength: 40, leafNodes: 4, leafNodeStart: 0.7, leafNodeEnd: 0.4 });
  r.push(cell(past, ['START PAST END 0.70..0.40', 'THE SPAN IS EMPTY: ONE NODE AT THE END', runLine(past), gapLine(past), 'TOLD, NEVER SWAPPED', 'THE SLIDERS KEEP THEIR VALUES'], 100));
  const rac = build({ stemLength: 120, stemDiameter: 6, leafLength: 40, inflorescence: 'RACEME', leafNodeStart: 0.5, leafNodeEnd: 0.6, leafNodeSpacing: 0.8, leafSizeTaper: 0.7 });
  r.push(cell(rac, ['A RACEME WITH THE FOUR MOVED', 'START 0.5 END 0.6 SPACING 0.8 TAPER 0.7', runLine(rac), gapLine(rac), 'HIDDEN AND INERT ON THE PANEL', 'THE LEAVES FOLLOW THE PEDICELS'], 120));
  rows.push(r);
}
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
