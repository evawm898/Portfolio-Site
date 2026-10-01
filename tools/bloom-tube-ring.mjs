/* ===================================================================
   SCRATCH PROTOTYPE — THE CLOSED-RING TUBE. NOT SHIPPED, NOT A GATE.

     node tools/bloom-tube-ring.mjs [--quick] [--json <file>] [--control]

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
    '  const panels = trimPanels(rows.length, (i) => rows[i].u, cap, profile.fringe || null);\n  if (cap && cap.tubeLobe) { for (const r of rows) r.tUsed = tAt(r.u); const f = cap.tubeLobe(rows); panels.splice(0, panels.length, ...(f < 0 ? [] : [{ label: \'lobe\', rowFrom: f, rowTo: rows.length - 1, spanAt: () => [-1, 1] }])); }\n'],
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
  src += '\nexport { emitPanel, rimProfile, emitRimLoop, NV as __NV_AT_LOAD, PANEL_OVERLAP_ROWS as __PANEL_OVERLAP_ROWS };\n';
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

export const COLS_PER_SECTOR = Number(process.env.TUBE_C || 8);   // C — Claude's default, flagged (TUBE_C overrides, diagnosis only)

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
export async function buildTube(set, { shape = 'ROUND', k = 0, exportMode = true, end = 'nib', perLayerK = null, tamper = null } = {}) {
  const G = await geometry();
  const st = stateOf(set);
  if (st.placement !== 'RADIAL') throw new Error(`TUBE is RADIAL only (asked ${st.placement})`);
  /* the nib entry, the plan's own expression — or the tip, for the control */
  const nibU = (p) => { const ap = p.tipCap && p.tipCap.apex; return ap && ap.active && ap.drawnLengthMm > 0 ? ap.xLawMm / ap.drawnLengthMm : 1; };
  /* pass 1: the plain bloom, for the petals' own nib entries and the baseline */
  const plainAcc = new G.MeshBuilder({ exportMode });
  const plain = G.buildBloomInto(plainAcc, st, { below: null });
  const n = plain.foot.slotCount, layers = plain.foot.layerCount;
  const uNib = Math.min(...plain.petalsAll.map(nibU));
  /* the ring's last row: the last row strictly below the nib entry (the tip, for end = 'tip') */
  let lastRow = null;
  const lobeFrom = (rows) => {
    let R1 = 0; while (R1 + 1 < rows.length && (end === 'tip' ? true : rows[R1 + 1].u < uNib)) R1++;
    lastRow = R1;
    return end === 'tip' ? -1 : R1 - G.__PANEL_OVERLAP_ROWS;   // -1: no lobe at all (the to-the-tip control)
  };
  /* k = n is FREE — today's bloom, built by the shipped path with no capability */
  const kOf = (L) => (perLayerK ? perLayerK[L] : k);
  const anyRing = Array.from({ length: layers }, (_, L) => kOf(L)).some((x) => x !== n);
  for (let L = 0; L < layers; L++) { const x = kOf(L); if (x !== 0 && n % x !== 0) throw new Error(`k ${x} does not divide n ${n} (the build would snap; the prototype refuses)`); }
  if (!anyRing) return { st, n, layers, uNib, lastRow: null, plain, plainTris: plainAcc.positions.length / 9, built: plain, positions: plainAcc.positions, tubeTris: plainAcc.positions.length / 9, ringShells: [], ringReport: [], G, free: true };
  if (perLayerK && new Set(perLayerK).size > 1) throw new Error('mixed per-layer k is not built in the prototype (one capability for all layers)');
  /* pass 2: the bloom with each petal reduced to its lobe */
  const acc = new G.MeshBuilder({ exportMode });
  const built = G.buildBloomInto(acc, st, { below: null, capability: { tubeLobe: lobeFrom } });
  const ringShells = [];
  const ringReport = [];
  const C = COLS_PER_SECTOR;
  for (let L = 0; L < layers; L++) {
    const ps = built.petalsAll.slice(L * n, (L + 1) * n);
    if (ps.length !== n) throw new Error(`layer ${L}: ${ps.length} petals of ${n} — a slot was omitted`);
    const R1 = lastRow;
    const rowsOf = ps.map((p) => p.tubeRows);
    for (let p = 1; p < n; p++) for (let r = 0; r <= R1; r++) if (!Object.is(rowsOf[p][r].u, rowsOf[0][r].u)) throw new Error(`T0: layer ${L} petal ${p} row ${r} u ${rowsOf[p][r].u} != ${rowsOf[0][r].u} — the whorl does not share one ladder (per-slot field?)`);
    const us = rowsOf[0].slice(0, R1 + 1).map((r) => r.u);
    const mids = [], normals = [];
    for (let r = 0; r <= R1; r++) { const m = [], nn = []; for (let p = 0; p < n; p++) { const q = rowsOf[p][r].sect(0); m.push(q.P); nn.push(q.n); } mids.push(m); normals.push(nn); }
    if (tamper === 'swapRows') { const a = Math.floor(R1 * 0.4), b = Math.floor(R1 * 0.7); [mids[a], mids[b]] = [mids[b], mids[a]]; [normals[a], normals[b]] = [normals[b], normals[a]]; }
    const curves = mids.map((_, r) => ringCurve(mids, r, shape));
    const sign = (() => {
      const ph = Math.atan2(mids[2][0][1], mids[2][0][0]), hh = 1e-6;
      const du = sub(curves[3](ph), curves[1](ph)), dv = sub(curves[2](ph + hh), curves[2](ph - hh));
      return dot(cross(du, dv), normals[2][0]) < 0 ? -1 : 1;
    })();
    const th0 = Math.atan2(mids[R1][0][1], mids[R1][0][0]);
    const D = TAU / n;
    const tAt = (u) => { const row = rowsOf[0].find((x) => x.u === u); return row.tUsed; };
    const kk = kOf(L);
    const ringR = Math.hypot(mids[Math.min(2, R1)][0][0], mids[Math.min(2, R1)][0][1]);   // the ring row (u = 0, foot row index 2)
    const gapHalfAng = Number(process.env.TUBE_GAP || 1) * (G.MIN_FEATURE_MM / 2) / ringR;   // TUBE_GAP scales it, diagnosis only
    const accR = new G.MeshBuilder({ exportMode });
    const panels = [];
    if (kk === 0) {
      const NVp = C * n;
      const phiOf = (r, v) => th0 - D / 2 + ((v + 1) / 2) * TAU;
      const rows = panelRows(curves, us, phiOf, tAt, sign);
      G.__tubeWithNV(NVp, () => G.emitPanel(accR, rows, { label: 'tube', periodic: true, rowFrom: 0, rowTo: rows.length - 1, spanAt: () => [-1, 1] }, tAt, null));
      panels.push({ label: 'tube', petals: n });
    } else {
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
    ringReport.push({ layer: L, k: kk, rows: R1 + 1, uTop: us[R1], ringRadiusMm: ringR, ringTris: accR.positions.length / 9, panels, midribResidualMm: t1, mids, us, tAt });
    for (let q = 0; q < accR.positions.length; q++) acc.positions.push(accR.positions[q]);
  }
  return { st, n, layers, uNib, lastRow, plain, plainTris: plainAcc.positions.length / 9, built, positions: acc.positions, tubeTris: acc.positions.length / 9, ringShells, ringReport, hubAcc: null, G };
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
    const whole = analyzeStl(stlOf(b.positions));
    const conn = opts.conn === false ? null : connected(b.positions);
    return { b, shells, whole, conn: conn && { comps: conn.comps, stray: conn.strayFraction, refined: conn.refined } };
  });
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
  const shapes = ['ROUND', 'STRAIGHT'];
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
