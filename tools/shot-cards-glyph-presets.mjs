/*
 * shot-cards-glyph-presets.mjs — review sheet for the /cards built-in
 * suit-glyph families (cards/glyph-presets.js).
 *
 * Four glyph rows (Placeholder, Classic, Minimal, Hand-drawn) x 4 suits,
 * each at "picker size" (24px — the smallest size a suit glyph is actually
 * drawn at on a card, the corner-index mini glyph) and "large size" (100px
 * — the ace glyph's own order of magnitude), on a light panel and a dark
 * panel. Below that, one fully rendered card per family, read out of the
 * REAL app the same way the gate does (canvas -> PNG), never a mock.
 *
 * A fourth family, "Ornate", was built, iterated and then dropped entirely
 * on Eva's ruling before this ever reached main — see cards/glyph-
 * presets.js's own header. Nothing about it is reproduced here.
 *
 * RUN:  node tools/shot-cards-glyph-presets.mjs <out-dir>
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'cards-glyph-review');
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/cards.html';
  const abs = path.join(ROOT, p);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const BASE = `http://localhost:${port}`;

const SUIT_FILE = { spades: 'spade', hearts: 'heart', diamonds: 'diamond', clubs: 'club' };

// The built-in canvas placeholder paths (card-template.js PLACEHOLDER_PATHS,
// -1..1 space) converted to SVG path data at the same convention as the
// other families' files, purely for this comparison sheet.
const PLACEHOLDER_SVG = {
  spades: 'M0,-1 C0.95,-0.35 0.85,0.5 0.05,0.55 L0.3,1 L-0.3,1 L-0.05,0.55 C-0.85,0.5 -0.95,-0.35 0,-1 Z',
  hearts: 'M0,1 C-1.05,0.15 -0.85,-0.9 0,-0.35 C0.85,-0.9 1.05,0.15 0,1 Z',
  diamonds: 'M0,-1 L0.65,0 L0,1 L-0.65,0 Z',
  clubs: 'M0,-0.87 A0.42,0.42 0 1,1 0.001,-0.87 M0.38,0.18 A0.42,0.42 0 1,1 0.381,0.18 M-0.38,0.18 A0.42,0.42 0 1,1 -0.379,0.18 M0.16,1 L0.16,0.35 L-0.16,0.35 L-0.16,1 Z',
};
function svgWrap(d, viewBox) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path d="${d}" fill="#111"/></svg>`;
}

const rows = [
  { label: 'Placeholder', suits: Object.fromEntries(Object.entries(PLACEHOLDER_SVG).map(([s, d]) => [s, svgWrap(d, '-1.1 -1.1 2.2 2.2')])) },
  { label: 'Classic', suits: Object.fromEntries(Object.keys(SUIT_FILE).map((suit) => [suit, fs.readFileSync(path.join(ROOT, `assets/cards/glyph-presets/classic/${SUIT_FILE[suit]}.svg`), 'utf8')])) },
  { label: 'Minimal', suits: Object.fromEntries(Object.keys(SUIT_FILE).map((suit) => [suit, fs.readFileSync(path.join(ROOT, `assets/cards/glyph-presets/minimal/${SUIT_FILE[suit]}.svg`), 'utf8')])) },
  { label: 'Hand-drawn', suits: Object.fromEntries(Object.keys(SUIT_FILE).map((suit) => [suit, fs.readFileSync(path.join(ROOT, `assets/cards/glyph-presets/handdrawn/${SUIT_FILE[suit]}.svg`), 'utf8')])) },
];

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const context = await browser.newContext();
const CDN_LOCAL = {
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': path.join(ROOT, 'node_modules/jspdf/dist/jspdf.umd.min.js'),
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js': path.join(ROOT, 'node_modules/jszip/dist/jszip.min.js'),
};
for (const [url, file] of Object.entries(CDN_LOCAL)) {
  await context.route(url, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) }));
}
await context.route('**://fonts.googleapis.com/**', (route) => route.abort());
await context.route('**://fonts.gstatic.com/**', (route) => route.abort());

const page = await context.newPage();
await page.goto(`${BASE}/cards.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.__cards, null, { timeout: 20000 });
await page.waitForTimeout(500);

async function clickFamily(id) {
  await page.click(`#glyphFamilies button[data-family="${id}"]`);
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------
// One fully rendered card per family, from the real app.
// ---------------------------------------------------------------------
const cardShots = {};
async function grabCard(label) {
  const buf = await page.evaluate((i) => document.querySelectorAll('#previewGrid canvas')[i].toDataURL('image/png'), 0);
  cardShots[label] = buf;
}
await clickFamily('classic'); await grabCard('Classic');
await clickFamily('minimal'); await grabCard('Minimal');
await clickFamily('handdrawn'); await grabCard('Hand-drawn');
// Placeholder: reload fresh so nothing carries over.
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => window.__cards, null, { timeout: 20000 });
await page.waitForTimeout(500);
await grabCard('Placeholder');

await browser.close();
server.close();

// ---------------------------------------------------------------------
// Build the sheet HTML and screenshot it.
// ---------------------------------------------------------------------
// invert=true recolors the glyph's own ink to WHITE for the dark panel —
// literally rendering the shipped BLACK-fill art against a dark page
// background is not a legibility comparison, it is a blank rectangle (an
// opaque black shape on near-black is invisible), which is exactly the
// degenerate case a real "light and dark backgrounds" check would want to
// catch rather than silently reproduce. CSS invert(1) flips only RGB, so a
// black fill on a transparent SVG background becomes white on transparent
// — the holes stay holes (transparent stays transparent) either way.
function glyphCell(svg, sizePx, invert) {
  const filter = invert ? 'filter:invert(1);' : '';
  return `<div style="width:${sizePx}px;height:${sizePx}px;display:flex;align-items:center;justify-content:center;${filter}">${svg.replace('<svg ', `<svg width="${sizePx}" height="${sizePx}" `)}</div>`;
}
function panel(bg, fg, invert) {
  return rows.map((row) => {
    const cap = row.caption ? `<div style="font-size:10px;color:${fg};opacity:0.75;margin:2px 0 6px;max-width:640px;">${row.caption}</div>` : '';
    return `
    <div style="margin-bottom:18px;">
      <div style="font-size:13px;font-weight:600;color:${fg};margin-bottom:4px;">${row.label}</div>
      ${cap}
      <div style="display:flex;gap:24px;">
        ${Object.keys(SUIT_FILE).map((suit) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            ${glyphCell(row.suits[suit], 100, invert)}
            <div style="font-size:9px;color:${fg};opacity:0.6;">large (100px box)</div>
            ${glyphCell(row.suits[suit], 24, invert)}
            <div style="font-size:9px;color:${fg};opacity:0.6;">picker (24px — corner-index size)</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, sans-serif; }
  .half { padding: 24px; }
  .cards-row { display: flex; gap: 16px; flex-wrap: wrap; padding: 24px; background: #e8e8e8; }
  .cards-row img { width: 140px; border: 1px solid #ccc; display: block; }
  .cards-row figcaption { font-size: 11px; text-align: center; margin-top: 4px; }
</style></head><body>
<div class="half" style="background:#ffffff;">
  <h2 style="font-size:16px;">LIGHT background (ink as shipped — black fill)</h2>
  ${panel('#ffffff', '#111111', false)}
</div>
<div class="half" style="background:#191919;">
  <h2 style="font-size:16px;color:#eee;">DARK background (ink inverted to white — see the tool's own comment on glyphCell for why)</h2>
  ${panel('#191919', '#eeeeee', true)}
</div>
<div class="cards-row">
  <h2 style="width:100%;font-size:16px;">One fully rendered card per family (ace of spades, from the real app)</h2>
  ${Object.entries(cardShots).map(([label, buf]) => `<figure style="margin:0;"><img src="${buf}"><figcaption>${label}</figcaption></figure>`).join('')}
</div>
</body></html>`;

fs.writeFileSync(path.join(OUT, 'sheet.html'), html);

const shotBrowser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const shotPage = await shotBrowser.newPage({ viewport: { width: 1400, height: 800 } });
await shotPage.goto(`file://${path.join(OUT, 'sheet.html')}`);
await shotPage.waitForTimeout(300);
await shotPage.screenshot({ path: path.join(OUT, 'cards-glyph-review.png'), fullPage: true });
await shotBrowser.close();

console.log(`\nWrote ${path.join(OUT, 'sheet.html')}`);
console.log(`Wrote ${path.join(OUT, 'cards-glyph-review.png')}`);
