// hanabi/deck.js — the deck MODEL. Pure: no DOM, no canvas.
//
// Everything a card looks like is decided from one state object (the design),
// and everything the deck CONTAINS is decided here: which suits are in play,
// how many copies of each rank, the card size in millimetres, and the tokens.
// The renderers (hanabi/layout.js, hanabi/firework.js) read a card record and
// the design; they never decide what is in the deck.
//
// A face is two independent choices (Eva's ruling on #528's three layouts):
//   design.index        the CORNER INDEX, one style for the whole deck, so the
//                       numeral and symbol are always found in the same place
//   suit.centre         the CENTRE, per suit: the RANK COMPOSITION (compose —
//                       count, count+scale, scale, column or full bleed), which
//                       firework type it draws, and an optional lower tier at
//                       ranks 4-5 under Scale
//
// THE FIREWORK BOARD (phase 2, schema version 3) designs every suit x rank:
//   suit.firework              the suit's own type PARAMETERS (a partial over
//                              the type's defaults; firework.js PARAMS)
//   design.arrangements[rank]  the rank column's arrangement under Count: one
//                              { x, y, s, rot } per firework, x/y fractions of
//                              the centre field, s of half its shorter side
//   design.fireworks[suit][rank]  the CELL override: any spec key, per key,
//                              `items`, that cell's own arrangement, and
//                              `styles` { [n]: { motif?, ...params } }, one
//                              firework's own type and parameters (version 4)
//   design.scene               an optional silhouette band behind the fireworks
//
// Phase 1's layouts A/B/C are exactly (large, scale), (small, column) and
// (band, bleed); a version-1 file is read that way (LEGACY_LAYOUTS), and a
// version-2 file's single/count/bleed as scale/column/bleed (V2_LAYOUTS), so
// every saved design opens looking as it did.

import { MOTIF_IDS, MOTIFS, TYPES, TIER_IDS, LEGACY_RADIAL, PARAMS, STYLE_MOTIFS, inheritKeys,
  ringCounts, peonyRingsFor, ringRingsFor, legacyGlitterCount } from './firework.js';

// 4: a Count card's fireworks may each carry a style of their own (`styles` in
// the cell). A version-3 file has none and reads unchanged.
// 5: a type's count is the number of its main elements DRAWN (Stars, Spokes,
// Trails, Arms, Petals) and Detail no longer changes it: a peony's and a ring's
// count is the total of their stars, a glitter's the sparks. A version-4 file is
// migrated (migrateCounts) so every firework draws as it did.
export const VERSION = 5;

// The standard per-suit distribution: three 1s, two 2s, two 3s, two 4s, one 5.
// The optional rainbow suit uses the same distribution (10 more cards).
export const RANKS = [1, 2, 3, 4, 5];
export const COPIES = { 1: 3, 2: 2, 3: 2, 4: 2, 5: 1 };
export const TOKEN_COUNTS = { clue: 8, fuse: 3 };

// Card size presets, in millimetres at TRIM (the finished card).
export const SIZE_PRESETS = {
  poker:  { label: 'Poker',  w: 63.5, h: 88.9 },
  bridge: { label: 'Bridge', w: 57.2, h: 88.9 },
  mini:   { label: 'Mini',   w: 44,   h: 63 },
};
export const SIZE_LIMITS = { min: 30, max: 140 };   // custom size bounds, mm
export const BLEED_LIMITS = { min: 0, max: 5 };
export const SAFE_LIMITS = { min: 0, max: 8 };

// How the rainbow suit's corner index (numeral and symbol) is filled: its own
// primary, or a gradient through the other suits' colours (layout.js
// numeralColours()) — the default (Eva, Nov 9). Only a multicolour suit
// carries the field; a file without it gets the default.
export const NUMERAL_FILLS = { solid: 'Solid', rainbow: 'Rainbow gradient' };

export const INDEX_STYLES = {
  large: 'Large numeral + symbol',
  small: 'Small numeral + symbol',
  band:  'Coloured band, top and bottom',
};
// The rank composition: how a suit's rank is told on its cards.
export const COMPOSE = {
  count:      'Count — rank N is N fireworks',
  countscale: 'Count + scale — N fireworks, growing with rank',
  scale:      'Scale — one firework, growing with rank',
  column:     'Column — N in a stack (phase 1)',
  bleed:      'Full bleed — one firework off the edges',
};
export const COUNT_MODES = ['count', 'countscale'];
// Phase 1's layouts, as the pair of choices each one was.
export const LEGACY_LAYOUTS = {
  A: { index: 'large', compose: 'scale' },
  B: { index: 'small', compose: 'column' },
  C: { index: 'band',  compose: 'bleed' },
};
// A version-2 suit's centre layout, as the composition that draws it unchanged.
export const V2_LAYOUTS = { single: 'scale', count: 'column', bleed: 'bleed' };
// The default pairing (phase 2): every suit its own firework type, so the suits
// read apart in greyscale by silhouette as well as by symbol.
export const DEFAULT_TYPES = { white: 'ring', red: 'peony', blue: 'willow', yellow: 'chrysanthemum', green: 'palm', rainbow: 'glitter' };
export const defaultCentre = (motif = 'classic') => ({ compose: 'count', motif, tier: 'none' });
// What a phase-1 file meant by "no centre given".
export const legacyCentre = () => ({ compose: 'scale', motif: 'classic', tier: 'none' });
export const SCENES = { treeline: 'Treeline', rooftops: 'Rooftops' };
export const SCENE_HEIGHT = { min: 0.08, max: 0.45 };
export const ITEM_LIMITS = { s: [0.15, 1.25], rot: [-180, 180] };
// A Scale card's one firework, placed by hand: x, y fractions of the centre
// field, s a multiple of the radius Scale gives it, rot degrees added.
export const PLACE_LIMITS = { s: [0.3, 1.6], rot: [-180, 180] };
export const CORNER_MODES = {
  inverted: 'Two corners, bottom inverted',
  upright:  'Two corners, both upright',
  four:     'All four corners',
};

export const BACK_PATTERNS = ['none', 'stars', 'dots', 'stripes', 'rays'];
export const BACK_MARKS = ['none', 'burst', 'ring'];
export const PAPERS = {
  letter: { label: 'Letter', w: 215.9, h: 279.4 },
  a4:     { label: 'A4',     w: 210,   h: 297 },
};

// The five classic suits plus the optional rainbow. The rainbow suit is
// always present in the design (so its colours and symbol survive a toggle)
// and only enters the deck when `rainbow` is on.
export function defaultSuits() {
  return [
    { id: 'white',   name: 'White',   primary: '#EDEAE0', secondary: '#9FB4C8', symbol: 'crescent', centre: defaultCentre('ring'), firework: {} },
    { id: 'red',     name: 'Red',     primary: '#E5484D', secondary: '#F5A97A', symbol: 'heart', centre: defaultCentre('peony'), firework: {} },
    { id: 'blue',    name: 'Blue',    primary: '#3E8EF0', secondary: '#9BD3F7', symbol: 'drop', centre: defaultCentre('willow'), firework: {} },
    { id: 'yellow',  name: 'Yellow',  primary: '#F2C230', secondary: '#FFF0A8', symbol: 'star', centre: defaultCentre('chrysanthemum'), firework: {} },
    { id: 'green',   name: 'Green',   primary: '#3DBA6B', secondary: '#B6E8A0', symbol: 'triangle', centre: defaultCentre('palm'), firework: {} },
    { id: 'rainbow', name: 'Rainbow', primary: '#E8D9FF', secondary: '#FFB1E0', symbol: 'sparkle', multicolor: true, numeral: 'rainbow', centre: defaultCentre('glitter'), firework: {} },
  ];
}

export function defaultDesign() {
  return {
    version: VERSION,
    rainbow: false,
    suits: defaultSuits(),
    size: { preset: 'poker', w: 63.5, h: 88.9 },
    bleed: 3,
    safe: 3,
    index: 'large',
    corners: 'inverted',
    face: { bg: '#0B1018' },
    back: { bg: '#10202A', fg: '#2FA3A3', pattern: 'stars', mark: 'burst' },
    tokens: { clueBg: '#1A3E66', clueFg: '#CFE6FF', fuseBg: '#3A1414', fuseFg: '#FF8A5C' },
    // The CELL overrides the Firework board writes: { [suitId]: { [rank]:
    // partialSpec + optional items } }, merged per key over the suit's spec.
    fireworks: {},
    // The rank columns' arrangements under Count: { [rank]: items }.
    arrangements: {},
    scene: { on: false, kind: 'treeline', color: '#16222E', height: 0.18 },
    print: { paper: 'letter', orientation: 'auto', cut: 'separate', duplex: false, flip: 'long', cropMarks: true },
  };
}

export function activeSuits(design) {
  return design.suits.filter((s) => design.rainbow || !s.multicolor);
}

// Every face of the deck, in print order: each suit 1,1,1,2,2,3,3,4,4,5,
// then the clue tokens, then the fuse tokens. `copy` numbers duplicates;
// duplicates of one suit+rank render identically by default.
export function deckCards(design) {
  const cards = [];
  for (const suit of activeSuits(design)) {
    for (const rank of RANKS) {
      for (let c = 0; c < COPIES[rank]; c++) cards.push({ kind: 'card', suitId: suit.id, rank, copy: c });
    }
  }
  for (let c = 0; c < TOKEN_COUNTS.clue; c++) cards.push({ kind: 'clue', copy: c });
  for (let c = 0; c < TOKEN_COUNTS.fuse; c++) cards.push({ kind: 'fuse', copy: c });
  return cards;
}

export function cardCounts(design) {
  const suits = activeSuits(design).length;
  const perSuit = RANKS.reduce((n, r) => n + COPIES[r], 0);
  return { suits, perSuit, cards: suits * perSuit, clue: TOKEN_COUNTS.clue, fuse: TOKEN_COUNTS.fuse,
           total: suits * perSuit + TOKEN_COUNTS.clue + TOKEN_COUNTS.fuse };
}

export function suitById(design, id) {
  return design.suits.find((s) => s.id === id);
}

// Card geometry in mm. Origin at the BLEED corner: the trim rect sits at
// (bleed, bleed), the safe rect inside it.
export function cardGeom(design) {
  const w = design.size.w, h = design.size.h, b = design.bleed, s = design.safe;
  return {
    w, h, bleed: b, safe: s,
    fullW: w + 2 * b, fullH: h + 2 * b,
    trim: { x: b, y: b, w, h },
    safeRect: { x: b + s, y: b + s, w: w - 2 * s, h: h - 2 * s },
  };
}

// Suits whose symbols collide — colour-only suits are what this tool exists
// to prevent, so the panel says so out loud.
export function symbolClashes(design) {
  const seen = new Map(), clash = new Set();
  for (const s of activeSuits(design)) {
    if (seen.has(s.symbol)) { clash.add(s.id); clash.add(seen.get(s.symbol)); }
    else seen.set(s.symbol, s.id);
  }
  return clash;
}

// ---- the design file: normalise anything loaded back onto the schema ----

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const hex = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : d);
const pick = (v, list, d) => (list.includes(v) ? v : d);

// Returns { design, notes } — every departure from a clean read is a note.
export function normaliseDesign(raw, symbolIds) {
  const d = defaultDesign();
  const notes = [];
  if (!raw || typeof raw !== 'object') return { design: d, notes: ['not a design object — defaults used'] };
  if (raw.format && raw.format !== 'hanabi-deck') notes.push(`format "${raw.format}" is not hanabi-deck`);
  if (typeof raw.version === 'number' && raw.version > VERSION) {
    return { design: null, notes: [`version ${raw.version} is newer than this page (${VERSION}) — refused`] };
  }
  const ver = typeof raw.version === 'number' ? raw.version : 1;
  // A version-1 file chose one layout for the whole deck; it becomes that
  // layout's corner index plus that layout's centre on every suit.
  const legacy = ver < 2 && LEGACY_LAYOUTS[raw.layout] ? LEGACY_LAYOUTS[raw.layout] : null;
  if (legacy) notes.push(`version-1 layout ${raw.layout} read as the ${legacy.index} corner index with a ${legacy.compose} centre on every suit`);
  // A file older than the board keeps phase 1's centres where it names none,
  // and its renamed radial bursts.
  if (ver < 3) for (const s of d.suits) s.centre = legacyCentre();
  const motifOf = (m) => (ver < 3 && LEGACY_RADIAL[m] ? LEGACY_RADIAL[m] : m);
  let renamed = 0;
  d.rainbow = !!raw.rainbow;
  if (Array.isArray(raw.suits)) {
    for (const s of d.suits) {
      const r = raw.suits.find((x) => x && x.id === s.id);
      if (!r) { notes.push(`suit ${s.id} missing — default kept`); continue; }
      if (typeof r.name === 'string' && r.name.trim()) s.name = r.name.slice(0, 24);
      s.primary = hex(r.primary, s.primary);
      s.secondary = hex(r.secondary, s.secondary);
      if (symbolIds.includes(r.symbol)) s.symbol = r.symbol;
      else notes.push(`suit ${s.id}: unknown symbol "${r.symbol}" — default kept`);
      if (s.multicolor && r.numeral !== undefined) {
        if (NUMERAL_FILLS[r.numeral]) s.numeral = r.numeral;
        else notes.push(`suit ${s.id}: unknown numeral fill "${r.numeral}" — ${s.numeral} kept`);
      }
      if (legacy) s.centre.compose = legacy.compose;
      else if (r.centre && typeof r.centre === 'object') {
        const c = r.centre;
        if (ver < 3) s.centre.compose = V2_LAYOUTS[c.layout] || s.centre.compose;
        else if (COMPOSE[c.compose]) s.centre.compose = c.compose;
        else notes.push(`suit ${s.id}: unknown composition "${c.compose}" — ${s.centre.compose} kept`);
        const m = motifOf(c.motif);
        if (m !== c.motif) renamed++;
        if (MOTIF_IDS.includes(m)) s.centre.motif = m;
        else notes.push(`suit ${s.id}: unknown firework "${c.motif}" — ${s.centre.motif} kept`);
        if (c.tier === undefined || TIER_IDS.includes(c.tier)) s.centre.tier = pick(c.tier, TIER_IDS, s.centre.tier);
        else notes.push(`suit ${s.id}: unknown second tier "${c.tier}" — none kept`);
      } else if (raw.version >= 2) notes.push(`suit ${s.id}: no centre — default kept`);
      if (ver >= 3 && r.firework && typeof r.firework === 'object') {
        for (const [k, v] of Object.entries(r.firework)) {
          const ok = readParam(k, v);
          if (ok === undefined) notes.push(`suit ${s.id}: firework parameter ${k}=${JSON.stringify(v)} not understood — dropped`);
          else s.firework[k] = ok;
        }
      }
    }
  }
  if (raw.size && typeof raw.size === 'object') {
    const p = SIZE_PRESETS[raw.size.preset] ? raw.size.preset : 'custom';
    d.size.preset = p;
    d.size.w = clamp(num(raw.size.w, d.size.w), SIZE_LIMITS.min, SIZE_LIMITS.max);
    d.size.h = clamp(num(raw.size.h, d.size.h), SIZE_LIMITS.min, SIZE_LIMITS.max);
    if (p !== 'custom') { d.size.w = SIZE_PRESETS[p].w; d.size.h = SIZE_PRESETS[p].h; }
  }
  d.bleed = clamp(num(raw.bleed, d.bleed), BLEED_LIMITS.min, BLEED_LIMITS.max);
  d.safe = clamp(num(raw.safe, d.safe), SAFE_LIMITS.min, SAFE_LIMITS.max);
  d.index = legacy ? legacy.index : pick(raw.index, Object.keys(INDEX_STYLES), d.index);
  d.corners = pick(raw.corners, Object.keys(CORNER_MODES), d.corners);
  if (raw.face) d.face.bg = hex(raw.face.bg, d.face.bg);
  if (raw.back) {
    d.back.bg = hex(raw.back.bg, d.back.bg);
    d.back.fg = hex(raw.back.fg, d.back.fg);
    d.back.pattern = pick(raw.back.pattern, BACK_PATTERNS, d.back.pattern);
    d.back.mark = pick(raw.back.mark, BACK_MARKS, d.back.mark);
  }
  if (raw.tokens) for (const k of Object.keys(d.tokens)) d.tokens[k] = hex(raw.tokens[k], d.tokens[k]);
  if (renamed) notes.push(`${renamed} phase-1 firework${renamed === 1 ? '' : 's'} read as the radial burst${renamed === 1 ? '' : 's'} it drew (the plain names are the phase-2 types now)`);
  if (raw.fireworks && typeof raw.fireworks === 'object') {
    d.fireworks = JSON.parse(JSON.stringify(raw.fireworks));
    for (const [sid, ranks] of Object.entries(d.fireworks)) {
      if (!ranks || typeof ranks !== 'object') { delete d.fireworks[sid]; continue; }
      for (const [rk, o] of Object.entries(ranks)) {
        if (!o || typeof o !== 'object') { delete ranks[rk]; continue; }
        if (o.motif !== undefined) o.motif = motifOf(o.motif);
        if (o.items !== undefined) {
          const it = readItems(o.items, +rk);
          if (it) o.items = it;
          else { delete o.items; notes.push(`${sid} ${rk}: an arrangement of ${Array.isArray(o.items) ? o.items.length : 'no'} fireworks for rank ${rk} — dropped`); }
        }
        if (o.place !== undefined) {
          const pl = readPlace(o.place);
          if (pl) o.place = pl;
          else { delete o.place; notes.push(`${sid} ${rk}: a placement not understood — dropped`); }
        }
        if (o.styles !== undefined) {
          const st = readStyles(o.styles, +rk, (m) => notes.push(`${sid} ${rk}: ${m}`), motifOf);
          if (st) o.styles = st; else delete o.styles;
        }
        if (!Object.keys(o).length) delete ranks[rk];
      }
      if (!Object.keys(ranks).length) delete d.fireworks[sid];
    }
  }
  if (ver < 5) {
    const moved = migrateCounts(d);
    if (moved) notes.push(`${moved} firework count${moved === 1 ? '' : 's'} rewritten as the stars ${moved === 1 ? 'its' : 'their'} Detail drew (version 5: the count is the number drawn, and Detail no longer adds any) — ${moved === 1 ? 'it draws' : 'they draw'} exactly as before`);
  }
  if (raw.arrangements && typeof raw.arrangements === 'object') {
    for (const [rk, items] of Object.entries(raw.arrangements)) {
      const it = RANKS.includes(+rk) ? readItems(items, +rk) : null;
      if (it) d.arrangements[rk] = it;
      else notes.push(`rank ${rk}: arrangement not understood — the default kept`);
    }
  }
  if (raw.scene && typeof raw.scene === 'object') {
    d.scene.on = !!raw.scene.on;
    d.scene.kind = pick(raw.scene.kind, Object.keys(SCENES), d.scene.kind);
    d.scene.color = hex(raw.scene.color, d.scene.color);
    d.scene.height = clamp(num(raw.scene.height, d.scene.height), SCENE_HEIGHT.min, SCENE_HEIGHT.max);
  }
  if (raw.print) {
    d.print.paper = pick(raw.print.paper, Object.keys(PAPERS), d.print.paper);
    d.print.orientation = pick(raw.print.orientation, ORIENTATIONS, d.print.orientation);
    d.print.cut = pick(raw.print.cut, ['separate', 'shared'], d.print.cut);
    d.print.flip = pick(raw.print.flip, ['long', 'short'], d.print.flip);
    d.print.duplex = !!raw.print.duplex;
    d.print.cropMarks = raw.print.cropMarks !== false;
  }
  return { design: d, notes };
}

export function serialiseDesign(design) {
  return JSON.stringify({ format: 'hanabi-deck', ...design, version: VERSION }, null, 2);
}

// ---- version 4 -> 5: the count of a peony, a ring and a glitter ----
// In version 4 those three counted their OUTER ring (or their spark base) and
// Detail added stars on top; in version 5 the count is what is drawn. Every
// level a count or a Detail can be set at — the suit's firework, a card, one
// firework's style — is visited top down, its version-4 parameters merged as
// version 4 merged them (V4 defaults restated here, because firework.js now
// carries version 5's), and wherever the version-5 merge of the levels already
// rewritten would not draw the same, that level is given the count (and, for a
// glitter whose Detail was not 1, Detail 1 and its old fit as `legacy`).
const V4_DEFAULTS = { peony: { count: 20, density: 1 }, ring: { count: 22, density: 0 }, glitter: { count: 34, density: 1 } };
const STAR_KEYS = ['count', 'density', 'legacy'];
function mergeKeys(base, layers, keys) {
  const e = { ...base };
  for (const L of layers) if (L) for (const k of keys) if (L[k] !== undefined && L[k] !== '') e[k] = L[k];
  return e;
}
// What a version-4 count and Detail drew, as version-5 parameters.
export function v5Count(type, count, density) {
  const n5 = Math.max(3, Math.round(+count || 3));
  if (type === 'glitter') {
    const dd = Math.min(2, Math.max(0, +(density ?? 1)));
    return dd === 1 ? { count, density } : { count: legacyGlitterCount({ count, density }), density: 1, legacy: { count: +count, density: +density } };
  }
  const rings = type === 'peony' ? peonyRingsFor(density) : ringRingsFor(density);
  return { count: ringCounts(type, n5, rings).reduce((a, b) => a + b, 0), density };
}
export function migrateCounts(d) {
  let moved = 0;
  const v5Def = (t) => ({ count: TYPES[t].defaults.count, density: TYPES[t].defaults.density });
  const keysOf = (t) => inheritKeys(t).filter((k) => STAR_KEYS.includes(k));
  // give `node` what it needs so the version-5 merge `now` draws as `req` asks
  const settle = (node, req, now) => {
    let w = false;
    for (const k of ['count', 'density']) if (req[k] !== undefined && +now[k] !== +req[k]) { node[k] = req[k]; w = true; }
    if (req.legacy) { if (JSON.stringify(now.legacy) !== JSON.stringify(req.legacy)) { node.legacy = req.legacy; w = true; } }
    else if (now.legacy) { node.legacy = false; w = true; }
    if (w) moved++;
  };
  const clone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);
  for (const s of d.suits) {
    const ms = s.centre.motif, suit4 = clone(s.firework);
    if (V4_DEFAULTS[ms]) {
      const old = mergeKeys(V4_DEFAULTS[ms], [suit4], keysOf(ms));
      settle(s.firework, v5Count(ms, old.count, old.density), mergeKeys(v5Def(ms), [s.firework], keysOf(ms)));
    }
    const ranks = d.fireworks && d.fireworks[s.id];
    if (!ranks) continue;
    for (const o of Object.values(ranks)) {
      if (!o || typeof o !== 'object') continue;
      const { styles, items, place, ...cell4 } = clone(o);
      const mc = MOTIFS[o.motif] ? o.motif : ms;
      const cardOld = V4_DEFAULTS[mc] ? mergeKeys(V4_DEFAULTS[mc], [suit4, cell4], keysOf(mc)) : null;
      if (cardOld) settle(o, v5Count(mc, cardOld.count, cardOld.density), mergeKeys(v5Def(mc), [s.firework, o], keysOf(mc)));
      if (!o.styles || typeof o.styles !== 'object') continue;
      for (const st of Object.values(o.styles)) {
        if (!st || typeof st !== 'object') continue;
        const other = STYLE_MOTIFS.includes(st.motif) && st.motif !== mc;
        const t = other ? st.motif : mc;
        if (!V4_DEFAULTS[t]) continue;
        const st4 = clone(st);
        const old = other ? mergeKeys(V4_DEFAULTS[t], [st4], keysOf(t)) : mergeKeys(V4_DEFAULTS[t], [suit4, cell4, st4], keysOf(t));
        const now = other ? mergeKeys(v5Def(t), [st], keysOf(t)) : mergeKeys(v5Def(t), [s.firework, o, st], keysOf(t));
        settle(st, v5Count(t, old.count, old.density), now);
      }
    }
  }
  return moved;
}

// One firework parameter, read back onto its range; undefined if not one.
// `legacy` is no control: a migrated glitter's old { count, density } (or false).
export function readParam(k, v) {
  if (k === 'legacy') {
    if (v === false) return false;
    return v && typeof v === 'object' && Number.isFinite(v.count) && Number.isFinite(v.density) ? { count: v.count, density: v.density } : undefined;
  }
  const P = PARAMS[k];
  if (!P) return undefined;
  if (P.kind === 'bool') return typeof v === 'boolean' ? v : undefined;
  if (P.kind === 'color') return v === '' ? '' : typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : undefined;
  return typeof v === 'number' && Number.isFinite(v) ? clamp(v, P.min, P.max) : undefined;
}
// An arrangement: exactly `rank` fireworks, each clamped onto the field.
// An item may carry `n`, the firework it is (0..rank-1): a firework keeps its
// own drawing when its place in the stacking order moves. Kept only when the
// items' n are exactly 0..rank-1 once each; otherwise every n is dropped and
// each firework is its slot again.
export function readItems(items, rank) {
  if (!Array.isArray(items) || items.length !== rank) return null;
  const out = [];
  for (const it of items) {
    if (!it || typeof it !== 'object' || ![it.x, it.y, it.s].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
    const o = { x: clamp(it.x, 0, 1), y: clamp(it.y, 0, 1), s: clamp(it.s, ...ITEM_LIMITS.s), rot: clamp(num(it.rot, 0), ...ITEM_LIMITS.rot) };
    if (it.n !== undefined) o.n = it.n;
    out.push(o);
  }
  const ns = out.map((o) => o.n);
  const perm = ns.every((n) => Number.isInteger(n) && n >= 0 && n < rank) && new Set(ns).size === rank;
  if (!perm) for (const o of out) delete o.n;
  return out;
}
// One card's per-firework styles: { [n]: style }, n a firework of the card
// (0..rank-1). A style keeps a known motif (not a field: it fills a rect) and
// the parameters readParam takes; the rest is dropped and told. null if empty.
export function readStyles(styles, rank, note, motifOf = (m) => m) {
  if (!styles || typeof styles !== 'object' || Array.isArray(styles)) { note('firework styles not understood — dropped'); return null; }
  const out = {};
  for (const [n, st] of Object.entries(styles)) {
    if (!/^\d+$/.test(n) || +n >= rank) { note(`a style for firework ${n}, which a rank-${rank} card does not have — dropped`); continue; }
    if (!st || typeof st !== 'object') { note(`firework ${+n + 1}: a style not understood — dropped`); continue; }
    const o = {};
    for (const [k, v] of Object.entries(st)) {
      if (k === 'motif') { const m = motifOf(v); if (STYLE_MOTIFS.includes(m)) o.motif = m; else note(`firework ${+n + 1}: type "${v}" not offered for one firework — dropped`); continue; }
      const ok = readParam(k, v);
      if (ok === undefined) note(`firework ${+n + 1}: ${k}=${JSON.stringify(v)} not understood — dropped`); else o[k] = ok;
    }
    if (Object.keys(o).length) out[+n] = o;
  }
  return Object.keys(out).length ? out : null;
}
export function readPlace(p) {
  if (!p || typeof p !== 'object' || ![p.x, p.y, p.s].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  return { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1), s: clamp(p.s, ...PLACE_LIMITS.s), rot: clamp(num(p.rot, 0), ...PLACE_LIMITS.rot) };
}
// Move item i of an arrangement to position j of the stacking order (0 is the
// back). Every item is numbered first, so each firework keeps its drawing.
export function restack(items, i, j) {
  const out = items.map((it, k) => ({ ...it, n: Number.isInteger(it.n) ? it.n : k }));
  const [it] = out.splice(i, 1);
  out.splice(Math.max(0, Math.min(out.length, j)), 0, it);
  return out;
}

// Set one suit's centre (and its firework parameters) on every suit.
export function copyCentreToAll(design, fromId) {
  const from = suitById(design, fromId);
  for (const s of design.suits) { s.centre = { ...from.centre }; s.firework = { ...(from.firework || {}) }; }
}

// ---- per-firework styles: one firework of a Count card, keyed by n ----
export function setFireworkStyle(design, suitId, rank, n, key, value) {
  const o = cellOf(design, suitId, rank, true);
  ((o.styles ||= {})[n] ||= {})[key] = value;
}
// Drop one key of firework n's style, or the whole style (back to the card).
export function clearFireworkStyle(design, suitId, rank, n, key) {
  const o = cellOf(design, suitId, rank);
  if (!o || !o.styles || !o.styles[n]) return;
  if (key) delete o.styles[n][key]; else delete o.styles[n];
  if (o.styles[n] && !Object.keys(o.styles[n]).length) delete o.styles[n];
  if (!Object.keys(o.styles).length) clearCell(design, suitId, rank, 'styles');
}
// Carry one card's style mix to every other suit's card of that rank that draws
// a Count (the only compositions with several fireworks to style). A colour
// set by hand travels with its firework; one inherited stays each suit's own.
// Returns the suits it reached and the ones it left alone.
export function applyStylesToRank(design, fromSuitId, rank) {
  const src = cellOf(design, fromSuitId, rank), styles = src && src.styles;
  const reached = [], skipped = [];
  for (const s of activeSuits(design)) {
    if (s.id === fromSuitId) continue;
    if (!COUNT_MODES.includes(s.centre.compose)) { skipped.push(s.id); continue; }
    if (styles) cellOf(design, s.id, rank, true).styles = JSON.parse(JSON.stringify(styles));
    else clearCell(design, s.id, rank, 'styles');
    reached.push(s.id);
  }
  return { reached, skipped };
}

// ---- the board's cell edits
export function cellHasOverride(design, suitId, rank) {
  const o = design.fireworks && design.fireworks[suitId] && design.fireworks[suitId][rank];
  return !!(o && Object.keys(o).length);
}
export function cellOf(design, suitId, rank, create = false) {
  if (!create) return (design.fireworks[suitId] && design.fireworks[suitId][rank]) || null;
  design.fireworks[suitId] ||= {};
  return (design.fireworks[suitId][rank] ||= {});
}
// Drop one key of a cell's override (or the whole cell), pruning empties.
export function clearCell(design, suitId, rank, key) {
  const o = cellOf(design, suitId, rank);
  if (!o) return;
  if (key) delete o[key]; else delete design.fireworks[suitId][rank];
  if (design.fireworks[suitId][rank] && !Object.keys(design.fireworks[suitId][rank]).length) delete design.fireworks[suitId][rank];
  if (!Object.keys(design.fireworks[suitId]).length) delete design.fireworks[suitId];
}
// The rank column takes this arrangement, and no cell of that rank keeps its own.
export function applyArrangementToRank(design, rank, items) {
  design.arrangements[rank] = items.map((it) => ({ ...it }));
  for (const s of design.suits) clearCell(design, s.id, rank, 'items');
}

// ---- imposition: where each card sits on a sheet, in mm ----
// Pure, so the gate checks the arithmetic directly.
//
// Two cut modes:
//   separate  every card keeps its whole bleed box; neighbours sit bleed box
//             to bleed box, so each card is cut on its own two lines. What a
//             print shop wants, and the safest for hand cutting.
//   shared    cards butt at TRIM, so one cut separates two neighbours and the
//             bleed survives only on the grid's outer edges. More cards a
//             sheet; a mis-cut shows the neighbour's art instead of bleed.
// Orientation 'auto' takes whichever of portrait and landscape holds more
// cards (portrait on a tie). The sheet keeps MARK_ROOM of margin all round so
// the crop marks print outside the art.
export const MARK_ROOM = 6;    // margin reserved for crop marks, mm
export const MARK_LEN = 4;     // crop-mark length, mm
export const MARK_GAP = 1;     // gap between the art and a mark, mm
export const CUT_MODES = { separate: 'Separate bleeds', shared: 'Shared cuts' };
export const ORIENTATIONS = ['auto', 'portrait', 'landscape'];

function fit(paper, g, cut) {
  const pitchX = cut === 'shared' ? g.w : g.fullW, pitchY = cut === 'shared' ? g.h : g.fullH;
  const extra = cut === 'shared' ? 2 * g.bleed : 0;
  const cols = Math.max(0, Math.floor((paper.w - 2 * MARK_ROOM - extra + 1e-9) / pitchX));
  const rows = Math.max(0, Math.floor((paper.h - 2 * MARK_ROOM - extra + 1e-9) / pitchY));
  return { cols, rows, pitchX, pitchY, extra };
}

export function imposition(design, paperId, opts = {}) {
  const base = PAPERS[paperId] || PAPERS.letter;
  const g = cardGeom(design);
  const cut = opts.cut || (design.print && design.print.cut) || 'separate';
  const want = opts.orientation || (design.print && design.print.orientation) || 'auto';
  const portrait = { label: base.label, w: base.w, h: base.h, orientation: 'portrait' };
  const landscape = { label: base.label, w: base.h, h: base.w, orientation: 'landscape' };
  let paper = want === 'landscape' ? landscape : portrait;
  if (want === 'auto') {
    const a = fit(portrait, g, cut), b = fit(landscape, g, cut);
    paper = b.cols * b.rows > a.cols * a.rows ? landscape : portrait;
  }
  const { cols, rows, pitchX, pitchY, extra } = fit(paper, g, cut);
  const gridW = cols * pitchX + extra, gridH = rows * pitchY + extra;
  const x0 = (paper.w - gridW) / 2, y0 = (paper.h - gridH) / 2;   // the grid's outer art edge
  const b = g.bleed, slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const trimX = x0 + b + c * pitchX, trimY = y0 + b + r * pitchY;
    // src: the part of the card's bleed-box raster to place (card mm);
    // draw: where it lands on the sheet (sheet mm).
    let src;
    if (cut === 'shared') {
      const l = c === 0 ? b : 0, t = r === 0 ? b : 0, rr = c === cols - 1 ? b : 0, bb = r === rows - 1 ? b : 0;
      src = { x: b - l, y: b - t, w: g.w + l + rr, h: g.h + t + bb };
    } else src = { x: 0, y: 0, w: g.fullW, h: g.fullH };
    slots.push({ col: c, row: r, trimX, trimY, src, draw: { x: trimX - b + src.x, y: trimY - b + src.y, w: src.w, h: src.h } });
  }
  return { paper, cut, cols, rows, perSheet: cols * rows, x0, y0, gridW, gridH, slots, geom: g };
}

// Where the BACK of face slot i prints on a duplex back sheet. A long-edge
// flip mirrors across the axis parallel to the paper's long side (left-right
// on a portrait sheet, top-bottom on a landscape one); a short-edge flip the
// other way. The grid is centred, so the mirrored slot is another slot.
export function backSlotIndex(imp, i, flip = 'long') {
  const s = imp.slots[i];
  const mirrorX = (imp.paper.orientation === 'portrait') === (flip === 'long');
  const c = mirrorX ? imp.cols - 1 - s.col : s.col, r = mirrorX ? s.row : imp.rows - 1 - s.row;
  return r * imp.cols + c;
}

// The crop marks for a sheet: short lines continuing every trim line into the
// margin outside the grid. Each is [x1, y1, x2, y2] in mm.
export function trimLines(imp) {
  const g = imp.geom, xs = new Set(), ys = new Set();
  for (const s of imp.slots) { xs.add(+s.trimX.toFixed(6)); xs.add(+(s.trimX + g.w).toFixed(6)); ys.add(+s.trimY.toFixed(6)); ys.add(+(s.trimY + g.h).toFixed(6)); }
  return { xs: [...xs].sort((a, b) => a - b), ys: [...ys].sort((a, b) => a - b) };
}
export function cropMarks(imp) {
  const out = [];
  if (!imp.perSheet) return out;
  const top = imp.y0, bot = imp.y0 + imp.gridH, left = imp.x0, right = imp.x0 + imp.gridW;
  const { xs, ys } = trimLines(imp);
  for (const x of xs) {
    out.push([x, top - MARK_GAP, x, top - MARK_GAP - MARK_LEN]);
    out.push([x, bot + MARK_GAP, x, bot + MARK_GAP + MARK_LEN]);
  }
  for (const y of ys) {
    out.push([left - MARK_GAP, y, left - MARK_GAP - MARK_LEN, y]);
    out.push([right + MARK_GAP, y, right + MARK_GAP + MARK_LEN, y]);
  }
  return out;
}
