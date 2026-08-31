// PNG Export — same 52 cards, bundled into a single ZIP via JSZip, loaded
// globally via CDN script tag in cards.html (window.JSZip).

// cards: array of { suit, rank, canvas }. onProgress(done, total) optional.
export async function exportDeckZip(cards, { onProgress, filename = 'deck-png.zip' } = {}) {
  if (!window.JSZip) {
    throw new Error('JSZip failed to load — check the CDN <script> tag in cards.html.');
  }
  const zip = new window.JSZip();

  for (let i = 0; i < cards.length; i++) {
    const { suit, rank, canvas } = cards[i];
    const blob = await canvasToBlob(canvas);
    const name = `${String(i + 1).padStart(2, '0')}-${suit}-${rankFileToken(rank)}.png`;
    zip.file(name, blob);
    if (onProgress) onProgress(i + 1, cards.length);
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, filename);
}

function rankFileToken(rank) {
  return rank === '10' ? '10' : rank;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
