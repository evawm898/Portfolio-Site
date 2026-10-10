#!/usr/bin/env node
/* ===================================================================
   shot-bloom-lobed-follow-up.mjs — THE SHEET FOR EVA'S RULINGS ON S4c
   (docs/bloom-leaf-lobed-roundness-outcome.md §15).

     node tools/shot-bloom-lobed-follow-up.mjs <out.png> --base <worktree of f9ebcaf>

   ROW 1 — THE MUM at the ruled defaults (roundness 0.12, 4 teeth a lobe ON
   AVERAGE, 130 rows); one leaf FLAT, the base tree's (112 rows, 3 a lobe)
   against this tree's on ONE camera; the rulings.
   ROW 2 — THE TEETH: the whole leaf with every built tooth crest MARKED (each
   mark placed from the builder's own crest stations and checked against the
   nearest emitted vertex — the caption prints the worst miss), two macros
   (the basal lobe, the terminal), the rows-cap figures.
   ROW 3 — THE SINUS JOIN, BEFORE AND AFTER: one sinus on both trees on ONE
   camera, then a close-up of the back join on each. The TURN at every join
   is measured on that tree's own outline law (one-sided tangents 1e-6 of
   the blade apart), never restated.
   ROW 4 — THE DEAD TRAVEL: the roundness control from the real page at 0.12
   (the hatch from the leaf's saturation up) and at 0.18 (the read-out says
   SATURATED), print preview ON; a shoulder the law cannot fillet, told; the
   saturation figures.

   PRINT PREVIEW ON: every rendered build is EXPORT mode with the builder's
   own normals, and the page screenshots are taken with #printPreview
   checked. RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC, so no
   pixel delta is quoted and none is owed. The control screenshots are a
   picture of the page's chrome, not a measurement.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const BASE = opt('--base');
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-lobed-follow-up.mjs <out.png> --base <worktree>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const BG = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 108, IH = CH - CAP;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const TEAL = [111, 183, 174], AMBER = [214, 161, 92], INK = [240, 236, 226];
const f2 = (x) => Number(x).toFixed(2), f3 = (x) => Number(x).toFixed(3);

const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };
/* block 58's told corner: the shoulder law cannot fillet the back shoulder of one sinus */
const CORNER = { stemLength: 120, stemDiameter: 6, leafType: 'LOBED', leafNodes: 1, leafLength: 58, lobedLobes: 5, lobedFrom: 0.27, lobedTo: 0.57, lobedSinus: 0.63, lobedShape: 1.5, lobedAngle: 39, lobedEase: 0.77, lobedWidth: 17, lobedToothDepth: 0.27, leafTipShape: 0.7 };

function build(over, Gm = G, Rm = R) {
  const st = { ...Rm.DEFAULTS, ...over };
  const acc = new Gm.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = Gm.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, L: b.leaf, leaves: b.leavesBuilt || [], Gm };
}
function leafOf(bl, i = 0) {
  let a = bl.b.leafTriRange[0];
  for (let j = 0; j < i; j++) a += bl.leaves[j].tris;
  const n = bl.leaves[i].tris;
  return { P: bl.acc.positions.slice(a * 9, (a + n) * 9), N: bl.acc.normals.slice(a * 9, (a + n) * 9) };
}
function camBasis(cam) {
  const f = nrm(cam.dir.map((c) => -c)), r = nrm(crs(f, cam.up)), u = nrm(crs(r, f));
  return { f, r, u };
}
function fit(Ps, dir, up, pad = 1.08) {
  const { f, r, u } = camBasis({ dir, up });
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
/* the soft renderer's own orthographic projection, in image pixels */
function project(cam, p) {
  const { r, u } = camBasis(cam), d = sub(p, cam.center), s = (IH / 2) / cam.halfHeight;
  return [CW / 2 + dot(d, r) * s, IH / 2 - dot(d, u) * s];
}
function wrap(lines) {
  const o = [];
  for (const l of lines) {
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'NO ').replace(/[’']/g, '').replace(/·/g, ',').replace(/°/g, ' DEG').replace(/[–—]/g, '-').replace(/x(?=\d| )/g, 'X').replace(/[<>=+]/g, ' ').toUpperCase();
    while (s.length > 48) { let k = s.lastIndexOf(' ', 48); if (k < 20) k = 48; o.push(s.slice(0, k)); s = '  ' + s.slice(k).trimStart(); }
    o.push(s);
  }
  return o;
}
function caption(rgb, lines) { wrap(lines).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1)); }
function mark(rgb, xy, col, rad = 3) {
  const [cx, cy] = [Math.round(xy[0]), Math.round(xy[1] + CAP)];
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > rad * rad || d2 < (rad - 1.5) * (rad - 1.5)) continue;
    const x = cx + dx, y = cy + dy; if (x < 0 || x >= CW || y < CAP || y >= CH) continue;
    const o = (y * CW + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
  }
}
function cell(P, Nrm, cam, lines, marks = []) {
  const img = render(P, CW, IH, cam, { color: [214, 206, 190], normals: Nrm });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IH, 0, CAP);
  for (const [p, col] of marks) mark(rgb, project(cam, p), col);
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
const flat = (over, Gm = G, Rm = R) => { const bl = build(over, Gm, Rm); return { bl, l: leafOf(bl), lp: leafPlane(bl), rep: bl.leaves[0] }; };

/* THE OUTLINE LAW OF A TREE, in the leaf's own (along, across) mm plane:
   the LOBED half-width (before the teeth) on the chevron's own tilt. */
function law(Gm, st) {
  const Lmm = Number(st.leafLength), O = Gm.lobedOutline(st, Lmm, true);
  const B = (u) => Math.max(O.prof.halfWidthBaseAt(u), Gm.TIP_HALF_MM), A = (u) => Math.max(O.profL.laminaHalfAt(u), Gm.TIP_HALF_MM);
  const P = (u) => { const t = O.tauAt(u), x = B(u); return [u * Lmm + x * Math.sin(t), x * Math.cos(t)]; };
  const dirOf = (u0, u1) => { const p = P(u0), q = P(u1); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  /* the TURN at u: the tangent on either side, each one-sided over 1e-6 of the blade */
  const turnAt = (j, d = 1e-6) => { let t = ((dirOf(j + d, j + 2 * d) - dirOf(j - 2 * d, j - d)) * 180) / Math.PI; while (t > 180) t -= 360; while (t < -180) t += 360; return t; };
  /* where the cut meets the asked flank: the joins */
  const cut = (u) => B(u) < A(u) - 1e-12;
  const half = (O.law.to - O.law.from) / (2 * O.law.lobes);
  const joinsOf = (s) => {
    const ua = s.u - half, ub = s.u + half, N = 20000, js = []; let pc = cut(ua);
    for (let i = 1; i <= N; i++) {
      const u = ua + ((ub - ua) * i) / N, c = cut(u);
      if (c !== pc) { let a = ua + ((ub - ua) * (i - 1)) / N, b = u; for (let k = 0; k < 60; k++) { const m = (a + b) / 2; if (cut(m) === pc) a = m; else b = m; } js.push((a + b) / 2); pc = c; }
    }
    return js;
  };
  return { O, Lmm, P, turnAt, joinsOf };
}
/* a point of the leaf's own plane (along, across) as a place in the world */
const onLeaf = (x, a, b, s = 1) => add(add(x.rep.petioleAxis.bladeBase, x.lp.D, a), x.lp.T, s * b);
const cells = [];

/* ---- 1. THE MUM ---- */
{
  const bl = build(MUM), P = bl.acc.positions, N = bl.acc.normals;
  const cam = fit([P], [0.25, -1, 0.05], [0, 0, 1]);
  const rep = bl.leaves[0], S = rep.serration, rb = rep.lobed.roundBottoms;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE) AT THE RULED DEFAULTS', 'ALTERNATE 137.5 X 4 NODES, ARCH 25 - PRINT PREVIEW ON',
    `ROUNDNESS ${R.DEFAULTS.lobedRound} (RULED): RADII ${rb.sinuses.map((s) => (s.built ? f2(s.radiusMm) : 'V')).join(' / ')} MM`,
    `${R.DEFAULTS.lobedToothCount} TEETH A LOBE ON AVERAGE (RULED): ${S.countBuilt} OF ${S.countAsked} BUILT, PER LOBE ${rep.lobed.teethPerLobe.join(' / ')}`,
    `${bl.leaves.length} LEAVES, ${rep.tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]));
}
/* ---- 2/3. one leaf flat, the base tree against this one, one camera ---- */
const ONEb = flat(ONE, BG, BR), ONEn = flat(ONE);
{
  const cam = fit([ONEb.l.P, ONEn.l.P], ONEn.lp.N, ONEn.lp.D);
  for (const [x, title, Gm] of [[ONEb, 'BEFORE (THE BASE TREE, F9EBCAF)', BG], [ONEn, 'AFTER (THIS TREE)', G]]) {
    const S = x.rep.serration;
    cells.push(cell(x.l.P, x.l.N, cam, ['ONE MUM LEAF FLAT, ONE CAMERA: ' + title,
      `${x.rep.lobed.rows} ROWS, ${x.rep.lobed.toothPerLobe} A LOBE ASKED: ${S.countAsked} OVER THE RIM, ${S.countBuilt} BUILT${S.clampedBy ? ` (${String(S.clampedBy).toUpperCase()} CAP)` : ''}`,
      `PER LOBE ${x.rep.lobed.teethPerLobe.join(' / ')}, ROUNDNESS ${x.bl.st.lobedRound}`,
      `${x.rep.tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]));
  }
}
/* ---- 4. the rulings ---- */
{
  const P = { rows: G.LOBED_BLADE_ROWS, tooth: R.DEFAULTS.lobedToothCount, round: R.DEFAULTS.lobedRound };
  cells.push(textCell('S4C FOLLOW-UP: WHAT EVA RULED', [
    [`ROUNDNESS ${P.round} (0.18 REJECTED)`, 'THE SINUS BOTTOM RADIUS AS A FRACTION OF THE LOBE PITCH, FLOORED AT THE PRINT MINIMUM'],
    [`${P.tooth} TEETH A LOBE AT ${P.rows} ROWS, UNCLAMPED`, 'OPTION (A): THE ROWS RAISED FROM 112 SO THE DEFAULT LEAF BUILDS EVERY TOOTH IT ASKS FOR. (B) TOLD-CLAMPED AND (C) KEEP 3 REJECTED'],
    ['PER LOBE IS AN AVERAGE', 'TEETH SIT EVENLY ALONG THE RIM, SO A LOBE CARRIES ITS SHARE: THE LABEL SAYS SO'],
    ['THE DEAD TRAVEL IS TOLD AND HATCHED', 'THE LEAFS OWN SATURATION, MEASURED PER BUILD'],
    ['THE SINUS JOIN IS TANGENT', 'A FILLET OF THE BOTTOMS OWN RADIUS AT EACH SHOULDER'],
  ]));
}
/* ---- 5-8. the teeth ---- */
{
  const x = ONEn, rep = x.rep, S = rep.serration, Lw = law(G, x.bl.st), Lmm = Lw.Lmm, O = Lw.O;
  const crest = S.crestU.slice(1), marks = [];
  /* each tooth crest on both margins, from the builder's own stations; checked against the emitted vertices */
  let worst = 0;
  for (const u of crest) for (const s of [1, -1]) {
    const h = Math.max(O.prof.halfWidthAt(u), G.TIP_HALF_MM), t = O.tauAt(u);
    const p = onLeaf(x, u * Lmm + h * Math.sin(t), h * Math.cos(t), s);
    /* the miss IN THE LEAF'S OWN PLANE (the cup lifts the margin out of it, and this view looks straight down on it) */
    let best = Infinity; const P = x.l.P, bb = x.rep.petioleAxis.bladeBase;
    const qa = dot(sub(p, bb), x.lp.D), qb = dot(sub(p, bb), x.lp.T);
    for (let i = 0; i < P.length; i += 3) { const d = sub([P[i], P[i + 1], P[i + 2]], bb), dd = Math.hypot(dot(d, x.lp.D) - qa, dot(d, x.lp.T) - qb); if (dd < best) best = dd; }
    worst = Math.max(worst, best);
    marks.push([p, TEAL]);
  }
  const cam = fit([x.l.P], x.lp.N, x.lp.D, 1.04);
  cells.push(cell(x.l.P, x.l.N, cam, [`THE TEETH: ALL ${marks.length} MARKED (TEAL)`, `${S.countAsked} ASKED, ${S.countBuilt} BUILT, ROWS CAP ${S.countRowsCap}: NOTHING CLAMPED`,
    `PER LOBE ${rep.lobed.teethPerLobe.join(' / ')} (BASE TO TERMINAL), RELIEF ${f2(S.reliefBuiltMm)} MM`,
    `EACH MARK FROM THE BUILDERS CREST STATIONS, WORST ${f3(worst)} MM FROM AN EMITTED VERTEX IN THE LEAFS PLANE`, `${mmpx(cam)} MM/PX`], marks));
  const lc = rep.lobed.crestU;
  const macro = (u0, u1, title) => {
    const um = (u0 + u1) / 2, h = Math.max(O.prof.halfWidthBaseAt(um), G.TIP_HALF_MM), t = O.tauAt(um);
    const cam2 = { dir: x.lp.N, up: x.lp.D, center: onLeaf(x, um * Lmm + 0.6 * h * Math.sin(t), 0.6 * h * Math.cos(t)), halfHeight: Math.max(((u1 - u0) * Lmm) / 2 + 1.5, 6) };
    const n = marks.filter(([p]) => { const q = project(cam2, p); return q[0] >= 0 && q[0] < CW && q[1] >= 0 && q[1] < IH; }).length;
    return cell(x.l.P, x.l.N, cam2, [title, `${n} MARKED CRESTS IN FRAME (BOTH MARGINS WHERE THEY FALL IN IT)`, `${mmpx(cam2)} MM/PX`], marks);
  };
  cells.push(macro(lc[0], lc[1], `MACRO: THE BASAL LOBE (${rep.lobed.teethPerLobe[0]} TEETH A SIDE)`));
  cells.push(macro(lc[lc.length - 1], 1, `MACRO: THE TERMINAL (${rep.lobed.teethPerLobe[rep.lobed.teethPerLobe.length - 1]} TEETH A SIDE)`));
  const pin = (b) => b.leaves[0];
  const corner = build({ ...MUM, leafNodes: 8, leafPhyllotaxy: 'whorled' });
  const cornerPct = (100 * corner.acc.triangleCount) / G.EXPORT_TRI_BUDGET;
  cells.push(textCell('THE ROWS CAP AT 130 ROWS', [
    ['THE DEFAULT LEAF', `${S.countAsked} TEETH ASKED (4 A LOBE OVER 7 LOBES), ROWS CAP ${S.countRowsCap}, ${S.countBuilt} BUILT. PER LOBE ${rep.lobed.teethPerLobe.join(' / ')}`],
    ['THE COST', `${pin(x.bl).tris} TRIS A LEAF (BASE TREE ${ONEb.rep.tris}, ${ONEb.rep.lobed.rows} ROWS, ${ONEb.rep.serration.countBuilt} OF ${ONEb.rep.serration.countAsked} BUILT)`],
    ['THE CORNER', `WHORLED X 8 NODES, 24 LEAVES: ${corner.acc.triangleCount} TRIS, ${cornerPct.toFixed(1)}% OF THE BUDGET`],
    ['PINNED IN THE GATE (LF31)', 'ROWS, TEETH, THE SPLIT, TRIS A LEAF, THE CORNER AND THE SATURATION, SO A CHANGE TO ANY OF THEM IS RED'],
  ]));
}
/* ---- 9-12. the sinus join, before and after ---- */
{
  const k = 1;
  /* TEETH OFF (depth 0) for the join: at the default depth a tooth's 3.56 mm relief
     cuts through the shoulder and the join is not the only feature in frame */
  const NT = { ...ONE, lobedToothDepth: 0 };
  const sides = [[flat(NT, BG, BR), BG, 'BEFORE'], [flat(NT), G, 'AFTER']].map(([x, Gm, word]) => {
    const Lw = law(Gm, x.bl.st), s = Lw.O.round.sinuses[k], js = Lw.joinsOf(s);
    return { x, Gm, word, Lw, s, js, turns: js.map((j) => Lw.turnAt(j)) };
  });
  const ref = sides[1], sb = ref.s;
  /* framed on the whole sinus, crest to crest: both shoulders in one view */
  const ja = sides[0].js[0], jb = sides[0].js[sides[0].js.length - 1], Pa = ref.Lw.P(ja), Pb = ref.Lw.P(jb);
  const cam = { dir: ref.x.lp.N, up: ref.x.lp.D, center: onLeaf(ref.x, (Pa[0] + Pb[0]) / 2, (Pa[1] + Pb[1]) / 2 - 1.5), halfHeight: Math.hypot(Pb[0] - Pa[0], Pb[1] - Pa[1]) / 2 + 2.5 };
  for (const sd of sides) {
    const sh = sd.s.shoulders;
    cells.push(cell(sd.x.l.P, sd.x.l.N, cam, [`THE SINUS JOIN ${sd.word}: SINUS ${k + 1}, ONE CAMERA, TEETH OFF`,
      `RADIUS ${f3(sd.s.radiusMm)} MM, ${sd.js.length} PLACES THE CUT MEETS THE FLANK`,
      ...sd.js.map((j, i) => `${i === 0 ? 'BACK SHOULDER' : i === sd.js.length - 1 ? 'FRONT SHOULDER' : 'BOTTOM STEP'} U ${j.toFixed(4)}: TURN ${sd.turns[i].toFixed(2)} DEG`),
      ...(sd.js.length > 3 ? [`THE BOTTOM STEP IS ${(1000 * Math.hypot(...[0, 1].map((c) => sd.Lw.P(sd.js[sd.js.length - 2])[c] - sd.Lw.P(sd.js[1])[c]))).toFixed(1)} UM LONG, THE SAME ON BOTH TREES`] : []),
      ...(sh ? sh.map((q, i) => `${i ? 'FRONT' : 'BACK'} FILLET ${f3(q.radiusMm)} MM, WALL END TURN ${sd.Lw.turnAt(q.wallU).toFixed(3)} DEG`) : ['NO FILLET: THE WALL MEETS THE FLANK AT A CORNER']),
      `${mmpx(cam)} MM/PX, PRINT PREVIEW ON`], sd.js.map((j) => { const q = sd.Lw.P(j); return [onLeaf(sd.x, q[0], q[1]), AMBER]; })));
  }
  /* the close-ups: ONE camera on the base tree's back corner (the ledge), both trees */
  const q0 = sides[0].Lw.P(sides[0].js[0]);
  const camz = { dir: ref.x.lp.N, up: ref.x.lp.D, center: onLeaf(ref.x, q0[0], q0[1]), halfHeight: 1.6 };
  for (const sd of sides) {
    const sh = sd.s.shoulders && sd.s.shoulders[0];
    const at = sh ? [sh.flankU, sh.wallU] : [sd.js[0]];
    cells.push(cell(sd.x.l.P, sd.x.l.N, camz, [`CLOSE-UP, THE BACK SHOULDER ${sd.word}, TEETH OFF`,
      ...(sh ? [`FILLET ${f3(sh.radiusMm)} MM FROM U ${sh.flankU.toFixed(4)} TO ${sh.wallU.toFixed(4)}`, `TURN AT THE FLANK END ${sd.Lw.turnAt(sh.flankU).toFixed(3)} DEG, AT THE WALL END ${sd.Lw.turnAt(sh.wallU).toFixed(3)} DEG`,
        'WHERE THE CORNER WAS (U ' + sh.cornerU.toFixed(4) + `) THE TURN IS ${sd.Lw.turnAt(sh.cornerU).toFixed(3)} DEG`]
        : [`THE STRAIGHT WALL MEETS THE FLANK AT U ${sd.js[0].toFixed(4)}`, `A CORNER: TURN ${sd.turns[0].toFixed(2)} DEG - THE LEDGE`]),
      `AMBER: ${sh ? 'THE FILLETS TWO ENDS' : 'THE CORNER'}, ${mmpx(camz)} MM/PX`], at.map((u) => [onLeaf(sd.x, ...sd.Lw.P(u)), AMBER])));
  }
}
/* ---- 13-14. the control from the real page, print preview ON ---- */
const shots = [];
{
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage({ viewport: { width: 1000, height: 900 } });
  try {
    await openBloom(page, port);
    await page.evaluate(() => { const c = document.getElementById('printPreview'); if (c && !c.checked) c.click(); });
    for (const v of [R.DEFAULTS.lobedRound, 0.18]) {
      const sets = Object.entries({ ...MUM, lobedRound: v }).map(([id, value]) => ({ id, value: String(value) }));
      const bad = await applyConfig(page, sets);
      if (bad.length) throw new Error(`config did not take: ${bad.join('; ')}`);
      const info = await page.evaluate(() => {
        const w = document.getElementById('lobedRound').closest('.bl-ctrl');
        for (let d = w.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
        w.scrollIntoView({ block: 'center' });
        const R0 = window.__bloomMetrics().leaf.lobedBuilt[0].roundBottoms;
        return { said: w.querySelector('.bl-val').textContent, cap: w.dataset.cap ?? null, capped: w.classList.contains('bl-ctrl--capped'), sat: R0.saturatesAt,
          preview: document.getElementById('printPreview').checked };
      });
      const png = decodePNG(await page.locator('#lobedRound').locator('xpath=ancestor::*[contains(@class,"bl-ctrl")][1]').screenshot());
      shots.push({ v, info, png });
    }
  } finally { await browser.close(); server.close(); }
}
for (const { v, info, png } of shots) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  /* the control, scaled to the cell's width (nearest sample) */
  const sc = Math.min(CW / png.width, IH / png.height);
  const w = Math.floor(png.width * sc), h = Math.floor(png.height * sc);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(png.width - 1, Math.floor(x / sc)), sy = Math.min(png.height - 1, Math.floor(y / sc)), si = (sy * png.width + sx) * 4, o = ((CAP + 8 + y) * CW + x) * 3;
    if (CAP + 8 + y >= CH) continue;
    rgb[o] = png.data[si]; rgb[o + 1] = png.data[si + 1]; rgb[o + 2] = png.data[si + 2];
  }
  caption(rgb, [`THE ROUNDNESS CONTROL AT ${v} (THE REAL PAGE)`, `THE MUM, PRINT PREVIEW ${info.preview ? 'ON' : 'OFF'}`,
    `SATURATES AT ${info.sat === null ? 'NONE' : Number(info.sat).toFixed(4)}: THE HATCH FROM ${info.cap} UP (${info.capped ? 'DRAWN' : 'NOT DRAWN'})`,
    /SATURATED/.test(info.said) ? 'THE READ-OUT SAYS SATURATED: THIS STEP BUILDS THE SAME LEAF AS 0.5' : 'THE READ-OUT NAMES WHERE IT SATURATES']);
  cells.push(rgb);
}
/* ---- 15. a told corner ---- */
{
  const x = flat(CORNER), rb = x.rep.lobed.roundBottoms;
  const told = rb.sinuses.flatMap((s, i) => (s.shoulders || []).map((q, j) => ({ i, j, q }))).filter((o) => !o.q.tangent);
  const Lw = law(G, x.bl.st);
  const cam = fit([x.l.P], x.lp.N, x.lp.D);
  cells.push(cell(x.l.P, x.l.N, cam, ['A SHOULDER THE LAW CANNOT FILLET (TOLD)', `MATRIX BLOCK 58: ${x.bl.st.lobedLobes} LOBES, SHAPE ${x.bl.st.lobedShape}, ANGLE ${x.bl.st.lobedAngle}`,
    ...told.map((o) => `SINUS ${o.i + 1} ${o.j ? 'FRONT' : 'BACK'}: ${String(o.q.why).toUpperCase()}, TURN ${Lw.turnAt(o.q.cornerU).toFixed(1)} DEG`),
    `${mmpx(cam)} MM/PX`], told.map((o) => { const q = Lw.P(o.q.cornerU); return [onLeaf(x, q[0], q[1]), AMBER]; })));
}
/* ---- 16. the saturation figures ---- */
{
  const sat = (over) => flat(over).rep.lobed.roundBottoms;
  const d = sat(ONE), s4 = sat({ ...ONE, lobedSinus: 0.62, lobedShape: 0.7, lobedAngle: 38, lobedToothDepth: 0.08 });
  cells.push(textCell('THE DEAD TRAVEL, MEASURED', [
    ['THE DEFAULT LEAF', `SATURATES AT ${Number(d.saturatesAt).toFixed(4)}: EVERY STEP FROM 0.18 BUILDS THE SAME LEAF, BIT FOR BIT`],
    ['S4S FORM (SINUS 0.62, SHAPE 0.70, ANGLE 38)', `SATURATES AT ${s4.saturatesAt === null ? 'NONE' : Number(s4.saturatesAt).toFixed(4)}`],
    ['HOW IT IS FOUND', 'THE LARGEST RADIUS EVERY SHOULDER CAN STILL FILLET, BISECTED ON A FIXED BRACKET: ABOVE IT NO SINUS MOVES'],
    ['HOW IT IS TOLD', 'THE TRACK IS HATCHED FROM THERE AND THE READ-OUT SAYS SATURATED. THE RANGE IS NOT NARROWED'],
  ]));
}
const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H}), ${cells.length} cells`);
