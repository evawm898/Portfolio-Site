#!/usr/bin/env node
/* ===================================================================
   shot-bloom-leaf-compound-rose.mjs — THE SHEET FOR THE COMPOUND RETUNE
   (Eva's rulings on #380; docs/bloom-leaf-compound-retune-outcome.md).

     node tools/shot-bloom-leaf-compound-rose.mjs <out.png> --base <worktree of 2792504>

   ROW 1 — THE ROSE, the headline, on the PROPOSED defaults: alternate at
   137.5 x 4 nodes with the node kink, two lateral pairs and a larger terminal,
   ovate and entire. Three-quarter, side-on, from below, one leaf in its own
   plane, and the terminal leaflet's own outline in millimetres.
   ROW 2 — OLD AGAINST NEW AT ONE CAMERA: one compound leaf at #380's shipped
   defaults (built by the BASE tree, its own registry's DEFAULTS) beside one at
   the proposed defaults, one camera fitted to both; the rose as #380 drew it
   (its twelve fine teeth) beside the rose now, one camera; and the two
   terminal leaflets' half-width profiles laid over each other.
   ROW 3 — THE PETIOLE-TO-STEM JOIN, macro, at a 4 mm stem (the diameter the
   ruling names): side-on, and in SECTION — the plane through the stem's axis
   and the petiole's, sliced out of the emitted triangles; then the same
   section with a SIMPLE leaf (the wire, unmoved), on the 6 mm stem that
   actually ships, and on a 12 mm hollow stem.
   ROW 4 — THE CLAMP BINDING: the 3 mm solid stem at four pairs (side-on and
   in section), the same stem at leafAngle 90 (the cap is the wall), the
   leaning node, and the sheet at 2.4 x 85 deg (the cap under the wire).
   ROW 5 — SERRATION ON, on the proposed defaults: off (the default), the
   block-55 fine serration, the depth at its maximum, and the leaflet tip at
   both ends of its range — one leaf, one camera.

   PRINT PREVIEW ON: every build is EXPORT mode with the builder's own normals
   (`captureNormals`), which is what the page's print preview shades with.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC, so no pixel
   delta is quoted and none is owed. Every caption number is read off the
   build's own record (the plan's `compound.petiole`, the leaflet records, the
   triangle tallies), never restated; mm per pixel on every rendered cell, a
   1 mm teal bar on every section.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
const bi = process.argv.indexOf('--base');
const BASE = bi > 0 ? process.argv[bi + 1] : null;
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-leaf-compound-rose.mjs <out.png> --base <worktree of 2792504>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const G0 = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const R0 = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 84, IH = CH - CAP;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];
const TEAL = [111, 183, 174], GREY = [150, 146, 138], INK = [240, 236, 226];

/* THE ROSE the matrix carries (block 54's first row) on THIS tree, and the
   rose #380 shipped on the BASE tree (its twelve fine teeth). */
const ROSE_NEW = { stemLength: 120, stemDiameter: 4.5, leafLength: 40, leafType: 'COMPOUND', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5,
  stemNodeKink: 0.8, stemNodeSwelling: 0.25, leafArch: 10, leafCup: 0.28 };
const ROSE_OLD = { ...ROSE_NEW, leafToothCount: 12, leafToothDepth: 0.12, leafCrestShape: 1.6, leafNotchShape: 1.6 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND' };

function build(over, old = false) {
  const g = old ? G0 : G, D = old ? R0.DEFAULTS : R.DEFAULTS;
  const st = { ...D, ...over };
  const acc = new g.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = g.buildBloomInto(acc, st, { below: null });
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
function cell(P, Nrm, cam, lines) {
  const img = render(P, CW, IH, cam, { color: [214, 206, 190], normals: Nrm });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, IH, 0, CAP);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
const mmpx = (cam) => ((2 * cam.halfHeight) / IH).toFixed(3);
function leafPlane(bl, i = 0) {
  const C = bl.leaves[i].petioleAxis, th = (bl.L.angleDeg * Math.PI) / 180, az = bl.L.azimuths.flat()[i];
  const Rr = [Math.cos(az), Math.sin(az), 0];
  const D = [Rr[0] * Math.cos(th), Rr[1] * Math.cos(th), Math.sin(th)], N = [-Rr[0] * Math.sin(th), -Rr[1] * Math.sin(th), Math.cos(th)];
  return { D, N, R: Rr, T: [-Rr[1], Rr[0], 0], az, root: C.inner, base: C.outer };
}
const f2 = (x) => x.toFixed(2);
/* the plan's petiole record, in DIAMETERS — the record holds radii */
const petLines = (cp) => {
  const p = cp.petiole;
  return [`PETIOLE ASKS ${f2(2 * p.askedMm)} MM (THE WIRE x SQRT ${cp.count})`, `THE STEM HOLDS ${f2(2 * p.capMm)} MM, BUILT ${f2(2 * p.radiusMm)} MM${!p.thickens ? ' (THE WIRE)' : p.clamped ? ' CLAMPED' : ''}`,
    p.thickens ? `A ${f2(p.coneMm)} MM 45 DEG CONE TO THE ${f2(2 * cp.wireR)} MM RACHIS` : `CAP UNDER THE WIRE: THE PETIOLE STAYS ${f2(2 * cp.wireR)} MM`];
};

/* ---- the section: a plane through `C` with normal `T`, cut out of the given
   triangles, drawn in (D, N) millimetres (S3's sheet's own slicer) ---- */
function slice(P, C, D, T, N) {
  const segs = [];
  for (let t = 0; t < P.length; t += 9) {
    const v = [0, 1, 2].map((k) => [P[t + 3 * k], P[t + 3 * k + 1], P[t + 3 * k + 2]]);
    const s = v.map((q) => dot(sub(q, C), T));
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = e, b = (e + 1) % 3;
      if ((s[a] < 0) !== (s[b] < 0)) {
        const f = s[a] / (s[a] - s[b]);
        const q = add(v[a], sub(v[b], v[a]), f);
        pts.push([dot(sub(q, C), D), dot(sub(q, C), N)]);
      }
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
/* `atD`, `atN`: the (D, N) millimetres at the cell's centre */
function sectionCell(P, C, D, T, N, atD, atN, span, lines) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const sc = (CW - 24) / span;
  const X = (a) => CW / 2 + (a - atD) * sc, Y = (n) => CAP + IH / 2 - (n - atN) * sc;
  for (const [p, q] of slice(P, C, D, T, N)) line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), [250, 248, 240], 1);
  line(rgb, 14, CH - 14, 14 + sc, CH - 14, TEAL, 1);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
/* THE JOIN: side-on (looking along the leaf plane's normal through the stem)
   and in section (the plane through the stem axis and the petiole axis) */
/* THE JOIN CELLS STAND ON A 120 mm STEM: on 70 mm a steep leaf's inset puts
   its one node within a centimetre of the florist's cut, and the section then
   shows the plug's bore floor beside the join it is about. */
function joinCells(bl, name, extra, spanMm = 10, both = true) {
  const lp = leafPlane(bl, 0), cp = bl.L.compound;
  const outerR = bl.b.stem.outerR;
  const out = [];
  /* the section's origin: the rooted end; the window centred a stem radius
     out and half that up, so the wall, the root and the cone are all in it */
  const C = lp.root;
  /* the rise is bounded: at a steep leaf the petiole runs up beside the stem
     and tan(angle) would put the window off the picture */
  const steep = bl.L.angleDeg >= 80;
  const atD = steep ? outerR * 0.4 : outerR * 0.6;
  const atN = steep ? spanMm * 0.3 : outerR * 0.6 * Math.tan((bl.L.angleDeg * Math.PI) / 180) * 0.5 + 0.5;
  const lines = [name, ...(cp ? petLines(cp) : [`SIMPLE: THE PETIOLE IS THE WIRE, ${f2(2 * bl.L.petioleR)} MM`, 'UNMOVED BY THE RETUNE', '']), ...extra, 'TEAL BAR: 1 MM'];
  if (both) {
    const cam = { dir: lp.T, up: [0, 0, 1], center: add(add(C, lp.R, atD), [0, 0, 1], atN), halfHeight: (spanMm * IH) / (CW - 24) / 2 };
    out.push(cell(bl.acc.positions, bl.acc.normals, cam, [name.replace('SECTION', 'SIDE-ON'), ...(cp ? petLines(cp) : []), `STEM ${f2(2 * outerR)} MM, LEAF AT ${bl.L.angleDeg} DEG`, `SIDE-ON TO THE LEAF, ${mmpx(cam)} MM/PX`]));
  }
  out.push(sectionCell(bl.acc.positions, C, lp.R, lp.T, [0, 0, 1], atD, atN, spanMm, lines));
  return out;
}

const rows = [];
/* ---- ROW 1: the rose on the proposed defaults ---- */
const roseN = build(ROSE_NEW);
{
  const r = [];
  const rose = roseN, rep = rose.leaves[0], cp = rose.L.compound;
  const P = rose.acc.positions, Nm = rose.acc.normals;
  const tq = fit(P, nrm([-0.55, -0.65, -0.52]), [0, 0, 1]);
  r.push(cell(P, Nm, tq, ['THE ROSE, PROPOSED DEFAULTS (HEADLINE)', 'ALTERNATE 137.5 x 4, KINK 0.8, SWELL 0.25', `${cp.pairs} PAIRS + A LARGER TERMINAL, ARCH 10`, `OVATE, ENTIRE (SERRATION OFF), TIP ${rose.L.tipShape.toFixed(2)}`, `${rose.leaves.length} LEAVES, ${rep.tris} TRIS EACH, ${rose.acc.triangleCount} TOTAL`, `EXPORT (PRINT PREVIEW), ${mmpx(tq)} MM/PX`]));
  const side = fit(P, [0, -1, 0], [0, 0, 1]);
  r.push(cell(P, Nm, side, ['THE ROSE, SIDE-ON', `STEM ${rose.b.stem.lengthMm} x ${f2(2 * rose.b.stem.outerR)} MM`, `RACHIS ${cp.rachisMm} MM, LEAFLETS AT ${cp.lateral.map((q) => q.stationMm.toFixed(0)).join(', ')} MM`, ...petLines(cp).slice(0, 2), `${mmpx(side)} MM/PX`]));
  const below = fit(P, [0, 0, -1], [0, 1, 0]);
  r.push(cell(P, Nm, below, ['THE ROSE FROM BELOW', `THE ${rose.leaves.length} LEAVES ROUND THE SPIRAL`, `LATERAL ${cp.lateral.map((q) => `${q.lengthMm.toFixed(0)}x${q.widthMm.toFixed(0)}`).join(' ')} MM`, `TERMINAL ${cp.terminal.lengthMm}x${cp.terminal.widthMm} MM`, `TOP NODE ${rose.L.nodeDepthsMm[0].toFixed(1)} MM DOWN`, `${mmpx(below)} MM/PX`]));
  const lp = leafPlane(rose), lo = leafOf(rose, 0);
  const own = fit(lo.P, lp.N, lp.D);
  r.push(cell(lo.P, lo.N, own, ['ONE ROSE LEAF, IN ITS OWN PLANE', `${rep.leaflets.length} LEAFLETS: ${rep.leaflets.map((q) => `${q.lengthMm.toFixed(0)}x${q.widthMm.toFixed(0)}`).join(' ')}`, 'LEAFLETS LARGE AGAINST THE RACHIS', `RACHIS ${cp.rachisMm} MM, STALKS ${cp.stalkMm} / ${cp.terminalStalkMm} MM`, `${rep.tris} TRIS`, `THE LEAF ALONE, ${mmpx(own)} MM/PX`]));
  r.push(outlineCell([[roseN.leaves[0].leaflets.at(-1), TEAL, 'NOW']], ['THE TERMINAL LEAFLET, MEASURED', 'HALF-WIDTH ALONG ITS LENGTH, IN MM', 'READ OFF THE EMITTED ROWS', '(THE BUILDER RECORD)']));
  rows.push(r);
}
/* the half-width profile of a leaflet, read off its builder record: each row's
   centre projected on the leaflet's own D from its base, and its half-width */
function profileOf(q) {
  return q.rowCentre.map((c, i) => [dot(sub(c, q.base), q.D), q.rowHalfMm[i]]);
}
function outlineCell(list, lines) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const profs = list.map(([q, col, tag]) => ({ p: profileOf(q), col, tag, q }));
  const Lmax = Math.max(...profs.map((o) => Math.max(...o.p.map((x) => x[0]))));
  const Hmax = Math.max(...profs.map((o) => Math.max(...o.p.map((x) => x[1]))));
  const sc = Math.min((IH - 40) / (Lmax + 2), (CW - 30) / (2 * Hmax + 2));
  const X = (h) => CW / 2 + h * sc, Y = (u) => CH - 30 - u * sc;
  for (const o of profs) {
    for (let i = 0; i + 1 < o.p.length; i++) {
      const [a0, h0] = o.p[i], [a1, h1] = o.p[i + 1];
      line(rgb, X(h0), Y(a0), X(h1), Y(a1), o.col, 1); line(rgb, X(-h0), Y(a0), X(-h1), Y(a1), o.col, 1);
    }
  }
  line(rgb, 14, CH - 14, 14 + sc, CH - 14, TEAL, 1);
  const extra = profs.map((o) => {
    let ai = 0; o.p.forEach((x, i) => { if (x[1] > o.p[ai][1]) ai = i; });
    return `${o.tag}: ${o.q.lengthMm.toFixed(0)}x${o.q.widthMm.toFixed(0)} MM, WIDEST AT ${(o.p[ai][0] / o.q.lengthMm).toFixed(2)} L`;
  });
  [...lines, ...extra, 'TEAL BAR: 1 MM'].forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, INK, 1));
  return rgb;
}
/* ---- ROW 2: old against new, one camera ---- */
{
  const r = [];
  const oldL = build(ONE, true), newL = build(ONE);
  const lpO = leafPlane(oldL), lo = leafOf(oldL, 0), ln = leafOf(newL, 0);
  const cat = new Float64Array(lo.P.length + ln.P.length); cat.set(lo.P, 0); cat.set(ln.P, lo.P.length);
  const cam = fit(cat, lpO.N, lpO.D);
  const desc = (bl) => { const cp = bl.L.compound; return [`${cp.count} LEAFLETS: ${bl.leaves[0].leaflets.map((q) => `${q.lengthMm.toFixed(0)}x${q.widthMm.toFixed(0)}`).join(' ')}`, `TEETH ${bl.leaves[0].leaflets.map((q) => q.serrationBuilt).join('/')}, TIP ${bl.L.tipShape.toFixed(2)}`, `${bl.leaves[0].tris} TRIS A LEAF`]; };
  r.push(cell(lo.P, lo.N, cam, ['OLD: 2792504 SHIPPED DEFAULTS', ...desc(oldL), `ROD ${f2(2 * oldL.L.compound.stalkR)} MM THROUGHOUT (THE WIRE)`, `ONE CAMERA FOR BOTH, ${mmpx(cam)} MM/PX`]));
  r.push(cell(ln.P, ln.N, cam, ['NEW: THE PROPOSED DEFAULTS', ...desc(newL), `PETIOLE ${f2(2 * newL.L.compound.petiole.radiusMm)} MM, RACHIS ${f2(2 * newL.L.compound.wireR)}`, `ONE CAMERA FOR BOTH, ${mmpx(cam)} MM/PX`]));
  const roseO = build(ROSE_OLD, true);
  const both = new Float64Array(roseO.acc.positions.length + roseN.acc.positions.length);
  both.set(roseO.acc.positions, 0); both.set(roseN.acc.positions, roseO.acc.positions.length);
  const side = fit(both, [0, -1, 0], [0, 0, 1]);
  r.push(cell(roseO.acc.positions, roseO.acc.normals, side, ['OLD: THE ROSE AS 2792504 DREW IT', '12 FINE TEETH AT 0.12, POINTED TIPS', `TEETH BUILT ${roseO.leaves[0].leaflets.map((q) => q.serrationBuilt).join('/')}`, `${roseO.acc.triangleCount} TRIS`, 'SIDE-ON, ONE CAMERA FOR BOTH', `${mmpx(side)} MM/PX`]));
  r.push(cell(roseN.acc.positions, roseN.acc.normals, side, ['NEW: THE ROSE NOW', 'OVATE, ENTIRE, A LARGER TERMINAL', `TEETH BUILT ${roseN.leaves[0].leaflets.map((q) => q.serrationBuilt).join('/')}`, `${roseN.acc.triangleCount} TRIS`, 'SIDE-ON, ONE CAMERA FOR BOTH', `${mmpx(side)} MM/PX`]));
  r.push(outlineCell([[oldL.leaves[0].leaflets.at(-1), GREY, 'OLD (GREY)'], [newL.leaves[0].leaflets.at(-1), TEAL, 'NEW (TEAL)']], ['THE TERMINAL LEAFLET, OLD AND NEW', 'HALF-WIDTH ALONG ITS LENGTH', 'BOTH BASES AT THE BOTTOM']));
  rows.push(r);
}
/* ---- ROW 3: the join at 4 mm, and against the other stems ---- */
{
  const r = [];
  const j4 = build({ ...ONE, stemLength: 120, stemDiameter: 4 });
  r.push(...joinCells(j4, 'THE JOIN AT A 4 MM STEM, SECTION', ['THE PLANE THROUGH STEM AND PETIOLE', 'THE PETIOLE ROOTS THROUGH THE WALL'], 9));
  const s4 = build({ ...ONE, stemLength: 120, stemDiameter: 4, leafType: 'SIMPLE' });
  r.push(...joinCells(s4, 'SIMPLE LEAF, 4 MM STEM, SECTION', ['THE SAME CAMERA'], 9, false));
  const j6 = build({ ...ONE, stemLength: 120, stemDiameter: 6 });
  r.push(...joinCells(j6, 'THE 6 MM STEM THAT SHIPS, SECTION', ['(THE STEM DEFAULT IS 6 MM, NOT 4)'], 11, false));
  const j12 = build({ ...ONE, stemLength: 120, stemDiameter: 12, leafletPairs: 4 });
  r.push(...joinCells(j12, '12 MM HOLLOW x 4 PAIRS, SECTION', ['THE BORE INSIDE A 1.5 MM WALL'], 16, false));
  rows.push(r);
}
/* ---- ROW 4: the clamp binding ---- */
{
  const r = [];
  const c3 = build({ ...ONE, stemLength: 120, stemDiameter: 3, leafletPairs: 4 });
  r.push(...joinCells(c3, 'THE CLAMP: 3 MM SOLID STEM, SECTION', ['4 PAIRS ON THE THINNEST STEM'], 9));
  const c90 = build({ ...ONE, stemLength: 120, stemDiameter: 3, leafletPairs: 4, leafAngle: 90 });
  r.push(...joinCells(c90, 'LEAF AT 90 DEG ON 3 MM, SECTION', ['THE CAP IS THE STEM ITSELF'], 9, false));
  const cl = build({ ...ONE, stemLength: 120, stemDiameter: 3.5, leafletPairs: 4, leafAngle: 50, stemNodeKink: 1 });
  r.push(...joinCells(cl, 'A LEANING NODE (KINK 1), SECTION', ['THE CAP READS THE STEM STRAIGHT', '(DECLARED)'], 9, false));
  const s24 = build({ ...ONE, stemLength: 120, sheetThickness: 2.4, leafAngle: 85 });
  r.push(...joinCells(s24, 'SHEET 2.4 x 85 DEG, SECTION', ['THE ROOTED END STANDS PROUD (TOLD)'], 11, false));
  rows.push(r);
}
/* ---- ROW 5: serration on, on the proposed defaults ---- */
{
  const states = [{}, { leafletToothDepth: 0.12, leafToothCount: 12, leafCrestShape: 1.6, leafNotchShape: 1.6 }, { leafletToothDepth: 1 }, { leafletTipShape: 0.6 }, { leafletTipShape: 3 }];
  const names = ['THE DEFAULT: ENTIRE', 'SERRATION ON: DEPTH 0.12, 12 TEETH', 'LEAFLET TOOTH DEPTH 1 (MAX)', 'LEAFLET TIP 0.60 (ACUTE)', 'LEAFLET TIP 3.00 (HELD-WIDTH ROUND)'];
  const bls = states.map((s) => build({ ...ONE, ...s }));
  const lp = leafPlane(bls[0]);
  const all = bls.map((bl) => leafOf(bl, 0));
  const cat = new Float64Array(all.reduce((n, a) => n + a.P.length, 0));
  let o = 0; for (const a of all) { cat.set(a.P, o); o += a.P.length; }
  const cam = fit(cat, lp.N, lp.D);
  rows.push(bls.map((bl, i) => {
    const lf = bl.leaves[0].leaflets;
    const sv = lf.map((q) => q.serration).filter((x) => x && !x.noRoom);
    const floorLine = sv.length ? `FLOOR ${f2(sv[0].reliefFloorMm)} MM, FLOORED ON ${sv.filter((x) => x.reliefFloored).length} OF ${sv.length}, ASKED ${sv.map((x) => x.countAsked).join('/')}` : 'NO TEETH: THE 1 MM FLOOR IS IDLE';
    return cell(all[i].P, all[i].N, cam, [names[i], `TOOTH DEPTH ${bl.L.toothDepth}, TIP ${bl.L.tipShape.toFixed(2)}`, `TEETH BUILT ${lf.map((q) => q.serrationBuilt).join('/')}`, floorLine, `${bl.leaves[0].tris} TRIS A LEAF`, `ONE CAMERA, ${mmpx(cam)} MM/PX`]);
  }));
}
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
