/* ===================================================================
   bloom-texture-lab-lattice.js — B'S OWN LATTICE (T2 of the surface-texture
   plan, docs/bloom-surface-texture-discovery.md §10 and §12). PROTOTYPE ONLY.

   NOT SHIPPED, AND IT TOUCHES NO SHIPPED FILE. It reads bloom-geometry.js as
   TEXT, applies a handful of anchored edits to a COPY in memory (each anchor
   must match exactly once or the load refuses — a moved anchor is a refusal,
   never a silent no-op), and imports the copy as a module of its own (a
   `data:` URL in Node, a Blob URL in the browser). The shipped module is
   never written and is still what every shipped page and gate imports.

   WHAT THE COPY ADDS, AND NOTHING ELSE:

   (1) `emitPanel` becomes a DISPATCHER. With the lattice off (`__setLattice
       (null)`, the default) it calls `emitPanelShipped`, which is the shipped
       function's text VERBATIM under a new name — so OFF is the shipped
       emission by construction, and TX0 measures it (every float, Object.is).

   (2) With the lattice on, a panel whose rows carry a surface evaluator
       (`rows.__rowAt`) goes through `emitPanelLattice` (defined below and
       spliced in by `toString()`), which is the shipped emitter's law applied
       to MORE rows and MORE columns:
         * SUB-ROWS between two ladder stations are the organ's own row plan at
           an intermediate u — `petalSurface(...).rowAt(u)` for a petal or a
           sepal, the leaf's / leaflet's / lobed chevron's own `rowAt` for a
           blade — so a new point is ON the surface, never on a chord. The
           LADDER IS NOT MOVED: every shipped row is the same object at the
           same station, and every quantity the shipped emitter decides per row
           or per column (the room, the margin arc, the bead's ramp, the drawn
           radius, the inset, the taper's distance) is still decided on the
           SHIPPED rows and columns — a sub-row reads the margin arc
           interpolated, a sub-column the row's arc interpolated — so every
           shipped skin vertex is emitted as the very doubles it was (TX1).
         * SUB-COLUMNS are the row's own `sect(v)` at an intermediate v, the
           shipped column formula with `j / cf` in place of `j` (exact at a
           multiple of cf, so the shipped columns are the shipped doubles).
         * THE COUNTS are per GAP (rows) and per ROW (columns): ceil(L / e) of
           the shipped mid-surface chord, the length snapped to 2^-20 mm first
           so the decision is one both engines take (Q16). Consecutive rows
           with different column counts are ZIPPED in PARAMETER space (an
           integer comparison) — equal counts reduce to the shipped quad and
           its diagonal. The tip's (and a free base's) apex ring takes its skin
           row's columns, because its profiles pair with that row's skin.
         * NOT REFINED IN u, BY DESIGN: the petal's three FOOT rows (no row law
           between them — the foot is `footRowsAt`, and it is buried in the hub)
           and the SEAM gap from the last foot row to the first blade row (the
           seam clearance law is what keeps the top skin from folding there; a
           sub-row inside it would put a skin row closer to the kink than
           `seamClearanceMm` allows). A buckled petal is refined in columns
           only (`trueNormalRows` makes its normal a lattice quantity of the
           ladder's own neighbours), and a tube-lobe row the hook RESHAPED has
           no row law of its own between it and the next.
         * THE CAPTURED GRID KEEPS THE LADDER'S ROWS AND COLUMNS (§10 T2's
           decision): it is written from the shipped rows' base columns only.

   (3) The Voronoi cell region (`emitInfillPanel`) refines in its own plan
       coordinates: its split threshold, the lattice's own longest plan edge,
       is capped at the edge target. Its points are `surface.at` of the plan
       point, so they are on the surface too; its hole and margin rims already
       follow the split (`edgePoints`).

   WHAT STAYS ON T1's SPLIT (the caller's job — `prepareLattice`): the hub, the
   stem, every rod and tip, the leaf petioles and rachises, the TUBE RING (it
   has no row law between its rows — T5-like, open question), and anything
   built into a throwaway accumulator (the sepal-angle and stem-channel trial
   builds, an inflorescence's floret unit). The lattice only refines panels
   emitted into the accumulator it was switched on for.
   =================================================================== */

const IS_NODE = typeof window === 'undefined';

/* the anchored edits, each [label, from, to] — `from` must occur EXACTLY ONCE */
export const LATTICE_EDITS = Object.freeze([
  ['dispatcher', 'function emitPanel(acc, rows, panel, tAt, rim) {',
    'function emitPanel(acc, rows, panel, tAt, rim) {\n  const __L = __latticeFor(acc, rows, panel);\n  if (__L) return emitPanelLattice(acc, rows, panel, tAt, rim, __L);\n  return emitPanelShipped(acc, rows, panel, tAt, rim);\n}\nfunction emitPanelShipped(acc, rows, panel, tAt, rim) {'],
  ['petal-foot-count', '  const rows = surface.footRowsAt();\n',
    '  const rows = surface.footRowsAt();\n  const __footN = rows.length;\n'],
  ['petal-row-law', '  if (form && form.buckle !== null) trueNormalRows(rows, footS.length);\n',
    '  if (form && form.buckle !== null) trueNormalRows(rows, footS.length);\n  rows.__rowAt = surface.rowAt; rows.__firstSub = __footN; rows.__organ = \'petal\';\n  if (form && form.buckle !== null) rows.__noSubRows = \'buckle\';\n'],
  ['leaf-row-law', '  const tAtRow = opts && opts.tAt ? opts.tAt : () => t;\n  emitPanel(acc, rows, panel, tAtRow, rim);',
    '  const tAtRow = opts && opts.tAt ? opts.tAt : () => t;\n  rows.__rowAt = rowAt; rows.__firstSub = 0; rows.__organ = \'leaf\';\n  emitPanel(acc, rows, panel, tAtRow, rim);'],
  ['infill-split', 'v = { split: !(onSeam(A) && onSeam(B)) && len > latMaxEdge && len > minEdgeMm, len };',
    'const __thr = __LAT && __LAT.acc === acc ? Math.min(latMaxEdge, __LAT.edgeMm) : latMaxEdge;\n      if (__LAT && __LAT.acc === acc && !(onSeam(A) && onSeam(B)) && len > minEdgeMm) __LAT.decide(\'infill\', len / __LAT.edgeMm, len);\n      v = { split: !(onSeam(A) && onSeam(B)) && len > __thr && len > minEdgeMm, len };'],
]);

/* the module-level additions spliced onto the end of the copy */
function latticeTail() {
  return `
let __LAT = null;
export function __setLattice(x) { __LAT = x; }
export function __getLattice() { return __LAT; }
function __latticeFor(acc, rows, panel) {
  if (!__LAT || __LAT.acc !== acc || !rows.__rowAt || panel.periodic || panel.thinAt || panel.nv) return null;
  return __LAT;
}
${emitPanelLattice.toString()}
`;
}

/* ------------------------------------------------------------ loading */
const cache = new Map();
/* `extraEdits` is the mutant table's door: more [label, from, to] applied to
   the PATCHED text, each anchored exactly once as well. */
export async function latticeGeometry({ extraEdits = [], key = 'shipped' } = {}) {
  const ck = key + '|' + extraEdits.map((e) => e[0]).join(',');
  if (cache.has(ck)) return cache.get(ck);
  const geoUrl = new URL('./bloom-geometry.js', import.meta.url);
  const curveUrl = new URL('./bloom-curve.js', import.meta.url);
  let src;
  if (IS_NODE) { const fs = await import('node:fs'); src = fs.readFileSync(geoUrl, 'utf8'); }
  else src = await (await fetch(geoUrl)).text();
  src = applyEdits(src, [['curve-import', "from './bloom-curve.js'", `from '${curveUrl.href}'`], ...LATTICE_EDITS]);
  src += latticeTail();
  src = applyEdits(src, extraEdits);
  let mod;
  /* NOT a data: URL in Node — a stack frame then carries the whole megabyte of
     source as its location, and the tagged build reads a stack per triangle. */
  if (IS_NODE) {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'), { pathToFileURL } = await import('node:url');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-lattice-'));
    const file = path.join(dir, 'bloom-geometry-lattice.mjs');
    fs.writeFileSync(file, src);
    try { mod = await import(pathToFileURL(file).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  else { const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); try { mod = await import(url); } finally { URL.revokeObjectURL(url); } }
  cache.set(ck, mod);
  return mod;
}
export function applyEdits(src, edits) {
  for (const [label, from, to] of edits) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`lattice edit '${label}': anchor matches ${n} times (want exactly 1) — the patch is refused`);
    src = src.replace(from, () => to);
  }
  return src;
}

/* A LATTICE CONTEXT: the switch, the accumulator it is for, the edge target,
   and the instrument's records. `decide(kind, x, len)` is called at every
   count decision with x = L / e: the margin is how far x is from the nearest
   value that would change ceil(x) — the only place two engines could take
   different topology — and the snap margin is how far L is from a 2^-21 mm
   rounding midpoint, the only place the snap itself could disagree. */
export function latticeContext(acc, edgeMm, { record = false } = {}) {
  const ctx = {
    acc, edgeMm, record,
    rows: record ? [] : null,          // per emitted lattice skin row (TX2)
    panels: [],                        // per refined panel: label, organ, sub-row and column stats
    margins: { row: Infinity, col: Infinity, infill: Infinity, snap: Infinity, diag: Infinity },
    decisions: { row: 0, col: 0, infill: 0 },
    decide(kind, x, len) {
      ctx.decisions[kind]++;
      const m = (x <= 1 ? 1 - x : Math.abs(x - Math.round(x))) * edgeMm;
      if (m < ctx.margins[kind]) ctx.margins[kind] = m;
      if (kind !== 'infill') {
        const s = Math.abs(((len * 1048576) % 1) - 0.5) / 1048576;
        if (s < ctx.margins.snap) ctx.margins.snap = s;
      }
    },
  };
  return ctx;
}

/* ===================================================================
   THE LATTICE ARM. Spliced into the patched copy by toString(), so every free
   name below (NV, RIM_*, rimDist, rimEase, rimInsetV, rimProfile, emitRimLoop,
   rimSameP, rimSegments, GRID_ALL_MATERIAL) is the geometry module's own. It
   is NEVER called in this module.

   It mirrors `emitPanel` section by section (read that function's comments
   for every law — they are not repeated here); what differs is said where it
   differs. `S` is a shipped row, `X` the expanded list (shipped rows and the
   sub-rows between them), `k` an index into X.
   =================================================================== */
function emitPanelLattice(acc, rows, panel, tAt, rim, LAT) {
  const e = LAT.edgeMm;
  const rowAt = rows.__rowAt;
  const firstSub = rows.__firstSub || 0;
  const noSub = rows.__noSubRows || null;
  const NB = NV;
  const grid = (acc.captureGrid || acc.captureLamina) ? [] : null;
  const rowFrom = panel.rowFrom, rowTo = panel.rowTo;
  const tipExposed = rowTo === rows.length - 1;
  const baseExposed = !!panel.baseExposed;
  let baseEnd = rowFrom;
  while (baseEnd < rowTo && rows[baseEnd + 1].u === 0) baseEnd++;
  /* the apex rings are defined on the SHIPPED rows */
  const skinToS = tipExposed ? Math.max(rowFrom, rowTo - RIM_TIP_ROWS) : rowTo;
  const skinFromS = baseExposed ? Math.min(skinToS, rowFrom + RIM_TIP_ROWS) : rowFrom;
  /* THE COUNT LAW: ceil(L / e) on L snapped to 2^-20 mm (Q16) */
  const nOf = (len, kind) => { const L = Math.round(len * 1048576) / 1048576, x = L / e; LAT.decide(kind, x, len); return Math.max(1, Math.ceil(x)); };
  const own = (r) => !r.ownSect || r.sect === r.ownSect;

  /* ---- the shipped rows' original boundary at the shipped columns: the shipped arithmetic ---- */
  const baseOf = (row, sp) => {
    const vs = [], Ps = [], Ns = [];
    for (let j = 0; j < NB; j++) {
      const v = sp[0] + ((sp[1] - sp[0]) * j) / (NB - 1);
      const { P, n } = row.sect(v);
      vs.push(v); Ps.push(P); Ns.push(n);
    }
    let w = 0;
    for (let j = 1; j < NB; j++) w += rimDist(Ps[j - 1], Ps[j]);
    return { vs, Ps, Ns, w };
  };
  const S = [];
  let sAcc = 0;
  for (let i = rowFrom; i <= rowTo; i++) {
    const row = rows[i], sp = panel.spanAt(i), b = baseOf(row, sp);
    if (i > rowFrom) sAcc += rimDist(S[S.length - 1].b.Ps[0], b.Ps[0]);
    const t = tAt(row.u);
    row.tUsed = t; acc.noteSheet(t);
    S.push({ row, sp, b, sM: sAcc, t });
  }
  /* ---- the expanded rows ---- */
  const X = [], E = new Int32Array(rowTo - rowFrom + 1);
  let subRows = 0;
  for (let i = rowFrom; i <= rowTo; i++) {
    const s = S[i - rowFrom];
    E[i - rowFrom] = X.length;
    X.push({ row: s.row, sIdx: i, sp: s.sp, b: s.b, sM: s.sM, t: s.t });
    if (i === rowTo) break;
    const s2 = S[i - rowFrom + 1];
    const eligible = !noSub && i >= firstSub && own(s.row) && own(s2.row) && s2.row.u > s.row.u;
    let m = 1;
    /* a gap the law cannot refine (the foot, the seam, a reshaped or buckled row) is EXEMPT and said so */
    X[X.length - 1].exempt = !eligible;
    let subs = [];
    if (eligible) {
      let dmax = 0;
      for (let j = 0; j < NB; j++) { const d = rimDist(s.b.Ps[j], s2.b.Ps[j]); if (d > dmax) dmax = d; }
      m = nOf(dmax, 'row');
      /* THE COUNT IS CHECKED ON THE ROWS IT PLACED, NOT ONLY ON THE GAP. The
         two ladder rows bound the gap's chord, not what lies between them: a
         sub-row can land in a SINUS the ladder stepped over (a leaf's teeth),
         so its margin stands far from both neighbours. Each sub-row chain is
         measured at the shipped columns and the count raised until every
         consecutive pair is within e — the same snapped law, so both engines
         take the same count. Bounded at 8x the first count. */
      for (const m0 = m; ; m++) {
        subs = [];
        for (let q = 1; q < m; q++) {
          const f = q / m;
          const u = s.row.u + (s2.row.u - s.row.u) * f;
          const row = rowAt(u);
          const sp = [s.sp[0] + (s2.sp[0] - s.sp[0]) * f, s.sp[1] + (s2.sp[1] - s.sp[1]) * f];
          subs.push({ row, sIdx: -1, sp, b: baseOf(row, sp), sM: s.sM + (s2.sM - s.sM) * f, t: 0 });
        }
        const chain = [s, ...subs, s2];
        let worst = 0;
        for (let c = 1; c < chain.length; c++) for (let j = 0; j < NB; j++) { const d = rimDist(chain[c - 1].b.Ps[j], chain[c].b.Ps[j]); if (d > worst) worst = d; }
        if (m === 1 || nOf(worst, 'row') <= 1 || m >= 8 * m0) break;
      }
    }
    for (const sub of subs) {
      const t = tAt(sub.row.u);
      sub.row.tUsed = t; acc.noteSheet(t); sub.t = t;
      X.push(sub);
      subRows++;
    }
  }
  const kOf = (i) => E[i - rowFrom];
  const kTo = X.length - 1, kSkinTo = kOf(skinToS), kSkinFrom = kOf(skinFromS);
  /* ---- the column factor per expanded row; the apex rings take their skin row's ---- */
  const cfOf = new Int32Array(X.length);
  for (let k = kSkinFrom; k <= kSkinTo; k++) {
    let dmax = 0;
    for (let j = 1; j < NB; j++) { const d = rimDist(X[k].b.Ps[j - 1], X[k].b.Ps[j]); if (d > dmax) dmax = d; }
    cfOf[k] = nOf(dmax, 'col');
  }
  for (let k = 0; k < kSkinFrom; k++) cfOf[k] = cfOf[kSkinFrom];
  for (let k = kSkinTo + 1; k <= kTo; k++) cfOf[k] = cfOf[kSkinTo];
  const NVk = (k) => (NB - 1) * cfOf[k] + 1;
  /* ---- the refined original boundary: sect at the shipped formula with j / cf ---- */
  const oV = [], oP = [], oN = [];
  for (let k = 0; k <= kTo; k++) {
    const cf = cfOf[k], { sp, b, row } = X[k], n = NVk(k);
    const vs = new Array(n), Ps = new Array(n), Ns = new Array(n);
    for (let j = 0; j < n; j++) {
      if (j % cf === 0) { vs[j] = b.vs[j / cf]; Ps[j] = b.Ps[j / cf]; Ns[j] = b.Ns[j / cf]; continue; }
      const v = sp[0] + ((sp[1] - sp[0]) * (j / cf)) / (NB - 1);
      const q = row.sect(v);
      vs[j] = v; Ps[j] = q.P; Ns[j] = q.n;
    }
    oV.push(vs); oP.push(Ps); oN.push(Ns);
  }

  /* ---- per skin row: the drawn radius, the ramp, the inset, the skin (the shipped law) ---- */
  const sBase = X[kOf(baseEnd)].sM, sTip = X[kTo].sM;
  const top = [], bot = [], skinV = [], skinP = [], skinN = [], skinB = [];
  const insetOf = new Map();
  const roomSide = [], rimClamped = [];
  let drawnMax = 0, sheetMax = 0;
  for (let k = kSkinFrom; k <= kSkinTo; k++) {
    const { row, b: base } = X[k], tBody = X[k].t, room = base.w, cf = cfOf[k], NVp = NVk(k);
    const r = Math.min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * room);
    let rLo = r, rHi = r, roomLo = room, roomHi = room;
    if (row.h === null) {
      const hs = row.hL + row.hR;
      if (hs > 0) {
        roomLo = room * ((2 * row.hR) / hs); roomHi = room * ((2 * row.hL) / hs);
        rLo = Math.min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * roomLo);
        rHi = Math.min(RIM_BEAD_RADIUS_MM, tBody / 2, RIM_ROOM_FRACTION * roomHi);
      }
    }
    const gBase = baseExposed ? 1 : rimEase((X[k].sM - sBase) / RIM_TAPER_MM);
    const g = tipExposed ? gBase : Math.min(gBase, rimEase((sTip - X[k].sM) / RIM_TAPER_MM));
    const a = g * r > 0 ? Math.max(g * r, RIM_BEAD_RADIUS_MM / 512) : 0;
    const aLo = rLo === r ? a : g * rLo > 0 ? Math.max(g * rLo, RIM_BEAD_RADIUS_MM / 512) : 0;
    const aHi = rHi === r ? a : g * rHi > 0 ? Math.max(g * rHi, RIM_BEAD_RADIUS_MM / 512) : 0;
    if (a > drawnMax) drawnMax = a;
    if (aLo > drawnMax) drawnMax = aLo;
    if (aHi > drawnMax) drawnMax = aHi;
    /* the bead's segment count is read on the SHIPPED rows' sheets, so K is the shipped K */
    if (X[k].sIdx >= 0 && tBody > sheetMax) sheetMax = tBody;
    const vLo = oV[k][0], vHi = oV[k][NVp - 1], vMid = (vLo + vHi) / 2;
    const side = a > 0;
    const inLo = side ? rimInsetV(row.sect, vLo, vMid, aLo) : vLo;
    const inHi = side ? rimInsetV(row.sect, vHi, vMid, aHi) : vHi;
    if (rim && acc.captureRim && side) {
      const Pm = row.sect(vMid).P, half = NB >> 1;
      let arcLo = rimDist(base.Ps[half - 1], Pm), arcHi = rimDist(base.Ps[half], Pm);
      for (let j = 1; j < half; j++) { arcLo += rimDist(base.Ps[j - 1], base.Ps[j]); arcHi += rimDist(base.Ps[NB - j], base.Ps[NB - 1 - j]); }
      insetOf.set(k, { aLo, aHi, chordLo: rimDist(base.Ps[0], Pm), chordHi: rimDist(base.Ps[NB - 1], Pm), tolLo: arcLo / 4096, tolHi: arcHi / 4096 });
    }
    const vs = [], Ps = [], Ns = [], Bs = [], ht = [], hb = [], Cl = [];
    for (let j = 0; j < NVp; j++) {
      const v = side ? inLo + ((inHi - inLo) * (j / cf)) / (NB - 1) : oV[k][j];
      const q = side ? row.sect(v) : { P: oP[k][j], n: oN[k][j] }; /* the lattice skin point */
      vs.push(v); Ps.push(q.P); Ns.push(q.n);
    }
    /* the distance field on the SHIPPED columns' chords; a sub-column reads it interpolated */
    const arcB = [0];
    for (let j0 = 1; j0 < NB; j0++) arcB.push(arcB[j0 - 1] + rimDist(Ps[cf * (j0 - 1)], Ps[cf * j0]));
    const arc = new Array(NVp);
    for (let j = 0; j < NVp; j++) { const j0 = Math.floor(j / cf), qq = j - cf * j0; arc[j] = qq === 0 ? arcB[j0] : arcB[j0] + (qq / cf) * (arcB[j0 + 1] - arcB[j0]); }
    const dEdge = a;
    const dTipRow = tipExposed ? (sTip - X[k].sM) : Infinity;
    const dBaseRow = baseExposed ? (X[k].sM - sBase) : Infinity;
    const twoR = rLo !== rHi || aLo !== aHi;
    for (let j = 0; j < NVp; j++) {
      const dLo = (twoR ? aLo : dEdge) + arc[j], dHi = (twoR ? aHi : dEdge) + (arc[NVp - 1] - arc[j]);
      const d = baseExposed ? Math.min(dLo, dHi, dTipRow, dBaseRow) : Math.min(dLo, dHi, dTipRow);
      const rj = !twoR ? r : vs[j] < 0 ? rLo : rHi;
      const bb = tBody / 2 + g * (rj - tBody / 2) * (1 - rimEase(d / RIM_TAPER_MM));
      Bs.push(bb);
      const P = Ps[j], n = Ns[j];
      ht.push([P[0] + n[0] * bb, P[1] + n[1] * bb, P[2] + n[2] * bb]);
      hb.push([P[0] - n[0] * bb, P[1] - n[1] * bb, P[2] - n[2] * bb]);
      const wasClamped = 2 * bb < RIM_FLOOR_MM - 1e-9 && 2 * bb < tBody - 1e-9;
      Cl.push(wasClamped);
      if (rim && wasClamped) rim.clamps.push({ panel: panel.label, row: X[k].sIdx, u: row.u, col: j, thicknessMm: 2 * bb, bodyMm: tBody, roomMm: !twoR ? room : vs[j] < 0 ? roomLo : roomHi });
    }
    top.push(ht); bot.push(hb); skinV.push(vs); skinP.push(Ps); skinN.push(Ns); skinB.push(Bs); rimClamped.push(Cl); roomSide.push(twoR ? { lo: roomLo, hi: roomHi } : null);
    if (rim) {
      const c1 = NVp >> 1, c0 = c1 - 1;
      (rim.centre || (rim.centre = [])).push({ panel: panel.label, row: X[k].sIdx, u: row.u, halfWidth: row.h === null ? Math.min(row.hL, row.hR) : row.h, P: [Ps[c0], Ps[c1]], n: [Ns[c0], Ns[c1]], arc: [arc[c0], arc[NVp - 1] - arc[c1]], dTip: dTipRow, dBase: dBaseRow });
    }
    if (LAT.rows) LAT.rows.push({ panel: panel.label, organ: rows.__organ || 'other', u: row.u, sIdx: X[k].sIdx, cf, exempt: X[k].exempt === true, vs, Bs, Ps, Ns, top: ht, bot: hb, row, rowAt: X[k].sIdx < 0 ? rowAt : null });
  }
  if (rim && rim.wantSkin) rim.skin = skinP.map((rr) => rr.map((P) => [P[0], P[1], P[2]]));

  /* ---- the captured grid: the LADDER's rows and columns, the shipped arrays ---- */
  if (grid) {
    for (let i = rowFrom; i <= rowTo; i++) {
      const k = kOf(i), b = X[k].b;
      const twoSidedRow = rows[i].h === null;
      const gridRow = { row: i, u: rows[i].u, halfWidth: twoSidedRow ? rows[i].hL : rows[i].h, thickness: X[k].t, v: b.vs, mid: b.Ps, normal: b.Ns, material: GRID_ALL_MATERIAL };
      if (twoSidedRow) gridRow.halfWidthRight = rows[i].hR;
      grid.push(gridRow);
    }
  }

  /* ---- the faces: consecutive skin rows ZIPPED in parameter space. Equal
     counts take the shipped quad's own two triangles and diagonal; unequal
     counts advance whichever polyline's next fraction is smaller, decided as
     an INTEGER comparison so no engine can disagree. The bottom skin is the
     top's triangles reversed (the shipped quad's winding). ---- */
  /* THE DIAGONAL, AND THE ONE PLACE A LENGTH DECIDES IT: where the two
     candidate edges differ by more than ZIP_SLACK_MM the SHORTER is taken (on
     a tooth's flank consecutive rows' margins stand far apart ACROSS the row,
     and the parameter rule's diagonal there was measured at 1.80 e); within
     the slack — every flat cell, whose two diagonals tie by symmetry on the
     midrib — the integer rule decides, so a last-bit difference between two
     engines cannot flip a triangle. The slack's own margin is recorded. */
  const ZIP_SLACK_MM = 1e-6;
  const zip = (A, B, As, Bs) => {
    const na = A.length - 1, nb = B.length - 1;
    let i = 0, j = 0;
    while (i < na || j < nb) {
      let advB = i === na || (j < nb && (j + 1) * na <= (i + 1) * nb);
      if (i < na && j < nb) {
        const diff = rimDist(A[i], B[j + 1]) - rimDist(A[i + 1], B[j]);
        const mg = Math.abs(Math.abs(diff) - ZIP_SLACK_MM);
        if (mg < LAT.margins.diag) LAT.margins.diag = mg;
        if (diff > ZIP_SLACK_MM) advB = false; else if (diff < -ZIP_SLACK_MM) advB = true;
      }
      if (advB) { acc.tri(A[i], B[j], B[j + 1]); acc.tri(As[i], Bs[j + 1], Bs[j]); j++; }
      else { acc.tri(A[i], B[j], A[i + 1]); acc.tri(As[i], As[i + 1], Bs[j]); i++; }
    }
  };
  for (let s = 0; s < top.length - 1; s++) zip(top[s], top[s + 1], bot[s], bot[s + 1]);

  /* ---- the rim: ONE closed loop, on the expanded rows and their own columns ---- */
  const K = rimSegments(sheetMax);
  const skOf = (k) => Math.min(Math.max(k, kSkinFrom), kSkinTo) - kSkinFrom;
  const loop = [], RUN = [];
  RUN.push(loop.length);
  for (let j = 0; j < NVk(0); j++) loop.push([0, j]);
  RUN.push(loop.length);
  for (let k = 1; k <= kTo; k++) loop.push([k, NVk(k) - 1]);
  RUN.push(loop.length);
  for (let j = NVk(kTo) - 2; j >= 0; j--) loop.push([kTo, j]);
  RUN.push(loop.length);
  for (let k = kTo - 1; k > 0; k--) loop.push([k, 0]);
  const isRunStart = new Set(RUN);
  const entries = [];
  for (let q = 0; q < loop.length; q++) {
    const [k, j] = loop[q];
    const sk = skOf(k);
    entries.push({ apex: oP[k][j], sk, j });
    const nq = (q + 1) % loop.length;
    const [k2, j2] = loop[nq];
    const sk2 = skOf(k2);
    if (rimSameP(oP[k][j], skinP[sk][j])) continue;
    if (sk2 === sk && j2 === j) {
      const a0 = oP[k][j], a1 = oP[k2][j2];
      const seg = rimDist(a0, a1);
      if (rim) rim.pivots.push(seg);
      if (seg < RIM_CORNER_MIN_MM) { if (rim) rim.pivotsSkipped++; continue; }
      for (let c = 1; c < RIM_CORNER_STEPS; c++) {
        const f = c / RIM_CORNER_STEPS;
        entries.push({ apex: [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f, a0[2] + (a1[2] - a0[2]) * f], sk, j });
      }
    } else if (isRunStart.has(nq)) {
      const a0 = oP[k][j], a1 = oP[k2][j2];
      for (let c = 1; c <= RIM_CORNER_STEPS; c++) {
        const f = c / (RIM_CORNER_STEPS + 1);
        entries.push({ apex: [a0[0] + (a1[0] - a0[0]) * f, a0[1] + (a1[1] - a0[1]) * f, a0[2] + (a1[2] - a0[2]) * f], sk, j });
      }
    }
  }
  const profs = entries.map(({ apex, sk, j }) => rimProfile(acc, K, skinP[sk][j], skinN[sk][j], skinB[sk][j], apex, top[sk][j], bot[sk][j]));
  emitRimLoop(acc, profs, K);
  if (rim) {
    if (acc.captureRim) {
      const turnAt = (q) => {
        const [kp, jp] = loop[(q - 1 + loop.length) % loop.length];
        const [kc, jc] = loop[q];
        const [kn, jn] = loop[(q + 1) % loop.length];
        const A = oP[kp][jp], B = oP[kc][jc], C = oP[kn][jn];
        const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
        const vx = C[0] - B[0], vy = C[1] - B[1], vz = C[2] - B[2];
        const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
        if (!(lu > 0 && lv > 0)) return 0;
        let d = (ux * vx + uy * vy + uz * vz) / (lu * lv);
        d = d > 1 ? 1 : d < -1 ? -1 : d;
        return (Math.acos(d) * 180) / Math.PI;
      };
      for (let q = 0; q < loop.length; q++) {
        const [k, j] = loop[q], sk = skOf(k);
        const apex = oP[k][j];
        if (!rimSameP(apex, skinP[sk][j])) {
          const ins = insetOf.get(k), last = NVk(k) - 1;
          rim.apex.push({ apex, top: top[sk][j], bot: bot[sk][j], panel: panel.label, row: X[k].sIdx, col: j, bodyMm: X[sk + kSkinFrom].t, clamped: rimClamped[sk][j], roomMm: roomSide[sk] ? (skinV[sk][j] < 0 ? roomSide[sk].lo : roomSide[sk].hi) : X[sk + kSkinFrom].b.w, outlineTurnDeg: turnAt(q),
            inset: ins && k >= kSkinFrom && k <= kSkinTo && (j === 0 || j === last) ? { mm: j === 0 ? ins.aLo : ins.aHi, chordToMidribMm: j === 0 ? ins.chordLo : ins.chordHi, tolMm: j === 0 ? ins.tolLo : ins.tolHi } : null });
        } else rim.flat.push(apex);
      }
      for (const rr of RUN) {
        const [k, j] = loop[rr === 0 ? loop.length - 1 : rr - 1];
        const sk = skOf(k);
        if (!rimSameP(oP[k][j], skinP[sk][j])) rim.corner.push(oP[k][j]);
      }
    }
    rim.segments = Math.max(rim.segments, K);
    rim.drawnMaxMm = Math.max(rim.drawnMaxMm, drawnMax);
    if (kSkinTo < kTo) {
      const gap = rimDist(oP[kTo][0], skinP[kSkinTo - kSkinFrom][0]);
      rim.tipAxisMm = rim.tipAxisMm === null ? gap : Math.min(rim.tipAxisMm, gap);
    }
    if (baseExposed && kSkinFrom > 0) {
      const gap = rimDist(oP[0][0], skinP[0][0]);
      rim.baseAxisMm = rim.baseAxisMm === undefined || rim.baseAxisMm === null ? gap : Math.min(rim.baseAxisMm, gap);
    }
  }
  let cfMax = 0; for (let k = 0; k <= kTo; k++) if (cfOf[k] > cfMax) cfMax = cfOf[k];
  LAT.panels.push({ label: panel.label, organ: rows.__organ || 'other', shippedRows: rowTo - rowFrom + 1, subRows, cfMax, noSub });
  return grid;
}

/* ------------------------------------------------------------- builds */
import * as C from './bloom-texture-lab-core.js';

/* Build `state` on B's lattice at edge `e`, tagged, through the patched copy.
   `record` keeps every emitted lattice skin row for TX2 and B's exact normals. */
export async function buildLattice(state, edgeMm, { record = false, extraEdits = [], key } = {}) {
  const LG = await latticeGeometry({ extraEdits, key });
  let ctx = null;
  try {
    const soup = C.buildTagged(state, { geometry: LG, beforeBuild: (acc) => { ctx = latticeContext(acc, edgeMm, { record }); LG.__setLattice(ctx); return true; } });
    return { soup, ctx, LG };
  } finally { LG.__setLattice(null); }
}
/* THE COUNTS, per organ: the lattice-native triangles, and the rest (hub,
   stem, rods, tips, petioles, the tube ring) through T1's 'rows' split of
   their own sub-soup. Both engines run exactly this (TX5). */
export function latticeCounts(soup, edgeMm) {
  const native = {}, rest = {}, idx = [];
  for (let t = 0; t < soup.triCount; t++) {
    const o = C.ORGANS[soup.organIx[t]];
    if (soup.latIx[t]) native[o] = (native[o] || 0) + 1; else idx.push(t);
  }
  const P = soup.positions, pos = new Float64Array(idx.length * 9);
  idx.forEach((t, k) => { for (let q = 0; q < 9; q++) pos[k * 9 + q] = P[t * 9 + q]; });
  const sub = { positions: pos, triCount: idx.length, organIx: Int8Array.from(idx, (t) => soup.organIx[t]), featIx: Int8Array.from(idx, (t) => soup.featIx[t]), instances: [] };
  const base = C.weld(sub);
  const s = C.subdivide(base, edgeMm, [], { split: 'rows', canPair: C.pairPredicate(sub), snap: true });
  for (let t = 0; t < s.tri.length / 3; t++) { const o = C.ORGANS[sub.organIx[s.src[t]]]; rest[o] = (rest[o] || 0) + 1; }
  const total = Object.values(native).reduce((a, b) => a + b, 0) + Object.values(rest).reduce((a, b) => a + b, 0);
  return { native, rest, total, restShipped: idx.length };
}
