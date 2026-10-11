#!/usr/bin/env node
/* ===================================================================
   shot-bloom-leaf-tip-neck.mjs — THE SHEET FOR S5b (the tip neck, the
   already-round sinuses, the E2 churn; docs/bloom-leaf-tip-neck-outcome.md).

     node tools/shot-bloom-leaf-tip-neck.mjs <out.png> --base <worktree of d92a0c6> [--numbers <file.json>]

   ROW 1 — THE MUM at the ruled defaults (its pins, old against new), the
   rulings, the numbers (the E2 variant table, the partitions).
   ROWS 2-3 — THE TIP, BEFORE AND AFTER, PER TYPE, TEETH ON: the default
   SIMPLE leaf, the rose's terminal leaflet toothed at 0.26, the mum — each on
   ONE camera for both trees, framed on the tip in the blade's own plane (S5's
   rows 2-3 framing).
   ROW 4 — THE MUM'S TERMINAL LOBE, FLAT, before and after; and the read-out's
   own teeth line.
   ROW 5 — TWO OF THE ALREADY-ROUND SINUSES, teeth off, before and after: the
   drawn outline rendered, the LAW's lamina dotted over it (amber) and the
   largest fillet the arms take (teal) resting on the bottom.
   ROW 6 — THE ROUNDNESS CONTROL on an already-round leaf (the real page).

   PRINT PREVIEW ON: every rendered build is EXPORT mode with the builder's
   own normals. RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC,
   so no pixel delta is quoted and none is owed.
   =================================================================== */
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, buildMatrix } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const BASE = opt('--base');
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-leaf-tip-neck.mjs <out.png> --base <worktree> [--numbers f.json]'); process.exit(2); }
const NUM = opt('--numbers') ? JSON.parse(fs.readFileSync(opt('--numbers'), 'utf8')) : null;
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
const INK = [240, 236, 226], AMBER = [214, 161, 92], TEAL = [111, 183, 174];
const f2 = (x) => Number(x).toFixed(2), f3 = (x) => Number(x).toFixed(3), f4 = (x) => Number(x).toFixed(4);

const MATRIX = buildMatrix();
const rowSet = (re) => {
  const r = MATRIX.find((x) => re.test(x.label)); if (!r) throw new Error(`no matrix row ${re}`);
  return Object.fromEntries(r.set.map((w) => [w.id, Number.isFinite(Number(w.value)) && w.value !== '' ? Number(w.value) : w.value]));
};
const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const SIMPLE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafNodes: 1 };
const ROSE = { stemLength: 90, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND', leafletToothDepth: 0.26 };
const LOBED1 = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };
const ROUND = rowSet(/^ALREADY ROUND: every broad sinus/);
/* the second already-round leaf: a sampled state (500-state sampler k 59),
   two lobes a side, its two sinuses rounder than any fillet that fits */
const ROUND2 = { stemLength: 70, stemDiameter: 6, leafNodes: 1, leafType: 'LOBED', lobedLobes: 2, lobedFrom: 0.39, lobedTo: 0.6, lobedSinus: 0.29, lobedShape: 2.3, lobedAngle: 52, lobedEase: 0.66, lobedWidth: 11.5, leafLength: 102, lobedToothDepth: 0, leafTipShape: 2.9 };

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
function camBasis(cam) { const f = nrm(cam.dir.map((c) => -c)), r = nrm(crs(f, cam.up)), u = nrm(crs(r, f)); return { f, r, u }; }
function fit(Ps, dir, up, pad = 1.08) {
  const { f, r, u } = camBasis({ dir, up });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, d0 = 0, n = 0;
  for (const P of Ps) for (let i = 0; i < P.length; i += 3) {
    const p = [P[i], P[i + 1], P[i + 2]], x = dot(p, r), y = dot(p, u);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; d0 += dot(p, f); n++;
  }
  const center = add(add(add([0, 0, 0], r, (x0 + x1) / 2), u, (y0 + y1) / 2), f, d0 / n);
  return { dir, up, center, halfHeight: Math.max((y1 - y0) / 2, ((x1 - x0) / 2) * (IH / CW)) * pad };
}
function project(cam, p) { const { r, u } = camBasis(cam), d = sub(p, cam.center), s = (IH / 2) / cam.halfHeight; return [CW / 2 + dot(d, r) * s, IH / 2 - dot(d, u) * s]; }
function wrap(lines) {
  const o = [];
  for (const l of lines) {
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'NO ').replace(/[’']/g, '').replace(/·/g, ',').replace(/°/g, ' DEG').replace(/[–—]/g, '-').replace(/x(?=\d| )/g, 'X').replace(/[<>=+]/g, ' ').replace(/[()]/g, ' ').replace(/%/g, ' PC').toUpperCase();
    while (s.length > 48) { let k = s.lastIndexOf(' ', 48); if (k < 20) k = 48; o.push(s.slice(0, k)); s = '  ' + s.slice(k).trimStart(); }
    o.push(s);
  }
  return o;
}
function caption(rgb, lines) { wrap(lines).slice(0, 8).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1)); }
function dotAt(rgb, xy, col, rad = 1) {
  const [cx, cy] = [Math.round(xy[0]), Math.round(xy[1] + CAP)];
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const x = cx + dx, y = cy + dy; if (x < 0 || x >= CW || y < CAP || y >= CH) continue;
    const o = (y * CW + x) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
  }
}
function cell(P, Nrm, cam, lines, dots = []) {
  const img = render(P, CW, IH, cam, { color: [214, 206, 190], normals: Nrm });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IH, 0, CAP);
  for (const [p, col, rad] of dots) dotAt(rgb, project(cam, p), col, rad === undefined ? 0 : rad);
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
  wrap(all).slice(0, 31).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
const flat = (over, Gm = G, Rm = R) => { const bl = build(over, Gm, Rm); return { bl, l: leafOf(bl), lp: leafPlane(bl), rep: bl.leaves[0] }; };
const baseOf = (rep) => (rep.petioleAxis && rep.petioleAxis.bladeBase) || rep.rowCentre[0];
const tipOf = (rep) => rep.rowCentre[rep.rowCentre.length - 1];
const neckWords = (S) => {
  const t = S && S.tipNeck;
  if (!t) return `TEETH ${S ? S.countBuilt : 0} (NO TIP-NECK RECORD: THE BASE TREE)`;
  return `TEETH ${t.teethDrawn} DRAWN OF ${S.countBuilt} LAID OUT: ${t.pairsGiven} PAIR${t.pairsGiven === 1 ? '' : 'S'} GIVEN UP AT THE TIP${t.tested.length ? ` (${t.tested.map((x) => `${Math.round(100 * x.fraction)}%`).join(', ')} TESTED, BAR ${Math.round(100 * t.bar)}%)` : ''}`;
};
const cells = [];

/* ---- 1. THE MUM ---- */
const mum = build(MUM), mumB = build(MUM, BG, BR);
{
  const P = mum.acc.positions, N = mum.acc.normals;
  const cam = fit([P], [0.25, -1, 0.05], [0, 0, 1]);
  const rep = mum.leaves[0], S = rep.serration, SB = mumB.leaves[0].serration;
  const drawn = S.tipNeck ? S.tipNeck.teethDrawn : S.countBuilt;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE) AT THE RULED DEFAULTS, PRINT PREVIEW ON',
    `TEETH ${drawn} DRAWN OF ${S.countBuilt} LAID OUT, PER LOBE ${rep.lobed.teethPerLobe.join(' / ')} (BASE ${SB.countBuilt} OF ${SB.countBuilt}, ${mumB.leaves[0].lobed.teethPerLobe.join(' / ')})`,
    `${rep.tris} TRIS A LEAF (BASE ${mumB.leaves[0].tris}); ROUNDNESS SATURATES AT ${Number(rep.lobed.roundBottoms.saturatesAt).toFixed(6)}`,
    neckWords(S), `${mmpx(cam)} MM/PX`]));
}
/* ---- 2. the rulings ---- */
cells.push(textCell('S5B: WHAT EVA RULED (OCT 11)', [
  ['THE TIP GIVES UP THE PAIR THAT NECKS IT', 'A TIP-WARD NOTCH CUTTING PAST HALF THE BASE WIDTH - OR PAST THE BODYS OWN DEEPEST TOOTH WHERE THAT IS DEEPER - IS GIVEN UP WITH ITS MIRROR, TOLD ASKED VS BUILT; THE WALK REPEATS ONE PAIR DOWN'],
  ['ALREADY ROUND, SAID PLAINLY', 'MEASURED: THE LAWS OWN BOTTOM IS ROUNDER THAN ANY FILLET THAT FITS - NOT A V ROUND BETWEEN ROWS - SO THE READ-OUT SAYS THE SLIDER CANNOT ROUND IT'],
  ['E2 CHURN', 'THE LOBE WINDOW KEEPS ITS PRE-S5 STATIONS; THE ARC ROWS COME FROM NEAR THE TIP (SEE THE TABLE)'],
]));
/* ---- 3-4. the numbers ---- */
{
  const blocks = [];
  if (NUM && NUM.e2) for (const [h, b] of NUM.e2) blocks.push([h, b]);
  else blocks.push(['(NO --NUMBERS FILE)', 'THE E2 VARIANT TABLE IS IN THE OUTCOME DOC']);
  cells.push(textCell('E2 CHURN: THE STATION-LAW VARIANTS', blocks));
}
{
  const blocks = [];
  if (NUM && NUM.other) for (const [h, b] of NUM.other) blocks.push([h, b]);
  else blocks.push(['(NO --NUMBERS FILE)', 'THE PARTITIONS AND THE SAMPLER ARE IN THE OUTCOME DOC']);
  cells.push(textCell('THE NUMBERS', blocks));
}
/* ---- 5-10. the tip, before and after, per type, teeth on ---- */
function tipPair(over, title, pick) {
  const xs = [[flat(over, BG, BR), 'BEFORE (D92A0C6)'], [flat(over), 'AFTER']];
  const frames = xs.map(([x]) => pick(x));
  const f0 = frames[1];
  const cam = { dir: f0.N, up: f0.D, center: add(f0.tip, f0.D, -f0.back / 2), halfHeight: f0.back / 2 + 0.6 };
  xs.forEach(([x, word], i) => {
    const fr = frames[i];
    cells.push(cell(x.l.P, x.l.N, cam, [`${title}: THE TIP ${word}, ONE CAMERA, TEETH ON`, fr.words, `${mmpx(cam)} MM/PX, THE BLADES OWN PLANE`]));
  });
}
const simplePick = (back) => (x) => ({ D: x.lp.D, N: x.lp.N, tip: tipOf(x.rep), back, words: neckWords(x.rep.serration) });
tipPair(SIMPLE, 'SIMPLE (THE DEFAULT LEAF)', simplePick(12));
tipPair(ROSE, 'ROSE LEAFLET TOOTHED 0.26', (x) => {
  const q = x.rep.leaflets.find((r) => r.role === 'terminal');
  return { D: q.D, N: q.N, tip: q.rowCentre ? q.rowCentre[q.rowCentre.length - 1] : add(q.base, q.D, q.lengthMm), back: 10, words: neckWords(q.serration) };
});
tipPair(LOBED1, 'THE MUM LEAF', simplePick(12));
/* ---- 11-12. the mum's terminal lobe, flat, before and after ---- */
{
  const xs = [[flat(LOBED1, BG, BR), 'BEFORE (D92A0C6)'], [flat(LOBED1), 'AFTER']];
  const xa = xs[1][0], Lmm = Number(xa.bl.st.leafLength), law = xa.rep.lobed;
  /* the terminal lobe: from the last lobe sinus to the tip, in the blade's plane */
  const lastSinus = law.sinusU[law.sinusU.length - 1];
  const back = (1 - lastSinus) * Lmm + 1;
  const cam = { dir: xa.lp.N, up: xa.lp.D, center: add(tipOf(xa.rep), xa.lp.D, -back / 2), halfHeight: back / 2 + 0.8 };
  for (const [x, word] of xs) cells.push(cell(x.l.P, x.l.N, cam, [`THE MUMS TERMINAL LOBE ${word}, FLAT, ONE CAMERA`, neckWords(x.rep.serration), `${mmpx(cam)} MM/PX`]));
}
/* ---- 13-16. two already-round sinuses, teeth off, before and after ---- */
function roundPair(over, title) {
  const o = { ...over, lobedToothDepth: 0 };
  const xs = [[flat(o, BG, BR), BG, 'BEFORE (D92A0C6)'], [flat(o), G, 'AFTER']];
  const xa = xs[1][0], RB = xa.rep.lobed.roundBottoms;
  const k = Math.max(0, RB.sinuses.findIndex((s) => s.filletDead));
  const s = RB.sinuses[k];
  const Lmm = Number(xa.bl.st.leafLength);
  for (const [x, Gm, word] of xs) {
    const O = Gm.lobedOutline(x.bl.st, Lmm, true), sb = O.round.sinuses[k];
    const half = (O.law.to - O.law.from) / (2 * O.law.lobes);
    const lam = (u) => O.profL.laminaHalfAt(u);
    const P2 = (xmm, h) => { const t = O.tauAt(xmm / Lmm); return [xmm + h * Math.sin(t), h * Math.cos(t)]; };
    const on = (q) => add(add(baseOf(x.rep), x.lp.D, q[0]), x.lp.T, q[1]);
    let ub = sb.u, hb = Infinity;
    for (let i = 0; i <= 4096; i++) { const u = sb.u - half + (2 * half * i) / 4096, h = lam(u); if (h < hb) { hb = h; ub = u; } }
    const Rf = sb.radiusFitMm;
    const dots = [];
    for (let i = 0; i <= 400; i++) { const u = sb.u - half + (2 * half * i) / 400; dots.push([on(P2(u * Lmm, lam(u))), AMBER, 0]); }
    for (let i = 0; i <= 400; i++) { const a = -Math.PI + (Math.PI * i) / 400, xmm = ub * Lmm + Rf * Math.cos(a), h = hb + Rf + Rf * Math.sin(a); dots.push([on(P2(xmm, h)), TEAL, 0]); }
    const span = Math.min(2 * half * Lmm, 2.4 * Rf);
    const camz = { dir: x.lp.N, up: x.lp.D, center: on(P2(ub * Lmm, hb + Rf * 0.3)), halfHeight: Math.max(1.2, span / 2) };
    cells.push(cell(x.l.P, x.l.N, camz, [`${title}: AN ALREADY-ROUND SINUS ${word}, TEETH OFF`,
      `THE BOTTOM AT U ${f4(ub)}; AMBER THE LAWS LAMINA, TEAL THE LARGEST FILLET ITS ARMS TAKE (${f3(Rf)} MM) RESTING ON IT`,
      sb.filletDead ? 'TOLD: ALREADY ROUND - THE FILLET ONLY RESTS ON THE BOTTOM, ADDING NOTHING' : 'NOT TOLD ALREADY ROUND',
      `${mmpx(camz)} MM/PX, THE BLADES OWN PLANE`], dots));
  }
  return s;
}
roundPair(ROUND, 'BLOCK 60 ROW');
roundPair(ROUND2, 'SAMPLER STATE K 59');
/* ---- 17-18. the real page: the teeth line on the mum, the roundness control on an already-round leaf ---- */
const shots = [];
let teethLine = null;
{
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage({ viewport: { width: 1000, height: 900 } });
  try {
    await openBloom(page, port);
    await page.evaluate(() => { const c = document.getElementById('printPreview'); if (c && !c.checked) c.click(); });
    const go = async (o) => { const bad = await applyConfig(page, Object.entries(o).map(([id, value]) => ({ id, value: String(value) }))); if (bad.length) throw new Error(`config did not take: ${bad.join('; ')}`); };
    await go(LOBED1);
    const ro = await page.evaluate(() => document.getElementById('readout').innerText);
    teethLine = ro.split('\n').find((l) => /TIP gave/i.test(l)) || null;
    await go(ROUND);
    const info = await page.evaluate(() => {
      const w = document.getElementById('lobedRound').closest('.bl-ctrl');
      for (let d = w.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
      w.scrollIntoView({ block: 'center' });
      return { said: w.querySelector('.bl-val').textContent, cap: w.dataset.cap ?? null, capped: w.classList.contains('bl-ctrl--capped'), preview: document.getElementById('printPreview').checked };
    });
    const png = decodePNG(await page.locator('#lobedRound').locator('xpath=ancestor::*[contains(@class,"bl-ctrl")][1]').screenshot());
    shots.push({ info, png });
  } finally { await browser.close(); server.close(); }
}
cells.push(textCell('THE READ-OUT, VERBATIM', [['THE MUM LEAFS TEETH LINE', teethLine || '(NO TIP LINE FOUND)'], ['THE ROUNDNESS CONTROL ON THE BLOCK 60 ROW', shots[0] ? shots[0].info.said : '(NONE)']]));
for (const { info, png } of shots) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const sc = Math.min(CW / png.width, IH / png.height), w = Math.floor(png.width * sc), h = Math.floor(png.height * sc);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const sx = Math.min(png.width - 1, Math.floor(xx / sc)), sy = Math.min(png.height - 1, Math.floor(y / sc)), si = (sy * png.width + sx) * 4, o = ((CAP + 8 + y) * CW + xx) * 3;
    if (CAP + 8 + y >= CH) continue;
    rgb[o] = png.data[si]; rgb[o + 1] = png.data[si + 1]; rgb[o + 2] = png.data[si + 2];
  }
  caption(rgb, ['THE ROUNDNESS CONTROL ON AN ALREADY-ROUND LEAF (THE REAL PAGE)', `PRINT PREVIEW ${info.preview ? 'ON' : 'OFF'}; THE HATCH FROM ${info.cap} (${info.capped ? 'DRAWN' : 'NOT DRAWN'})`,
    /ALREADY ROUND/.test(info.said) ? 'THE READ-OUT SAYS ALREADY ROUND' : 'THE READ-OUT DOES NOT SAY ALREADY ROUND']);
  cells.push(rgb);
}

const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H}), ${cells.length} cells`);
