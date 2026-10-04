/* ===================================================================
   shot-bloom-node-laws.mjs — THE INFLORESCENCE NODE LAWS, FOR EVA'S EYE
   (build 2: the corymb solve, the true spike, the gradient, the shared node).

     node tools/shot-bloom-node-laws.mjs <out.png>

   Rendered through `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no same-tree pixel control is owed and no
   pixel delta is quoted anywhere (this repo's contact-sheet rule). Every cell is
   the SHIPPED builder (`buildBloomInto`, EXPORT mode) on a named control set,
   and every caption carries that build's own export triangle count and its
   share of the 1,500,000 budget (`EXPORT_TRI_BUDGET`, imported). Parts are told
   apart by colour, from the builder's own declared ranges: the HEAD (petals and
   hub, `[0, hubTriEnd)`), the STEM, the LEAVES, and the FLORETS (each
   placement's own `at` / `tris`).

   SIDE-ON. Alternate phyllotaxy puts every floret in the x-z plane, so the
   camera looks along +y with z up: a node, its pedicel and its leaf read as a
   profile. The MACRO cells crop to one node, framed from that node's own
   emitted root point (`placed[k].root`), so the seat below the pedicel and the
   embed into the wall are legible at a scale a whole-plant cell cannot give.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-bloom-node-laws.mjs <out.png>'); process.exit(2); }

const CW = 460, CH = 460, CAP = 64, PAD = 10;
const COL = { head: [222, 210, 186], stem: [150, 160, 150], leaf: [120, 176, 108], floret: [226, 150, 176] };

function build(set) {
  const acc = new G.MeshBuilder({ exportMode: true });
  const m = G.buildBloomInto(acc, { ...DEFAULTS, ...set });
  const P = acc.positions;
  const nTri = P.length / 9;
  const B = m.inflorescenceBuilt;
  const firstFloret = B && B.placed.length ? B.placed[0].at / 9 : nTri;
  const leafTris = (m.leavesBuilt || []).reduce((n, l) => n + l.tris, 0);
  const leafFrom = firstFloret - leafTris;
  const colorOf = (t) => (t < m.hubTriEnd ? COL.head : t >= firstFloret ? COL.floret : t >= leafFrom ? COL.leaf : COL.stem);
  return { m, P, tris: acc.triangleCount, colorOf };
}

/* The whole plant, side-on: frame from the emitted positions' own x-z box. */
function whole(b) {
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (let i = 0; i < b.P.length; i += 3) { const x = b.P[i], z = b.P[i + 2]; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (z < mnz) mnz = z; if (z > mxz) mxz = z; }
  const half = Math.max(mxx - mnx, mxz - mnz) / 2 * 1.06;
  return { dir: [0, -1, 0], up: [0, 0, 1], center: [(mnx + mxx) / 2, 0, (mnz + mxz) / 2], halfHeight: half };
}
/* One node, side-on: centred a little out along the pedicel from its root. */
function macro(b, k, halfMm) {
  const q = b.m.inflorescenceBuilt.placed[k];
  return { dir: [0, -1, 0], up: [0, 0, 1], center: [q.root[0] + q.D[0] * halfMm * 0.55, 0, q.root[2] + q.D[2] * halfMm * 0.55 - halfMm * 0.15], halfHeight: halfMm };
}

const pct = (n) => `${(100 * n / G.EXPORT_TRI_BUDGET).toFixed(1)}%`;
const R = { stemLength: 120, inflorescence: 'RACEME' };
const rows = [
  { title: 'THE CORYMB - LEVEL TOPS, SOLVED (A PLANE THROUGH THE TOP HEAD)', cells: [
    { set: { ...R, stemLength: 40 }, cam: whole, cap: (b) => ['RACEME ON A 40 MM STEM', 'CORYMB OFF - EVERY PEDICEL 20 MM'] },
    { set: { ...R, stemLength: 40, pedicelCorymb: 'ON' }, cam: whole, cap: (b) => ['CORYMB ON', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - HEADS SPAN ${b.m.inflorescenceBuilt.headSpreadMm.toFixed(3)}`] },
    { set: { ...R, stemLength: 40, pedicelCorymb: 'ON', pedicelAngle: 60 }, cam: whole, cap: (b) => ['CORYMB ON AT 60 DEG', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - HEADS SPAN ${b.m.inflorescenceBuilt.headSpreadMm.toFixed(3)}`] },
  ] },
  { title: 'THE TRUE SPIKE - PEDICEL 0 IS SESSILE, THE FLORET HUB ROOTED ONE WALL DEEP', cells: [
    { set: { ...R }, cam: whole, cap: () => ['THE SHIPPED RACEME', '20 MM PEDICELS AT 35 DEG'] },
    { set: { ...R, pedicelLength: 0 }, cam: whole, cap: () => ['THE SPIKE', 'PEDICEL 0 - SESSILE AT EVERY NODE'] },
    { set: { ...R, pedicelLength: 0, pedicelAngle: 0 }, cam: (b) => macro(b, 2, 14), cap: (b) => ['SPIKE, ONE NODE, LEVEL', `HUB REACHES R ${b.m.inflorescenceBuilt.placed[2].wallReachR.toFixed(2)} MM, BORE ${b.m.stem.boreR.toFixed(2)}`] },
  ] },
  { title: 'THE GRADIENT - LOWEST PEDICEL OVER THE TOPMOST, LINEAR IN MM DOWN THE STEM', cells: [
    { set: { ...R, pedicelGradient: 0 }, cam: whole, cap: (b) => ['GRADIENT 0', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - THE LOWEST SESSILE`] },
    { set: { ...R, pedicelGradient: 2 }, cam: whole, cap: (b) => ['GRADIENT 2', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM`] },
    { set: { ...R, pedicelGradient: 3 }, cam: whole, cap: (b) => ['GRADIENT 3 - THE LOWEST OVERTOP', `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM`] },
  ] },
  { title: 'THE SHARED NODE - ONE LEAF UNDER EACH PEDICEL, AT ITS AZIMUTH, SEATED BELOW', cells: [
    { set: { ...R, leafLength: 15 }, cam: whole, cap: (b) => ['15 MM LEAVES', `SEATED ${b.m.leaf.sharedNode.offsetMm.toFixed(2)} MM BELOW EACH PEDICEL`] },
    { set: { ...R, leafLength: 15 }, cam: (b) => macro(b, 2, 12), cap: (b) => ['ONE NODE, 15 MM LEAF', 'PEDICEL ABOVE, LEAF BELOW, ONE AZIMUTH'] },
    { set: { ...R, leafLength: 40 }, cam: (b) => macro(b, 2, 22), cap: () => ['ONE NODE, 40 MM LEAF', 'BLADE THROUGH THE FLORET (0 MM)'] },
  ] },
];

const ncol = 3;
const SW = ncol * (CW + PAD) + PAD;
const SH = rows.reduce((h) => h + 26 + CH + CAP + PAD, PAD);
const sheet = Buffer.alloc(SW * SH * 3, 18);
let y = PAD;
const report = [];
for (const row of rows) {
  text(sheet, SW, SH, PAD, y + 4, row.title, [240, 236, 228], 2);
  y += 26;
  row.cells.forEach((c, i) => {
    const b = build(c.set);
    const cam = c.cam(b);
    const img = render(b.P, CW, CH, cam, { colorOf: b.colorOf, bg: [30, 30, 34] });
    const x = PAD + i * (CW + PAD);
    blit(sheet, SW, SH, img, CW, CH, x, y);
    const [l1, l2] = c.cap(b);
    text(sheet, SW, SH, x, y + CH + 6, l1, [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, l2, [210, 210, 204], 2);
    text(sheet, SW, SH, x, y + CH + 42, `${b.tris} TRIS EXPORT - ${pct(b.tris)}`, [190, 200, 190], 2);
    report.push({ row: row.title, cell: `${l1} | ${l2}`, tris: b.tris, budget: pct(b.tris) });
  });
  y += CH + CAP + PAD;
}
writePng(OUT, SW, SH, sheet);
for (const r of report) console.log(`${String(r.tris).padStart(8)}  ${r.budget.padStart(6)}  ${r.cell}`);
console.log(`wrote ${OUT} (${SW}x${SH})`);
