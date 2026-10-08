#!/usr/bin/env node
/* ===================================================================
   shot-bloom-rachis-taper.mjs — THE SHEET FOR THE LOAD-TAPERED RACHIS
   (S3c, Eva's ruling of Oct 8; docs/bloom-leaf-rachis-taper-outcome.md).

     node tools/shot-bloom-rachis-taper.mjs <out.png> --base <worktree of 9dbb8e1>

   ROW 1 — THE ROSE LEAF, #381 AGAINST NOW: one leaf of the rose (block 54's
   first row) in its own plane, the BASE tree's build beside this tree's at ONE
   camera; then the SECTION ALONG THE RACHIS (the plane through its axis and
   the leaf's normal, sliced out of the emitted triangles) for both trees, with
   a mm tick at every pair station; then the RADIUS AGAINST ARC LENGTH — the
   emitted rings of both trees against the area rule's step targets.
   ROW 2 — THE JOINS: the 4 mm and the 6 mm stem in section (the plane through
   the stem and the petiole), the rachis section and profile on the 6 mm, and
   a macro on one stalk rooting into the tapered rachis (the second pair,
   where the rachis is thinnest of the two stations).
   ROW 3 — THE CLAMP: four pairs on the 3 mm solid stem — the leaf, the join
   in section, the rachis section and profile (the taper starts from the BUILT
   2.98 mm, never the asked 3.60) — and the Cup read-out under COMPOUND,
   before (#381) and after.

   PRINT PREVIEW ON: every build is EXPORT mode with the builder's own normals.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC, so no pixel
   delta is quoted and none is owed. Every number is read off the build's own
   record (the plan's taper, the emitted axis rings' radii) or off the
   registry's own `fmt`, never restated; mm per pixel on every rendered cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
const bi = process.argv.indexOf('--base');
const BASE = bi > 0 ? process.argv[bi + 1] : null;
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-rachis-taper.mjs <out.png> --base <worktree of 9dbb8e1>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const G0 = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const R0 = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 96, IH = CH - CAP;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const TEAL = [111, 183, 174], GREY = [150, 146, 138], INK = [240, 236, 226], AMBER = [214, 161, 92], WHITE = [250, 248, 240];
const f2 = (x) => x.toFixed(2);

const ROSE = { stemLength: 120, stemDiameter: 4.5, leafLength: 40, leafType: 'COMPOUND', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5,
  stemNodeKink: 0.8, stemNodeSwelling: 0.25, leafArch: 10, leafCup: 0.28 };
const ONE = { stemLength: 120, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND' };

function build(over, old = false) {
  const g = old ? G0 : G, D = old ? R0.DEFAULTS : R.DEFAULTS;
  const st = { ...D, ...over };
  const acc = new g.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = g.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, L: b.leaf, leaves: b.leavesBuilt || [], old };
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
/* captions wrap at the cell width — the bitmap font is 6 px a character */
function wrap(lines) {
  const outL = [];
  for (const l of lines) {
    /* the bitmap font has letters, digits and ` -.:/%(),` only */
    let s = String(l).replace(/->/g, ' TO ').replace(/#/g, 'PR ').replace(/[\u2019']/g, '').replace(/\u00b7/g, ',').replace(/\u00b0/g, ' DEG').replace(/[\u2013\u2014]/g, '-').toUpperCase();
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
function leafPlane(bl, i = 0) {
  const C = bl.leaves[i].petioleAxis, th = (bl.L.angleDeg * Math.PI) / 180, az = bl.L.azimuths.flat()[i];
  const Rr = [Math.cos(az), Math.sin(az), 0];
  const D = [Rr[0] * Math.cos(th), Rr[1] * Math.cos(th), Math.sin(th)], N = [-Rr[0] * Math.sin(th), -Rr[1] * Math.sin(th), Math.cos(th)];
  return { D, N, R: Rr, T: [-Rr[1], Rr[0], 0], az, root: C.inner, base: C.outer };
}
function slice(P, C, D, T, N) {
  const segs = [];
  for (let t = 0; t < P.length; t += 9) {
    const v = [0, 1, 2].map((k) => [P[t + 3 * k], P[t + 3 * k + 1], P[t + 3 * k + 2]]);
    const s = v.map((q) => dot(sub(q, C), T));
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = e, b = (e + 1) % 3;
      if ((s[a] < 0) !== (s[b] < 0)) { const f = s[a] / (s[a] - s[b]); const q = add(v[a], sub(v[b], v[a]), f); pts.push([dot(sub(q, C), D), dot(sub(q, C), N)]); }
    }
    if (pts.length === 2) segs.push(pts);
  }
  return segs;
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
/* THE JOIN in section: the plane through the stem's axis and the petiole */
function joinSection(bl, name, extra, spanMm) {
  const lp = leafPlane(bl, 0), outerR = bl.b.stem.outerR;
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const sc = (CW - 24) / spanMm;
  const atD = outerR * 0.6 + spanMm * 0.15, atN = Math.tan((bl.L.angleDeg * Math.PI) / 180) * atD * 0.6 + 0.5;
  const X = (a) => CW / 2 + (a - atD) * sc, Y = (n) => CAP + IH / 2 - (n - atN) * sc;
  for (const [p, q] of slice(bl.acc.positions, lp.root, lp.R, lp.T, [0, 0, 1])) line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), WHITE, 1);
  line(rgb, 14, CH - 14, 14 + sc, CH - 14, TEAL, 1);
  const pe = bl.L.compound.petiole;
  caption(rgb, [name, `PETIOLE ASKS ${f2(2 * pe.askedMm)} MM, THE STEM HOLDS ${f2(2 * pe.capMm)}, BUILT ${f2(2 * pe.radiusMm)}${pe.clamped ? ' CLAMPED' : ''}`, ...extra, 'TEAL BAR: 1 MM']);
  return rgb;
}
/* THE RACHIS, its stations and the axis rod as EMITTED: each ring's arc
   length from the rachis base (the arc is straight here: arch 0) and radius */
function rachisRecord(bl, i = 0) {
  const rep = bl.leaves[i], cp = bl.L.compound;
  const bb = rep.petioleAxis.outer, lp = leafPlane(bl, i);
  const rings = rep.axisRod.centres.map((c, j) => ({ s: dot(sub(c, bb), lp.D), r: rep.axisRod.radii[j] }));
  return { rings, stations: cp.lateral.map((q) => q.stationMm), L: cp.rachisMm, ts: cp.terminalStalkMm, wire: cp.wireR, cp, bb, lp };
}
/* the area rule's own STEP targets (the floor any profile must stand on):
   `wire sqrt(n)` over each stretch, n the leaflets carried beyond, held at
   or under the BUILT petiole — the ruling's words, drawn as the step */
function stepTargets(rr, builtR) {
  const st = rr.stations, n0 = 2 * st.length + 1, segs = [];
  let a = 0, n = n0;
  for (const s of st) { segs.push([a, s, Math.min(builtR, rr.wire * Math.sqrt(n))]); a = s; n -= 2; }
  segs.push([a, rr.L + rr.ts, rr.wire]);
  return segs;
}
/* THE SECTION ALONG THE RACHIS: the plane through the axis and the leaf's
   normal (normal T, across the leaf), drawn in (D, N) with the across axis
   EXAGGERATED x4 (stated) — at true scale a 2.7 mm rod on a 47 mm run is a
   line; ticks and mm marks at every pair station */
function rachisSection(bls, names, cols, lines) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const rr0 = rachisRecord(bls[0]);
  const span = rr0.L + rr0.ts + 6, EX = 4;
  const sc = (CW - 24) / span;
  const X = (a) => 12 + (a + 3) * sc;
  bls.forEach((bl, k) => {
    const rr = rachisRecord(bl);
    const yc = CAP + IH * (bls.length === 1 ? 0.5 : (k + 0.6) / (bls.length + 0.2));
    const Y = (n) => yc - n * sc * EX;
    for (const [p, q] of slice(bl.acc.positions, rr.bb, rr.lp.D, rr.lp.T, rr.lp.N)) {
      if (Math.abs(p[1]) > 4 || Math.abs(q[1]) > 4 || p[0] < -3 || q[0] > rr.L + rr.ts + 3) continue;
      line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), cols[k], 1);
    }
    for (const s of rr.stations) { line(rgb, X(s), Y(-2.2), X(s), Y(-1.8), AMBER, 1); text(rgb, CW, CH, Math.round(X(s)) - 8, Math.round(Y(-2.2)) + 3, `${s.toFixed(0)}`, AMBER, 1); }
    line(rgb, X(rr.L), Y(-2.2), X(rr.L), Y(-1.8), AMBER, 1); text(rgb, CW, CH, Math.round(X(rr.L)) - 8, Math.round(Y(-2.2)) + 3, `${rr.L.toFixed(0)}`, AMBER, 1);
    text(rgb, CW, CH, 8, Math.round(Y(2.2)) - 9, names[k], cols[k], 1);
  });
  line(rgb, 14, CH - 14, 14 + 10 * sc, CH - 14, TEAL, 1);
  caption(rgb, [...lines, 'ACROSS AXIS x4 (STATED); AMBER TICKS: MM ALONG THE RACHIS AT EACH PAIR AND THE TIP; TEAL BAR: 10 MM']);
  return rgb;
}
/* THE RADIUS AGAINST ARC LENGTH: the area rule's step targets (grey), the
   rings each tree EMITTED (teal now, amber #381) joined as the mesh joins
   them — linearly — and the pair stations dotted */
function profileCell(bls, cols, names, lines) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const recs = bls.map((bl) => rachisRecord(bl));
  const r0 = recs[0], built = bls[bls.length - 1].L.compound.petiole.radiusMm;
  const sMax = r0.L + r0.ts, rMax = Math.max(...recs.flatMap((q) => q.rings.map((x) => x.r))) * 1.15;
  const x0 = 34, x1 = CW - 12, y0 = CAP + 14, y1 = CH - 34;
  const X = (s) => x0 + ((s + 4) / (sMax + 6)) * (x1 - x0), Y = (r) => y1 - (r / rMax) * (y1 - y0);
  line(rgb, x0, y1, x1, y1, GREY, 1); line(rgb, x0, y0, x0, y1, GREY, 1);
  for (let d = 0.5; d < 2 * rMax; d += 0.5) { line(rgb, x0 - 3, Y(d / 2), x0, Y(d / 2), GREY, 1); if (Math.abs(d - Math.round(d)) < 1e-9) text(rgb, CW, CH, 4, Math.round(Y(d / 2)) - 3, d.toFixed(1), GREY, 1); }
  for (let s = 0; s <= sMax; s += 10) { line(rgb, X(s), y1, X(s), y1 + 3, GREY, 1); text(rgb, CW, CH, Math.round(X(s)) - 6, y1 + 6, `${s}`, GREY, 1); }
  for (const s of r0.stations) for (let y = y0; y < y1; y += 6) line(rgb, X(s), y, X(s), y + 2, AMBER, 1);
  for (const [a, b, r] of stepTargets(r0, built)) { line(rgb, X(a), Y(r), X(b), Y(r), GREY, 2); }
  recs.forEach((rec, k) => {
    const pts = rec.rings.filter((q) => q.s > -1).sort((p, q) => p.s - q.s || q.r - p.r);
    for (let j = 0; j + 1 < pts.length; j++) line(rgb, X(pts[j].s), Y(pts[j].r), X(pts[j + 1].s), Y(pts[j + 1].r), cols[k], 1);
    for (const q of pts) for (let dx = -2; dx <= 2; dx++) line(rgb, X(q.s) + dx, Y(q.r) - 2, X(q.s) + dx, Y(q.r) + 2, cols[k], 1);
    text(rgb, CW, CH, x1 - 110, y0 + 4 + 12 * k, names[k], cols[k], 1);
  });
  text(rgb, CW, CH, x1 - 110, y0 + 4 + 12 * recs.length, 'AREA RULE (STEP)', GREY, 1);
  caption(rgb, [...lines, 'DIAMETER (MM) AGAINST ARC LENGTH FROM THE RACHIS BASE (MM); AMBER: PAIR STATIONS']);
  return rgb;
}
function textCell(title, blocks) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const all = [title, ''];
  for (const [h, body] of blocks) { all.push(h); all.push(...wrap([body]).map((x) => '  ' + x)); all.push(''); }
  wrap(all).forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
const taperLine = (bl) => {
  const T = bl.L.compound.rachis && bl.L.compound.rachis.taper;
  return T ? `RACHIS ${T.knots.map((k) => f2(2 * k.rMm)).join(' TO ')} MM` : `RACHIS ${f2(2 * bl.L.compound.wireR)} MM THROUGHOUT (THE WIRE)`;
};
const rows = [];
/* ---- ROW 1: the rose leaf, #381 against now ---- */
{
  const r = [];
  const o = build(ROSE, true), n = build(ROSE);
  const lp = leafPlane(n), lo = leafOf(o, 0), ln = leafOf(n, 0);
  const cat = new Float64Array(lo.P.length + ln.P.length); cat.set(lo.P, 0); cat.set(ln.P, lo.P.length);
  const cam = fit(cat, lp.N, lp.D);
  r.push(cell(lo.P, lo.N, cam, ['#381 (9DBB8E1): THE ROSE LEAF', `PETIOLE ${f2(2 * o.L.compound.petiole.radiusMm)} MM, A 45 DEG CONE, ${taperLine(o)}`, `${o.leaves[0].tris} TRIS A LEAF`, `ONE CAMERA FOR BOTH, ${mmpx(cam)} MM/PX`]));
  r.push(cell(ln.P, ln.N, cam, ['NOW: THE ROSE LEAF, TAPERED BY LOAD', `PETIOLE ${f2(2 * n.L.compound.petiole.radiusMm)} MM, ${taperLine(n)}`, `${n.leaves[0].tris} TRIS A LEAF`, `ONE CAMERA FOR BOTH, ${mmpx(cam)} MM/PX`]));
  /* a macro on the rachis base, both trees, one camera: where #381's cone stood */
  const camM = { dir: lp.N, up: lp.D, center: add(n.leaves[0].petioleAxis.outer, lp.D, 6), halfHeight: 9 };
  const mo = cell(lo.P, lo.N, camM, ['#381 MACRO: THE CONE TO THE WIRE', 'THE RACHIS BASE AND THE FIRST PAIR', `${mmpx(camM)} MM/PX, ONE CAMERA`]);
  const mn = cell(ln.P, ln.N, camM, ['NOW MACRO: STRAIGHT ON TO THE FIRST PAIR', 'THE RACHIS BASE AND THE FIRST PAIR', `${mmpx(camM)} MM/PX, ONE CAMERA`]);
  const oneO = build(ONE, true), oneN = build(ONE);
  r.push(rachisSection([oneO, oneN], ['PR 381', 'NOW'], [AMBER, WHITE], ['THE SECTION ALONG THE RACHIS', 'THE SHIPPED COMPOUND DEFAULTS, ONE LEAF, 6 MM STEM, ARCH 0']));
  r.push(profileCell([oneN, oneO], [TEAL, AMBER], ['NOW', 'PR 381'], ['THE RADIUS AGAINST ARC LENGTH', `NOW ${taperLine(oneN)}`]));
  r.push(textCell('THE KNOTS (THE PLAN’S OWN TAPER)', oneN.L.compound.rachis.taper.knots.map((k, j) => [`KNOT ${j}`, `S ${k.sMm.toFixed(2)} MM, ${f2(2 * k.rMm)} MM ACROSS, CARRYING ${k.carried}`]).concat([
    ['STRETCHES (L/D AT THE THINNEST END)', oneN.L.compound.slenderness.stretches.map((q) => `${q.fromMm.toFixed(0)}-${q.toMm.toFixed(0)} MM ${q.ld.toFixed(1)}`).join(', ')],
    ['#381', `RACHIS + TERMINAL STALK AT THE WIRE, L/D ${oneO.L.compound.slenderness.ld.toFixed(1)}`]])));
  rows.push([r[0], r[1], mo, mn, r[2], r[3], r[4]]);
}
/* ---- ROW 2: the joins, and a stalk rooting into the taper ---- */
{
  const r = [];
  const j4 = build({ ...ONE, stemDiameter: 4 }), j6 = build(ONE);
  r.push(joinSection(j4, 'THE 4 MM STEM JOIN, SECTION', ['THE PETIOLE RUNS STRAIGHT TO THE RACHIS, NO CONE', taperLine(j4)], 12));
  r.push(joinSection(j6, 'THE 6 MM STEM JOIN (SHIPS), SECTION', ['NO CONE: THE CAP BINDS THE ROOT ONLY', taperLine(j6)], 14));
  /* the stalk macro: the second pair, viewed across the leaf plane */
  const rep = j6.leaves[0], lp = leafPlane(j6), q = rep.leaflets[2];
  const lo = leafOf(j6, 0);
  const camS = { dir: lp.N, up: lp.D, center: add(q.root, q.D, 1.2), halfHeight: 4.2 };
  const rr = rachisRecord(j6), st = j6.L.compound.lateral[1].stationMm;
  const rAt = G.compoundRachisRadiusMm(j6.L.compound.rachis.taper, st);
  r.push(cell(lo.P, lo.N, camS, ['A STALK ROOTING INTO THE TAPER (MACRO)', `THE SECOND PAIR AT ${st.toFixed(1)} MM: THE RACHIS ${f2(2 * rAt)} MM, THE STALK ${f2(2 * j6.L.compound.stalkR)} MM (THE WIRE)`, 'THE STALK ROOTS ON THE RACHIS AXIS, BURIED BY THE STATION’S OWN RADIUS', `${mmpx(camS)} MM/PX`]));
  /* the same stalk in section: the plane of the leaf (normal N) through the rachis axis */
  const sec = Buffer.alloc(CW * CH * 3, 18);
  const span = 12, sc = (CW - 24) / span;
  const C = rachisRecord(j6).bb;
  const X = (a) => CW / 2 + (a - (st + 2)) * sc, Y = (n) => CAP + IH / 2 - (n - 1.5) * sc;
  for (const [p, qq] of slice(j6.acc.positions, C, lp.D, lp.N, lp.T)) line(sec, X(p[0]), Y(p[1]), X(qq[0]), Y(qq[1]), WHITE, 1);
  line(sec, 14, CH - 14, 14 + sc, CH - 14, TEAL, 1);
  caption(sec, ['THE SAME STALKS IN SECTION (THE LEAF PLANE)', `THE RACHIS (THE TWO LONG LINES) ${f2(2 * rAt)} MM AT THE STATION; BOTH STALK RODS (THE RECTANGLES) ROOT ON ITS AXIS, INSIDE ITS SECTION, AND LEAVE AT ${j6.L.compound.angleDeg} DEG`, 'TEAL BAR: 1 MM']);
  r.push(sec);
  r.push(profileCell([j4, j6], [TEAL, WHITE], ['4 MM STEM', '6 MM STEM'], ['RADIUS AGAINST ARC LENGTH, 4 AND 6 MM STEMS', 'ONE TAPER: NEITHER CAP BINDS AT 35 DEG']));
  rows.push(r);
}
/* ---- ROW 3: four pairs on the 3 mm stem, and the Cup read-out ---- */
{
  const r = [];
  const c3 = build({ ...ONE, stemDiameter: 3, leafletPairs: 4 }), c3o = build({ ...ONE, stemDiameter: 3, leafletPairs: 4 }, true);
  const lp = leafPlane(c3), lc = leafOf(c3, 0);
  const cam = fit(lc.P, lp.N, lp.D);
  r.push(cell(lc.P, lc.N, cam, ['4 PAIRS ON THE 3 MM STEM (THE CLAMP)', `PETIOLE ASKS ${f2(2 * c3.L.compound.petiole.askedMm)} MM, BUILT ${f2(2 * c3.L.compound.petiole.radiusMm)} CLAMPED`, taperLine(c3), `${c3.leaves[0].tris} TRIS A LEAF, ${mmpx(cam)} MM/PX`]));
  r.push(joinSection(c3, 'THE 3 MM JOIN, SECTION', ['THE TAPER STARTS FROM THE BUILT VALUE'], 10));
  r.push(profileCell([c3, c3o], [TEAL, AMBER], ['NOW', 'PR 381'], ['4 PAIRS ON 3 MM: RADIUS AGAINST ARC LENGTH', 'THE FIRST TWO KNOTS HELD AT THE BUILT 2.98 MM, NEVER THE ASKED 3.17 / 3.60']));
  /* the Cup read-out under COMPOUND, from each tree's own registry `fmt` */
  const fmtOf = (Reg, ui) => Reg.CONTROLS.find((c) => c.id === 'leafCup').fmt(ui.leafCup, ui, null);
  const uiN = (o) => ({ ...R.DEFAULTS, ...ONE, ...o }), uiO = (o) => ({ ...R0.DEFAULTS, ...ONE, ...o });
  r.push(textCell('THE CUP READ-OUT UNDER COMPOUND, BEFORE', [
    ['DEFAULTS', fmtOf(R0, uiO({}))], ['LEAFLET WIDTH 30', fmtOf(R0, uiO({ leafletWidth: 30 }))], ['TERMINAL WIDTH 10', fmtOf(R0, uiO({ leafletWidth: 30, leafletTerminalWidth: 10 }))]]));
  r.push(textCell('THE CUP READ-OUT UNDER COMPOUND, AFTER', [
    ['DEFAULTS', fmtOf(R, uiN({}))], ['LEAFLET WIDTH 30', fmtOf(R, uiN({ leafletWidth: 30 }))], ['TERMINAL WIDTH 10', fmtOf(R, uiN({ leafletWidth: 30, leafletTerminalWidth: 10 }))]]));
  rows.push(r);
}
/* pack every cell five to a row, in the order written */
{ const flat = rows.flat(); rows.length = 0; for (let i = 0; i < flat.length; i += 5) rows.push(flat.slice(i, i + 5)); }
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
