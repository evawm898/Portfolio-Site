#!/usr/bin/env node
/* ===================================================================
   shot-bloom-leaf-edge.mjs — THE SHEET FOR LEAF/STEM BUILD S2 (Eva's rulings,
   Oct 6: leaves through emitPanel, an arch along the leaf, the cup a control,
   the tooth relief floored at the minimum feature).

     node tools/shot-bloom-leaf-edge.mjs <out.png> --base <worktree of the base commit>

   ROW 1 — the HEADLINE and the EDGE. The carnation look (opposite and
   decussate x 4 nodes, the node swelling at 1, arched linear leaves 60 x 6 mm
   at arch 90 and cup 0.6, entire), side-on and three-quarter; then the leaf
   MARGIN at its widest station BEFORE (the base tree's flat 90-degree wall)
   and AFTER (the bead), the same leaf, the same camera, macro on the edge; and
   the CROSS-SECTION there, sliced out of both trees' emitted triangles and
   drawn in millimetres, the wall in grey and the bead in white.
   ROW 2 — the ARCH sweep -90 / 0 / 60 / 120 / 180 on one 52 x 17 mm leaf at
   the ruled 35 deg, side-on.
   ROW 3 — the CUP sweep -0.8 / 0 / 0.35 (the default, LEAF_CUP) / 0.8 / 1.2,
   looking back down the blade from its tip.
   ROW 4 — the TOOTH FLOOR on fine serration, BEFORE (the base tree, teeth cut
   at whatever relief the depth asks) and AFTER (floored at 1.00 mm, the count
   giving), on the rose leaflet (23 x 12 mm, 12 teeth asked at depth 0.10) and
   on a 5 mm blade (9 asked at depth 0.30); the fifth cell is the shipped leaf,
   which the floor does not touch.

   PRINT PREVIEW ON: every build is EXPORT mode (the object a print gets) with
   the builder's own normals (`captureNormals`, the bead's closed-form normal
   where it has one), which is what the page's print preview shades with.
   RENDERED BY `bloom-soft-render.mjs`, which is DETERMINISTIC — the same
   triangles give the same bytes — so no pixel delta is quoted and none is
   owed. Every caption number is read off the build's own record (the leaf
   builder's arch, cup and serration records, its triangle tally), never
   restated; mm per pixel is printed on every rendered cell.
   =================================================================== */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { render, writePng, text, blit } from './bloom-soft-render.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const out = argv[0];
const BASE = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : null;
if (!out || !BASE) { console.error('usage: node tools/shot-bloom-leaf-edge.mjs <out.png> --base <worktree of the base commit>'); process.exit(2); }
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const BG = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-geometry.js')).href);
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);

const CW = 300, CH = 420, CAP = 84;
const LEAF = { stemLength: 70, stemDiameter: 6, leafLength: 52, leafWidth: 17, leafNodes: 1 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const comb = (...t) => { const r = [0, 0, 0]; for (let i = 0; i < t.length; i += 2) for (let k = 0; k < 3; k++) r[k] += t[i] * t[i + 1][k]; return r; };

/* One build: the stream, the normals, the record — and the LEAF BLOCK, which
   the head reports (`leafTriRange`) and the base does not; the base's block
   starts where the head's does (everything before the leaves is identical, the
   byte partition's clause 2) and spans the base's own leaf tally. */
function build(Gm, D, over, startFrom = null) {
  const st = { ...D, ...over };
  const acc = new Gm.MeshBuilder({ exportMode: true, captureNormals: true });
  const b = Gm.buildBloomInto(acc, st, { below: null });
  const n = b.leavesBuilt.reduce((m, l) => m + l.tris, 0);
  const a0 = b.leafTriRange ? b.leafTriRange[0] : startFrom;
  return { acc, st, b, leaf0: b.leavesBuilt[0], block: [a0, a0 + n] };
}
const head = (over) => build(G, R.DEFAULTS, over);
const base = (over, h) => build(BG, BR.DEFAULTS, over, h.block[0]);
const leafOnly = (bl) => ({ P: bl.acc.positions.slice(bl.block[0] * 9, bl.block[1] * 9), N: bl.acc.normals.slice(bl.block[0] * 9, bl.block[1] * 9) });
/* The head's own surface for the first leaf — where its widest station and
   its frame are; the base leaf has the SAME mid-surface at the defaults (the
   partition's clause 3), so one frame serves both trees' cells. */
function frameOf(bl) {
  const L = bl.b.leaf;
  const S = G.leafSurface(new G.MeshBuilder({ exportMode: true }), L, bl.st, 0, L.azimuths[0][0]);
  return S;
}
function cell(P, Nrm, cam, lines) {
  const img = render(P, CW, CH - CAP, cam, { color: [214, 206, 190], normals: Nrm });
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  blit(rgb, CW, CH, img, CW, CH - CAP, 0, CAP);
  lines.forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  return rgb;
}
const mmpx = (cam) => ((2 * cam.halfHeight) / (CH - CAP)).toFixed(3);

/* ---- the cross-section: the plane through the station's centre square to
   its tangent, cut out of each tree's emitted LEAF triangles, drawn in the
   section's own (across, normal) millimetres around the +margin. ---- */
function slice(P, C, D, T, N) {
  const segs = [];
  for (let t = 0; t < P.length; t += 9) {
    const v = [0, 1, 2].map((k) => [P[t + 3 * k], P[t + 3 * k + 1], P[t + 3 * k + 2]]);
    const s = v.map((q) => dot(sub(q, C), D));
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = e, b = (e + 1) % 3;
      if ((s[a] < 0) !== (s[b] < 0)) {
        const f = s[a] / (s[a] - s[b]);
        const q = comb(1 - f, v[a], f, v[b]);
        pts.push([dot(sub(q, C), T), dot(sub(q, C), N)]);
      }
    }
    if (pts.length === 2) segs.push(pts);
  }
  return segs;
}
function line(rgb, x0, y0, x1, y1, col, w = 2) {
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

const rows = [];
/* ---- ROW 1: the headline and the edge ---- */
{
  const r = [];
  const carn = head({ stemLength: 120, stemDiameter: 6, leafLength: 60, leafWidth: 6, leafNodes: 4, leafPhyllotaxy: 'opposite', stemNodeSwelling: 1, stemNodeKink: 0, leafArch: 90, leafCup: 0.6, leafToothDepth: 0 });
  const S0 = carn.b.stem;
  const side = { dir: [0, -1, 0], up: [0, 0, 1], center: [0, 0, S0.rootZ - 55], halfHeight: 70 };
  const lf = carn.leaf0;
  r.push(cell(carn.acc.positions, carn.acc.normals, side, ['THE CARNATION (HEADLINE)', 'OPPOSITE x 4, DECUSSATE, SWELLING 1', `LEAVES 60 x 6 MM, ARCH 90 (R ${lf.arch.radiusMm.toFixed(1)} MM), CUP 0.6`, `${carn.b.leavesBuilt.length} LEAVES, ${lf.tris} TRIS EACH`, 'EXPORT (PRINT PREVIEW), SIDE-ON', `${mmpx(side)} MM/PX`]));
  const tq = { dir: nrm([-0.55, -0.65, -0.52]), up: [0, 0, 1], center: [0, 0, S0.rootZ - 50], halfHeight: 62 };
  r.push(cell(carn.acc.positions, carn.acc.normals, tq, ['THE CARNATION, THREE-QUARTER', 'EACH LEAF ARCHES OVER FROM ITS NODE', `RISE ABOVE THE CHORD: THE INSET`, `READS THE ARCH (TOP NODE ${carn.b.leaf.nodeDepthsMm[0].toFixed(1)} MM DOWN)`, `${mmpx(tq)} MM/PX`]));
  /* the margin, before and after, the same leaf and camera */
  const h = head(LEAF), bb = base(LEAF, h);
  const S = frameOf(h);
  const u = S.prof.uPk, row = S.rowAt(u), Pm = row.sect(1).P;
  /* LOOKING BACK DOWN THE BLADE FROM THE TIP, a little from above, so the
     margin at its widest station stands in silhouette: every station nearer
     the camera is narrower, so nothing occludes it, and the edge's PROFILE —
     a square wall or a half-round — is the outline itself. */
  const mac = { dir: nrm(comb(-1, row.D, -0.18, row.N)), up: row.N, center: Pm, halfHeight: 1.9 };
  const lb = leafOnly(bb), lh = leafOnly(h);
  r.push(cell(lb.P, lb.N, mac, ['MARGIN BEFORE (THE BASE TREE)', 'A FLAT 90-DEGREE WALL, ONE SHEET', `TALL; 11 COLUMNS (A MIDRIB ONE)`, `${bb.leaf0.tris} TRIS A LEAF`, `AT THE WIDEST STATION u ${u.toFixed(3)}`, `${mmpx(mac)} MM/PX, THE LEAF ALONE`]));
  r.push(cell(lh.P, lh.N, mac, ['MARGIN AFTER (S2)', `THE BEAD: r UP TO ${h.leaf0.rim.drawnMaxMm.toFixed(2)} MM, APEX ON THE OUTLINE`, '10 COLUMNS (NO MIDRIB COLUMN)', `${h.leaf0.tris} TRIS A LEAF (+${h.leaf0.tris - bb.leaf0.tris})`, `SAME LEAF, SAME CAMERA`, `${mmpx(mac)} MM/PX, THE LEAF ALONE`]));
  /* the cross-section at that station */
  const rgb = Buffer.alloc(CW * CH * 3, 18);
  const segB = slice(lb.P, row.C, row.D, row.T, row.N), segH = slice(lh.P, row.C, row.D, row.T, row.N);
  /* centred on the +margin's own point in the section's coordinates (the cup
     lifts it well clear of the midrib's height) */
  const mT = dot(sub(Pm, row.C), row.T), mN = dot(sub(Pm, row.C), row.N);
  const span = 3.0, sc = (CW - 20) / span;
  const X = (a) => CW / 2 + 0.25 * CW + (a - mT) * sc, Y = (n) => CAP + (CH - CAP) / 2 - (n - mN) * sc;
  for (const [p, q] of segB) line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), [120, 120, 128], 2);
  for (const [p, q] of segH) line(rgb, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), [250, 248, 240], 1);
  /* a 1 mm scale bar */
  line(rgb, 14, CH - 14, 14 + sc, CH - 14, [111, 183, 174], 1);
  ['THE CROSS-SECTION AT u ' + u.toFixed(3), 'SLICED FROM BOTH TREES\' TRIANGLES', 'GREY: THE WALL (BEFORE)', 'WHITE: THE BEAD (AFTER)', 'THE +MARGIN, IN MILLIMETRES', 'TEAL BAR: 1 MM'].forEach((l, i) => text(rgb, CW, CH, 6, 6 + i * 13, l, [240, 236, 226], 1));
  r.push(rgb);
  rows.push(r);
}
/* ---- ROW 2: the arch sweep, side-on ---- */
{
  const r = [];
  for (const a of [-90, 0, 60, 120, 180]) {
    const bl = head({ ...LEAF, leafArch: a });
    const S = frameOf(bl);
    const cam = { dir: [0, -1, 0], up: [0, 0, 1], center: comb(1, S.bb, 18, [1, 0, 0]), halfHeight: 34 };
    const lf = bl.leaf0;
    r.push(cell(bl.acc.positions, bl.acc.normals, cam, [`ARCH ${a} DEG${a === 0 ? ' (THE DEFAULT - STRAIGHT)' : ''}`, a < 0 ? 'NEGATIVE: CURLED UP, TOWARD THE STEM' : a > 0 ? 'POSITIVE: ARCHED OVER AND DOWN' : 'THE POSE AS IT WAS', `RADIUS ${Number.isFinite(lf.arch.radiusMm) ? lf.arch.radiusMm.toFixed(1) + ' MM' : 'NONE'}`, `52 x 17 MM AT 35 DEG, ${lf.tris} TRIS`, `TOP NODE ${bl.b.leaf.nodeDepthsMm[0].toFixed(1)} MM DOWN`, `${mmpx(cam)} MM/PX`]));
  }
  rows.push(r);
}
/* ---- ROW 3: the cup sweep, looking back down the blade ---- */
{
  const r = [];
  for (const c of [-0.8, 0, 0.35, 0.8, 1.2]) {
    const bl = head({ ...LEAF, leafCup: c });
    const S = frameOf(bl);
    const mid = S.rowAt(S.prof.uPk);
    const cam = { dir: nrm(comb(-1, S.D0, -0.08, mid.N)), up: mid.N, center: mid.C, halfHeight: 10.5 };
    const lf = bl.leaf0, lo = leafOnly(bl);
    const cl = lf.cup.clamp;
    r.push(cell(lo.P, lo.N, cam, [`CUP ${c}${c === G.LEAF_CUP ? ' (THE DEFAULT, LEAF_CUP)' : ''}`, c < 0 ? 'NEGATIVE: THE MARGINS TURNED DOWN' : c === 0 ? 'A FLAT SHEET' : 'THE MARGINS LIFTED', cl && cl.u !== null && cl.u !== undefined ? `THE FOLD CLAMP BINDS FROM u ${cl.u.toFixed(2)}` : 'THE FOLD CLAMP DOES NOT BIND', `${lf.tris} TRIS`, 'FROM THE TIP, THE LEAF ALONE', `${mmpx(cam)} MM/PX`]));
  }
  rows.push(r);
}
/* ---- ROW 4: the tooth floor, before and after ---- */
{
  const r = [];
  const top = (S) => ({ dir: nrm(comb(-1, [-Math.sin(S.th) * Math.cos(0), 0, Math.cos(S.th)])), up: S.D0, center: S.rowAt(0.5).C, halfHeight: 0 });
  const serr = (lf) => { const s = lf.serration; if (!s) return 'NO SERRATION'; return s.noRoom ? `NO ROOM (${s.noRoomWhy})` : `${s.countBuilt} OF ${s.countAsked} TEETH BUILT`; };
  const relief = (lf) => { const s = lf.serration; return s && s.reliefBuiltMm !== undefined ? `RELIEF ${s.reliefAskedMm.toFixed(2)} ASKED, ${s.reliefBuiltMm.toFixed(2)} BUILT` : ''; };
  const pairs = [
    ['ROSE LEAFLET 23 x 12, 12 AT 0.10', { ...LEAF, leafLength: 23, leafWidth: 12, leafToothCount: 12, leafToothDepth: 0.1 }, 13],
    ['5 MM BLADE, 9 AT 0.30', { ...LEAF, leafWidth: 5, leafToothDepth: 0.3 }, 28],
  ];
  for (const [name, over, hh] of pairs) {
    const h = head(over), bb = base(over, h);
    const S = frameOf(h);
    const cam = { ...top(S), halfHeight: hh };
    const lb = leafOnly(bb), lh = leafOnly(h);
    const bs = bb.b.leaf ? bb.leaf0.serrationBuilt : 0;
    r.push(cell(lb.P, lb.N, cam, [`BEFORE: ${name}`, 'THE BASE TREE - NO FLOOR', `${bs} TEETH BUILT`, `RELIEF ${(Number(over.leafToothDepth) * (Number(over.leafWidth) / 2 - G.TIP_HALF_MM)).toFixed(2)} MM AT THE WIDEST`, 'TOP-DOWN, THE LEAF ALONE', `${mmpx(cam)} MM/PX`]));
    r.push(cell(lh.P, lh.N, cam, [`AFTER: ${name}`, `FLOORED AT ${G.MIN_FEATURE_MM.toFixed(2)} MM`, serr(h.leaf0), relief(h.leaf0), 'TOP-DOWN, THE LEAF ALONE', `${mmpx(cam)} MM/PX`]));
  }
  const d = head(LEAF), S = frameOf(d), lo = leafOnly(d);
  const cam = { ...top(S), halfHeight: 28 };
  r.push(cell(lo.P, lo.N, cam, ['THE SHIPPED LEAF (CONTROL)', 'THE FLOOR DOES NOT BIND HERE', serr(d.leaf0), relief(d.leaf0), 'TOP-DOWN, THE LEAF ALONE', `${mmpx(cam)} MM/PX`]));
  rows.push(r);
}
const COLS = 5, W = CW * COLS + 4 * (COLS - 1), H = CH * rows.length + 4 * (rows.length - 1);
const sheet = Buffer.alloc(W * H * 3, 40);
rows.forEach((r, ri) => r.forEach((c, ci) => blit(sheet, W, H, c, CW, CH, ci * (CW + 4), ri * (CH + 4))));
writePng(out, W, H, sheet);
console.log(`wrote ${out} (${W} x ${H})`);
