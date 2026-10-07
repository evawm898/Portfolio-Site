#!/usr/bin/env node
/* ===================================================================
   shot-bloom-leaf-compound.mjs — THE SHEET FOR LEAF/STEM BUILD S3 (the
   compound leaf; docs/bloom-leaf-compound-outcome.md).

     node tools/shot-bloom-leaf-compound.mjs <out.png>

   ROW 1 — THE ROSE, the headline: alternate at 137.5 x 4 nodes, the node kink
   on, two lateral pairs and a terminal, a slight arch, fine serrate leaflets.
   Three-quarter, side-on, and from BELOW; then one rose leaf alone in its own
   plane; then the SAME stem with SIMPLE leaves on the side-on camera, so the
   compound leaf reads beside the leaf it replaces.
   ROW 2 — LEAFLET PAIRS 1 / 2 / 3 / 4 on the shipped compound defaults, one
   leaf alone, one camera; and the RACHIS ARCHED (arch 120) side-on — the arch
   bends the rachis and the leaflets ride it flat, unarched.
   ROW 3 — THE BASAL RATIO 0.4 / 0.6 / 0.8 (the default) / 1.0 / 1.4 at three
   pairs: the basal pair against the top pair.
   ROW 4 — THE STALKS: lateral 0 / 2.5 (the default) / 8 / 20 mm, and the
   terminal's at 30 mm.
   ROW 5 — THE FREE BASE, macro: a lateral leaflet's base from above, where
   its stalk enters; the same base in a LONGITUDINAL SECTION sliced out of the
   emitted triangles (the plane through the leaflet's midline, in its own
   millimetres — the bead closing the base, the rod inside it); the terminal's
   base the same two ways; and the same leaflet's TIP in section, the bead the
   base mirrors.

   PRINT PREVIEW ON: every build is EXPORT mode (the object a print gets) with
   the builder's own normals (`captureNormals` — the bead's closed-form normal
   where it has one), which is what the page's print preview shades with.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no pixel delta is quoted and none is
   owed. Every caption number is read off the build's own record (the leaf
   builder's compound tree, its rods, its serration and triangle tallies),
   never restated; mm per pixel is printed on every rendered cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-bloom-leaf-compound.mjs <out.png>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 84, IH = CH - CAP;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (a, b, s = 1) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];

const ROSE = { stemLength: 120, stemDiameter: 4.5, leafLength: 40, leafType: 'COMPOUND', leafNodes: 4, leafPhyllotaxy: 'alternate', leafDivergence: 137.5,
  stemNodeKink: 0.8, stemNodeSwelling: 0.25, leafArch: 10, leafCup: 0.28, leafToothCount: 12, leafToothDepth: 0.12, leafCrestShape: 1.6, leafNotchShape: 1.6 };
const ONE = { stemLength: 70, stemDiameter: 6, leafLength: 40, leafNodes: 1, leafType: 'COMPOUND' };

function build(over) {
  const st = { ...R.DEFAULTS, ...over };
  const acc = new G.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = G.buildBloomInto(acc, st, { below: null });
  return { acc, st, b, L: b.leaf, leaves: b.leavesBuilt || [] };
}
/* the triangles of leaf `i` alone, read off the builder's own block and tally */
function leafOf(bl, i = 0) {
  let a = bl.b.leafTriRange[0];
  for (let j = 0; j < i; j++) a += bl.leaves[j].tris;
  const n = bl.leaves[i].tris;
  return { P: bl.acc.positions.slice(a * 9, (a + n) * 9), N: bl.acc.normals.slice(a * 9, (a + n) * 9) };
}
/* a camera that FITS the points: `dir` toward the camera, `up` the image's up */
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
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  return rgb;
}
const mmpx = (cam) => ((2 * cam.halfHeight) / IH).toFixed(3);
/* the plane of leaf 0's rachis at its start, for a leaf seen in its own plane */
function leafPlane(bl) {
  const C = bl.leaves[0].rachis, th = (bl.L.angleDeg * Math.PI) / 180, az = bl.L.azimuths[0][0];
  const Rr = [Math.cos(az), Math.sin(az), 0];
  const D = [Rr[0] * Math.cos(th), Rr[1] * Math.cos(th), Math.sin(th)], N = [-Rr[0] * Math.sin(th), -Rr[1] * Math.sin(th), Math.cos(th)];
  return { D, N, base: C.baseC };
}
const teethOf = (rep) => rep.leaflets.map((q) => q.serrationBuilt).join('/');
const rodLine = (cp) => `RODS ${(2 * cp.stalkR).toFixed(2)} MM (THE PETIOLE'S, ${cp.floorBinds ? 'FLOOR BINDS' : 'AREA RULE'})`;

/* ---- the section: a plane through `C` with normal `T`, cut out of the given
   triangles, drawn in (D, N) millimetres. ---- */
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
function sectionCell(P, C, D, T, N, at, span, lines) {
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const sc = (CW - 24) / span;
  const X = (a) => CW / 2 + (a - at) * sc, Y = (n) => CAP + IH / 2 - n * sc;
  for (const [p, q] of slice(P, C, D, T, N)) line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), [250, 248, 240], 1);
  line(rgb, 14, CH - 14, 14 + sc, CH - 14, [111, 183, 174], 1);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  return rgb;
}

const rows = [];
/* ---- ROW 1: the rose ---- */
{
  const r = [];
  const rose = build(ROSE), S0 = rose.b.stem, rep = rose.leaves[0], cp = rose.L.compound;
  const P = rose.acc.positions, Nm = rose.acc.normals;
  const tq = fit(P, nrm([-0.55, -0.65, -0.52]), [0, 0, 1]);
  r.push(cell(P, Nm, tq, ['THE ROSE (HEADLINE)', 'ALTERNATE 137.5 x 4, KINK 0.8, SWELL 0.25', `${cp.pairs} PAIRS + THE TERMINAL, ARCH 10, CUP 0.28`, `12 FINE TEETH AT 0.12 ASKED; BUILT ${teethOf(rep)}`, `${rose.leaves.length} LEAVES, ${rep.tris} TRIS EACH, ${rose.acc.triangleCount} TOTAL`, `EXPORT (PRINT PREVIEW), ${mmpx(tq)} MM/PX`]));
  const side = fit(P, [0, -1, 0], [0, 0, 1]);
  r.push(cell(P, Nm, side, ['THE ROSE, SIDE-ON', `STEM ${S0.lengthMm} x ${(2 * S0.outerR).toFixed(1)} MM, NODES KINKED`, `RACHIS ${cp.rachisMm} MM, LEAFLETS AT ${cp.lateral.map((q) => q.stationMm.toFixed(0)).join(', ')} MM`, `LEAFLET ANGLE ${cp.angleDeg} DEG, STALKS ${cp.stalkMm} / ${cp.terminalStalkMm} MM`, rodLine(cp), `${mmpx(side)} MM/PX`]));
  const below = fit(P, [0, 0, -1], [0, 1, 0]);
  const azs = rose.L.azimuths.map((a) => ((((a[0] * 180) / Math.PI) % 360) + 360) % 360);
  r.push(cell(P, Nm, below, ['THE ROSE FROM BELOW', `THE ${rose.leaves.length} LEAVES ROUND THE SPIRAL`, `(${azs.map((d) => d.toFixed(1)).join(', ')} DEG)`, `TOP NODE ${rose.L.nodeDepthsMm[0].toFixed(1)} MM DOWN (THE COMPOUND`, 'LEAF\'S OWN RISE CLEARS THE HEAD)', `${mmpx(below)} MM/PX`]));
  const lp = leafPlane(rose), lo = leafOf(rose, 0);
  const own = fit(lo.P, lp.N, lp.D);
  r.push(cell(lo.P, lo.N, own, ['ONE ROSE LEAF, IN ITS OWN PLANE', `${rep.leaflets.length} LEAFLETS: ${rep.leaflets.map((q) => `${q.lengthMm.toFixed(0)}x${q.widthMm.toFixed(0)}`).join(' ')}`, 'EVERY ONE A BLADE THROUGH emitPanel', 'BEAD AT THE TIP AND AT THE FREE BASE', `${rep.tris} TRIS (${rep.leaflets.map((q) => q.tris).join('+')} + RODS)`, `THE LEAF ALONE, ${mmpx(own)} MM/PX`]));
  const simple = build({ ...ROSE, leafType: 'SIMPLE' });
  r.push(cell(simple.acc.positions, simple.acc.normals, side, ['THE SAME STEM, SIMPLE LEAVES', `ONE 40 x ${simple.st.leafWidth} MM BLADE A NODE`, `${simple.leaves[0].tris} TRIS A LEAF (COMPOUND ${rep.tris})`, `${simple.acc.triangleCount} TOTAL (COMPOUND ${rose.acc.triangleCount})`, 'SIDE-ON, THE ROSE\'S OWN CAMERA', `${mmpx(side)} MM/PX`]));
  rows.push(r);
}
/* one camera for the leaf-alone rows: fitted to the largest leaf the row
   shows, so the row reads at one scale */
function leafRow(states, label, extra) {
  const bls = states.map((s) => build({ ...ONE, ...s }));
  const lp = leafPlane(bls[0]);
  const all = bls.map((bl) => leafOf(bl, 0));
  const cat = new Float64Array(all.reduce((n, a) => n + a.P.length, 0));
  let o = 0; for (const a of all) { cat.set(a.P, o); o += a.P.length; }
  const cam = fit(cat, lp.N, lp.D);
  return bls.map((bl, i) => cell(all[i].P, all[i].N, cam, [label(states[i]), ...extra(bl, states[i]), `THE LEAF ALONE, ${mmpx(cam)} MM/PX`]));
}
/* ---- ROW 2: the pairs, and the rachis arched ---- */
{
  const r = leafRow([{ leafletPairs: 1 }, { leafletPairs: 2 }, { leafletPairs: 3 }, { leafletPairs: 4 }],
    (s) => `LEAFLET PAIRS ${s.leafletPairs}${s.leafletPairs === G.LEAFLET_PAIRS_DEFAULT ? ' (THE DEFAULT)' : ''}`,
    (bl) => { const rep = bl.leaves[0], cp = bl.L.compound;
      return [`${cp.count} LEAFLETS, ${rep.tris} TRIS A LEAF`, `STATIONS ${cp.lateral.map((q) => q.stationMm.toFixed(1)).join(', ')} MM`, cp.pairs === 1 ? 'ONE PAIR SITS AT FIRST (BASAL INERT)' : `BASAL PAIR ${cp.lateral[0].lengthMm.toFixed(1)} x ${cp.lateral[0].widthMm.toFixed(1)} MM`, `TEETH ${teethOf(rep)}`]; });
  const arc = build({ ...ONE, leafArch: 120 });
  const lo = leafOf(arc, 0), lp = leafPlane(arc);
  const T = nrm(crs(lp.N, lp.D));
  const cam = fit(lo.P, T, [0, 0, 1]);
  r.push(cell(lo.P, lo.N, cam, ['THE RACHIS ARCHED (ARCH 120)', `TURN ${(arc.leaves[0].arch.turnRad * 180 / Math.PI).toFixed(0)} DEG ALONG THE RACHIS`, 'THE LEAFLETS RIDE IT FLAT, UNARCHED', '(NO PER-LEAFLET ARCH, AS RULED)', 'SIDE-ON TO THE LEAF', `THE LEAF ALONE, ${mmpx(cam)} MM/PX`]));
  rows.push(r);
}
/* ---- ROW 3: the basal ratio at three pairs ---- */
rows.push(leafRow([0.4, 0.6, 0.8, 1.0, 1.4].map((v) => ({ leafletPairs: 3, leafletBasalRatio: v })),
  (s) => `BASAL RATIO ${s.leafletBasalRatio.toFixed(1)}${s.leafletBasalRatio === G.LEAFLET_BASAL_DEFAULT ? ' (THE DEFAULT)' : ''}`,
  (bl) => { const cp = bl.L.compound, rep = bl.leaves[0];
    return [`3 PAIRS, THE TOP PAIR ${cp.lateral.at(-1).lengthMm.toFixed(0)} x ${cp.lateral.at(-1).widthMm.toFixed(0)} MM`, `BASAL ${cp.lateral[0].lengthMm.toFixed(1)} x ${cp.lateral[0].widthMm.toFixed(1)} MM${cp.clamped ? ' (FLOORED)' : ''}`, `MIDDLE ${cp.lateral[1].lengthMm.toFixed(1)} x ${cp.lateral[1].widthMm.toFixed(1)} MM`, `TEETH ${teethOf(rep)}`]; }));
/* ---- ROW 4: the stalks ---- */
rows.push(leafRow([{ leafletStalk: 0 }, { leafletStalk: 2.5 }, { leafletStalk: 8 }, { leafletStalk: 20 }, { leafletTerminalStalk: 30 }],
  (s) => (s.leafletTerminalStalk !== undefined ? `TERMINAL STALK ${s.leafletTerminalStalk} MM` : `LATERAL STALK ${s.leafletStalk} MM${s.leafletStalk === G.LEAFLET_STALK_DEFAULT ? ' (THE DEFAULT)' : ''}`),
  (bl, s) => { const cp = bl.L.compound;
    return [s.leafletStalk === 0 ? 'SESSILE: THE BASE ON THE RACHIS' : 'THE STALK REACHES THROUGH THE BEAD', `LATERAL ${cp.stalkMm} MM, TERMINAL ${cp.terminalStalkMm} MM`, rodLine(cp), `SLENDERNESS L/D ${cp.slenderness.ld.toFixed(1)} (UNMEASURED)`]; }));
/* ---- ROW 5: the free base, macro ---- */
{
  const r = [];
  const bl = build(ONE), rep = bl.leaves[0], lo = leafOf(bl, 0);
  const lat = rep.leaflets[0], term = rep.leaflets[rep.leaflets.length - 1];
  for (const [name, q] of [['A LATERAL LEAFLET', lat], ['THE TERMINAL', term]]) {
    const B0 = q.base;
    const camTop = { dir: q.N, up: q.D, center: add(B0, q.D, 1.2), halfHeight: 3.2 };
    r.push(cell(lo.P, lo.N, camTop, [`${name}'S FREE BASE, FROM ABOVE`, `THE BEAD CLOSES IT (SEMI-AXIS ${q.rim.baseAxisMm.toFixed(3)} MM)`, `THE ${q.role === 'terminal' ? 'AXIS ROD' : 'STALK'} ENTERS ${q.embedMm.toFixed(2)} MM`, 'PAST THE BASE ROW, INTO FULL SHEET', `${q.lengthMm.toFixed(0)} x ${q.widthMm.toFixed(0)} MM, ${q.tris} TRIS`, `${mmpx(camTop)} MM/PX`]));
    r.push(sectionCell(lo.P, B0, q.D, q.T, q.N, 0.6, 6.0, [`${name}: LONGITUDINAL SECTION`, 'THE MIDLINE PLANE, SLICED FROM THE', 'EMITTED TRIANGLES (BLADE AND ROD)', 'BASE AT THE CENTRE, TIP TO THE RIGHT', `ROD ${(2 * bl.L.compound.stalkR).toFixed(2)} MM, SHEET ${Math.max(Number(bl.st.sheetThickness), G.MIN_FEATURE_MM).toFixed(2)} MM`, 'TEAL BAR: 1 MM']));
  }
  const tip = add(lat.base, lat.D, lat.lengthMm);
  r.push(sectionCell(lo.P, tip, lat.D, lat.T, lat.N, -0.6, 6.0, ['THE SAME LEAFLET\'S TIP, IN SECTION', 'THE BEAD THE FREE BASE MIRRORS', `(TIP SEMI-AXIS ${lat.rim.tipAxisMm === null ? 'N/A' : lat.rim.tipAxisMm.toFixed(3)} MM)`, 'TIP AT THE CENTRE', '', 'TEAL BAR: 1 MM']));
  rows.push(r);
}
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
