/*
 * verify-cards-fonts.mjs — the async-correctness gate for the /cards font
 * system (cards/font-manager.js, cards/card-template.js, cards.js).
 *
 * THE BUG THIS EXISTS TO CATCH
 * A <canvas> paints text with whatever font is resolvable at the instant
 * fillText() runs. A webfont that has not finished loading is not waited for
 * and does not throw — it is silently replaced by a fallback. So the failure
 * mode here is not a crash or a blank card: it is 52 PDF pages set in Times
 * that looked correct in the preview a second earlier. Nothing on screen ever
 * reports it. Only the exported file does, and only if someone opens it.
 *
 * So this gate refuses to accept the preview canvas as evidence. Every claim
 * about a font is made against the BYTES OF AN EXPORTED FILE: the PDF's
 * embedded page images, inflated back to pixels by tools/pdfimg.mjs, and the
 * PNGs inside the exported ZIP, decoded by tools/pngdec.mjs.
 *
 * HOW "THE RIGHT FONT" IS MEASURED
 * Comparing a render to a stored reference image would fail on every Chromium
 * rasterisation change, so the instrument is differential instead. For each
 * font under test the gate renders the same card three ways and compares ink
 * signatures (pixel count + bounding box + column profile of the corner rank
 * letter):
 *   - the font itself, after its load is confirmed;
 *   - a deliberately absent family, which is what a silent fallback looks like;
 *   - the default (IBM Plex Mono).
 * A font PASSES only if its signature differs from BOTH controls by more than
 * the noise floor, and if the exported file's signature matches the confirmed
 * in-page one. That second half is the load-bearing part: "matches a preview
 * that itself fell back" would otherwise pass, so the fallback control is
 * checked first and the export is compared against the verified render.
 *
 * THE RACE
 * The headline check drives the page's own handlers: pick a font that has
 * never been loaded and start the full 52-card export IN THE SAME TICK, with
 * nothing awaited in between.
 *
 * FALSIFIABILITY — measured, not asserted. Two mutations were run against a
 * working tree, and what each one moved is the reason the checks are shaped
 * the way they are:
 *   - deleting `await ensureFontLoaded(...)` from renderFullDeck() in cards.js
 *     fails exactly two checks: "RACE: identical to the same card rendered
 *     warm" (0.413) and "PDF card 13 matches the verified in-page render"
 *     (0.413). Every OTHER check stayed green — including "RACE: the card is
 *     NOT a fallback", which still measured 1.460. That is the finding worth
 *     keeping: "the export does not look like a fallback" DOES NOT CATCH THIS
 *     BUG. A cold family falls back to its own stack's generic (fantasy for a
 *     display face, cursive for a handwriting one), which is nothing like the
 *     browser default, so a differs-from-fallback test passes happily on a
 *     broken export. Only comparing against the SAME card rendered with the
 *     font confirmed loaded separates them.
 *   - deleting the `await` in drawPreviewNow() fails "the preview canvas drawn
 *     during the cold selection is Bungee" (0.716) — and nothing else in this
 *     gate sees it, which is why that check reads the preview grid's own
 *     canvas rather than re-rendering.
 *
 * NETWORK
 * cdnjs (jsPDF/JSZip) and fonts.googleapis.com are both commonly unreachable
 * from a sandboxed CI runner, and Chromium here cannot open a TLS tunnel
 * through the agent proxy at all. So the harness serves BOTH locally:
 *   - jsPDF 2.5.1 / JSZip 3.10.1 from node_modules, at the exact cdnjs URLs
 *     cards.html pins, so the page under test is unmodified;
 *   - Google Fonts CSS and woff2 fetched by NODE (which can reach them) and
 *     replayed into the page verbatim, so the real CSS2 response and the real
 *     font bytes are what get parsed. Cached under tools/.cache/google-fonts/
 *     so a second run needs no network at all.
 * The custom-upload half needs no network in any case — its two fixture fonts
 * are committed under cards/test-fixtures/fonts/.
 *
 * REQUIREMENTS (dev-only; the deployed site needs none of this):
 *   npm i --no-save playwright-core jspdf@2.5.1 jszip
 *
 * RUN:  node tools/verify-cards-fonts.mjs
 *       node tools/verify-cards-fonts.mjs --shots <dir>   # contact sheet
 *       node tools/verify-cards-fonts.mjs --negative-control
 *           Draws the same card before and after a cold font arrives and
 *           asserts the two differ — i.e. that the "matches the verified
 *           render" comparisons above are not vacuous. Run it before quoting
 *           a pass from a changed harness.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
import { decodePNG } from './pngdec.mjs';
import { extractPdfImages, pdfPageCount } from './pdfimg.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_FIX = path.join(ROOT, 'cards/test-fixtures/fonts');
const CACHE = path.join(ROOT, 'tools/.cache/google-fonts');
const NEGATIVE = process.argv.includes('--negative-control');
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx >= 0 ? path.resolve(process.argv[shotsIdx + 1]) : null;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.woff': 'font/woff', '.png': 'image/png',
};

// A Google family nothing on the page preloads, from a category the site's own
// five fonts do not occupy, with a silhouette that cannot be confused with a
// fallback: heavy slab display caps.
const GOOGLE_TEST_FAMILY = 'Bungee';
const GOOGLE_TEST_ID = 'g:' + GOOGLE_TEST_FAMILY;
// A second one, picked so the race check uses a family the earlier checks
// never touched — a warm cache would make that test vacuous.
const RACE_FAMILY = 'Rye';
const RACE_ID = 'g:' + RACE_FAMILY;

// The three faces the court-letter centring is measured on, chosen because
// their vertical ink sits in three different places relative to the em box:
// a script face hangs far below the baseline and reaches far above it, a heavy
// display face is nearly all cap-height with no descender, and a monospace
// face is the one the old fixed fudge factor happened to be tuned for.
const CENTERING_FONTS = [
  { id: 'g:Great Vibes', label: 'Great Vibes (script)' },
  { id: 'g:Bungee', label: 'Bungee (heavy display)' },
  { id: 'plex-mono', label: 'IBM Plex Mono (monospace)' },
];
const SCRIPT_FAMILY = 'Great Vibes';

const CUSTOM_WOFF2 = path.join(FONT_FIX, 'bungee-latin.woff2');
const CUSTOM_TTF = path.join(FONT_FIX, 'Silkscreen-Regular.ttf');

const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let failures = 0;
let checks = 0;
function check(cond, msg) {
  checks++;
  if (cond) console.log('  ok   ' + msg);
  else { console.error('  FAIL ' + msg); failures++; }
}
function section(title) { console.log('\n' + title); }

// ---------------------------------------------------------------------
// Local static server for the repo, plus the two pinned CDN scripts served
// from node_modules at the exact URLs cards.html asks for.
// ---------------------------------------------------------------------
const CDN_LOCAL = {
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': path.join(ROOT, 'node_modules/jspdf/dist/jspdf.umd.min.js'),
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js': path.join(ROOT, 'node_modules/jszip/dist/jszip.min.js'),
};
for (const [url, file] of Object.entries(CDN_LOCAL)) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${path.relative(ROOT, file)} for ${url}\nRun: npm i --no-save jspdf@2.5.1 jszip playwright-core`);
    process.exit(2);
  }
}

// Harness helpers are served as a real module from this origin. An inline
// module added with addScriptTag({content}) resolves BEFORE it has finished
// evaluating, so window.__harnessReady below is the only honest signal.
const HARNESS_JS = `
import { resolveFont, ensureFontLoaded } from '/cards/font-manager.js';
import { renderCardToCanvas, getCourtPlateRect, DEFAULT_STYLE } from '/cards/card-template.js';
import { getSafeRect } from '/cards/deck-builder.js';

// Render one card and hand back its raw RGBA. \`awaitFont\` is the parameter
// under test: false is the mutation the negative control uses.
window.__renderCardRGBA = async (fontId, { awaitFont = true } = {}) => {
  if (awaitFont) await ensureFontLoaded(fontId);
  else ensureFontLoaded(fontId).catch(() => {});
  const style = { ...window.__cards.getStyle(), cornerFontId: fontId };
  const canvas = renderCardToCanvas({ suit: 'spades', rank: 'K' },
    { primary: '#1c6b6b', secondary: '#b23b3b' }, {}, style);
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: Array.from(d.data) };
};

// What a silent fallback looks like: the same corner index, same size, same
// colour, same baseline — drawn in a family that cannot exist. Geometry is
// copied from drawCornerIndices() rather than imported so this control stays
// a control even if that function changes.
window.__renderFallbackRGBA = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 825; canvas.height = 1125;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1c6b6b';
  ctx.font = '600 ' + Math.round(675 * 0.11) + 'px "Zzz Absolutely No Such Family"';
  ctx.textAlign = 'left'; ctx.textBaseline = 'hanging';
  ctx.fillText('K', 90 + 675 * 0.045, 90 + 675 * 0.045);
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: Array.from(d.data) };
};

window.__fontState = async (fontId) => {
  const spec = resolveFont(fontId);
  const wanted = spec.googleFamily || spec.faceFamily;
  // A Google CSS2 response declares one @font-face PER SUBSET (latin,
  // latin-ext, vietnamese...). Only the subset whose unicode-range covers the
  // text is ever fetched, so the others sit at status 'unloaded' forever and
  // are not evidence of anything. document.fonts.load(font, text) applies that
  // same filter, so its return value — not a sweep of document.fonts — is what
  // "is this font ready for these characters?" means.
  const matched = (await document.fonts.load(spec.weight + ' 40px ' + spec.family, 'AKQJ0123456789'))
    .filter((f) => !wanted || f.family === wanted)
    .map((f) => ({ family: f.family, status: f.status, weight: f.weight }));
  const declared = [];
  for (const f of document.fonts) {
    if (!wanted || f.family === wanted) declared.push({ status: f.status, weight: f.weight });
  }
  return { spec, faces: matched, declared };
};

// Reads a canvas straight out of the on-page preview grid, so the preview
// itself can be measured — not a re-render that does its own awaiting.
// Render any card at any style and hand back its pixels PLUS the plate rect
// the drawing code computed — so a centring claim is checked against the same
// numbers that drew it, not against a re-derivation that agrees with itself.
window.__renderStyledRGBA = async (spec, styleOverrides, { awaitFont = true } = {}) => {
  const style = { ...DEFAULT_STYLE, ...window.__cards.getStyle(), ...styleOverrides };
  if (awaitFont) await ensureFontLoaded(style.cornerFontId);
  const canvas = renderCardToCanvas(spec, { primary: '#1c6b6b', secondary: '#b23b3b' }, {}, style);
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: Array.from(d.data),
    plate: getCourtPlateRect(getSafeRect(), style),
    safe: getSafeRect(),
  };
};

// The centring method this change REPLACED: em-box centring plus the fixed
// -8%-of-plate-height fudge that was tuned against IBM Plex Mono. Drawn here
// so the new checks can be shown to separate the two, rather than asserted to.
window.__renderLegacyCenteredRGBA = async (rank, fontId, styleOverrides) => {
  const style = { ...DEFAULT_STYLE, ...window.__cards.getStyle(), cornerFontId: fontId, ...styleOverrides };
  await ensureFontLoaded(style.cornerFontId);
  const safe = getSafeRect();
  const plate = getCourtPlateRect(safe, style);
  const spec = resolveFont(style.cornerFontId);
  const canvas = document.createElement('canvas');
  canvas.width = 825; canvas.height = 1125;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const letterSize = Math.round(safe.h * 0.42 * 0.62 * style.courtLetterScale);
  ctx.fillStyle = '#b23b3b';
  ctx.font = spec.weight + ' ' + letterSize + 'px ' + spec.family;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rank, plate.cx, plate.cy - plate.h * 0.08);
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: Array.from(d.data), plate, safe };
};

window.__previewRGBA = (index) => {
  const c = document.querySelectorAll('#previewGrid canvas')[index];
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: Array.from(d.data) };
};

window.__harnessReady = true;
`;

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/cards.html';
  if (p === '/__harness.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(HARNESS_JS);
    return;
  }
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

// ---------------------------------------------------------------------
// Google Fonts replay — fetched in Node, cached on disk, fulfilled into the
// page. The page's own code path (inject <link> -> await document.fonts.load)
// is untouched; only the transport is local.
// ---------------------------------------------------------------------
fs.mkdirSync(CACHE, { recursive: true });
let networkFetches = 0;
let googleFontsReachable = true;

function cachePath(url) {
  const safe = url.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 150);
  return path.join(CACHE, safe);
}

async function fetchUpstream(url, contentType) {
  const cp = cachePath(url);
  if (fs.existsSync(cp)) return fs.readFileSync(cp);
  const res = await fetch(url, { headers: { 'user-agent': BROWSER_UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(cp, buf);
  networkFetches++;
  return buf;
}

// Warm the cache for the families this run needs, before Chromium starts, so
// a network failure is reported once and clearly rather than as an opaque
// font-load timeout inside the page.
async function warmGoogleCache(families) {
  for (const { family, weight } of families) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=block`;
    const css = (await fetchUpstream(cssUrl)).toString('utf8');
    for (const m of css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
      await fetchUpstream(m[1]);
    }
  }
}

// ---------------------------------------------------------------------
// Ink signature — the measurement everything else rests on.
// ---------------------------------------------------------------------
// The top-left corner of a card, where the rank letter is drawn. Expressed as
// a fraction of the full-bleed page so it follows PRINT_SPEC rather than
// hard-coded pixels.
const CROP = { x0: 0.06, y0: 0.05, x1: 0.30, y1: 0.20 };

// Counts ink (anything meaningfully darker than the white card) in the corner
// crop and describes where it sits. Two different typefaces at the same size
// disagree on all four numbers; the same typeface rendered twice agrees
// exactly. Works identically on an in-page canvas, a decoded PNG and an
// inflated PDF image, which is the point.
function inkSignature(rgba, width, height) {
  const x0 = Math.floor(CROP.x0 * width), x1 = Math.floor(CROP.x1 * width);
  const y0 = Math.floor(CROP.y0 * height), y1 = Math.floor(CROP.y1 * height);
  let count = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  const cols = new Array(16).fill(0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      // The card ground is pure white; the index is a saturated palette
      // colour. Anything below 200 luma is ink, antialiasing included.
      const luma = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
      if (luma < 200) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        cols[Math.floor(((x - x0) / (x1 - x0)) * 16)]++;
      }
    }
  }
  return {
    count,
    box: maxX < 0 ? [0, 0, 0, 0] : [minX - x0, minY - y0, maxX - x0, maxY - y0],
    cols,
  };
}

// Relative difference between two signatures, 0 = identical.
function sigDistance(a, b) {
  const denom = Math.max(a.count, b.count, 1);
  const countDiff = Math.abs(a.count - b.count) / denom;
  let colDiff = 0, colTotal = 0;
  for (let i = 0; i < a.cols.length; i++) {
    colDiff += Math.abs(a.cols[i] - b.cols[i]);
    colTotal += Math.max(a.cols[i], b.cols[i]);
  }
  const boxDiff = a.box.reduce((s, v, i) => s + Math.abs(v - b.box[i]), 0) / 100;
  return countDiff + (colTotal ? colDiff / colTotal : 0) + boxDiff;
}

// Ink bounding box inside an arbitrary sub-rect, in page pixels. Returns null
// when the rect holds no ink at all.
function inkBoxIn(rgba, width, x0, y0, x1, y1) {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.ceil(y1); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.ceil(x1); x++) {
      const i = (y * width + x) * 4;
      const luma = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
      if (luma < 200) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (count === 0) return null;
  return { minX, maxX, minY, maxY, count, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

// Rows of ink in a sub-rect, grouped into vertically separated bands, with the
// blank gap between consecutive bands. Two objects that never touch are two
// bands; the moment they meet they become one.
function inkBands(rgba, width, x0, y0, x1, y1) {
  const rows = [];
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    let has = false;
    for (let x = Math.max(0, Math.floor(x0)); x < Math.ceil(x1) && !has; x++) {
      const i = (y * width + x) * 4;
      const luma = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
      if (luma < 200) has = true;
    }
    rows.push(has);
  }
  const bands = [];
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && start < 0) start = i;
    if (!rows[i] && start >= 0) { bands.push([start + Math.floor(y0), i - 1 + Math.floor(y0)]); start = -1; }
  }
  if (start >= 0) bands.push([start + Math.floor(y0), rows.length - 1 + Math.floor(y0)]);
  const gaps = [];
  for (let i = 1; i < bands.length; i++) gaps.push(bands[i][0] - bands[i - 1][1] - 1);
  return { bands, gaps };
}

// Two renders of the same typeface must land here; two different typefaces
// must not. Calibrated against the identical-render case, which measures 0.
const SAME = 0.02;
const DIFFERENT = 0.15;

// ---------------------------------------------------------------------
await warmGoogleCache([
  { family: GOOGLE_TEST_FAMILY, weight: 400 },
  { family: RACE_FAMILY, weight: 400 },
  { family: SCRIPT_FAMILY, weight: 400 },
]).catch((err) => {
  googleFontsReachable = false;
  console.error(`\n!! Could not reach fonts.googleapis.com: ${err.message}`);
  console.error('!! The Google-font checks cannot run. The uploaded-font checks still will.');
});

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const context = await browser.newContext({ acceptDownloads: true });

// Everything the page asks of the outside world is answered locally. An
// unmatched external request is a FAILURE, not a fallback: a gate that
// quietly let fonts.googleapis.com time out would be testing the fallback
// path while claiming to test the font.
const unroutedExternal = [];

// ORDER MATTERS: Playwright gives precedence to the LAST matching route, so
// the catch-all has to be registered FIRST or it swallows every specific
// handler below it. Getting this backwards aborts the very requests the gate
// replays and turns the whole run into an accidental test of the fallback
// path — which is exactly what it exists to catch, so it would look almost
// plausible.
await context.route('**', async (route) => {
  const url = route.request().url();
  if (!url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:')) {
    unroutedExternal.push(url);
    return route.abort();
  }
  return route.continue();
});
await context.route('https://cdnjs.cloudflare.com/**', async (route) => {
  const file = CDN_LOCAL[route.request().url()];
  if (!file) { unroutedExternal.push(route.request().url()); return route.abort(); }
  await route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) });
});
await context.route('https://fonts.gstatic.com/**', async (route) => {
  try {
    const body = await fetchUpstream(route.request().url());
    await route.fulfill({ status: 200, contentType: 'font/woff2', body });
  } catch { unroutedExternal.push(route.request().url()); await route.abort(); }
});
await context.route('https://fonts.googleapis.com/**', async (route) => {
  try {
    const body = await fetchUpstream(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/css', body });
  } catch { unroutedExternal.push(route.request().url()); await route.abort(); }
});

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });

await page.goto(`${BASE}/cards.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.__cards && document.querySelectorAll('#previewGrid canvas').length === 8, null, { timeout: 20000 });

// ---------------------------------------------------------------------
// Shared page helpers, installed once.
// ---------------------------------------------------------------------
async function installHarness(target) {
  await target.evaluate(() => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/__harness.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('harness module failed to load'));
    document.head.appendChild(s);
  }));
  await target.waitForFunction(() => window.__harnessReady === true, null, { timeout: 15000 });
}
await installHarness(page);

// The picker's status line is the page's own readiness signal: "… · ready.",
// "… uploaded and ready", or an error. Waiting on any settled state (rather
// than on success alone) means a load failure is REPORTED here instead of
// timing out 30 seconds later with no explanation.
async function settled(timeout = 30000) {
  await page.waitForFunction(
    () => /ready\.?$|ready \(|could not be loaded|Preview failed/.test(document.getElementById('fontStatus').textContent.trim()),
    null,
    { timeout },
  );
}

async function renderSig(fontId, opts) {
  const r = await page.evaluate(([id, o]) => window.__renderCardRGBA(id, o), [fontId, opts || {}]);
  return { sig: inkSignature(Buffer.from(r.data), r.width, r.height), width: r.width, height: r.height };
}

// ---------------------------------------------------------------------
section('1. Controls — what a not-loaded font looks like, and the noise floor');
// ---------------------------------------------------------------------
const fallback = await page.evaluate(() => window.__renderFallbackRGBA());
const fallbackSig = inkSignature(Buffer.from(fallback.data), fallback.width, fallback.height);
check(fallbackSig.count > 0, `an absent family still draws a full corner index (${fallbackSig.count}px of substituted ink) — a font failure is INVISIBLE, not blank`);

const defaultSig = (await renderSig('plex-mono')).sig;
check(defaultSig.count > 0, `the default (IBM Plex Mono) draws ${defaultSig.count}px of ink`);
check(sigDistance(defaultSig, fallbackSig) > DIFFERENT,
  `default vs fallback differ (${sigDistance(defaultSig, fallbackSig).toFixed(3)} > ${DIFFERENT}) — the instrument can tell a real font from a substituted one`);

// Self-consistency: the same font twice must be identical, or every
// "different" verdict below would be noise.
const defaultSig2 = (await renderSig('plex-mono')).sig;
check(sigDistance(defaultSig, defaultSig2) < SAME,
  `the same font rendered twice is identical (${sigDistance(defaultSig, defaultSig2).toFixed(4)} < ${SAME}) — the noise floor is zero`);

// ---------------------------------------------------------------------
section('2. Disclosure — the panel collapses without disconnecting anything');
// ---------------------------------------------------------------------
// Native <details>, so the open/closed state is the browser's, not a flag this
// page has to keep in step. The failure worth guarding against is the one the
// bloom panel already shipped once (CLAUDE.md): a control that is present and
// declared but no longer drives a rebuild once its section is folded away.
const sections = await page.$$eval('details.cd-panel__section', (els) =>
  els.map((e) => ({ id: e.id, open: e.open, summary: e.querySelector('summary').textContent.trim() })));
check(sections.length === 6, `all 6 numbered sections are <details> (${sections.map((x) => x.id).join(', ')})`);
check(sections.every((x) => /^\d\d/.test(x.summary)),
  `every summary keeps its numbered label (${sections.map((x) => x.summary).join(' | ')})`);
const openIds = sections.filter((x) => x.open).map((x) => x.id).join(',');
check(openIds === 'section-01,section-02,section-05',
  `default-open set is the two short setup sections plus Export — got "${openIds}"`);

// The font picker is its OWN section now, not a field buried in Style — the
// two long things in this panel are long for different reasons and are reached
// separately.
check(sections[2].summary.startsWith('03Font'), `03 is the Font section (summary "${sections[2].summary}")`);
check(sections[3].summary.startsWith('04Style'), `04 is Style (summary "${sections[3].summary}")`);
check(await page.$eval('#section-03 #fontList', (e) => Boolean(e)), 'the font list lives inside 03 Font');
check(await page.$eval('#section-04 #styleCourtPlateScale', (e) => Boolean(e)), 'the sliders live inside 04 Style');

// The selected family is legible while the section is SHUT — the reason to
// give the summary a value readout at all.
const shutReadout = await page.$eval('#fontCurrentName', (e) => ({
  text: e.textContent.trim(),
  inSummary: Boolean(e.closest('summary')),
  visible: e.getBoundingClientRect().height > 0,
}));
check(shutReadout.inSummary && shutReadout.visible && shutReadout.text === 'IBM Plex Mono',
  `the collapsed 03 Font summary still names the selected family ("${shutReadout.text}")`);

// Both long sections start closed; a slider inside one must still work while
// it is.
const fontClosed = await page.$eval('#section-03', (e) => !e.open);
const styleClosed = await page.$eval('#section-04', (e) => !e.open);
check(fontClosed && styleClosed, '03 Font and 04 Style — the two sections that made the panel scroll — start collapsed');

async function driveSlider(id, value) {
  return page.evaluate(([elId, v]) => {
    const el = document.getElementById(elId);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { value: el.value, readback: document.getElementById(elId + 'Value').textContent };
  }, [id, value]);
}

{
  const before = await page.evaluate(() => window.__previewRGBA(1));
  const beforeSig = inkSignature(Buffer.from(before.data), before.width, before.height);
  const drive = await driveSlider('styleCornerFontScale', 150);
  check(drive.value === '150' && drive.readback === '150%',
    `a slider inside the COLLAPSED section still reads and writes (value ${drive.value}, label "${drive.readback}")`);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__previewRGBA(1));
  const afterSig = inkSignature(Buffer.from(after.data), after.width, after.height);
  check(sigDistance(beforeSig, afterSig) > DIFFERENT,
    `...and still rebuilds the preview from inside a collapsed section (${sigDistance(beforeSig, afterSig).toFixed(3)} > ${DIFFERENT})`);
  check(await page.$eval('#section-04', (e) => !e.open),
    'and 04 Style was genuinely still collapsed while that happened');
  await driveSlider('styleCornerFontScale', 100);
  await page.waitForTimeout(300);
}

// Opening a section is the browser's job; assert it actually opens, since the
// summary is restyled (list-style:none + a ::after marker, and on 03 a value
// readout too) and a mis-styled summary that swallows its own click is a real
// failure mode.
for (const [id, label] of [['section-03', 'Font'], ['section-04', 'Style']]) {
  await page.click(`#${id} > summary`);
  await page.waitForTimeout(200);
  check(await page.$eval(`#${id}`, (e) => e.open), `clicking the ${label} summary opens it`);
}
check(await page.$eval('#fontList', (e) => e.getBoundingClientRect().height > 0),
  'the font list has layout once 03 Font is open');

// ---------------------------------------------------------------------
section('3. Custom uploads — .woff2 and .ttf through the real file input');
// ---------------------------------------------------------------------
const customSigs = {};
for (const [label, file] of [['woff2', CUSTOM_WOFF2], ['ttf', CUSTOM_TTF]]) {
  await page.setInputFiles('#fontUpload', file);
  // settled(), not "the status mentions the filename": the page sets
  // "Reading <name>…" before it registers anything, so matching the name
  // resolves while selectFont() is still in flight and the gate then reads the
  // OLD selected font. That is a race in the harness, and it did fire.
  await settled(20000);
  const status = await page.textContent('#fontStatus');
  check(status.includes(path.basename(file).replace(/\.(ttf|otf|woff2?)$/i, '')),
    `${label}: the status names the uploaded file — "${status.trim()}"`);
  check(!status.includes('could not') && !status.includes('Could not'), `${label}: upload reported ready — "${status.trim()}"`);

  const id = await page.evaluate(() => window.__cards.getStyle().cornerFontId);
  check(id.startsWith('u:'), `${label}: the uploaded font became the selected font (${id})`);

  const state = await page.evaluate((i) => window.__fontState(i), id);
  check(state.faces.length > 0 && state.faces.every((f) => f.status === 'loaded'),
    `${label}: the face covering A-K/0-9 is registered and loaded (${JSON.stringify(state.faces)})`);
  check(state.spec.weight === 600, `${label}: draws at weight ${state.spec.weight} against a '1 1000' descriptor — no synthesised bold`);

  const { sig } = await renderSig(id);
  customSigs[label] = { id, sig, label: state.spec.label };
  check(sigDistance(sig, fallbackSig) > DIFFERENT,
    `${label}: the card is NOT the fallback (${sigDistance(sig, fallbackSig).toFixed(3)} > ${DIFFERENT})`);
  check(sigDistance(sig, defaultSig) > DIFFERENT,
    `${label}: the card is NOT still IBM Plex Mono (${sigDistance(sig, defaultSig).toFixed(3)} > ${DIFFERENT})`);
}
check(sigDistance(customSigs.woff2.sig, customSigs.ttf.sig) > DIFFERENT,
  `the two uploads render as different typefaces from each other (${sigDistance(customSigs.woff2.sig, customSigs.ttf.sig).toFixed(3)})`);

// ---------------------------------------------------------------------
section('4. Google Fonts — search, filter, and a family loaded on selection');
// ---------------------------------------------------------------------
let googleSig = null;
const catalogSize = await page.evaluate(() => document.getElementById('fontCount').textContent);
check(/\d/.test(catalogSize), `the picker reports a catalog: "${catalogSize.trim()}"`);

await page.fill('#fontSearch', 'bungee');
await page.waitForTimeout(120);
const searchRows = await page.$$eval('.cd-font-row', (els) => els.map((e) => e.dataset.fontId));
check(searchRows.includes(GOOGLE_TEST_ID), `search "bungee" surfaces ${GOOGLE_TEST_ID} (${searchRows.length} rows)`);
check(searchRows.length < 40, `search narrows the list to ${searchRows.length} rows rather than rendering all ~1,900`);

await page.fill('#fontSearch', '');
await page.click('.cd-font-cat[data-category="monospace"]');
await page.waitForTimeout(120);
const monoRows = await page.$$eval('.cd-font-row', (els) => els.map((e) => e.textContent));
check(monoRows.length > 0, `the monospace filter returns ${monoRows.length} rows`);
const monoOnly = await page.$$eval('.cd-font-row .cd-font-row__meta', (els) => els.every((e) => e.textContent === 'monospace'));
check(monoOnly, 'every row under the monospace filter is monospace');
await page.click('.cd-font-cat[data-category="monospace"]'); // toggle off

if (googleFontsReachable) {
  const before = await page.evaluate((f) => document.fonts.check('400 40px "' + f + '"') && [...document.fonts].some((x) => x.family === f), GOOGLE_TEST_FAMILY);
  check(!before, `${GOOGLE_TEST_FAMILY} is NOT in document.fonts before it is picked — the catalog is not preloaded`);

  await page.evaluate((id) => window.__cards.selectFont(id), GOOGLE_TEST_ID);
  await settled(30000);
  check(!(await page.textContent('#fontStatus')).includes('could not be loaded'),
    `selecting ${GOOGLE_TEST_FAMILY} reported success — "${(await page.textContent('#fontStatus')).trim()}"`);

  const gState = await page.evaluate((i) => window.__fontState(i), GOOGLE_TEST_ID);
  check(gState.faces.length > 0 && gState.faces.every((f) => f.status === 'loaded'),
    `${GOOGLE_TEST_FAMILY} loaded on selection — ${gState.faces.length} of ${gState.declared.length} declared subset faces, the one covering A-K/0-9 (${JSON.stringify(gState.faces)})`);
  check(gState.spec.weight === 400,
    `${GOOGLE_TEST_FAMILY} resolved to weight ${gState.spec.weight} — the only weight it ships, not an invented 600`);

  googleSig = (await renderSig(GOOGLE_TEST_ID)).sig;
  check(sigDistance(googleSig, fallbackSig) > DIFFERENT,
    `${GOOGLE_TEST_FAMILY}: the card is NOT the fallback (${sigDistance(googleSig, fallbackSig).toFixed(3)})`);
  check(sigDistance(googleSig, defaultSig) > DIFFERENT,
    `${GOOGLE_TEST_FAMILY}: the card is NOT still IBM Plex Mono (${sigDistance(googleSig, defaultSig).toFixed(3)})`);

  // The PREVIEW canvas itself, not a re-render. selectFont() drove this while
  // the family was still cold, so it is the witness for the await inside
  // drawPreviewNow() — nothing else in this gate sees that one.
  const previewCard = await page.evaluate(() => window.__previewRGBA(1)); // spades K
  const previewSig = inkSignature(Buffer.from(previewCard.data), previewCard.width, previewCard.height);
  check(sigDistance(previewSig, googleSig) < SAME,
    `the preview canvas drawn during the cold selection is ${GOOGLE_TEST_FAMILY} (${sigDistance(previewSig, googleSig).toFixed(4)} < ${SAME}) — renderPreview() awaited the load`);
} else {
  console.log('  skip Google-font checks (network unavailable)');
}

// ---------------------------------------------------------------------
section('5. THE RACE — pick a cold font and export 52 cards in the same tick');
// ---------------------------------------------------------------------
// This is the check the whole gate is built around. No await between
// selecting the font and starting the export: whatever protection exists has
// to live inside renderFullDeck() itself.
let raceSig = null;
if (googleFontsReachable) {
  const coldBefore = await page.evaluate((f) => [...document.fonts].some((x) => x.family === f), RACE_FAMILY);
  check(!coldBefore, `${RACE_FAMILY} has never been loaded in this page — the race starts cold`);

  const raceResult = await page.evaluate(async (id) => {
    // Deliberately NOT awaited: exactly what clicking a font row and then
    // hitting "Download PDF" a few milliseconds later does.
    window.__cards.selectFont(id);
    const cards = await window.__cards.renderFullDeck();
    const ctx = cards[12].canvas.getContext('2d'); // spades K, mid-deck
    const d = ctx.getImageData(0, 0, cards[12].canvas.width, cards[12].canvas.height);
    return {
      count: cards.length,
      firstSuit: cards[0].suit, firstRank: cards[0].rank,
      width: cards[12].canvas.width, height: cards[12].canvas.height,
      data: Array.from(d.data),
      styleFont: window.__cards.getStyle().cornerFontId,
    };
  }, RACE_ID);

  check(raceResult.count === 52, `the race export produced ${raceResult.count} cards`);
  check(raceResult.styleFont === RACE_ID, `the deck was rendered under ${RACE_ID}`);
  raceSig = inkSignature(Buffer.from(raceResult.data), raceResult.width, raceResult.height);
  check(sigDistance(raceSig, fallbackSig) > DIFFERENT,
    `RACE: the card drawn by the un-awaited selection is NOT a fallback (${sigDistance(raceSig, fallbackSig).toFixed(3)} > ${DIFFERENT})`);
  check(sigDistance(raceSig, defaultSig) > DIFFERENT,
    `RACE: it is not the previous font either (${sigDistance(raceSig, defaultSig).toFixed(3)} > ${DIFFERENT})`);

  // And prove the same card, rendered with the font now warm, is identical —
  // i.e. the race produced the RIGHT glyphs, not merely different ones.
  const warmSig = (await renderSig(RACE_ID)).sig;
  check(sigDistance(raceSig, warmSig) < SAME,
    `RACE: identical to the same card rendered with ${RACE_FAMILY} already warm (${sigDistance(raceSig, warmSig).toFixed(4)} < ${SAME})`);
} else {
  console.log('  skip the race check (network unavailable — it needs a cold Google family)');
}

// ---------------------------------------------------------------------
section('6. Court letter centring — measured on the letter\'s own ink');
// ---------------------------------------------------------------------
// textBaseline 'middle' centres the font's EM BOX, which is a design metric,
// not a property of the glyph. With five curated faces that drift was a fixed
// fudge factor; with the whole catalog selectable it is unbounded. So the
// claim under test is specific: the letter's INK bounding box is centred on
// the plate rect, in both axes, for faces whose ink sits in very different
// places relative to their em box.

async function renderStyled(spec, overrides) {
  const r = await page.evaluate(([sp, ov]) => window.__renderStyledRGBA(sp, ov), [spec, overrides || {}]);
  return { ...r, buf: Buffer.from(r.data) };
}

// Centring, measured — and measured on the WHOLE letter, including the parts
// that stick out of the plate.
//
// Cropping to the plate interior is the obvious instrument and it is wrong: a
// letter larger than the plate gets clipped symmetrically by the crop and then
// reads as perfectly centred wherever it actually sits. That is not
// hypothetical — Great Vibes' "K" at the default letter size overflows the
// plate, and the first version of this section scored it 5px off while its ink
// touched the crop on two sides.
//
// So the letter is isolated by COLOUR instead. drawCourtCard paints the plate
// stroke and the letter in the "other" palette colour and the two court suit
// glyphs in the suit's own colour, and the corner indices are the suit's own
// colour too — so keeping only pixels nearest to `other`, then dropping the
// band along the plate's stroke, leaves the letter and nothing else, anywhere
// on the card.
const PALETTE_RGB = { primary: [0x1c, 0x6b, 0x6b], secondary: [0xb2, 0x3b, 0x3b] };
const PRIMARY_SUITS = new Set(['spades', 'clubs']);

function dist2(rgba, i, [r, g, b]) {
  const dr = rgba[i] - r, dg = rgba[i + 1] - g, db = rgba[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

function letterInkBox(r, suit) {
  const other = PRIMARY_SUITS.has(suit) ? PALETTE_RGB.secondary : PALETTE_RGB.primary;
  const own = PRIMARY_SUITS.has(suit) ? PALETTE_RGB.primary : PALETTE_RGB.secondary;
  const white = [255, 255, 255];
  const lw = Math.max(2, r.safe.w * 0.012);
  const band = lw + 3;
  const px = r.plate.cx - r.plate.w / 2, py = r.plate.cy - r.plate.h / 2;
  const qx = r.plate.cx + r.plate.w / 2, qy = r.plate.cy + r.plate.h / 2;
  const onRing = (x, y) => (
    x >= px - band && x <= qx + band && y >= py - band && y <= qy + band
    && !(x >= px + band && x <= qx - band && y >= py + band && y <= qy - band)
  );

  const buf = r.buf || r.data;
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, count = 0;
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      if (onRing(x, y)) continue;
      const i = (y * r.width + x) * 4;
      const dOther = dist2(buf, i, other);
      if (dOther >= dist2(buf, i, own) || dOther >= dist2(buf, i, white)) continue;
      count++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (!count) return null;
  return { minX, maxX, minY, maxY, count, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function checkCentered(r, suit, label) {
  const box = letterInkBox(r, suit);
  if (!box) { check(false, `${label}: NO letter ink found`); return null; }
  const dx = box.cx - r.plate.cx;
  const dy = box.cy - r.plate.cy;
  const overflows = (box.maxX - box.minX) > r.plate.w || (box.maxY - box.minY) > r.plate.h;
  check(Math.abs(dx) <= CENTER_TOL && Math.abs(dy) <= CENTER_TOL,
    `${label}: ink centre is ${dx.toFixed(1)}, ${dy.toFixed(1)} px from the plate centre (tol ${CENTER_TOL})`
    + (overflows ? ` [letter ${box.maxX - box.minX}x${box.maxY - box.minY} is LARGER than the ${r.plate.w.toFixed(0)}x${r.plate.h.toFixed(0)} plate]` : ''));
  return box;
}

// 6px on an 825px-wide card is 0.7% of the width — tight enough that the old
// method fails it on every face tested, loose enough to absorb the half-pixel
// the luma<200 threshold costs at a glyph's antialiased edge.
const CENTER_TOL = 6;

if (googleFontsReachable) {
  for (const font of CENTERING_FONTS) {
    for (const rank of ['J', 'Q', 'K']) {
      const r = await renderStyled({ suit: 'spades', rank }, { cornerFontId: font.id });
      checkCentered(r, 'spades', `${font.label} "${rank}"`);
    }
  }

  // Same claim at both ends of the court-letter slider — a centring that only
  // holds at 100% is a coincidence, not a method.
  for (const scale of [0.5, 1.5]) {
    const r = await renderStyled({ suit: 'hearts', rank: 'Q' },
      { cornerFontId: 'g:Great Vibes', courtLetterScale: scale });
    checkCentered(r, 'hearts', `Great Vibes "Q" at letter scale ${scale * 100}%`);
  }

  // And with the plate resized under it — the two sliders are independent, so
  // the letter must stay centred in whatever box it is given, including one
  // smaller than itself.
  for (const scale of [0.5, 1.5]) {
    const r = await renderStyled({ suit: 'clubs', rank: 'K' },
      { cornerFontId: 'g:Bungee', courtPlateScale: scale });
    checkCentered(r, 'clubs', `Bungee "K" at plate scale ${scale * 100}%`);
  }

  // NEGATIVE CONTROL for the whole section. The method this replaced, drawn
  // side by side: if it also landed inside CENTER_TOL, every check above would
  // be measuring nothing.
  let legacyWorst = 0;
  for (const font of CENTERING_FONTS) {
    const r = await page.evaluate(([rank, id]) => window.__renderLegacyCenteredRGBA(rank, id, {}), ['K', font.id]);
    r.buf = Buffer.from(r.data);
    const box = letterInkBox(r, 'spades');
    const off = box ? Math.hypot(box.cx - r.plate.cx, box.cy - r.plate.cy) : NaN;
    legacyWorst = Math.max(legacyWorst, off || 0);
    check(box && off > CENTER_TOL,
      `LEGACY em-box centring puts ${font.label} "K" ${off.toFixed(1)} px off centre (> ${CENTER_TOL}) — the check above has teeth`);
  }
  check(legacyWorst > 20, `worst legacy offset was ${legacyWorst.toFixed(1)} px — visible, not a rounding artefact`);
} else {
  console.log('  skip the centring checks (they need two Google faces)');
}

// ---------------------------------------------------------------------
section('7. Corner letter scale — the anti-overlap floor holds and grows');
// ---------------------------------------------------------------------
// The corner cluster is a rank letter with a mini suit glyph below it. They are
// the same colour, so "they never touch" is measurable as "the corner region
// holds exactly two vertically separated ink bands". Rank A with the built-in
// spade path is used because both objects are single connected shapes: one
// band would mean they had merged.
//
// The crop is the top-left corner only, above the ace glyph and left of it, so
// nothing else in the card can add a band.
const CORNER_CROP = (r) => [0, 0.02 * r.height, 0.5 * r.width, 0.32 * r.height];

for (const offset of [0, 100]) {
  const gapsByScale = [];
  for (const scale of [0.5, 1, 1.5]) {
    const r = await renderStyled({ suit: 'spades', rank: 'A' }, { cornerFontScale: scale, glyphOffsetPct: offset, glyphScale: 1 });
    const { bands, gaps } = inkBands(r.buf, r.width, ...CORNER_CROP(r));
    check(bands.length === 2,
      `corner scale ${scale * 100}%, offset ${offset}%: exactly 2 ink bands (letter, glyph) — got ${bands.length}`);
    const gap = gaps[0];
    check(gap >= 1, `corner scale ${scale * 100}%, offset ${offset}%: ${gap}px of clear space between them`);
    gapsByScale.push(gap);
  }
  check(gapsByScale[0] < gapsByScale[1] && gapsByScale[1] < gapsByScale[2],
    `offset ${offset}%: the floor GROWS with the letter (${gapsByScale.join(' < ')} px) rather than staying a fixed gap under a doubled letter`);
}

// The mini glyph must NOT be dragged along by the corner-font slider — the
// panel already has a suit-glyph scale, and two controls doing one job is how
// they end up disagreeing.
{
  const small = await renderStyled({ suit: 'spades', rank: 'A' }, { cornerFontScale: 0.5, glyphOffsetPct: 0 });
  const large = await renderStyled({ suit: 'spades', rank: 'A' }, { cornerFontScale: 1.5, glyphOffsetPct: 0 });
  const gs = inkBands(small.buf, small.width, ...CORNER_CROP(small)).bands[1];
  const gl = inkBands(large.buf, large.width, ...CORNER_CROP(large)).bands[1];
  const hs = gs[1] - gs[0];
  const hl = gl[1] - gl[0];
  check(Math.abs(hs - hl) <= 2,
    `the mini suit glyph is ${hs}px tall at corner scale 50% and ${hl}px at 150% — unchanged, as the separate suit-glyph slider requires`);
}

// ---------------------------------------------------------------------
section('8. Court plate scale — the box moves, the letter does not');
// ---------------------------------------------------------------------
{
  // courtLetterScale 0.5 so the letter comfortably fits the 60% plate: at the
  // default size it clears that crop by 3px, and a comparison that depends on
  // 3px is a comparison waiting to become a clipping artefact.
  const small = await renderStyled({ suit: 'spades', rank: 'K' }, { courtPlateScale: 0.6 });
  const large = await renderStyled({ suit: 'spades', rank: 'K' }, { courtPlateScale: 1.4 });
  check(large.plate.w > small.plate.w * 2 - 1 && large.plate.h > small.plate.h * 2 - 1,
    `plate is ${small.plate.w.toFixed(0)}x${small.plate.h.toFixed(0)} at 60% and ${large.plate.w.toFixed(0)}x${large.plate.h.toFixed(0)} at 140%`);

  // The letter's ink height must not follow the plate.
  const bs = letterInkBox(small, 'spades');
  const bl = letterInkBox(large, 'spades');
  const hs = bs ? bs.maxY - bs.minY : -1;
  const hl = bl ? bl.maxY - bl.minY : -2;
  check(Math.abs(hs - hl) <= 2,
    `the letter is ${hs}px tall inside a 60% plate and ${hl}px inside a 140% one — independent, as asked`);
}

// The court suit glyphs sit outside the plate, so a large plate pushes them
// out; they are clamped to the safe rect because art outside it is what a
// cutter misregistration eats (PRINT_SPEC.SAFE_MARGIN_IN).
{
  const r = await renderStyled({ suit: 'spades', rank: 'J' }, { courtPlateScale: 1.5, glyphScale: 1.5 });
  const box = inkBoxIn(r.buf, r.width, 0, 0, r.width, r.height);
  check(box && box.minY >= r.safe.y - 1 && box.maxY <= r.safe.y + r.safe.h + 1,
    `at plate 150% x glyph 150% all ink stays inside the safe rect (ink y ${box.minY}..${box.maxY}, safe ${r.safe.y}..${(r.safe.y + r.safe.h).toFixed(0)})`);
}

// ---------------------------------------------------------------------
section('9. Exported PDF — inspect the file, not the preview');
// ---------------------------------------------------------------------
async function exportAndCapture(buttonId) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 180000 }),
    page.click(`#${buttonId}`),
  ]);
  const tmp = path.join(CACHE, '..', 'export-' + Date.now() + '-' + download.suggestedFilename());
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  await download.saveAs(tmp);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

// Export under the font the race just selected AND with all three scale
// sliders off their defaults, so the file under inspection is produced by the
// least-safe path in the app carrying settings that only exist in the DOM.
// Threading a control to the preview and forgetting the export is the whole
// reason this is checked against the file rather than the canvas.
const EXPORT_STYLE = { cornerFontScale: 1.3, courtPlateScale: 1.3, courtLetterScale: 0.7 };
const pdfFontId = googleFontsReachable ? RACE_ID : customSigs.woff2.id;
await page.evaluate((id) => window.__cards.selectFont(id), pdfFontId);
await settled();
for (const [id, v] of [['styleCornerFontScale', 130], ['styleCourtPlateScale', 130], ['styleCourtLetterScale', 70]]) {
  await driveSlider(id, v);
}
await page.waitForTimeout(500);
const liveStyle = await page.evaluate(() => window.__cards.getStyle());
check(liveStyle.cornerFontScale === 1.3 && liveStyle.courtPlateScale === 1.3 && liveStyle.courtLetterScale === 0.7,
  `getStyle() carries the three sliders (${JSON.stringify({ c: liveStyle.cornerFontScale, p: liveStyle.courtPlateScale, l: liveStyle.courtLetterScale })})`);

// The two expectations the exported file is measured against: the same card
// rendered in-page WITH these slider values, and rendered at the defaults.
// Matching the first and differing from the second is what "the sliders reached
// the export" means; either alone would pass on a preview-only wiring.
const styledRef = await renderStyled({ suit: 'spades', rank: 'K' }, { cornerFontId: pdfFontId, ...EXPORT_STYLE });
const defaultRef = await renderStyled({ suit: 'spades', rank: 'K' }, {
  cornerFontId: pdfFontId, cornerFontScale: 1, courtPlateScale: 1, courtLetterScale: 1,
});
const styledCornerSig = inkSignature(styledRef.buf, styledRef.width, styledRef.height);
const defaultCornerSig = inkSignature(defaultRef.buf, defaultRef.width, defaultRef.height);
const styledPlateBox = letterInkBox(styledRef, 'spades');
const defaultPlateBox = letterInkBox(defaultRef, 'spades');
check(sigDistance(styledCornerSig, defaultCornerSig) > DIFFERENT,
  `the slider values change the card at all (corner ${sigDistance(styledCornerSig, defaultCornerSig).toFixed(3)} > ${DIFFERENT}) — otherwise the export check below proves nothing`);

const pdfBuf = await exportAndCapture('btnExportPdf');
check(pdfBuf.subarray(0, 5).toString() === '%PDF-', `the PDF export downloaded a real PDF (${(pdfBuf.length / 1024 / 1024).toFixed(1)} MB)`);
check(pdfPageCount(pdfBuf) === 52, `the PDF declares ${pdfPageCount(pdfBuf)} pages`);

const pdfImages = extractPdfImages(pdfBuf);
// jsPDF writes a DeviceGray /SMask alongside each DeviceRGB card image (the
// canvas is RGBA), so object order is NOT page order — filtering to the
// full-bleed RGB rasters is what makes index 12 mean "the 13th card".
const pdfCards = pdfImages.filter((im) => im.colorSpace === 'DeviceRGB' && im.width === 825 && im.height === 1125);
check(pdfImages.length >= 52, `inflated ${pdfImages.length} embedded image object(s) out of the PDF`);
check(pdfCards.length === 52, `${pdfCards.length} of them are full-bleed DeviceRGB card rasters at 825×1125 px (300 DPI)`);
const pdfCard = pdfCards[12];
check(Boolean(pdfCard), `card 13 (spades K) recovered from the PDF`);
if (pdfCard) {
  const pdfSig = inkSignature(pdfCard.rgba, pdfCard.width, pdfCard.height);
  check(sigDistance(pdfSig, fallbackSig) > DIFFERENT,
    `PDF card 13 is NOT set in a fallback face (${sigDistance(pdfSig, fallbackSig).toFixed(3)} > ${DIFFERENT})`);
  check(sigDistance(pdfSig, defaultCornerSig) > DIFFERENT,
    `PDF card 13 does NOT carry the DEFAULT corner scale (${sigDistance(pdfSig, defaultCornerSig).toFixed(3)} > ${DIFFERENT}) — the slider reached the file`);
  check(sigDistance(pdfSig, styledCornerSig) < SAME,
    `PDF card 13 matches the verified in-page render at those slider values (${sigDistance(pdfSig, styledCornerSig).toFixed(4)} < ${SAME})`);

  // The court sliders live in the plate, which the corner signature cannot
  // see — so they get their own measurement out of the same file.
  const pdfPlateBox = letterInkBox({ ...styledRef, buf: pdfCard.rgba, width: pdfCard.width, height: pdfCard.height }, 'spades');
  const pdfLetterH = pdfPlateBox ? pdfPlateBox.maxY - pdfPlateBox.minY : -1;
  const styledLetterH = styledPlateBox ? styledPlateBox.maxY - styledPlateBox.minY : -2;
  const defaultLetterH = defaultPlateBox ? defaultPlateBox.maxY - defaultPlateBox.minY : -3;
  check(Math.abs(pdfLetterH - styledLetterH) <= 2,
    `the court letter in the PDF is ${pdfLetterH}px tall, matching the 70% in-page render (${styledLetterH}px)`);
  check(Math.abs(pdfLetterH - defaultLetterH) > 10,
    `...and not the ${defaultLetterH}px it would be at the default — the court-letter slider reached the file`);
  check(pdfPlateBox && Math.abs(pdfPlateBox.cx - styledRef.plate.cx) <= CENTER_TOL && Math.abs(pdfPlateBox.cy - styledRef.plate.cy) <= CENTER_TOL,
    `the court letter is still ink-centred IN THE EXPORTED PDF (${pdfPlateBox ? (pdfPlateBox.cx - styledRef.plate.cx).toFixed(1) + ', ' + (pdfPlateBox.cy - styledRef.plate.cy).toFixed(1) : 'NO INK'} px off)`);
}

// ---------------------------------------------------------------------
section('10. Exported PNG/ZIP — inspect the file, not the preview');
// ---------------------------------------------------------------------
// Switched to an UPLOADED font so the ZIP path is proven for the custom
// source too, not only for a Google one. The sliders stay off their defaults.
await page.evaluate((id) => window.__cards.selectFont(id), customSigs.ttf.id);
await settled();
const zipRef = await renderStyled({ suit: 'spades', rank: 'K' }, { cornerFontId: customSigs.ttf.id, ...EXPORT_STYLE });
const zipRefSig = inkSignature(zipRef.buf, zipRef.width, zipRef.height);
const zipRefPlate = letterInkBox(zipRef, 'spades');

const zipBuf = await exportAndCapture('btnExportZip');
check(zipBuf.subarray(0, 2).toString() === 'PK', `the PNG export downloaded a real ZIP (${(zipBuf.length / 1024 / 1024).toFixed(1)} MB)`);

// Unzip in Node with the same JSZip the page used.
const { default: JSZipNode } = await import(path.join(ROOT, 'node_modules/jszip/lib/index.js'));
const zip = await JSZipNode.loadAsync(zipBuf);
const names = Object.keys(zip.files).sort();
check(names.length === 52, `the ZIP holds ${names.length} PNGs`);
const target = names.find((n) => n.includes('spades-K')) || names[12];
const pngBuf = Buffer.from(await zip.file(target).async('nodebuffer'));
const png = decodePNG(pngBuf);
check(png.width === 825 && png.height === 1125, `${target} decodes to ${png.width}×${png.height} px`);
const pngSig = inkSignature(png.data, png.width, png.height);
check(sigDistance(pngSig, fallbackSig) > DIFFERENT,
  `${target} is NOT set in a fallback face (${sigDistance(pngSig, fallbackSig).toFixed(3)} > ${DIFFERENT})`);
check(sigDistance(pngSig, zipRefSig) < SAME,
  `${target} matches the verified in-page render under the uploaded .ttf at those slider values (${sigDistance(pngSig, zipRefSig).toFixed(4)} < ${SAME})`);
const pngPlate = letterInkBox({ ...zipRef, buf: png.data, width: png.width, height: png.height }, 'spades');
check(pngPlate && zipRefPlate && Math.abs((pngPlate.maxY - pngPlate.minY) - (zipRefPlate.maxY - zipRefPlate.minY)) <= 2,
  `the court letter in ${target} is ${pngPlate ? pngPlate.maxY - pngPlate.minY : -1}px tall, matching the in-page render — the court sliders reached the ZIP too`);
check(pngPlate && Math.abs(pngPlate.cx - zipRef.plate.cx) <= CENTER_TOL && Math.abs(pngPlate.cy - zipRef.plate.cy) <= CENTER_TOL,
  `the court letter is still ink-centred IN THE EXPORTED PNG (${pngPlate ? (pngPlate.cx - zipRef.plate.cx).toFixed(1) + ', ' + (pngPlate.cy - zipRef.plate.cy).toFixed(1) : 'NO INK'} px off)`);

// ---------------------------------------------------------------------
section('11. Hygiene');
// ---------------------------------------------------------------------
check(unroutedExternal.length === 0, `no unrouted external request escaped the harness (${[...new Set(unroutedExternal)].slice(0, 3).join(', ')})`);
check(pageErrors.length === 0, `0 uncaught page errors (${pageErrors.slice(0, 3).join(' | ')})`);

// ---------------------------------------------------------------------
if (NEGATIVE) {
  section('NEGATIVE CONTROL — render without awaiting the font');
  // The claim under test is NOT "an un-awaited font looks like some universal
  // fallback" — it does not; each family stack falls back to its own generic,
  // so there is no single fallback signature. The claim is the one the gate
  // actually rests on: a card drawn BEFORE the font arrives is a different
  // card from the same one drawn after. If these two came out equal, every
  // "< SAME" comparison in sections 5 and 6 would be vacuous.
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/cards.html`, { waitUntil: 'load' });
  await page2.waitForFunction(() => window.__cards, null, { timeout: 20000 });
  await installHarness(page2);

  const COLD = 'g:Lobster'; // untouched by every other check in this file
  const cold = await page2.evaluate((id) => window.__renderCardRGBA(id, { awaitFont: false }), COLD);
  const coldSig = inkSignature(Buffer.from(cold.data), cold.width, cold.height);
  const warm = await page2.evaluate((id) => window.__renderCardRGBA(id, { awaitFont: true }), COLD);
  const warmSig = inkSignature(Buffer.from(warm.data), warm.width, warm.height);

  const d = sigDistance(coldSig, warmSig);
  check(d > DIFFERENT,
    `the same card drawn before vs after the font loads differs by ${d.toFixed(3)} (> ${DIFFERENT}) — the measurement DOES separate the bug from the fix`);
  await page2.close();
}

if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.evaluate(() => window.__cards.selectFont('g:Bungee')).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, 'cards-font-picker.png'), fullPage: true });
  console.log(`\nWrote ${path.join(SHOTS, 'cards-font-picker.png')}`);
}

await browser.close();
server.close();

console.log('');
console.log(`google-fonts cache: ${networkFetches} upstream fetch(es) this run (rest served from tools/.cache/google-fonts/)`);
if (failures > 0) {
  console.error(`verify-cards-fonts: ${failures} of ${checks} check(s) FAILED`);
  process.exit(1);
} else {
  console.log(`verify-cards-fonts: all ${checks} checks passed`);
}
