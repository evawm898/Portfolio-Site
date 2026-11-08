// hanabi/layout.js — card FACES, the back and the tokens, as SVG strings.
//
// One renderer for every surface: the preview inlines these strings, and the
// exports rasterise the very same strings at 300 dpi (hanabi/export.js), so
// what is on screen is what prints. Coordinates are millimetres with the
// origin at the BLEED corner (hanabi/deck.js cardGeom()).
//
// The centre art comes ONLY through hanabi/firework.js — fireworkSpec() and
// renderFirework(). Nothing here knows how a burst is drawn.

import { cardGeom, suitById } from './deck.js';
import { SYMBOLS, DIGITS, DIGIT_BOX, TOKEN_GLYPHS } from './symbols.js';
import { fireworkSpec, renderFirework, defaultSpec } from './firework.js';

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
function cornerIndex(rank, suit, faceBg, digitH) {
  const halo = contrast(suit.primary, faceBg) < HALO_BELOW ? haloFor(suit.primary) : null;
  const dw = digitH * (DIGIT_BOX.w / DIGIT_BOX.h);
  const sym = digitH * 0.62;
  const w = Math.max(dw, sym);
  const svg = digit(rank, (w - dw) / 2, 0, digitH, suit.primary, halo)
    + symbol(suit.symbol, (w - sym) / 2, digitH * 1.08, sym, suit.primary, halo);
  return { svg, w, h: digitH * 1.08 + sym };
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

function frame(g, inner, { guides, px, defs = '' }) {
  const size = px ? ` width="${px.w}" height="${px.h}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(g.fullW)} ${f(g.fullH)}"${size} preserveAspectRatio="xMidYMid meet">`
    + (defs ? `<defs>${defs}</defs>` : '') + inner + (guides ? guideMarks(g) : '') + '</svg>';
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

// ---- the three face layouts ----

function faceA(design, suit, rank, g) {
  const s = g.safeRect;
  const idx = cornerIndex(rank, suit, design.face.bg, g.h * 0.13);
  const spec = fireworkSpec(design, suit, rank);
  const r = Math.min(s.w * 0.46, (s.h - 2 * idx.h) * 0.5 + idx.h * 0.35, s.h * 0.4);
  return renderFirework(spec, { cx: g.fullW / 2, cy: g.fullH / 2, r })
    + placeCorners(idx, s, g, design.corners);
}

function faceB(design, suit, rank, g) {
  const s = g.safeRect;
  const idx = cornerIndex(rank, suit, design.face.bg, g.h * 0.095);
  const spec = { ...fireworkSpec(design, suit, rank), size: 1, trail: false };
  const slot = s.h / 5;                       // always sized for five, so the count reads
  const r = Math.min(slot * 0.46, (s.w - 2 * idx.w) * 0.42);
  const top = g.fullH / 2 - (rank * slot) / 2;
  let art = '';
  for (let i = 0; i < rank; i++) {
    art += renderFirework({ ...spec, seed: spec.seed + i * 7919 }, { cx: g.fullW / 2, cy: top + slot * (i + 0.5), r });
  }
  return art + placeCorners(idx, s, g, design.corners);
}

function faceC(design, suit, rank, g, idPrefix) {
  const s = g.safeRect;
  const spec = fireworkSpec(design, suit, rank);
  // Full bleed: the burst is sized to the card's half-diagonal and runs off
  // every edge; the svg viewport clips it at the bleed line.
  const r = Math.hypot(g.fullW, g.fullH) / 2 * 0.98;
  const art = renderFirework(spec, { cx: g.fullW / 2, cy: g.fullH / 2, r });
  const bandH = g.bleed + g.safe + g.h * 0.13;
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
  const yD = bandH - g.h * 0.03 - dH;
  const band = `<rect x="0" y="0" width="${f(g.fullW)}" height="${f(bandH)}" fill="${bandFill}"/>`
    + `<rect x="0" y="${f(bandH)}" width="${f(g.fullW)}" height="${f(rule)}" fill="${ink}" fill-opacity="0.6"/>` + content(yD);
  const cx = g.fullW / 2, cy = g.fullH / 2;
  const bottom = design.corners === 'upright'
    ? `<rect x="0" y="${f(g.fullH - bandH)}" width="${f(g.fullW)}" height="${f(bandH)}" fill="${bandFill}"/>`
      + `<rect x="0" y="${f(g.fullH - bandH - rule)}" width="${f(g.fullW)}" height="${f(rule)}" fill="${ink}" fill-opacity="0.6"/>`
      + content(g.fullH - yD - dH)
    : `<g transform="rotate(180 ${f(cx)} ${f(cy)})">${band}</g>`;
  return { inner: art + band + bottom, defs };
}

// ---- public renderers ----

// card = { kind: 'card', suitId, rank } | { kind: 'clue' } | { kind: 'fuse' }
// opts = { guides, px: {w,h}, idPrefix }
export function renderFace(design, card, opts = {}) {
  if (card.kind === 'clue' || card.kind === 'fuse') return renderToken(design, card.kind, opts);
  const g = cardGeom(design);
  const suit = suitById(design, card.suitId);
  const idPrefix = opts.idPrefix || `hb${card.suitId}${card.rank}`;
  const bg = `<rect x="0" y="0" width="${f(g.fullW)}" height="${f(g.fullH)}" fill="${design.face.bg}"/>`;
  if (design.layout === 'B') return frame(g, bg + faceB(design, suit, card.rank, g), opts);
  if (design.layout === 'C') { const c = faceC(design, suit, card.rank, g, idPrefix); return frame(g, bg + c.inner, { ...opts, defs: c.defs }); }
  return frame(g, bg + faceA(design, suit, card.rank, g), opts);
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
  let inner = `<rect x="0" y="0" width="${f(g.fullW)}" height="${f(g.fullH)}" fill="${bg}"/>` + backPattern(design, g);
  const t = g.trim, inset = g.safe * 0.6;
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
  return frame(g, inner, opts);
}

export function renderToken(design, kind, opts = {}) {
  const g = cardGeom(design), T = design.tokens;
  const bg = kind === 'clue' ? T.clueBg : T.fuseBg, fg = kind === 'clue' ? T.clueFg : T.fuseFg;
  const def = TOKEN_GLYPHS[kind], s = g.safeRect;
  const big = Math.min(s.w, s.h) * 0.62, small = g.h * 0.09;
  let inner = `<rect x="0" y="0" width="${f(g.fullW)}" height="${f(g.fullH)}" fill="${bg}"/>`;
  inner += `<circle cx="${f(g.fullW / 2)}" cy="${f(g.fullH / 2)}" r="${f(big * 0.68)}" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="${f(g.w * 0.01)}"/>`;
  inner += glyph(def, g.fullW / 2 - big / 2, g.fullH / 2 - big / 2, big, fg);
  const cx = g.fullW / 2, cy = g.fullH / 2;
  const corner = glyph(def, s.x, s.y, small, fg, 9);
  inner += corner + `<g transform="rotate(180 ${f(cx)} ${f(cy)})">${corner}</g>`;
  return frame(g, inner, opts);
}
