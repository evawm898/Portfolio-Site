/* ===================================================================
   SCRATCH PROTOTYPE — THE CLOSED-RING TUBE: the BROWSER-SAFE CORE. NOT SHIPPED.

   Everything that BUILDS the tube (the anchored patches, the ring, the blend,
   BLEND's flare and notch, the slit edges) and the pure instruments
   (fusionProfile, notchCorner, meridian, hubFinding), with no node: import,
   so the Node tools (tools/bloom-tube-ring.mjs — read ITS header for the
   design) and the throwaway preview page (tools/tube-preview.html) build
   through the ONE patched copy of the owner. Where the patched source is
   imported from is the caller's: setGeometryLoader({ read, load }) — Node
   writes a temp file, the page imports a Blob URL. bloom-geometry.js itself is
   never written.
   =================================================================== */
import * as R from '../bloom-registry.js';

const ENV = (typeof process !== 'undefined' && process.env) || {};

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
let LOADER = null;
/* { read: async () => the shipped bloom-geometry.js as text, load: async (src) => the module } */
export function setGeometryLoader(l) { LOADER = l; G = null; }
export function patchSource(src) {
  for (const [name, from, to] of PATCHES) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`patch ${name}: anchor matched ${n} times (want exactly 1) — the shipped geometry moved; refusing`);
    src = src.replace(from, () => to);
  }
  return src + '\nexport { emitPanel, rimProfile, emitRimLoop, NV as __NV_AT_LOAD, PANEL_OVERLAP_ROWS as __PANEL_OVERLAP_ROWS, RIM_TAPER_MM as __RIM_TAPER_MM };\n';
}
let G = null;
export async function geometry() {
  if (G) return G;
  if (!LOADER) throw new Error('bloom-tube-core: no geometry loader set (setGeometryLoader)');
  G = await LOADER.load(patchSource(await LOADER.read()));
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

export const BLEND_MM = Number(ENV.TUBE_BLEND || 8);   // the fusion line's blend length, mm of midrib arc above the ring's top row (chosen by the sweep in §B3 of the doc; TUBE_BLEND overrides)
export const COLS_PER_SECTOR = Number(ENV.TUBE_C || 8);   // C — Claude's default, flagged (TUBE_C overrides, diagnosis only)
export const COLS_PER_SINUS = 12;     // columns across one open sinus when the NOTCH is drawn (6 per half), Claude's default
export const RULED_BLEND = 1;   // Eva's ruling on Part C (Oct 1): the BLEND default is 1. buildTube's own default stays 0 so Parts A/B reproduce; the preview page and any build session start at RULED_BLEND.
export const FLARE_FLOOR_ROW = Number(ENV.TUBE_FLARE_FLOOR || 4);   // the lowest row a flared lobe may start on: above the foot rows (0, 1), the ring row (2) and the seam's first blade row (3) — Claude's default, measured (see the guard)
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
   columns per sector a column lands on every midrib EXACTLY (STRAIGHT's creases, deleted by ruling,
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
  /* ROUND is the only across-shape (Eva's ruling on Part C: STRAIGHT is deleted;
     Parts A/B's STRAIGHT figures reproduce from git history before this commit) */
  if (shape !== 'ROUND') throw new Error(`TUBE is ROUND only (asked ${shape}) — STRAIGHT was deleted by ruling`);
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
    const gapHalfAng = Number(ENV.TUBE_GAP || 1) * (G.MIN_FEATURE_MM / 2) / ringR;   // TUBE_GAP scales it, diagnosis only
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
