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
const OUT = argv.find((a) => !a.startsWith('--') && !['--base', '--knot'].includes(argv[argv.indexOf(a) - 1]));
const baseDir = argv.includes('--base') ? path.resolve(argv[argv.indexOf('--base') + 1]) : null;
const knotDir = argv.includes('--knot') ? path.resolve(argv[argv.indexOf('--knot') + 1]) : null;
if (!OUT || !baseDir || !knotDir) { console.error('usage: node tools/shot-bloom-umbel-hubs.mjs <out.png> --base <worktree of the BAND tree> --knot <worktree of the KNOT tree>'); process.exit(2); }
const BASE = await import(pathToFileURL(path.join(baseDir, 'bloom-geometry.js')).href);
const KNOT = await import(pathToFileURL(path.join(knotDir, 'bloom-geometry.js')).href);
const KNOT_DEFAULTS = (await import(pathToFileURL(path.join(knotDir, 'bloom-registry.js')).href)).DEFAULTS;
/* the BASE tree builds at ITS OWN registry defaults (the Hub defaults moved on Oct 27) */
const BASE_DEFAULTS = (await import(pathToFileURL(path.join(baseDir, 'bloom-registry.js')).href)).DEFAULTS;

/* THE GENTLE SWELLING (Oct 28, Eva's third ruling): three columns — `--base`
   the BAND tree (7c9d33d), `--knot` the KNOT tree (d08153e), this tree the
   SWELLING — and a last section with the head's own join at GOBLET 1.00 (the
   pre-Oct-27 default) beside CURVED 0.50 (the default RULED Oct 28). */
const CW = 360, CH = 360, CAP = 72, PAD = 10, LABELW = 400;
const COL = { knot: [214, 111, 154], stem: [150, 160, 150], floret: [226, 214, 190], hub: [110, 180, 170], petal: [226, 214, 190] };

function build(set, M) {
  const acc = new M.MeshBuilder({ exportMode: true });
  const m = M.buildBloomInto(acc, { ...(M === BASE ? BASE_DEFAULTS : M === KNOT ? KNOT_DEFAULTS : DEFAULTS), ...set });
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
const knotDims = (K) => { if (!K) return ''; const F = K.flare;
  if (K.swell !== undefined) return `SWELLING ${(2 * K.peakR).toFixed(2)} ACROSS (${(K.peakR / K.outerR).toFixed(2)}X THE ${(2 * K.outerR).toFixed(2)} ROD${K.widthForced ? ', FORCED' : ''}) OVER ${K.endMm.toFixed(2)} BELOW THE PLANE - ROOTS ${K.heldBy === 'deepen' ? `${K.deepenMm.toFixed(2)} DEEPER` : `TOP RAISED ${K.riseMm.toFixed(2)}`} - ${K.tris} TRIS`;
  const body = K.equatorZ !== undefined ? `KNOT ${(2 * K.radiusMm).toFixed(2)} ACROSS (A DOME ${(K.radiusMm / K.outerR).toFixed(2)}X THE ${(2 * K.outerR).toFixed(2)} ROD)` : `BAND ${(2 * K.halfHeightMm).toFixed(2)} TALL X ${(2 * K.radiusMm).toFixed(2)} ACROSS`;
  return `${body}${F && F.built ? ` - FLARE ${F.style} ${F.amount.toFixed(2)} ${F.swellMm.toFixed(2)} DEEP TO A ${(2 * (F.rodR + 0.5)).toFixed(2)} ROD${F.clamped ? ' (CLAMPED)' : ''}` : ' - NO FLARE'} - ${K.tris} TRIS`; };
/* a mophead's ray tip: the first ray's sub-boss, in the world */
const rayTip = (b) => { const IB = b.IB; if (!IB || !IB.sub || !IB.placed || !IB.placed.length) return null; const M = IB.placed[0].M, c = IB.sub.knot.centre; return [M[0] * c[0] + M[1] * c[1] + M[2] * c[2] + M[3], M[4] * c[0] + M[5] * c[1] + M[6] * c[2] + M[7], M[8] * c[0] + M[9] * c[1] + M[10] * c[2] + M[11]]; };

const rows = [];
/* the junction BEFORE (band) and AFTER (knot) — side-on, from below, the close-up */
for (const [tag, set] of [['THE SPIDER LILY: 6 FLORETS, HEAD OFF', LILY], ['THE MOPHEAD: 12 RAYS X 12 FLORETS AT THE FLOOR', MOP]]) {
  for (const view of ['side', 'below', 'close']) rows.push({ sec: 2, tag, set, view });
}
rows.push({ sec: 2, tag: 'A MOPHEAD RAY TIP ALONE, SIDE-ON (FLORETS AND RAY DROPPED)', set: MOP, view: 'close', profile: true });
/* the three styles at the ruled 0.50 on the same ray tip: GOBLET leaves the dome's equator
   tangentially, CURVED and ANGLED meet it with their own shoulder (the head's hub's own) */
/* the head's own hub-to-stem join: GOBLET 1.00 (the pre-Oct-27 join) beside CURVED 0.50, the default RULED Oct 28 */
const HEAD = { stemLength: 60 };
for (const view of ['side', 'below']) rows.push({ sec: 3, tag: 'A HEAD-ONLY BLOOM ON A 60 MM STEM: THE HUB-TO-STEM JOIN', set: HEAD, view, headJoin: true });
const ncol = 3;
const SW = ncol * (CW + PAD) + PAD + LABELW, SH = rows.length * (CH + CAP + PAD) + PAD;
const sheet = Buffer.alloc(SW * SH * 3, 18);
const report = [];
const cache = new Map();
const cached = (set, M) => { const k = JSON.stringify(set) + (M === BASE ? ':base' : M === KNOT ? ':knot' : ':head'); if (!cache.has(k)) cache.set(k, build(set, M)); return cache.get(k); };
rows.forEach((row, ri) => {
  const y = PAD + ri * (CH + CAP + PAD);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 8, row.headJoin ? 'THE HEAD JOIN DEFAULT' : 'BAND / KNOT / SWELLING', [240, 236, 228], 2);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 30, row.tag, [210, 210, 204], 1);
  text(sheet, SW, SH, PAD + ncol * (CW + PAD), y + 46, { above: 'FROM ABOVE', cut: 'CUTAWAY (NEAR HALF REMOVED)', lowside: 'LOW SIDE ANGLE', side: 'SIDE-ON', below: 'FROM BELOW', close: 'CLOSE-UP OF THE JUNCTION' }[row.view], [210, 210, 204], 1);
  const cells = row.headJoin
    ? [{ b: cached({ ...row.set, hubStyle: 'GOBLET', hubShapeAmount: 1 }, G), head: 'GOBLET 1.00' }, { b: cached({ ...row.set, hubStyle: 'CURVED', hubShapeAmount: 0.5 }, G), head: 'CURVED 0.50' }]
    : [{ b: cached(row.set, BASE), head: 'BAND' }, { b: cached(row.set, KNOT), head: 'KNOT' }, { b: cached(row.set, G), head: 'SWELLING' }];
  if (row.profile) row.rayView = null;
  const kTag = (K) => K && K.equatorZ !== undefined ? 'KNOT' : 'BAND';
  cells.forEach(({ b, head }, i) => {
    const x = PAD + i * (CW + PAD);
    let c, r, P = b.P;
    if (row.headJoin) { c = [0, 0, b.stem.rootZ - b.stem.axisDepth * 0.5]; r = b.hub.radius * 1.4; }
    else if (row.sec === 1) { c = [0, 0, b.stem.topZ]; r = b.hub.radius * (row.view === 'above' ? 1.3 : 0.9); if (row.view === 'cut') P = cutaway(P); }
    else { const K = b.IB.knot; const tip = row.set.umbelDepth === '2' && row.view === 'close' ? rayTip(b) : null; c = tip || K.centre; r = (tip ? b.IB.sub.knot.radiusMm : K.radiusMm) * (row.view === 'close' ? 2.2 : 4.5);
      /* the ray tip close-up draws ONE ray's sub-umbel alone (its own stream range), or its junction is buried in the neighbours' florets */
      if (tip) { const p0 = b.IB.placed[0]; P = b.P.slice(p0.at, p0.at + p0.tris * 9);
        /* the compare row: side-on in the ray's own plane, the florets on the near side of the
           band removed, framed on the band plus the flare below it, so the trumpet reads in profile */
        if (row.profile) { const M = p0.M, sub = b.IB.sub.knot, F = sub.flare; const ax = [M[2], M[6], M[10]];   // the ray's axis in the world (local +z)
          /* the florets are dropped — only the sub-boss (its own stream range) and the ray that feeds it
             are drawn, so the flare is not hidden behind the florets hanging off the band */
          const kr = sub.triRange, Q = [], cols = []; for (let t = 0; t < P.length / 9; t++) { if (t >= kr[0] && t < kr[1]) { for (let k = 0; k < 9; k++) Q.push(P[t * 9 + k]); cols.push(COL.knot); continue; } let ray = true; for (let k = 0; k < 9 && ray; k += 3) { const d = [P[t * 9 + k] - tip[0], P[t * 9 + k + 1] - tip[1], P[t * 9 + k + 2] - tip[2]]; const along = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]; const rad = Math.hypot(d[0] - along * ax[0], d[1] - along * ax[1], d[2] - along * ax[2]); if (!(along < -(sub.halfHeightMm ?? sub.liftMm) + 1e-6 && rad < sub.radiusMm)) ray = false; } if (ray) { for (let k = 0; k < 9; k++) Q.push(P[t * 9 + k]); cols.push(COL.stem); } }
          b = { ...b, colorOf: (t) => cols[t] };
          P = Float64Array.from(Q); const depth = (F ? F.swellMm : 0) + (sub.halfHeightMm ?? sub.radiusMm); c = [tip[0] - ax[0] * depth * 0.45, tip[1] - ax[1] * depth * 0.45, tip[2] - ax[2] * depth * 0.45]; r = Math.max(sub.radiusMm, depth) * 1.35; row.rayView = { dir: [0, -1, 0], up: ax, center: c, halfHeight: r }; } } }
    const img = render(P, CW, CH, row.rayView || VIEW[row.view === 'close' ? 'lowside' : row.view](c, r), { colorOf: b.colorOf, bg: [30, 30, 34] });
    blit(sheet, SW, SH, img, CW, CH, x, y);
    const K = row.sec === 1 || row.headJoin ? null : (row.set.umbelDepth === '2' && (row.view === 'close') ? b.IB.sub.knot : b.IB.knot);
    const dims = row.headJoin ? `JOIN ${b.stem.hubStyle} ${Number(b.stem.hubAmount).toFixed(2)}X, ${b.stem.axisDepth.toFixed(2)} DEEP ON THE AXIS, BLEND TO R ${b.stem.blendR.toFixed(2)} ON A ${(2 * b.stem.outerR).toFixed(2)} STEM, HUB R ${b.hub.radius.toFixed(2)}` : row.sec === 1 ? stemDims(b).label : knotDims(K);
    text(sheet, SW, SH, x, y + CH + 6, head + (head === 'BAND' ? ' - OCT 27 AM' : head === 'KNOT' ? ' - OCT 27 PM' : head === 'SWELLING' ? ' - OCT 28' : ''), [250, 250, 248], 2);
    text(sheet, SW, SH, x, y + CH + 24, dims.slice(0, 58), [210, 210, 204], 1);
    if (dims.length > 58) text(sheet, SW, SH, x, y + CH + 36, dims.slice(58, 116), [210, 210, 204], 1);
    text(sheet, SW, SH, x, y + CH + 52, `${b.tris} TRIS IN ALL`, [190, 200, 190], 2);
    report.push(`${(i === 0 ? row.tag : '').padEnd(58)} ${(i === 0 ? row.view : '').padEnd(8)} ${head.padEnd(11)} ${dims} | ${b.tris} tris`);
  });
});
writePng(OUT, SW, SH, sheet);
for (const l of report) console.log(l);
console.log(`wrote ${OUT} (${SW}x${SH})`);
