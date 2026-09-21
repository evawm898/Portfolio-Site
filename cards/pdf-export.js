// PDF Export — 52 individual pages, one card per page, each page sized to
// the full bleed rect (trim + bleed on all sides) so a print vendor can
// take the file as-is. Depends on jsPDF, loaded globally via CDN script
// tag in cards.html (window.jspdf.jsPDF) — no bundler, matching the rest
// of this site's tool pages.

import { PRINT_SPEC } from './deck-builder.js';

// cards: array of { suit, rank, canvas } in the order they should appear
// in the PDF. onProgress(done, total) is optional, called after each page.
export async function exportDeckPDF(cards, { onProgress, filename = 'deck.pdf' } = {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    throw new Error('jsPDF failed to load — check the CDN <script> tag in cards.html.');
  }

  const w = PRINT_SPEC.PAGE_W_IN;
  const h = PRINT_SPEC.PAGE_H_IN;
  const doc = new jsPDF({ unit: 'in', format: [w, h], orientation: 'portrait' });

  for (let i = 0; i < cards.length; i++) {
    if (i > 0) doc.addPage([w, h], 'portrait');
    const dataUrl = cards[i].canvas.toDataURL('image/png');
    doc.addImage(dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST');
    if (onProgress) onProgress(i + 1, cards.length);
    // Yield to the event loop periodically so the tab doesn't lock up.
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }

  doc.save(filename);
}
