// Deck Builder — suit/rank enumeration and print geometry.
//
// This module owns two things only: (1) the 52-entry deck list, and
// (2) the bleed/trim/safe-area math every card is drawn against. It knows
// nothing about how a card is drawn (card-template.js) or exported
// (pdf-export.js / png-export.js) — keep it that way so a vendor spec
// change (different trim size, different bleed) is a constants edit here,
// not a hunt through rendering code.

// ---------------------------------------------------------------------
// Print spec — named constants so a specific print vendor's requirements
// can be swapped in later without touching any rendering logic. Defaults
// below are the common print-on-demand card spec: 2.5in x 3.5in trim,
// 300 DPI, 1/8in bleed on all sides.
// ---------------------------------------------------------------------
export const PRINT_SPEC = {
  TRIM_W_IN: 2.5,
  TRIM_H_IN: 3.5,
  BLEED_IN: 0.125,
  // Inset from the trim edge inside which all "meaningful" art (corner
  // indices, pips, court glyphs) should stay, so a small cutter
  // misregistration never clips anything that matters.
  SAFE_MARGIN_IN: 0.1875,
  DPI: 300,
};

PRINT_SPEC.PAGE_W_IN = PRINT_SPEC.TRIM_W_IN + PRINT_SPEC.BLEED_IN * 2;
PRINT_SPEC.PAGE_H_IN = PRINT_SPEC.TRIM_H_IN + PRINT_SPEC.BLEED_IN * 2;
PRINT_SPEC.PAGE_W_PX = Math.round(PRINT_SPEC.PAGE_W_IN * PRINT_SPEC.DPI);
PRINT_SPEC.PAGE_H_PX = Math.round(PRINT_SPEC.PAGE_H_IN * PRINT_SPEC.DPI);
PRINT_SPEC.BLEED_PX = Math.round(PRINT_SPEC.BLEED_IN * PRINT_SPEC.DPI);
PRINT_SPEC.SAFE_MARGIN_PX = Math.round(PRINT_SPEC.SAFE_MARGIN_IN * PRINT_SPEC.DPI);

// Full-bleed canvas rect (0,0,PAGE_W_PX,PAGE_H_PX) minus the bleed strip —
// this is where the card is actually cut.
export function getTrimRect() {
  const { BLEED_PX, PAGE_W_PX, PAGE_H_PX } = PRINT_SPEC;
  return {
    x: BLEED_PX,
    y: BLEED_PX,
    w: PAGE_W_PX - BLEED_PX * 2,
    h: PAGE_H_PX - BLEED_PX * 2,
  };
}

// Trim rect minus the safe margin — where corner indices / pips / court
// glyphs are placed.
export function getSafeRect() {
  const trim = getTrimRect();
  const m = PRINT_SPEC.SAFE_MARGIN_PX;
  return { x: trim.x + m, y: trim.y + m, w: trim.w - m * 2, h: trim.h - m * 2 };
}

// ---------------------------------------------------------------------
// Deck contents
// ---------------------------------------------------------------------
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

// Standard black/red convention: spades & clubs take the primary color,
// hearts & diamonds take the secondary color. Whether "primary"/"secondary"
// map to anything more specific than that is a UI-level decision.
export const SUIT_GROUP = {
  spades: 'primary',
  clubs: 'primary',
  hearts: 'secondary',
  diamonds: 'secondary',
};

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function buildDeckList() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck; // 52 entries, in suit-major order
}
