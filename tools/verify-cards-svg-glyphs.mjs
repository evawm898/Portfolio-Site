/*
 * verify-cards-svg-glyphs.mjs — real-artwork gate for the /cards deck builder's
 * suit-glyph upload path (cards/card-template.js, cards/deck-builder.js,
 * cards.js).
 *
 * WHY: every other cards verification pass to date (including the PR #117
 * corner-index/style work) only ever exercised the built-in placeholder
 * glyphs — simple, roughly square paths traced in a -1..1 box. Nothing had
 * uploaded a real SVG through "01 SUIT GLYPHS" and checked what actually
 * happens: does canvas tinting (getTintedImage's source-in trick) really
 * recolor artwork regardless of its own preset fill/stroke, does the
 * anti-overlap corner-index fix and the diagonal glyph-offset slider (both
 * tuned against placeholder geometry) hold up against odd aspect ratios, and
 * — the one that would be a real production bug — does drawing a
 * blob:-URL-loaded <img> onto the export canvas ever taint it (toDataURL /
 * toBlob throwing SecurityError)?
 *
 * WHAT IT DOES: serves the repo, loads /cards.html in headless Chromium,
 * uploads four fixture SVGs (cards/test-fixtures/svg/) through the real file
 * <input> — not by constructing suitImages directly — so this exercises the
 * exact code path a visitor's upload takes. Then it:
 *   1. samples a non-white pixel from each rendered preview card and checks
 *      it matches the current primary/secondary palette color exactly;
 *   2. calls canvas.toDataURL() / canvas.toBlob() on a post-upload canvas —
 *      a tainted canvas throws or resolves null here, which is the one
 *      failure mode that would silently break both export buttons;
 *   3. renders the full 52-card deck through renderCardToCanvas at several
 *      style configs (corner inset / font / glyph scale / glyph offset, at
 *      and beyond their slider extremes) with the four fixture images
 *      substituted for the placeholders, and asserts zero page errors and
 *      zero per-card exceptions.
 * It does NOT drive the jsPDF/JSZip export buttons themselves — those load
 * from cdnjs at runtime and a sandboxed CI/dev network may block that CDN
 * entirely (this gate does not depend on outbound access beyond the local
 * server). The canvas-serialization checks in step 2 are what those export
 * paths actually call, so they're covered without needing the CDN scripts.
 *
 * FIXTURES (cards/test-fixtures/svg/) — deliberately NOT placeholder-shaped:
 *   - spade-square.svg          100x100, explicit width/height, single path
 *   - heart-wide-nowh.svg       viewBox 300x180 only (NO width/height attrs —
 *                                the intrinsic-size fallback many export
 *                                tools produce), grouped multi-path, each
 *                                path pre-set to a different original fill
 *   - diamond-tall-stroke.svg   60x140 (tall), stroke-only (fill:none) —
 *                                tests recoloring artwork that has no fill
 *   - clover-offset-viewbox.svg viewBox origin at (-40,-60), transformed
 *                                <g>, mixed preset fill+stroke
 *
 * REQUIREMENTS (dev-only; the deployed site needs none of this):
 *   npm i playwright-core        # npm-registry allowlisted
 *
 * RUN:  node tools/verify-cards-svg-glyphs.mjs
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX_DIR = path.join(ROOT, 'cards/test-fixtures/svg');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const SUIT_FILES = {
  spades: 'spade-square.svg',
  hearts: 'heart-wide-nowh.svg',
  diamonds: 'diamond-tall-stroke.svg',
  clubs: 'clover-offset-viewbox.svg',
};

const PALETTE = { primary: '#1c6b6b', secondary: '#b23b3b' };
const PRIMARY_RGB = [0x1c, 0x6b, 0x6b];
const SECONDARY_RGB = [0xb2, 0x3b, 0x3b];

// Style configs to sweep the full 52-card deck at, chosen to bracket every
// slider's range (not just its default) — see CLAUDE.md working-agreement
// item 1: state cost/risk before implying a feature is fine, so this
// deliberately includes both extremes of each control, and CROSSES the three
// independent scale sliders rather than only moving them together.
const STYLE_CONFIGS = [
  { label: 'defaults', style: { cornerInsetPct: 4.5, cornerFontId: 'plex-mono', glyphScale: 1, glyphOffsetPct: 30, cornerFontScale: 1, courtPlateScale: 1, courtLetterScale: 1 } },
  { label: 'tightest (min inset, min scale, no offset, mono)', style: { cornerInsetPct: 2, cornerFontId: 'space-mono', glyphScale: 0.5, glyphOffsetPct: 0, cornerFontScale: 0.5, courtPlateScale: 0.5, courtLetterScale: 0.5 } },
  { label: 'loosest (max inset, max scale, max offset, serif)', style: { cornerInsetPct: 10, cornerFontId: 'fraunces', glyphScale: 1.5, glyphOffsetPct: 100, cornerFontScale: 1.5, courtPlateScale: 1.5, courtLetterScale: 1.5 } },
  { label: 'playfair mid', style: { cornerInsetPct: 6, cornerFontId: 'playfair', glyphScale: 1.2, glyphOffsetPct: 60, cornerFontScale: 1.2, courtPlateScale: 0.8, courtLetterScale: 1.3 } },
  // The scale sliders are independent of each other, so their extremes have to
  // be crossed, not just moved together: a big plate around a small letter and
  // the reverse are both reachable and both have to render.
  { label: 'big plate, small letter, big corner', style: { cornerInsetPct: 4.5, cornerFontId: 'plex-sans', glyphScale: 1, glyphOffsetPct: 30, cornerFontScale: 1.5, courtPlateScale: 1.5, courtLetterScale: 0.5 } },
  { label: 'small plate, big letter, small corner', style: { cornerInsetPct: 8, cornerFontId: 'fraunces', glyphScale: 1.3, glyphOffsetPct: 10, cornerFontScale: 0.5, courtPlateScale: 0.5, courtLetterScale: 1.5 } },
];

let failures = 0;
function check(cond, msg) {
  if (cond) { console.log('  ok   ' + msg); }
  else { console.error('  FAIL ' + msg); failures++; }
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/cards.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(`http://localhost:${port}/cards.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(500);

// ---------------------------------------------------------------------
// 1. Upload the four fixtures through the real file <input> and confirm
//    canvas tinting recolors each to the current palette, regardless of
//    the fixture's own preset fill/stroke.
// ---------------------------------------------------------------------
console.log('Uploading fixture SVGs through the real "01 SUIT GLYPHS" file inputs...');
for (const [suit, file] of Object.entries(SUIT_FILES)) {
  const input = await page.$(`#suitFile-${suit}`);
  await input.setInputFiles(path.join(FIX_DIR, file));
  await page.waitForTimeout(200);
}
await page.waitForTimeout(400);

const pixelSamples = await page.evaluate(() => {
  const canvases = document.querySelectorAll('#previewGrid canvas');
  const labels = ['spadesA', 'spadesK', 'heartsA', 'heartsK', 'diamondsA', 'diamondsK', 'clubsA', 'clubsK'];
  const out = {};
  canvases.forEach((canvas, i) => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    let best = null;
    for (let fx = 0.15; fx <= 0.85; fx += 0.04) {
      for (let fy = 0.15; fy <= 0.85; fy += 0.04) {
        const x = Math.floor(fx * w), y = Math.floor(fy * h);
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        if (a > 0 && !(r > 250 && g > 250 && b > 250)) best = [r, g, b];
      }
    }
    out[labels[i]] = best;
  });
  return out;
});

function isColor(px, target) {
  return px && Math.abs(px[0] - target[0]) <= 2 && Math.abs(px[1] - target[1]) <= 2 && Math.abs(px[2] - target[2]) <= 2;
}

console.log('Checking tinted pixel colors match the current palette...');
for (const key of ['spadesA', 'spadesK', 'clubsA', 'clubsK']) {
  check(isColor(pixelSamples[key], PRIMARY_RGB) || isColor(pixelSamples[key], SECONDARY_RGB), `${key} sample ${JSON.stringify(pixelSamples[key])} is an exact palette color`);
}
for (const key of ['heartsA', 'heartsK', 'diamondsA', 'diamondsK']) {
  check(isColor(pixelSamples[key], PRIMARY_RGB) || isColor(pixelSamples[key], SECONDARY_RGB), `${key} sample ${JSON.stringify(pixelSamples[key])} is an exact palette color`);
}
// The suit's OWN color must appear somewhere (not just the court plate's
// "other" color) — spot-check the Ace, which only ever draws in its own
// suit's color.
check(isColor(pixelSamples.spadesA, PRIMARY_RGB), 'spadesA (own color) is primary, not secondary — confirms real fill/stroke on the fixture did not leak through tinting');
check(isColor(pixelSamples.heartsA, SECONDARY_RGB), 'heartsA (own color) is secondary — confirms the wide/grouped/multi-fill fixture tints correctly');
check(isColor(pixelSamples.diamondsA, SECONDARY_RGB), 'diamondsA (own color) is secondary — confirms a stroke-only (fill:none) fixture still tints');
check(isColor(pixelSamples.clubsA, PRIMARY_RGB), 'clubsA (own color) is primary — confirms a non-zero-origin viewBox with a transformed <g> tints correctly');

// ---------------------------------------------------------------------
// 2. Canvas-taint check — this is what would silently break both export
//    buttons in production. blob: URLs from a local File are same-origin
//    and should never taint, but this is exactly the kind of thing that
//    only shows up when you actually go through the upload path.
// ---------------------------------------------------------------------
console.log('Checking export-path canvas serialization (toDataURL / toBlob) is not tainted...');
const taintResult = await page.evaluate(async () => {
  const canvases = document.querySelectorAll('#previewGrid canvas');
  const out = {};
  try {
    out.dataUrlLen = canvases[0].toDataURL('image/png').length;
  } catch (e) {
    out.dataUrlError = e.name + ': ' + e.message;
  }
  out.blobSize = await new Promise((resolve) => {
    canvases[2].toBlob((blob) => resolve(blob ? blob.size : null), 'image/png');
  });
  return out;
});
check(taintResult.dataUrlLen > 0 && !taintResult.dataUrlError, `canvas.toDataURL() succeeded (${taintResult.dataUrlLen} chars) — not tainted`);
check(typeof taintResult.blobSize === 'number' && taintResult.blobSize > 0, `canvas.toBlob() succeeded (${taintResult.blobSize} bytes) — not tainted`);

// ---------------------------------------------------------------------
// 3. Full 52-card deck across several style configs, with the fixture
//    images substituted for the placeholders, via the same
//    renderCardToCanvas() entry point cards.js uses for export.
// ---------------------------------------------------------------------
console.log('Rendering the full 52-card deck across', STYLE_CONFIGS.length, 'style configs with real SVG glyphs...');
const svgTexts = {};
for (const [suit, file] of Object.entries(SUIT_FILES)) svgTexts[suit] = fs.readFileSync(path.join(FIX_DIR, file), 'utf8');

const deckResult = await page.evaluate(async ({ svgTexts, palette, styleConfigs }) => {
  const mod = await import('./cards/card-template.js');
  const deckMod = await import('./cards/deck-builder.js');

  function loadImg(svgText) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    });
  }
  const suitImages = {};
  for (const suit of Object.keys(svgTexts)) suitImages[suit] = await loadImg(svgTexts[suit]);

  const specs = deckMod.buildDeckList();
  let count = 0;
  const errors = [];
  for (const cfg of styleConfigs) {
    for (const spec of specs) {
      try {
        const canvas = mod.renderCardToCanvas(spec, palette, suitImages, cfg.style);
        if (canvas.width <= 0 || canvas.height <= 0) throw new Error('zero-size canvas');
        count++;
      } catch (e) {
        errors.push(`${cfg.label} / ${spec.suit}${spec.rank}: ${e.message}`);
      }
    }
  }
  return { count, errors, expected: specs.length * styleConfigs.length };
}, { svgTexts, palette: PALETTE, styleConfigs: STYLE_CONFIGS });

check(deckResult.errors.length === 0, `0 render errors across the full deck sweep (${deckResult.errors.slice(0, 5).join('; ')})`);
check(deckResult.count === deckResult.expected, `rendered ${deckResult.count}/${deckResult.expected} expected canvases`);
check(pageErrors.length === 0, `0 uncaught page errors (${pageErrors.slice(0, 3).join('; ')})`);

await browser.close();
server.close();

console.log('');
if (failures > 0) {
  console.error(`verify-cards-svg-glyphs: ${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('verify-cards-svg-glyphs: all checks passed');
}
