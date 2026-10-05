#!/usr/bin/env node
/* =====================================================================
   tools/bloom-print-coupon.mjs — the BLOOM PRINT COUPON (BPC1).

   A MEASUREMENT INSTRUMENT, not a gate. It writes ONE binary STL of a flat
   plate carrying five ladders, a handling strip and nineteen tubes, each
   ladder STRADDLING the value the bloom currently assumes, so that one SLS
   PA12 print turns the bloom's typed floors into measured ones. It is wired
   to no gate, no CI job and no page. Read docs/bloom-print-coupon.md first.

     node tools/bloom-print-coupon.mjs [--out <path>]

   Default output: coupon/bloom-print-coupon.stl relative to the cwd. Do not
   commit the STL; regenerate it.

   EVERY DIMENSION THAT BELONGS TO THE BLOOM IS IMPORTED, NEVER RETYPED.
   Constants read (all exported by the module named):
     bloom-geometry.js
       MIN_FEATURE_MM      1.0   print floor / minimum feature / minimum gap
       SHEET_THICKNESS_MM  1.2   default sheet; also the hub plate and the
                                 stamen/style rod diameter (partRadius = t/2)
       STEM_MIN_WALL_MM    1.5   Eva's stem wall; also the flat-end tip plug
       stemBoreRadius(R)         the bore law max(0, R - STEM_MIN_WALL_MM)
       STEM_DIAMETER_RANGE [3, 12] (12 = the widest stem)
       STEM_LENGTH_RANGE   [0, 120] (reported; the coupon tube is shorter)
       TIP_HALF_MM         0.8   2x = 1.6, the old flat petal end
       APEX_HALF_MM        0.2   2x = 0.4, the shipped nib face
       APEX_END_HALF_MM    0.05  2x = 0.1, the nib's mini-face
       NOZZLE_MM           0.4   2x = 0.8, the stem-cut land's nozzle term
       RIM_FLOOR_MM        1.0   (reported: equals MIN_FEATURE_MM)
       INFILL_WALL_MM      1.0   (reported: equals MIN_FEATURE_MM)
     bloom-registry.js  (DEFAULTS)
       stemDiameter        6     the shipped stem diameter
       sheetThickness      1.2   asserted equal to SHEET_THICKNESS_MM
       petalLength         35    the handling strip's height
       stemLength          0     (the stem is off by default; reported)
   Nothing needed was unexported. Coupon-only dimensions (plate thickness,
   fin height, slot depths, tube length, pitches, the 0.2-0.8 mm rungs below
   the floors, the 2.0 mm vent) are typed HERE and say so; they are coupon
   geometry, not bloom constants.

   THE ONE MEASURED FIGURE CARRIED AS A RUNG: 0.527 mm, the worst petal
   self-approach on the default bloom under form variance
   (docs/bloom-organic-variance-form-outcome.md). It is a measurement, not a
   constant, and no module exports it.

   SELF-CHECK, on the emitted mesh, BEFORE writing (exit 1 on any failure):
     per shell: every directed edge matched by exactly one reverse (a
       DIRECTED census — an undirected one is blind to an inverted face),
       no edge used twice in one direction (non-manifold), no two indices at
       one float32 position, every triangle's float32 area > 1e-9 mm^2,
       signed volume > 0 — except the four declared sealed cavities, which
       must be < 0 (inward-wound inner shells of the sealed tubes);
     whole mesh, welded on float32 bit patterns (what the STL stores): the
       same directed census — so no two shells share an edge;
     bores: nothing but the tube itself reaches into any tube bore;
     layout: no two feature groups closer than a clearance (so the spacing
       between ladder rungs is not itself an accidental gap test).
   The coupon is OVERLAPPING CLOSED SHELLS (the bloom's own export contract:
   a slicer / bureau unions them): features are embedded 0.3 mm into the
   plate, text pixels overlap each other, tube ribs overlap tube walls.
   Volume is reported two ways: the divergence-theorem sum over the emitted
   mesh (counts overlaps twice, subtracts cavities) and a union estimate by
   vertical-ray winding on a 0.1 mm grid (what will actually be sintered).
   ===================================================================== */
import * as G from '../bloom-geometry.js';
import { DEFAULTS } from '../bloom-registry.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = resolve(outIdx >= 0 ? args[outIdx + 1] : 'coupon/bloom-print-coupon.stl');

/* ---- bloom constants (imported) ---- */
const MIN = G.MIN_FEATURE_MM, SHEET = G.SHEET_THICKNESS_MM, WALL = G.STEM_MIN_WALL_MM;
if (DEFAULTS.sheetThickness !== SHEET) throw new Error('registry sheetThickness default != SHEET_THICKNESS_MM');
const STEM_D_DEFAULT = DEFAULTS.stemDiameter;
const STEM_D_MAX = G.STEM_DIAMETER_RANGE[1];
const PETAL_L = DEFAULTS.petalLength;
const VARIANCE_SELF_APPROACH_MM = 0.527;   // measured, docs/bloom-organic-variance-form-outcome.md

/* ---- coupon geometry (typed here; coupon-only) ---- */
const PT = 2.5;          // plate thickness; top face at z = PT
const EMBED = 0.3;       // every feature reaches this far into the plate
const MARGIN = 3;        // plate edge to nearest feature/text
const CHAMFER = 6;       // orientation chamfer, front-left corner
const SEG_TUBE = 64, SEG_PIN = 48;
const FIN_H = 10, FIN_L = 8;
const GAP_BLOCK = WALL, GAP_H = 6, GAP_DEPTH_SHORT = 3, GAP_DEPTH_LONG = 10;
const WEDGE_BASE = 6, WEDGE_H = 10;
const PIN_H = 8;
const ZG_PAD_W = 2.5, ZG_PAD_H = 2, ZG_TOWER_W = WALL, ZG_ARM_T = WALL, ZG_DEPTH = 3;
const TUBE_L = 25, TUBE_LIFT = 3, VENT_D = 2.0, RIB_W = 1.8, RIB_INTO_WALL = 0.6;
const STRIP_W = 5;
const TXT_P = 0.7, TXT_S = 0.8, TXT_H = 0.6, TXT_GAP = 0.6;   // pixel pitch, box size (= stroke width), emboss height
const CLEAR = 1.5;       // minimum clearance between two feature groups
const CLEAR_TEXT = 0.8;  // text to feature, and text to text (text is 0.6 mm relief, not a gap test)
const DIGIT_GAP = 1.0;   // index digit to its feature

/* ---- the ladders (bloom constants written as constants) ---- */
const uniqSorted = (a) => [...new Set(a.map((v) => +v.toFixed(6)))].sort((x, y) => x - y);
const WALL_LADDER = uniqSorted([0.3, 0.4, 0.5, 0.6, 2 * G.NOZZLE_MM, MIN, SHEET, WALL, 2.0]);
const GAP_LADDER = uniqSorted([0.2, 0.3, 0.4, 0.5, VARIANCE_SELF_APPROACH_MM, 0.6, 0.7, 0.8, MIN, 1.2]);
const NIB_LADDER = uniqSorted([2 * G.APEX_END_HALF_MM, 0.2, 2 * G.APEX_HALF_MM, 0.6, 0.8, MIN, 2 * G.TIP_HALF_MM, 2.0]);
const PIN_LADDER = uniqSorted([0.3, 0.4, 0.5, 0.6, 2 * G.NOZZLE_MM, MIN, SHEET]);
const TUBE_DIAMETERS = [4, STEM_D_DEFAULT, 8, STEM_D_MAX];
const VENT_LADDER_ON_DEFAULT = [0.5, 1.0, 1.5, VENT_D];

const NOTE = {
  0.1: '2*APEX_END_HALF_MM (nib mini-face)', 0.4: '2*APEX_HALF_MM (nib face)', 1.6: '2*TIP_HALF_MM (old flat end)',
  0.8: '2*NOZZLE_MM', 1: 'MIN_FEATURE_MM', 1.2: 'SHEET_THICKNESS_MM', 1.5: 'STEM_MIN_WALL_MM', 0.527: 'variance self-approach (measured)',
};

/* =====================================================================
   mesh primitives — each returns one closed shell {V, F}
   ===================================================================== */
const shells = [];
function addShell(name, s, kind = 'solid', group = null) { s.name = name; s.kind = kind; s.group = group; shells.push(s); return s; }

/* ear clipping for a simple CCW polygon with no collinear vertices */
function earClip(poly) {
  const idx = poly.map((_, i) => i), out = [];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inside = (p, a, b, c) => cross(a, b, p) > 0 && cross(b, c, p) > 0 && cross(c, a, p) > 0;
  let guard = 0;
  while (idx.length > 3) {
    if (++guard > 10000) throw new Error('earClip: not a simple CCW polygon');
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const a = poly[i0], b = poly[i1], c = poly[i2];
      if (cross(a, b, c) <= 0) continue;
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && inside(poly[j], a, b, c))) continue;
      out.push([i0, i1, i2]); idx.splice(k, 1); break;
    }
  }
  out.push(idx.slice());
  return out;
}
function prismXY(poly, z0, z1) {           // simple CCW poly [[x,y]...]; convex polys fan, others ear-clip
  const n = poly.length, V = [], F = [];
  for (const [x, y] of poly) V.push([x, y, z0]);
  for (const [x, y] of poly) V.push([x, y, z1]);
  for (const [a, b, c] of earClip(poly)) { F.push([a, c, b]); F.push([n + a, n + b, n + c]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push([i, j, n + j]); F.push([i, n + j, n + i]); }
  return { V, F };
}
const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const box = (x0, x1, y0, y1, z0, z1) => prismXY(rect(x0, x1, y0, y1), z0, z1);
/* a convex polygon in the (y, z) plane extruded along x from x0 to x1 */
function prismYZ(poly, x0, x1) {
  const s = prismXY(poly, x0, x1);
  s.V = s.V.map(([a, b, c]) => [c, a, b]);
  return s;
}
/* solid of revolution about a vertical axis at (cx, cy); profile [[r, z]...]
   is a closed polygon in the half-plane r >= 0; r === 0 vertices collapse to
   one apex. */
function revolve(profile, cx, cy, z0, n) {
  const V = [], F = [], ring = [];
  for (const [r, z] of profile) {
    if (r === 0) { ring.push([V.length]); V.push([cx, cy, z0 + z]); continue; }
    const idx = [];
    for (let j = 0; j < n; j++) { const a = 2 * Math.PI * j / n; idx.push(V.length); V.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + z]); }
    ring.push(idx);
  }
  const m = ring.length;
  for (let i = 0; i < m; i++) {
    const A = ring[i], B = ring[(i + 1) % m];
    if (A.length === 1 && B.length === 1) continue;
    for (let j = 0; j < n; j++) {
      const a0 = A.length === 1 ? A[0] : A[j], a1 = A.length === 1 ? A[0] : A[(j + 1) % n];
      const b0 = B.length === 1 ? B[0] : B[j], b1 = B.length === 1 ? B[0] : B[(j + 1) % n];
      if (A.length === 1) F.push([a0, b0, b1]);
      else if (B.length === 1) F.push([a0, b0, a1]);
      else { F.push([a0, b0, b1]); F.push([a0, b1, a1]); }
    }
  }
  return { V, F };
}
function signedVolume(s) {
  let v = 0;
  for (const [a, b, c] of s.F) {
    const p = s.V[a], q = s.V[b], r = s.V[c];
    v += (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
  }
  return v;
}
/* orient: a solid is wound outward (positive volume), a cavity inward. The
   construction is consistent within a shell, so a whole-shell flip is all
   that is ever needed; the census below proves the consistency. */
function orient(s) {
  const v = signedVolume(s);
  if ((s.kind === 'solid' && v < 0) || (s.kind === 'cavity' && v > 0)) s.F = s.F.map(([a, b, c]) => [a, c, b]);
  return s;
}

/* =====================================================================
   text — a 3x5 pixel font; each lit pixel is a closed box, boxes overlap
   their neighbours (pitch 0.9, size 1.0) so no two pixels share an edge
   ===================================================================== */
const FONT = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '001', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'], B: ['110', '101', '110', '101', '110'], P: ['110', '101', '110', '100', '100'],
  C: ['111', '100', '100', '100', '111'], W: ['101', '101', '101', '111', '101'], G: ['111', '100', '101', '101', '111'],
  H: ['101', '101', '111', '101', '101'], N: ['101', '111', '111', '101', '101'], Z: ['111', '001', '010', '100', '111'],
  T: ['111', '010', '010', '010', '010'], L: ['100', '100', '100', '100', '111'],
};
const GLYPH_W = 2 * TXT_P + TXT_S, GLYPH_H = 4 * TXT_P + TXT_S;
const textWidth = (s) => s.length * GLYPH_W + (s.length - 1) * TXT_GAP;
function text(str, x0, y0, group) {                  // x0, y0 = front-left corner
  let x = x0;
  for (const ch of str) {
    const g = FONT[ch]; if (!g) throw new Error(`no glyph for ${ch}`);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (g[r][c] !== '1') continue;
      const px = x + c * TXT_P, py = y0 + (4 - r) * TXT_P;
      addShell(`text ${str}`, orient(Object.assign(box(px, px + TXT_S, py, py + TXT_S, PT - 0.2, PT + TXT_H), { kind: 'solid' })), 'solid', group);
    }
    x += GLYPH_W + TXT_GAP;
  }
}

/* =====================================================================
   features — each placed with its own front-left (x, y) on the plate
   ===================================================================== */
const bores = [];                                    // every tube's bore, for the bore-clear check
const footprints = [];                               // [x0,x1,y0,y1,label]
const map = [];                                      // the coupon map, printed and copied into the doc
const solid = (name, s, group) => addShell(name, orient(Object.assign(s, { kind: 'solid' })), 'solid', group);

function fin(t, x, y, g) { solid(`W fin ${t}`, box(x, x + t, y, y + FIN_L, PT - EMBED, PT + FIN_H), g); return [x, x + t, y, y + FIN_L]; }
function gapCell(gap, depth, x, y, g) {
  solid(`gap ${gap} block A`, box(x, x + GAP_BLOCK, y, y + depth, PT - EMBED, PT + GAP_H), g);
  solid(`gap ${gap} block B`, box(x + GAP_BLOCK + gap, x + 2 * GAP_BLOCK + gap, y, y + depth, PT - EMBED, PT + GAP_H), g);
  return [x, x + 2 * GAP_BLOCK + gap, y, y + depth];
}
function zGapCell(gap, x, y, g) {
  // tower | pad, an arm off the tower top hangs over the pad with its underside `gap` above the pad's top
  const padX0 = x + ZG_TOWER_W + 1.0, padX1 = padX0 + ZG_PAD_W;
  const armZ0 = PT + ZG_PAD_H + gap, armZ1 = armZ0 + ZG_ARM_T;
  solid(`Z ${gap} tower`, box(x, x + ZG_TOWER_W, y, y + ZG_DEPTH, PT - EMBED, armZ1 - 0.25), g);
  solid(`Z ${gap} pad`, box(padX0, padX1, y, y + ZG_DEPTH, PT - EMBED, PT + ZG_PAD_H), g);
  solid(`Z ${gap} arm`, box(x + 0.2, padX1, y, y + ZG_DEPTH, armZ0, armZ1), g);
  return [x, padX1, y, y + ZG_DEPTH];
}
function wedge(w, x, y, g) {
  const cy = y + WEDGE_BASE / 2;
  const poly = [[cy - WEDGE_BASE / 2, PT - EMBED], [cy + WEDGE_BASE / 2, PT - EMBED], [cy + w / 2, PT + WEDGE_H], [cy - w / 2, PT + WEDGE_H]];
  solid(`N wedge ${w}`, prismYZ(poly, x, x + SHEET), g);
  return [x, x + SHEET, y, y + WEDGE_BASE];
}
function pin(d, x, y, g) {
  const r = d / 2;
  solid(`P pin ${d}`, revolve([[0, 0], [r, 0], [r, PIN_H + EMBED], [0, PIN_H + EMBED]], x + r, y + r, PT - EMBED, SEG_PIN), g);
  return [x, x + d, y, y + d];
}
function strip(x, y, g) { solid('L strip', box(x, x + SHEET, y, y + STRIP_W, PT - EMBED, PT + PETAL_L), g); return [x, x + SHEET, y, y + STRIP_W]; }

/* a tube standing on its axis, lifted TUBE_LIFT above the plate so both ends
   are free, held by one rib that overlaps its outer wall only (never the bore).
   variant: 'sealed' | 'vent' | 'blind' | 'open'. Top cap = SHEET (the hub
   plate over the stem); bottom plug = STEM_MIN_WALL_MM (the flat-end tip plug). */
function tube(D, variant, ventD, x, y, g) {
  const R = D / 2, ri = G.stemBoreRadius(R);
  if (!(ri > 0)) throw new Error(`tube ${D} has no bore`);
  const L = TUBE_L, zt = L - SHEET, zb = WALL, cx = x + R, cy = y + R, z0 = PT + TUBE_LIFT;
  let prof;
  if (variant === 'sealed') prof = [[0, 0], [R, 0], [R, L], [0, L]];
  else if (variant === 'vent') { const rv = ventD / 2; if (!(rv < ri)) throw new Error('vent not smaller than bore');
    prof = [[rv, 0], [R, 0], [R, L], [0, L], [0, zt], [ri, zt], [ri, zb], [rv, zb]]; }
  else if (variant === 'blind') prof = [[ri, 0], [R, 0], [R, L], [0, L], [0, zt], [ri, zt]];
  else if (variant === 'open') prof = [[ri, 0], [R, 0], [R, L], [ri, L]];
  else throw new Error(variant);
  const body = solid(`tube ${D} ${variant}${ventD ? ' ' + ventD : ''}`, revolve(prof, cx, cy, z0, SEG_TUBE), g);
  bores.push({ body, cx, cy, ri, z0, z1: z0 + L, name: body.name });
  if (variant === 'sealed') {
    const cav = revolve([[0, zb], [ri, zb], [ri, zt], [0, zt]], cx, cy, z0, SEG_TUBE);
    cav.kind = 'cavity'; orient(cav);
    addShell(`tube ${D} sealed CAVITY`, cav, 'cavity', g);
  }
  solid(`tube ${D} rib`, box(cx + R - RIB_INTO_WALL, cx + R + RIB_W - RIB_INTO_WALL + 0.6, cy - 0.9, cy + 0.9, PT - EMBED, z0 + L - 0.5), g);
  return { fp: [x, x + R * 2 + RIB_W, y, y + D], ri };
}

/* =====================================================================
   layout — rows into bands; every row is [label][rungs left->right, thinnest
   at index 1, nearest the chamfered corner]; index digits in front of each rung
   ===================================================================== */
let gid = 0;
function placeRow(row, x0, y0) {
  // returns width; draws label, features and index digits. Digits occupy y0..y0+GLYPH_H.
  const fy = y0 + GLYPH_H + DIGIT_GAP;
  text(row.label, x0, fy + Math.max(0, (row.depth - GLYPH_H) / 2), `label ${row.label}`);
  footprints.push([x0, x0 + textWidth(row.label), fy, fy + Math.max(row.depth, GLYPH_H), `label ${row.label}`, true]);
  let x = x0 + row.labelW + 2.0;
  row.items.forEach((it, i) => {
    const g = `${row.label}${i + 1}`;
    const r = it.make(x, fy, g);
    const fp = r.fp || r;
    footprints.push([fp[0], fp[1], fp[2], fp[3], g]);
    const idx = String(i + 1), cxm = (fp[0] + fp[1]) / 2;
    text(idx, cxm - textWidth(idx) / 2, y0, `${g} index`);
    footprints.push([cxm - textWidth(idx) / 2, cxm + textWidth(idx) / 2, y0, y0 + GLYPH_H, `${g} index`, true]);
    map.push({ row: row.label, index: i + 1, value: it.value, note: it.note || '', x: +fp[0].toFixed(2), y: +fp[2].toFixed(2), what: row.what });
    x += it.pitch;
  });
  return x - x0;
}
const rowsDef = {
  W: { what: 'free-standing fin, thickness (mm)', items: WALL_LADDER.map((t) => ({ value: t, pitch: 5, make: (x, y, g) => fin(t, x, y, g) })), depth: FIN_L },
  G: { what: `through-slot gap (mm), ${GAP_DEPTH_SHORT} mm deep`, items: GAP_LADDER.map((s) => ({ value: s, pitch: 6.5, make: (x, y, g) => gapCell(s, GAP_DEPTH_SHORT, x, y, g) })), depth: GAP_DEPTH_SHORT },
  H: { what: `through-slot gap (mm), ${GAP_DEPTH_LONG} mm deep`, items: GAP_LADDER.map((s) => ({ value: s, pitch: 6.5, make: (x, y, g) => gapCell(s, GAP_DEPTH_LONG, x, y, g) })), depth: GAP_DEPTH_LONG },
  Z: { what: 'vertical (Z) gap under an arm (mm)', items: GAP_LADDER.map((s) => ({ value: s, pitch: 6.5, make: (x, y, g) => zGapCell(s, x, y, g) })), depth: ZG_DEPTH },
  N: { what: `wedge end-face width (mm), ${SHEET} thick`, items: NIB_LADDER.map((w) => ({ value: w, pitch: 4, make: (x, y, g) => wedge(w, x, y, g) })), depth: WEDGE_BASE },
  P: { what: 'free-standing pin diameter (mm)', items: PIN_LADDER.map((d) => ({ value: d, pitch: 3.5, make: (x, y, g) => pin(d, x, y, g) })), depth: 1.2 },
  L: { what: `handling strip ${SHEET} x ${STRIP_W} x ${PETAL_L} mm`, items: [{ value: SHEET, note: 'SHEET_THICKNESS_MM x DEFAULTS.petalLength', pitch: 4, make: (x, y, g) => strip(x, y, g) }], depth: STRIP_W },
};
function tubeRow(D) {
  const ri = G.stemBoreRadius(D / 2), pitch = D + RIB_W + 1.8;
  const v = D === STEM_D_DEFAULT ? VENT_LADDER_ON_DEFAULT : [Math.min(VENT_D, ri)];   // a vent never wider than half the bore diameter
  const items = [{ value: 'sealed', make: (x, y, g) => tube(D, 'sealed', 0, x, y, g) }]
    .concat(v.map((vd) => ({ value: `vent ${vd}`, make: (x, y, g) => tube(D, 'vent', vd, x, y, g) })))
    .concat([{ value: 'blind (top capped, bottom open)', make: (x, y, g) => tube(D, 'blind', 0, x, y, g) },
             { value: 'open both ends', make: (x, y, g) => tube(D, 'open', 0, x, y, g) }]);
  items.forEach((it) => { it.pitch = pitch; it.note = `OD ${D}, bore ${2 * ri}`; });
  return { what: `tube OD ${D} mm, bore ${2 * ri} mm, ${TUBE_L} long`, items, depth: D };
}
for (const D of TUBE_DIAMETERS) rowsDef[`T${D}`] = tubeRow(D);
for (const [k, r] of Object.entries(rowsDef)) { r.label = k; r.labelW = textWidth(k); }

/* wide bands first, narrow bands behind them, so the plate can step in */
const BANDS = [['W', 'N', 'L'], ['G', 'P'], ['T8', 'T4'], ['H'], ['Z'], ['T12'], ['T6']];
const header = 'BPC1';
let y = MARGIN, maxX = 0;
text(header, CHAMFER + 2, y, 'header'); footprints.push([CHAMFER + 2, CHAMFER + 2 + textWidth(header), y, y + GLYPH_H, 'header', true]);
y += GLYPH_H + 2.0;
const bandInfo = [];
const steps = [];                                   // [yStart, yEnd, rightEdge] per band
for (const band of BANDS) {
  let x = MARGIN, depth = 0; const fp0 = footprints.length, yStart = y;
  for (const k of band) {
    const r = rowsDef[k];
    const w = placeRow(r, x, y);
    x += w + 4; depth = Math.max(depth, r.depth);
  }
  bandInfo.push({ band: band.join(' '), y0: +y.toFixed(2) });
  const right = Math.max(...footprints.slice(fp0).map((f) => f[1]));
  maxX = Math.max(maxX, right);
  y += GLYPH_H + DIGIT_GAP + depth + 2.0;
  steps.push([yStart, y - 2.0, Math.ceil(right + MARGIN)]);
}
const PLATE_W = Math.ceil(maxX + MARGIN), PLATE_D = Math.ceil(y - 2.0 + MARGIN);
/* the plate outline steps in behind the wide bands; a step sits midway in the gap between bands */
const outline = [[CHAMFER, 0]];
steps.forEach(([, , w], i) => {
  const lo = i === 0 ? 0 : (steps[i - 1][1] + steps[i][0]) / 2, hi = i === steps.length - 1 ? PLATE_D : (steps[i][1] + steps[i + 1][0]) / 2;
  const width = Math.max(w, ...steps.slice(i).map((s) => s[2]));   // never step OUT going back: keep the outline simple
  if (outline.length && outline[outline.length - 1][0] === width) outline[outline.length - 1][1] = hi;
  else { outline.push([width, lo]); outline.push([width, hi]); }
});
outline.push([0, PLATE_D], [0, CHAMFER]);
const plateOutline = outline.filter((p, i) => !(i > 0 && p[0] === outline[i - 1][0] && p[1] === outline[i - 1][1]));
addShell('plate', orient(Object.assign(prismXY(plateOutline, 0, PT), { kind: 'solid' })), 'solid', 'plate');
const insidePlate = (x, yy) => { let w = 0; for (let i = 0; i < plateOutline.length; i++) { const a = plateOutline[i], b = plateOutline[(i + 1) % plateOutline.length]; if ((a[1] <= yy) !== (b[1] <= yy) && x < a[0] + (yy - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) w ^= 1; } return w === 1; };

/* =====================================================================
   self-check
   ===================================================================== */
const failures = [];
const f32 = (v) => Math.fround(v);
const keyOf = (p) => `${f32(p[0])},${f32(p[1])},${f32(p[2])}`;
function areaF32(p, q, r) {
  const a = p.map(f32), b = q.map(f32), c = r.map(f32);
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.hypot(...n) / 2;
}
let cavities = 0, minArea = Infinity, grossSolid = 0, cavityVol = 0;
for (const s of shells) {
  const dir = new Map();
  for (const [a, b, c] of s.F) for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p + ',' + q; dir.set(k, (dir.get(k) || 0) + 1); }
  let unmatched = 0, dup = 0;
  for (const [k, n] of dir) { if (n > 1) dup++; const [p, q] = k.split(','); if ((dir.get(q + ',' + p) || 0) !== 1) unmatched++; }
  if (unmatched || dup) failures.push(`${s.name}: ${unmatched} unmatched / ${dup} duplicated directed edges`);
  const seen = new Set();
  for (const p of s.V) { const k = keyOf(p); if (seen.has(k)) failures.push(`${s.name}: two vertices at one float32 position`); seen.add(k); }
  for (const [a, b, c] of s.F) { const A = areaF32(s.V[a], s.V[b], s.V[c]); minArea = Math.min(minArea, A); if (A <= 1e-9) failures.push(`${s.name}: degenerate triangle (${A})`); }
  const v = signedVolume(s);
  if (s.kind === 'cavity') { cavities++; cavityVol += v; if (!(v < 0)) failures.push(`${s.name}: declared cavity is not inward (${v})`); }
  else { grossSolid += v; if (!(v > 0)) failures.push(`${s.name}: solid is not outward (${v})`); }
}
if (cavities !== TUBE_DIAMETERS.length) failures.push(`expected ${TUBE_DIAMETERS.length} declared cavities, found ${cavities}`);
// whole mesh, welded on float32: no shared edges between shells
const tris = [];
for (const s of shells) for (const [a, b, c] of s.F) tris.push([s.V[a], s.V[b], s.V[c]]);
{
  const ids = new Map(), dir = new Map();
  const id = (p) => { const k = keyOf(p); let i = ids.get(k); if (i === undefined) { i = ids.size; ids.set(k, i); } return i; };
  for (const t of tris) { const [a, b, c] = t.map(id); for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p + ',' + q; dir.set(k, (dir.get(k) || 0) + 1); } }
  let bad = 0; for (const [k, n] of dir) { const [p, q] = k.split(','); if (n !== 1 || (dir.get(q + ',' + p) || 0) !== 1) bad++; }
  if (bad) failures.push(`whole mesh (float32-welded): ${bad} directed edges not matched exactly once`);
}
// nothing but the tube itself may reach into a tube's bore (a rib or a neighbour there would fill the cavity being measured)
for (const b of bores) for (const s of shells) {
  if (s === b.body || (s.kind === 'cavity' && s.group === b.body.group)) continue;
  const xs = s.V.map((p) => p[0]), ys = s.V.map((p) => p[1]), zs = s.V.map((p) => p[2]);
  if (Math.max(...zs) <= b.z0 || Math.min(...zs) >= b.z1) continue;
  const dx = Math.max(Math.min(...xs) - b.cx, 0, b.cx - Math.max(...xs)), dy = Math.max(Math.min(...ys) - b.cy, 0, b.cy - Math.max(...ys));
  if (Math.hypot(dx, dy) < b.ri + 0.5) failures.push(`bore: ${s.name} reaches within ${(Math.hypot(dx, dy) - b.ri).toFixed(2)} mm of the bore of ${b.name}`);
}
// layout clearance between groups
for (let i = 0; i < footprints.length; i++) for (let j = i + 1; j < footprints.length; j++) {
  const a = footprints[i], b = footprints[j];
  const dx = Math.max(0, Math.max(a[0], b[0]) - Math.min(a[1], b[1])), dy = Math.max(0, Math.max(a[2], b[2]) - Math.min(a[3], b[3]));
  const need = (a[5] || b[5]) ? CLEAR_TEXT : CLEAR;
  if (Math.hypot(dx, dy) < need) failures.push(`layout: ${a[4]} and ${b[4]} are ${Math.hypot(dx, dy).toFixed(2)} mm apart (< ${need})`);
}
for (const s of shells) if (s.name !== 'plate') for (const p of s.V) if (!insidePlate(p[0], p[1])) { failures.push(`${s.name}: off the plate`); break; }

/* union volume by vertical-ray winding (overlaps counted once, cavities removed) */
function unionVolume(step) {
  const cell = 1.0, nx = Math.ceil(PLATE_W / cell), ny = Math.ceil(PLATE_D / cell), buckets = Array.from({ length: nx * ny }, () => []);
  tris.forEach((t, i) => {
    const xs = t.map((p) => p[0]), ys = t.map((p) => p[1]);
    for (let bx = Math.max(0, Math.floor(Math.min(...xs) / cell)); bx <= Math.min(nx - 1, Math.floor(Math.max(...xs) / cell)); bx++)
      for (let by = Math.max(0, Math.floor(Math.min(...ys) / cell)); by <= Math.min(ny - 1, Math.floor(Math.max(...ys) / cell)); by++) buckets[by * nx + bx].push(i);
  });
  let vol = 0;
  for (let gx = step * 0.3719; gx < PLATE_W; gx += step) for (let gy = step * 0.6143; gy < PLATE_D; gy += step) {
    const list = buckets[Math.min(ny - 1, Math.floor(gy / cell)) * nx + Math.min(nx - 1, Math.floor(gx / cell))], hits = [];
    for (const i of list) {
      const [p, q, r] = tris[i];
      const d = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
      if (d === 0) continue;
      const u = ((gx - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (gy - p[1])) / d;
      const v = ((q[0] - p[0]) * (gy - p[1]) - (gx - p[0]) * (q[1] - p[1])) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      hits.push([p[2] + u * (q[2] - p[2]) + v * (r[2] - p[2]), d > 0 ? -1 : 1]);   // up-facing leaves (-1), down-facing enters (+1)
    }
    hits.sort((a, b) => a[0] - b[0]);
    let w = 0, zIn = 0;
    for (const [z, s] of hits) { const before = w; w += s; if (before <= 0 && w > 0) zIn = z; else if (before > 0 && w <= 0) vol += (z - zIn) * step * step; }
  }
  return vol;
}

/* =====================================================================
   report and write
   ===================================================================== */
const all = tris.flat();
const bb = [0, 1, 2].map((k) => [Math.min(...all.map((p) => p[k])), Math.max(...all.map((p) => p[k]))]);
const meshVol = grossSolid + cavityVol;
const union = unionVolume(0.1);
const PA12_SOLID = 1.01e-3, PA12_POWDER = 0.45e-3;   // g/mm^3, ASSUMPTIONS (see doc)

console.log('BLOOM PRINT COUPON (BPC1)');
console.log(`constants: MIN_FEATURE_MM ${MIN} · SHEET_THICKNESS_MM ${SHEET} · STEM_MIN_WALL_MM ${WALL} · TIP_HALF_MM ${G.TIP_HALF_MM} · APEX_HALF_MM ${G.APEX_HALF_MM} · APEX_END_HALF_MM ${G.APEX_END_HALF_MM} · NOZZLE_MM ${G.NOZZLE_MM} · STEM_DIAMETER_RANGE [${G.STEM_DIAMETER_RANGE}] · STEM_LENGTH_RANGE [${G.STEM_LENGTH_RANGE}] · RIM_FLOOR_MM ${G.RIM_FLOOR_MM} · INFILL_WALL_MM ${G.INFILL_WALL_MM}`);
console.log(`registry DEFAULTS: stemDiameter ${STEM_D_DEFAULT} · sheetThickness ${DEFAULTS.sheetThickness} · petalLength ${PETAL_L} · stemLength ${DEFAULTS.stemLength}`);
console.log(`plate ${PLATE_W} x ${PLATE_D} x ${PT} mm (outline steps in to ${Math.min(...plateOutline.map((p) => p[0]).filter((x) => x > CHAMFER))} mm behind the wide bands; area ${(earClip(plateOutline).reduce((a, [i, j, k]) => { const p = plateOutline[i], q = plateOutline[j], r = plateOutline[k]; return a + ((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2; }, 0)).toFixed(0)} mm^2), chamfer ${CHAMFER} mm at the front-left (x=0,y=0) corner`);
console.log(`bounding box: x ${bb[0][0].toFixed(2)}..${bb[0][1].toFixed(2)}  y ${bb[1][0].toFixed(2)}..${bb[1][1].toFixed(2)}  z ${bb[2][0].toFixed(2)}..${bb[2][1].toFixed(2)}  =  ${(bb[0][1] - bb[0][0]).toFixed(2)} x ${(bb[1][1] - bb[1][0]).toFixed(2)} x ${(bb[2][1] - bb[2][0]).toFixed(2)} mm`);
console.log(`triangles: ${tris.length}   shells: ${shells.length} (${cavities} declared inward cavities)`);
console.log(`volume, divergence theorem on the emitted mesh: ${meshVol.toFixed(1)} mm^3 (solid shells ${grossSolid.toFixed(1)}, cavities ${cavityVol.toFixed(1)}; overlaps counted per shell)`);
console.log(`volume, union by z-ray winding at 0.1 mm: ${union.toFixed(1)} mm^3  ->  ~${(union * PA12_SOLID).toFixed(1)} g at an ASSUMED 1.01 g/cm^3`);
console.log(`sealed powder if it cannot escape: ${(-cavityVol).toFixed(1)} mm^3 -> ~${(-cavityVol * PA12_POWDER).toFixed(2)} g at an ASSUMED 0.45 g/cm^3 bulk`);
console.log(`min triangle area (float32): ${minArea.toExponential(3)} mm^2`);
console.log('\nMAP (row, index, value, front-left x,y of the feature):');
for (const b of bandInfo) console.log(`  band at y ${b.y0}: ${b.band}`);
for (const m of map) console.log(`  ${m.row.padEnd(4)} ${String(m.index).padStart(2)}  ${String(m.value).padEnd(32)} ${m.note.padEnd(38)} x ${m.x}, y ${m.y}`);
const tubeMass = TUBE_DIAMETERS.map((D) => {
  const R = D / 2, ri = G.stemBoreRadius(R), cav = Math.PI * ri * ri * (TUBE_L - SHEET - WALL), shell = Math.PI * R * R * TUBE_L - cav;
  return `  OD ${D}: tube material ${(shell * PA12_SOLID).toFixed(3)} g; sealed powder ${(cav * PA12_POWDER).toFixed(3)} g (cavity ${cav.toFixed(1)} mm^3); full-solid equivalent ${(Math.PI * R * R * TUBE_L * PA12_SOLID).toFixed(3)} g`;
});
console.log('\nTUBE MASSES (tube body only, rib excluded; ASSUMED densities):\n' + tubeMass.join('\n'));

if (failures.length) {
  console.error(`\nSELF-CHECK FAILED (${failures.length}):`); for (const f of failures.slice(0, 40)) console.error('  ' + f);
  console.error('nothing written.'); process.exit(1);
}
console.log('\nSELF-CHECK: PASS — per-shell directed census, float32-welded whole-mesh census, orientation (4 declared cavities inward), degeneracy, bores clear, layout clearance');

const buf = Buffer.alloc(84 + tris.length * 50);
buf.write('BPC1 bloom print coupon - generated by tools/bloom-print-coupon.mjs', 0, 'ascii');
buf.writeUInt32LE(tris.length, 80);
let o = 84;
for (const [p, q, r] of tris) {
  const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
  for (const c of [n[0] / l, n[1] / l, n[2] / l, ...p, ...q, ...r]) { buf.writeFloatLE(c, o); o += 4; }
  buf.writeUInt16LE(0, o); o += 2;
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, buf);
console.log(`wrote ${OUT} (${buf.length} bytes)`);
