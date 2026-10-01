/* weave-draft.js — the Weave Draft MODEL. Pure: no DOM, no canvas, importable
   in Node, which is what lets tools/verify-weave.mjs check the drawdown rule
   and the WIF round trip without a browser.

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

   ORIENTATION IS THE RENDERER'S, NOT THE MODEL'S. Index 0 is end 1 / pick 1 /
   shaft 1 / treadle 1 here and in the WIF file. Which side of the screen end 1
   sits on is decided once, in weave-render.js. */

export const LIMITS = {
  shafts: [2, 16], treadles: [2, 16], ends: [8, 256], picks: [8, 256],
  cell: [4, 24], yarn: [0.4, 1.0], maxFloat: [2, 32],
};

export const PALETTE = {
  ink: '#0A0A0C', inkSoft: '#131316', paper: '#EDEDE8', teal: '#5FA0A0',
  dim: '#8A8A85', dim2: '#5A5A56', warn: '#E07A6A',
};

export const VIEW_DEFAULTS = Object.freeze({
  mode: 'draft', grid: true, cell: 12, fabric: false, yarn: 0.78, maxFloat: 5, warn: true,
});

/* ---------------------------------------------------------------- state */

export function blankState(shafts = 4, treadles = 4, ends = 32, picks = 32) {
  return {
    shafts, treadles, ends, picks,
    threading: new Uint16Array(ends),
    tieup: new Uint16Array(treadles),
    treadling: new Uint16Array(picks),
    warp: [{ color: PALETTE.paper, count: 1 }],
    weft: [{ color: PALETTE.teal, count: 1 }],
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
    warp: s.warp.map(x => ({ ...x })),
    weft: s.weft.map(x => ({ ...x })),
    view: { ...s.view },
  };
}

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const bit = (i) => 1 << i;
const allBits = (n) => (1 << n) - 1;

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

/* ------------------------------------------------------------------ colours */

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

/* ------------------------------------------------------------------- hash
   The whole state in the URL fragment: #v=1&s=..&t=..&e=..&p=..&th=..&tu=..
   &tr=..&wc=..&fc=..&vm=..&g=..&c=..&f=..&y=..&m=..&w=... Masks go as
   little-endian Uint16 bytes in base64url; stripes as RRGGBB.count lists.
   encodeHash/decodeHash is a lossless pair over the whole state, view
   settings included — the gate round-trips random states through it. */
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

const stripesToStr = (list) => list.map(x => `${x.color.replace('#', '').toUpperCase()}.${x.count}`).join(',');
const stripesFromStr = (str) => {
  if (!str) return [];
  return str.split(',').map(part => {
    const m = /^([0-9A-Fa-f]{6})\.(\d+)$/.exec(part);
    if (!m) throw new Error('bad stripe');
    return { color: '#' + m[1].toUpperCase(), count: clamp(+m[2], [1, 9999]) };
  });
};

export function encodeHash(s) {
  const v = s.view;
  const kv = [
    ['v', 1], ['s', s.shafts], ['t', s.treadles], ['e', s.ends], ['p', s.picks],
    ['th', u16ToB64(s.threading)], ['tu', u16ToB64(s.tieup)], ['tr', u16ToB64(s.treadling)],
    ['wc', stripesToStr(s.warp)], ['fc', stripesToStr(s.weft)],
    ['vm', v.mode === 'drawdown' ? 'dd' : 'd'], ['g', v.grid ? 1 : 0], ['c', v.cell],
    ['f', v.fabric ? 1 : 0], ['y', Math.round(v.yarn * 100)], ['m', v.maxFloat], ['w', v.warn ? 1 : 0],
  ];
  return kv.map(([k, val]) => `${k}=${val}`).join('&');
}

/* Returns a state, or null for anything that is not a v=1 weave hash. A hash
   that parses but holds an out-of-range count is clamped, never refused. */
export function decodeHash(hash) {
  try {
    const str = (hash || '').replace(/^#/, '');
    if (!str) return null;
    const kv = Object.fromEntries(str.split('&').map(part => {
      const i = part.indexOf('=');
      return i < 0 ? [part, ''] : [part.slice(0, i), part.slice(i + 1)];
    }));
    if (kv.v !== '1') return null;
    const s = blankState(
      clamp(+kv.s || 4, LIMITS.shafts), clamp(+kv.t || 4, LIMITS.treadles),
      clamp(+kv.e || 32, LIMITS.ends), clamp(+kv.p || 32, LIMITS.picks));
    const ms = allBits(s.shafts), mt = allBits(s.treadles);
    s.threading = b64ToU16(kv.th || '', s.ends).map(x => x & ms);
    s.tieup = b64ToU16(kv.tu || '', s.treadles).map(x => x & ms);
    s.treadling = b64ToU16(kv.tr || '', s.picks).map(x => x & mt);
    const wc = stripesFromStr(kv.wc), fc = stripesFromStr(kv.fc);
    if (wc.length) s.warp = wc;
    if (fc.length) s.weft = fc;
    s.view = {
      mode: kv.vm === 'dd' ? 'drawdown' : 'draft',
      grid: kv.g === undefined ? VIEW_DEFAULTS.grid : kv.g === '1',
      cell: clamp(+kv.c || VIEW_DEFAULTS.cell, LIMITS.cell),
      fabric: kv.f === '1',
      yarn: kv.y === undefined ? VIEW_DEFAULTS.yarn : clamp((+kv.y) / 100, LIMITS.yarn),
      maxFloat: clamp(+kv.m || VIEW_DEFAULTS.maxFloat, LIMITS.maxFloat),
      warn: kv.w === undefined ? VIEW_DEFAULTS.warn : kv.w === '1',
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
   cloth under the rule above, so the model stays rising-shed only. */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), [0, 255]).toString(16).padStart(2, '0')).join('').toUpperCase();
const maskList = (m, n) => { const out = []; for (let i = 0; i < n; i++) if (m & bit(i)) out.push(i + 1); return out.join(','); };

export function toWif(s) {
  const warpC = expandStripes(s.warp, s.ends), weftC = expandStripes(s.weft, s.picks, PALETTE.teal);
  const table = [];
  const index = (c) => { let i = table.indexOf(c); if (i < 0) { table.push(c); i = table.length - 1; } return i + 1; };
  const warpI = warpC.map(index), weftI = weftC.map(index);
  const L = [];
  L.push('[WIF]', 'Version=1.1', 'Date=April 20, 1997', 'Developers=wif@mhsoft.com',
    'Source Program=EM Weave', 'Source Version=1.0', '');
  L.push('[CONTENTS]', 'COLOR PALETTE=yes', 'WEAVING=yes', 'WARP=yes', 'WEFT=yes', 'COLOR TABLE=yes',
    'THREADING=yes', 'TIEUP=yes', 'TREADLING=yes', 'WARP COLORS=yes', 'WEFT COLORS=yes', '');
  L.push('[COLOR PALETTE]', `Entries=${table.length}`, 'Range=0,255', '');
  L.push('[WEAVING]', `Shafts=${s.shafts}`, `Treadles=${s.treadles}`, 'Rising Shed=yes', '');
  L.push('[WARP]', `Threads=${s.ends}`, `Color=${warpI[0]}`, '');
  L.push('[WEFT]', `Threads=${s.picks}`, `Color=${weftI[0]}`, '');
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
  s.warp = stripesFrom(perThread(s.ends, 'WARP COLORS', 'WARP', PALETTE.paper));
  s.weft = stripesFrom(perThread(s.picks, 'WEFT COLORS', 'WEFT', PALETTE.teal));
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
   carries; a stripe list is a presentation of them. */
export function sameDraft(a, b) {
  if (a.shafts !== b.shafts || a.treadles !== b.treadles || a.ends !== b.ends || a.picks !== b.picks) return false;
  const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (!eq(a.threading, b.threading) || !eq(a.tieup, b.tieup) || !eq(a.treadling, b.treadling)) return false;
  return eq(expandStripes(a.warp, a.ends), expandStripes(b.warp, b.ends))
    && eq(expandStripes(a.weft, a.picks, PALETTE.teal), expandStripes(b.weft, b.picks, PALETTE.teal));
}

export function sameState(a, b) {
  if (!sameDraft(a, b)) return false;
  const va = a.view, vb = b.view;
  return va.mode === vb.mode && va.grid === vb.grid && va.cell === vb.cell && va.fabric === vb.fabric
    && Math.round(va.yarn * 100) === Math.round(vb.yarn * 100) && va.maxFloat === vb.maxFloat && va.warn === vb.warn;
}
