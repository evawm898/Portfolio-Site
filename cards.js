// Cards — page wiring. Owns DOM/UI only: reads the suit uploads, palette and
// style, asks deck-builder.js / card-template.js to do the actual layout and
// drawing, and hands the results to the export modules.
//
// ASYNC CONTRACT (the reason so much of this file returns a promise): a
// <canvas> paints text with whatever font is resolvable at the instant
// fillText() runs. A font that has not finished loading is not waited for and
// does not throw — it is silently swapped for a fallback. So EVERY path that
// draws a card awaits the selected font first: renderPreview(), the swatches
// it drives, and renderFullDeck(), which both exports go through. See the
// header of cards/font-manager.js for why document.fonts.check() is not the
// test used.
import { PRINT_SPEC, SUITS, buildDeckList } from './cards/deck-builder.js';
import { renderCardToCanvas, DEFAULT_STYLE } from './cards/card-template.js';
import { exportDeckPDF } from './cards/pdf-export.js';
import { exportDeckZip } from './cards/png-export.js';
import {
  CUSTOM_FONT_ACCEPT,
  DEFAULT_FONT_ID,
  FONT_CATEGORIES,
  GOOGLE_FONT_COUNT,
  ensureFontLoaded,
  ensureStyleFontsLoaded,
  forgetFontFailure,
  registerCustomFont,
  resolveFont,
  searchFonts,
} from './cards/font-manager.js';

const SUIT_LABELS = { spades: 'Spades', hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs' };

// Representative subset shown live in the preview grid — the Ace and King
// of every suit (8 cards). The full 52-card render only happens on export,
// so editing colors/glyphs stays instant.
const PREVIEW_SPECS = SUITS.flatMap((suit) => [
  { suit, rank: 'A' },
  { suit, rank: 'K' },
]);

// suit -> loaded <img> or null (falls back to the built-in placeholder
// glyph in card-template.js).
const suitImages = { spades: null, hearts: null, diamonds: null, clubs: null };

// The selected font id, held here rather than read back off a <select> — the
// picker is a list of buttons now, and this is its single source of truth.
let selectedFontId = DEFAULT_FONT_ID;

function getPalette() {
  return {
    primary: document.getElementById('colorPrimary').value,
    secondary: document.getElementById('colorSecondary').value,
  };
}

// ---------------------------------------------------------------------
// Style panel (03) — deck-wide only, no per-suit variants in this pass.
// ---------------------------------------------------------------------
function getStyle() {
  return {
    cornerInsetPct: parseFloat(document.getElementById('styleCornerInset').value),
    cornerFontId: selectedFontId,
    glyphScale: pct('styleGlyphScale'),
    glyphOffsetPct: parseFloat(document.getElementById('styleGlyphOffset').value),
    cornerFontScale: pct('styleCornerFontScale'),
    courtPlateScale: pct('styleCourtPlateScale'),
    courtLetterScale: pct('styleCourtLetterScale'),
  };
}

function pct(id) {
  return parseFloat(document.getElementById(id).value) / 100;
}

function buildStyleControls() {
  // [element id, initial value]. All six read as a percentage and all six read
  // back through getStyle(), so each reaches the preview AND both export paths
  // — there is no separate export-side style object to keep in step.
  const SLIDERS = [
    ['styleCornerInset', DEFAULT_STYLE.cornerInsetPct],
    ['styleGlyphScale', Math.round(DEFAULT_STYLE.glyphScale * 100)],
    ['styleGlyphOffset', DEFAULT_STYLE.glyphOffsetPct],
    ['styleCornerFontScale', Math.round(DEFAULT_STYLE.cornerFontScale * 100)],
    ['styleCourtPlateScale', Math.round(DEFAULT_STYLE.courtPlateScale * 100)],
    ['styleCourtLetterScale', Math.round(DEFAULT_STYLE.courtLetterScale * 100)],
  ];

  for (const [id, initial] of SLIDERS) {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}Value`);
    input.value = initial;
    output.textContent = `${input.value}%`;
    input.addEventListener('input', () => {
      output.textContent = `${input.value}%`;
      requestPreview();
    });
  }
}

// ---------------------------------------------------------------------
// Font picker — search + category filter over the whole Google Fonts
// catalog, the five site fonts, and anything uploaded this session.
// ---------------------------------------------------------------------

// Only this many rows are put in the DOM at once. The catalog is ~1,900
// families; rendering all of them on every keystroke is what makes a picker
// like this feel broken. Narrowing the search is the intended way to reach
// row 200 — hence the "refine your search" count line below the list.
const MAX_ROWS = 80;

const GROUP_LABELS = {
  uploaded: 'Your uploads',
  builtin: 'Site fonts',
  google: 'Google Fonts',
};

let fontQuery = '';
let fontCategory = ''; // '' = all

function buildCategoryChips() {
  const box = document.getElementById('fontCategories');
  box.innerHTML = '';
  const cats = [{ value: '', label: 'All' }, ...FONT_CATEGORIES.map((c) => ({ value: c, label: c === 'sans-serif' ? 'sans' : c }))];
  for (const c of cats) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cd-font-cat';
    btn.textContent = c.label;
    btn.dataset.category = c.value;
    btn.setAttribute('aria-pressed', String(c.value === fontCategory));
    btn.addEventListener('click', () => {
      fontCategory = fontCategory === c.value ? '' : c.value;
      for (const el of box.children) el.setAttribute('aria-pressed', String(el.dataset.category === fontCategory));
      renderFontList();
    });
    box.appendChild(btn);
  }
}

// Row previews load lazily and are PURELY decorative: a row whose family has
// not arrived (or cannot) simply stays in the panel's own mono face. This is
// the one place fonts are fetched without anything awaiting them, which is
// safe precisely because nothing is drawn from it.
const rowObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target;
      if (!entry.isIntersecting) {
        clearTimeout(Number(el.dataset.previewTimer));
        continue;
      }
      // A 200ms dwell before fetching, so flicking the list from A to Z does
      // not fire a request for every family that flashed past.
      const timer = setTimeout(() => {
        rowObserver.unobserve(el);
        const id = el.dataset.fontId;
        ensureFontLoaded(id).then(
          () => { el.querySelector('.cd-font-row__name').style.fontFamily = resolveFont(id).family; },
          () => { /* decorative only — leave the row in the UI font */ },
        );
      }, 200);
      el.dataset.previewTimer = String(timer);
    }
  }, { root: null, rootMargin: '0px', threshold: 0.1 })
  : null;

function renderFontList() {
  const list = document.getElementById('fontList');
  const countEl = document.getElementById('fontCount');
  const matches = searchFonts(fontQuery, fontCategory);

  list.innerHTML = '';
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'cd-font-empty';
    empty.textContent = 'No font matches that search.';
    list.appendChild(empty);
    countEl.textContent = `0 of ${GOOGLE_FONT_COUNT} Google fonts`;
    return;
  }

  const shown = matches.slice(0, MAX_ROWS);
  let lastGroup = null;
  for (const row of shown) {
    if (row.group !== lastGroup) {
      const head = document.createElement('div');
      head.className = 'cd-font-group';
      head.textContent = GROUP_LABELS[row.group];
      list.appendChild(head);
      lastGroup = row.group;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cd-font-row';
    btn.dataset.fontId = row.id;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', String(row.id === selectedFontId));

    const name = document.createElement('span');
    name.className = 'cd-font-row__name';
    name.textContent = row.label;

    const meta = document.createElement('span');
    meta.className = 'cd-font-row__meta';
    meta.textContent = row.category === 'sans-serif' ? 'sans' : row.category;

    btn.append(name, meta);
    btn.addEventListener('click', () => { selectFont(row.id); });
    list.appendChild(btn);

    // The row's own family is only fetched once the row is actually on
    // screen — this is what keeps "browse 1,891 families" from meaning
    // "download 1,891 families".
    if (rowObserver && row.group === 'google') rowObserver.observe(btn);
    else name.style.fontFamily = row.family;
  }

  countEl.textContent = matches.length > shown.length
    ? `Showing ${shown.length} of ${matches.length} matches — refine the search to see more.`
    : `${matches.length} font${matches.length === 1 ? '' : 's'}.`;
}

function setFontStatus(text, isError) {
  const el = document.getElementById('fontStatus');
  el.textContent = text;
  el.classList.toggle('cd-font-status--error', Boolean(isError));
}

function markSelectedRow() {
  for (const el of document.querySelectorAll('.cd-font-row')) {
    el.setAttribute('aria-selected', String(el.dataset.fontId === selectedFontId));
  }
  document.getElementById('fontCurrentName').textContent = resolveFont(selectedFontId).label;
}

// Selecting a font commits it, then re-renders. renderPreview() awaits the
// load itself, so the preview can never paint a half-loaded family — the
// status line here exists only to say what is happening while it does.
async function selectFont(fontId) {
  const previous = selectedFontId;
  selectedFontId = fontId;
  markSelectedRow();

  const spec = resolveFont(fontId);
  forgetFontFailure(fontId); // a re-click is an explicit retry
  setFontStatus(`Loading ${spec.label}…`);
  try {
    await renderPreview();
    setFontStatus(`${spec.label} · weight ${spec.weight} · ready.`);
  } catch (err) {
    // Fall back to what was working rather than leaving the deck set in a
    // font that will not export.
    selectedFontId = previous;
    markSelectedRow();
    setFontStatus(`${spec.label} could not be loaded (${err.message}). Kept ${resolveFont(previous).label}.`, true);
    // Restoring the previous font is a best effort — it was rendering a
    // moment ago, and if it somehow cannot now, the message above already
    // says the deck is not in the font that was asked for.
    await renderPreview().catch(() => {});
  }
}

async function onFontUpload(file, inputEl) {
  if (!file) return;
  setFontStatus(`Reading ${file.name}…`);
  try {
    const spec = await registerCustomFont(file);
    fontQuery = '';
    fontCategory = '';
    document.getElementById('fontSearch').value = '';
    buildCategoryChips();
    renderFontList();
    await selectFont(spec.id);
    setFontStatus(`${spec.label} uploaded and ready (${(spec.sizeBytes / 1024).toFixed(0)} KB).`);
  } catch (err) {
    setFontStatus(err.message, true);
  } finally {
    // Clear the input so re-picking the same file fires `change` again.
    if (inputEl) inputEl.value = '';
  }
}

function buildFontPicker() {
  buildCategoryChips();
  renderFontList();
  markSelectedRow();

  const search = document.getElementById('fontSearch');
  search.placeholder = `Search ${GOOGLE_FONT_COUNT.toLocaleString()} Google fonts…`;
  search.addEventListener('input', () => {
    fontQuery = search.value;
    renderFontList();
  });

  const upload = document.getElementById('fontUpload');
  // Kept in step with the extension check in registerCustomFont() rather than
  // repeated in the markup, so the two can never disagree about .otf.
  upload.setAttribute('accept', CUSTOM_FONT_ACCEPT);
  upload.addEventListener('change', (e) => {
    onFontUpload(e.target.files[0], e.target);
  });
}

// ---------------------------------------------------------------------
// Suit upload rows
// ---------------------------------------------------------------------
function buildSuitRows() {
  const container = document.getElementById('suitRows');
  container.innerHTML = '';

  for (const suit of SUITS) {
    const row = document.createElement('div');
    row.className = 'cd-suit-row';

    const swatch = document.createElement('div');
    swatch.className = 'cd-suit-row__swatch';
    const swatchCanvas = document.createElement('canvas');
    swatchCanvas.width = 56;
    swatchCanvas.height = 56;
    swatchCanvas.dataset.suit = suit;
    swatch.appendChild(swatchCanvas);

    const name = document.createElement('div');
    name.className = 'cd-suit-row__name';
    name.textContent = SUIT_LABELS[suit];

    const fileLabel = document.createElement('label');
    fileLabel.className = 'cd-file-btn';
    fileLabel.textContent = 'SVG';
    const input = document.createElement('input');
    input.type = 'file';
    input.id = `suitFile-${suit}`;
    input.accept = '.svg,image/svg+xml';
    input.addEventListener('change', (e) => onSuitFileChange(suit, e.target.files[0]));
    fileLabel.appendChild(input);

    const fileNameEl = document.createElement('div');
    fileNameEl.className = 'cd-suit-row__file';
    fileNameEl.textContent = 'placeholder';
    fileNameEl.id = `suitFileName-${suit}`;

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'cd-clear-btn';
    clearBtn.textContent = 'clear';
    clearBtn.addEventListener('click', () => clearSuitFile(suit));

    row.append(swatch, name, fileNameEl, fileLabel, clearBtn);
    container.appendChild(row);
  }
}

function onSuitFileChange(suit, file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    suitImages[suit] = img;
    document.getElementById(`suitFileName-${suit}`).textContent = file.name;
    requestPreview();
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    setStatus(`Could not read "${file.name}" as an image — check it's a valid SVG.`);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function clearSuitFile(suit) {
  suitImages[suit] = null;
  document.getElementById(`suitFileName-${suit}`).textContent = 'placeholder';
  document.getElementById(`suitFile-${suit}`).value = '';
  requestPreview();
}

// Callers must already have awaited the style's font — every one of them
// reaches here from inside renderPreview(), which does.
function renderSwatches() {
  const palette = getPalette();
  const style = getStyle();
  for (const suit of SUITS) {
    const canvas = document.querySelector(`canvas[data-suit="${suit}"]`);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Reuse the real card-drawing path via a 1-card mini render, cropped —
    // simplest way to guarantee the swatch always matches the deck.
    const spec = { suit, rank: 'A' };
    const full = renderCardToCanvas(spec, palette, suitImages, style);
    const safeFrac = 0.5; // roughly the glyph-filled center of an Ace card
    const sx = full.width * (0.5 - safeFrac / 2);
    const sy = full.height * (0.5 - safeFrac / 2);
    ctx.drawImage(full, sx, sy, full.width * safeFrac, full.height * safeFrac, 0, 0, canvas.width, canvas.height);
  }
}

// ---------------------------------------------------------------------
// Preview grid (subset — Ace + King of each suit)
// ---------------------------------------------------------------------
// Serialised: a slider dragged while a font is still arriving would otherwise
// let an older render finish last and paint over a newer one.
let previewChain = Promise.resolve();

// Returns a promise that REJECTS if the render could not happen (the font did
// not load). Callers that can act on that — selectFont — await it; everything
// else goes through requestPreview() below.
function renderPreview() {
  const run = previewChain.then(drawPreviewNow, drawPreviewNow);
  // The chain the next render waits on must never be a rejected promise, or
  // one failed font would poison every subsequent slider tick.
  previewChain = run.catch(() => {});
  return run;
}

// Fire-and-forget preview, for the controls that cannot do anything useful
// with a failure beyond saying so. Without this, an un-awaited rejection from
// a slider tick would surface as an unhandled promise rejection.
function requestPreview() {
  renderPreview().catch((err) => setFontStatus(`Preview failed: ${err.message}`, true));
}

async function drawPreviewNow() {
  const style = getStyle();
  // The await that makes the preview honest. It is also what makes the
  // preview a fair witness for the export: both wait on the same promise.
  await ensureStyleFontsLoaded(style);

  const palette = getPalette();
  const grid = document.getElementById('previewGrid');
  grid.innerHTML = '';
  for (const spec of PREVIEW_SPECS) {
    const canvas = renderCardToCanvas(spec, palette, suitImages, style);
    const cell = document.createElement('div');
    cell.className = 'cd-card';
    cell.appendChild(canvas);
    grid.appendChild(cell);
  }
  renderSwatches();
}

// ---------------------------------------------------------------------
// Full 52-card render, used by both export paths
// ---------------------------------------------------------------------
async function renderFullDeck(onProgress) {
  const style = getStyle();
  // THE export-critical await. Reaching this with the font still in flight —
  // which is exactly what happens when a font is picked and "Download PDF" is
  // clicked in the same second — is how 52 pages come out in a fallback face
  // that matched nothing on screen. Nothing below draws until it resolves.
  await ensureStyleFontsLoaded(style);

  const palette = getPalette();
  const specs = buildDeckList();
  const cards = [];
  for (let i = 0; i < specs.length; i++) {
    const canvas = renderCardToCanvas(specs[i], palette, suitImages, style);
    cards.push({ ...specs[i], canvas });
    if (onProgress) onProgress(i + 1, specs.length);
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }
  return cards;
}

function setStatus(text) {
  document.getElementById('exportStatus').textContent = text;
}

function setExportingState(isExporting) {
  document.getElementById('btnExportPdf').disabled = isExporting;
  document.getElementById('btnExportZip').disabled = isExporting;
}

async function handleExport(kind) {
  setExportingState(true);
  try {
    const fontLabel = resolveFont(getStyle().cornerFontId).label;
    setStatus(`Loading ${fontLabel}…`);
    const cards = await renderFullDeck((done, total) => {
      setStatus(`Rendering 52 cards… ${done}/${total}`);
    });

    if (kind === 'pdf') {
      setStatus('Assembling PDF…');
      await exportDeckPDF(cards, {
        onProgress: (done, total) => setStatus(`Assembling PDF… ${done}/${total}`),
      });
      setStatus('PDF downloaded.');
    } else {
      setStatus('Assembling ZIP…');
      await exportDeckZip(cards, {
        onProgress: (done, total) => setStatus(`Assembling ZIP… ${done}/${total}`),
      });
      setStatus('ZIP downloaded.');
    }
  } catch (err) {
    console.error(err);
    setStatus(`Export failed: ${err.message}`);
  } finally {
    setExportingState(false);
  }
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
function renderSpecText() {
  const el = document.getElementById('specText');
  el.innerHTML = [
    `Trim &nbsp;${PRINT_SPEC.TRIM_W_IN}&Prime; &times; ${PRINT_SPEC.TRIM_H_IN}&Prime;`,
    `Bleed &nbsp;${PRINT_SPEC.BLEED_IN}&Prime; / side`,
    `Sheet &nbsp;${PRINT_SPEC.PAGE_W_IN}&Prime; &times; ${PRINT_SPEC.PAGE_H_IN}&Prime;`,
    `Resolution &nbsp;${PRINT_SPEC.DPI} DPI (${PRINT_SPEC.PAGE_W_PX}&times;${PRINT_SPEC.PAGE_H_PX}px)`,
  ].join('<br>');
}

function init() {
  buildSuitRows();
  buildStyleControls();
  buildFontPicker();
  renderSpecText();
  // Not awaited — init() runs synchronously so the page is interactive
  // immediately; the first paint waits on the default font inside
  // renderPreview() rather than blocking module evaluation.
  requestPreview();

  document.getElementById('colorPrimary').addEventListener('input', requestPreview);
  document.getElementById('colorSecondary').addEventListener('input', requestPreview);
  document.getElementById('btnExportPdf').addEventListener('click', () => handleExport('pdf'));
  document.getElementById('btnExportZip').addEventListener('click', () => handleExport('zip'));

  // A hook the font gate (tools/verify-cards-fonts.mjs) drives, so the race it
  // tests is the page's real one — pick a cold font and hit export in the same
  // tick, with no awaiting in between — rather than a re-implementation of it.
  window.__cards = { selectFont, renderFullDeck, renderPreview, getStyle, resolveFont, ensureFontLoaded };
}

init();
