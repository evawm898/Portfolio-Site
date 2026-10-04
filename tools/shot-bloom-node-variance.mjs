/* ===================================================================
   shot-bloom-node-variance.mjs — PER-NODE VARIATION AND THE RE-FLOORED
   DEFAULT RACEME, FOR EVA'S EYE (inflorescence build 3: Phase A's rulings 1
   and 2, Phase B's node term and derived phase).

     node tools/shot-bloom-node-variance.mjs <out.png>

   Rendered through `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no same-tree pixel control is owed and
   no pixel delta is quoted anywhere (this repo's contact-sheet rule). Every
   cell is the SHIPPED builder (`buildBloomInto`, EXPORT mode) on a named
   control set, and every caption carries that build's own export triangle
   count and its share of the 1,500,000 budget (`EXPORT_TRI_BUDGET`,
   imported). Parts are told apart by colour from the builder's own declared
   ranges: the HEAD (`[0, hubTriEnd)`), the STEM, the LEAVES, the FLORETS.

   ROW 1 IS THE ARGUMENT, ON ONE CAMERA: the shipped raceme with the node
   term OFF, the same raceme with it ON, and ON under the head's own form
   field (the phase derived outward) — the camera is the OFF cell's and is
   written verbatim to the other two, so the difference is the only thing
   moving. SIDE-ON: alternate phyllotaxy puts every floret in the x-z plane,
   so the camera looks along +y with z up.
   ROW 2 IS THE RE-FLOORED DEFAULT: the raceme whole (four nodes where there
   were five — the internode floor is the florets' own now), a macro on the
   pair the floor binds on (the same-side florets two nodes apart, the pair
   that stood 0.676 mm apart at the old floor), and the gradient at its
   ceiling with the cap binding. Every raceme caption carries the plan's
   floor and the MEASURED floret-to-floret approach (the combination gate's
   own measure, EXPORT), never the plan's claim alone.
   =================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { measureInfloApproachMm } from './bloom-inflo-approach.mjs';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node tools/shot-bloom-node-variance.mjs <out.png>'); process.exit(2); }

const CW = 460, CH = 460, CAP = 82, PAD = 10;
const COL = { head: [222, 210, 186], stem: [150, 160, 150], leaf: [120, 176, 108], floret: [226, 150, 176] };

function build(set) {
  const state = { ...DEFAULTS, ...set };
  const acc = new G.MeshBuilder({ exportMode: true });
  const m = G.buildBloomInto(acc, state);
  const P = acc.positions;
  const nTri = P.length / 9;
  const B = m.inflorescenceBuilt;
  const firstFloret = B && B.placed.length ? B.placed[0].at / 9 : nTri;
  const leafTris = (m.leavesBuilt || []).reduce((n, l) => n + l.tris, 0);
  const leafFrom = firstFloret - leafTris;
  const colorOf = (t) => (t < m.hubTriEnd ? COL.head : t >= firstFloret ? COL.floret : t >= leafFrom ? COL.leaf : COL.stem);
  const ap = m.inflorescence && m.inflorescence.present && B && B.placed.length > 1 ? measureInfloApproachMm(G, state, 'floret-floret') : null;
  return { m, P, tris: acc.triangleCount, colorOf, approach: ap };
}
function whole(b) {
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (let i = 0; i < b.P.length; i += 3) { const x = b.P[i], z = b.P[i + 2]; if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (z < mnz) mnz = z; if (z > mxz) mxz = z; }
  const half = Math.max(mxx - mnx, mxz - mnz) / 2 * 1.06;
  return { dir: [0, -1, 0], up: [0, 0, 1], center: [(mnx + mxx) / 2, 0, (mnz + mxz) / 2], halfHeight: half };
}
/* the pair the floor binds on: the floret at `a` and the one `d` nodes below
   it at `b` — centred between the two placements' heads, side-on */
function pairMacro(b, halfMm) {
  const P = b.m.inflorescence, Q = b.m.inflorescenceBuilt.placed;
  const at = P.pitchFloorAt;
  const near = (az) => Q.filter((q) => Math.abs((((q.az - az) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) < 1e-6);
  const upper = near((at.aDeg * Math.PI) / 180).find((q) => near((at.bDeg * Math.PI) / 180).some((r) => r.nodeIndex === q.nodeIndex + at.nodesApart));
  const lower = upper ? Q.find((q) => q.nodeIndex === upper.nodeIndex + at.nodesApart && Math.abs((((q.az - (at.bDeg * Math.PI) / 180) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) < 1e-6) : null;
  const c = upper && lower ? [(upper.headAt[0] + lower.headAt[0]) / 2, 0, (upper.headAt[2] + lower.headAt[2]) / 2] : [0, 0, -60];
  return { dir: [0, -1, 0], up: [0, 0, 1], center: c, halfHeight: halfMm, pair: upper && lower ? [upper.nodeIndex + 1, lower.nodeIndex + 1] : null };
}

const pct = (n) => `${(100 * n / G.EXPORT_TRI_BUDGET).toFixed(1)}%`;
const R = { stemLength: 120, inflorescence: 'RACEME' };
const fl = (b) => `FLOOR ${b.m.inflorescence.pitchFloorMm.toFixed(2)} MM, ${b.m.inflorescence.nodes} NODES`;
const apx = (b) => (b.approach ? `FLORET-TO-FLORET ${b.approach.mm.toFixed(3)} MM` : 'ONE FLORET');
/* ROW 1 HOLDS THE NODE COUNT AT FOUR ON ALL THREE CELLS: the varied florets
   are more compact than the head's own, so their derived floor is lower and
   the default's five-asked raceme fits FIVE of them where it fits four plain
   ones — the law working, and the one thing that must NOT move in a
   comparison whose point is the florets' form. The shipped raceme asks five
   and gets four; asking four gives the same four depths. */
const off = build({ ...R, floretNodes: 4 });
const camOff = whole(off);
const dflt = build(R);
const rows = [
  { title: 'PER-NODE VARIATION, SIDE-ON, ONE CAMERA (THE OFF CELL\'S, WRITTEN TO ALL THREE), FOUR NODES HELD', cells: [
    { b: off, cam: () => camOff, cap: (b) => ['NODE VARIANCE OFF', `${fl(b)}`, `${apx(b)} - ${b.m.inflorescenceBuilt.units.length} FLORET BUILD`] },
    { set: { ...R, floretNodes: 4, nodeVariance: 1 }, cam: () => camOff, cap: (b) => ['NODE VARIANCE 1.00', 'CURL, CUP, TWIST BY EACH NODE\'S AZIMUTH', `${apx(b)} - ${b.m.inflorescenceBuilt.units.length} FLORET BUILDS`] },
    { set: { ...R, floretNodes: 4, nodeVariance: 0.5, varianceForm: 0.5 }, cam: () => camOff, cap: (b) => ['NODE VARIANCE 0.50 X THE HEAD\'S FORM FIELD 0.50', `PHASE DERIVED OUTWARD: ${b.m.inflorescenceBuilt.units.map((u) => Number(u.floretState.variancePhase).toFixed(0)).join('/')} DEG, NEVER THE HEAD\'S`, `${apx(b)} - ${b.m.inflorescenceBuilt.units.length} FLORET BUILDS`] },
  ] },
  { title: 'THE RE-FLOORED DEFAULT (RULING 1) AND THE CAPPED GRADIENT (RULING 2)', cells: [
    { b: dflt, cam: whole, cap: (b) => ['THE SHIPPED RACEME: 4 NODES WHERE THERE WERE 5', `${fl(b)} - THE FLORETS' OWN (RODS' ${b.m.inflorescence.pitchFloorRodMm.toFixed(2)})`, apx(b)] },
    { b: dflt, cam: (b) => pairMacro(b, 40), cap: (b, cam) => [`THE PAIR THE FLOOR BINDS ON: NODES ${cam.pair ? cam.pair.join(' AND ') : '?'}`, 'SAME SIDE, TWO NODES APART - 0.676 MM AT THE OLD FLOOR', apx(b)] },
    { set: { ...R, pedicelGradient: 3, floretNodes: 12, pedicelLength: 60 }, cam: whole, cap: (b) => ['GRADIENT ASKED 3.00 ON 60 MM PEDICELS, 12 NODES', `CAPPED AT ${b.m.inflorescence.gradientMax.toFixed(2)}X: NO FLORET OVER THE HEAD'S FLOOR`, `${b.m.inflorescence.pedicelLensMm.map((x) => x.toFixed(0)).join('/')} MM - ${apx(b)}`] },
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
    const b = c.b || build(c.set);
    const cam = c.cam(b);
    const img = render(b.P, CW, CH, cam, { colorOf: b.colorOf, bg: [30, 30, 34] });
    const x = PAD + i * (CW + PAD);
    blit(sheet, SW, SH, img, CW, CH, x, y);
    const [l1, l2, l3] = c.cap(b, cam);
    text(sheet, SW, SH, x, y + CH + 6, l1, [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, l2, [210, 210, 204], 2);
    text(sheet, SW, SH, x, y + CH + 42, l3, [210, 210, 204], 2);
    text(sheet, SW, SH, x, y + CH + 60, `${b.tris} TRIS EXPORT - ${pct(b.tris)}`, [190, 200, 190], 2);
    report.push({ cell: `${l1} | ${l2} | ${l3}`, tris: b.tris, budget: pct(b.tris) });
  });
  y += CH + CAP + PAD;
}
writePng(OUT, SW, SH, sheet);
for (const r of report) console.log(`${String(r.tris).padStart(8)}  ${r.budget.padStart(6)}  ${r.cell}`);
console.log(`wrote ${OUT} (${SW}x${SH})`);
