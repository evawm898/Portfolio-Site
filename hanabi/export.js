// hanabi/export.js — print PDF (imposed sheets, crop marks, bleed, optional
// duplex backs) and a ZIP of per-card PNGs at 300 dpi.
//
// Both read the SAME SVG strings the preview inlines (hanabi/layout.js),
// rasterised through the browser's own SVG renderer. Cards carry no text in
// any font (hanabi/symbols.js draws the numerals as strokes), so there is no
// webfont to await before a card may be drawn.
//
// jsPDF and JSZip are loaded globally from the cdnjs pins in hanabi.html
// (window.jspdf.jsPDF, window.JSZip) — no bundler, the same as /cards.

import { cardGeom, deckCards, imposition, backSlotIndex, cropMarks, suitById } from './deck.js';
import { renderFace, renderBack } from './layout.js';

export const DPI = 300;
export const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);

export function svgToCanvas(svg, wPx, hPx) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = wPx; c.height = hPx;
      c.getContext('2d').drawImage(img, 0, 0, wPx, hPx);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('card SVG failed to rasterise')); };
    img.src = url;
  });
}

// One raster per DISTINCT face: duplicates of a suit+rank share a spec and
// therefore a picture, so they are drawn once and reused.
async function rasterDeck(design, onProgress) {
  const g = cardGeom(design), px = { w: mmToPx(g.fullW), h: mmToPx(g.fullH) };
  const cards = deckCards(design), cache = new Map(), out = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const key = c.kind === 'card' ? `${c.suitId}-${c.rank}` : c.kind;
    if (!cache.has(key)) cache.set(key, await svgToCanvas(renderFace(design, c, { px }), px.w, px.h));
    out.push({ card: c, key, canvas: cache.get(key) });
    if (onProgress) onProgress(i + 1, cards.length);
    if (i % 6 === 5) await new Promise((r) => setTimeout(r, 0));
  }
  const back = await svgToCanvas(renderBack(design, { px }), px.w, px.h);
  return { faces: out, back, px };
}

export function fileName(card, i) {
  const n = String(i + 1).padStart(2, '0');
  if (card.kind !== 'card') return `${n}-token-${card.kind}-${card.copy + 1}.png`;
  return `${n}-${card.suitId}-${card.rank}${String.fromCharCode(97 + card.copy)}.png`;
}

// The part of a card raster a slot places: the whole bleed box in 'separate'
// mode, the trim plus its outer-edge bleed in 'shared' mode.
function cropCanvas(canvas, src, g) {
  const sx = (src.x / g.fullW) * canvas.width, sy = (src.y / g.fullH) * canvas.height;
  const sw = (src.w / g.fullW) * canvas.width, sh = (src.h / g.fullH) * canvas.height;
  const c = document.createElement('canvas');
  c.width = Math.round(sw); c.height = Math.round(sh);
  c.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

export async function exportPdf(design, { onProgress, filename = 'hanabi-deck.pdf', returnDoc = false } = {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('jsPDF failed to load — check the CDN <script> tag in hanabi.html.');
  const imp = imposition(design, design.print.paper);
  if (!imp.perSheet) throw new Error('this card size does not fit on the chosen paper');
  const { faces, back } = await rasterDeck(design, onProgress);
  const P = imp.paper, g = imp.geom;
  const doc = new jsPDF({ unit: 'mm', format: [P.w, P.h], orientation: P.orientation, compress: true });
  // One embedded image per distinct (picture, crop): the alias makes jsPDF
  // reuse it, so three red 1s cost one image.
  const images = new Map();
  const place = (key, canvas, slot) => {
    const sk = `${slot.src.x},${slot.src.y},${slot.src.w},${slot.src.h}`, alias = `${key}@${sk}`;
    if (!images.has(alias)) images.set(alias, cropCanvas(canvas, slot.src, g).toDataURL('image/png'));
    doc.addImage(images.get(alias), 'PNG', slot.draw.x, slot.draw.y, slot.draw.w, slot.draw.h, alias, 'FAST');
  };
  const marks = cropMarks(imp);
  const drawMarks = () => {
    if (!design.print.cropMarks) return;
    doc.setDrawColor(0); doc.setLineWidth(0.15);
    for (const [x1, y1, x2, y2] of marks) doc.line(x1, y1, x2, y2);
  };
  const newPage = () => doc.addPage([P.w, P.h], P.orientation);
  const sheets = Math.ceil(faces.length / imp.perSheet);
  let pages = 0;
  for (let sh = 0; sh < sheets; sh++) {
    if (pages++) newPage();
    const batch = faces.slice(sh * imp.perSheet, (sh + 1) * imp.perSheet);
    batch.forEach((fc, i) => place(fc.key, fc.canvas, imp.slots[i]));
    drawMarks();
    if (design.print.duplex) {
      newPage(); pages++;
      // The back of face slot i prints in the mirrored slot, so a long- (or
      // short-) edge flip puts it behind its own face.
      batch.forEach((_, i) => place('back', back, imp.slots[backSlotIndex(imp, i, design.print.flip)]));
      drawMarks();
    }
  }
  if (!design.print.duplex) {
    // Without duplex the backs are one full sheet, to print as many times as needed.
    newPage(); pages++;
    imp.slots.forEach((sl) => place('back', back, sl));
    drawMarks();
  }
  doc.setProperties({ title: 'Hanabi deck', creator: 'eva-maskalenko.com/hanabi' });
  if (returnDoc) return { doc, imp, pages, sheets };
  doc.save(filename);
  return { imp, pages, sheets };
}

export async function exportZip(design, { onProgress, filename = 'hanabi-deck-png.zip', returnBlob = false } = {}) {
  if (!window.JSZip) throw new Error('JSZip failed to load — check the CDN <script> tag in hanabi.html.');
  const { faces, back, px } = await rasterDeck(design, onProgress);
  const zip = new window.JSZip();
  const blobs = new Map();
  const blobOf = (key, canvas) => { if (!blobs.has(key)) blobs.set(key, new Promise((r) => canvas.toBlob(r, 'image/png'))); return blobs.get(key); };
  for (let i = 0; i < faces.length; i++) zip.file(fileName(faces[i].card, i), await blobOf(faces[i].key, faces[i].canvas));
  zip.file('back.png', await new Promise((r) => back.toBlob(r, 'image/png')));
  const names = faces.map((fc, i) => {
    const c = fc.card;
    return `${fileName(c, i)}\t${c.kind === 'card' ? `${suitById(design, c.suitId).name} ${c.rank}` : c.kind + ' token'}`;
  });
  zip.file('README.txt', `Hanabi deck — ${faces.length} faces + back.png, ${DPI} dpi, ${px.w} x ${px.h} px each, bleed included.\n\n${names.join('\n')}\n`);
  const blob = await zip.generateAsync({ type: 'blob' });
  if (returnBlob) return blob;
  downloadBlob(blob, filename);
  return blob;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
