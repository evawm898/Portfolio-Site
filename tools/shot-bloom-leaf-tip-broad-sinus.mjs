#!/usr/bin/env node
/* ===================================================================
   shot-bloom-leaf-tip-broad-sinus.mjs — THE SHEET FOR S5 (the leaf tip and
   the broad sinuses; docs/bloom-leaf-tip-broad-sinus-outcome.md).

     node tools/shot-bloom-leaf-tip-broad-sinus.mjs <out.png> --base <worktree of d6d2ab4> [--numbers <file.json>]

   ROW 1 — THE MUM at the ruled defaults (28 of 28 teeth, 3/4/4/6, 6,916 tris,
   the roundness figures), the rulings, the numbers.
   ROWS 2-3 — THE TIP, BEFORE AND AFTER, PER TYPE: a SIMPLE leaf, the rose
   compound's terminal LEAFLET and a LOBED leaf, each on ONE camera for both
   trees, framed on the tip in the blade's own plane.
   ROW 4 — THE TWO FORMER FOLD ROWS (#394's XFAIL), before and after, with the
   census over the leaf's own triangles on each; and the tip YIELD row, with
   the read-out's own sentence.
   ROW 5 — A BROAD-SINUS LEAF at 0.12, before and after, whole and a sinus
   macro.
   ROW 6 — THE ROUNDNESS CONTROL on a broad-sinus leaf from the real page (the
   hatch at the new saturation), and the sampler table.

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
import { census } from './bloom-self-intersection.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const BASE = opt('--base');
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-leaf-tip-broad-sinus.mjs <out.png> --base <worktree> [--numbers f.json]'); process.exit(2); }
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
const INK = [240, 236, 226], AMBER = [214, 161, 92];
const f2 = (x) => Number(x).toFixed(2), f3 = (x) => Number(x).toFixed(3), f4 = (x) => Number(x).toFixed(4);

/* a matrix row's own set, by label, coerced as the gate coerces it */
const MATRIX = buildMatrix();
const rowSet = (re) => {
  const r = MATRIX.find((x) => re.test(x.label)); if (!r) throw new Error(`no matrix row ${re}`);
  return Object.fromEntries(r.set.map((w) => [w.id, Number.isFinite(Number(w.value)) && w.value !== '' ? Number(w.value) : w.value]));
};
const MUM = { stemLength: 120, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5, leafArch: 25 };
const SIMPLE = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafNodes: 1 };
const ROSE = { stemLength: 90, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND' };
const LOBED1 = { stemLength: 70, stemDiameter: 6, leafLength: 46, leafType: 'LOBED', leafNodes: 1 };
const EASE = rowSet(/^LOBED: lobedEase max \(0\.95\)/);
const YIELD6 = rowSet(/^LOBED YIELD: 6 lobes asked on a 12 mm blade/);
const TIPYIELD = rowSet(/^LEAF TIP: the tip gives its tooth up/);
const BROAD = { ...LOBED1, lobedShape: 2.5 };
const SAT = rowSet(/^BROAD SINUS: roundness 0\.50/);

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
/* the census over EVERY leaf's own triangles (a fold elsewhere on the bloom cannot count) */
function leafCensus(bl) {
  let a = bl.b.leafTriRange[0], pairs = 0, worst = 0;
  for (const L of bl.leaves) { const c = census(bl.acc.positions.slice(a * 9, (a + L.tris) * 9)); pairs += c.within; worst = Math.max(worst, c.worstSpanMm); a += L.tris; }
  return { pairs, worst };
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
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'NO ').replace(/[’']/g, '').replace(/·/g, ',').replace(/°/g, ' DEG').replace(/[–—]/g, '-').replace(/x(?=\d| )/g, 'X').replace(/[<>=+]/g, ' ').replace(/[()]/g, ' ').toUpperCase();
    while (s.length > 48) { let k = s.lastIndexOf(' ', 48); if (k < 20) k = 48; o.push(s.slice(0, k)); s = '  ' + s.slice(k).trimStart(); }
    o.push(s);
  }
  return o;
}
function caption(rgb, lines) { wrap(lines).slice(0, 8).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1)); }
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
  wrap(all).slice(0, 31).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
const flat = (over, Gm = G, Rm = R) => { const bl = build(over, Gm, Rm); return { bl, l: leafOf(bl), lp: leafPlane(bl), rep: bl.leaves[0] }; };
const tipWords = (rep) => {
  const c = rep.tipClamp || {};
  return c.nib ? `NIB (${String(c.regime).toUpperCase()}${c.kinkDeg > 0.05 ? `, A TOLD ${f2(c.kinkDeg)} DEG CORNER` : ''}): FACE ${f2(c.terminalMm)} MM, ARC R ${f3(c.radiusMm)} MM`
    : `STUB: ${f2(c.terminalMm)} MM FACE, ${f2(c.mm)} MM LONG (${(100 * c.fraction).toFixed(1)}% OF THE LENGTH)`;
};
const cells = [];

/* ---- 1. THE MUM ---- */
const mum = build(MUM), mumB = build(MUM, BG, BR);
{
  const P = mum.acc.positions, N = mum.acc.normals;
  const cam = fit([P], [0.25, -1, 0.05], [0, 0, 1]);
  const rep = mum.leaves[0], S = rep.serration, rb = rep.lobed.roundBottoms, rbB = mumB.leaves[0].lobed.roundBottoms;
  cells.push(cell(P, N, cam, ['THE MUM (HEADLINE) AT THE RULED DEFAULTS, PRINT PREVIEW ON',
    `${S.countBuilt} OF ${S.countAsked} TEETH, PER LOBE ${rep.lobed.teethPerLobe.join(' / ')}, ${rep.tris} TRIS A LEAF (BASE ${mumB.leaves[0].tris})`,
    `ROUND BOTTOMS ${rb.sinuses.map((s) => (s.built ? f4(s.radiusMm) : 'V')).join(' / ')} MM (BASE ${rbB.sinuses.map((s) => (s.built ? f4(s.radiusMm) : 'V')).join(' / ')})`,
    `SATURATES AT ${rb.saturatesAt === null ? 'NONE' : Number(rb.saturatesAt).toFixed(5)} (BASE ${rbB.saturatesAt === null ? 'NONE' : Number(rbB.saturatesAt).toFixed(5)}): ITS SINUSES ARE NARROW, NONE FILLETED`,
    `TIP: ${tipWords(rep)}`, `${mmpx(cam)} MM/PX`]));
}
/* ---- 2. the rulings ---- */
cells.push(textCell('S5: WHAT EVA RULED (OCT 10)', [
  ['THE TIP CLOSES AS A POINT', 'NO NECK AND NO BULB: THE PETALS NIB ON EVERY LEAF BLADE - SIMPLE, COMPOUND LEAFLET, LOBED - WITH ITS START SOLVED SO THE LEAF KEEPS ITS LENGTH'],
  ['THE TIP GIVES A TOOTH UP', 'WHERE A SINUS LANDS IN THE CONVERGING TIP THE COUNT YIELDS, TOLD ASKED VS BUILT, THE SLIDER KEEPS ITS VALUE; NO NOTCH IS EVER CUT INTO THE NIB'],
  ['A BROAD SINUS IS FILLETED', 'A CIRCLE TANGENT TO BOTH ARMS AT THE V POINT, RADIUS ROUNDNESS X PITCH, SHRUNK TO FIT, FLOORED AT THE PRINT MINIMUM; NARROW SINUSES KEEP THE U'],
  ['PINNED', 'THE MUM: 28 OF 28 TEETH 3/4/4/6, 6,916 TRIS, ITS ROUNDNESS FIGURES - ALL UNMOVED, LF31 UNTOUCHED'],
]));
/* ---- 3. the numbers ---- */
{
  const blocks = [];
  if (NUM && NUM.tip) blocks.push(['THE TIP CENSUS (972 LOBED CORNERS)', NUM.tip]);
  if (NUM && NUM.tipOther) blocks.push(['SIMPLE AND COMPOUND (243 EACH)', NUM.tipOther]);
  if (NUM && NUM.partition) blocks.push(['THE BYTE PARTITION', NUM.partition]);
  if (!blocks.length) blocks.push(['(NO --NUMBERS FILE)', 'THE TIP CENSUS AND THE PARTITION ARE IN THE OUTCOME DOC']);
  cells.push(textCell('THE NUMBERS', blocks));
}
{
  const blocks = [];
  if (NUM && NUM.sampler) for (const [h, b] of NUM.sampler) blocks.push([h, b]);
  else blocks.push(['(NO --NUMBERS FILE)', 'THE 500-STATE SAMPLER TABLE IS IN THE OUTCOME DOC']);
  cells.push(textCell('THE ROUNDNESS SLIDER, 500 SAMPLED LEAVES AT 0.12', blocks));
}
/* ---- 4-9. the tip, before and after, per type ---- */
function tipPair(over, title, pick) {
  const xs = [[flat(over, BG, BR), 'BEFORE (D6D2AB4)'], [flat(over), 'AFTER']];
  const frames = xs.map(([x]) => pick(x));
  const f0 = frames[1];
  const cam = { dir: f0.N, up: f0.D, center: add(f0.tip, f0.D, -f0.back / 2), halfHeight: f0.back / 2 + 0.6 };
  xs.forEach(([x, word], i) => {
    const fr = frames[i], c = leafCensus(x.bl);
    cells.push(cell(x.l.P, x.l.N, cam, [`${title}: THE TIP ${word}, ONE CAMERA`, fr.words, `CENSUS OVER ITS LEAVES: ${c.pairs} PAIRS${c.pairs ? `, WORST ${f4(c.worst)} MM` : ''}`,
      `${mmpx(cam)} MM/PX, THE BLADES OWN PLANE`]));
  });
}
const simplePick = (x) => { const L = Number(x.bl.st.leafLength); return { D: x.lp.D, N: x.lp.N, tip: add(x.rep.petioleAxis.bladeBase, x.lp.D, L), back: 5, words: tipWords(x.rep) }; };
tipPair(SIMPLE, 'SIMPLE', simplePick);
tipPair(ROSE, 'ROSE LEAFLET', (x) => {
  const q = x.rep.leaflets.find((r) => r.role === 'terminal');
  return { D: q.D, N: q.N, tip: add(q.base, q.D, q.lengthMm), back: 4, words: tipWords(q) };
});
tipPair(LOBED1, 'LOBED', simplePick);
/* ---- 10-14. the two former fold rows, and the tip yield ---- */
for (const [over, title] of [[EASE, 'FORMER FOLD: LOBEDEASE 0.95'], [YIELD6, 'FORMER FOLD: 6 LOBES ON 12 MM']]) {
  for (const [Gm, Rm, word] of [[BG, BR, 'BEFORE'], [G, R, 'AFTER']]) {
    const x = flat(over, Gm, Rm), c = leafCensus(x.bl), off = leafCensus(build({ ...over, lobedToothDepth: 0 }, Gm, Rm));
    const S = x.rep.serration, L = Number(x.bl.st.leafLength);
    const tip = add(x.rep.petioleAxis.bladeBase, x.lp.D, L), back = Math.min(6, L / 3);
    const cam = { dir: x.lp.N, up: x.lp.D, center: add(tip, x.lp.D, -back / 2), halfHeight: back / 2 + 0.6 };
    cells.push(cell(x.l.P, x.l.N, cam, [`${title} ${word}`, `CENSUS: ${c.pairs} PAIRS${c.pairs ? ` WORST ${f4(c.worst)} MM` : ''}; TEETH OFF: ${off.pairs} PAIRS`,
      `TEETH ${S.countBuilt} OF ${S.countAsked} BUILT${S.tipYield ? `, ${S.tipYield.given} GIVEN UP AT THE TIP` : ''}`, tipWords(x.rep), `${mmpx(cam)} MM/PX`]));
  }
}
/* ---- 15-18. the broad sinus at 0.12, before and after ---- */
{
  const xs = [[flat(BROAD, BG, BR), 'BEFORE (D6D2AB4)'], [flat(BROAD), 'AFTER']];
  const cam = fit(xs.map(([x]) => x.l.P), xs[1][0].lp.N, xs[1][0].lp.D);
  for (const [x, word] of xs) {
    const rb = x.rep.lobed.roundBottoms;
    cells.push(cell(x.l.P, x.l.N, cam, [`A BROAD-SINUS LEAF AT 0.12 ${word}`, `LOBE SHAPE 2.5: EVERY SINUS OPENS AS ASKED`,
      `SINUSES ${rb.sinuses.map((s) => (s.fillet ? `FILLET ${f3(s.radiusMm)}` : s.built ? `U ${f3(s.radiusMm)}` : 'V')).join(' / ')}`,
      `SATURATES AT ${rb.saturatesAt === null ? 'NONE (THE RANGE TOP FITS)' : f4(rb.saturatesAt)}`, `${x.rep.tris} TRIS, ${mmpx(cam)} MM/PX`]));
  }
  /* the macro: ONE camera on sinus 1 of the after tree, both trees */
  const xa = xs[1][0], s = xa.rep.lobed.roundBottoms.sinuses.find((q) => q.fillet) || xa.rep.lobed.roundBottoms.sinuses[0];
  const Lmm = Number(xa.bl.st.leafLength), O = G.lobedOutline(xa.bl.st, Lmm, true);
  const P2 = (u) => { const t = O.tauAt(u), h = Math.max(O.prof.halfWidthBaseAt(u), G.TIP_HALF_MM); return [u * Lmm + h * Math.sin(t), h * Math.cos(t)]; };
  const on = (q) => add(add(xa.rep.petioleAxis.bladeBase, xa.lp.D, q[0]), xa.lp.T, q[1]);
  const fu = s.filletU || [s.u - 0.01, s.u + 0.01], mid = P2((fu[0] + fu[1]) / 2);
  const camz = { dir: xa.lp.N, up: xa.lp.D, center: on(mid), halfHeight: Math.max(2.2, 1.6 * (s.radiusMm || 1)) };
  for (const [x, word] of xs) {
    const q = x.rep.lobed.roundBottoms.sinuses[xa.rep.lobed.roundBottoms.sinuses.indexOf(s)];
    cells.push(cell(x.l.P, x.l.N, camz, [`THE SINUS MACRO ${word}, ONE CAMERA`,
      q.fillet ? `FILLET ${f3(q.radiusMm)} MM (ASKED ${f3(q.radiusAskedMm)}, PITCH ${f3(q.pitchMm)}), TANGENT AT BOTH ARMS` : 'THE V POINT: NO FILLET',
      ...(q.fillet ? [`FROM U ${f4(q.filletU[0])} TO ${f4(q.filletU[1])}, ADDS ${f3(q.addedMm)} MM AT THE V`] : []),
      `AMBER: THE FILLETS TWO TANGENT POINTS, ${mmpx(camz)} MM/PX`], s.filletU ? s.filletU.map((u) => [on(P2(u)), AMBER]) : []));
  }
}
/* ---- 19-21. the real page: the read-out at the tip yield, the control on a broad leaf ---- */
const shots = [];
let yieldLine = null, nibLine = null;
{
  const { server, port } = await serveRepo();
  const { browser, page } = await launchPage({ viewport: { width: 1000, height: 900 } });
  try {
    await openBloom(page, port);
    await page.evaluate(() => { const c = document.getElementById('printPreview'); if (c && !c.checked) c.click(); });
    const go = async (o) => { const bad = await applyConfig(page, Object.entries(o).map(([id, value]) => ({ id, value: String(value) }))); if (bad.length) throw new Error(`config did not take: ${bad.join('; ')}`); };
    await go(TIPYIELD);
    const ro = await page.evaluate(() => document.getElementById('readout').innerText);
    yieldLine = ro.split('\n').find((l) => /TIP gave/i.test(l)) || null;
    nibLine = ro.split('\n').find((l) => /closes on the NIB/i.test(l)) || null;
    for (const v of [0.12, SAT.lobedRound]) {
      await go({ ...SAT, lobedRound: v });
      const info = await page.evaluate(() => {
        const w = document.getElementById('lobedRound').closest('.bl-ctrl');
        for (let d = w.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS') d.open = true;
        w.scrollIntoView({ block: 'center' });
        const R0 = window.__bloomMetrics().leaf.lobedBuilt[0].roundBottoms;
        return { said: w.querySelector('.bl-val').textContent, cap: w.dataset.cap ?? null, capped: w.classList.contains('bl-ctrl--capped'), sat: R0.saturatesAt, preview: document.getElementById('printPreview').checked };
      });
      const png = decodePNG(await page.locator('#lobedRound').locator('xpath=ancestor::*[contains(@class,"bl-ctrl")][1]').screenshot());
      shots.push({ v, info, png });
    }
  } finally { await browser.close(); server.close(); }
}
{
  const x = flat(TIPYIELD), S = x.rep.serration, L = Number(x.bl.st.leafLength);
  const tip = add(x.rep.petioleAxis.bladeBase, x.lp.D, L);
  const cam = { dir: x.lp.N, up: x.lp.D, center: add(tip, x.lp.D, -6), halfHeight: 7 };
  cells.push(cell(x.l.P, x.l.N, cam, ['THE TIP GIVES A TOOTH UP (MATRIX BLOCK 59)', `TEETH ${S.countBuilt} OF ${S.countAsked} BUILT, ${S.tipYield ? S.tipYield.given : 0} GIVEN UP AT THE TIP${S.tipYield ? ` (U ${f4(S.tipYield.atU)})` : ''}`,
    `THE SLIDER KEEPS ${x.bl.st.leafToothCount}. THE READ-OUT SAYS:`, yieldLine ? yieldLine.slice(0, 200) : '(NO TIP-YIELD LINE ON THE READ-OUT)', `${mmpx(cam)} MM/PX`]));
}
for (const { v, info, png } of shots) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const sc = Math.min(CW / png.width, IH / png.height), w = Math.floor(png.width * sc), h = Math.floor(png.height * sc);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const sx = Math.min(png.width - 1, Math.floor(xx / sc)), sy = Math.min(png.height - 1, Math.floor(y / sc)), si = (sy * png.width + sx) * 4, o = ((CAP + 8 + y) * CW + xx) * 3;
    if (CAP + 8 + y >= CH) continue;
    rgb[o] = png.data[si]; rgb[o + 1] = png.data[si + 1]; rgb[o + 2] = png.data[si + 2];
  }
  caption(rgb, [`THE ROUNDNESS CONTROL AT ${v} (THE REAL PAGE)`, `A BROAD-SINUS LEAF (BLOCK 59), PRINT PREVIEW ${info.preview ? 'ON' : 'OFF'}`,
    `ITS FILLET SATURATES AT ${info.sat === null ? 'NONE' : Number(info.sat).toFixed(4)}: THE HATCH FROM ${info.cap} UP (${info.capped ? 'DRAWN' : 'NOT DRAWN'})`,
    /SATURATED/.test(info.said) ? 'THE READ-OUT SAYS SATURATED' : 'LIVE: THE READ-OUT NAMES WHERE IT SATURATES']);
  cells.push(rgb);
}
cells.push(textCell('THE READ-OUT ON THE NIB', [['A LEAF TIP, VERBATIM', nibLine || '(NONE FOUND)'], ['A TIP YIELD, VERBATIM', yieldLine || '(NONE FOUND)']]));

const rows = []; for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4));
const COLS = 4, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H}), ${cells.length} cells`);
