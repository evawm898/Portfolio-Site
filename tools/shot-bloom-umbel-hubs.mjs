/* ===================================================================
   THE UMBEL HUBS SHEET (Eva's two rulings of Oct 27, from the deploy preview):
   (1) THE STEM THROUGH THE HEAD — her own state (8 radial petals, spread 2.00,
   head rise 0.35, hub CURVED at 1.60, a stem): on main the stem's flat top
   disc sat at the cap's APEX and its rim stood through the head's skin by the
   cap's sagitta at the stem's radius; the fix lays the rim on the cap's
   mid-surface. BEFORE / AFTER from above (the ring at the centre), as a
   CUTAWAY (the near half of the model removed, so the stem's top is seen in
   section against the cap's wall) and side-on; the worst corner (rise 1, a
   12 mm stem) the same way.
   (2) EVERY UMBEL JUNCTION BECOMES A HUB — the hub-to-stem join run in
   reverse: the spider lily (6 florets, head off) and the mophead (12 x 12)
   BEFORE (the Oct 24 coin) and AFTER (the flare), from Eva's three cameras —
   side-on, from below, and a CLOSE-UP of the junction (a ray tip on the
   mophead); then each Hub style at the defaults on both.
   BEFORE cells are a build of the base commit's own `bloom-geometry.js` (a
   git worktree); AFTER cells this tree's; one deterministic software renderer
   (`bloom-soft-render.mjs`), so the columns differ only by the geometry. Every
   caption carries the measured dimensions and the triangle count off the
   build it shows. The junction's triangles are rose, the stem grey, florets
   cream, the head's hub teal.

   RUN:  node tools/shot-bloom-umbel-hubs.mjs <out.png> --base <worktree of the base commit>
   =================================================================== */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import * as G from '../bloom-geometry.js';
import { DEFAULTS, UMBEL_DEPTH2_DEFAULTS } from '../bloom-registry.js';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--base');
const baseDir = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
if (!OUT || !baseDir) { console.error('usage: node tools/shot-bloom-umbel-hubs.mjs <out.png> --base <worktree>'); process.exit(2); }
const BASE = await import(pathToFileURL(path.join(baseDir, 'bloom-geometry.js')).href);

const CW = 360, CH = 360, CAP = 72, PAD = 10, LABELW = 230;
const COL = { knot: [214, 111, 154], stem: [150, 160, 150], floret: [226, 214, 190], hub: [110, 180, 170], petal: [226, 214, 190] };

function build(set, M) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const m = M.buildBloomInto(acc, { ...DEFAULTS, ...set });
  const IB = m.inflorescenceBuilt;
  const ranges = [];                                   // [from, to, colour]
  if (IB && IB.knot) ranges.push([...IB.knot.triRange, COL.knot]);
  /* a mophead's ray tips: the sub-umbel's own knot, once per placed ray */
  if (IB && IB.sub && IB.sub.knot && IB.sub.knot.triRange) for (const p of IB.placed) ranges.push([p.at / 9 + IB.sub.knot.triRange[0], p.at / 9 + IB.sub.knot.triRange[1], COL.knot]);
  const hubRange = [m.petalTriEnd, m.hubTriEnd], stemRange = [m.hubTriEnd, m.stemTriEnd];
  const firstFloret = IB && IB.placed && IB.placed.length ? IB.placed[0].at / 9 : Infinity;
  const colorOf = (t) => { for (const [a, b, c] of ranges) if (t >= a && t < b) return c; if (t >= hubRange[0] && t < hubRange[1]) return COL.hub; if (t >= stemRange[0] && t < stemRange[1]) return COL.stem; return t >= firstFloret ? COL.floret : COL.petal; };
  return { m, IB, P: acc.positions, tris: acc.triangleCount, colorOf, stem: m.stem, hub: m.hub };
}
/* the near half of the model removed (triangles whose centroid has y > 0), so a
   camera looking along -y... sees the inside: the stem's top against the cap */
function cutaway(P) {
  const out = [];
  for (let t = 0; t < P.length / 9; t++) { const y = (P[t * 9 + 1] + P[t * 9 + 4] + P[t * 9 + 7]) / 3; if (y <= 0) for (let k = 0; k < 9; k++) out.push(P[t * 9 + k]); }
  return Float64Array.from(out);
}
const VIEW = {
  above: (c, r) => ({ dir: [0, 0.001, 1], up: [0, 1, 0], center: c, halfHeight: r }),
  side: (c, r) => ({ dir: [0, -1, 0], up: [0, 0, 1], center: c, halfHeight: r }),
  lowside: (c, r) => ({ dir: [0, -1, 0.35], up: [0, 0, 1], center: c, halfHeight: r }),
  below: (c, r) => ({ dir: [0.25, -0.45, -0.86], up: [0, 0, 1], center: c, halfHeight: r }),
  cut: (c, r) => ({ dir: [0, 1, 0], up: [0, 0, 1], center: c, halfHeight: r }),
};
const EVA = { petalCount: 8, spread: 2, headRise: 0.35, hubStyle: 'CURVED', hubShapeAmount: 1.6, stemLength: 60 };
const WORST = { headRise: 1, stemDiameter: 12, stemLength: 60 };
const LILY = { stemLength: 120, inflorescence: 'UMBEL', umbelFlorets: 6 };
const MOP = { stemLength: 120, inflorescence: 'UMBEL', umbelDepth: '2', ...UMBEL_DEPTH2_DEFAULTS };

const stemDims = (b) => { const S = b.stem, d = b.hub.dome, t = S.hubT, r = S.outerR; const sag = d ? (d.Rd + t / 2) - Math.sqrt((d.Rd + t / 2) ** 2 - r * r) : 0;
  let over = -Infinity; for (let i = b.m.hubTriEnd * 9; i < b.m.stemTriEnd * 9; i += 3) { const rr = Math.hypot(b.P[i], b.P[i + 1]); if (rr > b.hub.radius) continue; const z = b.P[i + 2] - (d ? d.centreZ + Math.sqrt(Math.max(0, (d.Rd + t / 2) ** 2 - rr * rr)) : t / 2); if (z > over) over = z; }
  return { sag, over, top: S.stemTopZ ?? S.topZ, label: `STEM TOP ${over > 1e-6 ? `${over.toFixed(3)} MM ABOVE THE SKIN` : `${(-over).toFixed(3)} MM UNDER THE SKIN`} AT R ${r.toFixed(1)} (CAP SAG ${sag.toFixed(3)})` }; };
const knotDims = (K) => { const F = K && K.flare; return K ? `BAND ${(2 * K.halfHeightMm).toFixed(2)} TALL X ${(2 * K.radiusMm).toFixed(2)} ACROSS${F ? ` - FLARE ${F.style} ${F.swellMm.toFixed(2)} DOWN TO A ${(2 * (F.rodR + 0.5)).toFixed(2)} ROD${F.clamped ? ' (CLAMPED)' : ''}` : ' - A COIN'} - ${K.tris} TRIS` : ''; };
/* a mophead's ray tip: the first ray's sub-boss, in the world */
const rayTip = (b) => { const IB = b.IB; if (!IB || !IB.sub || !IB.placed || !IB.placed.length) return null; const M = IB.placed[0].M, c = IB.sub.knot.centre; return [M[0] * c[0] + M[1] * c[1] + M[2] * c[2] + M[3], M[4] * c[0] + M[5] * c[1] + M[6] * c[2] + M[7], M[8] * c[0] + M[9] * c[1] + M[10] * c[2] + M[11]]; };

const rows = [];
/* section 1 — the stem through the head */
for (const [tag, set] of [["EVA'S STATE: 8 PETALS, SPREAD 2, RISE 0.35, CURVED 1.60, A 60 MM STEM", EVA], ['THE WORST CORNER: RISE 1, A 12 MM STEM', WORST]]) {
  for (const view of ['above', 'cut', 'lowside']) rows.push({ sec: 1, tag, set, view });
}
/* section 2 — the junction as a hub */
for (const [tag, set] of [['THE SPIDER LILY: 6 FLORETS, HEAD OFF', LILY], ['THE MOPHEAD: 12 RAYS X 12 FLORETS AT THE FLOOR', MOP]]) {
  for (const view of ['side', 'below', 'close']) rows.push({ sec: 2, tag, set, view });
}
/* section 3 — each style at the defaults, three columns */
rows.push({ sec: 3, tag: 'EACH HUB STYLE AT THE DEFAULTS - THE SPIDER LILY', set: LILY, view: 'close', styles: true });
rows.push({ sec: 3, tag: 'EACH HUB STYLE AT THE DEFAULTS - A MOPHEAD RAY TIP', set: MOP, view: 'close', styles: true });
const ncol = 3;
const SW = ncol * (CW + PAD) + PAD + LABELW, SH = rows.length * (CH + CAP + PAD) + PAD;
const sheet = Buffer.alloc(SW * SH * 3, 18);
const report = [];
const cache = new Map();
const cached = (set, M) => { const k = JSON.stringify(set) + (M === BASE ? ':base' : ':head'); if (!cache.has(k)) cache.set(k, build(set, M)); return cache.get(k); };
rows.forEach((row, ri) => {
  const y = PAD + ri * (CH + CAP + PAD);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 8, row.sec === 1 ? 'STEM THROUGH THE HEAD' : row.sec === 2 ? 'UMBEL JUNCTION = HUB' : 'HUB STYLES', [240, 236, 228], 2);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 30, row.tag, [210, 210, 204], 1);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 46, { above: 'FROM ABOVE', cut: 'CUTAWAY (NEAR HALF REMOVED)', lowside: 'LOW SIDE ANGLE', side: 'SIDE-ON', below: 'FROM BELOW', close: 'CLOSE-UP OF THE JUNCTION' }[row.view], [210, 210, 204], 1);
  const cells = row.styles
    ? ['GOBLET', 'ANGLED', 'CURVED'].map((s) => ({ b: cached({ ...row.set, hubStyle: s }, G), head: s }))
    : [{ b: cached(row.set, BASE), head: 'BEFORE' }, { b: cached(row.set, G), head: 'AFTER' }];
  cells.forEach(({ b, head }, i) => {
    const x = PAD + i * (CW + PAD);
    let c, r, P = b.P;
    if (row.sec === 1) { c = [0, 0, b.stem.topZ]; r = b.hub.radius * (row.view === 'above' ? 1.3 : 0.9); if (row.view === 'cut') P = cutaway(P); }
    else { const K = b.IB.knot; const tip = row.set.umbelDepth === '2' && row.view === 'close' ? rayTip(b) : null; c = tip || K.centre; r = (tip ? b.IB.sub.knot.radiusMm : K.radiusMm) * (row.view === 'close' ? 2.2 : 4.5);
      /* the ray tip close-up draws ONE ray's sub-umbel alone (its own stream range), or its junction is buried in the neighbours' florets */
      if (tip) { const p0 = b.IB.placed[0]; P = b.P.slice(p0.at, p0.at + p0.tris * 9); } }
    const img = render(P, CW, CH, VIEW[row.view === 'close' ? 'lowside' : row.view](c, r), { colorOf: b.colorOf, bg: [30, 30, 34] });
    blit(sheet, SW, SH, img, CW, CH, x, y);
    const K = row.sec === 1 ? null : (row.set.umbelDepth === '2' && (row.view === 'close') ? b.IB.sub.knot : b.IB.knot);
    const dims = row.sec === 1 ? stemDims(b).label : knotDims(K);
    text(sheet, SW, SH, x, y + CH + 6, head + (row.sec === 1 ? (head === 'BEFORE' ? ' - MAIN' : ' - THE FIX') : head === 'BEFORE' ? ' - THE COIN' : head === 'AFTER' ? ' - THE HUB' : ''), [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, dims.slice(0, 58), [210, 210, 204], 1);
    if (dims.length > 58) text(sheet, SW, SH, x, y + CH + 36, dims.slice(58, 116), [210, 210, 204], 1);
    text(sheet, SW, SH, x, y + CH + 52, `${b.tris} TRIS IN ALL`, [190, 200, 190], 2);
    if (i === 0 || row.styles) report.push(`${row.tag.padEnd(58)} ${row.view.padEnd(8)} ${head.padEnd(7)} ${dims} | ${b.tris} tris`);
    if (!row.styles && i === 1) report.push(`${''.padEnd(58)} ${''.padEnd(8)} ${head.padEnd(7)} ${dims} | ${b.tris} tris`);
  });
});
writePng(OUT, SW, SH, sheet);
for (const l of report) console.log(l);
console.log(`wrote ${OUT} (${SW}x${SH})`);
