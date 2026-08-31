// Card Template — draws one card face onto a canvas.
//
// Placeholder-glyph note: no real per-suit SVGs exist yet, so each suit
// falls back to a built-in vector path (drawn straight from canvas
// primitives — no image asset). The moment a real SVG is supplied for a
// suit (an <img> loaded from the uploaded file), drawSuitGlyph() below
// switches to it automatically — nothing else in this file, or in
// deck-builder.js / the export modules, needs to change. That swap point
// is the whole point of this file's shape.

import { PRINT_SPEC, getSafeRect, SUIT_GROUP } from './deck-builder.js';

// ---------------------------------------------------------------------
// Placeholder suit glyphs — simple closed vector paths, one per suit,
// each traced in a -1..1 box centered on the origin so they scale/rotate
// uniformly regardless of size. Stand-ins for uploaded suit art.
// ---------------------------------------------------------------------
const PLACEHOLDER_PATHS = {
  spades(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.bezierCurveTo(0.95, -0.35, 0.85, 0.5, 0.05, 0.55);
    ctx.lineTo(0.3, 1);
    ctx.lineTo(-0.3, 1);
    ctx.lineTo(-0.05, 0.55);
    ctx.bezierCurveTo(-0.85, 0.5, -0.95, -0.35, 0, -1);
    ctx.closePath();
  },
  clubs(ctx) {
    ctx.beginPath();
    ctx.arc(0, -0.45, 0.42, 0, Math.PI * 2);
    ctx.moveTo(0.42, 0.18);
    ctx.arc(0.38, 0.18, 0.42, 0, Math.PI * 2);
    ctx.moveTo(-0.02, 0.18);
    ctx.arc(-0.38, 0.18, 0.42, 0, Math.PI * 2);
    ctx.moveTo(0.16, 1);
    ctx.lineTo(0.16, 0.35);
    ctx.lineTo(-0.16, 0.35);
    ctx.lineTo(-0.16, 1);
    ctx.closePath();
  },
  hearts(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(-1.05, 0.15, -0.85, -0.9, 0, -0.35);
    ctx.bezierCurveTo(0.85, -0.9, 1.05, 0.15, 0, 1);
    ctx.closePath();
  },
  diamonds(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0.65, 0);
    ctx.lineTo(0, 1);
    ctx.lineTo(-0.65, 0);
    ctx.closePath();
  },
};

// Fill an off-screen tinted copy of a loaded suit-glyph <img> (from an
// uploaded SVG) so it takes the chosen palette color regardless of the
// artwork's original fill — same "source-in" trick used to recolor an
// icon font glyph. Cached per (image, color) pair since a deck reuses the
// same suit image dozens of times.
const tintCache = new Map();

function getTintedImage(img, color) {
  const key = img.src + '|' + color;
  if (tintCache.has(key)) return tintCache.get(key);
  const size = 256;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  // Fit the image into the square, preserving aspect ratio.
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  octx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, size, size);
  tintCache.set(key, off);
  return off;
}

// Draw one suit glyph centered at (x, y), `size` tall, optionally rotated
// (degrees). `suitImages[suit]` is a loaded <img> if the user uploaded a
// real SVG for that suit; otherwise the built-in placeholder path is used.
export function drawSuitGlyph(ctx, suit, x, y, size, color, rotationDeg, suitImages) {
  ctx.save();
  ctx.translate(x, y);
  if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180);

  const img = suitImages && suitImages[suit];
  if (img) {
    const tinted = getTintedImage(img, color);
    ctx.drawImage(tinted, -size / 2, -size / 2, size, size);
  } else {
    ctx.scale(size / 2, size / 2);
    ctx.fillStyle = color;
    PLACEHOLDER_PATHS[suit](ctx);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// Pip layout — normalized (0..1) positions within the pip field for each
// number rank, following the classical arrangement. `rot` marks pips that
// print upside-down (the bottom half of the card). Court cards and the
// ace don't use this table.
// ---------------------------------------------------------------------
const PIP_LAYOUTS = {
  2: [{ x: 0.5, y: 0.18 }, { x: 0.5, y: 0.82, rot: 180 }],
  3: [{ x: 0.5, y: 0.18 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.82, rot: 180 }],
  4: [
    { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.18 },
    { x: 0.25, y: 0.82, rot: 180 }, { x: 0.75, y: 0.82, rot: 180 },
  ],
  5: [
    { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.18 },
    { x: 0.5, y: 0.5 },
    { x: 0.25, y: 0.82, rot: 180 }, { x: 0.75, y: 0.82, rot: 180 },
  ],
  6: [
    { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.18 },
    { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 },
    { x: 0.25, y: 0.82, rot: 180 }, { x: 0.75, y: 0.82, rot: 180 },
  ],
  7: [
    { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.18 },
    { x: 0.5, y: 0.34 },
    { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 },
    { x: 0.25, y: 0.82, rot: 180 }, { x: 0.75, y: 0.82, rot: 180 },
  ],
  8: [
    { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.18 },
    { x: 0.5, y: 0.34 },
    { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 },
    { x: 0.5, y: 0.66, rot: 180 },
    { x: 0.25, y: 0.82, rot: 180 }, { x: 0.75, y: 0.82, rot: 180 },
  ],
  9: [
    { x: 0.25, y: 0.15 }, { x: 0.75, y: 0.15 },
    { x: 0.25, y: 0.38 }, { x: 0.75, y: 0.38 },
    { x: 0.5, y: 0.5 },
    { x: 0.25, y: 0.62, rot: 180 }, { x: 0.75, y: 0.62, rot: 180 },
    { x: 0.25, y: 0.85, rot: 180 }, { x: 0.75, y: 0.85, rot: 180 },
  ],
  10: [
    { x: 0.25, y: 0.15 }, { x: 0.75, y: 0.15 },
    { x: 0.5, y: 0.27 },
    { x: 0.25, y: 0.38 }, { x: 0.75, y: 0.38 },
    { x: 0.25, y: 0.62, rot: 180 }, { x: 0.75, y: 0.62, rot: 180 },
    { x: 0.5, y: 0.73, rot: 180 },
    { x: 0.25, y: 0.85, rot: 180 }, { x: 0.75, y: 0.85, rot: 180 },
  ],
};

function suitColor(suit, palette) {
  return SUIT_GROUP[suit] === 'primary' ? palette.primary : palette.secondary;
}

// Draw the two mirrored corner indices (rank stacked over a small suit
// glyph, top-left; the same thing rotated 180deg, bottom-right).
function drawCornerIndices(ctx, rank, suit, palette, safe, suitImages) {
  const color = suitColor(suit, palette);
  const fontSize = Math.round(safe.w * 0.11);
  const glyphSize = fontSize * 0.9;
  const pad = safe.w * 0.045;

  function drawOne(rotate) {
    ctx.save();
    if (rotate) {
      ctx.translate(safe.x + safe.w - pad, safe.y + safe.h - pad);
      ctx.rotate(Math.PI);
    } else {
      ctx.translate(safe.x + pad, safe.y + pad);
    }
    ctx.fillStyle = color;
    ctx.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'hanging';
    ctx.fillText(rank, 0, 0);
    drawSuitGlyph(ctx, suit, glyphSize / 2, fontSize * 1.12, glyphSize, color, 0, suitImages);
    ctx.restore();
  }

  drawOne(false);
  drawOne(true);
}

function drawPipCard(ctx, rank, suit, palette, safe, suitImages) {
  const layout = PIP_LAYOUTS[rank];
  const pipSize = safe.w * 0.16;
  const fieldTop = safe.y + safe.h * 0.16;
  const fieldH = safe.h * 0.68;
  const color = suitColor(suit, palette);

  for (const p of layout) {
    const px = safe.x + p.x * safe.w;
    const py = fieldTop + p.y * fieldH;
    drawSuitGlyph(ctx, suit, px, py, pipSize, color, p.rot || 0, suitImages);
  }
}

function drawAceCard(ctx, suit, palette, safe, suitImages) {
  const color = suitColor(suit, palette);
  const size = safe.w * 0.52;
  drawSuitGlyph(ctx, suit, safe.x + safe.w / 2, safe.y + safe.h / 2, size, color, 0, suitImages);
}

// Simplified court card: no bespoke figure art (explicitly deferred) — a
// large centered suit glyph with a bold letter plate, so J/Q/K are still
// unambiguous and on-palette while remaining trivially replaceable with
// real illustration later.
const COURT_LETTERS = { J: 'J', Q: 'Q', K: 'K' };

function drawCourtCard(ctx, rank, suit, palette, safe, suitImages) {
  const color = suitColor(suit, palette);
  const other = SUIT_GROUP[suit] === 'primary' ? palette.secondary : palette.primary;
  const cx = safe.x + safe.w / 2;
  const cy = safe.y + safe.h / 2;

  // Plate: a simple bordered panel behind the letter, in the "other"
  // palette color so a court card visually distinguishes itself from a
  // pip card at a glance.
  const plateW = safe.w * 0.62;
  const plateH = safe.h * 0.42;
  ctx.save();
  ctx.strokeStyle = other;
  ctx.lineWidth = Math.max(2, safe.w * 0.012);
  ctx.strokeRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH);
  ctx.restore();

  const letterSize = plateH * 0.62;
  ctx.save();
  ctx.fillStyle = other;
  ctx.font = `600 ${letterSize}px "Fraunces", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(COURT_LETTERS[rank], cx, cy - plateH * 0.08);
  ctx.restore();

  const glyphSize = safe.w * 0.24;
  drawSuitGlyph(ctx, suit, cx, cy + plateH / 2 + glyphSize * 0.55, glyphSize, color, 0, suitImages);
  drawSuitGlyph(ctx, suit, cx, cy - plateH / 2 - glyphSize * 0.55, glyphSize, color, 180, suitImages);
}

// ---------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------
// cardSpec: { suit, rank } — see deck-builder.js buildDeckList()
// palette: { primary: '#rrggbb', secondary: '#rrggbb' }
// suitImages: { spades: HTMLImageElement|null, hearts: ..., ... }
export function renderCardToCanvas(cardSpec, palette, suitImages) {
  const { suit, rank } = cardSpec;
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_SPEC.PAGE_W_PX;
  canvas.height = PRINT_SPEC.PAGE_H_PX;
  const ctx = canvas.getContext('2d');

  // Background fills the full bleed area — the trim line sits inside it,
  // not at the canvas edge, so a slight cut-line shift never exposes an
  // unpainted margin.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const safe = getSafeRect();
  drawCornerIndices(ctx, rank, suit, palette, safe, suitImages);

  if (rank === 'A') {
    drawAceCard(ctx, suit, palette, safe, suitImages);
  } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
    drawCourtCard(ctx, rank, suit, palette, safe, suitImages);
  } else {
    drawPipCard(ctx, rank, suit, palette, safe, suitImages);
  }

  return canvas;
}
