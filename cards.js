// Cards — page wiring. Owns DOM/UI only: reads the suit uploads and
// palette, asks deck-builder.js / card-template.js to do the actual
// layout and drawing, and hands the results to the export modules.
import { PRINT_SPEC, SUITS, buildDeckList } from './cards/deck-builder.js';
import { renderCardToCanvas } from './cards/card-template.js';
import { exportDeckPDF } from './cards/pdf-export.js';
import { exportDeckZip } from './cards/png-export.js';

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

function getPalette() {
  return {
    primary: document.getElementById('colorPrimary').value,
    secondary: document.getElementById('colorSecondary').value,
  };
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
    renderPreview();
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
  renderPreview();
}

function renderSwatches() {
  const palette = getPalette();
  for (const suit of SUITS) {
    const canvas = document.querySelector(`canvas[data-suit="${suit}"]`);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Reuse the real card-drawing path via a 1-card mini render, cropped —
    // simplest way to guarantee the swatch always matches the deck.
    const spec = { suit, rank: 'A' };
    const full = renderCardToCanvas(spec, palette, suitImages);
    const safeFrac = 0.5; // roughly the glyph-filled center of an Ace card
    const sx = full.width * (0.5 - safeFrac / 2);
    const sy = full.height * (0.5 - safeFrac / 2);
    ctx.drawImage(full, sx, sy, full.width * safeFrac, full.height * safeFrac, 0, 0, canvas.width, canvas.height);
  }
}

// ---------------------------------------------------------------------
// Preview grid (subset — Ace + King of each suit)
// ---------------------------------------------------------------------
function renderPreview() {
  const palette = getPalette();
  const grid = document.getElementById('previewGrid');
  grid.innerHTML = '';
  for (const spec of PREVIEW_SPECS) {
    const canvas = renderCardToCanvas(spec, palette, suitImages);
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
  const palette = getPalette();
  const specs = buildDeckList();
  const cards = [];
  for (let i = 0; i < specs.length; i++) {
    const canvas = renderCardToCanvas(specs[i], palette, suitImages);
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
    setStatus('Rendering 52 cards…');
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
  renderSpecText();
  renderPreview();

  document.getElementById('colorPrimary').addEventListener('input', renderPreview);
  document.getElementById('colorSecondary').addEventListener('input', renderPreview);
  document.getElementById('btnExportPdf').addEventListener('click', () => handleExport('pdf'));
  document.getElementById('btnExportZip').addEventListener('click', () => handleExport('zip'));

  // Corner-index and court-card text is drawn on <canvas>, which paints
  // with whatever font is available at draw time — if Fraunces/IBM Plex
  // Mono are still loading, the first render falls back silently to a
  // system font. Re-render once the webfonts are confirmed ready so the
  // preview (and any export run right after load) uses the real type.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(renderPreview);
  }
}

init();
