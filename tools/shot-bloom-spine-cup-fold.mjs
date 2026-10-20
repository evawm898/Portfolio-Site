/* ===================================================================
   shot-bloom-spine-cup-fold.mjs — THE SPINE AGAINST ITS OWN CROSS-SECTION
   (spine-cup-fold, Oct 20; docs/bloom-spine-cup-fold-outcome.md).

   ONE PETAL per cell, the petal builder's own triangles (`buildPetalInto` on the
   first slot the whorl primitive emits), seen SIDE-ON — down the slot's own
   width direction, so the curl plane is the picture plane — BEFORE (a worktree of
   the base commit, its own modules) and AFTER (this tree), on the same camera
   per pair. Beside the S row, the CROSS-SECTION at the fold station: the petal's
   mid-surface section and both skins in the plane across the blade, the spine
   centre at the origin, and the BEND'S CENTRE OF CURVATURE marked — the fold is
   the cupped margin passing that centre. Rendered through bloom-soft-render.mjs,
   deterministic: no pixel delta is quoted and none is owed. EXPORT mode.

   RUN:  node tools/shot-bloom-spine-cup-fold.mjs <out.png> --base <worktree of the base commit>
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { firstSlot } from './bloom-first-slot.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--base');
const BASE = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!OUT || !BASE) { console.error('usage: node tools/shot-bloom-spine-cup-fold.mjs <out.png> --base <worktree>'); process.exit(2); }
const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const load = (root, f) => import(pathToFileURL(path.join(root, f)).href);
const [GA, RA, GB, RB, SI] = await Promise.all([load(HERE, 'bloom-geometry.js'), load(HERE, 'bloom-registry.js'), load(BASE, 'bloom-geometry.js'), load(BASE, 'bloom-registry.js'), load(HERE, 'tools/bloom-self-intersection.mjs')]);

const S = { mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] };
const J = JSON.stringify;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function petalOf(G, R, sets) {
  const st = { ...R.DEFAULTS, ...sets };
  const acc = new G.MeshBuilder({ exportMode: true });
  const { ring, slot } = firstSlot(st, acc, 0, G);
  const rec = G.buildPetalInto(acc, st, ring, slot);
  const pos = new Float64Array(acc.positions);
  const surf = G.petalSurface(st, ring, slot, null, new G.MeshBuilder({ exportMode: true }));
  return { st, pos, rec, surf, slot, within: SI.census(pos).within };
}
const W = 420, H = 420;
function side(pos, slot, box) {
  const A = slot.azimuth, dir = [-Math.sin(A), Math.cos(A), 0];
  return render(pos, W, H, { dir, up: [0, 0, 1], center: box.c, halfHeight: box.h }, { bg: [22, 22, 26] });
}
function boxOf(...ps) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of ps) for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[i + k]); hi[k] = Math.max(hi[k], p[i + k]); }
  return { c: lo.map((v, k) => (v + hi[k]) / 2), h: 0.56 * Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) };
}
/* the spine's signed curvature at u, off the surface's own law (or the arc) */
function kappaAt(surf, u) {
  const L = surf.length, ds = L / 4000, s = u * L;
  return (surf.spineAt(s + ds).phi - surf.spineAt(s - ds).phi) / (2 * ds);
}
function line(rgb, x0, y0, x1, y1, col) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const o = (y * W + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
  }
}
/* THE CROSS-SECTION at u, in the plane across the blade: x along the width (T),
   y toward +N (the side a positive curvature bends toward), the spine centre at
   the origin; the mid-surface and both skins, and the bend's centre at 1/kappa. */
function section(surf, u, scaleMm) {
  const rgb = Buffer.alloc(W * H * 3, 22);
  const row = surf.rowAt(u), t = surf.t, k = kappaAt(surf, u);
  const px = (x, y) => [W / 2 + (x / scaleMm) * (W / 2), H * 0.62 - (y / scaleMm) * (W / 2)];
  line(rgb, ...px(-scaleMm, 0), ...px(scaleMm, 0), [60, 60, 66]);
  line(rgb, ...px(0, -scaleMm), ...px(0, scaleMm), [60, 60, 66]);
  for (const [off, col] of [[0, [214, 206, 190]], [t / 2, [120, 170, 220]], [-t / 2, [120, 170, 220]]]) {
    let prev = null;
    for (let j = 0; j <= 200; j++) {
      const q = row.sect(-1 + (2 * j) / 200);
      const P = [q.P[0] + off * q.n[0], q.P[1] + off * q.n[1], q.P[2] + off * q.n[2]];
      const d = sub(P, row.C), p = px(dot(d, row.T), dot(d, row.N));
      if (prev) line(rgb, ...prev, ...p, col);
      prev = p;
    }
  }
  if (k !== 0) {
    const yc = 1 / k, c = px(0, yc);
    for (let a = 0; a < 6; a++) { line(rgb, c[0] - 7, c[1] - 7 + a * 0, c[0] + 7, c[1] + 7, [230, 90, 90]); line(rgb, c[0] - 7, c[1] + 7, c[0] + 7, c[1] - 7, [230, 90, 90]); }
  }
  return { rgb, k };
}

const rows = [
  { name: 'S SPINE X CUP 0.6', sets: { petalCurlMode: 'CURVE', petalSpineCurve: J(S), petalCup: 0.6 }, sectionMm: 9 },
  { name: 'CURL 360 X CUP 1.2', sets: { petalSpineCurl: 360, petalCup: 1.2 }, sectionMm: 12 },
  { name: 'CURL 270 X CUP 1.2', sets: { petalSpineCurl: 270, petalCup: 1.2 }, sectionMm: 12 },
  { name: 'CURL 360 X CUP 0.9', sets: { petalSpineCurl: 360, petalCup: 0.9 }, sectionMm: 12 },
];
const COLS = 4, CW = W, CH = H + 64;
const sheet = Buffer.alloc(COLS * CW * (rows.length * CH + 300) * 3, 14);
const SW = COLS * CW, SH = rows.length * CH + 300;
const report = [];
rows.forEach((r, ri) => {
  const b = petalOf(GB, RB, r.sets), a = petalOf(GA, RA, r.sets);
  const box = boxOf(b.pos, a.pos);
  const sp = a.rec.spine;
  const u = sp.bend ? sp.bend.u : 0.58;
  const sb = section(b.surf, u, r.sectionMm), sa = section(a.surf, u, r.sectionMm);
  const cells = [
    [side(b.pos, b.slot, box), `BEFORE ${b.within} PAIRS`],
    [side(a.pos, a.slot, box), `AFTER ${a.within} PAIRS`],
    [sb.rgb, `SECTION U ${u.toFixed(2)} R ${(1 / Math.abs(sb.k)).toFixed(2)} MM`],
    [sa.rgb, `AFTER R ${(1 / Math.abs(sa.k)).toFixed(2)} MM`],
  ];
  cells.forEach(([img, cap], ci) => {
    blit(sheet, SW, SH, img, W, H, ci * CW, ri * CH + 58);
    if (ci === 0) text(sheet, SW, SH, 8, ri * CH + 6, `${r.name}   TURN ${a.rec.spine.curveMode ? `${b.rec.spine.turnBuiltDeg.toFixed(1)} DRAWN` : `${a.rec.spine.turnAskedDeg} ASKED`}, ${a.rec.spine.turnBuiltDeg.toFixed(1)} BUILT AFTER`, [250, 214, 150], 2);
    text(sheet, SW, SH, ci * CW + 8, ri * CH + 30, cap, [240, 236, 226], 2);
  });
  report.push({ row: r.name, before: b.within, after: a.within, turnAsked: sp.turnAskedDeg, turnBuilt: +sp.turnBuiltDeg.toFixed(1), bend: sp.bend, refusal: sp.curveRefusal });
});
/* the read-outs: the refused drag and the refused cup, through the shipped functions */
const ya = rows.length * CH + 16;
const s0 = petalOf(GA, RA, { petalCurlMode: 'CURVE', petalSpineCurve: J(S) });
const pr = s0.rec.spine.bendProbe({ ...s0.st, petalCup: 0.6 });
const cupMsg = pr ? GA.spineBendRefusal(pr.curve, [{ askedLengthMm: s0.rec.spine.askedLengthMm, table: pr.table }]) : null;
const lines = [
  'RED X: THE BEND S CENTRE OF CURVATURE. WHITE: MID-SURFACE. BLUE: THE TWO SKINS.',
  'THE FOLD IS THE CUPPED MARGIN PASSING THE CENTRE. THE LIMIT STOPS THE INNER SKIN AT IT: HALF A SHEET, NO MARGIN.',
  'PAIRS: THE SINGLE PETAL S OWN WITHIN-SHELL CROSSINGS, EXPORT, THE BUILDER S DOUBLES.',
  `REFUSED CUP 0 TO 0.6 ON THE S: ${cupMsg ? 'YES' : 'NO'}`,
];
lines.forEach((l, i) => text(sheet, SW, SH, 10, ya + i * 22, l, [220, 214, 200], 2));
writePng(OUT, SW, SH, sheet);
console.log(JSON.stringify({ report, cupRefusal: cupMsg }, null, 1));
