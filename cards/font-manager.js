// Font Manager — the single source of truth for "which font is the deck set
// in, and is it actually loaded yet?".
//
// THE PROBLEM THIS MODULE EXISTS TO SOLVE
// A <canvas> paints text with whatever font is resolvable at the instant
// fillText() runs. A webfont that has not finished loading does not queue the
// draw and does not throw — it silently substitutes a fallback. So a preview
// can look right (the font finished while you were reading the page) while an
// export started one second earlier comes out in Times. That failure is
// invisible until someone opens the PDF, which is exactly the wrong moment.
//
// The contract every render path must honour:
//   await ensureFontLoaded(fontId)   // or ensureStyleFontsLoaded(style)
// BEFORE the first drawing call. renderCardToCanvas() is deliberately left
// synchronous (52 cards in a tight loop, one shared font) — the await belongs
// once, at the top of the loop, not 52 times inside it.
//
// WHY document.fonts.check() IS NOT THE TEST
// check() returns TRUE for a family that does not exist at all — measured in
// Chromium: document.fonts.check('400 40px "Zzz Not A Font"') === true, because
// with no matching @font-face rule there is nothing left to load and the
// system font "satisfies" the request. Using it as a readiness gate would pass
// every broken family. document.fonts.load() is the real instrument: it
// resolves with the ARRAY OF MATCHED FontFace objects, and that array is empty
// when nothing matched. A non-empty array of loaded faces is the proof.

import { GOOGLE_FONTS, GOOGLE_FONT_CATEGORIES } from './google-fonts-catalog.js';

// The weight the card art is drawn at. Every font the picker offers is
// resolved to the closest weight it actually ships, and drawn at THAT weight —
// asking a family for a weight it does not have is how you get the browser to
// synthesise a fake bold that no export will match.
export const TARGET_WEIGHT = 600;

// Fonts the page's own <link> in cards.html already loads. They stay in the
// list (and 'plex-mono' stays the default) so the first paint has real type
// with no network round trip, and so every previously-saved cornerFontId
// still resolves. Their weight is pinned to TARGET_WEIGHT to keep byte-for-byte
// the rendering they had before the picker existed.
export const BUILTIN_FONTS = [
  { id: 'plex-mono', label: 'IBM Plex Mono', family: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace', category: 'monospace' },
  { id: 'plex-sans', label: 'IBM Plex Sans', family: '"IBM Plex Sans", Helvetica, Arial, sans-serif', category: 'sans-serif' },
  { id: 'fraunces', label: 'Fraunces', family: '"Fraunces", "Iowan Old Style", Georgia, serif', category: 'serif' },
  { id: 'playfair', label: 'Playfair Display', family: '"Playfair Display", Georgia, serif', category: 'serif' },
  { id: 'space-mono', label: 'Space Mono', family: '"Space Mono", "SFMono-Regular", monospace', category: 'monospace' },
];

export const FONT_CATEGORIES = GOOGLE_FONT_CATEGORIES;

export const DEFAULT_FONT_ID = 'plex-mono';

// ---------------------------------------------------------------------
// Id scheme
//   builtin:  'plex-mono'                (bare, historical — never reused)
//   google:   'g:Playfair Display'       (the family name verbatim)
//   custom:   'u:3'                      (upload counter, per session)
// A bare id is only ever a builtin, so an old saved style keeps working and a
// Google family called "plex-mono" could never shadow one.
// ---------------------------------------------------------------------
export const GOOGLE_ID_PREFIX = 'g:';
export const CUSTOM_ID_PREFIX = 'u:';

export function googleFontId(family) { return GOOGLE_ID_PREFIX + family; }

const builtinById = new Map(BUILTIN_FONTS.map((f) => [f.id, f]));
const googleByName = new Map(GOOGLE_FONTS.map((f) => [f.name, f]));

// Uploaded fonts, in upload order. Session-only: a FontFace built from file
// bytes cannot be persisted, so nothing here is written to storage.
const customFonts = [];
let customCounter = 0;

// ---------------------------------------------------------------------
// Weight resolution
// ---------------------------------------------------------------------
// Nearest available weight to TARGET_WEIGHT, breaking ties heavier — a card
// index wants presence, so 700 beats 500 at equal distance.
function nearestWeight(weights) {
  let best = weights[0];
  let bestDist = Math.abs(best - TARGET_WEIGHT);
  for (const w of weights) {
    const d = Math.abs(w - TARGET_WEIGHT);
    if (d < bestDist || (d === bestDist && w > best)) { best = w; bestDist = d; }
  }
  return best;
}

// ---------------------------------------------------------------------
// Font specs — { id, label, family, weight, source, category }
//   family: the canvas/CSS font-family value, fallback stack included
//   weight: the numeric weight to draw at, guaranteed to exist in the face
// ---------------------------------------------------------------------
export function resolveFont(fontId) {
  const id = fontId || DEFAULT_FONT_ID;

  if (id.startsWith(GOOGLE_ID_PREFIX)) {
    const name = id.slice(GOOGLE_ID_PREFIX.length);
    const entry = googleByName.get(name);
    if (!entry) return resolveFont(DEFAULT_FONT_ID);
    return {
      id,
      label: name,
      googleFamily: name,
      // A generic last resort matched to the family's own category, so a
      // network failure degrades to something of the right species rather
      // than always to Times.
      family: `"${name}", ${genericFor(entry.category)}`,
      weight: nearestWeight(entry.weights),
      source: 'google',
      category: entry.category,
    };
  }

  if (id.startsWith(CUSTOM_ID_PREFIX)) {
    const entry = customFonts.find((f) => f.id === id);
    if (!entry) return resolveFont(DEFAULT_FONT_ID);
    return { ...entry };
  }

  const b = builtinById.get(id) || builtinById.get(DEFAULT_FONT_ID);
  return { ...b, weight: TARGET_WEIGHT, source: 'builtin' };
}

function genericFor(category) {
  if (category === 'serif') return 'serif';
  if (category === 'monospace') return 'monospace';
  if (category === 'handwriting') return 'cursive';
  if (category === 'display') return 'fantasy';
  return 'sans-serif';
}

// The exact CSS shorthand the card art draws with. Both the corner rank letter
// and the court-card centre letter go through here, so they can never drift
// apart — one control, one font, one weight.
export function fontShorthand(spec, sizePx) {
  return `${spec.weight} ${sizePx}px ${spec.family}`;
}

// ---------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------
// One promise per font id, cached forever. Re-selecting a font, re-rendering
// the preview on every slider tick, and starting an export all share the same
// in-flight promise instead of racing separate loads of the same family.
const loadPromises = new Map();
const loadFailures = new Map();

// The five builtin families come from the stylesheet <link> in cards.html.
// document.fonts.ready resolves once every font the document currently
// references has settled, which is the honest readiness signal for them.
function ensureBuiltinsReady() {
  if (!loadPromises.has('__builtin__')) {
    const p = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    loadPromises.set('__builtin__', p);
  }
  return loadPromises.get('__builtin__');
}

// Build the Google Fonts CSS2 URL for exactly one family at exactly one
// weight. display=block matters: with the default `swap`, a face that is still
// arriving renders as a fallback rather than as nothing — which is precisely
// the silent substitution this module exists to prevent.
function googleCssUrl(family, weight) {
  const fam = family.trim().replace(/ +/g, '+');
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${weight}&display=block`;
}

function injectStylesheet(href) {
  // getAttribute comparison rather than a [href="..."] selector: a CSS2 URL
  // is full of characters an attribute selector would need escaping for, and
  // a mis-escaped one silently matches nothing — which reads as "not yet
  // injected" and quietly duplicates the request.
  for (const link of document.querySelectorAll('link[data-cd-font]')) {
    if (link.getAttribute('href') !== href) continue;
    if (link.dataset.cdFontState === 'loaded') return Promise.resolve();
    if (link.dataset.cdFontState !== 'error') break; // still in flight; fall through and re-await
    // A previously failed <link> is removed rather than reused, so a retry
    // after a network blip actually re-requests instead of replaying the
    // old error.
    link.remove();
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cdFont = '1';
    link.addEventListener('load', () => { link.dataset.cdFontState = 'loaded'; resolve(); });
    link.addEventListener('error', () => {
      link.dataset.cdFontState = 'error';
      reject(new Error('Could not reach fonts.googleapis.com'));
    });
    document.head.appendChild(link);
  });
}

// The readiness proof, used by every path. document.fonts.load() resolves with
// the faces it MATCHED; an empty array means the family is not in the document
// font set at all and the canvas would silently fall back. See the note at the
// top of this file about why check() cannot stand in for this.
async function awaitFaces(spec) {
  const probe = `${spec.weight} 40px ${spec.family}`;
  const faces = await document.fonts.load(probe, 'AKQJ0123456789');
  const wanted = spec.googleFamily || spec.faceFamily;
  if (!wanted) return faces; // builtin stack — nothing of ours to match
  const matched = faces.filter((f) => f.family === wanted);
  if (!matched.length) {
    throw new Error(`"${wanted}" did not load — the canvas would fall back silently`);
  }
  const unloaded = matched.filter((f) => f.status !== 'loaded');
  if (unloaded.length) {
    throw new Error(`"${wanted}" matched ${matched.length} face(s) but ${unloaded.length} never finished loading`);
  }
  return matched;
}

// Resolves once `fontId` is genuinely paintable on a canvas; rejects if it
// cannot be. Idempotent and cached — call it as often as you like.
export function ensureFontLoaded(fontId) {
  const spec = resolveFont(fontId);

  if (spec.source === 'builtin') return ensureBuiltinsReady();

  if (loadFailures.has(spec.id)) return Promise.reject(loadFailures.get(spec.id));
  if (loadPromises.has(spec.id)) return loadPromises.get(spec.id);

  let p;
  if (spec.source === 'google') {
    p = injectStylesheet(googleCssUrl(spec.googleFamily, spec.weight))
      .then(() => awaitFaces(spec));
  } else {
    // Custom uploads are already registered in document.fonts by
    // registerCustomFont() — this is the same readiness proof applied to them,
    // so both sources answer to one interface.
    p = awaitFaces(spec);
  }

  p = p.catch((err) => {
      // Cache the failure so a 52-card export does not retry a dead family
      // 52 times, but drop the in-flight promise so an explicit reselect can.
      loadPromises.delete(spec.id);
      loadFailures.set(spec.id, err);
      throw err;
    });

  loadPromises.set(spec.id, p);
  return p;
}

// Clears a remembered failure so a retry is possible (used when the user
// picks the same font again after a network blip).
export function forgetFontFailure(fontId) {
  loadFailures.delete(resolveFont(fontId).id);
}

// The one call every render path makes. Takes a style object rather than an
// id so callers never have to know which style keys are fonts.
export function ensureStyleFontsLoaded(style) {
  return ensureFontLoaded(style && style.cornerFontId);
}

// ---------------------------------------------------------------------
// Custom uploads
// ---------------------------------------------------------------------
export const CUSTOM_FONT_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';
const CUSTOM_EXT = /\.(ttf|otf|woff2?)$/i;

// Registers an uploaded font file and returns its spec, resolved and loaded.
// Throws — with a message worth showing — if the file is not a font the
// browser can parse.
export async function registerCustomFont(file) {
  if (!file) throw new Error('No file selected.');
  if (!CUSTOM_EXT.test(file.name)) {
    throw new Error(`"${file.name}" is not a .ttf, .otf, .woff or .woff2 file.`);
  }

  const buffer = await file.arrayBuffer();

  // The internal family name is generated, never taken from the filename: it
  // has to be a valid CSS family that cannot collide with a Google family a
  // visitor might also pick, and filenames are neither.
  customCounter += 1;
  const faceFamily = `CardsUpload${customCounter}`;

  // weight '1 1000' is the important descriptor. Declared as a single weight,
  // a static face asked for 600 gets a SYNTHESISED bold smeared over it;
  // declaring the full range makes 600 an exact match, so the face renders as
  // its designer drew it — and a variable font with a wght axis still varies.
  let face;
  try {
    face = new FontFace(faceFamily, buffer, { weight: '1 1000', style: 'normal', display: 'block' });
  } catch {
    face = new FontFace(faceFamily, buffer);
  }

  try {
    await face.load();
  } catch (err) {
    throw new Error(`Could not read "${file.name}" as a font file — it may be corrupt or an unsupported format.`);
  }
  document.fonts.add(face);

  const spec = {
    id: CUSTOM_ID_PREFIX + customCounter,
    label: file.name.replace(CUSTOM_EXT, ''),
    fileName: file.name,
    faceFamily,
    family: `"${faceFamily}", sans-serif`,
    weight: TARGET_WEIGHT,
    source: 'custom',
    category: 'uploaded',
    sizeBytes: file.size,
  };
  customFonts.push(spec);

  // Prove it before handing it back, on the same instrument as everything
  // else — an added-but-unusable face would otherwise surface as a silent
  // fallback in the export.
  await ensureFontLoaded(spec.id);
  return spec;
}

// ---------------------------------------------------------------------
// Browsing — what the picker UI queries
// ---------------------------------------------------------------------
// Every selectable font, as picker rows. `group` drives the section headings.
function listAllFonts() {
  const rows = [];
  for (const f of customFonts) {
    rows.push({ id: f.id, label: f.label, category: 'uploaded', group: 'uploaded', family: f.family, weight: f.weight });
  }
  for (const f of BUILTIN_FONTS) {
    rows.push({ id: f.id, label: f.label, category: f.category, group: 'builtin', family: f.family, weight: TARGET_WEIGHT });
  }
  for (const f of GOOGLE_FONTS) {
    rows.push({
      id: googleFontId(f.name),
      label: f.name,
      category: f.category,
      group: 'google',
      family: `"${f.name}", ${genericFor(f.category)}`,
      weight: nearestWeight(f.weights),
    });
  }
  return rows;
}

// Case- and space-insensitive substring match, so "playfair" and
// "Playfair Display" both find it and "ibmplex" finds "IBM Plex Mono".
function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

// query: free text; category: one of FONT_CATEGORIES, 'uploaded', or '' for all.
export function searchFonts(query, category) {
  const q = normalize(query || '');
  const cat = category || '';
  const out = [];
  for (const row of listAllFonts()) {
    if (cat && row.category !== cat) continue;
    if (q && !normalize(row.label).includes(q)) continue;
    out.push(row);
  }
  return out;
}

export const GOOGLE_FONT_COUNT = GOOGLE_FONTS.length;
