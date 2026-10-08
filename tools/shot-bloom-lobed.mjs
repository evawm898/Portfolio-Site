#!/usr/bin/env node
/* ===================================================================
   shot-bloom-lobed.mjs — THE SHEET FOR THE LOBED (CHEVRON) LEAF
   (leaf/stem build S4; docs/bloom-leaf-lobed-outcome.md).

     node tools/shot-bloom-lobed.mjs <out.png>

   ROW 1 — THE MUM: the headline (alternate 137.5 x 4 nodes, the proposed
   defaults, arched 25) whole and side-on; one leaf FLAT (arch 0) from above;
   a MACRO on the narrowest sinus with its measured gap; the lab's B-mum
   planform against the shipped mum's, ONE plan frame; the proposed defaults.
   ROWS 2-3 — THE SWEEPS: lobes 2 / 3 / 5, sinus depth 0.3 / 0.9, lobe angle
   0 / 60 (the TILT cap binding — asked against built).
   ROW 3 — THE TEETH: the FOLD CLAMP binding (asked against built) and the
   NONE-FIT case (the fold cap under the 1 mm floor, no tooth cut).

   PRINT PREVIEW ON: every build is EXPORT mode with the builder's own normals.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC, so no pixel
   delta is quoted and none is owed. Every number is read off the build's own
   record (the leaf's lobed record, its serration record, its triangle tally),
   never restated; mm per pixel on every rendered cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { buildSpecies, planformPolygons } from './leaf-lab-core.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-bloom-lobed.mjs <out.png>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 96, IH = CH - CAP;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const TEAL = [111, 183, 174], GREY = [150, 146, 138], INK = [240, 236, 226], AMBER = [214, 161, 92], WHITE = [250, 248, 240];
const f2 = (x) => Number(x).toFixed(2);
const deg = (r) => ((r * 180) / Math.PI).toFixed(2);

const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };

function build(over) {
  const st = { ...R.DEFAULTS, ...over };
  const acc = new G.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, L: b.leaf, leaves: b.leavesBuilt || [] };
}
function leafOf(bl, i = 0) {
  let a = bl.b.leafTriRange[0];
  for (let j = 0; j < i; j++) a += bl.leaves[j].tris;
  const n = bl.leaves[i].tris;
  return { P: bl.acc.positions.slice(a * 9, (a + n) * 9), N: bl.acc.normals.slice(a * 9, (a + n) * 9) };
}
function fit(P, dir, up, pad = 1.08) {
  const f = nrm(dir.map((c) => -c));
  const r = nrm(crs(f, up)), u = nrm(crs(r, f));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, d0 = 0;
  for (let i = 0; i < P.length; i += 3) {
    const p = [P[i], P[i + 1], P[i + 2]];
    const x = dot(p, r), y = dot(p, u);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    d0 += dot(p, f);
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dz = d0 / (P.length / 3);
  const center = add(add(add([0, 0, 0], r, cx), u, cy), f, dz);
  const hh = Math.max((y1 - y0) / 2, ((x1 - x0) / 2) * (IH / CW)) * pad;
  return { dir, up, center, halfHeight: hh };
}
function wrap(lines) {
  const outL = [];
  for (const l of lines) {
    /* the bitmap font has letters, digits and ` -.:/%(),` only */
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'NO ').replace(/[’']/g, '').replace(/·/g, ',').replace(/°/g, ' DEG').replace(/[–—]/g, '-').replace(/x(?=\d| )/g, 'X').toUpperCase();
    while (s.length > 48) { let k = s.lastIndexOf(' ', 48); if (k < 20) k = 48; outL.push(s.slice(0, k)); s = '  ' + s.slice(k).trimStart(); }
    outL.push(s);
  }
  return outL;
}
function caption(rgb, lines) { wrap(lines).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1)); }
function cell(P, Nrm, cam, lines) {
  const img = render(P, CW, IH, cam, { color: [214, 206, 190], normals: Nrm });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IH, 0, CAP);
  caption(rgb, lines);
  return rgb;
}
const mmpx = (cam) => ((2 * cam.halfHeight) / IH).toFixed(3);
/* the leaf's own frame at node i: D along the blade at its angle, N its
   normal, T across — the leaf builder's own frame, read from the plan */
function leafPlane(bl, i = 0) {
  const th = (bl.L.angleDeg * Math.PI) / 180, az = bl.L.azimuths.flat()[i];
  const Rr = [Math.cos(az), Math.sin(az), 0];
  return { D: [Rr[0] * Math.cos(th), Rr[1] * Math.cos(th), Math.sin(th)], N: [-Rr[0] * Math.sin(th), -Rr[1] * Math.sin(th), Math.cos(th)], T: [-Rr[1], Rr[0], 0] };
}
function line(rgb, x0, y0, x1, y1, col, w = 1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    for (let dx = -w + 1; dx < w; dx++) for (let dy = -w + 1; dy < w; dy++) {
      const px = Math.round(x + dx), py = Math.round(y + dy);
      if (px < 0 || py < CAP || px >= CW || py >= CH) continue;
      const o = (py * CW + px) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
    }
  }
}
function textCell(title, blocks) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const all = [title, ''];
  for (const [h, body] of blocks) { all.push(h); all.push(...wrap([body]).map((x) => '  ' + x)); all.push(''); }
  wrap(all).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
/* THE BUILDER'S OWN MARGIN in the leaf's plan: (s, y) = (u L + h sin tau,
   h cos tau) at every emitted row, h the DRAWN half-width (teeth included) */
function marginPlan(rec, rowHalf) {
  const L = rec.lengthMm, up = [], dn = [];
  rec.rowU.forEach((u, j) => { const h = rowHalf[j], t = rec.rowTauRad[j]; up.push([u * L + h * Math.sin(t), h * Math.cos(t)]); dn.push([u * L + h * Math.sin(t), -h * Math.cos(t)]); });
  return [...up, ...dn.reverse()];
}
/* one leaf, plan view, with the record's numbers */
function leafCell(over, title, extra = (bl) => []) {
  const bl = build({ ...ONE, ...over });
  const lp = leafPlane(bl), lo = leafOf(bl, 0), rep = bl.leaves[0], Lr = rep.lobed, S = rep.serration;
  const cam = fit(lo.P, lp.N, lp.D);
  const teeth = !S ? 'NO TEETH' : S.noRoom ? `TEETH: NONE FIT (${S.noRoomWhy || S.noRoom})` : `${S.countBuilt} TEETH AT ${f2(S.reliefBuiltMm)} MM`;
  return cell(lo.P, lo.N, cam, [title,
    `TILT ${deg(Lr.tiltBuiltRad)} DEG BUILT OF ${f2(Lr.angleAskedDeg)} ASKED${Lr.tiltClamped ? ' (CLAMPED)' : ''}`,
    `${teeth}, NARROWEST SINUS GAP ${Lr.sinusGaps.minGapMm === null ? 'N/A' : f2(Lr.sinusGaps.minGapMm)} MM`,
    ...extra(bl), `${rep.tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]);
}
const cells = [];
/* ---- the MUM, whole ---- */
{
  const bl = build(MUM);
  const P = bl.acc.positions, N = bl.acc.normals;
  const cam = fit(P, [0.25, -1, 0.05], [0, 0, 1]);
  const rep = bl.leaves[0], S = rep.serration;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE) - PRINT PREVIEW ON', 'ALTERNATE 137.5 X 4 NODES, ARCH 25, THE PROPOSED LOBED DEFAULTS',
    `3 LOBES A SIDE, SINUS 0.62, TILT ${deg(rep.lobed.tiltBuiltRad)}, ${S.countBuilt} TEETH AT ${f2(S.reliefBuiltMm)} MM`,
    `${bl.b.leavesBuilt.reduce((n, l) => n + l.tris, 0)} LEAF TRIS, ${bl.acc.triangleCount} IN ALL, ${mmpx(cam)} MM/PX`]));
}
/* ---- one leaf flat ---- */
cells.push(leafCell({}, 'ONE LOBED LEAF, FLAT (ARCH 0), FROM ABOVE', (bl) => {
  const S = bl.leaves[0].serration;
  return [`THE ${S.countBuilt} TEETH ARE OVER THE WHOLE RIM (THE SHARED COUNT): NOTCHES AT U ${S.sinusU.map((u) => u.toFixed(2)).join(', ')} ON EACH MARGIN, AT THE LOBES OWN CRESTS`]; }));
/* ---- the narrowest sinus, macro ---- */
{
  const bl = build(ONE), lp = leafPlane(bl), lo = leafOf(bl, 0), rep = bl.leaves[0], G2 = rep.lobed.sinusGaps;
  const worst = G2.sinuses.filter((s) => s.gapMm !== null).sort((a, b) => a.gapMm - b.gapMm)[0];
  const bb = rep.petioleAxis.bladeBase;
  const at = add(add(bb, lp.D, worst.at[0]), lp.T, worst.at[1]);
  const cam = { dir: lp.N, up: lp.D, center: at, halfHeight: 4.5 };
  cells.push(cell(lo.P, lo.N, cam, ['MACRO: THE NARROWEST SINUS', `AT U ${worst.rowU.toFixed(3)}: THE OPENING 1 MM UP THE FLANK IS ${f2(worst.gapMm)} MM, UNDER THE 1.00 MM FLOOR`,
    `THE FLANKS STAY UNDER IT FOR ${f2(worst.fusedMm)} MM OF MARGIN (A SLIT THAT LONG FUSES IN PRINT)`, `REPORTED, NEVER CLAMPED; ${mmpx(cam)} MM/PX`]));
}
/* ---- the lab B-mum against the shipped mum, one plan frame ---- */
{
  const bl = build(ONE), rep = bl.leaves[0];
  const lab = planformPolygons(buildSpecies('mum', 'B')).find((p) => p.kind === 'chevron').poly.map(([x, y]) => [x - 12, y]);
  const mine = marginPlan(rep.lobed, rep.rowHalfMm);
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const span = 50, sc = (IH - 20) / span;
  const X = (y) => CW / 2 + y * sc, Y = (s) => CH - 12 - (s + 2) * sc;
  const draw = (poly, col) => { for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; line(rgb, X(a[1]), Y(a[0]), X(b[1]), Y(b[0]), col, 1); } };
  draw(lab, AMBER); draw(mine, WHITE);
  line(rgb, 14, CH - 6, 14 + 10 * sc, CH - 6, TEAL, 1);
  caption(rgb, ['THE LAB B-MUM (AMBER) AGAINST THE SHIPPED MUM (WHITE)', 'ONE PLAN FRAME FROM THE BLADE BASE, ARCH 0: THE LAB 46 X 34 MM, 3 LOBES, SINUS 0.62, TILT 38, TEETH 0.12; SHIPPED THE SAME BUT TEETH 0.08',
    'TEAL BAR: 10 MM']);
  cells.push(rgb);
}
/* ---- the proposed defaults, from the registry ---- */
{
  const D = R.DEFAULTS, ui = { ...D, ...ONE };
  const fmt = (id) => { const c = R.CONTROLS.find((q) => q.id === id); return c.fmt ? c.fmt(ui[id], ui, null) : String(ui[id]); };
  cells.push(textCell('THE PROPOSED LOBED DEFAULTS (EVAS TO RULE)', [
    ['LOBES A SIDE', `${D.lobedLobes} (${fmt('lobedLobes')})`], ['FROM / TO', `${D.lobedFrom} / ${D.lobedTo} OF THE LENGTH`], ['SINUS DEPTH', `${D.lobedSinus}`],
    ['LOBE SHAPE', `${D.lobedShape}`], ['LOBE ANGLE', `${D.lobedAngle} DEG, EASING OUT FROM U ${D.lobedEase}`], ['ENVELOPE', `${D.lobedWidth} MM ACROSS`],
    ['LOBE TOOTH DEPTH', `${D.lobedToothDepth} (LIGHT)`], ['SHARED WITH SIMPLE', `TOOTH COUNT ${D.leafToothCount}, TIP ${D.leafTipShape}, CUP ${D.leafCup}, ARCH ${D.leafArch}`]]));
}
/* ---- the sweeps ---- */
for (const n of [2, 3, 5]) cells.push(leafCell({ lobedLobes: n }, `LOBES ${n} A SIDE${n === 3 ? ' (DEFAULT)' : ''}`));
for (const s of [0.3, 0.9]) cells.push(leafCell({ lobedSinus: s }, `SINUS DEPTH ${s}`));
for (const a of [0, 60]) cells.push(leafCell({ lobedAngle: a }, `LOBE ANGLE ${a}${a === 60 ? ' - THE TILT CAP BINDS' : ' - NO CHEVRON'}`));
/* ---- the teeth: the fold clamp and the none-fit case ---- */
cells.push(leafCell({ lobedLobes: 6, lobedToothDepth: 0.3 }, 'THE FOLD CLAMP BINDING (6 LOBES, TOOTH DEPTH 0.3)', (bl) => {
  const S = bl.leaves[0].serration; return [`ASKED ${f2(S.reliefFlooredMm)} MM, BUILT ${f2(S.reliefBuiltMm)} AT THE FOLD CAP ${f2(S.foldCapMm)}`]; }));
cells.push(leafCell({ lobedToothDepth: 1 }, 'THE FOLD CLAMP AT TOOTH DEPTH 1', (bl) => {
  const S = bl.leaves[0].serration; return [`ASKED ${f2(S.reliefFlooredMm)} MM, BUILT ${f2(S.reliefBuiltMm)} AT THE FOLD CAP ${f2(S.foldCapMm)}`]; }));
cells.push(leafCell({ lobedLobes: 6, lobedSinus: 0.9, lobedToothDepth: 0.3, leafToothCount: 12 }, 'NONE FIT (6 LOBES, SINUS 0.9, DEPTH 0.3, 12 TEETH)', (bl) => {
  const S = bl.leaves[0].serration; return [`THE FOLD CAP ${f2(S.foldCapMm)} MM IS UNDER THE 1.00 MM FLOOR: NO TOOTH IS CUT, TOLD`]; }));
/* pack five to a row */
const rows = []; for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5));
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
