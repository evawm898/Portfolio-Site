/* weave-draft.js — the Weave Draft MODEL. Pure: no DOM, no canvas, importable
   in Node, which is what lets tools/verify-weave.mjs check the drawdown rule,
   the yarn arithmetic and the WIF round trip without a browser.

   THE DRAFT IS THREE BITMASK ARRAYS AND FOUR COUNTS.
     threading[e]  — bit (s-1) set iff end e passes through shaft s
     tieup[t]      — bit (s-1) set iff treadle t is tied to shaft s
     treadling[p]  — bit (t-1) set iff treadle t is pressed on pick p
   Shafts and treadles are capped at 16, so every mask fits a Uint16. One shaft
   per end is the ordinary case and the editor writes it that way, but the
   model carries a mask so a WIF that threads one end on two shafts, or presses
   two treadles on one pick, reads back exactly as it was written.

   THE DRAWDOWN RULE (rising shed): a cell is WARP-UP when some shaft the end is
   threaded on is tied to some treadle pressed on that pick —
       up(p, e)  =  (threading[e] & lift(p)) != 0,
       lift(p)   =  OR over pressed treadles t of tieup[t].
   drawdown() is the ONE owner of that rule; everything else reads its output.

   THE CONSTRUCTION (phase A, single layer) is three more things on the state:
     yarns         — the library: every yarn the draft may use, with its count
                     (stored as DENIER whatever unit it was typed in), filament
                     count, ply, twist, an elastic flag with a relaxation ratio,
                     and a display colour. COLOURS COME FROM YARNS, nowhere else.
     warpSystems / weftSystems
                   — a system is a NAME, an interleave RATIO and a REPEAT
                     SEQUENCE of (yarn, count). The warp's end sequence cycles
                     through its systems in order, taking `ratio` ends from each
                     in turn, each system advancing through its own repeat; a
                     single system with ratio 1 is the old stripe list under a
                     name. resolveThreads() is the ONE owner of that rule, and
                     every end and every pick resolves to a yarn through it.
     physical      — width, sett (ends and picks per inch or per cm) and crimp
                     per direction. physical() derives the total ends, the
                     weight per metre per system, the yarn diameters and the
                     cover factors from these and the yarn library, and is the
                     ONE owner of that arithmetic (the sheet, the CSV, the PDF
                     and the read-out all read its output).

   ORIENTATION IS THE RENDERER'S, NOT THE MODEL'S. Index 0 is end 1 / pick 1 /
   shaft 1 / treadle 1 here and in the WIF file. Which side of the screen end 1
   sits on is decided once, in weave-render.js. */

export const LIMITS = {
  shafts: [2, 16], treadles: [2, 16], ends: [8, 256], picks: [8, 256],
  cell: [4, 24], yarn: [0.4, 1.0], maxFloat: [2, 32],
  dpi: [50, 600], widthMm: [10, 10000], widthIn: [0.5, 400], densityCm: [0.5, 300], densityIn: [0.5, 762], crimp: [0, 50],
  ratio: [1, 99], count: [1, 999],
};

export const PALETTE = {
  ink: '#0A0A0C', inkSoft: '#131316', paper: '#EDEDE8', teal: '#5FA0A0',
  dim: '#8A8A85', dim2: '#5A5A56', warn: '#E07A6A',
};

export const VIEW_DEFAULTS = Object.freeze({
  mode: 'draft', grid: true, cell: 12, fabric: false, yarn: 0.78, maxFloat: 5, warn: true,
  trueScale: false, dpi: 96,
});

export const PHYSICAL_DEFAULTS = Object.freeze({
  width: 1000, widthUnit: 'mm', epi: 24, ppi: 24, densityUnit: 'cm', crimpWarp: 5, crimpWeft: 5,
});

/* ------------------------------------------------------------------ yarns
   LINEAR DENSITY is stored as denier (grams per 9000 m) and converted at the
   edges:  tex = den / 9 (g per 1000 m) · dtex = den / 0.9 (g per 10000 m) ·
   Ne (cotton count, 840-yard hanks per pound) = 5315 / den · Nm (metric
   count, metres per gram) = 9000 / den. The two indirect counts invert, so a
   finer yarn is a HIGHER Ne or Nm and a LOWER denier.

   DIAMETER is estimated from the mass per length and an effective yarn
   density: a yarn of linear density `tex` and bulk density rho (g/cm3) has a
   cross-section of tex / (1e5 rho) cm2, so
       d (mm) = sqrt( tex / (250 * pi * rho) ),   rho = fibre density * packing.
   With cotton at 1.54 g/cm3 and a staple packing of 0.60 this reproduces
   Peirce's d = 1 / (28 sqrt Ne) inch to about 1 %, which is the figure cover
   factors have been quoted against for ninety years. A yarn whose filament
   count is 0 is a SPUN (staple) yarn; any count above 0 is continuous filament
   and packs tighter. Twist is carried and reported, not used in the estimate. */
export const FIBERS = [
  { id: 'cotton', label: 'cotton', density: 1.54 },
  { id: 'linen', label: 'linen', density: 1.50 },
  { id: 'wool', label: 'wool', density: 1.31 },
  { id: 'silk', label: 'silk', density: 1.34 },
  { id: 'viscose', label: 'viscose', density: 1.52 },
  { id: 'polyester', label: 'polyester', density: 1.38 },
  { id: 'nylon', label: 'nylon', density: 1.14 },
  { id: 'acrylic', label: 'acrylic', density: 1.17 },
  { id: 'polypropylene', label: 'polypropylene', density: 0.91 },
  { id: 'elastane', label: 'elastane', density: 1.21 },
  { id: 'other', label: 'other / unspecified', density: 1.30 },
];
export const PACKING = Object.freeze({ staple: 0.60, filament: 0.70 });
export const COUNT_UNITS = ['den', 'dtex', 'tex', 'Ne', 'Nm'];
export const YARN_LIMITS = { den: [1, 100000], filaments: [0, 5000], ply: [1, 24], tpm: [0, 5000], relax: [0.1, 1] };
/* Peirce's jammed-cloth cover factor for one direction, in the cotton system. */
export const PEIRCE_MAX_K = 28;

export function toDenier(value, unit) {
  const v = +value;
  if (!(v > 0)) return NaN;
  switch (unit) {
    case 'den': return v;
    case 'dtex': return v * 0.9;
    case 'tex': return v * 9;
    case 'Ne': return 5315 / v;
    case 'Nm': return 9000 / v;
    default: throw new Error(`unknown count unit: ${unit}`);
  }
}
export function fromDenier(den, unit) {
  switch (unit) {
    case 'den': return den;
    case 'dtex': return den / 0.9;
    case 'tex': return den / 9;
    case 'Ne': return 5315 / den;
    case 'Nm': return 9000 / den;
    default: throw new Error(`unknown count unit: ${unit}`);
  }
}
export function fiberOf(id) { return FIBERS.find(f => f.id === id) || FIBERS[FIBERS.length - 1]; }
export function yarnDensity(yarn) {
  return fiberOf(yarn.fiber).density * (yarn.filaments > 0 ? PACKING.filament : PACKING.staple);
}
export function yarnDiameterMm(yarn) {
  const tex = yarn.den / 9;
  return Math.sqrt(tex / (250 * Math.PI * yarnDensity(yarn)));
}
export function yarnWeightPerM(yarn) { return yarn.den / 9000; }   // g per metre of yarn

const f1 = (v) => (Math.round(v * 10) / 10).toString();
const f2 = (v) => (Math.round(v * 100) / 100).toString();
export function yarnCountText(yarn) {
  const den = yarn.den;
  return `${f1(den)} den (${f1(fromDenier(den, 'tex'))} tex · Ne ${f1(fromDenier(den, 'Ne'))} · Nm ${f1(fromDenier(den, 'Nm'))})`;
}
export function yarnDescription(yarn) {
  const parts = [fiberOf(yarn.fiber).label.replace(' / unspecified', ''), yarnCountText(yarn)];
  parts.push(yarn.filaments > 0 ? `${yarn.filaments} filaments` : 'spun');
  parts.push(`${yarn.ply}-ply`);
  parts.push(yarn.tpm > 0 ? `${yarn.tpm} tpm ${yarn.twist}` : 'no twist');
  if (yarn.elastic) parts.push(`elastic, relaxes to ${Math.round(yarn.relax * 100)}%`);
  return parts.join(', ');
}

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const bit = (i) => 1 << i;
const allBits = (n) => (1 << n) - 1;
const isHex = (c) => /^#[0-9A-F]{6}$/i.test(c || '');
const num = (v, lim, fallback) => { const n = +v; return Number.isFinite(n) ? clamp(n, lim) : fallback; };

/* Every field validated: a yarn read from a hash, a WIF or a form goes through
   here, so nothing downstream has to doubt a record. */
export function newYarn(p = {}) {
  return {
    id: /^y\d+$/.test(p.id || '') ? p.id : 'y1',
    name: String(p.name == null ? 'yarn' : p.name).slice(0, 60) || 'yarn',
    fiber: FIBERS.some(f => f.id === p.fiber) ? p.fiber : 'other',
    den: num(p.den, YARN_LIMITS.den, 150),
    filaments: Math.round(num(p.filaments, YARN_LIMITS.filaments, 0)),
    ply: Math.round(num(p.ply, YARN_LIMITS.ply, 1)),
    tpm: Math.round(num(p.tpm, YARN_LIMITS.tpm, 0)),
    twist: p.twist === 'S' ? 'S' : 'Z',
    elastic: p.elastic === true || p.elastic === 1 || p.elastic === '1',
    relax: num(p.relax, YARN_LIMITS.relax, 1),
    color: isHex(p.color) ? p.color.toUpperCase() : PALETTE.paper,
  };
}
export function nextYarnId(yarns) {
  let max = 0;
  for (const y of yarns) { const n = parseInt(String(y.id).slice(1), 10); if (n > max) max = n; }
  return `y${max + 1}`;
}

/* The starter library: GENERIC yarns, described by what they are and not by
   any maker's code. The first two carry the draft's old default colours, so
   the default drawdown is the picture it always was. */
export function starterYarns() {
  return [
    newYarn({ id: 'y1', name: 'cotton 30s', fiber: 'cotton', den: toDenier(30, 'Ne'), filaments: 0, ply: 1, tpm: 760, twist: 'Z', color: PALETTE.paper }),
    newYarn({ id: 'y2', name: 'polyester 150/48', fiber: 'polyester', den: 150, filaments: 48, ply: 1, tpm: 0, twist: 'Z', color: PALETTE.teal }),
    newYarn({ id: 'y3', name: 'nylon 70/34', fiber: 'nylon', den: 70, filaments: 34, ply: 1, tpm: 0, twist: 'Z', color: PALETTE.dim }),
    newYarn({ id: 'y4', name: 'wool 2/20 Nm', fiber: 'wool', den: toDenier(10, 'Nm'), filaments: 0, ply: 2, tpm: 420, twist: 'S', color: '#C9B79C' }),
    newYarn({ id: 'y5', name: 'linen 12 Nm', fiber: 'linen', den: toDenier(12, 'Nm'), filaments: 0, ply: 1, tpm: 500, twist: 'Z', color: '#D8CFB0' }),
    newYarn({ id: 'y6', name: 'covered elastane 140', fiber: 'elastane', den: 140, filaments: 1, ply: 1, tpm: 0, twist: 'Z', elastic: true, relax: 0.6, color: '#A86B8A' }),
  ];
}

/* --------------------------------------------------------------- systems */

export function newSystem(p = {}, fallbackYarn = 'y1') {
  const seq = Array.isArray(p.seq) ? p.seq : [];
  return {
    name: String(p.name == null ? 'system' : p.name).slice(0, 40) || 'system',
    ratio: Math.round(num(p.ratio, LIMITS.ratio, 1)),
    seq: seq.map(x => ({ yarn: /^y\d+$/.test((x && x.yarn) || '') ? x.yarn : fallbackYarn,
      count: Math.round(num(x && x.count, LIMITS.count, 1)) })),
  };
}

/* Which yarn each of n threads is: cycle the systems in order, `ratio` threads
   from each in turn, every system advancing through its own repeat. A system
   whose sequence names no yarn in the library contributes nothing; if none
   does, every thread is the library's first yarn. Returns [{ yarn, sys }] with
   `sys` the system's index (-1 for the fallback). */
export function resolveThreads(systems, yarns, n) {
  const ids = new Set(yarns.map(y => y.id));
  const live = [];
  (systems || []).forEach((sys, i) => {
    const seq = (sys.seq || []).filter(x => ids.has(x.yarn) && x.count >= 1);
    if (seq.length) live.push({ i, ratio: Math.max(1, Math.round(sys.ratio || 1)), seq, k: 0, left: seq[0].count });
  });
  const out = new Array(n);
  if (!live.length) {
    const y = yarns.length ? yarns[0].id : null;
    for (let i = 0; i < n; i++) out[i] = { yarn: y, sys: -1 };
    return out;
  }
  let i = 0;
  while (i < n) {
    for (const L of live) {
      for (let r = 0; r < L.ratio && i < n; r++) {
        out[i++] = { yarn: L.seq[L.k].yarn, sys: L.i };
        if (--L.left === 0) { L.k = (L.k + 1) % L.seq.length; L.left = L.seq[L.k].count; }
      }
    }
  }
  return out;
}
const SYS_KEY = { warp: 'warpSystems', weft: 'weftSystems' };
export function threadYarns(s, dir, n) {
  const byId = new Map(s.yarns.map(y => [y.id, y]));
  return resolveThreads(s[SYS_KEY[dir]], s.yarns, n).map(t => ({ ...t, y: byId.get(t.yarn) || null }));
}
export function threadColors(s, dir, n) {
  const fallback = dir === 'warp' ? PALETTE.paper : PALETTE.teal;
  return threadYarns(s, dir, n).map(t => t.y ? t.y.color : fallback);
}
export function yarnInUse(s, id) {
  return [...s.warpSystems, ...s.weftSystems].some(sys => sys.seq.some(x => x.yarn === id));
}

/* ---------------------------------------------------------------- state */

export function blankState(shafts = 4, treadles = 4, ends = 32, picks = 32) {
  return {
    shafts, treadles, ends, picks,
    threading: new Uint16Array(ends),
    tieup: new Uint16Array(treadles),
    treadling: new Uint16Array(picks),
    yarns: starterYarns(),
    warpSystems: [newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y1', count: 1 }] })],
    weftSystems: [newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: 'y2', count: 1 }] })],
    physical: { ...PHYSICAL_DEFAULTS },
    view: { ...VIEW_DEFAULTS },
  };
}

export function defaultState() {
  return applyPreset(blankState(4, 4, 32, 32), 'twill22');
}

export function cloneState(s) {
  return {
    shafts: s.shafts, treadles: s.treadles, ends: s.ends, picks: s.picks,
    threading: Uint16Array.from(s.threading),
    tieup: Uint16Array.from(s.tieup),
    treadling: Uint16Array.from(s.treadling),
    yarns: s.yarns.map(y => ({ ...y })),
    warpSystems: s.warpSystems.map(x => ({ ...x, seq: x.seq.map(q => ({ ...q })) })),
    weftSystems: s.weftSystems.map(x => ({ ...x, seq: x.seq.map(q => ({ ...q })) })),
    physical: { ...s.physical },
    view: { ...s.view },
  };
}

/* Resize keeps what is there. A longer threading or treadling CONTINUES the
   sequence already on the grid (cyclically), so an eight-end repeat can be
   typed once and the end count dragged out; a shorter one truncates. Shafts
   and treadles that go away take their bits with them. */
export function resized(s, counts) {
  const n = cloneState(s);
  n.shafts = clamp(Math.round(counts.shafts ?? n.shafts), LIMITS.shafts);
  n.treadles = clamp(Math.round(counts.treadles ?? n.treadles), LIMITS.treadles);
  n.ends = clamp(Math.round(counts.ends ?? n.ends), LIMITS.ends);
  n.picks = clamp(Math.round(counts.picks ?? n.picks), LIMITS.picks);
  const cyc = (src, len, mask) => {
    const out = new Uint16Array(len);
    if (src.length) for (let i = 0; i < len; i++) out[i] = src[i % src.length] & mask;
    return out;
  };
  n.threading = cyc(s.threading, n.ends, allBits(n.shafts));
  n.treadling = cyc(s.treadling, n.picks, allBits(n.treadles));
  const tu = new Uint16Array(n.treadles);
  for (let t = 0; t < Math.min(n.treadles, s.treadles); t++) tu[t] = s.tieup[t] & allBits(n.shafts);
  n.tieup = tu;
  return n;
}

/* -------------------------------------------------------------- drawdown */

export function liftMask(s, pick) {
  let m = 0; const pressed = s.treadling[pick];
  for (let t = 0; t < s.treadles; t++) if (pressed & bit(t)) m |= s.tieup[t];
  return m;
}

/* Uint8Array(picks * ends), row-major by pick; 1 = warp up. */
export function drawdown(s) {
  const { ends, picks } = s;
  const out = new Uint8Array(picks * ends);
  for (let p = 0; p < picks; p++) {
    const m = liftMask(s, p);
    if (!m) continue;
    const row = p * ends;
    for (let e = 0; e < ends; e++) if (m & s.threading[e]) out[row + e] = 1;
  }
  return out;
}

/* ----------------------------------------------------------------- floats
   A run of equal cells ALONG A COLUMN is a warp float (on the face if the
   cells are up, on the back if down); along a ROW it is a weft float (face if
   down, back if up). The sample is finite and runs are not wrapped: a float
   cut by the edge of the drawdown is reported at the length that is visible.
   A run of 1 is an interlacing, not a float, and is not listed. */
export function floatRuns(dd, ends, picks) {
  const warp = [], weft = [];
  let warpFace = 0, warpBack = 0, weftFace = 0, weftBack = 0;
  for (let e = 0; e < ends; e++) {
    let p0 = 0;
    for (let p = 1; p <= picks; p++) {
      if (p === picks || dd[p * ends + e] !== dd[p0 * ends + e]) {
        const len = p - p0, up = dd[p0 * ends + e] === 1;
        if (len > 1) warp.push({ e, p0, len, up });
        if (up) warpFace = Math.max(warpFace, len); else warpBack = Math.max(warpBack, len);
        p0 = p;
      }
    }
  }
  for (let p = 0; p < picks; p++) {
    let e0 = 0; const row = p * ends;
    for (let e = 1; e <= ends; e++) {
      if (e === ends || dd[row + e] !== dd[row + e0]) {
        const len = e - e0, up = dd[row + e0] === 1;
        if (len > 1) weft.push({ p, e0, len, up });
        if (up) weftBack = Math.max(weftBack, len); else weftFace = Math.max(weftFace, len);
        e0 = e;
      }
    }
  }
  return { warp, weft, warpFace, warpBack, weftFace, weftBack };
}

export function longFloats(runs, maxFloat) {
  return {
    warp: runs.warp.filter(r => r.len > maxFloat),
    weft: runs.weft.filter(r => r.len > maxFloat),
  };
}

/* ---------------------------------------------------------- generators */

const seqToMasks = (seq, n) => {
  const out = new Uint16Array(n);
  for (let i = 0; i < n; i++) out[i] = bit(seq[i % seq.length] - 1);
  return out;
};
const setsToMasks = (sets) => Uint16Array.from(sets, set => set.reduce((m, s) => m | bit(s - 1), 0));

export function straightSeq(n) { return Array.from({ length: n }, (_, i) => i + 1); }
export function pointSeq(n) {
  const up = straightSeq(n), down = up.slice(1, -1).reverse();
  return up.concat(down);
}

/* mulberry32 — a seed reproduces a walk exactly, which is what makes a seeded
   random threading shareable through the URL. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A walk steps ±1 shaft every end and turns at the edges, so no two
   neighbouring ends share a shaft (a doubled end) and no step skips a shaft. */
export function walkSeq(shafts, n, seed) {
  const r = rng(seed);
  let cur = 1 + Math.floor(r() * shafts);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(cur);
    let next = cur + (r() < 0.5 ? -1 : 1);
    if (next < 1) next = 2;
    if (next > shafts) next = shafts - 1;
    cur = next;
  }
  return out;
}

export function threadingFrom(s, kind, seed = 1) {
  const n = cloneState(s);
  const seq = kind === 'straight' ? straightSeq(n.shafts)
    : kind === 'point' ? pointSeq(n.shafts)
    : kind === 'walk' ? walkSeq(n.shafts, n.ends, seed)
    : null;
  if (!seq) throw new Error(`unknown threading generator: ${kind}`);
  n.threading = seqToMasks(seq, n.ends);
  return n;
}

export function treadlingFrom(s, kind) {
  const n = cloneState(s);
  if (kind === 'straight') n.treadling = seqToMasks(straightSeq(n.treadles), n.picks);
  else if (kind === 'point') n.treadling = seqToMasks(pointSeq(n.treadles), n.picks);
  else if (kind === 'asdrawn') {
    /* Tromp as writ: pick p presses the treadle(s) numbered as the shaft(s)
       end p is threaded on. A shaft beyond the treadle count has no treadle
       and is dropped. */
    const mask = allBits(n.treadles);
    n.treadling = new Uint16Array(n.picks);
    for (let p = 0; p < n.picks; p++) n.treadling[p] = n.threading[p % n.ends] & mask;
  } else throw new Error(`unknown treadling generator: ${kind}`);
  return n;
}

export function cleared(s, part) {
  const n = cloneState(s);
  if (part === 'threading') n.threading.fill(0);
  else if (part === 'tieup') n.tieup.fill(0);
  else if (part === 'treadling') n.treadling.fill(0);
  return n;
}

/* ---------------------------------------------------------------- presets
   STRUCTURES, not named fabrics. Each sets the shaft and treadle counts it
   needs and fills all three grids; ends and picks are left as they are (the
   repeat continues cyclically across them). The tie-ups are RISING-SHED —
   the marks say which shafts go UP. */
const twill22 = [[1, 2], [2, 3], [3, 4], [4, 1]];
const satinTie = (n, counter) => straightSeq(n).map(t => {
  const down = ((t - 1) * counter) % n + 1;
  return straightSeq(n).filter(s => s !== down);
});
/* An overshot threading: blocks on the twill diagonal with the odd/even
   alternation kept across every block boundary. Block A is shafts 1-2, B is
   2-3, C is 3-4, D is 4-1; the sequence A B C D C B is a diamond. */
function overshotThreading(blocks, len) {
  const pair = { A: [1, 2], B: [3, 2], C: [3, 4], D: [1, 4] }; // [odd, even]
  const out = []; let wantOdd = true;
  for (const b of blocks) {
    const [o, ev] = pair[b];
    for (let i = 0; i < len; i++) { out.push(wantOdd ? o : ev); wantOdd = !wantOdd; }
  }
  return out;
}
function overshotTreadling(blocks, len) {
  const treadle = { A: 1, B: 2, C: 3, D: 4 };
  const out = []; let tabby = 5;
  for (const b of blocks) for (let i = 0; i < len; i++) {
    out.push(treadle[b], tabby); tabby = tabby === 5 ? 6 : 5;
  }
  return out;
}

export const PRESETS = [
  { id: 'plain', label: 'plain weave', shafts: 2, treadles: 2,
    threading: [1, 2], tieup: [[1], [2]], treadling: [1, 2] },
  { id: 'twill22', label: '2/2 twill', shafts: 4, treadles: 4,
    threading: straightSeq(4), tieup: twill22, treadling: straightSeq(4) },
  { id: 'twill31', label: '3/1 twill', shafts: 4, treadles: 4,
    threading: straightSeq(4), tieup: [[1, 2, 3], [2, 3, 4], [3, 4, 1], [4, 1, 2]], treadling: straightSeq(4) },
  { id: 'broken', label: 'broken twill', shafts: 4, treadles: 4,
    threading: [1, 2, 4, 3], tieup: twill22, treadling: straightSeq(4) },
  { id: 'herringbone', label: 'herringbone', shafts: 4, treadles: 4,
    threading: [1, 2, 3, 4, 1, 2, 3, 4, 2, 1, 4, 3, 2, 1, 4, 3], tieup: twill22, treadling: straightSeq(4) },
  { id: 'point', label: 'point twill', shafts: 4, treadles: 4,
    threading: pointSeq(4), tieup: twill22, treadling: pointSeq(4) },
  { id: 'rosepath', label: 'rosepath', shafts: 4, treadles: 4,
    threading: [1, 2, 3, 4, 1, 4, 3, 2], tieup: twill22, treadling: [1, 2, 3, 4, 1, 4, 3, 2] },
  { id: 'satin5', label: '5-shaft satin', shafts: 5, treadles: 5,
    threading: straightSeq(5), tieup: satinTie(5, 2), treadling: straightSeq(5) },
  { id: 'satin8', label: '8-shaft satin', shafts: 8, treadles: 8,
    threading: straightSeq(8), tieup: satinTie(8, 3), treadling: straightSeq(8) },
  { id: 'basket', label: '2/2 basket', shafts: 4, treadles: 2,
    threading: straightSeq(4), tieup: [[1, 2], [3, 4]], treadling: [1, 1, 2, 2] },
  { id: 'waffle', label: 'waffle', shafts: 4, treadles: 4,
    threading: pointSeq(4), tieup: [[2], [1, 4], [3, 4], [2, 3, 4]], treadling: pointSeq(4) },
  { id: 'overshot', label: 'overshot-style', shafts: 4, treadles: 6,
    threading: overshotThreading(['A', 'B', 'C', 'D', 'C', 'B'], 4),
    /* Rising shed: the treadle for a block lifts the OTHER two shafts, so the
       pattern weft floats over that block's ends. Treadles 5 and 6 are tabby. */
    tieup: [[3, 4], [4, 1], [1, 2], [2, 3], [1, 3], [2, 4]],
    treadling: overshotTreadling(['A', 'B', 'C', 'D', 'C', 'B'], 4) },
];

export function applyPreset(s, id) {
  const p = PRESETS.find(x => x.id === id);
  if (!p) throw new Error(`unknown preset: ${id}`);
  const n = resized(s, { shafts: p.shafts, treadles: p.treadles });
  n.threading = seqToMasks(p.threading, n.ends);
  n.tieup = setsToMasks(p.tieup);
  n.treadling = seqToMasks(p.treadling, n.picks);
  return n;
}

/* --------------------------------------------------------- legacy colours
   The draft used to carry colour STRIPES ({ color, count } lists) on the warp
   and the weft, and the v=1 hash and every WIF written before the yarn library
   still do. These two functions are the stripe arithmetic, kept for them, and
   migrateStripes() is where a stripe list becomes yarns and a system. */

export function expandStripes(stripes, n, fallback = PALETTE.paper) {
  const out = new Array(n);
  const list = (stripes || []).filter(x => x && x.count > 0 && /^#[0-9a-f]{6}$/i.test(x.color));
  if (!list.length) return out.fill(fallback);
  let i = 0, k = 0, left = list[0].count;
  while (i < n) {
    out[i++] = list[k].color.toUpperCase();
    if (--left === 0) { k = (k + 1) % list.length; left = list[k].count; }
  }
  return out;
}

/* Run-length of a per-thread colour list back into stripes. Two adjacent
   stripes of one colour merge, so a stripe list is normalised by a trip
   through the WIF (the per-thread colours, which are what the file carries,
   are unchanged). */
export function stripesFrom(colors) {
  const out = [];
  for (const c of colors) {
    const C = c.toUpperCase();
    if (out.length && out[out.length - 1].color === C) out[out.length - 1].count++;
    else out.push({ color: C, count: 1 });
  }
  return out;
}

/* One AUTO-GENERATED yarn per distinct stripe colour (shared across the two
   directions, so a colour used in both is one yarn), and one system per
   direction whose repeat is the stripe list itself. The per-thread colours
   are the stripes' own, exactly; the yarn's other fields are the library's
   generic defaults, since a stripe never said what it was made of. */
export function migrateStripes(warpStripes, weftStripes) {
  const yarns = [];
  const byColor = new Map();
  const yarnFor = (color, dir) => {
    const C = color.toUpperCase();
    if (!byColor.has(C)) {
      const id = nextYarnId(yarns);
      yarns.push(newYarn({ id, name: `${dir} colour ${byColor.size + 1}`, fiber: 'other', den: 150, color: C }));
      byColor.set(C, id);
    }
    return byColor.get(C);
  };
  const sysFor = (stripes, dir, fallback) => {
    const list = (stripes || []).filter(x => x && x.count > 0 && isHex(x.color));
    const seq = list.length ? list.map(x => ({ yarn: yarnFor(x.color, dir), count: x.count }))
      : [{ yarn: yarnFor(fallback, dir), count: 1 }];
    return newSystem({ name: dir, ratio: 1, seq });
  };
  const warpSystems = [sysFor(warpStripes, 'warp', PALETTE.paper)];
  const weftSystems = [sysFor(weftStripes, 'weft', PALETTE.teal)];
  return { yarns, warpSystems, weftSystems };
}

/* ---------------------------------------------------------------- physical
   Everything derived from the construction inputs and the yarn library, in
   one place. All figures are AS SET ON THE LOOM; where an elastic yarn is
   present a RELAXED estimate is reported beside them (see below).

     total ends       = round( ends per mm * width in mm )
     weight per metre of fabric, warp  = sum over the ends of den/9000 g/m,
                                         times (1 + warp crimp)
     weight per metre of fabric, weft  = picks per metre * width in metres
                                         * den/9000, times (1 + weft crimp),
                                         summed over the picks of one metre
     fractional cover, one direction   = sum of thread diameters per unit
                                         width (or length), i.e. the fraction
                                         of the plan the threads of that
                                         direction occupy; TOTAL cover is
                                         cw + cf - cw*cf (the union)
     Peirce cover factor K             = threads per inch / sqrt(Ne), the
                                         cotton-system figure weavers quote,
                                         with Kc = K1 + K2 - K1*K2/28

   THE SINGLE-LAYER LIMIT: when the fractional cover of a direction passes 1
   the threads of that direction no longer fit side by side across the cloth
   — they would have to stack — so the construction cannot be woven as one
   layer at that sett. That is the `tooDense` flag and the warning's only
   trigger; it is a plan-area argument, so it holds for any weave.

   RELAXATION: a yarn's `relax` is its relaxed length as a fraction of its
   length on the loom (1 for an inelastic yarn). The warp's and the weft's
   relaxation are the count-weighted means over their threads; the relaxed
   estimate applies the weft's to the width and the warp's to the length, and
   re-states the sett, the weight per metre and the cover at those. It is an
   estimate of the fully-relaxed state and is reported, never used to warn. */
export function physical(s) {
  const P = s.physical;
  const widthMm = P.widthUnit === 'in' ? P.width * 25.4 : P.width;
  const perCm = (v) => P.densityUnit === 'in' ? v / 2.54 : v;
  const epcm = perCm(P.epi), ppcm = perCm(P.ppi);
  const totalEnds = Math.max(1, Math.round(epcm / 10 * widthMm));
  const picksPerM = ppcm * 100;
  const nWeft = Math.max(1, Math.round(picksPerM));
  const warpT = threadYarns(s, 'warp', totalEnds);
  const weftT = threadYarns(s, 'weft', nWeft);
  const crimpW = 1 + P.crimpWarp / 100, crimpF = 1 + P.crimpWeft / 100;
  const widthM = widthMm / 1000;

  const perSystem = (threads, systems, dir) => {
    const rows = new Map();
    for (const t of threads) {
      let r = rows.get(t.sys);
      if (!r) { r = { sys: t.sys, name: t.sys < 0 ? '(library default)' : systems[t.sys].name, threads: 0, den: 0, dia: 0, yarnCounts: new Map() }; rows.set(t.sys, r); }
      r.threads++;
      if (t.y) { r.den += t.y.den; r.dia += yarnDiameterMm(t.y); r.yarnCounts.set(t.y.id, (r.yarnCounts.get(t.y.id) || 0) + 1); }
    }
    return [...rows.values()].sort((a, b) => a.sys - b.sys).map(r => {
      const scale = dir === 'warp' ? crimpW : (picksPerM / nWeft) * widthM * crimpF;
      return {
        sys: r.sys, name: r.name, ratio: r.sys < 0 ? 1 : systems[r.sys].ratio,
        threads: dir === 'warp' ? r.threads : r.threads * (picksPerM / nWeft),
        share: r.threads / threads.length,
        gPerM: r.den / 9000 * scale,
        yarns: [...r.yarnCounts].map(([id, n]) => ({ id, n, share: n / r.threads })),
      };
    });
  };
  const sumDia = (threads) => threads.reduce((a, t) => a + (t.y ? yarnDiameterMm(t.y) : 0), 0);
  const meanTex = (threads) => threads.reduce((a, t) => a + (t.y ? t.y.den / 9 : 0), 0) / threads.length;
  const meanRelax = (threads) => threads.reduce((a, t) => a + (t.y && t.y.elastic ? t.y.relax : 1), 0) / threads.length;
  const warpSys = perSystem(warpT, s.warpSystems, 'warp');
  const weftSys = perSystem(weftT, s.weftSystems, 'weft');
  const warpG = warpSys.reduce((a, r) => a + r.gPerM, 0);
  const weftG = weftSys.reduce((a, r) => a + r.gPerM, 0);
  const coverWarp = sumDia(warpT) / widthMm;
  const coverWeft = sumDia(weftT) * (picksPerM / nWeft) / 1000;
  const kOf = (perInch, tex) => tex > 0 ? perInch / Math.sqrt(590.5 / tex) : 0;
  const Kw = kOf(epcm * 2.54, meanTex(warpT)), Kf = kOf(ppcm * 2.54, meanTex(weftT));
  const union = (a, b) => a + b - a * b;
  const relaxW = meanRelax(warpT), relaxF = meanRelax(weftT);
  const elastic = warpT.some(t => t.y && t.y.elastic) || weftT.some(t => t.y && t.y.elastic);
  const out = {
    widthMm, widthIn: widthMm / 25.4, epcm, epi: epcm * 2.54, ppcm, ppi: ppcm * 2.54,
    totalEnds, picksPerM, crimpWarp: P.crimpWarp, crimpWeft: P.crimpWeft,
    warp: { systems: warpSys, gPerM: warpG, cover: coverWarp, K: Kw,
      meanDiameterMm: sumDia(warpT) / warpT.length, relax: relaxW },
    weft: { systems: weftSys, gPerM: weftG, cover: coverWeft, K: Kf,
      meanDiameterMm: sumDia(weftT) / weftT.length, relax: relaxF },
    gPerM: warpG + weftG, gsm: (warpG + weftG) / widthM,
    coverTotal: union(coverWarp, coverWeft), Ktotal: Kw + Kf - Kw * Kf / PEIRCE_MAX_K,
    tooDense: coverWarp > 1 || coverWeft > 1,
    elastic, relaxed: null,
  };
  if (elastic) {
    const wMm = widthMm * relaxF;
    out.relaxed = {
      warpRelax: relaxW, weftRelax: relaxF,
      widthMm: wMm, lengthFactor: relaxW,
      epcm: epcm / relaxF, ppcm: ppcm / relaxW,
      gPerM: out.gPerM / relaxW, gsm: out.gPerM / relaxW / (wMm / 1000),
      coverWarp: coverWarp / relaxF, coverWeft: coverWeft / relaxW,
      coverTotal: union(coverWarp / relaxF, coverWeft / relaxW),
    };
  }
  return out;
}

export const DENSE_WARNING = 'too dense for single-layer — likely needs multiple layers';
export function denseWarning(ph) {
  if (!ph.tooDense) return '';
  const which = [ph.warp.cover > 1 ? `warp ${Math.round(ph.warp.cover * 100)}%` : '', ph.weft.cover > 1 ? `weft ${Math.round(ph.weft.cover * 100)}%` : '']
    .filter(Boolean).join(', ');
  return `${DENSE_WARNING} (cover ${which})`;
}

/* ------------------------------------------------------ construction sheet
   One structured table, read by the CSV writer here and by the PDF writer on
   the page, so the two artefacts cannot disagree. Rows are [item, value]. */
export function constructionSheet(s, presetLabel = '') {
  const ph = physical(s);
  const byId = new Map(s.yarns.map(y => [y.id, y]));
  const pct = (v) => `${(Math.round(v * 1000) / 10).toString()}%`;
  const sections = [];
  sections.push({ title: 'construction', rows: [
    ['structure', presetLabel || 'custom'],
    ['shafts', String(s.shafts)], ['treadles', String(s.treadles)],
    ['draft repeat', `${s.ends} ends x ${s.picks} picks`],
    ['width', `${f1(ph.widthMm)} mm (${f2(ph.widthIn)} in)`],
    ['ends per cm', f2(ph.epcm)], ['ends per inch', f2(ph.epi)],
    ['picks per cm', f2(ph.ppcm)], ['picks per inch', f2(ph.ppi)],
    ['total ends', String(ph.totalEnds)],
    ['crimp warp', `${ph.crimpWarp}%`], ['crimp weft', `${ph.crimpWeft}%`],
  ] });
  const sysRows = (list, unit) => list.flatMap(r => [
    [`${r.name} · ${unit}`, unit === 'ends' ? String(Math.round(r.threads)) : `${f1(r.threads)} per m`],
    [`${r.name} · share`, pct(r.share)],
    [`${r.name} · interleave`, `${r.ratio} ${unit} in turn`],
    [`${r.name} · yarns`, r.yarns.map(q => `${q.n}x ${(byId.get(q.id) || { name: '?' }).name}`).join('; ')],
    [`${r.name} · weight`, `${f2(r.gPerM)} g/m`],
  ]);
  sections.push({ title: 'warp systems', rows: sysRows(ph.warp.systems, 'ends') });
  sections.push({ title: 'weft systems', rows: sysRows(ph.weft.systems, 'picks') });
  const used = new Set([...ph.warp.systems, ...ph.weft.systems].flatMap(r => r.yarns.map(q => q.id)));
  sections.push({ title: 'yarns', rows: s.yarns.filter(y => used.has(y.id)).flatMap(y => [
    [y.name, yarnDescription(y)],
    [`${y.name} · diameter`, `${(Math.round(yarnDiameterMm(y) * 1000) / 1000).toString()} mm (estimated)`],
    [`${y.name} · colour`, y.color],
  ]) });
  const totals = [
    ['weight per metre · warp', `${f2(ph.warp.gPerM)} g/m`],
    ['weight per metre · weft', `${f2(ph.weft.gPerM)} g/m`],
    ['weight per metre · total', `${f2(ph.gPerM)} g/m`],
    ['weight per square metre', `${f1(ph.gsm)} g/m2`],
    ['cover · warp', `${pct(ph.warp.cover)} (K ${f1(ph.warp.K)})`],
    ['cover · weft', `${pct(ph.weft.cover)} (K ${f1(ph.weft.K)})`],
    ['cover · total', `${pct(ph.coverTotal)} (Kc ${f1(ph.Ktotal)} of ${PEIRCE_MAX_K})`],
  ];
  if (ph.tooDense) totals.push(['warning', denseWarning(ph)]);
  sections.push({ title: 'totals', rows: totals });
  if (ph.relaxed) {
    const R = ph.relaxed;
    sections.push({ title: 'relaxed estimate', rows: [
      ['warp relaxes to', pct(R.warpRelax)], ['weft relaxes to', pct(R.weftRelax)],
      ['width', `${f1(R.widthMm)} mm`], ['ends per cm', f2(R.epcm)], ['picks per cm', f2(R.ppcm)],
      ['weight per metre', `${f2(R.gPerM)} g/m`], ['weight per square metre', `${f1(R.gsm)} g/m2`],
      ['cover · warp / weft / total', `${pct(R.coverWarp)} / ${pct(R.coverWeft)} / ${pct(R.coverTotal)}`],
    ] });
  }
  return { sections, physical: ph };
}

export function constructionCsv(s, presetLabel = '') {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = ['section,item,value'];
  for (const sec of constructionSheet(s, presetLabel).sections) {
    for (const [k, v] of sec.rows) lines.push([q(sec.title), q(k), q(v)].join(','));
  }
  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------- hash
   The whole state in the URL fragment. v=2 is the construction tool's:
     #v=2&s=..&t=..&e=..&p=..&th=..&tu=..&tr=..
      &yl=<yarns>&ws=<warp systems>&fs=<weft systems>&ph=<physical>
      &vm=..&g=..&c=..&f=..&y=..&m=..&w=..&ts=..&dpi=..
   Masks go as little-endian Uint16 bytes in base64url. A yarn is its eleven
   fields joined by '|', yarns joined by ','; free text is percent-encoded so
   no field can carry a delimiter. A system is name|ratio|y1.c1.y2.c2.
   encodeHash/decodeHash is a lossless pair over the whole state, view
   settings included — the gate round-trips random states through it.
   A v=1 hash (stripes, no yarns) still decodes: its stripes become yarns. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function u16ToB64(arr) {
  const bytes = new Uint8Array(arr.length * 2);
  for (let i = 0; i < arr.length; i++) { bytes[2 * i] = arr[i] & 255; bytes[2 * i + 1] = arr[i] >> 8; }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += b === undefined ? '' : B64[(n >> 6) & 63];
    out += c === undefined ? '' : B64[n & 63];
  }
  return out;
}

export function b64ToU16(str, len) {
  const bytes = [];
  let buf = 0, bits = 0;
  for (const ch of str) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('bad base64url');
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  }
  const out = new Uint16Array(len);
  for (let i = 0; i < len; i++) out[i] = (bytes[2 * i] ?? 0) | ((bytes[2 * i + 1] ?? 0) << 8);
  return out;
}

const stripesFromStr = (str) => {
  if (!str) return [];
  return str.split(',').map(part => {
    const m = /^([0-9A-Fa-f]{6})\.(\d+)$/.exec(part);
    if (!m) throw new Error('bad stripe');
    return { color: '#' + m[1].toUpperCase(), count: clamp(+m[2], [1, 9999]) };
  });
};

const enc = (t) => encodeURIComponent(String(t));
const dec = (t) => { try { return decodeURIComponent(t); } catch { return ''; } };
export function yarnsToStr(yarns) {
  return yarns.map(y => [y.id, enc(y.name), y.fiber, y.den, y.filaments, y.ply, y.tpm, y.twist,
    y.elastic ? 1 : 0, y.relax, y.color.slice(1)].join('|')).join(',');
}
export function yarnsFromStr(str) {
  if (!str) return [];
  const seen = new Set();
  const out = [];
  for (const rec of str.split(',')) {
    const f = rec.split('|');
    if (f.length < 11) throw new Error('bad yarn');
    const y = newYarn({ id: f[0], name: dec(f[1]), fiber: f[2], den: +f[3], filaments: +f[4], ply: +f[5],
      tpm: +f[6], twist: f[7], elastic: f[8], relax: +f[9], color: '#' + f[10] });
    if (seen.has(y.id)) throw new Error('duplicate yarn id');
    seen.add(y.id);
    out.push(y);
  }
  return out;
}
export function systemsToStr(list) {
  return list.map(sys => [enc(sys.name), sys.ratio, sys.seq.map(q => `${q.yarn}.${q.count}`).join('.')].join('|')).join(',');
}
export function systemsFromStr(str, fallbackYarn) {
  if (!str) return [];
  return str.split(',').map(rec => {
    const f = rec.split('|');
    if (f.length < 3) throw new Error('bad system');
    const toks = f[2] ? f[2].split('.') : [];
    const seq = [];
    for (let i = 0; i + 1 < toks.length; i += 2) seq.push({ yarn: toks[i], count: +toks[i + 1] });
    return newSystem({ name: dec(f[0]), ratio: +f[1], seq }, fallbackYarn);
  });
}
export function physicalToStr(P) {
  return [P.width, P.widthUnit, P.epi, P.ppi, P.densityUnit, P.crimpWarp, P.crimpWeft].join('|');
}
/* the sett's range is one physical range stated in either unit: 300 per cm
   is 762 per inch */
export const densityLimit = (unit) => unit === 'in' ? LIMITS.densityIn : LIMITS.densityCm;
export function physicalFromStr(str) {
  const f = (str || '').split('|');
  const widthUnit = f[1] === 'in' ? 'in' : 'mm';
  const densityUnit = f[4] === 'in' ? 'in' : 'cm';
  return {
    width: num(f[0], widthUnit === 'in' ? LIMITS.widthIn : LIMITS.widthMm, PHYSICAL_DEFAULTS.width), widthUnit,
    epi: num(f[2], densityLimit(densityUnit), PHYSICAL_DEFAULTS.epi), ppi: num(f[3], densityLimit(densityUnit), PHYSICAL_DEFAULTS.ppi), densityUnit,
    crimpWarp: num(f[5], LIMITS.crimp, PHYSICAL_DEFAULTS.crimpWarp), crimpWeft: num(f[6], LIMITS.crimp, PHYSICAL_DEFAULTS.crimpWeft),
  };
}

export function encodeHash(s) {
  const v = s.view;
  const kv = [
    ['v', 2], ['s', s.shafts], ['t', s.treadles], ['e', s.ends], ['p', s.picks],
    ['th', u16ToB64(s.threading)], ['tu', u16ToB64(s.tieup)], ['tr', u16ToB64(s.treadling)],
    ['yl', yarnsToStr(s.yarns)], ['ws', systemsToStr(s.warpSystems)], ['fs', systemsToStr(s.weftSystems)],
    ['ph', physicalToStr(s.physical)],
    ['vm', v.mode === 'drawdown' ? 'dd' : 'd'], ['g', v.grid ? 1 : 0], ['c', v.cell],
    ['f', v.fabric ? 1 : 0], ['y', Math.round(v.yarn * 100)], ['m', v.maxFloat], ['w', v.warn ? 1 : 0],
    ['ts', v.trueScale ? 1 : 0], ['dpi', v.dpi],
  ];
  return kv.map(([k, val]) => `${k}=${val}`).join('&');
}

/* Returns a state, or null for anything that is not a v=1 or v=2 weave hash.
   A hash that parses but holds an out-of-range count is clamped, never
   refused. A v=1 hash is the stripe era's: its stripes are migrated. */
export function decodeHash(hash) {
  try {
    const str = (hash || '').replace(/^#/, '');
    if (!str) return null;
    const kv = Object.fromEntries(str.split('&').map(part => {
      const i = part.indexOf('=');
      return i < 0 ? [part, ''] : [part.slice(0, i), part.slice(i + 1)];
    }));
    if (kv.v !== '1' && kv.v !== '2') return null;
    const s = blankState(
      clamp(+kv.s || 4, LIMITS.shafts), clamp(+kv.t || 4, LIMITS.treadles),
      clamp(+kv.e || 32, LIMITS.ends), clamp(+kv.p || 32, LIMITS.picks));
    const ms = allBits(s.shafts), mt = allBits(s.treadles);
    s.threading = b64ToU16(kv.th || '', s.ends).map(x => x & ms);
    s.tieup = b64ToU16(kv.tu || '', s.treadles).map(x => x & ms);
    s.treadling = b64ToU16(kv.tr || '', s.picks).map(x => x & mt);
    if (kv.v === '1' || kv.yl === undefined) {
      /* legacy: stripes, if any; the starter library otherwise */
      const wc = stripesFromStr(kv.wc), fc = stripesFromStr(kv.fc);
      if (wc.length || fc.length) {
        const m = migrateStripes(wc.length ? wc : [{ color: PALETTE.paper, count: 1 }],
          fc.length ? fc : [{ color: PALETTE.teal, count: 1 }]);
        s.yarns = m.yarns; s.warpSystems = m.warpSystems; s.weftSystems = m.weftSystems;
      }
    } else {
      const yarns = yarnsFromStr(kv.yl);
      if (yarns.length) {
        s.yarns = yarns;
        const fb = yarns[0].id;
        const ws = systemsFromStr(kv.ws, fb), fs = systemsFromStr(kv.fs, fb);
        s.warpSystems = ws.length ? ws : [newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: fb, count: 1 }] })];
        s.weftSystems = fs.length ? fs : [newSystem({ name: 'ground', ratio: 1, seq: [{ yarn: fb, count: 1 }] })];
      }
    }
    if (kv.ph !== undefined) s.physical = physicalFromStr(kv.ph);
    s.view = {
      mode: kv.vm === 'dd' ? 'drawdown' : 'draft',
      grid: kv.g === undefined ? VIEW_DEFAULTS.grid : kv.g === '1',
      cell: clamp(+kv.c || VIEW_DEFAULTS.cell, LIMITS.cell),
      fabric: kv.f === '1',
      yarn: kv.y === undefined ? VIEW_DEFAULTS.yarn : clamp((+kv.y) / 100, LIMITS.yarn),
      maxFloat: clamp(+kv.m || VIEW_DEFAULTS.maxFloat, LIMITS.maxFloat),
      warn: kv.w === undefined ? VIEW_DEFAULTS.warn : kv.w === '1',
      trueScale: kv.ts === '1',
      dpi: Math.round(clamp(+kv.dpi || VIEW_DEFAULTS.dpi, LIMITS.dpi)),
    };
    return s;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- WIF
   WIF 1.1 (the interchange format every loom-control and draft program
   reads). Written rising-shed, one colour-table entry per distinct colour,
   every thread's colour listed. Read case-insensitively; a sinking-shed file
   is converted on the way in by complementing its tie-up, which is the same
   cloth under the rule above, so the model stays rising-shed only.

   WHAT WIF HAS FIELDS FOR, AND WHAT IT HAS NOT. [WARP]/[WEFT] carry Units,
   Spacing (the thread pitch, i.e. 1 / sett) and Thickness (the yarn's
   diameter), with per-thread exceptions in [WARP THICKNESS] / [WEFT
   THICKNESS]; those are written from the construction and the yarn
   diameters, in centimetres, and a Spacing read from any WIF becomes the sett.
   Fibre, count, ply, twist and elasticity have no WIF field, so they go two
   ways: in [NOTES], as text for a person, and in the private [EM WEAVE YARNS]
   / [EM WEAVE SYSTEMS] / [EM WEAVE CONSTRUCTION] sections, which this reader
   takes back exactly and any other program ignores. A file whose colours no
   longer agree with its private yarn records (edited elsewhere) falls back to
   the colour-table migration and says so. */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), [0, 255]).toString(16).padStart(2, '0')).join('').toUpperCase();
const maskList = (m, n) => { const out = []; for (let i = 0; i < n; i++) if (m & bit(i)) out.push(i + 1); return out.join(','); };
const cm4 = (v) => (Math.round(v * 10000) / 10000).toString();

export function toWif(s, presetLabel = '') {
  const warpY = threadYarns(s, 'warp', s.ends), weftY = threadYarns(s, 'weft', s.picks);
  const warpC = warpY.map(t => t.y ? t.y.color : PALETTE.paper), weftC = weftY.map(t => t.y ? t.y.color : PALETTE.teal);
  const table = [];
  const index = (c) => { let i = table.indexOf(c); if (i < 0) { table.push(c); i = table.length - 1; } return i + 1; };
  const warpI = warpC.map(index), weftI = weftC.map(index);
  const ph = physical(s);
  const dia = (t) => t.y ? yarnDiameterMm(t.y) / 10 : 0;   // cm
  const defaultDia = (list) => { const first = list.find(t => t.y); return first ? dia(first) : 0; };
  const warpDia = defaultDia(warpY), weftDia = defaultDia(weftY);
  const L = [];
  L.push('[WIF]', 'Version=1.1', 'Date=April 20, 1997', 'Developers=wif@mhsoft.com',
    'Source Program=EM Weave', 'Source Version=2.0', '');
  L.push('[CONTENTS]', 'COLOR PALETTE=yes', 'WEAVING=yes', 'WARP=yes', 'WEFT=yes', 'COLOR TABLE=yes',
    'THREADING=yes', 'TIEUP=yes', 'TREADLING=yes', 'WARP COLORS=yes', 'WEFT COLORS=yes',
    'WARP THICKNESS=yes', 'WEFT THICKNESS=yes', 'NOTES=yes',
    'EM WEAVE YARNS=yes', 'EM WEAVE SYSTEMS=yes', 'EM WEAVE CONSTRUCTION=yes', '');
  L.push('[COLOR PALETTE]', `Entries=${table.length}`, 'Range=0,255', '');
  L.push('[WEAVING]', `Shafts=${s.shafts}`, `Treadles=${s.treadles}`, 'Rising Shed=yes', '');
  L.push('[WARP]', `Threads=${s.ends}`, `Color=${warpI[0]}`, 'Units=Centimeters',
    `Spacing=${cm4(1 / ph.epcm)}`, `Thickness=${cm4(warpDia)}`, '');
  L.push('[WEFT]', `Threads=${s.picks}`, `Color=${weftI[0]}`, 'Units=Centimeters',
    `Spacing=${cm4(1 / ph.ppcm)}`, `Thickness=${cm4(weftDia)}`, '');
  L.push('[COLOR TABLE]');
  table.forEach((c, i) => L.push(`${i + 1}=${hexToRgb(c).join(',')}`));
  L.push('');
  L.push('[THREADING]');
  for (let e = 0; e < s.ends; e++) if (s.threading[e]) L.push(`${e + 1}=${maskList(s.threading[e], s.shafts)}`);
  L.push('');
  L.push('[TIEUP]');
  for (let t = 0; t < s.treadles; t++) if (s.tieup[t]) L.push(`${t + 1}=${maskList(s.tieup[t], s.shafts)}`);
  L.push('');
  L.push('[TREADLING]');
  for (let p = 0; p < s.picks; p++) if (s.treadling[p]) L.push(`${p + 1}=${maskList(s.treadling[p], s.treadles)}`);
  L.push('');
  L.push('[WARP COLORS]');
  warpI.forEach((c, i) => L.push(`${i + 1}=${c}`));
  L.push('');
  L.push('[WEFT COLORS]');
  weftI.forEach((c, i) => L.push(`${i + 1}=${c}`));
  L.push('');
  L.push('[WARP THICKNESS]');
  warpY.forEach((t, i) => { if (dia(t) !== warpDia) L.push(`${i + 1}=${cm4(dia(t))}`); });
  L.push('');
  L.push('[WEFT THICKNESS]');
  weftY.forEach((t, i) => { if (dia(t) !== weftDia) L.push(`${i + 1}=${cm4(dia(t))}`); });
  L.push('');
  L.push('[NOTES]');
  let n = 1;
  for (const sec of constructionSheet(s, presetLabel).sections) {
    for (const [k, v] of sec.rows) L.push(`${n++}=${sec.title}: ${k} = ${v}`);
  }
  L.push('');
  L.push('[EM WEAVE YARNS]');
  s.yarns.forEach((y, i) => L.push(`${i + 1}=${yarnsToStr([y])}`));
  L.push('');
  L.push('[EM WEAVE SYSTEMS]');
  s.warpSystems.forEach((sys, i) => L.push(`W${i + 1}=${systemsToStr([sys])}`));
  s.weftSystems.forEach((sys, i) => L.push(`F${i + 1}=${systemsToStr([sys])}`));
  L.push('');
  L.push('[EM WEAVE CONSTRUCTION]', `1=${physicalToStr(s.physical)}`, '');
  return L.join('\n');
}

export function parseWifSections(text) {
  const sections = {};
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) continue;
    const sec = /^\[(.+)\]$/.exec(line);
    if (sec) { cur = sec[1].trim().toUpperCase(); sections[cur] = sections[cur] || {}; continue; }
    if (!cur) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    sections[cur][line.slice(0, i).trim().toUpperCase()] = line.slice(i + 1).trim();
  }
  return sections;
}

/* WIF Units -> centimetres per unit. */
const UNIT_CM = { CENTIMETERS: 1, CENTIMETRES: 1, INCHES: 2.54, DECIPOINTS: 2.54 / 720 };

/* Returns { state, notes } or throws with a sentence a person can act on.
   The view settings are the defaults: a WIF carries no view. */
export function fromWif(text, baseView = VIEW_DEFAULTS) {
  const S = parseWifSections(text);
  if (!S.WIF) throw new Error('not a WIF file (no [WIF] section)');
  const W = S.WEAVING || {};
  const shafts = parseInt(W.SHAFTS, 10), treadles = parseInt(W.TREADLES, 10);
  if (!(shafts >= 1)) throw new Error('the file names no shaft count ([WEAVING] Shafts)');
  if (shafts > LIMITS.shafts[1]) throw new Error(`${shafts} shafts — this draft holds at most ${LIMITS.shafts[1]}`);
  const notes = [];
  const list = (sec) => {
    const out = new Map();
    for (const [k, v] of Object.entries(S[sec] || {})) {
      const n = parseInt(k, 10);
      if (n >= 1) out.set(n, v);
    }
    return out;
  };
  const threadingL = list('THREADING'), tieupL = list('TIEUP'), treadlingL = list('TREADLING');
  const countOf = (sec, listed) => {
    const n = parseInt((S[sec] || {}).THREADS, 10);
    return n >= 1 ? n : Math.max(0, ...listed.keys());
  };
  let ends = countOf('WARP', threadingL), picks = countOf('WEFT', treadlingL);
  if (ends > LIMITS.ends[1]) { notes.push(`warp truncated ${ends} -> ${LIMITS.ends[1]} ends`); ends = LIMITS.ends[1]; }
  if (picks > LIMITS.picks[1]) { notes.push(`weft truncated ${picks} -> ${LIMITS.picks[1]} picks`); picks = LIMITS.picks[1]; }
  const nShafts = Math.max(shafts, LIMITS.shafts[0]);
  let nTreadles = treadles >= 1 ? treadles : Math.max(0, ...tieupL.keys());
  if (nTreadles > LIMITS.treadles[1]) throw new Error(`${nTreadles} treadles — this draft holds at most ${LIMITS.treadles[1]}`);
  nTreadles = Math.max(nTreadles, LIMITS.treadles[0]);
  const s = blankState(nShafts, nTreadles, Math.max(ends, LIMITS.ends[0]), Math.max(picks, LIMITS.picks[0]));
  if (ends < LIMITS.ends[0]) notes.push(`warp padded ${ends} -> ${LIMITS.ends[0]} ends`);
  if (picks < LIMITS.picks[0]) notes.push(`weft padded ${picks} -> ${LIMITS.picks[0]} picks`);
  const toMask = (v, max) => v.split(',').map(x => parseInt(x, 10)).filter(n => n >= 1 && n <= max)
    .reduce((m, n) => m | bit(n - 1), 0);
  for (const [k, v] of threadingL) if (k <= s.ends) s.threading[k - 1] = toMask(v, s.shafts);
  for (const [k, v] of tieupL) if (k <= s.treadles) s.tieup[k - 1] = toMask(v, s.shafts);
  for (const [k, v] of treadlingL) if (k <= s.picks) s.treadling[k - 1] = toMask(v, s.treadles);
  const rising = (W['RISING SHED'] || 'yes').toLowerCase();
  if (rising === 'no' || rising === 'false' || rising === '0') {
    const all = allBits(s.shafts);
    for (let t = 0; t < s.treadles; t++) if (s.tieup[t]) s.tieup[t] = (~s.tieup[t]) & all;
    notes.push('sinking-shed tie-up converted to rising shed (same cloth)');
  }
  /* colours */
  const range = ((S['COLOR PALETTE'] || {}).RANGE || '0,255').split(',').map(Number);
  const hi = range[1] > 0 ? range[1] : 255;
  const table = new Map();
  for (const [k, v] of Object.entries(S['COLOR TABLE'] || {})) {
    const n = parseInt(k, 10); const rgb = v.split(',').map(Number);
    if (n >= 1 && rgb.length >= 3 && rgb.every(x => Number.isFinite(x))) {
      table.set(n, rgbToHex(...rgb.slice(0, 3).map(x => x * 255 / hi)));
    }
  }
  const colourOf = (idx, fallback) => table.get(idx) ?? fallback;
  const perThread = (n, listSec, defKey, fallback) => {
    const def = colourOf(parseInt((S[defKey] || {}).COLOR, 10), fallback);
    const out = new Array(n).fill(def);
    for (const [k, v] of list(listSec)) if (k <= n) out[k - 1] = colourOf(parseInt(v, 10), def);
    return out;
  };
  const warpC = perThread(s.ends, 'WARP COLORS', 'WARP', PALETTE.paper);
  const weftC = perThread(s.picks, 'WEFT COLORS', 'WEFT', PALETTE.teal);
  /* yarns: the private records if they are there and still agree with the
     colours; otherwise one yarn per colour */
  let restored = false;
  if (S['EM WEAVE YARNS']) {
    try {
      const yarns = [...list('EM WEAVE YARNS')].sort((a, b) => a[0] - b[0]).map(([, v]) => yarnsFromStr(v)[0]);
      const ids = new Set(yarns.map(y => y.id));
      if (yarns.length && ids.size === yarns.length) {
        const sys = S['EM WEAVE SYSTEMS'] || {};
        const take = (prefix) => Object.entries(sys).filter(([k]) => k[0] === prefix)
          .sort((a, b) => parseInt(a[0].slice(1), 10) - parseInt(b[0].slice(1), 10))
          .map(([, v]) => systemsFromStr(v, yarns[0].id)[0]);
        const ws = take('W'), fs = take('F');
        if (ws.length && fs.length) {
          const trial = { yarns, warpSystems: ws, weftSystems: fs };
          const agree = (dir, n, cols) => threadColors(trial, dir, n).every((c, i) => c === cols[i]);
          if (agree('warp', s.ends, warpC) && agree('weft', s.picks, weftC)) {
            s.yarns = yarns; s.warpSystems = ws; s.weftSystems = fs; restored = true;
          } else notes.push('the colours no longer match the yarn records — yarns rebuilt from the colours');
        }
      }
    } catch { notes.push('the yarn records could not be read — yarns rebuilt from the colours'); }
  }
  if (!restored) {
    const m = migrateStripes(stripesFrom(warpC), stripesFrom(weftC));
    s.yarns = m.yarns; s.warpSystems = m.warpSystems; s.weftSystems = m.weftSystems;
  }
  /* construction: the private record, else the sett from Spacing */
  const C = S['EM WEAVE CONSTRUCTION'] || {};
  if (C['1']) s.physical = physicalFromStr(C['1']);
  else {
    const sett = (sec) => {
      const sp = parseFloat((S[sec] || {}).SPACING);
      const unit = UNIT_CM[((S[sec] || {}).UNITS || 'centimeters').toUpperCase()];
      return sp > 0 && unit ? 1 / (sp * unit) : null;   // threads per cm
    };
    const epcm = sett('WARP'), ppcm = sett('WEFT');
    if (epcm || ppcm) {
      s.physical = { ...PHYSICAL_DEFAULTS, densityUnit: 'cm',
        epi: num(epcm || ppcm, LIMITS.densityCm, PHYSICAL_DEFAULTS.epi), ppi: num(ppcm || epcm, LIMITS.densityCm, PHYSICAL_DEFAULTS.ppi) };
      notes.push('sett read from the WIF thread spacing');
    }
  }
  s.view = { ...baseView };
  return { state: s, notes };
}

/* ---------------------------------------------------------------- reports */

/* Smallest period of an array, or 0 when it does not repeat within itself. */
export function period(arr) {
  const n = arr.length;
  for (let p = 1; p < n; p++) {
    let ok = true;
    for (let i = 0; i + p < n; i++) if (arr[i] !== arr[i + p]) { ok = false; break; }
    if (ok) return p;
  }
  return 0;
}

export function summary(s) {
  const dd = drawdown(s);
  const runs = floatRuns(dd, s.ends, s.picks);
  const long = longFloats(runs, s.view.maxFloat);
  let unthreaded = 0, untrodden = 0;
  for (let e = 0; e < s.ends; e++) if (!s.threading[e]) unthreaded++;
  for (let p = 0; p < s.picks; p++) if (!liftMask(s, p)) untrodden++;
  return { dd, runs, long, unthreaded, untrodden,
    threadingPeriod: period(s.threading), treadlingPeriod: period(s.treadling) };
}

/* Deep equality on the DRAFT (not the view): what the WIF round trip must
   preserve. Colours are compared per thread, since that is what the file
   carries; a yarn library and its systems are a presentation of them. */
export function sameDraft(a, b) {
  if (a.shafts !== b.shafts || a.treadles !== b.treadles || a.ends !== b.ends || a.picks !== b.picks) return false;
  const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (!eq(a.threading, b.threading) || !eq(a.tieup, b.tieup) || !eq(a.treadling, b.treadling)) return false;
  return eq(threadColors(a, 'warp', a.ends), threadColors(b, 'warp', b.ends))
    && eq(threadColors(a, 'weft', a.picks), threadColors(b, 'weft', b.picks));
}

const sameJson = (x, y) => JSON.stringify(x) === JSON.stringify(y);
export function sameConstruction(a, b) {
  return sameJson(a.yarns, b.yarns) && sameJson(a.warpSystems, b.warpSystems)
    && sameJson(a.weftSystems, b.weftSystems) && sameJson(a.physical, b.physical);
}

export function sameState(a, b) {
  if (!sameDraft(a, b) || !sameConstruction(a, b)) return false;
  const va = a.view, vb = b.view;
  return va.mode === vb.mode && va.grid === vb.grid && va.cell === vb.cell && va.fabric === vb.fabric
    && Math.round(va.yarn * 100) === Math.round(vb.yarn * 100) && va.maxFloat === vb.maxFloat && va.warn === vb.warn
    && va.trueScale === vb.trueScale && va.dpi === vb.dpi;
}
