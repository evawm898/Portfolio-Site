#!/usr/bin/env node
/* ===================================================================
   shot-bloom-lobed-roundness.mjs — THE SHEET FOR THE SINUS ROUNDNESS, THE
   LOBE-COUNT YIELD AND THE LOBED TOOTH COUNT (leaf/stem build S4c;
   docs/bloom-leaf-lobed-roundness-outcome.md).

     node tools/shot-bloom-lobed-roundness.mjs <out.png> --base <worktree of 2e096bf>
         [--sample-head a.json,b.json --sample-base c.json,d.json]

   ROW 1 — THE MUM: the headline at the ruled defaults with the proposed
   roundness and tooth count (alternate 137.5 x 4 nodes, arched 25); one leaf
   FLAT, S4b's (rendered from a worktree of the BASE commit) against this
   tree's, ONE CAMERA fitted to both; the rulings and the two proposals.
   ROW 2 — THE SINUS: a macro on one sinus at roundness 0 (S4b's print
   minimum, by branch), at the proposed default and at the maximum, the SAME
   state and the SAME camera, the built radius and the opening in mm on each
   caption (each read off that build's own record); and the shrink binding.
   ROW 3 — THE SWEEP: one leaf at four roundnesses.
   ROW 4 — THE YIELD AND THE RESIDUAL: the lobe count giving (5 -> 3), and the
   residual state where no count fits (the V kept, told); a teeth-per-lobe
   macro; the opening distribution, S4b against now.
   ROW 5 — THE TOOTH COUNT: one leaf at 1, 2, 3 and 6 teeth a lobe.

   PRINT PREVIEW ON: every build is EXPORT mode with the builder's own normals.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC, so no pixel
   delta is quoted and none is owed. Every number is read off the build's own
   record, never restated; mm per pixel on every rendered cell.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const BASE = opt('--base');
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-lobed-roundness.mjs <out.png> --base <worktree> [--sample-head a,b --sample-base c,d]'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const BG = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 108, IH = CH - CAP;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const TEAL = [111, 183, 174], AMBER = [214, 161, 92], INK = [240, 236, 226], WHITE = [250, 248, 240];
const f2 = (x) => Number(x).toFixed(2), f3 = (x) => Number(x).toFixed(3);
const deg = (r) => ((r * 180) / Math.PI).toFixed(1);

const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };
const YIELD = { ...ONE, leafLength: 36, lobedLobes: 5, lobedFrom: 0.21, lobedTo: 0.55, lobedSinus: 0.84, lobedShape: 0.9, lobedAngle: 30, lobedEase: 0.79, lobedWidth: 26, leafTipShape: 1.05 };

function build(over, Gm = G, Rm = R) {
  const st = { ...Rm.DEFAULTS, ...over };
  const acc = new Gm.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = Gm.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, L: b.leaf, leaves: b.leavesBuilt || [] };
}
function leafOf(bl, i = 0) {
  let a = bl.b.leafTriRange[0];
  for (let j = 0; j < i; j++) a += bl.leaves[j].tris;
  const n = bl.leaves[i].tris;
  return { P: bl.acc.positions.slice(a * 9, (a + n) * 9), N: bl.acc.normals.slice(a * 9, (a + n) * 9) };
}
function fit(Ps, dir, up, pad = 1.08) {
  const f = nrm(dir.map((c) => -c));
  const r = nrm(crs(f, up)), u = nrm(crs(r, f));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, d0 = 0, n = 0;
  for (const P of Ps) for (let i = 0; i < P.length; i += 3) {
    const p = [P[i], P[i + 1], P[i + 2]];
    const x = dot(p, r), y = dot(p, u);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    d0 += dot(p, f); n++;
  }
  const center = add(add(add([0, 0, 0], r, (x0 + x1) / 2), u, (y0 + y1) / 2), f, d0 / n);
  return { dir, up, center, halfHeight: Math.max((y1 - y0) / 2, ((x1 - x0) / 2) * (IH / CW)) * pad };
}
function wrap(lines) {
  const o = [];
  for (const l of lines) {
    /* the bitmap font has letters, digits and ` -.:/%(),` only */
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'NO ').replace(/[’']/g, '').replace(/·/g, ',').replace(/°/g, ' DEG').replace(/[–—]/g, '-').replace(/x(?=\d| )/g, 'X').replace(/[<>=+]/g, ' ').toUpperCase();
    while (s.length > 48) { let k = s.lastIndexOf(' ', 48); if (k < 20) k = 48; o.push(s.slice(0, k)); s = '  ' + s.slice(k).trimStart(); }
    o.push(s);
  }
  return o;
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
function leafPlane(bl, i = 0) {
  const th = (bl.L.angleDeg * Math.PI) / 180, az = bl.L.azimuths.flat()[i];
  const Rr = [Math.cos(az), Math.sin(az), 0];
  return { D: [Rr[0] * Math.cos(th), Rr[1] * Math.cos(th), Math.sin(th)], N: [-Rr[0] * Math.sin(th), -Rr[1] * Math.sin(th), Math.cos(th)], T: [-Rr[1], Rr[0], 0] };
}
function textCell(title, blocks) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const all = [title, ''];
  for (const [h, body] of blocks) { all.push(h); all.push(...wrap([body]).map((x) => '  ' + x)); }
  wrap(all).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
/* the opening of each build's own rows, by THIS tree's measure */
function openings(rep, st) {
  const Lr = rep.lobed;
  return G.lobedSinusGaps(Lr.rowU, Lr.rowHalfLobeMm, Lr.rowTauRad, Lr.lengthMm || Number(st.leafLength), G.lobedChevronLaw({ ...st, lobedLobes: Lr.lobes }));
}
const radii = (rb) => rb.sinuses.map((s) => (s.built ? f2(s.radiusMm) : s.noFit ? 'NO FIT' : 'V')).join(' / ');
const flat = (over, Gm, Rm) => { const bl = build(over, Gm, Rm); return { bl, l: leafOf(bl), lp: leafPlane(bl), rep: bl.leaves[0] }; };
const cells = [];

/* ---- 1. THE MUM ---- */
{
  const bl = build(MUM), P = bl.acc.positions, N = bl.acc.normals;
  const cam = fit([P], [0.25, -1, 0.05], [0, 0, 1]);
  const rep = bl.leaves[0], S = rep.serration, rb = rep.lobed.roundBottoms;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE) AT THE RULED DEFAULTS', 'ALTERNATE 137.5 X 4 NODES, ARCH 25 - PRINT PREVIEW ON',
    `ROUNDNESS ${R.DEFAULTS.lobedRound} (PROPOSED): RADII ${radii(rb)} MM`,
    `${R.DEFAULTS.lobedToothCount} TEETH A LOBE (PROPOSED): ${S.countBuilt} OVER THE RIM, PER LOBE ${rep.lobed.teethPerLobe.join(' / ')}`,
    `${mmpx(cam)} MM/PX`]));
}
/* ---- 2/3. one leaf flat, S4b against now, one camera ---- */
{
  const o = flat(ONE, BG, BR), n = flat(ONE);
  const cam = fit([o.l.P, n.l.P], n.lp.N, n.lp.D);
  for (const [x, title] of [[o, 'S4B (THE BASE TREE, 2e096bf)'], [n, 'S4C (THIS TREE)']]) {
    const S = x.rep.serration, rb = x.rep.lobed.roundBottoms, Og = openings(x.rep, x.bl.st);
    cells.push(cell(x.l.P, x.l.N, cam, ['ONE MUM LEAF FLAT, ONE CAMERA: ' + title,
      `RADII ${radii(rb)} MM, NARROWEST OPENING ${f3(Og.minGapMm)} MM`,
      `${S.countBuilt} TEETH AT ${f2(S.reliefBuiltMm)} MM${x.rep.lobed.teethPerLobe ? `, PER LOBE ${x.rep.lobed.teethPerLobe.join(' / ')}` : ' (THE SHARED COUNT)'}`,
      `${x.rep.tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]));
  }
}
/* ---- 4. the rulings ---- */
{
  const D = R.DEFAULTS;
  cells.push(textCell('S4C: WHAT IS RULED, WHAT IS PROPOSED', [
    ['RULED (EVA, OCT 9): S4BS DEFAULTS', `SINUS ${D.lobedSinus}, SHAPE ${D.lobedShape}, ANGLE ${D.lobedAngle}, TOOTH DEPTH ${D.lobedToothDepth}`],
    [`PROPOSED: ROUNDNESS ${D.lobedRound}`, 'THE SINUS BOTTOM RADIUS AS A FRACTION OF THE LOBE PITCH, FLOORED AT THE PRINT MINIMUM: A BROAD U'],
    [`PROPOSED: ${D.lobedToothCount} TEETH A LOBE`, 'OVER THE BUILT LOBES, BOTH SIDES AND THE TERMINAL: (2N 1) LOBES'],
    ['RULED: ON NO FIT THE LOBE COUNT YIELDS', 'THE RADIUS SHRINKS FIRST, THE COUNT GIVES ONLY WHERE EVEN THE MINIMUM DOES NOT FIT'],
  ]));
}
/* ---- 5/6/7. the sinus macro: 0 / proposed / max, same state, same camera ---- */
{
  const vals = [0, R.DEFAULTS.lobedRound, 0.5];
  const xs = vals.map((v) => flat({ ...ONE, lobedRound: v }));
  const k = 1, rep = xs[1].rep, Og = openings(rep, xs[1].bl.st), at = Og.sinuses[k].at;
  const bb = rep.petioleAxis.bladeBase, lp = xs[1].lp;
  const cam = { dir: lp.N, up: lp.D, center: add(add(bb, lp.D, at[0]), lp.T, at[1]), halfHeight: 4.5 };
  vals.forEach((v, i) => {
    const x = xs[i], s = x.rep.lobed.roundBottoms.sinuses[k], O = openings(x.rep, x.bl.st).sinuses[k];
    cells.push(cell(x.l.P, x.l.N, cam, [`MACRO, SINUS ${k + 1}, ROUNDNESS ${v}${v === 0 ? ' (S4BS MINIMUM, BY BRANCH)' : v === R.DEFAULTS.lobedRound ? ' (PROPOSED)' : ' (MAX)'}`,
      v === 0 ? `PITCH ${f2(xs[1].rep.lobed.roundBottoms.sinuses[k].pitchMm)} MM, NO RADIUS ASKED: THE PRINT MINIMUM ${f3(s.radiusMm)} MM` : `PITCH ${f2(s.pitchMm)} MM, ASKED RADIUS ${f3(s.radiusAskedMm)}, BUILT ${f3(s.radiusMm)} MM${s.shrunk ? ' (SHRUNK, TOLD)' : ''}`,
      `THE OPENING ${f3(O.gapMm)} MM (ASKED V ${f3(s.openingAskedMm)})`, `${mmpx(cam)} MM/PX`]));
  });
}
/* ---- 8. the radius shrink binding ---- */
{
  const x = flat({ ...ONE, lobedRound: 0.5 }), rb = x.rep.lobed.roundBottoms;
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, ['THE RADIUS SHRINKS: ROUNDNESS 0.5 (TOLD)', `${rb.shrunk} OF ${rb.sinuses.length} SINUSES: ASKED TO BUILT`,
    ...rb.sinuses.map((s) => `U ${f2(s.bottomU)}: ${f2(s.radiusAskedMm)} TO ${f2(s.radiusMm)} MM (${f2(100 * s.roundBuilt)}% OF THE PITCH)`), `${mmpx(cam)} MM/PX`]));
}
/* ---- 9-12. the sweep ---- */
for (const v of [0.03, 0.08, 0.18, 0.3]) {
  const x = flat({ ...ONE, lobedRound: v }), rb = x.rep.lobed.roundBottoms;
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, [`THE SWEEP: ROUNDNESS ${v}`, `RADII ${radii(rb)} MM${rb.shrunk ? `, ${rb.shrunk} SHRUNK` : ''}`,
    `NARROWEST OPENING ${f3(openings(x.rep, x.bl.st).minGapMm)} MM`, `${mmpx(cam)} MM/PX`]));
}
/* ---- 13. the yield ---- */
{
  const x = flat(YIELD), Y = x.rep.lobed.lobeYield;
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, ['THE LOBE COUNT YIELDS (TOLD)', `${Y.asked} ASKED ON A 36 MM BLADE AT 30 DEG, ${Y.built} BUILT`,
    ...Y.attempts.map((a) => `${a.lobes} LOBES: ${a.noFit ? `${a.noFit} SINUSES FIT NO BOTTOM (${[...new Set(a.why)].join(', ')})` : 'EVERY SINUS FITS'}`),
    `RADII ${radii(x.rep.lobed.roundBottoms)} MM, ${mmpx(cam)} MM/PX`]));
}
/* ---- 14. the residual ---- */
{
  const RES = { ...ONE, leafLength: 24, lobedLobes: 3, lobedFrom: 0.37, lobedTo: 0.6, lobedSinus: 0.67, lobedShape: 0.75, lobedAngle: 58, lobedEase: 0.53, lobedWidth: 15.5, leafTipShape: 2.3 };
  const x = flat(RES), Y = x.rep.lobed.lobeYield, rb = x.rep.lobed.roundBottoms;
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, [`THE RESIDUAL: ${Y.residual ? 'NO COUNT FITS (THE V KEPT, TOLD)' : 'NOT A RESIDUAL (CHECK)'}`,
    `${Y.asked} LOBES ON A 24 MM BLADE, A ${f2((Number(RES.lobedTo) - Number(RES.lobedFrom)) * 24)} MM WINDOW, ${RES.lobedAngle} DEG`,
    ...Y.attempts.map((a) => `${a.lobes}: ${a.noFit} NO FIT`), `NARROWEST OPENING ${f3(openings(x.rep, x.bl.st).minGapMm)} MM, ${rb.noFit} TOLD`, `${mmpx(cam)} MM/PX`]));
}
/* ---- 15. teeth per lobe, macro ---- */
{
  const x = flat(ONE), rep = x.rep, S = rep.serration;
  const j = rep.lobed.rowU.findIndex((u) => u >= 0.32);
  const h = rep.lobed.rowHalfLobeMm[j], t = rep.lobed.rowTauRad[j], bb = rep.petioleAxis.bladeBase;
  const at = [rep.lobed.rowU[j] * 46 + 0.5 * h * Math.sin(t), 0.5 * h * Math.cos(t)];
  const cam = { dir: x.lp.N, up: x.lp.D, center: add(add(bb, x.lp.D, at[0]), x.lp.T, -at[1]), halfHeight: 9 };
  cells.push(cell(x.l.P, x.l.N, cam, ['TEETH PER LOBE: A MACRO ON ONE LOBE', `${rep.lobed.toothPerLobe} A LOBE ASKED: ${S.countAsked} OVER THE RIM, ${S.countBuilt} BUILT AT ${f2(S.reliefBuiltMm)} MM`,
    `PER LOBE, BASE TO TERMINAL: ${rep.lobed.teethPerLobe.join(' / ')} (EVEN ALONG THE RIM, SO A LOBE CARRIES ITS SHARE)`, `${mmpx(cam)} MM/PX`]));
}
/* ---- 16. the opening distribution, S4b against now ---- */
{
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const load = (s) => (s ? s.split(',').flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).rows) : null);
  const head = load(opt('--sample-head')), base = load(opt('--sample-base'));
  const lines = ['THE NARROWEST OPENING, 2000 UNIFORM STATES'];
  if (head && base) {
    const b = base.filter((r) => r.sinus && r.open !== null).map((r) => r.open), h = head.filter((r) => r.sinus && r.open !== null).map((r) => r.open);
    const bins = 12, top = 3, X0 = 20, W = CW - 40, Y0 = CH - 20, Hh = 180;
    const hist = (a) => { const n = new Array(bins).fill(0); for (const x of a) n[Math.min(bins - 1, Math.max(0, Math.floor((x / top) * bins)))]++; return n.map((c) => c / a.length); };
    const hb = hist(b), hh = hist(h), mx = Math.max(...hb, ...hh);
    for (let i = 0; i < bins; i++) {
      const x = X0 + (W * i) / bins, bw = W / bins / 2 - 1;
      for (const [v, dx, col] of [[hb[i], 0, AMBER], [hh[i], bw + 1, TEAL]]) {
        const hgt = Math.round((v / mx) * Hh);
        for (let yy = 0; yy < hgt; yy++) for (let xx = 0; xx < bw; xx++) { const o = ((Y0 - yy) * CW + Math.round(x + dx + xx)) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2]; }
      }
    }
    const x1 = X0 + W / top; for (let yy = Y0 - Hh; yy <= Y0; yy++) { const o = (yy * CW + Math.round(x1)) * 3; rgb[o] = WHITE[0]; rgb[o + 1] = WHITE[1]; rgb[o + 2] = WHITE[2]; }
    const u = (a) => ((100 * a.filter((x) => x < 1 - 1e-9).length) / a.length).toFixed(1);
    const res = head.filter((r) => r.residual).length, yl = head.filter((r) => r.lobesBuilt < r.lobesAsked && !r.residual).length;
    lines.push(`AMBER: S4B (BASE TREE) ${u(b)}% UNDER 1 MM`, `TEAL: S4C AT THE DEFAULTS ${u(h)}% UNDER 1 MM`,
      `S4C: ${yl} STATES YIELDED, ${res} RESIDUAL (TOLD)`, 'WHITE LINE: 1.00 MM. AXIS 0 TO 3 MM, 12 BINS');
  } else lines.push('(RUN WITH --sample-head AND --sample-base)');
  caption(rgb, lines);
  cells.push(rgb);
}
/* ---- 17-20. the tooth count sweep ---- */
for (const t of [1, 2, 3, 6]) {
  const x = flat({ ...ONE, lobedToothCount: t }), S = x.rep.serration;
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, [`TEETH A LOBE: ${t}`, `${S.countAsked} ASKED OVER THE RIM, ${S.countBuilt} BUILT${S.clampedBy ? ` (${String(S.clampedBy).toUpperCase()} CAP, TOLD)` : ''}`,
    `PER LOBE ${x.rep.lobed.teethPerLobe.join(' / ')}, RELIEF ${f2(S.reliefBuiltMm)} MM`, `${mmpx(cam)} MM/PX`]));
}
const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
