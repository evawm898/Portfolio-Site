// Glyph Presets — built-in suit-glyph families, as an alternative to
// uploading a custom SVG.
//
// Each family is four committed SVG files (one per suit) under
// assets/cards/glyph-presets/<family>/{spade,heart,diamond,club}.svg. A
// preset glyph is loaded into an <img> exactly the way an uploaded file is
// (see onSuitFileChange in cards.js) and handed to card-template.js as the
// same suitImages[suit] value it has always accepted — this module owns
// nothing about DRAWING a glyph, only about naming and fetching one. That is
// what makes "flows through the same pipeline as an upload, no special-
// casing" true structurally rather than by convention: card-template.js
// cannot tell a preset image from an uploaded one, because there is no
// difference once the <img> has loaded.
//
// Three families, picked to read as genuinely distinct at a glance rather
// than near-duplicates of the built-in placeholder: a traditional smooth
// silhouette (classic), a faceted straight-edge silhouette (minimal), and
// an open, tapered-stroke outline (hand-drawn).
//
// A fourth, "Ornate" (shipped briefly under the id "bold"), was dropped
// entirely on Eva's ruling before this ever reached main — its silhouette
// was, by design, built on Classic's own outline with filigree carved in,
// and getting that carving to read as genuinely distinct from Classic under
// any reasonable metric needed ornament dense enough that it stopped being
// worth the added complexity for this pass. Nothing about it survives here:
// no id, no asset folder, no gate clause. A future filigree family is not
// foreclosed, but it starts over rather than resuming this one.

export const GLYPH_FAMILIES = [
  { id: 'classic', label: 'Classic', description: 'Traditional smooth card-suit silhouettes.' },
  { id: 'minimal', label: 'Minimal', description: 'Faceted, straight-edged geometric shapes.' },
  { id: 'handdrawn', label: 'Hand-drawn', description: 'Open, tapered calligraphic strokes.' },
];

const FAMILY_IDS = new Set(GLYPH_FAMILIES.map((f) => f.id));

export function isGlyphFamily(id) {
  return FAMILY_IDS.has(id);
}

// Suit id -> the SVG's own filename. The suit ids used everywhere else in
// this app (deck-builder.js SUITS) are plural ('spades'); the asset files
// are named singular, matching a standard suit name rather than this app's
// internal id.
const SUIT_FILE = { spades: 'spade', hearts: 'heart', diamonds: 'diamond', clubs: 'club' };

export function presetGlyphUrl(familyId, suit) {
  const file = SUIT_FILE[suit];
  if (!file) throw new Error(`Unknown suit "${suit}"`);
  // Resolved relative to THIS module's own URL, so it is correct whether the
  // page is served from the repo root (production, the local dev server) or
  // from a test harness's own static server — never a hardcoded absolute path.
  return new URL(`../assets/cards/glyph-presets/${familyId}/${file}.svg`, import.meta.url).href;
}

// One in-flight/loaded <img> promise per (family, suit) pair, cached for the
// life of the page — a family's four glyphs are requested together every
// time it is selected, and there is no reason to re-fetch a preset that was
// already loaded once this session.
const cache = new Map();

export function loadPresetGlyph(familyId, suit) {
  if (!isGlyphFamily(familyId)) return Promise.reject(new Error(`Unknown glyph family "${familyId}"`));
  const key = `${familyId}/${suit}`;
  if (cache.has(key)) return cache.get(key);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load the "${familyId}" ${suit} glyph.`));
    img.src = presetGlyphUrl(familyId, suit);
  });
  cache.set(key, promise);
  return promise;
}

// Loads all four suits of a family together and returns { suit: <img> }.
// Callers that apply a family to the whole deck at once want this rather
// than four independent loadPresetGlyph() calls, so a family switch is one
// preview render rather than four flickering ones.
export async function loadPresetFamily(familyId, suits) {
  const images = await Promise.all(suits.map((suit) => loadPresetGlyph(familyId, suit)));
  const out = {};
  suits.forEach((suit, i) => { out[suit] = images[i]; });
  return out;
}
