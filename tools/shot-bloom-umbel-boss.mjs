/* ===================================================================
   THE UMBEL BOSS SHEET (Eva's ruling, Oct 23: the junction knot becomes a
   flatter BOSS). The junction cell of the umbel sheet re-shot as a real
   BEFORE / AFTER: the BEFORE cells are a build of the base commit's own
   `bloom-geometry.js` (a git worktree), the AFTER cells this tree's, through
   one deterministic software renderer (`bloom-soft-render.mjs`), so the two
   columns differ only by the geometry. Two framings, each centred on the
   junction and sized from the BEFORE build's own sphere: SIDE-ON (looking
   along -y) and FROM BELOW. The junction's own triangles (its declared
   `triRange`) are drawn in rose; the stem grey, the florets cream.

   RUN:  node tools/shot-bloom-umbel-boss.mjs <out.png> --base <worktree of the base commit>
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--base');
const baseDir = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!OUT || !baseDir) { console.error('usage: node tools/shot-bloom-umbel-boss.mjs <out.png> --base <worktree>'); process.exit(2); }
const BASE = await import(pathToFileURL(path.join(baseDir, 'bloom-geometry.js')).href);

const CW = 400, CH = 400, CAP = 64, PAD = 10;
const COL = { knot: [214, 111, 154], stem: [150, 160, 150], floret: [226, 214, 190] };

function build(set, M) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const m = M.buildBloomInto(acc, { ...DEFAULTS, ...set });
  const K = m.inflorescenceBuilt.knot;
  const [k0, k1] = K.triRange;
  const firstFloret = m.inflorescenceBuilt.placed[0].at / 9;
  const colorOf = (t) => (t >= k0 && t < k1 ? COL.knot : t >= firstFloret ? COL.floret : COL.stem);
  return { m, K, P: acc.positions, tris: acc.triangleCount, knotTris: k1 - k0, colorOf };
}
const VIEW = {
  side: (c, r) => ({ dir: [0, -1, 0], up: [0, 0, 1], center: c, halfHeight: r }),
  below: (c, r) => ({ dir: [0.25, -0.45, -0.86], up: [0, 0, 1], center: c, halfHeight: r }),
};
const U = { stemLength: 120, inflorescence: 'UMBEL' };
const states = [
  { tag: '6 FLORETS 35 DEG HEAD OFF', set: { ...U, umbelFlorets: 6 } },
  { tag: '12 FLORETS 35 DEG HEAD OFF', set: { ...U, umbelFlorets: 12 } },
  { tag: '6 FLORETS -60 DEG HEAD OFF', set: { ...U, umbelFlorets: 6, pedicelAngle: -60 } },
  { tag: '6 FLORETS 90 DEG HEAD ON', set: { ...U, umbelFlorets: 6, pedicelAngle: 90, umbelHead: 'ON' } },
];
const dims = (b, before) => before
  ? `SPHERE ${(2 * b.K.radiusMm).toFixed(2)} MM ACROSS AND TALL`
  : `BOSS ${(2 * b.K.radiusMm).toFixed(2)} ACROSS ${(b.K.topZ - b.K.bottomZ).toFixed(2)} TALL`;
const rows = [];
for (const view of ['side', 'below']) for (const s of states) rows.push({ view, s });
const ncol = 2;
const SW = ncol * (CW + PAD) + PAD + 260, SH = rows.length * (CH + CAP + PAD) + PAD;
const sheet = Buffer.alloc(SW * SH * 3, 18);
const report = [];
rows.forEach(({ view, s }, ri) => {
  const y = PAD + ri * (CH + CAP + PAD);
  const before = build(s.set, BASE), after = build(s.set, G);
  const c = before.K.centre, r = before.K.radiusMm * 2.6;
  text(sheet, SW, SH, PAD + 2 * (CW + PAD), y + 8, view === 'side' ? 'SIDE-ON' : 'FROM BELOW', [240, 236, 228], 2);
  text(sheet, SW, SH, PAD + 2 * (CW + PAD), y + 30, s.tag, [210, 210, 204], 1);
  [[before, true], [after, false]].forEach(([b, isBefore], i) => {
    const img = render(b.P, CW, CH, VIEW[view](c, r), { colorOf: b.colorOf, bg: [30, 30, 34] });
    const x = PAD + i * (CW + PAD);
    blit(sheet, SW, SH, img, CW, CH, x, y);
    text(sheet, SW, SH, x, y + CH + 6, isBefore ? 'BEFORE - THE SPHERE' : 'AFTER - THE BOSS', [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, dims(b, isBefore), [210, 210, 204], 2);
    text(sheet, SW, SH, x, y + CH + 42, `JUNCTION ${b.knotTris} TRIS - ${b.tris} IN ALL`, [190, 200, 190], 2);
    if (view === 'side') report.push(`${s.tag.padEnd(28)} ${isBefore ? 'before' : 'after '} ${dims(b, isBefore).padEnd(40)} junction ${String(b.knotTris).padStart(5)} tris, ${b.tris} in all`);
  });
});
writePng(OUT, SW, SH, sheet);
for (const l of report) console.log(l);
console.log(`wrote ${OUT} (${SW}x${SH})`);
