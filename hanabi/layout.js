// hanabi/layout.js — card FACES, the back and the tokens, as SVG strings.
//
// One renderer for every surface: the preview inlines these strings, and the
// exports rasterise the very same strings at 300 dpi (hanabi/export.js), so
// what is on screen is what prints. Coordinates are millimetres with the
// origin at the BLEED corner (hanabi/deck.js cardGeom()).
//
// The centre art comes ONLY through hanabi/firework.js — fireworkSpec(),
// renderFirework() and renderTier(). Nothing here knows how a burst is drawn.

import { cardGeom, suitById } from './deck.js';
import { SYMBOLS, DIGITS, DIGIT_BOX, TOKEN_GLYPHS } from './symbols.js';
import { fireworkSpec, fireworkSpecAt, renderFirework, renderTier, defaultSpec, FIELD_MOTIFS } from './firework.js';
// Style 2's card-level helpers (version 8)
import { discsFirst, paperGrain } from './style2.js';

const f = (v) => +v.toFixed(3);

// ---- colour arithmetic (WCAG relative luminance) ----
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// The colour that separates `fg` from `bg` best: drawn as a halo round a mark
// whose own colour does not stand off the card on its own (a dark blue on a
// night-sky face). Chosen by contrast with the MARK, so the halo outlines it.
function haloFor(fg) {
  return contrast(fg, '#FFFFFF') > contrast(fg, '#05070A') ? '#FFFFFF' : '#05070A';
}
// Below this contrast against the card, a mark gets its halo.
export const HALO_BELOW = 3;

// The rainbow numeral's colours: every OTHER suit's primary, in hue order from
// red, leaving out the near-greys (white has no hue to place). So the rainbow
// is made of the deck's own colours and follows them when a suit is recoloured.
// Fewer than two hued suits: a fixed spectrum.
export const NUMERAL_FALLBACK = ['#E5484D', '#F2C230', '#3DBA6B', '#3E8EF0', '#8E5CF0'];
function hueSat(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const sat = mx === 0 ? 0 : d / mx;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: h * 60, sat };
}
export function numeralColours(design) {
  const cols = design.suits.filter((x) => !x.multicolor).map((x) => ({ c: x.primary, ...hueSat(x.primary) }))
    .filter((x) => x.sat >= 0.25)
    .sort((a, b) => ((a.hue + 30) % 360) - ((b.hue + 30) % 360))
    .map((x) => x.c);
  return cols.length >= 2 ? cols : NUMERAL_FALLBACK;
}
// A vertical gradient in a mark's own box (userSpaceOnUse, so a "1" with
// almost no width still gets it), red band at the top: the numeral's 60 x 100
// box over y0..y1, and the symbol's 100 x 100 box.
function indexGradient(id, cols, y0, y1) {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y0)}" x2="0" y2="${f(y1)}">`
    + cols.map((c, i) => `<stop offset="${f(i / (cols.length - 1))}" stop-color="${c}"/>`).join('') + '</linearGradient>';
}

// ---- primitives ----
function digit(rank, x, y, h, fill, halo, weight = 11) {
  const s = h / DIGIT_BOX.h, d = DIGITS[rank];
  const t = `translate(${f(x)} ${f(y)}) scale(${f(s)})`;
  const base = `fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const haloPath = halo ? `<path d="${d}" ${base} stroke="${halo}" stroke-width="${weight + 7}"/>` : '';
  return `<g transform="${t}">${haloPath}<path d="${d}" ${base} stroke="${fill}" stroke-width="${weight}"/></g>`;
}
function symbol(id, x, y, size, fill, halo) {
  const sym = SYMBOLS[id] || SYMBOLS.circle, s = size / 100;
  const rule = sym.evenodd ? ' fill-rule="evenodd"' : '';
  const stroke = halo ? ` stroke="${halo}" stroke-width="9" paint-order="stroke" stroke-linejoin="round"` : '';
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})"><path d="${sym.d}" fill="${fill}"${rule}${stroke}/></g>`;
}
function glyph(def, x, y, size, color, weight = 7) {
  const s = size / 100;
  const parts = [
    ...def.fills.map((d) => `<path d="${d}" fill="${color}"/>`),
    ...def.strokes.map((d) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"/>`),
  ];
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})">${parts.join('')}</g>`;
}

// The corner index: the numeral with the suit symbol beneath, drawn with its
// top-left at (0, 0). Returns { svg, w, h }.
// `numeral` = { fill, symFill, cols } paints the numeral and the symbol with a
// gradient each (url(#…)); their halo is decided by the colour that stands off
// the card worst.
// `ground` is the face colour, or (under the background) every colour the
// ground takes: a mark's contrast is its worst against any of them.
function cornerIndex(rank, suit, ground, digitH, plate = false, numeral = null) {
  const grounds = Array.isArray(ground) ? ground : [ground], faceBg = grounds[0];
  const cOf = (c) => Math.min(...grounds.map((b) => contrast(c, b)));
  const halo = cOf(suit.primary) < HALO_BELOW ? haloFor(suit.primary) : null;
  let numFill = suit.primary, symFill = suit.primary, numHalo = halo;
  if (numeral) {
    const worst = numeral.cols.reduce((a, c) => (cOf(c) < cOf(a) ? c : a));
    numFill = numeral.fill; symFill = numeral.symFill;
    numHalo = cOf(worst) < HALO_BELOW ? haloFor(worst) : null;
  }
  const dw = digitH * (DIGIT_BOX.w / DIGIT_BOX.h);
  const sym = digitH * 0.62;
  const w = Math.max(dw, sym);
  const h = digitH * 1.08 + sym, p = digitH * 0.16;
  const back = plate ? `<rect x="${f(-p)}" y="${f(-p)}" width="${f(w + 2 * p)}" height="${f(h + 2 * p)}" rx="${f(p)}" fill="${faceBg}" fill-opacity="0.85"/>` : '';
  const svg = back + digit(rank, (w - dw) / 2, 0, digitH, numFill, numHalo)
    + symbol(suit.symbol, (w - sym) / 2, digitH * 1.08, sym, symFill, numHalo);
  return { svg, w, h };
}

// Place the corner index according to the corner mode. Two corners read in a
// fan from either end; 'inverted' rotates the bottom one so the card reads
// the same held upside down; 'four' puts an index in every corner, which is
// what a hand fanned FACING OUT shows best whichever way it is held.
function placeCorners(idx, rect, g, mode) {
  const { x, y, w, h } = rect, cx = g.fullW / 2, cy = g.fullH / 2;
  const tl = `<g transform="translate(${f(x)} ${f(y)})">${idx.svg}</g>`;
  const tr = `<g transform="translate(${f(x + w - idx.w)} ${f(y)})">${idx.svg}</g>`;
  const inv = (s) => `<g transform="rotate(180 ${f(cx)} ${f(cy)})">${s}</g>`;
  if (mode === 'upright') return tl + `<g transform="translate(${f(x + w - idx.w)} ${f(y + h - idx.h)})">${idx.svg}</g>`;
  if (mode === 'four') return tl + tr + inv(tl) + inv(tr);
  return tl + inv(tl);
}

// opts.round (the PREVIEW only; never an export): the card as an object — its
// art clipped to the trim with rounded corners (ROUND_CORNER of the shorter
// side, 3.2 mm on a poker card) and a hairline round it. Under the guides the
// bleed is the point, so they win.
export const ROUND_CORNER = 0.05;
let roundSeq = 0;
function frame(g, inner, { guides, px, defs = '', round, idPrefix }) {
  const size = px ? ` width="${px.w}" height="${px.h}"` : '';
  if (round && !guides) {
    const t = g.trim, rx = f(Math.min(g.w, g.h) * ROUND_CORNER), id = `${idPrefix || `rc${++roundSeq}`}clip`;
    const rr = (extra) => `<rect x="${f(t.x)}" y="${f(t.y)}" width="${f(t.w)}" height="${f(t.h)}" rx="${rx}" ry="${rx}"${extra}/>`;
    defs += `<clipPath id="${id}">${rr('')}</clipPath>`;
    inner = `<g class="hb-round" clip-path="url(#${id})">${inner}</g>`
      + rr(` class="hb-edge" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="${f(Math.max(0.2, g.w * 0.004))}"`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(g.fullW)} ${f(g.fullH)}"${size} preserveAspectRatio="xMidYMid meet">`
    + (defs ? `<defs>${defs}</defs>` : '') + inner + (guides ? guideMarks(g) : '') + '</svg>';
}

// The card's edge in the ART (design.face.frame; it prints): a thin rounded line
// half the safe margin in from the trim (never nearer than 0.8 mm, clear of the
// knife's wander), or that line with a second inside it. In the suit's colour,
// over the art and the index.
// Under a white print border the frame is measured from the ART PANEL's edge
// (the same inset), so it stays on the art and clear of the index.
export function frameArt(design, suit, g) {
  const fr = design.face && design.face.frame;
  if (!fr || fr === 'none') return '';
  const t = g.border ? g.art : g.trim, inset = Math.max(0.8, g.safe * 0.5), sw = Math.max(0.25, g.w * 0.005);
  const corner = g.border ? g.artR : Math.min(g.w, g.h) * ROUND_CORNER;
  const rect = (d, w, op) => `<rect x="${f(t.x + d)}" y="${f(t.y + d)}" width="${f(t.w - 2 * d)}" height="${f(t.h - 2 * d)}" rx="${f(Math.max(0.5, corner - d))}" fill="none" stroke="${suit.primary}" stroke-opacity="${op}" stroke-width="${f(w)}"/>`;
  return `<g class="hb-frame">${rect(inset, sw, 0.75)}${fr === 'inner' ? rect(inset + sw * 3.2, sw * 0.6, 0.5) : ''}</g>`;
}

// Preview-only guides: the bleed shaded, the trim line dashed, the safe zone dotted.
function guideMarks(g) {
  const t = g.trim, s = g.safeRect, w = Math.max(0.15, g.w * 0.004);
  const shade = `M0 0 H${f(g.fullW)} V${f(g.fullH)} H0 Z M${f(t.x)} ${f(t.y)} V${f(t.y + t.h)} H${f(t.x + t.w)} V${f(t.y)} Z`;
  return `<g class="hb-guides" pointer-events="none">`
    + `<path d="${shade}" fill="#FF4FA3" fill-opacity="0.22" fill-rule="evenodd"/>`
    + `<rect x="${f(t.x)}" y="${f(t.y)}" width="${f(t.w)}" height="${f(t.h)}" fill="none" stroke="#FFFFFF" stroke-width="${f(w)}" stroke-dasharray="${f(w * 6)} ${f(w * 4)}"/>`
    + `<rect x="${f(s.x)}" y="${f(s.y)}" width="${f(s.w)}" height="${f(s.h)}" fill="none" stroke="#2FA3A3" stroke-width="${f(w)}" stroke-dasharray="${f(w)} ${f(w * 3)}"/>`
    + '</g>';
}

// ---- the face: a CORNER INDEX (one style for the deck) and a CENTRE (per suit) ----
//
// The index decides where the centre may draw: 'large' and 'small' sit in the
// safe rect's corners and leave the centre the whole safe rect to share;
// 'band' takes a strip at top and bottom and gives the centre what is between.
// Phase 1's layouts A/B/C are (large, scale), (small, column), (band, bleed),
// and each pair draws exactly the markup phase 1 drew.

export const INDEX_DIGIT = { large: 0.13, small: 0.095 };   // numeral height, fraction of card height

// returns { svg, defs, area, corner: { w, h } }
function indexArt(design, suit, rank, g, idPrefix, plate) {
  const s = g.safeRect;
  if (design.index !== 'band') {
    // A rainbow index (numeral and symbol) is a corner-index option: on a band
    // the band itself is the rainbow and the index is drawn in ink on it.
    let numeral = null, defs = '';
    if (suit.multicolor && suit.numeral === 'rainbow') {
      const cols = numeralColours(design), id = `${idPrefix}num`, sid = `${idPrefix}sym`;
      defs = indexGradient(id, cols, DIGIT_BOX.h * 0.08, DIGIT_BOX.h * 0.92) + indexGradient(sid, cols, 2, 98);
      numeral = { fill: `url(#${id})`, symFill: `url(#${sid})`, cols };
    }
    const idx = cornerIndex(rank, suit, groundColours(design), g.h * (INDEX_DIGIT[design.index] || INDEX_DIGIT.large), plate, numeral);
    return { svg: `<g class="hb-index">${placeCorners(idx, s, g, design.corners)}</g>`, defs, area: s, corner: { w: idx.w, h: idx.h } };
  }
  // the band runs across the art panel (the bleed box with no border) from its top
  const A = g.art, bandH = s.y - A.y + g.h * 0.13;
  const dH = g.h * 0.105;
  let defs = '', bandFill = suit.primary;
  if (suit.multicolor) {
    const cols = design.suits.filter((x) => !x.multicolor).map((x) => x.primary);
    const id = `${idPrefix}band`;
    defs = `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">`
      + cols.map((c, i) => `<stop offset="${f(i / (cols.length - 1))}" stop-color="${c}"/>`).join('') + '</linearGradient>';
    bandFill = `url(#${id})`;
  }
  const ink = contrast(suit.primary, design.face.bg) >= contrast(suit.primary, '#FFFFFF') ? design.face.bg : '#FFFFFF';
  const dw = dH * DIGIT_BOX.w / DIGIT_BOX.h, sym = dH * 0.82;
  // Band content (numeral, then symbol) with its top at y. 'four' puts the
  // numeral at the left end and the symbol at the right end, so either end
  // of the band reads in a fan.
  const content = (y) => (design.corners === 'four'
    ? digit(rank, s.x, y, dH, ink, null, 12) + digit(rank, s.x + s.w - dw, y, dH, ink, null, 12)
      + symbol(suit.symbol, g.fullW / 2 - sym / 2, y + (dH - sym) / 2, sym, ink, null)
    : digit(rank, s.x, y, dH, ink, null, 12) + symbol(suit.symbol, s.x + dw + dH * 0.3, y + (dH - sym) / 2, sym, ink, null));
  const rule = g.h * 0.006;
  const yD = bandH - g.h * 0.03 - dH;   // below the band's top
  const band = `<rect x="${f(A.x)}" y="${f(A.y)}" width="${f(A.w)}" height="${f(bandH)}" fill="${bandFill}"/>`
    + `<rect x="${f(A.x)}" y="${f(A.y + bandH)}" width="${f(A.w)}" height="${f(rule)}" fill="${ink}" fill-opacity="0.6"/>` + content(A.y + yD);
  const cx = g.fullW / 2, cy = g.fullH / 2;
  const bottom = design.corners === 'upright'
    ? `<rect x="${f(A.x)}" y="${f(A.y + A.h - bandH)}" width="${f(A.w)}" height="${f(bandH)}" fill="${bandFill}"/>`
      + `<rect x="${f(A.x)}" y="${f(A.y + A.h - bandH - rule)}" width="${f(A.w)}" height="${f(rule)}" fill="${ink}" fill-opacity="0.6"/>`
      + content(A.y + A.h - yD - dH)
    : `<g transform="rotate(180 ${f(cx)} ${f(cy)})">${band}</g>`;
  const top = A.y + bandH + rule;
  return { svg: `<g class="hb-index">${band + bottom}</g>`, defs, area: { x: s.x, y: top, w: s.w, h: g.fullH - 2 * top }, corner: { w: 0, h: 0 } };
}

// The free centre a field fills: the area less the corner-index columns.
export function fieldArea(area, corner) {
  const gap = Math.max(0.8, area.h * 0.015), side = corner.w ? corner.w + gap : gap;
  return { x: area.x + side, y: area.y + gap, w: area.w - 2 * side, h: area.h - 2 * gap };
}

// The rect a lower tier fills, under a burst lifted to make room for it.
export function tierLayout(area, corner) {
  const r = Math.min(area.w * 0.4, area.h * 0.27);
  const cy = area.y + area.h * 0.36;
  const gap = Math.max(0.8, area.h * 0.015);
  const x0 = area.x + corner.w + gap, x1 = area.x + area.w - corner.w - gap;
  const y0 = cy + r + gap, y1 = area.y + area.h - gap;
  return { burst: { cy, r }, rect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

// ---- Count: the rank as N fireworks, laid out like pips ----
//
// An arrangement is one { x, y, s, rot } per firework: x and y fractions of
// the centre FIELD (the area less the corner-index columns, fieldArea()), s a
// radius as a fraction of half the field's shorter side, rot degrees added to
// the firework's own rotation. Sizes vary within a card on purpose, and
// neighbours may overlap. The same fractions serve every card size: a
// firework is held inside the field (its radius never reaches past an edge),
// so no preset puts one on the corner index.
export const DEFAULT_PIPS = {
  1: [{ x: 0.5, y: 0.5, s: 0.98, rot: 0 }],
  2: [{ x: 0.42, y: 0.27, s: 0.8, rot: 0 }, { x: 0.58, y: 0.73, s: 0.68, rot: 0 }],
  3: [{ x: 0.36, y: 0.2, s: 0.6, rot: 0 }, { x: 0.58, y: 0.5, s: 0.74, rot: 0 }, { x: 0.38, y: 0.8, s: 0.56, rot: 0 }],
  4: [{ x: 0.5, y: 0.15, s: 0.52, rot: 0 }, { x: 0.27, y: 0.42, s: 0.56, rot: 0 }, { x: 0.73, y: 0.58, s: 0.56, rot: 0 }, { x: 0.5, y: 0.85, s: 0.5, rot: 0 }],
  5: [{ x: 0.27, y: 0.17, s: 0.46, rot: 0 }, { x: 0.73, y: 0.17, s: 0.42, rot: 0 }, { x: 0.5, y: 0.5, s: 0.62, rot: 0 }, { x: 0.27, y: 0.83, s: 0.42, rot: 0 }, { x: 0.73, y: 0.83, s: 0.46, rot: 0 }],
};
// The arrangement a cell draws: its own, else its rank column's, else the pips.
export function cellItems(design, suitId, rank) { return cellArrangement(design, suitId, rank).items; }
// ... and whether it is the default pips. The pips are FITTED to the field (a
// pip near an edge is drawn smaller rather than run past it); an arrangement
// made by hand is taken literally — the size it says, wherever it is.
export function cellArrangement(design, suitId, rank) {
  const o = design.fireworks && design.fireworks[suitId] && design.fireworks[suitId][rank];
  if (o && Array.isArray(o.items) && o.items.length === rank) return { items: o.items, fitted: false };
  const col = design.arrangements && design.arrangements[rank];
  if (Array.isArray(col) && col.length === rank) return { items: col, fitted: false };
  return { items: (design.pips === 'grid' ? GRID_PIPS : DEFAULT_PIPS)[rank], fitted: true };
}
// THE CORNER GRID (design.pips 'grid', version 6). Every face shares one grid:
// the safe zone, with the four corner-index boxes reserved whatever the corner
// mode (so the art never moves when the corners change), and one gap. A default
// pip is fitted to it — held inside the safe zone less the gap and clear of
// every index box by the gap — instead of to the field between the index
// columns, so ranks 1 and 2 use the room between the indices (rank 1 on a poker
// card: a 57 mm burst where the field fit drew 40 mm). Ranks 3-5 are the field's
// pips; their sizes keep them as they were. null: the field fit (before v6).
export const GRID_PIPS = {
  ...DEFAULT_PIPS,
  1: [{ x: 0.5, y: 0.5, s: 1.5, rot: 0 }],
  2: [{ x: 0.44, y: 0.27, s: 1.1, rot: 0 }, { x: 0.56, y: 0.73, s: 0.95, rot: 0 }],
};
export function pipGrid(design, ix) {
  if (design.pips !== 'grid') return null;
  const a = ix.area, k = ix.corner, gap = Math.max(0.8, a.h * 0.015);
  const boxes = k.w ? [[a.x, a.y], [a.x + a.w - k.w, a.y], [a.x, a.y + a.h - k.h], [a.x + a.w - k.w, a.y + a.h - k.h]]
    .map(([x, y]) => ({ x, y, w: k.w, h: k.h })) : [];
  return { area: a, boxes, gap };
}
// The room a fitted pip at (cx, cy) has on the grid.
export function gridRoom(grid, cx, cy) {
  const a = grid.area;
  let room = Math.min(cx - a.x, a.x + a.w - cx, cy - a.y, a.y + a.h - cy);
  for (const b of grid.boxes) room = Math.min(room, Math.hypot(Math.max(b.x - cx, 0, cx - b.x - b.w), Math.max(b.y - cy, 0, cy - b.y - b.h)));
  return room - grid.gap;
}
// Where each firework of a Count cell lands, in card mm: { field, unit,
// items: [{ cx, cy, r, rot }] }. r is the asked radius held inside the field.
// fitted (the default pips): a firework's radius is held inside the field.
// Otherwise (an arrangement made by hand) it keeps the size it was given wherever
// it is put: toward an edge it may run past the field — under the index, which
// is drawn over it — and the card's own edge clips it. n is the firework it is
// (its drawing's seed): its slot when the item does not say.
export function countPlacement(field, items, fitted = true, grid = null) {
  const unit = Math.min(field.w, field.h) / 2;
  return { field, unit, fitted, items: items.map((it, i) => {
    const cx = field.x + it.x * field.w, cy = field.y + it.y * field.h;
    const room = Math.max(0.5, grid ? gridRoom(grid, cx, cy) : Math.min(cx - field.x, field.x + field.w - cx, cy - field.y, field.y + field.h - cy));
    return { cx, cy, r: fitted ? Math.min(it.s * unit, room) : it.s * unit, rot: it.rot || 0, n: Number.isInteger(it.n) ? it.n : i };
  }) };
}
// An arrangement as it is DRAWN, written out literally: the fitted pips with the
// radius they are drawn at, so a hand edit starting from them moves nothing else.
export function literalItems(pl) {
  return pl.items.map((it) => ({ x: (it.cx - pl.field.x) / pl.field.w, y: (it.cy - pl.field.y) / pl.field.h, s: it.r / pl.unit, rot: it.rot, n: it.n }));
}
// A phase-1 radial burst reaches past r by its outer stars and sparks (about
// 13%); the catalogue and the types stay within r.
const REACH = (spec) => (!spec.motif || spec.motif === 'classic' || spec.motif.startsWith('radial-') ? 1.14 : 1);

export function placementFor(design, suit, rank) {
  const g = cardGeom(design);
  const ix = indexArt(design, suit, rank, g, 'pl', false);
  const ar = cellArrangement(design, suit.id, rank);
  return countPlacement(fieldArea(ix.area, ix.corner), ar.items, ar.fitted, pipGrid(design, ix));
}

// A Count card's fireworks as drawn, one string each in stacking order. Each is
// its own spec (fireworkSpecAt: the card's, unless that firework carries a
// style of its own), seeded by n, the firework it is.
function countArt(design, suit, rank, pl, bursts = null) {
  return pl.items.map((it) => {
    const spec = fireworkSpecAt(design, suit, rank, it.n), reach = REACH(spec);
    if (bursts) bursts.push(burstOf(spec, suit, it.cx, it.cy, it.r / reach));
    return renderFirework({ ...spec, seed: spec.seed + it.n * 7919, rotation: (+spec.rotation || 0) + it.rot },
      { cx: it.cx, cy: it.cy, r: it.r / reach });
  });
}

// Where a firework is drawn, for the background's glows and its lit smoke: its
// centre, the radius it reaches (its box times its size) and its colour (the
// suit's, or the firework's own outer colour where a style or card sets one).
function burstOf(spec, suit, cx, cy, r) {
  return { cx, cy, R: r * Math.max(0.05, Math.min(1, +spec.size || 1)), color: spec.outerColor || suit.primary };
}
// bursts: an array the centre's fireworks are reported into (the background reads it)
function centreArt(design, suit, rank, g, ix, bursts = null) {
  const push = (sp, cx, cy, r) => { if (bursts) bursts.push(burstOf(sp, suit, cx, cy, r)); };
  const compose = (suit.centre && suit.centre.compose) || 'scale';
  const spec = fireworkSpec(design, suit, rank);
  const cx = g.fullW / 2, cy = g.fullH / 2, a = ix.area, k = ix.corner;
  if (compose === 'bleed') {
    // Full bleed: the burst is sized to the card's half-diagonal and runs off
    // every edge; the svg viewport clips it at the bleed line. A field fills
    // the trim, so no piece is cut in half by the knife.
    // Under a white border the art panel stands in for the bleed box (and the
    // art clip, not the viewport, cuts the burst).
    const A = g.art, r = Math.hypot(A.w, A.h) / 2 * 0.98;
    push(spec, cx, cy, r);
    return renderFirework(spec, { cx, cy, r, rect: g.border ? A : g.trim });
  }
  if (compose === 'column') {
    // phase 1's 'count': the rank as a stack, always sized for five
    const one = { ...spec, size: 1, trail: false };
    const slot = a.h / 5;
    const r = Math.min(slot * 0.46, (a.w - 2 * k.w) * 0.42);
    const top = cy - (rank * slot) / 2;
    const art = [];
    for (let i = 0; i < rank; i++) { push(one, cx, top + slot * (i + 0.5), r); art.push(renderFirework({ ...one, seed: one.seed + i * 7919 }, { cx, cy: top + slot * (i + 0.5), r })); }
    return discsFirst(art);
  }
  if (compose === 'count' || compose === 'countscale') {
    const ar = cellArrangement(design, suit.id, rank);
    return discsFirst(countArt(design, suit, rank, countPlacement(fieldArea(a, k), ar.items, ar.fitted, pipGrid(design, ix)), bursts));
  }
  const sp = scaleBurst(design, suit, rank, g, ix, spec);
  const p = sp.place;
  // a firework placed by hand: its own centre, radius and turn (a field motif
  // fills its rect and is never placed)
  const at = p ? { cx: p.cx, cy: p.cy, r: p.r } : sp.base;
  const s2 = p && p.rot ? { ...spec, rotation: (+spec.rotation || 0) + p.rot } : spec;
  push(spec, at.cx, at.cy, at.r);
  if (spec.tier) return renderFirework(s2, at) + renderTier(spec, sp.tierRect);
  return renderFirework(s2, { ...at, rect: sp.field });
}

// Scale's one firework: where it sits by default, and where the card's own
// placement (design.fireworks[suit][rank].place) puts it. The default is the
// expression Scale has always used, so an unplaced card draws its old markup.
function scaleBurst(design, suit, rank, g, ix, spec) {
  const a = ix.area, k = ix.corner, field = fieldArea(a, k);
  let base, tierRect = null;
  if (spec.tier) { const t = tierLayout(a, k); base = { cx: g.fullW / 2, cy: t.burst.cy, r: t.burst.r }; tierRect = t.rect; }
  else {
    const r = design.index === 'band'
      ? Math.min(a.w * 0.46, a.h * 0.46)
      : Math.min(a.w * 0.46, (a.h - 2 * k.h) * 0.5 + k.h * 0.35, a.h * 0.4);
    base = { cx: g.fullW / 2, cy: design.index === 'band' ? a.y + a.h / 2 : g.fullH / 2, r };
  }
  const o = design.fireworks && design.fireworks[suit.id] && design.fireworks[suit.id][rank];
  const pl = o && o.place && !FIELD_MOTIFS.includes(spec.motif) ? o.place : null;
  const place = pl ? { cx: field.x + pl.x * field.w, cy: field.y + pl.y * field.h, r: base.r * pl.s, rot: pl.rot || 0 } : null;
  return { field, base, place, tierRect, placeable: !FIELD_MOTIFS.includes(spec.motif) };
}
// The editor's view of a Scale card: the field, the default burst and the one
// item (where it is now), with `unit` the default radius, so s = r / unit.
// null where the firework cannot be placed (a field motif).
export function scalePlacement(design, suit, rank) {
  const g = cardGeom(design), ix = indexArt(design, suit, rank, g, 'pl', false);
  const sp = scaleBurst(design, suit, rank, g, ix, fireworkSpec(design, suit, rank));
  if (!sp.placeable) return null;
  const at = sp.place || { ...sp.base, rot: 0 };
  return { field: sp.field, unit: sp.base.r, base: sp.base, items: [{ cx: at.cx, cy: at.cy, r: at.r, rot: at.rot || 0, n: 0 }] };
}

// ---- optical centring ----
//
// What a firework DRAWS is not centred on its anchor: a willow's trails hang
// below it, a palm's fronds curve to one side, a rotated burst leans. So the
// card is centred on its drawn EXTENT — the box round every mark as rendered
// (circles with their radius, lines and curves with half their stroke, a
// rotate() on a firework's group applied) — and the extent is centred in the
// card's art field (fieldArea: the area less the corner-index columns). Paths
// are absolute M/L/Q/C/Z by the renderers' contract; anything else throws.
const CURVE_SAMPLES = 24;
export function drawnExtent(svg) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const grp of svg.split('<g class="hb-firework"').slice(1)) {
    const tm = /^[^>]*transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)"/.exec(grp);
    const a = tm ? (+tm[1] * Math.PI) / 180 : 0, ox = tm ? +tm[2] : 0, oy = tm ? +tm[3] : 0, cs = Math.cos(a), sn = Math.sin(a);
    const add = (x, y, pad) => {
      if (a) { const dx = x - ox, dy = y - oy; x = ox + dx * cs - dy * sn; y = oy + dx * sn + dy * cs; }
      x0 = Math.min(x0, x - pad); y0 = Math.min(y0, y - pad); x1 = Math.max(x1, x + pad); y1 = Math.max(y1, y + pad);
    };
    const body = grp.slice(0, grp.indexOf('</g>') < 0 ? grp.length : grp.indexOf('</g>'));
    for (const m of body.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)) add(+m[1], +m[2], +m[3]);
    for (const m of body.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-width="([\d.]+)"/g)) { add(+m[1], +m[2], +m[5] / 2); add(+m[3], +m[4], +m[5] / 2); }
    for (const m of body.matchAll(/<path d="([^"]+)"([^>]*)>/g)) {
      const sw = /stroke-width="([\d.]+)"/.exec(m[2]), pad = sw ? +sw[1] / 2 : 0;
      let cur = null, start = null;
      for (const seg of m[1].match(/[A-Za-z][^A-Za-z]*/g)) {
        const c = seg[0], n = (seg.slice(1).match(/-?[\d.]+/g) || []).map(Number);
        if (!'MLQCZ'.includes(c)) throw new Error(`drawnExtent: a path command it cannot read (${c})`);
        if (c === 'M' || c === 'L') { for (let i = 0; i < n.length; i += 2) { cur = [n[i], n[i + 1]]; if (c === 'M' && i === 0) start = cur; add(cur[0], cur[1], pad); } }
        else if (c === 'Z') cur = start;
        else {
          const ctrl = [cur]; for (let i = 0; i < n.length; i += 2) ctrl.push([n[i], n[i + 1]]);
          for (let k = 1; k <= CURVE_SAMPLES; k++) {
            const t = k / CURVE_SAMPLES; let q = ctrl.map((p) => p.slice());
            while (q.length > 1) q = q.slice(1).map((p, i) => [q[i][0] + (p[0] - q[i][0]) * t, q[i][1] + (p[1] - q[i][1]) * t]);
            add(q[0][0], q[0][1], pad);
          }
          cur = ctrl[ctrl.length - 1];
        }
      }
    }
  }
  return x0 <= x1 ? { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } : null;
}

// The arrangement that centres a card's drawn fireworks in its art field, as a
// normal per-card value the page writes into the cell (so Reset undoes it and
// the Across / Down sliders show it):
//   Count, Count + scale  { kind: 'items', items } — the whole group moved as
//                         one, so the fireworks keep their places to each other
//   Scale                 { kind: 'place', place } — its one firework moved
// with { dx, dy } the shift in mm and `clamped` when a firework's anchor had to
// stop at the field's edge (the result is then as near centred as it can go).
// null where the composition lays itself out (Column, Full bleed, a field
// motif) or a second tier sits under the burst.
export function centring(design, suit, rank) {
  const compose = (suit.centre && suit.centre.compose) || 'scale';
  const g = cardGeom(design), ix = indexArt(design, suit, rank, g, 'pl', false);
  const field = fieldArea(ix.area, ix.corner);
  const fx = field.x + field.w / 2, fy = field.y + field.h / 2;
  const cl = (v) => Math.min(1, Math.max(0, v));
  if (compose === 'count' || compose === 'countscale') {
    const ar = cellArrangement(design, suit.id, rank), pl = countPlacement(field, ar.items, ar.fitted, pipGrid(design, ix));
    const e = drawnExtent(countArt(design, suit, rank, pl).join(''));
    if (!e) return null;
    const dx = fx - e.cx, dy = fy - e.cy;
    const raw = literalItems(pl).map((it) => ({ ...it, x: it.x + dx / field.w, y: it.y + dy / field.h }));
    const items = raw.map((it) => ({ ...it, x: cl(it.x), y: cl(it.y) }));
    return { kind: 'items', items, dx, dy, field, clamped: raw.some((it, i) => it.x !== items[i].x || it.y !== items[i].y) };
  }
  if (compose !== 'scale') return null;
  const spec = fireworkSpec(design, suit, rank);
  if (spec.tier) return null;
  const sp = scaleBurst(design, suit, rank, g, ix, spec);
  if (!sp.placeable) return null;
  const at = sp.place || { ...sp.base, rot: 0 };
  const s2 = at.rot ? { ...spec, rotation: (+spec.rotation || 0) + at.rot } : spec;
  const e = drawnExtent(renderFirework(s2, { cx: at.cx, cy: at.cy, r: at.r, rect: sp.field }));
  if (!e) return null;
  const dx = fx - e.cx, dy = fy - e.cy, F = sp.field;
  const raw = { x: (at.cx + dx - F.x) / F.w, y: (at.cy + dy - F.y) / F.h };
  const own = design.fireworks && design.fireworks[suit.id] && design.fireworks[suit.id][rank];
  const place = { x: cl(raw.x), y: cl(raw.y), s: own && own.place ? own.place.s : 1, rot: at.rot || 0 };
  return { kind: 'place', place, dx, dy, field, clamped: place.x !== raw.x || place.y !== raw.y };
}

// ---- the scene band: a silhouette along the bottom, behind the fireworks ----
// Deterministic (a fixed seed per kind), drawn from the bleed's left edge to
// its right and up to `height` of the card, closed along the bleed bottom.
export function sceneArt(design, g) {
  const sc = design.scene;
  if (!sc || !sc.on) return '';
  // in the art panel's own coordinates (the bleed box with no border), placed at its corner
  const A = g.art, H = A.h * sc.height, base = A.h, W = A.w;
  let st = sc.kind === 'rooftops' ? 7 : 3;
  const rand = () => { st = (Math.imul(st, 1103515245) + 12345) >>> 0; return st / 4294967296; };
  const pts = [[0, base]];
  if (sc.kind === 'rooftops') {
    let x = 0;
    while (x < W) {
      const bw = W * (0.1 + rand() * 0.12), h = H * (0.45 + rand() * 0.5), roof = rand();
      const x1 = Math.min(W, x + bw);
      pts.push([x, base - h]);
      if (roof < 0.45) pts.push([(x + x1) / 2, base - h - H * 0.16]);
      else if (roof < 0.6) pts.push([x + bw * 0.2, base - h], [x + bw * 0.2, base - h - H * 0.12], [x + bw * 0.32, base - h - H * 0.12], [x + bw * 0.32, base - h]);
      pts.push([x1, base - h]);
      x = x1;
    }
  } else {
    // pines: triangles of varied height along a low ridge
    let x = -W * 0.04;
    pts.push([0, base - H * 0.3]);
    while (x < W) {
      const tw = W * (0.07 + rand() * 0.07), h = H * (0.5 + rand() * 0.5);
      pts.push([x, base - H * 0.3], [x + tw * 0.5, base - h], [x + tw, base - H * 0.3]);
      x += tw * (0.6 + rand() * 0.3);
    }
    pts.push([W, base - H * 0.3]);
  }
  pts.push([W, base]);
  const cl = pts.map(([x, y]) => [Math.min(W, Math.max(0, x)), Math.max(base - H, y)]);
  return `<path class="hb-scene" d="M${cl.map(([x, y]) => `${f(x + A.x)} ${f(y + A.y)}`).join(' L')} Z" fill="${sc.color}"/>`;
}

// ---- the face background (version 7): sky, horizon glow, burst glows, smoke ----
//
// Deck-wide (design.background). OFF: the flat face colour, the markup it always
// was. ON, in the art panel, under the fireworks:
//   sky      a vertical gradient, top -> bottom (sky.on; else the face colour)
//   horizon  over the bottom 40%, transparent above to the bottom colour mixed 55%
//            toward HORIZON_TINT at the edge, at 0.45 x horizon
//   glows    behind every firework a radial gradient of its colour, 1.7 x its radius,
//            at 0.42 x glow in the centre, fading to nothing
//   smoke    SMOKE_PUFFS soft radial puffs, 5-20 mm at poker size (scaled by the
//            card's shorter side), placed by a seeded generator over the art panel
//            (8% kept clear top and bottom); alpha (0.05-0.12) x amount x 1.6 x the
//            rank factor; drift stretches them across. "Builds with rank": the rank
//            factor runs 0.35 -> 1 over ranks 1-5 and only the first 40% -> 100% of
//            the puffs are drawn, so the same puffs thicken through a suit. "Lit":
//            each puff's colour moves toward the nearest firework's colour (a touch
//            of white in it) by up to 75%, full at its centre, none past 1.8 x its radius.
// The seed is the design's (smoke.seed), so preview, board and export are one haze.
export const SMOKE_PUFFS = 42;
export const HORIZON_TINT = '#8F96C0';
export const GLOW_REACH = 1.7, LIT_REACH = 1.8;
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
export function mixHex(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return hexOf(A.map((v, i) => v + (B[i] - v) * t)); }
const puffCache = new Map();
// The deck's puffs in card mm: { x, y, r, a } (a the 0.05-0.12 draw), in their fixed order.
export function smokePuffs(design, g) {
  const sm = design.background.smoke, A = g.art, k = Math.min(g.w, g.h) / 63.5;
  const key = `${sm.seed}|${A.x}|${A.y}|${A.w}|${A.h}|${k}`;
  if (puffCache.has(key)) return puffCache.get(key);
  let st = sm.seed >>> 0;
  const rand = () => { st = (Math.imul(st, 1103515245) + 12345) >>> 0; return st / 4294967296; };
  const out = [];
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const x = A.x + rand() * A.w, y = A.y + A.h * (0.08 + 0.84 * rand()), r = (5 + 15 * rand()) * k, a = 0.05 + 0.07 * rand();
    out.push({ x, y, r, a });
  }
  puffCache.set(key, out);
  if (puffCache.size > 64) puffCache.delete(puffCache.keys().next().value);
  return out;
}
// The rank's share of the puffs and their strength.
export function smokeRank(design, rank) {
  const t = design.background.smoke.rank && rank ? (rank - 1) / 4 : 1;
  return { n: Math.round(SMOKE_PUFFS * (0.4 + 0.6 * t)), factor: design.background.smoke.rank && rank ? 0.35 + 0.65 * t : 1 };
}
// The colours the face's ground takes (the index's halo is decided against the worst).
export function groundColours(design) {
  const b = design.background;
  if (!b || !b.on) return [design.face.bg];
  const top = b.sky.on ? b.sky.top : design.face.bg, bottom = b.sky.on ? b.sky.bottom : design.face.bg;
  return [top, bottom, b.horizon > 0 ? mixHex(bottom, mixHex(bottom, HORIZON_TINT, 0.55), 0.45 * b.horizon) : bottom];
}
// returns { ground, fx, defs }: the ground (+ horizon) under the scene band, and the
// glows + smoke over it, under the fireworks. rank null: a face with no rank (a token).
export function backgroundArt(design, g, bursts, rank, p) {
  const b = design.background, A = g.art;
  const rr = g.artR ? ` rx="${f(g.artR)}" ry="${f(g.artR)}"` : '';
  const rect = (fill, extra = '') => `<rect x="${f(A.x)}" y="${f(A.y)}" width="${f(A.w)}" height="${f(A.h)}"${rr} fill="${fill}"${extra}/>`;
  if (!b || !b.on) return { ground: rect(design.face.bg), fx: '', defs: '' };
  let defs = '', ground;
  const bottom = b.sky.on ? b.sky.bottom : design.face.bg;
  if (b.sky.on) {
    defs += `<linearGradient id="${p}sky" gradientUnits="userSpaceOnUse" x1="0" y1="${f(A.y)}" x2="0" y2="${f(A.y + A.h)}"><stop offset="0" stop-color="${b.sky.top}"/><stop offset="1" stop-color="${b.sky.bottom}"/></linearGradient>`;
    ground = rect(`url(#${p}sky)`);
  } else ground = rect(design.face.bg);
  if (b.horizon > 0) {
    const hc = mixHex(bottom, HORIZON_TINT, 0.55), y0 = A.y + A.h * 0.6;
    defs += `<linearGradient id="${p}hz" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y0)}" x2="0" y2="${f(A.y + A.h)}"><stop offset="0" stop-color="${hc}" stop-opacity="0"/><stop offset="1" stop-color="${hc}" stop-opacity="${f(0.45 * b.horizon)}"/></linearGradient>`;
    ground += `<rect class="hb-horizon" x="${f(A.x)}" y="${f(y0)}" width="${f(A.w)}" height="${f(A.h * 0.4)}" fill="url(#${p}hz)"/>`;
  }
  // the paper grain (version 8): a faint speckle over the ground, the deck's own
  if (b.grain > 0) ground += paperGrain(b.grain, A, b.smoke.seed);
  const grads = new Set();
  const grad = (kind, c, stops) => {
    const id = `${p}${kind}${c.slice(1)}`;
    if (!grads.has(id)) { grads.add(id); defs += `<radialGradient id="${id}">${stops.map(([o, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('')}</radialGradient>`; }
    return id;
  };
  let fx = '';
  if (b.glow > 0) for (const q of bursts) {
    const id = grad('gl', q.color, [[0, 1], [1, 0]]);
    fx += `<circle class="hb-glow" cx="${f(q.cx)}" cy="${f(q.cy)}" r="${f(q.R * GLOW_REACH)}" fill="url(#${id})" fill-opacity="${f(0.42 * b.glow)}"/>`;
  }
  const sm = b.smoke;
  if (sm.amount > 0) {
    const { n, factor } = smokeRank(design, rank);
    const puffs = smokePuffs(design, g).slice(0, n);
    let haze = '';
    for (const pf of puffs) {
      const alpha = Math.min(1, pf.a * sm.amount * 1.6 * factor);
      let col = sm.color;
      if (sm.lit > 0 && bursts.length) {
        let best = 0, bc = null;
        for (const q of bursts) { const pr = 1 - Math.hypot(pf.x - q.cx, pf.y - q.cy) / (LIT_REACH * q.R); if (pr > best) { best = pr; bc = q.color; } }
        if (bc) col = mixHex(sm.color, mixHex(bc, '#FFFFFF', 0.15), 0.75 * best * sm.lit);
      }
      const id = grad('pf', col, [[0, 1], [0.55, 0.5], [1, 0]]);
      haze += `<ellipse cx="${f(pf.x)}" cy="${f(pf.y)}" rx="${f(pf.r * sm.drift)}" ry="${f(pf.r)}" fill="url(#${id})" fill-opacity="${+alpha.toFixed(4)}"/>`;
    }
    if (haze) fx += `<g class="hb-smoke">${haze}</g>`;
  }
  return { ground, fx, defs };
}
// The white print border: the bleed box white (unprinted), and everything else
// clipped to the art panel. No border: the markup as it was.
function artPanel(g, inner, p) {
  if (!g.border) return { inner, defs: '' };
  const A = g.art, rr = f(g.artR);
  return {
    inner: `<rect class="hb-border" x="0" y="0" width="${f(g.fullW)}" height="${f(g.fullH)}" fill="#FFFFFF"/><g clip-path="url(#${p}art)">${inner}</g>`,
    defs: `<clipPath id="${p}art"><rect x="${f(A.x)}" y="${f(A.y)}" width="${f(A.w)}" height="${f(A.h)}" rx="${rr}" ry="${rr}"/></clipPath>`,
  };
}

// ---- public renderers ----

// card = { kind: 'card', suitId, rank } | { kind: 'clue' } | { kind: 'fuse' }
// opts = { guides, px: {w,h}, idPrefix }
export function renderFace(design, card, opts = {}) {
  if (card.kind === 'clue' || card.kind === 'fuse') return renderToken(design, card.kind, opts);
  const g = cardGeom(design);
  const suit = suitById(design, card.suitId);
  const idPrefix = opts.idPrefix || `hb${card.suitId}${card.rank}`;
  // A full-bleed centre runs under a corner index, so the index sits on a
  // plate of the face colour; a band index carries its own ground.
  const plate = suit.centre && suit.centre.compose === 'bleed';
  const ix = indexArt(design, suit, card.rank, g, idPrefix, plate);
  // opts.centreOnly: the board's thumbnails — the card's ground, scene and
  // centre art, without the corner index.
  const bursts = [];
  const centre = centreArt(design, suit, card.rank, g, ix, bursts);
  const bg = backgroundArt(design, g, bursts, card.rank, idPrefix);
  const art = bg.ground + sceneArt(design, g) + bg.fx + centre;
  if (opts.centreOnly) { const pa = artPanel(g, art, idPrefix); return frame(g, pa.inner, { ...opts, defs: bg.defs + pa.defs }); }
  const pa = artPanel(g, art + ix.svg + frameArt(design, suit, g), idPrefix);
  return frame(g, pa.inner, { ...opts, idPrefix, defs: ix.defs + bg.defs + pa.defs });
}

function backPattern(design, g) {
  const { pattern, fg } = design.back;
  const u = Math.min(g.fullW, g.fullH) / 12, out = [];
  if (pattern === 'dots') {
    for (let y = u / 2; y < g.fullH; y += u) for (let x = u / 2 + ((Math.round(y / u) % 2) * u) / 2; x < g.fullW; x += u)
      out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(u * 0.12)}"/>`);
    return `<g fill="${fg}" fill-opacity="0.35">${out.join('')}</g>`;
  }
  if (pattern === 'stripes') {
    for (let x = -g.fullH; x < g.fullW; x += u) out.push(`M${f(x)} ${f(g.fullH)} L${f(x + g.fullH)} 0`);
    return `<path d="${out.join(' ')}" stroke="${fg}" stroke-opacity="0.28" stroke-width="${f(u * 0.22)}" fill="none"/>`;
  }
  if (pattern === 'rays') {
    const cx = g.fullW / 2, cy = g.fullH / 2, R = Math.hypot(cx, cy);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; out.push(`M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a) * R)} ${f(cy + Math.sin(a) * R)}`); }
    return `<path d="${out.join(' ')}" stroke="${fg}" stroke-opacity="0.22" stroke-width="${f(u * 0.12)}" fill="none"/>`;
  }
  if (pattern === 'stars') {
    let s = 1234567;
    const rand = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
    const n = Math.round((g.fullW * g.fullH) / (u * u) * 1.1);
    for (let i = 0; i < n; i++) {
      const x = rand() * g.fullW, y = rand() * g.fullH, z = u * (0.06 + rand() * 0.16);
      out.push(`M${f(x)} ${f(y - z)} L${f(x + z * 0.3)} ${f(y - z * 0.3)} L${f(x + z)} ${f(y)} L${f(x + z * 0.3)} ${f(y + z * 0.3)} L${f(x)} ${f(y + z)} L${f(x - z * 0.3)} ${f(y + z * 0.3)} L${f(x - z)} ${f(y)} L${f(x - z * 0.3)} ${f(y - z * 0.3)} Z`);
    }
    return `<path d="${out.join(' ')}" fill="${fg}" fill-opacity="0.45"/>`;
  }
  return '';
}

export function renderBack(design, opts = {}) {
  const g = cardGeom(design), { bg, fg, mark } = design.back;
  const A = g.art;
  let inner = `<rect x="${f(A.x)}" y="${f(A.y)}" width="${f(A.w)}" height="${f(A.h)}" fill="${bg}"/>` + backPattern(design, g);
  // the outline is inset from the trim, or from the art panel under a border
  const t = g.border ? A : g.trim, inset = g.safe * 0.6;
  inner += `<rect x="${f(t.x + inset)}" y="${f(t.y + inset)}" width="${f(t.w - 2 * inset)}" height="${f(t.h - 2 * inset)}" rx="${f(g.w * 0.04)}" fill="none" stroke="${fg}" stroke-opacity="0.7" stroke-width="${f(g.w * 0.008)}"/>`;
  const cx = g.fullW / 2, cy = g.fullH / 2, R = Math.min(g.w, g.h) * 0.3;
  if (mark === 'burst') {
    const spec = { ...defaultSpec({ id: 'back', primary: fg, secondary: fg }, 4, []), colors: [fg, fg], trail: false };
    inner += renderFirework(spec, { cx, cy, r: R });
  } else if (mark === 'ring') {
    inner += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.9)}" fill="none" stroke="${fg}" stroke-width="${f(g.w * 0.012)}"/>`
      + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.62)}" fill="none" stroke="${fg}" stroke-width="${f(g.w * 0.006)}"/>`
      + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.14)}" fill="${fg}"/>`;
  }
  const p = opts.idPrefix || 'hbback', pa = artPanel(g, inner, p);
  return frame(g, pa.inner, { ...opts, defs: pa.defs });
}

export function renderToken(design, kind, opts = {}) {
  const g = cardGeom(design), T = design.tokens;
  const bg = kind === 'clue' ? T.clueBg : T.fuseBg, fg = kind === 'clue' ? T.clueFg : T.fuseFg;
  const def = TOKEN_GLYPHS[kind], s = g.safeRect;
  const big = Math.min(s.w, s.h) * 0.62, small = g.h * 0.09;
  const A = g.art;
  let inner = `<rect x="${f(A.x)}" y="${f(A.y)}" width="${f(A.w)}" height="${f(A.h)}" fill="${bg}"/>`;
  inner += `<circle cx="${f(g.fullW / 2)}" cy="${f(g.fullH / 2)}" r="${f(big * 0.68)}" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="${f(g.w * 0.01)}"/>`;
  inner += glyph(def, g.fullW / 2 - big / 2, g.fullH / 2 - big / 2, big, fg);
  const cx = g.fullW / 2, cy = g.fullH / 2;
  const corner = glyph(def, s.x, s.y, small, fg, 9);
  inner += corner + `<g transform="rotate(180 ${f(cx)} ${f(cy)})">${corner}</g>`;
  const p = opts.idPrefix || `hb${kind}`, pa = artPanel(g, inner, p);
  return frame(g, pa.inner, { ...opts, defs: pa.defs });
}
