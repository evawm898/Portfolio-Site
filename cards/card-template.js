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
import { resolveFont, fontShorthand, DEFAULT_FONT_ID } from './font-manager.js';

// ---------------------------------------------------------------------
// Deck-wide style controls — "03 Style" panel on cards.html. Global only
// (no per-suit variants in this pass): corner-index inset + font, and a
// suit-glyph scale applied relative to each context's own base size.
//
// The font is no longer a five-entry list here — cards/font-manager.js owns
// the whole font system (the Google Fonts catalog, uploaded files, and the
// loading contract). This file only asks it "what do I set ctx.font to?".
// ---------------------------------------------------------------------

export const DEFAULT_STYLE = {
  cornerInsetPct: 4.5, // % of the safe-rect width, from the corner
  cornerFontId: DEFAULT_FONT_ID, // drives both the corner rank letter and the court-card center letter
  glyphScale: 1, // 0.5–1.5, relative to each context's own base size
  glyphOffsetPct: 30, // 0–100% of one glyph-height of extra travel, on top of the anti-overlap floor
  // The three scale sliders below are deliberately INDEPENDENT of each other
  // and of glyphScale — each multiplies a base derived from the safe rect, not
  // from another control's output. A letter sized as a fraction of the SCALED
  // plate would move when the plate moved, which is not what "independent"
  // buys you: a big plate with a small letter has to be reachable.
  courtPlateScale: 1, // 0.5–1.5, the court-card centre plate
  courtLetterScale: 1, // 0.5–1.5, the J/Q/K inside it
  cornerFontScale: 1, // 0.5–1.5, the corner rank letter (NOT its mini suit glyph)
};

// Base sizes, before any scale slider. Named because three call sites and the
// verification gate all have to agree on what "100%" means.
const BASE = {
  cornerFont: 0.11, // x safe.w
  cornerGlyph: 0.9, // x the UNSCALED corner font size
  plateW: 0.62, // x safe.w
  plateH: 0.42, // x safe.h
  courtLetter: 0.62, // x the UNSCALED plate height
  courtGlyph: 0.24, // x safe.w
};

// The court-card centre plate, as a rect. Exported because the plate is the
// box the letter is centred IN — a claim only checkable against the same
// numbers the drawing code uses, so tools/verify-cards-fonts.mjs reads it
// from here instead of re-deriving it and agreeing with itself.
export function getCourtPlateRect(safe, style) {
  const s = { ...DEFAULT_STYLE, ...style };
  const w = safe.w * BASE.plateW * s.courtPlateScale;
  const h = safe.h * BASE.plateH * s.courtPlateScale;
  return { cx: safe.x + safe.w / 2, cy: safe.y + safe.h / 2, w, h };
}

// Centre `text` on its TRUE INK bounding box at (targetX, targetY), and draw
// it there. ctx.font, fillStyle and text* state must already be set.
//
// WHY NOT textBaseline 'middle' + textAlign 'center': those centre the EM BOX,
// which is a property of the font's design metrics, not of the glyph. A face
// with tall ascenders and deep descenders (most script faces) has its em box
// centred well above its ink, so the letter reads low; a heavy display face
// with almost no descender reads high. With five curated fonts that drift was
// a fixed fudge factor. With the whole Google Fonts catalog selectable it is
// unbounded, so the offset has to be measured per font, per glyph, per size.
function fillTextInkCentered(ctx, text, targetX, targetY) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);

  // actualBoundingBox* are all distances OUT from the alignment point:
  // Left/Ascent grow leftward/upward, Right/Descent rightward/downward. So the
  // ink centre relative to the draw origin is half the difference of each pair.
  const hasInk = Number.isFinite(m.actualBoundingBoxLeft) && Number.isFinite(m.actualBoundingBoxRight)
    && Number.isFinite(m.actualBoundingBoxAscent) && Number.isFinite(m.actualBoundingBoxDescent);
  if (!hasInk) {
    // No glyph metrics at all (a face that reports nothing, or whitespace):
    // fall back to em-box centring rather than drawing at a NaN offset.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, targetX, targetY);
    return;
  }
  const inkOffsetX = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
  const inkOffsetY = (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
  ctx.fillText(text, targetX - inkOffsetX, targetY - inkOffsetY);
}

// The ONE place a card's text font is turned into a ctx.font string. Both the
// corner rank letter and the court-card centre letter call it, so "one font,
// both places" is structural rather than a convention two call sites have to
// remember. The weight comes from the resolved spec, not a literal: asking a
// family for a weight it does not ship is how you get a synthesised bold that
// the preview and the export can disagree about.
function cardFont(style, sizePx) {
  return fontShorthand(resolveFont(style.cornerFontId), Math.round(sizePx));
}

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
function drawCornerIndices(ctx, rank, suit, palette, safe, suitImages, style) {
  const color = suitColor(suit, palette);
  const baseFontSize = safe.w * BASE.cornerFont;
  const fontSize = Math.round(baseFontSize * style.cornerFontScale);
  // The mini glyph is sized from the UNSCALED font size on purpose. Deriving it
  // from the scaled one would make "corner font scale" silently a second suit-
  // glyph scale, and the panel already has one of those.
  const glyphSize = baseFontSize * BASE.cornerGlyph * style.glyphScale;
  const pad = safe.w * (style.cornerInsetPct / 100);
  const cornerFont = cardFont(style, fontSize);

  // Floor between the letter's true bottom edge and the top of the mini glyph
  // below it, so the two never touch regardless of font or scale — also the
  // zero point the glyph-offset slider travels from. Proportional to the
  // DRAWN font size, so it grows with the corner-font slider rather than
  // staying a fixed gap under a letter that has doubled.
  const MIN_LETTER_GLYPH_GAP = fontSize * 0.08;

  // Mirrored corner pair: top-left as drawn, bottom-right as the same
  // glyph rotated 180deg about its own inset point — one offset, applied
  // symmetrically, drives both instances.
  function drawOne(rotate) {
    ctx.save();
    if (rotate) {
      ctx.translate(safe.x + safe.w - pad, safe.y + safe.h - pad);
      ctx.rotate(Math.PI);
    } else {
      ctx.translate(safe.x + pad, safe.y + pad);
    }
    ctx.fillStyle = color;
    ctx.font = cornerFont;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'hanging';
    ctx.fillText(rank, 0, 0);

    // Measured, not assumed: actualBoundingBoxDescent (relative to the
    // hanging baseline set above) is the real distance down to the
    // glyph's bottom edge for whichever font is selected, so the gap
    // stays correct across every family the picker can select — the whole
    // Google Fonts catalog and any uploaded file — instead of only the one
    // font this used to be tuned for.
    const metrics = ctx.measureText(rank);
    const letterBottom = metrics.actualBoundingBoxDescent || fontSize * 0.8;

    // The corner cluster (letter + mini glyph) is already offset toward
    // the card center by `pad` via the translate above, and ctx.rotate()
    // makes local +x/+y "toward center" for both the top-left instance
    // and the rotated bottom-right one. Sliding the glyph further along
    // that same (1,1) diagonal — rather than straight down — keeps it
    // moving the direction the whole cluster already moves in.
    const diag = Math.SQRT1_2;
    const extraTravel = (style.glyphOffsetPct / 100) * glyphSize * diag;
    const glyphX = glyphSize / 2 + extraTravel;
    const glyphY = letterBottom + MIN_LETTER_GLYPH_GAP + glyphSize / 2 + extraTravel;

    drawSuitGlyph(ctx, suit, glyphX, glyphY, glyphSize, color, 0, suitImages);
    ctx.restore();
  }

  drawOne(false);
  drawOne(true);
}

function drawPipCard(ctx, rank, suit, palette, safe, suitImages, style) {
  const layout = PIP_LAYOUTS[rank];
  const pipSize = safe.w * 0.16 * style.glyphScale;
  const fieldTop = safe.y + safe.h * 0.16;
  const fieldH = safe.h * 0.68;
  const color = suitColor(suit, palette);

  for (const p of layout) {
    const px = safe.x + p.x * safe.w;
    const py = fieldTop + p.y * fieldH;
    drawSuitGlyph(ctx, suit, px, py, pipSize, color, p.rot || 0, suitImages);
  }
}

function drawAceCard(ctx, suit, palette, safe, suitImages, style) {
  const color = suitColor(suit, palette);
  const size = safe.w * 0.52 * style.glyphScale;
  drawSuitGlyph(ctx, suit, safe.x + safe.w / 2, safe.y + safe.h / 2, size, color, 0, suitImages);
}

// Simplified court card: no bespoke figure art (explicitly deferred) — a
// large centered suit glyph with a bold letter plate, so J/Q/K are still
// unambiguous and on-palette while remaining trivially replaceable with
// real illustration later.
const COURT_LETTERS = { J: 'J', Q: 'Q', K: 'K' };

function drawCourtCard(ctx, rank, suit, palette, safe, suitImages, style) {
  const color = suitColor(suit, palette);
  const other = SUIT_GROUP[suit] === 'primary' ? palette.secondary : palette.primary;

  // Plate: a simple bordered panel behind the letter, in the "other"
  // palette color so a court card visually distinguishes itself from a
  // pip card at a glance.
  const plate = getCourtPlateRect(safe, style);
  const { cx, cy } = plate;
  ctx.save();
  ctx.strokeStyle = other;
  ctx.lineWidth = Math.max(2, safe.w * 0.012);
  ctx.strokeRect(cx - plate.w / 2, cy - plate.h / 2, plate.w, plate.h);
  ctx.restore();

  // Same corner-index font drives the big center-plate letter too — one
  // control, not two settings that could drift apart. Its SIZE, though, is its
  // own slider, measured off the unscaled plate height so the plate can grow
  // or shrink without dragging the letter with it.
  const letterSize = safe.h * BASE.plateH * BASE.courtLetter * style.courtLetterScale;
  ctx.save();
  ctx.fillStyle = other;
  ctx.font = cardFont(style, letterSize);
  // Centred on the letter's real ink, not on the font's em box — see
  // fillTextInkCentered(). This is what makes an arbitrary Google face land in
  // the middle of the plate instead of somewhere near it.
  fillTextInkCentered(ctx, COURT_LETTERS[rank], cx, cy);
  ctx.restore();

  const glyphSize = safe.w * BASE.courtGlyph * style.glyphScale;
  const gap = glyphSize * 0.55;
  // The glyphs sit outside the plate, so a large plate pushes them outward —
  // far enough, at combined slider extremes, to leave the safe rect and risk
  // being clipped by the cutter (PRINT_SPEC.SAFE_MARGIN_IN exists for exactly
  // that). Clamped so the glyph's outer edge stays inside the safe rect: at
  // the extremes it crowds the plate, which prints, rather than running off
  // the card, which does not.
  const maxCentre = safe.y + safe.h - glyphSize / 2;
  const minCentre = safe.y + glyphSize / 2;
  const belowY = Math.min(cy + plate.h / 2 + gap, maxCentre);
  const aboveY = Math.max(cy - plate.h / 2 - gap, minCentre);
  drawSuitGlyph(ctx, suit, cx, belowY, glyphSize, color, 0, suitImages);
  drawSuitGlyph(ctx, suit, cx, aboveY, glyphSize, color, 180, suitImages);
}

// ---------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------
// cardSpec: { suit, rank } — see deck-builder.js buildDeckList()
// palette: { primary: '#rrggbb', secondary: '#rrggbb' }
// suitImages: { spades: HTMLImageElement|null, hearts: ..., ... }
// style: deck-wide { cornerInsetPct, cornerFontId, glyphScale, glyphOffsetPct }
// — see DEFAULT_STYLE above. Partial objects are filled in with the defaults.
export function renderCardToCanvas(cardSpec, palette, suitImages, style) {
  const s = { ...DEFAULT_STYLE, ...style };
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
  drawCornerIndices(ctx, rank, suit, palette, safe, suitImages, s);

  if (rank === 'A') {
    drawAceCard(ctx, suit, palette, safe, suitImages, s);
  } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
    drawCourtCard(ctx, rank, suit, palette, safe, suitImages, s);
  } else {
    drawPipCard(ctx, rank, suit, palette, safe, suitImages, s);
  }

  return canvas;
}
