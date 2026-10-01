/* ===================================================================
   SCRATCH PROTOTYPE — THE CLOSED-RING TUBE. NOT SHIPPED, NOT A GATE.

     node tools/bloom-tube-ring.mjs [--quick] [--json <file>] [--control]
     node tools/bloom-tube-ring.mjs --partial [--json <file>]     (fused partway)
     node tools/bloom-tube-ring.mjs --attribute                   (where a fold sits)

   PART C (Eva's rulings on Part B): `buildTube(set, { h, blend, slits })`.
     blend  0..1, the BLEND slider: the FLARE (the lobe starts lower, burying the
            ring's free-rim taper under a flush base wall) and the NOTCH (an open
            sinus's rim corner cut into a U tangent to both petal edges). Both are
            inert at 0 BY BRANCH — BLEND 0 is the Part B build, float for float.
     slits  'edge' (default): an edge petal at a slit is one panel from the foot
            to the tip, its outer half the petal's OWN section; 'wedge' is Part
            B's wedge cut, kept for reproduction.
     node tools/bloom-tube-ring.mjs --round2 [--json <file>]       (Part C sweep)

   PARTIAL FUSION (Eva's ruling on #323): `buildTube(set, { h })` ends the ring
   at the last row at or below u = h; above it every petal is TODAY's free petal
   (P3's hook hands it the rows from one below the ring's top to the tip), and
   over BLEND_MM of midrib arc above the ring's top row its section eases from
   the ring's own arc to its own section (law in buildTube's pass B comment:
   position lerp by smootherstep, normal lerp, the petal's width laid onto the
   ring by ARC LENGTH). The ring's curve at its top row is the ONE owner of the
   line where petal base meets ring top: at that row the petal IS the ring.
   Without `h` the ring runs to the nib entry, exactly as first built.

   Eva's ruling on the corolla-fusion discovery (docs/bloom-corolla-fusion-
   discovery.md §7 #1): the fused region is ONE SHEET whose cross-section at
   every row passes through every petal MIDRIB at that row, so there are no
   neighbouring margins and nothing can cross by construction. The petals are
   its lobes. This file builds that ring, in two across-shapes —

     ROUND     a smooth closed curve through the midribs (periodic Catmull-Rom
               in the axis's own cylindrical coordinates, rho(theta), z(theta))
     STRAIGHT  the polygon between consecutive midribs (straight chords)

   — at TUBE k = 0 (one periodic sheet) and every divisor k of n (k evenly
   spaced slits, each panel n/k petals), and measures it. Docs:
   docs/bloom-tube-ring-prototype.md.

   HOW IT REACHES THE OWNER WITHOUT TOUCHING IT. The shipped bloom-geometry.js
   is read as TEXT, four ANCHORED patches are applied (each must match exactly
   once or the tool refuses — the mutant table's discipline), and the result is
   imported from a temp file. bloom-geometry.js itself is never written. The
   four patches, and what each is FOR:

     P1  `const NV = 10` -> `let`, with `__tubeWithNV(n, f)` exported, so the
         ring's panels can carry n*C columns. Every petal still builds at 10.
     P2  `emitPanel` learns a PERIODIC panel (the full tube, k = 0): columns
         wrap, no side inset, and the rim is TWO closed loops (bottom, top)
         through the owner's own `rimProfile` + `emitRimLoop`. THIS IS THE
         FINDING, not a convenience: a k = 0 tube cannot be expressed through
         the shipped emitPanel, and P2 is exactly the delta it needs.
     P3  `buildPetalInto` honours `cap.tubeLobe(rows)`: the blade is emitted as
         ONE panel from that row to the tip (the free lobe), and the rows are
         returned (`tubeRows`) so the ring reads the petal's own sections.
     P4  `emitPanel` and `rimProfile`/`emitRimLoop` exported.

   Everything about the EDGE PROFILE — taper, bead, K = 4, the 1.0 mm floor,
   the inset bisection, the exposed-tip apex ring — is the owner's code,
   called, never copied. The ring's skins are emitPanel's skins.

   WHAT IT READS, and from which owner:
     - the MIDRIB at row r of petal p: `tubeRows[r].sect(0).P` — the petal's
       own section (petalSurface's front door), the same double a petal draws
       its midrib through. The ring passes through it EXACTLY (asserted, T1).
     - the ROW LADDER: the petals' own rows, index-matched across a whorl;
       neighbours must carry identical u row for row (refused otherwise, T0).
     - the NIB ENTRY: `tipCap.apex.xLawMm / drawnLengthMm`, the expression
       the discovery prototype and the combination gate use.
     - thickness: the petal's own `tAt` per row (`tUsed`).
   WHAT IT DEFAULTS (Claude's, flagged in the doc): C = 8 columns per petal
   sector; a slit is a WEDGE whose width is MIN_FEATURE_MM at the ring row's
   radius (so it opens toward the mouth); the lobe starts PANEL_OVERLAP_ROWS
   (1) below the ring's top row, the cleft/fringe precedent.

   DECLARED BLIND SPOTS: RADIAL placement only (refused otherwise); a whorl
   whose petals do not share one ladder is refused (size / form variance);
   cleft/fringe/lobed petals are not exercised; STRAIGHT's skins are offset
   along the AVERAGED normal at a crease, so the wall there is cos(pi/n) of
   the sheet — reported, not mitred.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as R from '../bloom-registry.js';
import { census, orientation } from './bloom-self-intersection.mjs';
import { analyzeStl } from './bloom-harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* ---------------- the patched copy of the owner ---------------- */
const PATCHES = [
  ['P1 NV switchable',
    'const NV = 10;   // columns across one span',
    'let NV = 10;   // columns across one span\nexport function __tubeWithNV(n, f) { const o = NV; NV = n; try { return f(); } finally { NV = o; } }'],
  ['P2a periodic columns',
    '      const v = sp[0] + ((sp[1] - sp[0]) * j) / (NV - 1);\n      const { P, n } = row.sect(v);',
    '      const v = sp[0] + ((sp[1] - sp[0]) * j) / (panel.periodic ? NV : NV - 1);\n      const { P, n } = row.sect(v);'],
  ['P2b no side inset on a periodic panel',
    '    const inLo = a > 0 ? rimInsetV(row.sect, vLo, vMid, a) : vLo;\n    const inHi = a > 0 ? rimInsetV(row.sect, vHi, vMid, a) : vHi;',
    '    const side = a > 0 && !panel.periodic;\n    const inLo = side ? rimInsetV(row.sect, vLo, vMid, a) : vLo;\n    const inHi = side ? rimInsetV(row.sect, vHi, vMid, a) : vHi;'],
  ['P2c skin columns',
    '      const v = a > 0 ? inLo + ((inHi - inLo) * j) / (NV - 1) : oV[k][j];\n      const q = a > 0 ? row.sect(v) : { P: oP[k][j], n: oN[k][j] };',
    '      const v = side ? inLo + ((inHi - inLo) * j) / (NV - 1) : oV[k][j];\n      const q = side ? row.sect(v) : { P: oP[k][j], n: oN[k][j] };'],
  ['P2d taper distance has no side margins on a periodic panel',
    '      const d = Math.min(dEdge + arc[j], dEdge + (arc[NV - 1] - arc[j]), dTipRow);',
    '      const d = panel.periodic ? dTipRow : Math.min(dEdge + arc[j], dEdge + (arc[NV - 1] - arc[j]), dTipRow);'],
  ['P2e faces wrap',
    '  for (let i = 0; i < NR - 1; i++) {\n    for (let j = 0; j < NV - 1; j++) {\n      acc.quad(top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]);   // top skin: normal +n\n      acc.quad(bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]);   // bottom skin: normal -n',
    '  for (let i = 0; i < NR - 1; i++) {\n    for (let j = 0; j < (panel.periodic ? NV : NV - 1); j++) {\n      const jn = (j + 1) % NV;\n      acc.quad(top[i][j], top[i + 1][j], top[i + 1][jn], top[i][jn]);   // top skin: normal +n\n      acc.quad(bot[i][j], bot[i][jn], bot[i + 1][jn], bot[i + 1][j]);   // bottom skin: normal -n'],
  ['P2f two closed rim loops on a periodic panel',
    '  const K = rimSegments(sheetMax);\n',
    '  const K = rimSegments(sheetMax);\n  if (panel.periodic) {\n    const mk = (i, js) => js.map((j) => { const sk = Math.min(i, skinTo) - rowFrom; return rimProfile(acc, K, skinP[sk][j], skinN[sk][j], skinB[sk][j], oP[i - rowFrom][j], top[sk][j], bot[sk][j]); });\n    const asc = Array.from({ length: NV }, (_, j) => j);\n    emitRimLoop(acc, mk(rowFrom, asc), K);\n    emitRimLoop(acc, mk(rowTo, asc.slice().reverse()), K);\n    return grid;\n  }\n'],
  ['P3 the lobe-only petal',
    '  const panels = trimPanels(rows.length, (i) => rows[i].u, cap, profile.fringe || null);\n',
    '  const panels = trimPanels(rows.length, (i) => rows[i].u, cap, profile.fringe || null);\n  if (cap && cap.tubeLobe) { for (const r of rows) r.tUsed = tAt(r.u); const f = cap.tubeLobe(rows); if (f !== null) panels.splice(0, panels.length, ...(f < 0 ? [] : [{ label: \'lobe\', rowFrom: f, rowTo: rows.length - 1, spanAt: () => [-1, 1] }])); }\n'],
  ['P3b return the rows',
    '  return {\n    /* Row half-widths, FOOT ROWS INCLUDED',
    '  return {\n    tubeRows: rows, tubeTAt: tAt,\n    /* Row half-widths, FOOT ROWS INCLUDED'],
];
let G = null;
export async function geometry() {
  if (G) return G;
  let src = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
  for (const [name, from, to] of PATCHES) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`patch ${name}: anchor matched ${n} times (want exactly 1) — the shipped geometry moved; refusing`);
    src = src.replace(from, () => to);
  }
  src += '\nexport { emitPanel, rimProfile, emitRimLoop, NV as __NV_AT_LOAD, PANEL_OVERLAP_ROWS as __PANEL_OVERLAP_ROWS, RIM_TAPER_MM as __RIM_TAPER_MM };\n';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-tube-'));
  const f = path.join(dir, 'bloom-geometry.tube.mjs');
  fs.writeFileSync(f, src);
  G = await import(pathToFileURL(f).href);
  return G;
}

const kindOf = new Map(R.CONTROLS.map((c) => [c.id, c]));
export function stateOf(set) {
  const s = { ...R.DEFAULTS };
  for (const [id, v] of Object.entries(set || {})) {
    const c = kindOf.get(id); if (!c) throw new Error(`no control "${id}"`);
    s[id] = c.kind === 'slider' ? Number(v) : c.kind === 'check' ? (v === true || v === 'true') : v;
  }
  return s;
}
export function divisorsOf(n) { const d = []; for (let k = 1; k <= n; k++) if (n % k === 0) d.push(k); return d; }

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const TAU = 2 * Math.PI;
const wrap = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };

export const BLEND_MM = Number(process.env.TUBE_BLEND || 8);   // the fusion line's blend length, mm of midrib arc above the ring's top row (chosen by the sweep in §B3 of the doc; TUBE_BLEND overrides)
export const COLS_PER_SECTOR = Number(process.env.TUBE_C || 8);   // C — Claude's default, flagged (TUBE_C overrides, diagnosis only)
export const COLS_PER_SINUS = 12;     // columns across one open sinus when the NOTCH is drawn (6 per half), Claude's default
export const FLARE_FLOOR_ROW = Number(process.env.TUBE_FLARE_FLOOR || 4);   // the lowest row a flared lobe may start on: above the foot rows (0, 1), the ring row (2) and the seam's first blade row (3) — Claude's default, measured (see the guard)
export const SLIT_OVERLAP_MM = 1.0;   // how far the ring panel runs past an edge petal's midrib, and the edge half past it the other way, so the two closed shells OVERLAP rather than touch (Claude's default)

/* the arc of a petal's OWN section from its midrib to one margin (32 chords) —
   the ONE expression the blend, the sinus and the slit edge all read */
function sideArc(own, sgn) { let a = 0, prev = own(0).P; for (let q = 1; q <= 32; q++) { const P = own((sgn * q) / 32).P; a += len(sub(P, prev)); prev = P; } return a; }
const smoother = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
const wrapPi = (a) => { a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a; };

/* a piecewise-linear v -> phi map from segments { a, b, cols } (the ring's
   column knots): periodic panels use N columns, open ones N + 1 */
function knotMap(segs, periodic) {
  const cols = [0]; for (const sg of segs) cols.push(cols[cols.length - 1] + sg.cols);
  const N = cols[cols.length - 1];
  const phiOf = (r, v) => { const c = ((v + 1) / 2) * N; let i = 0; while (i < segs.length - 1 && c > cols[i + 1]) i++; const f = (c - cols[i]) / segs[i].cols; return segs[i].a + (segs[i].b - segs[i].a) * f; };
  return { phiOf, NVp: periodic ? N : N + 1, N };
}

/* THE NOTCH (BLEND's first joint). In an OPEN sinus — the arc of the ring's top
   rim between two neighbouring petals' margins at the ring's top row, width 2W
   — the rim is cut down into a U: an arc of radius r at each corner, tangent to
   the petal margin at its own end on the rim (so the outline turns no corner
   where it hands over) and to a flat bottom at depth r (1 - sin beta), beta
   the margin's lean off the meridian; at r cos(beta) = W the two arcs meet at
   the sinus centre. r = BLEND * W / cos(beta), so the radius scales with the
   slider and is capped by the room (W) the sinus has; a closed sinus (W <= 0) has no room and the
   notch is INERT there by construction. The cut is drawn by lowering the
   ring's own rows in the sinus: row i is evaluated at meridian parameter
   t = i - depth(phi)/spacing * ramp(i), ramp 0 at the ring row (2) rising
   linearly to 1 at the top, so no row ever crosses its neighbour and the
   ring's surface is still the ring's own (between rows, linear in t). */
function notchDepth(list) {
  return (phi) => {
    let best = 0;
    for (const sn of list) {
      if (!(sn.r > 0)) continue;
      const x = Math.abs(wrapPi(phi - sn.c)) * sn.rho;
      if (x >= sn.W) continue;
      /* the arc through the margin's own end (W, 0), tangent there to the
         margin's lean beta, centred at (W - r cos beta, r sin beta); below its
         lowest point the cut is flat */
      const cx = sn.W - sn.r * Math.cos(sn.beta), cy = sn.r * Math.sin(sn.beta);
      const y = x <= cx ? sn.r - cy : Math.sqrt(Math.max(0, sn.r * sn.r - (x - cx) ** 2)) - cy;
      if (y > best) best = y;
    }
    return best;
  };
}
function dippedCurves(gg, R1, list, spacing) {
  const depth = notchDepth(list);
  const lerp3 = (A, B, f) => [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
  return Array.from({ length: R1 + 1 }, (_, r) => (phi) => {
    const d = depth(phi);
    if (!(d > 0) || r <= 2) return gg.curveAt(r)(phi);
    const t = r - (d / spacing) * ((r - 2) / (R1 - 2));
    const i = Math.floor(t), f = t - i;
    return f === 0 ? gg.curveAt(i)(phi) : lerp3(gg.curveAt(i)(phi), gg.curveAt(i + 1)(phi), f);
  });
}

/* ---------------- the ring's surface at one whorl ----------------
   mids[r][p] = the midrib point of petal p at row r. The ring's section at
   row r is a closed curve in global azimuth phi in [phi0, phi0 + 2 pi),
   phi0 = petal 0's own midrib azimuth less half a sector, so each sector
   [phi_p - D/2, phi_p + D/2] is one petal's. */
function ringCurve(mids, r, shape) {
  const n = mids[r].length;
  const cyl = mids[r].map((P) => ({ rho: Math.hypot(P[0], P[1]), th: Math.atan2(P[1], P[0]), z: P[2], P }));
  const th0 = cyl[0].th;
  /* unwrap the midrib azimuths into an increasing sequence from th0 */
  const ths = cyl.map((c, p) => th0 + wrap(c.th - th0) + (p > 0 && wrap(c.th - th0) === 0 ? TAU : 0));
  for (let p = 1; p < n; p++) if (!(ths[p] > ths[p - 1])) throw new Error(`T0: midribs not in azimuth order at row ${r} — not a RADIAL whorl`);
  const D = TAU / n;
  /* locate global angle phi in sector interval [p, p+1] with fraction f */
  const at = (phi) => {
    let x = phi - ths[0]; x = ((x % TAU) + TAU) % TAU;          // 0..2pi from midrib 0
    let p = Math.floor(x / D + 1e-12) % n;
    /* nominal sectors are uniform for a RADIAL whorl; T0 asserts that */
    const f = (x - p * D) / D;
    return { p, q: (p + 1) % n, f };
  };
  if (shape === 'STRAIGHT') {
    return (phi) => { const { p, q, f } = at(phi); const A = cyl[p].P, B = cyl[q].P; return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f]; };
  }
  /* ROUND: periodic Catmull-Rom on (rho, z) against the parameter f, the
     azimuth itself exact (the curve is drawn ROUND the axis) */
  const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return (phi) => {
    const { p, q, f } = at(phi);
    const m = (p - 1 + n) % n, s = (q + 1) % n;
    if (f === 0) return cyl[p].P;     // the midrib itself, the SAME double (T1)
    const rho = cr(cyl[m].rho, cyl[p].rho, cyl[q].rho, cyl[s].rho, f);
    const z = cr(cyl[m].z, cyl[p].z, cyl[q].z, cyl[s].z, f);
    const th = ths[p] + f * D;
    return [rho * Math.cos(th), rho * Math.sin(th), z];
  };
}

/* the ring's row objects for one panel: v -> phi through a piecewise-linear map
   whose breakpoints are the panel's edges and every midrib inside it, so with C
   columns per sector a column lands on every midrib EXACTLY (STRAIGHT's creases
   are columns). */
function panelRows(curves, us, phiOf, tAt, sign) {
  const NR = curves.length;
  const point = (r, v) => curves[r](phiOf(r, v));
  const h = 1e-6;
  const rows = [];
  for (let r = 0; r < NR; r++) {
    const ia = r === 0 ? r : r - 1, ib = r === NR - 1 ? r : r + 1;
    rows.push({ u: us[r], tUsed: tAt(us[r]), sect: (v) => {
      const P = point(r, v);
      const dv = sub(point(r, Math.min(1, v + h)), point(r, Math.max(-1, v - h)));
      let du = sub(point(ib, v), point(ia, v));
      if (len(du) < 1e-12) du = sub(point(Math.min(NR - 1, ib + 1), v), point(Math.max(0, ia - 1), v));
      const n = cross(du, dv);
      /* ONE GLOBAL SIGN per ring, fixed once at the ring row where twist is
         exactly 0 (tau(0) = 0). The first cut oriented every point onto the
         NEAREST PETAL's own normal, and twist rotates that normal about the
         midrib — at twist 90 / 180 the reference turned sideways / over and
         flipped the ring's skins partway up: 338-648 census pairs and an
         inward shell on a ring whose midribs had not moved (residual
         identical to the default). du x dv is continuous on a regular
         surface, so one sign is the whole of orientation. */
      return { P, n: mul(n, sign / len(n)) };
    } });
  }
  return rows;
}

/* ---------------- one build ---------------- */
export async function buildTube(set, { shape = 'ROUND', k = 0, exportMode = true, end = 'nib', perLayerK = null, tamper = null, h = null, blendMm = BLEND_MM, blend = 0, slits = 'edge' } = {}) {
  const G = await geometry();
  const st = stateOf(set);
  if (st.placement !== 'RADIAL') throw new Error(`TUBE is RADIAL only (asked ${st.placement})`);
  /* the nib entry, the plan's own expression — or the tip, for the control */
  const nibU = (p) => { const ap = p.tipCap && p.tipCap.apex; return ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : 1; };
  /* pass 1: the plain bloom, for the petals' own nib entries and the baseline */
  /* the plain bloom, with a hook that only RECORDS each petal's rows and
     triangle range and returns null (keep today's panels): its only write is
     r.tUsed = tAt(u), which emitPanel then writes with the same value */
  const plainAcc = new G.MeshBuilder({ exportMode });
  const plainRanges = [], plainRows = [];
  const plain = G.buildBloomInto(plainAcc, st, { below: null, capability: { tubeLobe: (rows) => { plainRanges.push({ from: plainAcc.positions.length / 9 }); plainRows.push(rows); return null; } } });
  for (let i = 0; i < plainRanges.length; i++) plainRanges[i].to = i + 1 < plainRanges.length ? plainRanges[i + 1].from : plainAcc.positions.length / 9;
  const n = plain.foot.slotCount, layers = plain.foot.layerCount;
  const uNib = Math.min(...plain.petalsAll.map(nibU));
  /* k = n is FREE — today's bloom, built by the shipped path with no capability */
  const kOf = (L) => (perLayerK ? perLayerK[L] : k);
  const anyRing = Array.from({ length: layers }, (_, L) => kOf(L)).some((x) => x !== n);
  for (let L = 0; L < layers; L++) { const x = kOf(L); if (x !== 0 && n % x !== 0) throw new Error(`k ${x} does not divide n ${n} (the build would snap; the prototype refuses)`); }
  if (!anyRing) return { st, n, layers, uNib, h, lastRow: null, plainRanges, plainRows, petalRanges: plainRanges, petalRows: plainRows, blendInfo: [], plain, plainTris: plainAcc.positions.length / 9, built: plain, positions: plainAcc.positions, tubeTris: plainAcc.positions.length / 9, ringShells: [], ringReport: [], G, free: true };
  if (perLayerK && new Set(perLayerK).size > 1) throw new Error('mixed per-layer k is not built in the prototype (one capability for all layers)');
  /* pass A: every petal's own rows, no blade emitted — so the ring's curve
     exists at EVERY row before any petal is drawn (the blend reads it) */
  const collect = G.buildBloomInto(new G.MeshBuilder({ exportMode }), st, { below: null, capability: { tubeLobe: () => -1 } });
  const geo = [];
  for (let L = 0; L < layers; L++) {
    const ps = collect.petalsAll.slice(L * n, (L + 1) * n);
    if (ps.length !== n) throw new Error(`layer ${L}: ${ps.length} petals of ${n} — a slot was omitted`);
    const rowsOf = ps.map((p) => p.tubeRows);
    const NRall = rowsOf[0].length;
    for (let p = 1; p < n; p++) for (let r = 0; r < NRall; r++) if (!Object.is(rowsOf[p][r].u, rowsOf[0][r].u)) throw new Error(`T0: layer ${L} petal ${p} row ${r} u ${rowsOf[p][r].u} != ${rowsOf[0][r].u} — the whorl does not share one ladder (per-slot field?)`);
    const usAll = rowsOf[0].map((r) => r.u);
    /* the ring's last row: below the nib entry (end 'nib'), the tip (end 'tip'),
       or the last row at or below the fusion height h */
    let R1 = 0;
    if (h !== null) { while (R1 + 1 < NRall && usAll[R1 + 1] <= h) R1++; }
    else { while (R1 + 1 < NRall && (end === 'tip' ? true : usAll[R1 + 1] < uNib)) R1++; }
    const midsAll = [], normalsAll = [];
    for (let r = 0; r < NRall; r++) { const m = [], nn = []; for (let p = 0; p < n; p++) { const q = rowsOf[p][r].sect(0); m.push(q.P); nn.push(q.n); } midsAll.push(m); normalsAll.push(nn); }
    if (tamper === 'swapRows') { const a = Math.floor(R1 * 0.4), b = Math.floor(R1 * 0.7); [midsAll[a], midsAll[b]] = [midsAll[b], midsAll[a]]; [normalsAll[a], normalsAll[b]] = [normalsAll[b], normalsAll[a]]; }
    const curveCache = new Map();
    const curveAt = (r) => { if (!curveCache.has(r)) curveCache.set(r, ringCurve(midsAll, r, shape)); return curveCache.get(r); };
    const sign = (() => {
      const ph = Math.atan2(midsAll[2][0][1], midsAll[2][0][0]), hh = 1e-6;
      const du = sub(curveAt(3)(ph), curveAt(1)(ph)), dv = sub(curveAt(2)(ph + hh), curveAt(2)(ph - hh));
      return dot(cross(du, dv), normalsAll[2][0]) < 0 ? -1 : 1;
    })();
    /* the ring's own unit normal at (row, azimuth), the same du x dv and sign the ring panels use */
    const ringN = (r, th) => {
      const ia = r === 0 ? r : r - 1, ib = r === NRall - 1 ? r : r + 1, hh = 1e-6;
      let du = sub(curveAt(ib)(th), curveAt(ia)(th));
      if (len(du) < 1e-12) du = sub(curveAt(Math.min(NRall - 1, ib + 1))(th), curveAt(Math.max(0, ia - 1))(th));
      const nn = cross(du, sub(curveAt(r)(th + hh), curveAt(r)(th - hh)));
      return mul(nn, sign / len(nn));
    };
    /* the midrib arc length from the ring's top row, per row, in mm (the blend's own measure) */
    const sMid = new Array(NRall).fill(0);
    for (let r = R1 + 1; r < NRall; r++) sMid[r] = sMid[r - 1] + len(sub(midsAll[r][0], midsAll[r - 1][0]));
    /* BLEND (Eva's ruling on Part B). Both joints are read here, once, from the
       petals' own rows, and BOTH ARE INERT AT BLEND 0 BY BRANCH (flareRows 0,
       every notch radius 0, no column re-knotting) — so BLEND 0 is the build
       this file made before the slider existed, float for float. */
    let flareRows = 0, flareNeed = 0, flareArcMm = 0, sinuses = [], notchOn = false, spacing = 0;
    if (h !== null) {
      /* THE FLARE: the petal's lobe starts `flareRows` rows further down the
         ring, where the ring is still at full thickness, so the ring's own
         free-rim taper and bead at its top edge are BURIED inside the petal and
         the petal's flat base wall lands flush on a full-thickness ring. N_cov is
         the fewest extra rows that put RIM_TAPER_MM of midrib arc between the
         lobe's first row and the ring's top row (the taper's own length). */
      const arcDown = (from) => { let a = 0; for (let r = from + 1; r <= R1; r++) a += len(sub(midsAll[r][0], midsAll[r - 1][0])); return a; };
      const S0 = R1 - G.__PANEL_OVERLAP_ROWS;
      /* the lobe never starts inside the FOOT-TO-BLADE SEAM: a lobe sunk to
         rows 2-3 lays the petal's own seam kink onto the ring and folds there
         (measured: 4-8 pairs a petal on layers 3-5 of six, rows 2-3, before
         this floor), so the flare stops at FLARE_FLOOR_ROW and an inner whorl
         whose ring is too short to bury the whole taper is told, not folded */
      while (S0 - flareNeed > FLARE_FLOOR_ROW && arcDown(S0 - flareNeed) < G.__RIM_TAPER_MM) flareNeed++;
      /* (the sinus geometry below is read at every BLEND, for the slit edges'
         column knots and the report; only blend > 0 gives a radius) */
      flareRows = Math.min(Math.round(blend * flareNeed), Math.max(0, S0 - FLARE_FLOOR_ROW));
      flareArcMm = arcDown(S0 - flareRows);
      /* THE SINUS at the ring's top row, per neighbour pair: the arc of ring rim
         between petal p's +v margin and petal p+1's -v margin, each margin laid
         on the ring by arc length exactly as the blend lays it */
      const marg = Array.from({ length: n }, (_, p) => { const own = rowsOf[p][R1].sect, mid = midsAll[R1][p]; const rho = Math.hypot(mid[0], mid[1]), th = Math.atan2(mid[1], mid[0]); return { rho, th, plus: th + sideArc(own, 1) / rho, minus: th - sideArc(own, -1) / rho }; });
      spacing = arcDown(R1 - 4) / 4;
      const capR = 0.5 * (R1 - 2) * spacing;
      /* the LEAN of each margin where it leaves the rim: the margin's first
         step above the ring's top (row R1 -> R1 + 1, the blend's own section at
         v = +/-1) against the ring's meridian, in the ring's tangent plane,
         positive when the margin heads AWAY from the sinus as it rises. The U
         is tangent to the margin, not to the meridian, so the outline has no
         kink where it hands over. */
      const marginLean = (p, sgn) => {
        const own0 = rowsOf[p][R1].sect, own1 = rowsOf[p][R1 + 1].sect, mid0 = midsAll[R1][p], mid1 = midsAll[R1 + 1][p];
        const at = (own, mid, r, w) => { const rho = Math.hypot(mid[0], mid[1]), th = Math.atan2(mid[1], mid[0]) + sgn * sideArc(own, sgn) / rho; const R = curveAt(r)(th); return { P: add(R, mul(sub(own(sgn).P, R), w)), th }; };
        const A = at(own0, mid0, R1, 0), B = at(own1, mid1, R1 + 1, smoother(sMid[R1 + 1] / blendMm));
        const hh = 1e-4, up = sub(curveAt(R1)(A.th), curveAt(R1 - 1)(A.th)), N = ringN(R1, A.th);
        const away = sub(curveAt(R1)(A.th - sgn * hh), curveAt(R1)(A.th + sgn * hh));   // along the rim, toward the petal's own midrib
        const proj = (v) => sub(v, mul(N, dot(v, N)));
        const mv = proj(sub(B.P, A.P)), eu = proj(up), ea = proj(away);
        return Math.atan2(dot(mv, ea) / len(ea), dot(mv, eu) / len(eu));
      };
      sinuses = marg.map((a, p) => {
        const b = marg[(p + 1) % n]; const gap = wrapPi(b.minus - a.plus); const rho = (a.rho + b.rho) / 2; const W = (gap * rho) / 2;
        const beta = R1 + 1 < NRall && W > 0 ? (marginLean(p, 1) + marginLean((p + 1) % n, -1)) / 2 : 0;
        /* the arc radius at full BLEND is the one whose two arcs meet at the
           sinus centre: r cos(beta) = W */
        const r = Math.min(blend * Math.max(0, W) / Math.cos(beta), capR);
        return { p, c: a.plus + gap / 2, gapAng: gap, rho, W, r, beta, depthMm: r * (1 - Math.sin(beta)) };
      });
      notchOn = blend > 0 && sinuses.some((x) => x.r > 0);
      if (!(blend > 0)) { flareRows = 0; flareArcMm = 0; }
    }
    geo.push({ rowsOf, usAll, R1, midsAll, normalsAll, curveAt, sign, ringN, sMid, NRall, flareRows, flareNeed, flareArcMm, sinuses, notchOn, spacing });
  }
  /* pass B: the bloom with each petal reduced to what stands above the ring.
     THE FUSION LINE (h mode): over BLEND rows — from the ring's top row R1 up to
     `blendMm` of midrib arc above it — the petal's section is
        P(v) = R(theta(v)) + w * (own(v) - R(theta(v))),   n = norm((1-w) Rn + w n_own)
     with w = smootherstep(s / blendMm), s the midrib arc above R1, and theta(v)
     the petal's own v laid onto the ring by ARC LENGTH: theta = theta_mid +
     v * s_half(+/-) / rho_mid, s_half the petal's own section's arc from its
     midrib to that margin. At R1 (and the overlap row below it) w = 0, so the
     petal IS the ring there: the ring's curve at R1 is the ONE owner of the
     line where petal base meets ring top, and the petal reads it. Above the
     blend w = 1 and the row is today's own section, untouched (same object). */
  const counter = { c: 0 };
  const petalRanges = [], petalRows = [], blendInfo = [];
  const acc = new G.MeshBuilder({ exportMode });
  const lobeFrom = (rows) => {
    const c = counter.c++, L = Math.floor(c / n), p = c % n, gg = geo[L];
    petalRanges.push({ c, L, p, from: acc.positions.length / 9 });
    petalRows.push(rows);
    if (end === 'tip' && h === null) return -1;
    const R1 = gg.R1;
    /* THE SLIT EDGE (Eva's ruling): at a slit the edge petal keeps its ORIGINAL
       edge — its outer half (midrib to free margin) is the petal's own surface
       from the foot to the tip, carrying the owner's edge profile; its inner
       half rides the ring as every other petal does. */
    const kk = kOf(L), edgeMode = slits === 'edge' && h !== null && kk > 0 && kk < n;
    const m = edgeMode ? n / kk : 0;
    const side = edgeMode ? (p % m === m - 1 ? 1 : p % m === 0 ? -1 : 0) : 0;
    const S = R1 - G.__PANEL_OVERLAP_ROWS - gg.flareRows;
    if (h !== null) {
      let bEnd = R1;
      for (let i = side ? 0 : S; i < rows.length; i++) {
        const s = i <= R1 ? 0 : gg.sMid[i];
        const w = smoother(s / blendMm);
        if (w >= 1) break;
        bEnd = i;
        const own = rows[i].sect;
        const mid = gg.midsAll[i][p], rho = Math.hypot(mid[0], mid[1]), thMid = Math.atan2(mid[1], mid[0]);
        const sPlus = sideArc(own, 1), sMinus = sideArc(own, -1);
        const curve = gg.curveAt(i);
        const bl = (v) => {
          const q = own(v);
          const th = thMid + (v >= 0 ? v * sPlus : v * sMinus) / rho;
          const Rp = curve(th), Rn = gg.ringN(i, th);
          const P = add(Rp, mul(sub(q.P, Rp), w));
          let nn = add(mul(Rn, 1 - w), mul(q.n, w)); nn = mul(nn, 1 / len(nn));
          return { P, n: nn };
        };
        /* the slit edge: the outer half is the petal's OWN section at every row
           (the same function today's petal draws), the inner half rides the
           ring; they meet at the midrib, where both are the midrib point */
        rows[i].sect = side ? (v) => (v * side >= 0 ? own(v) : bl(v)) : bl;
      }
      blendInfo.push({ c, R1, bEnd, S, flareRows: gg.flareRows, uTop: rows[R1].u, uBlendEnd: rows[bEnd].u, uStart: rows[S].u, side });
    }
    /* an edge petal is ONE panel from the foot (row 0) to the tip: its inner
       half lies on the ring below the ring's top (w = 0) and blends above it;
       its outer half is its own surface the whole way */
    return side ? 0 : S;
  };
  const built = G.buildBloomInto(acc, st, { below: null, capability: { tubeLobe: lobeFrom } });
  for (let i = 0; i < petalRanges.length; i++) petalRanges[i].to = i + 1 < petalRanges.length ? petalRanges[i + 1].from : acc.positions.length / 9;
  const lastRow = geo[0].R1;
  const ringShells = [];
  const ringReport = [];
  const C = COLS_PER_SECTOR;
  for (let L = 0; L < layers; L++) {
    const gg = geo[L], R1 = gg.R1;
    const us = gg.usAll.slice(0, R1 + 1);
    const mids = gg.midsAll.slice(0, R1 + 1), normals = gg.normalsAll.slice(0, R1 + 1);
    const curves = mids.map((_, r) => gg.curveAt(r));
    const sign = gg.sign;
    const rowsOf = gg.rowsOf;
    const th0 = Math.atan2(mids[R1][0][1], mids[R1][0][0]);
    const D = TAU / n;
    const tAt = (u) => { const row = rowsOf[0].find((x) => x.u === u); return row.tUsed; };
    const kk = kOf(L);
    const ringR = Math.hypot(mids[Math.min(2, R1)][0][0], mids[Math.min(2, R1)][0][1]);   // the ring row (u = 0, foot row index 2)
    const gapHalfAng = Number(process.env.TUBE_GAP || 1) * (G.MIN_FEATURE_MM / 2) / ringR;   // TUBE_GAP scales it, diagnosis only
    const accR = new G.MeshBuilder({ exportMode });
    const panels = [];
    /* the midrib azimuths at the ring's top row, unwrapped increasing from petal 0 */
    const thm = mids[R1].map((P) => Math.atan2(P[1], P[0]));
    for (let p = 1; p < n; p++) while (thm[p] <= thm[p - 1]) thm[p] += TAU;
    const notch = gg.notchOn;
    const curvesN = notch ? dippedCurves(gg, R1, gg.sinuses, gg.spacing) : curves;
    /* the sinus between petal p and p+1, unwrapped to lie after thm[p] */
    const sinusAfter = (p) => { const sn = gg.sinuses[p]; let cc = sn.c; while (cc < thm[p]) cc += TAU; while (cc > thm[p] + TAU) cc -= TAU; return { ...sn, cc, half: sn.gapAng / 2 }; };
    /* the segments from petal p's midrib to petal p+1's: C/2 columns each side of
       the sinus centre, and where the NOTCH is drawn COLS_SINUS more inside the
       sinus so the U is resolved (a column every ~W/6) */
    const between = (p, q) => {
      const sn = sinusAfter(p), thp = thm[p];
      const thq = q === 0 ? thm[0] + TAU : thm[q];
      if (sn.r > 0) return [{ a: thp, b: sn.cc - sn.half, cols: C / 2 }, { a: sn.cc - sn.half, b: sn.cc, cols: COLS_PER_SINUS / 2 }, { a: sn.cc, b: sn.cc + sn.half, cols: COLS_PER_SINUS / 2 }, { a: sn.cc + sn.half, b: thq, cols: C / 2 }];
      return [{ a: thp, b: sn.cc, cols: C / 2 }, { a: sn.cc, b: thq, cols: C / 2 }];
    };
    if (kk === 0 && notch) {
      /* the periodic ring, re-knotted so every open sinus carries the U */
      const segs = []; for (let p = 0; p < n; p++) segs.push(...between(p, (p + 1) % n));
      const { phiOf, NVp } = knotMap(segs, true);
      const rows = panelRows(curvesN, us, phiOf, tAt, sign);
      G.__tubeWithNV(NVp, () => G.emitPanel(accR, rows, { label: 'tube', periodic: true, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, null));
      panels.push({ label: 'tube', petals: n });
    } else if (kk === 0) {
      const NVp = C * n;
      const phiOf = (r, v) => th0 - D / 2 + ((v + 1) / 2) * TAU;
      const rows = panelRows(curves, us, phiOf, tAt, sign);
      G.__tubeWithNV(NVp, () => G.emitPanel(accR, rows, { label: 'tube', periodic: true, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, null));
      panels.push({ label: 'tube', petals: n });
    } else if (slits === 'edge' && h !== null) {
      /* THE PETAL-EDGE SLIT (Eva's ruling on Part B): each panel runs from its
         first petal's midrib to its last petal's, plus SLIT_OVERLAP_MM past each
         (the edge petal's own outer half overlaps it from the other side) */
      const m = n / kk;
      for (let s = 0; s < kk; s++) {
        const p0 = s * m, p1 = p0 + m - 1;
        const rhoA = Math.hypot(mids[Math.min(2, R1)][p0][0], mids[Math.min(2, R1)][p0][1]), rhoB = Math.hypot(mids[Math.min(2, R1)][p1][0], mids[Math.min(2, R1)][p1][1]);
        const segs = [{ a: thm[p0] - SLIT_OVERLAP_MM / rhoA, b: thm[p0], cols: 2 }];
        for (let p = p0; p < p1; p++) segs.push(...between(p, p + 1));
        segs.push({ a: thm[p1], b: thm[p1] + SLIT_OVERLAP_MM / rhoB, cols: 2 });
        const { phiOf, NVp } = knotMap(segs, false);
        const rows = panelRows(curvesN, us, phiOf, tAt, sign);
        const pAcc = new G.MeshBuilder({ exportMode });
        G.__tubeWithNV(NVp, () => G.emitPanel(pAcc, rows, { label: `panel${s}`, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, null));
        for (let q = 0; q < pAcc.positions.length; q++) accR.positions.push(pAcc.positions[q]);
        ringShells.push({ layer: L, label: `panel${s}`, positions: pAcc.positions.slice() });
        panels.push({ label: `panel${s}`, petals: m });
      }
    } else {
      /* the WEDGE slit, Part A/B's construction, kept behind slits: 'wedge' */
      const m = n / kk;
      const NVp = C * m + 1;
      for (let s = 0; s < kk; s++) {
        const a0 = th0 - D / 2 + s * m * D;          // the slit before this panel (a sector bisector)
        /* breakpoints: edge, m midribs, edge; edge intervals are half-sectors trimmed by the slit's half-gap */
        const knots = [a0 + gapHalfAng];
        for (let p = 0; p < m; p++) knots.push(a0 + D / 2 + p * D);
        knots.push(a0 + m * D - gapHalfAng);
        const colKnots = [0]; for (let p = 0; p < m; p++) colKnots.push(C / 2 + p * C); colKnots.push(C * m);
        const phiOf = (r, v) => {
          const c = ((v + 1) / 2) * (NVp - 1);
          let i = 0; while (i < colKnots.length - 2 && c > colKnots[i + 1]) i++;
          const f = (c - colKnots[i]) / (colKnots[i + 1] - colKnots[i]);
          return knots[i] + (knots[i + 1] - knots[i]) * f;
        };
        const rows = panelRows(curves, us, phiOf, tAt, sign);
        const pAcc = new G.MeshBuilder({ exportMode });
        G.__tubeWithNV(NVp, () => G.emitPanel(pAcc, rows, { label: `panel${s}`, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, null));
        for (let q = 0; q < pAcc.positions.length; q++) accR.positions.push(pAcc.positions[q]);
        ringShells.push({ layer: L, label: `panel${s}`, positions: pAcc.positions.slice() });
        panels.push({ label: `panel${s}`, petals: m });
      }
    }
    if (tamper === 'detach') for (let q = 2; q < accR.positions.length; q += 3) accR.positions[q] += 40;
    if (tamper === 'flip') for (let q = 0; q < accR.positions.length; q += 9) for (let c = 0; c < 3; c++) { const t = accR.positions[q + 3 + c]; accR.positions[q + 3 + c] = accR.positions[q + 6 + c]; accR.positions[q + 6 + c] = t; }
    if (tamper === 'hole') accR.positions.splice(0, 9);
    if (kk === 0) ringShells.push({ layer: L, label: 'tube', positions: accR.positions.slice() });
    else if (tamper) { const sh = ringShells.filter((x) => x.layer === L); sh.length = 0; ringShells.splice(ringShells.length - (kk), kk, { layer: L, label: 'panels', positions: accR.positions.slice() }); }
    /* T1: the ring passes through every midrib EXACTLY, at every row */
    let t1 = 0;
    for (let r = 0; r <= R1; r++) for (let p = 0; p < n; p++) { const P = curves[r](Math.atan2(mids[r][p][1], mids[r][p][0])); t1 = Math.max(t1, len(sub(P, mids[r][p]))); }
    ringReport.push({ layer: L, k: kk, rows: R1 + 1, uTop: us[R1], ringRadiusMm: ringR, ringTris: accR.positions.length / 9, panels, midribResidualMm: t1, mids, us, tAt,
      flare: { rows: gg.flareRows, need: gg.flareNeed, arcMm: gg.flareArcMm }, notch: { on: notch, spacingMm: gg.spacing, sinuses: gg.sinuses.map((x) => ({ p: x.p, gapMm: 2 * x.W, W: x.W, r: x.r, depthMm: x.depthMm, leanDeg: x.beta * 180 / Math.PI })) } });
    for (let q = 0; q < accR.positions.length; q++) acc.positions.push(accR.positions[q]);
  }
  return { st, n, layers, uNib, h, blendMm, blend, slits, k, lastRow, plain, plainTris: plainAcc.positions.length / 9, built, positions: acc.positions, tubeTris: acc.positions.length / 9, ringShells, ringReport, petalRanges, petalRows, blendInfo, plainRanges, plainRows, plainPositions: plainAcc.positions, geo, G };
}

/* ---------------- the hub finding ----------------
   Where the ring's lower edge sits: its rows 0 (the innermost foot row), 1 and
   2 (the ring row, u = 0) sampled at 96 azimuths on the MID-SURFACE and tested
   by ray parity against the hub built ALONE by the shipped buildHubInto (the
   discovery instrument's own construction, §5). */
function insideSolid(P, pos) {
  const D = [0.5773502691896258, 0.5773502691896257, 0.5773502691896259 + 1e-3];
  let hits = 0;
  for (let t = 0; t < pos.length; t += 9) {
    const A = [pos[t], pos[t + 1], pos[t + 2]], B = [pos[t + 3], pos[t + 4], pos[t + 5]], Cc = [pos[t + 6], pos[t + 7], pos[t + 8]];
    const e1 = sub(B, A), e2 = sub(Cc, A), p = cross(D, e2), det = dot(e1, p);
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det, sv = sub(P, A), u = dot(sv, p) * inv; if (u < 0 || u > 1) continue;
    const q = cross(sv, e1), v = dot(D, q) * inv; if (v < 0 || u + v > 1) continue;
    if (dot(e2, q) * inv > 1e-9) hits++;
  }
  return hits % 2 === 1;
}
export function hubFinding(b, shape) {
  const G = b.G;
  const hubAcc = new G.MeshBuilder({ exportMode: true });
  G.buildHubInto(hubAcc, b.st, b.plain.foot.hub);
  const hub = hubAcc.positions;
  return b.ringReport.map((rr) => {
    const out = { layer: rr.layer };
    for (const r of [0, 1, 2]) {
      const curve = ringCurve(rr.mids, r, shape);
      const th0 = Math.atan2(rr.mids[r][0][1], rr.mids[r][0][0]);
      let inside = 0, rhoMin = Infinity, rhoMax = 0; const N = 96;
      for (let i = 0; i < N; i++) { const P = curve(th0 + (i / N) * TAU); if (insideSolid(P, hub)) inside++; const rho = Math.hypot(P[0], P[1]); rhoMin = Math.min(rhoMin, rho); rhoMax = Math.max(rhoMax, rho); }
      out[`row${r}`] = { inside, of: N, rhoMin, rhoMax, z: rr.mids[r][0][2] };
    }
    return out;
  });
}

/* ---------------- the measurements ---------------- */
export function stlOf(positions) {
  const nT = positions.length / 9; const buf = Buffer.alloc(84 + 50 * nT); buf.writeUInt32LE(nT, 80);
  for (let t = 0; t < nT; t++) { const o = 84 + 50 * t; for (let k = 0; k < 9; k++) buf.writeFloatLE(positions[t * 9 + k], o + 12 + 4 * k); }
  return buf;
}
/* the connectedness gate's own voxel flood fill, SLICED out of its source (the
   gate runs on import; the slice is anchored and refuses if it moved) */
let VOX = null;
function voxel() {
  if (VOX) return VOX;
  const src = fs.readFileSync(path.join(ROOT, 'tools/verify-bloom-connectedness.mjs'), 'utf8');
  const a = src.indexOf('function voxelComponents(buf, cell) {'), b = src.indexOf('const rows = buildMatrix();');
  if (a < 0 || b < 0 || b < a) throw new Error('could not slice voxelComponents/componentsRefined from verify-bloom-connectedness.mjs');
  VOX = new Function('MAX_VOXELS', `${src.slice(a, b)}\nreturn { voxelComponents, componentsRefined };`)(448e6);
  return VOX;
}
export function connected(positions, cell = 0.6) { return voxel().componentsRefined(stlOf(positions), cell); }
export function directedMismatch(positions) {
  const key = (i) => `${positions[i]},${positions[i + 1]},${positions[i + 2]}`;
  const m = new Map();
  for (let t = 0; t < positions.length / 9; t++) for (let c = 0; c < 3; c++) {
    const a = key(t * 9 + c * 3), b = key(t * 9 + ((c + 1) % 3) * 3); if (a === b) continue;
    const f = `${a}>${b}`, r = `${b}>${a}`;
    if (m.get(r) > 0) m.set(r, m.get(r) - 1); else m.set(f, (m.get(f) || 0) + 1);
  }
  let left = 0; for (const v of m.values()) left += v; return left;
}
export function measureTube(set, opts = {}) {
  return buildTube(set, opts).then((b) => {
    const shells = b.ringShells.map((s) => {
      const c = census(s.positions);
      const a = analyzeStl(stlOf(s.positions));
      const o = orientation(s.positions);
      return { layer: s.layer, label: s.label, tris: s.positions.length / 9, within: c.within, inward: o.inward, oDisagree: o.disagreements, volumeMm3: o.totalVolumeMm3, worstSpanMm: c.worstSpanMm ?? c.worstSpan ?? null, boundary: a.boundary, nonManifold: a.nonManifold, degenerate: a.degenerate, directed: directedMismatch(s.positions) };
    });
    /* THE TRANSITION: every petal (what stands above the ring, blend included)
       censused ALONE, against today's same petal censused alone */
    const sliceTris = (pos, r) => pos.slice(r.from * 9, r.to * 9);
    const petals = opts.petals === false ? null : b.petalRanges.map((r, i) => {
      const mine = sliceTris(b.positions, r), today = b.plainRanges ? sliceTris(b.plainPositions || b.positions, b.plainRanges[i]) : null;
      const cm = census(mine), ct = today ? census(today) : null;
      return { c: i, within: cm.within, worstSpanMm: cm.worstSpanMm, todayWithin: ct ? ct.within : null, tris: mine.length / 9 };
    });
    /* bit-identity above the blend: petal 0's triangles that are today's triangles, by exact key */
    let identical = null;
    if (!b.free && b.plainRanges) {
      const key = (pos, t) => Array.from(pos.slice(t * 9, t * 9 + 9)).join(',');
      const todaySet = new Set(); const pr = b.plainRanges[0]; for (let t = pr.from; t < pr.to; t++) todaySet.add(key(b.plainPositions, t));
      const mr = b.petalRanges[0]; let same = 0; for (let t = mr.from; t < mr.to; t++) if (todaySet.has(key(b.positions, t))) same++;
      identical = { petal0Tris: mr.to - mr.from, identicalToToday: same };
    }
    /* THE CROSSING above h: discovery's plan gap (its §2a formula) between petal
       c's +v margin and petal c+1's -v margin, row by row, on OUR rows (blend
       included) and on TODAY's rows, layer 0 */
    const planGap = (rowsA, rowsB, i) => { const A = rowsA[i].sect(1).P, B = rowsB[i].sect(-1).P; let d = Math.atan2(B[1], B[0]) - Math.atan2(A[1], A[0]); while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return d * (Math.hypot(A[0], A[1]) + Math.hypot(B[0], B[1])) / 2; };
    let crossing = null;
    if (!b.free && b.h !== null) {
      const n = b.n, R1 = b.geo[0].R1, ours = b.petalRows.slice(0, n), today = b.plainRows.slice(0, n);
      const NR = ours[0].length, crossedOurs = [], crossedToday = [];
      for (let i = R1; i < NR; i++) { if (planGap(ours[0], ours[1 % n], i) < 0) crossedOurs.push(+ours[0][i].u.toFixed(3)); if (planGap(today[0], today[1 % n], i) < 0) crossedToday.push(+today[0][i].u.toFixed(3)); }
      crossing = { sinusMm: planGap(ours[0], ours[1 % n], R1), uTop: ours[0][R1].u, oursAboveH: crossedOurs, todayAboveH: crossedToday };
    }
    /* THE SLIT EDGES' SHINGLE: at every slit, the two edge petals (the last of
       one panel, the first of the next) censused alone and together — the pairs
       BETWEEN them are the shingle (two shells passing as today's petals do),
       pairs WITHIN either would be a fold — beside today's same two petals */
    let slitPairs = null;
    if (!b.free && b.slits === 'edge' && b.h !== null) {
      slitPairs = [];
      for (const rr of b.ringReport) {
        if (!(rr.k > 0 && rr.k < b.n)) continue;
        const m = b.n / rr.k;
        for (let s = 0; s < rr.k; s++) {
          const pA = s * m + m - 1, pB = (s * m + m) % b.n, base = rr.layer * b.n;
          const one = (pos, ranges) => { const A = sliceTris(pos, ranges[base + pA]), B = sliceTris(pos, ranges[base + pB]); const AB = new Float64Array(A.length + B.length); AB.set(A); AB.set(B, A.length); const cA = census(A), cB = census(B), cAB = census(AB); return { withinA: cA.within, withinB: cB.within, unionWithin: cAB.within, between: cAB.cross - cA.cross - cB.cross, worstSpanMm: cAB.worstSpanMm }; };
          slitPairs.push({ layer: rr.layer, slit: s, pA, pB, ours: one(b.positions, b.petalRanges), today: one(b.plainPositions, b.plainRanges) });
        }
      }
    }
    const whole = analyzeStl(stlOf(b.positions));
    const conn = opts.conn === false ? null : connected(b.positions);
    return { b, shells, petals, identical, crossing, slitPairs, whole, conn: conn && { comps: conn.comps, stray: conn.strayFraction, refined: conn.refined } };
  });
}

/* ---------------- the fusion line, measured on the EMITTED mesh ----------------
   Rays cast down the ring's own normal at the ring's top row, at azimuth
   theta_mid(petal p) + frac * sector, every 1/12 row from 8 rows below the
   ring's top to 3 above: the top surface's height above the ring's
   mid-surface and the turn of the hit facet's normal between samples. A crease
   is a facet turn; a ledge or a groove is a height step. (Brute force over
   every triangle: a scratch instrument, ~1 s a profile.) */
export function fusionProfile(b, { p = 0, frac = 0, L = 0 } = {}) {
  const P = b.positions, g = b.geo[L], R1 = g.R1, nT = P.length / 9;
  const ringFrom = b.tubeTris - b.ringReport.reduce((a, x) => a + x.ringTris, 0);
  const shellOf = (t) => (t >= ringFrom ? 'ring' : b.petalRanges.find((r) => t >= r.from && t < r.to) ? 'petal' : 'hub');
  const nrm = (a) => mul(a, 1 / len(a));
  const hit = (O, D) => { let best = null; for (let t = 0; t < nT; t++) { const A = [P[t * 9], P[t * 9 + 1], P[t * 9 + 2]], B = [P[t * 9 + 3], P[t * 9 + 4], P[t * 9 + 5]], Cc = [P[t * 9 + 6], P[t * 9 + 7], P[t * 9 + 8]];
    const e1 = sub(B, A), e2 = sub(Cc, A), pp = cross(D, e2), det = dot(e1, pp); if (Math.abs(det) < 1e-12) continue; const inv = 1 / det, sv = sub(O, A), u = dot(sv, pp) * inv; if (u < -1e-9 || u > 1 + 1e-9) continue; const q = cross(sv, e1), v = dot(D, q) * inv; if (v < -1e-9 || u + v > 1 + 1e-9) continue; const d = dot(e2, q) * inv; if (d > 0 && (!best || d < best.d)) { let fn = nrm(cross(e1, e2)); if (dot(fn, D) > 0) fn = mul(fn, -1); best = { d, t, fn }; } } return best; };
  const th = Math.atan2(g.midsAll[R1][p][1], g.midsAll[R1][p][0]) + frac * TAU / b.n;
  const N0 = g.ringN(R1, th);
  const out = []; let prev = null, prevShell = null, sAcc = 0, lastM = null;
  for (let r = Math.max(2, R1 - 8); r < R1 + 3; r++) for (let q = 0; q < 12; q++) {
    const f = q / 12, Ma = g.curveAt(r)(th), Mb = g.curveAt(r + 1)(th), M = add(Ma, mul(sub(Mb, Ma), f));
    if (lastM) sAcc += len(sub(M, lastM)); lastM = M;
    const H = hit(add(M, mul(N0, 30)), mul(N0, -1)); if (!H) continue;
    const sh = shellOf(H.t), turn = prev ? Math.acos(Math.max(-1, Math.min(1, dot(prev, H.fn)))) * 180 / Math.PI : 0;
    out.push({ r, f, u: g.usAll[r] + (g.usAll[r + 1] - g.usAll[r]) * f, s: sAcc, sh, height: 30 - H.d, turn, change: !!(prevShell && prevShell !== sh) }); prev = H.fn; prevShell = sh;
  }
  const hs = out.map((o) => o.height);
  return { samples: out, maxTurnDeg: Math.max(...out.map((o) => o.turn)), heightMin: Math.min(...hs), heightMax: Math.max(...hs), heightRange: Math.max(...hs) - Math.min(...hs),
    worst: out.reduce((a, o) => (o.turn > a.turn ? o : a), out[0]) };
}
/* THE NOTCH CORNER, in the surface: where petal p's +v margin leaves the ring's
   top rim. BEFORE: the outline turns from the rim (heading into the sinus) up
   the margin — exterior turn 180 - (rim, margin). AFTER (r > 0): the U arrives
   tangent to the ring's meridian, so the outline turns from meridian-up into
   margin-up — exterior turn = (meridian up, margin up). Both in the ring's
   tangent plane at the corner. */
export function notchCorner(b, { p = 0, L = 0 } = {}) {
  const g = b.geo[L], R1 = g.R1, rows = b.petalRows[L * b.n + p];
  const A = rows[R1].sect(1).P, A1 = rows[R1 + 1].sect(1).P;
  const thA = Math.atan2(A[1], A[0]), hh = 1e-4;
  const rim = sub(g.curveAt(R1)(thA + hh), g.curveAt(R1)(thA - hh));
  const up = sub(g.curveAt(R1)(thA), g.curveAt(R1 - 1)(thA));
  const N = g.ringN(R1, thA);
  const proj = (v) => sub(v, mul(N, dot(v, N)));
  const ang = (a, c) => Math.acos(Math.max(-1, Math.min(1, dot(a, c) / (len(a) * len(c))))) * 180 / Math.PI;
  const sn = g.sinuses[p] || null;
  const margin = proj(sub(A1, A));
  /* AFTER: the U's own end tangent, read off the DIPPED curve the ring panel
     draws (a short chord into the sinus from the margin's end), against the
     margin going up — the turn the outline makes at the hand-over */
  let turnAfterDeg = null;
  if (sn && sn.r > 0 && g.notchOn) {
    const curves = dippedCurves(g, R1, g.sinuses, g.spacing);
    const dth = 1e-4 * (wrapPi(sn.c - thA) > 0 ? 1 : -1);
    turnAfterDeg = ang(margin, proj(sub(curves[R1](thA), curves[R1](thA + dth))));
  }
  return { cornerDeg: ang(margin, proj(rim)), turnBeforeDeg: 180 - ang(margin, proj(rim)), turnAfterDeg, gapMm: sn ? 2 * sn.W : null, r: sn ? sn.r : 0, depthMm: sn ? sn.depthMm : 0, leanDeg: sn ? sn.beta * 180 / Math.PI : 0, engaged: !!(sn && sn.r > 0 && g.notchOn) };
}

/* ---------------- attribution ----------------
   For a ring with self-intersection pairs: WHICH ROWS carry them (each pair's
   site mapped to the nearest midrib-meridian row in (rho, z) — exact for ROUND
   on a uniform whorl, where the ring is a surface of revolution of that
   meridian), and three properties of the meridian itself that decide whether a
   surface of revolution CAN be embedded: the turn at the foot-to-blade seam
   (past 90 degrees the offset surface reverses — the petal's own declared
   EFFECTIVE TILT PAST 90 class), the smallest radius (a meridian reaching the
   axis collapses the ring through it), and the nearest approach of two parts
   of the meridian more than 3 rows apart (closer than one sheet, the skins of
   the two parts collide). */
export function meridian(rr) {
  const M = rr.mids.map((m) => [Math.hypot(m[0][0], m[0][1]), m[0][2]]);
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const seamTurnDeg = Math.abs(((ang(M[2], M[3]) - ang(M[1], M[2])) * 180 / Math.PI + 540) % 360 - 180);
  let rhoMin = Infinity, rhoMinRow = -1; for (let r = 2; r < M.length; r++) if (M[r][0] < rhoMin) { rhoMin = M[r][0]; rhoMinRow = r; }
  let self = Infinity, selfAt = null;
  for (let i = 2; i < M.length; i++) for (let j = i + 4; j < M.length; j++) { const d = Math.hypot(M[i][0] - M[j][0], M[i][1] - M[j][1]); if (d < self) { self = d; selfAt = [i, j]; } }
  return { M, seamTurnDeg, rhoMin, rhoMinU: rr.us[rhoMinRow], selfApproachMm: self, selfAt: selfAt && selfAt.map((r) => +rr.us[r].toFixed(3)) };
}
export function attribute(b, shellIndex = 0) {
  const sh = b.ringShells[shellIndex], rr = b.ringReport.find((x) => x.layer === sh.layer);
  const c = census(sh.positions, { collect: true });
  const md = meridian(rr);
  const us = c.sites.map((s) => { const rho = Math.hypot(s.at[0], s.at[1]); let best = 0, bd = Infinity; md.M.forEach((m, r) => { const d = Math.hypot(m[0] - rho, m[1] - s.at[2]); if (d < bd) { bd = d; best = r; } }); return { r: best, u: rr.us[best] }; });
  const band = (lo, hi) => us.filter((x) => x.u >= lo && x.u < hi).length;
  return { within: c.within, rows: us.length ? [Math.min(...us.map((x) => x.r)), Math.max(...us.map((x) => x.r))] : null,
    uRange: us.length ? [Math.min(...us.map((x) => x.u)), Math.max(...us.map((x) => x.u))] : null,
    atSeam: us.filter((x) => x.r <= 4).length, below30: band(0, 0.3), mid: band(0.3, 0.8), mouth: band(0.8, 2),
    seamTurnDeg: md.seamTurnDeg, rhoMinMm: md.rhoMin, rhoMinU: md.rhoMinU, selfApproachMm: md.selfApproachMm, selfAt: md.selfAt, sheetMm: rr.tAt(rr.us[2]) };
}

/* ---------------- CLI ---------------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  const t0 = Date.now();
  const rows = [];
  const one = async (label, set, opt) => {
    const r = await measureTube(set, opt);
    const b = r.b;
    const row = { label, set, shape: opt.shape, k: opt.k, end: opt.end || 'nib', n: b.n, layers: b.layers, free: !!b.free, uNib: b.uNib,
      plainTris: b.plainTris, tubeTris: b.tubeTris, deltaTris: b.tubeTris - b.plainTris,
      ringTris: b.ringReport.reduce((a, x) => a + x.ringTris, 0),
      within: r.shells.reduce((a, x) => a + x.within, 0), worstSpanMm: Math.max(0, ...r.shells.map((x) => x.worstSpanMm || 0)),
      shells: r.shells.length, inward: r.shells.reduce((a, x) => a + x.inward, 0), oDisagree: r.shells.reduce((a, x) => a + x.oDisagree, 0),
      directed: r.shells.reduce((a, x) => a + x.directed, 0), shellBoundary: r.shells.reduce((a, x) => a + x.boundary, 0),
      boundary: r.whole.boundary, nonManifold: r.whole.nonManifold, degenerate: r.whole.degenerate, comps: r.conn && r.conn.comps, stray: r.conn && r.conn.stray, refined: r.conn && r.conn.refined,
      midribResidualMm: Math.max(0, ...b.ringReport.map((x) => x.midribResidualMm)),
      hub: b.free ? null : hubFinding(b, opt.shape) };
    rows.push(row);
    const f = (x) => (x === null || x === undefined ? '-' : x);
    console.log(`${label.padEnd(44)} ${opt.shape.padEnd(8)} k=${String(opt.k).padEnd(3)} ${row.free ? 'FREE' : ''} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris})  ringSI ${row.within} (span ${row.worstSpanMm.toFixed(4)})  boundary ${row.boundary} dir ${row.directed} inward ${row.inward}/${row.shells}  comps ${f(row.comps)}  midrib ${row.midribResidualMm.toExponential(1)}`);
    return row;
  };
  if (argv.includes('--attribute')) {
    const states = [['DEFAULT', {}], ['twist 90', { petalTwist: 90 }], ['twist 180', { petalTwist: 180 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }],
      ['tilt 90 x 8', { petalTilt: 90 }], ['tilt 105 x 8', { petalTilt: 105 }], ['tilt 105 x 12', { petalTilt: 105, petalCount: 12 }], ['tilt 120 x 8', { petalTilt: 120 }], ['headRise 1', { headRise: 1 }], ['tilt 75 x curl 360', { petalTilt: 75, petalSpineCurl: 360 }],
      ['tilt 75 x 12 x 3 layers', { petalTilt: 75, petalCount: 12, layerCount: 3 }], ['layers 6', { layerCount: 6 }], ['petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }]];
    const res = [];
    for (const [lab, set] of states) for (const shape of ['ROUND', 'STRAIGHT']) for (const k of [0, 2]) {
      const b = await buildTube(set, { shape, k });
      for (let i = 0; i < b.ringShells.length; i++) {
        const a = attribute(b, i);
        if (a.within === 0 && !(lab === 'DEFAULT' && i === 0)) continue;
        const sh = b.ringShells[i];
        res.push({ lab, shape, k, shell: `${sh.layer}/${sh.label}`, ...a });
        console.log(`${lab.padEnd(26)} ${shape.padEnd(8)} k=${k} L${sh.layer} ${sh.label.padEnd(7)} pairs ${String(a.within).padStart(6)}  rows ${a.rows ? a.rows.join('-') : '-'} u ${a.uRange ? a.uRange.map((x) => x.toFixed(3)).join('-') : '-'}  seam<=r4 ${a.atSeam} <.3 ${a.below30} mid ${a.mid} mouth ${a.mouth} | seamTurn ${a.seamTurnDeg.toFixed(1)} rhoMin ${a.rhoMinMm.toFixed(2)}@${(a.rhoMinU ?? 0).toFixed(2)} selfApp ${a.selfApproachMm.toFixed(2)} (${a.selfAt}) t ${a.sheetMm}`);
      }
    }
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1));
    process.exit(0);
  }
  const shapes = ['ROUND', 'STRAIGHT'];
  if (argv.includes('--partial')) {
    /* PARTIAL FUSION: the ring to h, free petals above with the blend */
    const out = [];
    const H = [0.25, 0.40, 0.55, 0.70];
    const one2 = async (label, set, opt) => {
      const r = await measureTube(set, opt);
      const pw = r.petals ? r.petals.reduce((a, p) => a + p.within, 0) : null, tw = r.petals ? r.petals.reduce((a, p) => a + (p.todayWithin || 0), 0) : null;
      const row = { label, set, shape: opt.shape, k: opt.k, h: opt.h, free: !!r.b.free, plainTris: r.b.plainTris, tubeTris: r.b.tubeTris, deltaTris: r.b.tubeTris - r.b.plainTris,
        ringPairs: r.shells.reduce((a, x) => a + x.within, 0), petalPairs: pw, todayPetalPairs: tw, boundary: r.whole.boundary, directed: r.shells.reduce((a, x) => a + x.directed, 0), inward: r.shells.reduce((a, x) => a + x.inward, 0),
        comps: r.conn && r.conn.comps, sinusMm: r.crossing && r.crossing.sinusMm, crossOurs: r.crossing && r.crossing.oursAboveH.length, crossToday: r.crossing && r.crossing.todayAboveH.length, identical: r.identical };
      out.push(row);
      console.log(`${label.padEnd(30)} ${opt.shape.padEnd(8)} k=${String(opt.k).padEnd(3)} h=${opt.h} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris}) ring ${row.ringPairs} petals ${pw} (today ${tw}) bnd ${row.boundary} dir ${row.directed} comps ${row.comps} sinus ${row.sinusMm === null ? '-' : row.sinusMm.toFixed(2)} cross ${row.crossOurs}/${row.crossToday}`);
    };
    for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const shape of shapes) { if (k === n && shape === 'STRAIGHT') continue; await one2(`petalCount ${n}`, { petalCount: n }, { shape, k, h: 0.4 }); }
    for (const h of H) for (const shape of shapes) for (const k of [0, 1, 4]) await one2('DEFAULT', {}, { shape, k, h });
    for (const h of H) for (const shape of shapes) for (const [lab, set] of [['petalCount 5', { petalCount: 5 }], ['petalCount 12', { petalCount: 12 }],
      ['tilt 60', { petalTilt: 60 }], ['tilt 75', { petalTilt: 75 }], ['tilt 90', { petalTilt: 90 }], ['tilt 105', { petalTilt: 105 }], ['tilt 75 x 5', { petalTilt: 75, petalCount: 5 }],
      ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }], ['curl -180', { petalSpineCurl: -180 }],
      ['cup 1.2', { petalCup: 1.2 }], ['cup -0.8', { petalCup: -0.8 }], ['roll 330', { petalRoll: 330 }], ['roll -330', { petalRoll: -330 }], ['twist 180', { petalTwist: 180 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['headRise 1', { headRise: 1 }], ['layers 3', { layerCount: 3 }], ['layers 6', { layerCount: 6 }]]) await one2(lab, set, { shape, k: 0, h });
    for (const shape of shapes) for (const k of [0, 2, 20]) await one2('petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }, { shape, k, h: 0.4 });
    for (const shape of shapes) await one2('layers 6 slit', { layerCount: 6 }, { shape, k: 2, h: 0.4 });
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
    console.log(`${out.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    process.exit(0);
  }
  if (argv.includes('--round2')) {
    /* PART C (Eva's rulings on Part B): ROUND only, h 0.25 the default; BLEND
       0 / 0.5 / 1 over the existing grid, slit rows at every valid k, and h
       0.40 where the notch engages */
    const out = [];
    const B3 = [0, 0.5, 1];
    const one3 = async (label, set, opt) => {
      const r = await measureTube(set, { shape: 'ROUND', ...opt });
      const b = r.b, rr = b.ringReport[0] || null;
      const pw = r.petals ? r.petals.reduce((a, p) => a + p.within, 0) : null, tw = r.petals ? r.petals.reduce((a, p) => a + (p.todayWithin || 0), 0) : null;
      const fp = b.free ? null : fusionProfile(b);
      const nc = b.free ? null : notchCorner(b);
      const sp = r.slitPairs || [];
      const row = { label, set, k: opt.k, h: opt.h, blend: opt.blend, free: !!b.free, plainTris: b.plainTris, tubeTris: b.tubeTris, deltaTris: b.tubeTris - b.plainTris,
        ringPairs: r.shells.reduce((a, x) => a + x.within, 0), petalPairs: pw, todayPetalPairs: tw, boundary: r.whole.boundary, nonManifold: r.whole.nonManifold, directed: r.shells.reduce((a, x) => a + x.directed, 0), inward: r.shells.reduce((a, x) => a + x.inward, 0),
        comps: r.conn && r.conn.comps, flareRows: rr && rr.flare.rows, flareNeed: rr && rr.flare.need, flareArcMm: rr && rr.flare.arcMm,
        sinusMm: nc && nc.gapMm, notch: nc && nc.engaged, notchR: nc && nc.r, notchDepth: nc && nc.depthMm, leanDeg: nc && nc.leanDeg, cornerTurnBefore: nc && nc.turnBeforeDeg, cornerTurnAfter: nc && nc.turnAfterDeg,
        fusionMaxTurn: fp && fp.maxTurnDeg, fusionHeightMin: fp && fp.heightMin, fusionHeightMax: fp && fp.heightMax,
        slits: sp.length, slitEdgeWithin: sp.reduce((a, x) => a + x.ours.withinA + x.ours.withinB, 0), slitUnionWithin: sp.reduce((a, x) => a + x.ours.unionWithin, 0), shingleOurs: sp.reduce((a, x) => a + x.ours.between, 0), shingleToday: sp.reduce((a, x) => a + x.today.between, 0), slitPairs: sp };
      out.push(row);
      const f = (x, d = 2) => (x === null || x === undefined ? '-' : typeof x === 'number' ? x.toFixed(d) : x);
      console.log(`${label.padEnd(26)} k=${String(opt.k).padEnd(2)} h=${opt.h} b=${opt.blend} tris ${row.plainTris}->${row.tubeTris} (${row.deltaTris >= 0 ? '+' : ''}${row.deltaTris}) ring ${row.ringPairs} petals ${pw} (today ${tw}) bnd ${row.boundary} nm ${row.nonManifold} dir ${row.directed} inw ${row.inward} comps ${row.comps} | flare ${row.flareRows}/${row.flareNeed} turn ${f(row.fusionMaxTurn, 1)} | sinus ${f(row.sinusMm)} notch ${row.notch ? `r ${f(row.notchR)} depth ${f(row.notchDepth)} turn ${f(row.cornerTurnBefore, 1)}->${f(row.cornerTurnAfter, 1)}` : 'inert'}${row.slits ? ` | slits ${row.slits} edgeWithin ${row.slitEdgeWithin} unionWithin ${row.slitUnionWithin} shingle ${row.shingleOurs} (today ${row.shingleToday})` : ''}`);
    };
    const STATES = [['DEFAULT', {}], ['petalCount 5', { petalCount: 5 }], ['petalCount 12', { petalCount: 12 }],
      ['tilt 60', { petalTilt: 60 }], ['tilt 75', { petalTilt: 75 }], ['tilt 90', { petalTilt: 90 }], ['tilt 105', { petalTilt: 105 }], ['tilt 75 x 5', { petalTilt: 75, petalCount: 5 }],
      ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360', { petalSpineCurl: 360 }], ['curl -180', { petalSpineCurl: -180 }],
      ['cup 1.2', { petalCup: 1.2 }], ['cup -0.8', { petalCup: -0.8 }], ['roll 330', { petalRoll: 330 }], ['roll -330', { petalRoll: -330 }], ['twist 180', { petalTwist: 180 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['headRise 1', { headRise: 1 }], ['layers 3', { layerCount: 3 }], ['layers 6', { layerCount: 6 }]];
    for (const [lab, set] of STATES) for (const blend of B3) await one3(lab, set, { k: 0, h: 0.25, blend });
    for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const blend of B3) await one3(`petalCount ${n}`, { petalCount: n }, { k, h: 0.25, blend });
    for (const [lab, set] of [['DEFAULT', {}], ['petalCount 5', { petalCount: 5 }], ['layers 3', { layerCount: 3 }]]) for (const blend of B3) await one3(lab, set, { k: 0, h: 0.4, blend });
    for (const k of [0, 2, 20]) await one3('petalCount 40 x 6 layers', { petalCount: 40, layerCount: 6 }, { k, h: 0.25, blend: 1 });
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
    console.log(`${out.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    process.exit(0);
  }
  if (argv.includes('--control')) {
    /* MUST-FAILS: each instrument shown able to see the failure it exists for */
    const c = [];
    const a = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'swapRows' }); c.push(['census fires on a folded ring (rows 40%/70% swapped)', a.shells[0].within > 0, a.shells[0].within]);
    const d = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'detach' }); c.push(['flood fill fires on a ring lifted 40 mm', d.conn.comps > 1, d.conn.comps]);
    const fl = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'flip' }); c.push(['orientation fires on a ring wound inward', fl.shells[0].inward === 1, fl.shells[0].inward]);
    const h = await measureTube({}, { shape: 'ROUND', k: 0, tamper: 'hole' }); c.push(['boundary census fires on a ring missing one triangle', h.whole.boundary > 0 && h.shells[0].boundary > 0, h.whole.boundary]);
    const sw = await measureTube({}, { shape: 'STRAIGHT', k: 2, tamper: 'swapRows' }); c.push(['census fires on a folded SLIT panel set (STRAIGHT k 2)', sw.shells[0].within > 0, sw.shells[0].within]);
    let ok = true; for (const [nm, fired, v] of c) { console.log(`${fired ? 'FIRED ' : 'SILENT'}  ${nm}  (${v})`); ok = ok && fired; }
    console.log(ok ? `CONTROL: all ${c.length} must-fails fired` : 'CONTROL FAILED — an instrument is blind to the failure it exists for');
    process.exit(ok ? 0 : 1);
  }
  const quick = argv.includes('--quick');
  /* 1. the count x k grid at the shipped form */
  for (const n of [5, 6, 8, 12]) for (const k of [0, ...divisorsOf(n)]) for (const shape of shapes) { if (k === n && shape === 'STRAIGHT') continue; await one(`petalCount ${n}`, { petalCount: n }, { shape, k }); }
  if (!quick) {
    /* 2. the tube range: tilt, at the full tube and one slit */
    for (const t of [60, 75, 90, 105, 120]) for (const n of [5, 8, 12]) for (const shape of shapes) for (const k of [0, 1]) await one(`tilt ${t} x ${n}`, { petalTilt: t, petalCount: n }, { shape, k });
    /* 3. form: curl carries through, cup / roll / twist / width are inert in the ring */
    for (const [lab, set] of [['curl -180', { petalSpineCurl: -180 }], ['curl -90', { petalSpineCurl: -90 }], ['curl 90', { petalSpineCurl: 90 }], ['curl 180', { petalSpineCurl: 180 }], ['curl 270', { petalSpineCurl: 270 }], ['curl 360 (max)', { petalSpineCurl: 360 }],
      ['cup 1.2 (max)', { petalCup: 1.2 }], ['cup -0.8 (min)', { petalCup: -0.8 }], ['roll 330 (max)', { petalRoll: 330 }], ['roll -330 (min)', { petalRoll: -330 }], ['twist 180 (max)', { petalTwist: 180 }], ['twist 90', { petalTwist: 90 }],
      ['width 30', { petalWidth: 30 }], ['length 20', { petalLength: 20 }], ['length 60', { petalLength: 60 }], ['sheet 2.4', { sheetThickness: 2.4 }],
      ['tilt 75 x curl 360', { petalTilt: 75, petalSpineCurl: 360 }], ['tilt 75 x curl -180', { petalTilt: 75, petalSpineCurl: -180 }], ['tilt 75 x cup 1.2', { petalTilt: 75, petalCup: 1.2 }], ['tilt 75 x roll 330', { petalTilt: 75, petalRoll: 330 }],
      ['headRise 0.5', { headRise: 0.5 }], ['headRise 1', { headRise: 1 }]]) for (const shape of shapes) for (const k of [0, 2]) await one(lab, set, { shape, k });
    /* 4. layers, and the densest eligible state */
    for (const L of [2, 3, 6]) for (const shape of shapes) for (const k of [0, 2, 8]) await one(`layers ${L}`, { layerCount: L }, { shape, k });
    for (const shape of shapes) for (const k of [0, 2, 20, 40]) await one('petalCount 40 x 6 layers (densest)', { petalCount: 40, layerCount: 6 }, { shape, k });
    for (const shape of shapes) await one('tilt 75 x 12 x 3 layers', { petalTilt: 75, petalCount: 12, layerCount: 3 }, { shape, k: 0 });
    /* 5. the apex: the same ring run to the TIP (the control for "ends at the nib entry") */
    for (const shape of shapes) for (const n of [5, 8]) await one(`TO THE TIP x ${n}`, { petalCount: n }, { shape, k: 0, end: 'tip' });
  }
  console.log(`${rows.length} builds in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, (key, v) => (key === 'refined' && v === null ? undefined : v), 1));
}
