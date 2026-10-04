/* ===================================================================
   shot-bloom-build-3.mjs — INFLORESCENCE BUILD 3, PHASE A, FOR EVA'S RULING:
   the fixed default raceme (#355) and a corymb on the full 120 mm stem (the
   250 mm pedicel ceiling).

     node tools/shot-bloom-build-3.mjs <out.png> [--base <worktree of 23b13bd>]

   Rendered through `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no same-tree pixel control is owed and no
   pixel delta is quoted anywhere (this repo's contact-sheet rule). Every cell
   is the SHIPPED builder (`buildBloomInto`, EXPORT mode) on a named control
   set; with `--base` the BEFORE cells are a real build of the base commit's
   own geometry module from a git worktree, never a remembered picture. Every
   caption carries the build's own export triangle count and its share of the
   1,500,000 budget, and the inset figures are the plan's own.

   SIDE-ON (the node-laws sheet's camera): alternate phyllotaxy puts every
   floret in the x-z plane, so the camera looks along +y with z up. The MACRO
   cells crop to the TOP node, framed from that node's own emitted root, where
   the gap under the head is the subject.
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--'));
const baseDir = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!OUT) { console.error('usage: node tools/shot-bloom-build-3.mjs <out.png> [--base <worktree>]'); process.exit(2); }
const BASE = baseDir ? await import(pathToFileURL(path.join(baseDir, 'bloom-geometry.js')).href) : null;

const CW = 460, CH = 460, CAP = 64, PAD = 10;
const COL = { head: [222, 210, 186], stem: [150, 160, 150], leaf: [120, 176, 108], floret: [226, 150, 176] };

function build(set, M = G) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const m = M.buildBloomInto(acc, { ...DEFAULTS, ...set });
  const P = acc.positions;
  const nTri = P.length / 9;
  const B = m.inflorescenceBuilt;
  const firstFloret = B && B.placed.length ? B.placed[0].at / 9 : nTri;
  const leafTris = (m.leavesBuilt || []).reduce((n, l) => n + l.tris, 0);
  const leafFrom = firstFloret - leafTris;
  const colorOf = (t) => (t < m.hubTriEnd ? COL.head : t >= firstFloret ? COL.floret : t >= leafFrom ? COL.leaf : COL.stem);
  return { m, P, tris: acc.triangleCount, colorOf };
}
function whole(b) {
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (let i = 0; i < b.P.length; i += 3) { const x = b.P[i], z = b.P[i + 2]; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (z < mnz) mnz = z; if (z > mxz) mxz = z; }
  const half = Math.max(mxx - mnx, mxz - mnz) / 2 * 1.06;
  return { dir: [0, -1, 0], up: [0, 0, 1], center: [(mnx + mxx) / 2, 0, (mnz + mxz) / 2], halfHeight: half };
}
/* The top node and the head above it: centred between the node's root and the
   head's floor, wide enough to hold the floret's whole reach. */
function topNode(b, halfMm) {
  const q = b.m.inflorescenceBuilt.placed[0];
  const floor = b.m.stem.rootZ;
  return { dir: [0, -1, 0], up: [0, 0, 1], center: [q.root[0] + q.D[0] * halfMm * 0.4, 0, (q.root[2] + floor) / 2], halfHeight: halfMm };
}
const pct = (n) => `${(100 * n / G.EXPORT_TRI_BUDGET).toFixed(1)}%`;
const R = { stemLength: 120, inflorescence: 'RACEME' };
const insetCap = (b) => `TOP NODE ${b.m.inflorescence.insetMm.toFixed(1)} MM DOWN - NEEDS ${b.m.inflorescence.insetNeededMm.toFixed(1)}`;
const rows = [
  { title: '#355 - THE SHIPPED RACEME, BEFORE AND AFTER (THE INSET IS THE FLORET\'S OWN REACH NOW)', cells: [
    BASE ? { set: R, mod: BASE, cam: whole, cap: (b) => ['BEFORE (23b13bd) - 20 MM AT 35 DEG', insetCap(b)] } : null,
    { set: R, cam: whole, cap: (b) => ['AFTER - THE SAME CONTROLS', insetCap(b)] },
    BASE ? { set: R, mod: BASE, cam: (b) => topNode(b, 34), cap: (b) => ['BEFORE - THE TOP NODE', 'PETALS THROUGH THE HEAD (0.000 MM)'] } : null,
    { set: R, cam: (b) => topNode(b, 34), cap: (b) => ['AFTER - THE TOP NODE', `REACH ${b.m.inflorescence.reachMm.toFixed(1)} MM OVER ${b.m.inflorescence.reachAzimuths.length} AZIMUTHS + ${b.m.inflorescence.insetGapMm.toFixed(2)} GAP`] },
  ].filter(Boolean) },
  { title: 'THE 250 MM CEILING - A CORYMB ON THE FULL 120 MM STEM, SOLVED LEVEL', cells: [
    BASE ? { set: { ...R, pedicelCorymb: 'ON' }, mod: BASE, cam: whole, cap: (b) => ['BEFORE - CLAMPED AT 120 MM', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - HEADS SPAN ${b.m.inflorescenceBuilt.headSpreadMm.toFixed(2)}`] } : null,
    { set: { ...R, pedicelCorymb: 'ON' }, cam: whole, cap: (b) => ['AFTER - THE LOWEST PEDICEL 134.3 MM', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - HEADS SPAN ${b.m.inflorescenceBuilt.headSpreadMm.toFixed(3)}`] },
    { set: { ...R, pedicelCorymb: 'ON', floretNodes: 8 }, cam: whole, cap: (b) => ['AFTER - 8 NODES, LEVEL', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM`] },
    { set: { ...R, pedicelLength: 250 }, cam: whole, cap: (b) => ['250 MM PEDICELS AT 35 DEG', `REACH ${b.m.inflorescence.reachMm.toFixed(0)} MM PASSES THE RACHIS - ${b.m.inflorescence.nodes} NODE, TOLD`] },
  ].filter(Boolean) },
];
const ncol = Math.max(...rows.map((r) => r.cells.length));
const SW = ncol * (CW + PAD) + PAD;
const SH = rows.reduce((h) => h + 26 + CH + CAP + PAD, PAD);
const sheet = Buffer.alloc(SW * SH * 3, 18);
let y = PAD;
const report = [];
for (const row of rows) {
  text(sheet, SW, SH, PAD, y + 4, row.title, [240, 236, 228], 2);
  y += 26;
  row.cells.forEach((c, i) => {
    const b = build(c.set, c.mod || G);
    const cam = c.cam(b);
    const img = render(b.P, CW, CH, cam, { colorOf: b.colorOf, bg: [30, 30, 34] });
    const x = PAD + i * (CW + PAD);
    blit(sheet, SW, SH, img, CW, CH, x, y);
    const [l1, l2] = c.cap(b);
    text(sheet, SW, SH, x, y + CH + 6, l1, [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, l2, [210, 210, 204], 2);
    text(sheet, SW, SH, x, y + CH + 42, `${b.tris} TRIS EXPORT - ${pct(b.tris)}`, [190, 200, 190], 2);
    report.push({ cell: `${l1} | ${l2}`, tris: b.tris, budget: pct(b.tris) });
  });
  y += CH + CAP + PAD;
}
writePng(OUT, SW, SH, sheet);
for (const r of report) console.log(`${String(r.tris).padStart(8)}  ${r.budget.padStart(6)}  ${r.cell}`);
console.log(`wrote ${OUT} (${SW}x${SH})`);
