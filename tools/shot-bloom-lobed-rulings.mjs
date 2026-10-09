#!/usr/bin/env node
/* ===================================================================
   shot-bloom-lobed-rulings.mjs — THE SHEET FOR THE LOBED-LEAF RULINGS
   (leaf/stem build S4b; docs/bloom-leaf-lobed-rulings-outcome.md).

     node tools/shot-bloom-lobed-rulings.mjs <out.png> --base <worktree of ee91b94>
         [--sample-head a.json,b.json --sample-base c.json,d.json]

   ROW 1 — THE MUM: the headline at the proposed defaults (alternate 137.5
   x 4 nodes, arched 25); one leaf FLAT at S4's defaults and at the proposed
   ones, ONE CAMERA (fitted to both); the proposed defaults against S4's.
   ROW 2 — THE SINUS: a macro on the narrowest sinus, S4's V (rendered from a
   worktree of the BASE commit) against this tree's U at the SAME state and
   the SAME camera, the S4b OPENING in mm on each caption (measured by this
   tree's own `lobedSinusGaps` on each build's own rows); the round bottom
   binding at sinus 0.9 (told); the NO ROUND BOTTOM FITS case (told).
   ROW 3 — THE PETIOLE AND THE TEETH: the lobed petiole's join on the 6 mm
   stem, the petiole CLAMPED on a 3 mm stem at 90 deg, a macro on one lobe's
   teeth at the proposed defaults, and the sinus-gap distribution, S4's
   measure on the base tree against the S4b opening as built (from the
   committed sampler, `tools/bloom-lobed-sinus-sample.mjs`).

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
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-lobed-rulings.mjs <out.png> --base <worktree> [--sample-head a,b --sample-base c,d]'); process.exit(2); }
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

const S4_FORM = { lobedSinus: 0.62, lobedShape: 0.7, lobedAngle: 38, lobedToothDepth: 0.08 };
const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };

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
/* the S4b OPENING of each build's own rows, by THIS tree's measure (the base
   tree reports only S4's arc measure) */
function openings(rep, st) {
  const Lr = rep.lobed;
  return G.lobedSinusGaps(Lr.rowU, Lr.rowHalfLobeMm, Lr.rowTauRad, rep.lobed.lengthMm || Number(st.leafLength), G.lobedChevronLaw(st));
}
const cells = [];
/* ---- 1. THE MUM, whole, at the proposed defaults ---- */
{
  const bl = build(MUM), P = bl.acc.positions, N = bl.acc.normals;
  const cam = fit([P], [0.25, -1, 0.05], [0, 0, 1]);
  const rep = bl.leaves[0], S = rep.serration, rb = rep.lobed.roundBottoms, pt = bl.L.lobedPetiole;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE), THE PROPOSED DEFAULTS', 'ALTERNATE 137.5 X 4 NODES, ARCH 25 - PRINT PREVIEW ON',
    `${R.DEFAULTS.lobedLobes} LOBES A SIDE, SINUS ${R.DEFAULTS.lobedSinus}, SHAPE ${R.DEFAULTS.lobedShape}, TILT ${deg(rep.lobed.tiltBuiltRad)}`,
    `${rb.built} OF ${rb.sinuses.length} SINUSES ROUNDED, ${S.countBuilt} TEETH AT ${f2(S.reliefBuiltMm)} MM`,
    `PETIOLE ${f2(2 * pt.radiusMm)} MM ACROSS, ${mmpx(cam)} MM/PX`]));
}
/* ---- 2/3. one leaf flat, S4's defaults (base tree) and the proposed (this tree), ONE camera ---- */
{
  const old = build({ ...ONE }, BG, BR), now = build({ ...ONE });
  const lo = leafOf(old), ln = leafOf(now), lp = leafPlane(now);
  const cam = fit([lo.P, ln.P], lp.N, lp.D);
  for (const [bl, l, title] of [[old, lo, "S4'S DEFAULTS (THE BASE TREE, ee91b94)"], [now, ln, 'THE PROPOSED MUM DEFAULTS (THIS TREE)']]) {
    const rep = bl.leaves[0], S = rep.serration, Og = openings(rep, bl.st);
    cells.push(cell(l.P, l.N, cam, ['ONE LEAF FLAT, ONE CAMERA: ' + title,
      `SINUS ${bl.st.lobedSinus}, SHAPE ${bl.st.lobedShape}, ANGLE ${bl.st.lobedAngle}, TOOTH DEPTH ${bl.st.lobedToothDepth}`,
      `NARROWEST OPENING ${f3(Og.minGapMm)} MM, ${S.countBuilt} TEETH AT ${f2(S.reliefBuiltMm)} MM`,
      `PETIOLE ${f2(2 * bl.L.petioleR)} MM ACROSS, ${rep.tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]));
  }
}
/* ---- 4. the defaults against S4's ---- */
{
  const D = R.DEFAULTS, B = BR.DEFAULTS;
  const row = (id, why) => [`${id}: ${B[id]} TO ${D[id]}`, why];
  cells.push(textCell('THE PROPOSED LOBED DEFAULTS (EVAS TO RULE)', [
    row('lobedSinus', 'SHALLOWER, SO THE LOBES READ BROAD'), row('lobedShape', 'ROUNDER CRESTS'),
    row('lobedAngle', 'LESS FORWARD SWEEP'), row('lobedToothDepth', 'TEETH THAT SHOW, FLOORED AT 1 MM'),
    [`KEPT: LOBES ${D.lobedLobes}, WIDTH ${D.lobedWidth}`, `FROM ${D.lobedFrom} TO ${D.lobedTo}, EASE ${D.lobedEase}; TIP SHARED (${D.leafTipShape})`]]));
}
/* ---- 5/6. MACRO: the narrowest sinus, S4's V against the U, same state and camera ---- */
{
  const old = build({ ...ONE, ...S4_FORM }, BG, BR), now = build({ ...ONE, ...S4_FORM });
  const repN = now.leaves[0], On = openings(repN, now.st), Ob = openings(old.leaves[0], old.st);
  const k = Ob.sinuses.map((s, i) => [s.gapMm, i]).filter(([g]) => g !== null).sort((a, b) => a[0] - b[0])[0][1];
  const lp = leafPlane(now), bb = repN.petioleAxis.bladeBase, at = On.sinuses[k].at;
  const cam = { dir: lp.N, up: lp.D, center: add(add(bb, lp.D, at[0]), lp.T, at[1]), halfHeight: 4.0 };
  const lo = leafOf(old), ln = leafOf(now), rb = repN.lobed.roundBottoms.sinuses[k];
  cells.push(cell(lo.P, lo.N, cam, ["MACRO, S4'S V (BASE TREE), S4'S OWN FORM", `SINUS ${k + 1} AT U ${f3(Ob.sinuses[k].rowU)}: THE OPENING ${f3(Ob.sinuses[k].gapMm)} MM`,
    `(S4S OWN ARC MEASURE READ ${f3(Ob.sinuses[k].arcGapMm)})`, 'A SLIT AT ITS BOTTOM, UNDER THE 1.00 MM FLOOR', `${mmpx(cam)} MM/PX`]));
  cells.push(cell(ln.P, ln.N, cam, ['MACRO, THE ROUND BOTTOM (THIS TREE), SAME STATE', `SINUS ${k + 1}: THE OPENING ${f3(On.sinuses[k].gapMm)} MM (ASKED V ${f3(rb.openingAskedMm)})`,
    `DISC RADIUS ${f3(rb.radiusMm)} MM, ${f2(rb.takenMm)} MM OF FLANK TAKEN, THE DEPTH ${f2(rb.depthHalfMm)} MM UNTOUCHED`,
    `(S4S ARC MEASURE NOW READS ${f3(On.sinuses[k].arcGapMm)}: CAPPED AT 1 BY CONSTRUCTION)`, `${mmpx(cam)} MM/PX`]));
}
/* ---- 7. the round bottom binding at sinus 0.9 (told) ---- */
{
  const bl = build({ ...ONE, lobedSinus: 0.9 }), lo = leafOf(bl), lp = leafPlane(bl), rep = bl.leaves[0], rb = rep.lobed.roundBottoms;
  const cam = fit([lo.P], lp.N, lp.D);
  cells.push(cell(lo.P, lo.N, cam, ['THE ROUND BOTTOM BINDING: SINUS 0.9 (TOLD)', `${rb.built} OF ${rb.sinuses.length} SINUSES WIDENED PAST THE ASKED V:`,
    ...rb.sinuses.filter((s) => s.built).map((s) => `U ${f2(s.bottomU)}: ${f3(s.openingAskedMm)} TO ${f3(s.openingBuiltMm)} MM, R ${f2(s.radiusMm)}`), `${mmpx(cam)} MM/PX`]));
}
/* ---- 8. NO ROUND BOTTOM FITS (told) ---- */
{
  const NF = { ...ONE, leafLength: 36, lobedLobes: 5, lobedFrom: 0.21, lobedTo: 0.55, lobedSinus: 0.84, lobedShape: 0.9, lobedAngle: 40, lobedEase: 0.79, lobedWidth: 26, leafTipShape: 1.05 };
  const bl = build(NF), lo = leafOf(bl), lp = leafPlane(bl), rep = bl.leaves[0], rb = rep.lobed.roundBottoms;
  const cam = fit([lo.P], lp.N, lp.D);
  cells.push(cell(lo.P, lo.N, cam, ['NO ROUND BOTTOM FITS (TOLD, THE V KEPT)', '5 LOBES ON A 36 MM BLADE AT 40 DEG, SINUS 0.84',
    `${rb.noFit} OF ${rb.needed} NEEDED SINUSES: ${[...new Set(rb.sinuses.filter((s) => s.noFit).map((s) => s.noFitWhy))].join(', ')} - THE WALL WOULD FOLD THE ROWS`,
    `NARROWEST OPENING ${f3(rep.lobed.sinusGaps.minGapMm)} MM, ${mmpx(cam)} MM/PX`]));
}
/* ---- 9/10. the petiole join: 6 mm stem, and clamped on 3 mm at 90 ---- */
for (const [over, title] of [[{}, 'THE LOBED PETIOLE JOIN ON THE 6 MM STEM'], [{ stemDiameter: 3, leafAngle: 90, lobedSinus: 0 }, 'THE PETIOLE CLAMPED: 3 MM STEM, 90 DEG, NO SINUS']]) {
  const bl = build({ ...ONE, ...over }), P = bl.acc.positions, N = bl.acc.normals, pt = bl.L.lobedPetiole;
  const rep = bl.leaves[0], o = rep.petioleAxis.outer, root = rep.petioleAxis.inner;
  const c = [(o[0] + root[0]) / 2, (o[1] + root[1]) / 2, (o[2] + root[2]) / 2];
  const cam = { dir: [0.3, -1, 0.35], up: [0, 0, 1], center: c, halfHeight: 7 };
  cells.push(cell(P, N, cam, [title, `BLADE ${f2(pt.areaMm2)} MM2 AGAINST THE SIMPLE DEFAULT ${f2(pt.refAreaMm2)}: RATIO ${f3(pt.ratio)}`,
    `ASKS ${f3(2 * pt.askedMm)} MM ACROSS, THE ROOT FITS ${f3(2 * pt.capMm)}: BUILT ${f3(2 * pt.radiusMm)}${pt.clamped ? ' (CLAMPED, TOLD)' : ''}`,
    `THE WIRE ${f2(2 * pt.wireR)} MM, ${mmpx(cam)} MM/PX`]));
}
/* ---- 11. the teeth at the proposed defaults: a macro on one lobe ---- */
{
  const bl = build(ONE), lo = leafOf(bl), lp = leafPlane(bl), rep = bl.leaves[0], S = rep.serration;
  const j = rep.lobed.rowU.findIndex((u) => u >= 0.32);
  const h = rep.lobed.rowHalfLobeMm[j], t = rep.lobed.rowTauRad[j], bb = rep.petioleAxis.bladeBase;
  /* framed on the LOBE: its crest row, half the margin's own distance out */
  const at = [rep.lobed.rowU[j] * 46 + 0.5 * h * Math.sin(t), 0.5 * h * Math.cos(t)];
  const cam = { dir: lp.N, up: lp.D, center: add(add(bb, lp.D, at[0]), lp.T, -at[1]), halfHeight: 9 };
  cells.push(cell(lo.P, lo.N, cam, ['THE TEETH AT THE PROPOSED DEFAULTS: ONE LOBE', `${S.countBuilt} TEETH OVER THE WHOLE RIM AT ${f2(S.reliefBuiltMm)} MM (FLOOR 1.00, FOLD CAP ${f2(S.foldCapMm)})`,
    'THE COUNT IS SHARED WITH SIMPLE, SO A LOBE CARRIES ABOUT ONE TOOTH', `${mmpx(cam)} MM/PX`]));
}
/* ---- 12. the sinus-gap distribution, S4 against now ---- */
{
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const load = (s) => (s ? s.split(',').flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).rows) : null);
  const head = load(opt('--sample-head')), base = load(opt('--sample-base'));
  const lines = ['THE SINUS-GAP DISTRIBUTION, 2000 UNIFORM STATES'];
  if (head && base) {
    const b = base.filter((r) => r.sinus).map((r) => r.arc), h = head.filter((r) => r.sinus).map((r) => r.open);
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
    const u = (a, t) => ((100 * a.filter((x) => x < t).length) / a.length).toFixed(1);
    lines.push(`AMBER: S4 (BASE TREE, ITS ARC MEASURE) ${u(b, 1)}% UNDER 1 MM`, `TEAL: S4B OPENING AS BUILT ${u(h, 1 - 1e-9)}% UNDER 1 MM`,
      'EVERY STATE STILL UNDER 1 MM CARRIES A TOLD NO FIT', 'WHITE LINE: 1.00 MM. AXIS 0 TO 3 MM, 12 BINS');
  } else lines.push('(RUN WITH --sample-head AND --sample-base)');
  caption(rgb, lines);
  cells.push(rgb);
}
const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
