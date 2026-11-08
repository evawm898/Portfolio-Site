// hanabi/symbols.js — the suit symbols, the rank numerals and the token
// glyphs, all as SVG PATH DATA. Nothing on a card is set in a font: the
// numerals are drawn strokes, so the preview, the PDF and the PNGs are the
// same geometry on every machine and no webfont has to be awaited before a
// card can be rasterised.
//
// Symbols are filled paths in a 100 x 100 box. Every suit carries one, and
// the symbol — never the colour alone — is what identifies a suit
// (colour-blind legibility is a hard requirement of this page).

const polygon = (pts) => 'M' + pts.map((p) => p.map((v) => v.toFixed(2)).join(' ')).join(' L') + ' Z';

function starPts(n, rOut, rIn, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < 2 * n; i++) {
    const r = i % 2 ? rIn : rOut, a = rot + (i * Math.PI) / n;
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  return pts;
}
function ngon(n, r, rot = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / n;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
}
const circlePath = (cx, cy, r) => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

export const SYMBOLS = {
  circle:   { label: 'Circle',   d: circlePath(50, 50, 40) },
  star:     { label: 'Star',     d: polygon(starPts(5, 46, 19)) },
  diamond:  { label: 'Diamond',  d: 'M50 4 L88 50 L50 96 L12 50 Z' },
  triangle: { label: 'Triangle', d: 'M50 8 L94 88 L6 88 Z' },
  square:   { label: 'Square',   d: 'M14 14 L86 14 L86 86 L14 86 Z' },
  heart:    { label: 'Heart',    d: 'M50 90 C22 70 6 52 6 33 C6 17 18 8 31 8 C41 8 47 14 50 22 C53 14 59 8 69 8 C82 8 94 17 94 33 C94 52 78 70 50 90 Z' },
  crescent: { label: 'Crescent', d: 'M60 6 A44 44 0 1 0 94 70 A36 36 0 1 1 60 6 Z' },
  drop:     { label: 'Drop',     d: 'M50 4 C62 26 84 44 84 64 A34 34 0 0 1 16 64 C16 44 38 26 50 4 Z' },
  cross:    { label: 'Cross',    d: 'M36 8 L64 8 L64 36 L92 36 L92 64 L64 64 L64 92 L36 92 L36 64 L8 64 L8 36 L36 36 Z' },
  hexagon:  { label: 'Hexagon',  d: polygon(ngon(6, 44)) },
  sparkle:  { label: 'Sparkle',  d: 'M50 2 C54 34 66 46 98 50 C66 54 54 66 50 98 C46 66 34 54 2 50 C34 46 46 34 50 2 Z' },
  ring:     { label: 'Ring',     d: circlePath(50, 50, 42) + ' ' + circlePath(50, 50, 22), evenodd: true },
  clover:   { label: 'Clover',   d: circlePath(50, 28, 20) + ' ' + circlePath(28, 58, 20) + ' ' + circlePath(72, 58, 20) + ' M44 60 L56 60 L60 94 L40 94 Z' },
  burst:    { label: 'Burst',    d: polygon(starPts(8, 46, 26)) },
};
export const SYMBOL_IDS = Object.keys(SYMBOLS);

// Rank numerals 1–5 as STROKES in a 60 x 100 box (round caps and joins).
// The stroke width is the renderer's, so a numeral can be drawn heavy in a
// corner index and light in a band.
export const DIGITS = {
  1: 'M17 24 L33 10 L33 90',
  2: 'M12 30 C12 13 50 7 50 30 C50 47 14 66 12 90 L50 90',
  3: 'M12 12 L48 12 L27 44 C46 42 52 58 50 70 C47 92 20 94 10 80',
  4: 'M40 90 L40 10 L8 64 L54 64',
  5: 'M48 12 L18 12 L14 46 C26 38 50 40 50 63 C50 88 22 94 10 80',
};
export const DIGIT_BOX = { w: 60, h: 100 };

// Token glyphs, strokes in a 100 x 100 box.
// Clue: an eye — the "information" a clue gives. Fuse: a bomb with a lit fuse.
export const TOKEN_GLYPHS = {
  clue: {
    strokes: ['M8 50 C26 22 74 22 92 50 C74 78 26 78 8 50 Z'],
    fills: [circlePath(50, 50, 14)],
  },
  fuse: {
    strokes: ['M62 30 C66 18 76 14 84 12'],
    fills: [circlePath(44, 60, 30), 'M54 26 L68 26 L70 36 L52 36 Z',
            polygon(starPts(6, 12, 5).map(([x, y]) => [x - 50 + 88, y - 50 + 10]))],
  },
};
