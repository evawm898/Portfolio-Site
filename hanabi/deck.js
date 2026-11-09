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
//   suit.centre         the CENTRE, per suit: how it is laid out (one burst, the
//                       rank as a count of bursts, or full bleed), which firework
//                       motif it draws, and an optional lower tier at ranks 4-5
// Phase 1's layouts A/B/C are exactly (large, single), (small, count) and
// (band, bleed); a version-1 file is read that way (LEGACY_LAYOUTS).

import { MOTIF_IDS, TIER_IDS } from './firework.js';

export const VERSION = 2;

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

export const INDEX_STYLES = {
  large: 'Large numeral + symbol',
  small: 'Small numeral + symbol',
  band:  'Coloured band, top and bottom',
};
export const CENTRE_LAYOUTS = {
  single: 'One burst in the middle',
  count:  'The rank as a count of bursts',
  bleed:  'Full-bleed burst',
};
// Phase 1's layouts, as the pair of choices each one was.
export const LEGACY_LAYOUTS = {
  A: { index: 'large', layout: 'single' },
  B: { index: 'small', layout: 'count' },
  C: { index: 'band',  layout: 'bleed' },
};
export const defaultCentre = () => ({ layout: 'single', motif: 'classic', tier: 'none' });
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
    { id: 'white',   name: 'White',   primary: '#EDEAE0', secondary: '#9FB4C8', symbol: 'crescent', centre: defaultCentre() },
    { id: 'red',     name: 'Red',     primary: '#E5484D', secondary: '#F5A97A', symbol: 'heart', centre: defaultCentre() },
    { id: 'blue',    name: 'Blue',    primary: '#3E8EF0', secondary: '#9BD3F7', symbol: 'drop', centre: defaultCentre() },
    { id: 'yellow',  name: 'Yellow',  primary: '#F2C230', secondary: '#FFF0A8', symbol: 'star', centre: defaultCentre() },
    { id: 'green',   name: 'Green',   primary: '#3DBA6B', secondary: '#B6E8A0', symbol: 'triangle', centre: defaultCentre() },
    { id: 'rainbow', name: 'Rainbow', primary: '#E8D9FF', secondary: '#FFB1E0', symbol: 'sparkle', multicolor: true, centre: defaultCentre() },
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
    // PHASE 2 SLOT. The firework builder writes per-card overrides here,
    // { [suitId]: { [rank]: partialSpec } }, merged over fireworkSpec()'s
    // default. Phase 1 never writes it, and saves/loads it verbatim.
    fireworks: {},
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
  // A version-1 file chose one layout for the whole deck; it becomes that
  // layout's corner index plus that layout's centre on every suit.
  const legacy = !(typeof raw.version === 'number' && raw.version >= 2) && LEGACY_LAYOUTS[raw.layout]
    ? LEGACY_LAYOUTS[raw.layout] : null;
  if (legacy) notes.push(`version-1 layout ${raw.layout} read as the ${legacy.index} corner index with a ${legacy.layout} centre on every suit`);
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
      if (legacy) s.centre.layout = legacy.layout;
      else if (r.centre && typeof r.centre === 'object') {
        const c = r.centre;
        s.centre.layout = pick(c.layout, Object.keys(CENTRE_LAYOUTS), s.centre.layout);
        if (MOTIF_IDS.includes(c.motif)) s.centre.motif = c.motif;
        else notes.push(`suit ${s.id}: unknown firework "${c.motif}" — classic kept`);
        if (c.tier === undefined || TIER_IDS.includes(c.tier)) s.centre.tier = pick(c.tier, TIER_IDS, s.centre.tier);
        else notes.push(`suit ${s.id}: unknown second tier "${c.tier}" — none kept`);
      } else if (raw.version >= 2) notes.push(`suit ${s.id}: no centre — default kept`);
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
  if (raw.fireworks && typeof raw.fireworks === 'object') d.fireworks = JSON.parse(JSON.stringify(raw.fireworks));
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

// Set one suit's centre on every suit (the panel's "same for every suit").
export function copyCentreToAll(design, fromId) {
  const from = suitById(design, fromId);
  for (const s of design.suits) s.centre = { ...from.centre };
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
