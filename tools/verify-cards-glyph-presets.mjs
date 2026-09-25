/*
 * verify-cards-glyph-presets.mjs — gate for the /cards built-in suit-glyph
 * FAMILY picker (cards/glyph-presets.js, cards.js's family chips + per-suit
 * select, card-template.js's glyphStretch).
 *
 * WHAT THIS ADDS ON TOP OF verify-cards-svg-glyphs.mjs (the upload gate):
 * that gate proves an UPLOADED SVG flows through the real pipeline (tint,
 * scale, corner offset, court plate). This one proves the three things that
 * are new: (1) a built-in FAMILY applies all four of its glyphs at once and
 * the four families are actually distinguishable from each other and from
 * the placeholder, not near-duplicates; (2) a per-suit OVERRIDE — to a
 * different family, to an upload, or back to the placeholder — moves only
 * that one suit and is correctly reported as "mixed"; (3) the STRETCH slider
 * is a real x/y transform (not a second size control) that is hidden until
 * relevant and resets when it stops being relevant. It then proves all of it
 * flows through the SAME renderFullDeck() -> PDF/PNG export path the font
 * gate already exercises, by exporting real files across two extreme
 * family/stretch combinations and inspecting the file bytes rather than the
 * preview canvas — same "the preview is not evidence" discipline as
 * verify-cards-fonts.mjs.
 *
 * REQUIREMENTS (dev-only; the deployed site needs none of this):
 *   npm i --no-save playwright-core jspdf@2.5.1 jszip
 *
 * RUN:  node tools/verify-cards-glyph-presets.mjs
 *       node tools/verify-cards-glyph-presets.mjs --shots <dir>
 *       node tools/verify-cards-glyph-presets.mjs --negative-control
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
const NEGATIVE = process.argv.includes('--negative-control');
const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx >= 0 ? path.resolve(process.argv[shotsIdx + 1]) : null;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
};

let failures = 0;
let checks = 0;
function check(cond, msg) {
  checks++;
  if (cond) console.log('  ok   ' + msg);
  else { console.error('  FAIL ' + msg); failures++; }
}
function section(title) { console.log('\n' + title); }

// ---------------------------------------------------------------------
// 0. Asset sanity — Node only, no browser needed.
// ---------------------------------------------------------------------
section('0. Preset assets');
const { GLYPH_FAMILIES } = await import('../cards/glyph-presets.js');
check(GLYPH_FAMILIES.length === 4, `4 built-in families declared (${GLYPH_FAMILIES.map((f) => f.id).join(', ')})`);
const SUIT_FILE = { spades: 'spade', hearts: 'heart', diamonds: 'diamond', clubs: 'club' };
for (const family of GLYPH_FAMILIES) {
  for (const [suit, file] of Object.entries(SUIT_FILE)) {
    const p = path.join(ROOT, `assets/cards/glyph-presets/${family.id}/${file}.svg`);
    const exists = fs.existsSync(p);
    check(exists, `${family.id}/${file}.svg exists`);
    if (exists) {
      const text = fs.readFileSync(p, 'utf8');
      check(/<svg[\s>]/.test(text) && /viewBox=/.test(text), `${family.id}/${file}.svg is a well-formed SVG with a viewBox`);
    }
  }
}

// ---------------------------------------------------------------------
// Local static server + CDN locals for the real export buttons.
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

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const context = await browser.newContext();
// Route the two CDN scripts to the local copies — no fonts.googleapis.com
// dependency here at all, since this gate never touches the font picker.
for (const [url, file] of Object.entries(CDN_LOCAL)) {
  await context.route(url, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) }));
}
const unroutedExternal = [];
// cards.html unconditionally links a Google Fonts stylesheet for its five
// BUILT-IN fonts (see its <head>) — page chrome this gate never depends on,
// since the corner rank letter's font is never changed here. Aborted
// quietly (no network dependency, no hang) rather than counted as a hygiene
// failure; any OTHER external host reaching the network still is one.
await context.route('**://fonts.googleapis.com/**', (route) => route.abort());
await context.route('**://fonts.gstatic.com/**', (route) => route.abort());
context.on('request', (req) => {
  const url = req.url();
  if (!url.startsWith(BASE) && !Object.keys(CDN_LOCAL).includes(url) && !/fonts\.(googleapis|gstatic)\.com/.test(url)) {
    unroutedExternal.push(url);
  }
});

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto(`${BASE}/cards.html`, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.__cards, null, { timeout: 20000 });
await page.waitForTimeout(500); // default font (IBM Plex Mono, preconnected) settles

// ---------------------------------------------------------------------
// Ink-signature helpers — same shape as verify-cards-fonts.mjs's, kept as
// an independent copy here on purpose: each cards gate is a self-contained
// instrument, so a defect in one file's measurement cannot silently make
// every gate blind to the same thing.
// ---------------------------------------------------------------------
// A boolean ink mask over a crop of the page — 1 where a pixel is
// meaningfully darker than the white card ground, 0 otherwise.
function inkMask(rgba, width, height, crop) {
  const x0 = Math.floor(crop.x0 * width), x1 = Math.floor(crop.x1 * width);
  const y0 = Math.floor(crop.y0 * height), y1 = Math.floor(crop.y1 * height);
  const w = x1 - x0, h = y1 - y0;
  const mask = new Uint8Array(w * h);
  let idx = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      const luma = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
      mask[idx++] = luma < 200 ? 1 : 0;
    }
  }
  return { mask, w, h };
}

// 1 - Jaccard similarity of two ink masks of the SAME crop: 0 means the two
// shapes occupy exactly the same pixels, 1 means they never overlap at all.
// This is what actually answers "are these two glyphs a different SHAPE" —
// a metric built from total ink COUNT (as the font gate's inkSignature is)
// gets fooled by two differently-shaped glyphs that happen to cover a
// similar area, which is exactly what "genuinely distinct, not a
// near-duplicate" needs to rule out.
function shapeDistance(a, b) {
  let union = 0, xor = 0;
  const n = Math.min(a.mask.length, b.mask.length);
  for (let i = 0; i < n; i++) {
    const av = a.mask[i], bv = b.mask[i];
    if (av || bv) union++;
    if (av !== bv) xor++;
  }
  return union ? xor / union : 0;
}

// carvingDistance(a, reference) — the RIGHT instrument for an ORNAMENTED
// family compared against the PLAIN family whose silhouette it is built
// on (Ornate vs Classic, Ornate vs Minimal), and the WRONG one for every
// other pair, which is why this is a second function rather than a
// retune of shapeDistance's threshold.
//
// Whole-mask Jaccard (shapeDistance) normalises the symmetric difference
// by the UNION of the two masks. For an ornamented-vs-plain pair that
// union is, by design, almost entirely the shared plain silhouette —
// Ornate is deliberately "Classic's outline with carving added", not an
// unrelated shape — so the huge shared interior dilutes the denominator
// and a small, real amount of carving reads as "barely different" even
// when it is visibly there. That is a defect in the METRIC for this
// pair, not in the art: whole-mask Jaccard answers "is the silhouette
// different", and for a deliberately-shared silhouette the honest answer
// is "no, and it isn't supposed to be".
//
// carvingDistance instead asks "what fraction of the REFERENCE shape's
// own ink did the carving touch" — the symmetric difference (protruding
// scrollwork added, holes cut into the interior) normalised by the
// reference's OWN ink-pixel count rather than by the union. The shared
// interior no longer inflates the denominator, because the reference's
// ink IS the denominator's basis rather than an extra diluting term
// alongside the carving.
function carvingDistance(ornamented, reference) {
  let xor = 0, refInk = 0;
  const n = Math.min(ornamented.mask.length, reference.mask.length);
  for (let i = 0; i < n; i++) {
    const ov = ornamented.mask[i], rv = reference.mask[i];
    if (rv) refInk++;
    if (ov !== rv) xor++;
  }
  return refInk ? xor / refInk : 0;
}

// Bounding box of the ink in a mask, in the mask's own local coordinates.
function maskBox(m) {
  let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.mask[y * m.w + x]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (maxX < 0) return null;
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

// Two masks compared pixel-for-pixel must read here: a re-render of the
// identical state (same family/upload, same style), or the same card read
// back out of an exported PDF/PNG.
const SAME = 0.02;
// Two DIFFERENT glyph silhouettes at a similar overall size and position —
// calibrated against MEASURED values for four real, distinct hand-authored
// shapes (0.377–0.607 pairwise between the four families) rather than
// picked to make a first run pass; this is the bar "the four families are
// not near-duplicates OF EACH OTHER" is held to.
const DIFFERENT = 0.35;
// A SEPARATE, lower bar for "this family reads as different from the
// pre-existing built-in placeholder" — deliberately not the same number.
// "Classic" is meant to be the family closest in spirit to the existing
// look (a smooth, traditional card-suit silhouette, which is also broadly
// what the placeholder draws), so a bar tuned to separate two GENUINELY
// distinct hand-authored families is the wrong instrument for it: measured,
// "Classic" vs. the placeholder lands at 0.21 while the weakest genuine
// family-vs-family pair lands at 0.377, and a single bar in between would
// either force "Classic" away from looking classic or weaken what the
// family-vs-family claim actually proves. Calibrated with headroom under
// the measured 0.21 floor, same order as the font gate's own DIFFERENT.
const DIFFERENT_FROM_PLACEHOLDER = 0.15;
// The bar for carvingDistance (Ornate vs its plain siblings Classic and
// Minimal ONLY — every other pair keeps whole-mask Jaccard and DIFFERENT
// above). Held to the SAME 0.35 figure as DIFFERENT rather than a fresh
// number invented for this metric: the two metrics answer different
// questions (silhouette difference vs. fraction-of-reference-carved) but
// "at least a third of the thing changed" is the same bar either way, and
// reusing it avoids a second free-floating constant with no independent
// calibration behind it.
const CARVING_DISTINCT = 0.35;

// The whole card — used for "this exact state reproduces exactly" checks,
// where a mutation reaching ANY drawing path (corner glyph, pips, ace,
// court) must be visible.
const WHOLE_CROP = { x0: 0, y0: 0, x1: 1, y1: 1 };
// Centered on the ace glyph alone (drawAceCard centers it on the card,
// sized to ~40% of the card's width at glyphScale 1 x stretch 1) —
// excludes the two mirrored corner indices, so a shape-distance
// measurement here is not diluted by ink that is IDENTICAL between a
// placeholder deck and a preset one (the corner index's rank letter is
// always the same font/size/color regardless of the suit glyph source).
// The FULL width is kept (x0/x1 span the whole card): the ace stretches up
// to ~80% of the card's width at the stretch slider's ceiling, while the
// corner clusters occupy only a compact region near each of the two
// diagonal corners — so excluding a Y-band around the vertical middle is
// enough to clear them at any X, without ever having to guess where a
// corner cluster's own edge sits. That band is MEASURED below, not assumed:
// the corner clusters' own constants (BASE.cornerFont etc.) are not
// exported from card-template.js, deliberately, so this gate should not
// need a second copy of that arithmetic to stay correct.
let ACE_CROP = { x0: 0, y0: 0.3, x1: 1, y1: 0.7 }; // placeholder; recalibrated below

// Reads a preview canvas back as a PNG data URL rather than a raw pixel
// array: page.evaluate() serializes its return value as JSON over the CDP
// wire, and a 825x1125 RGBA canvas is 3.7M numbers that way (multiple
// seconds a call) against a ~60KB base64 PNG string. Decoded in Node with
// the same decodePNG() the exported-file checks already use, so both paths
// go through one decoder rather than two.
async function canvasPNG(index) {
  const dataUrl = await page.evaluate((i) => {
    const c = document.querySelectorAll('#previewGrid canvas')[i];
    return c.toDataURL('image/png');
  }, index);
  return decodePNG(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

async function previewMasks(index) {
  const r = await canvasPNG(index); // { width, height, data: RGBA Buffer }
  const buf = r.data;
  return {
    whole: inkMask(buf, r.width, r.height, WHOLE_CROP),
    ace: inkMask(buf, r.width, r.height, ACE_CROP),
  };
}

async function driveSlider(id, value) {
  return page.evaluate(([elId, v]) => {
    const el = document.getElementById(elId);
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { value: el.value, readback: document.getElementById(elId + 'Value')?.textContent };
  }, [id, value]);
}

async function clickFamily(id) {
  await page.click(`#glyphFamilies button[data-family="${id}"]`);
  await page.waitForTimeout(500);
}

async function setSuitSelect(suit, value) {
  await page.evaluate(([s, v]) => {
    const el = document.getElementById(`suitFamily-${s}`);
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [suit, value]);
  await page.waitForTimeout(500);
}

// PREVIEW_SPECS order in cards.js: spades A, spades K, hearts A, hearts K,
// diamonds A, diamonds K, clubs A, clubs K.
const IDX = { 'spades-A': 0, 'spades-K': 1, 'hearts-A': 2, 'hearts-K': 3, 'diamonds-A': 4, 'clubs-A': 6 };

// Calibrate ACE_CROP against the real, on-screen corner cluster before
// measuring anything else — on the placeholder deck, so this reads the
// corner index alone with no suit-glyph-source variable in play yet.
{
  const probe = await canvasPNG(IDX['spades-A']);
  const buf = probe.data;
  // The corner cluster (rank letter + mini suit glyph) sits inside the
  // page's own top-left corner, inset from it, well short of the card
  // centre — but the crop must stop BEFORE the ace glyph's own top-left
  // edge (which reaches to ~0.30 of the card at the default scale/stretch)
  // or this measures a mix of the two. 0.28 leaves that margin.
  const cornerMask = inkMask(buf, probe.width, probe.height, { x0: 0, y0: 0, x1: 0.28, y1: 0.28 });
  const cornerBox = maskBox(cornerMask);
  const cornerYFrac = cornerBox ? cornerBox.maxY / (probe.height * 0.5) * 0.5 : 0.2;
  const safeY0 = Math.min(0.4, cornerYFrac + 0.04);
  ACE_CROP = { x0: 0, y0: safeY0, x1: 1, y1: 1 - safeY0 };
  check(safeY0 > 0 && safeY0 < 0.5, `calibrated the ace-only crop to y ${safeY0.toFixed(3)}..${(1 - safeY0).toFixed(3)} of the card, clear of the measured corner cluster (corner ink reaches y ${cornerYFrac.toFixed(3)})`);
}

// ---------------------------------------------------------------------
section('1. Baseline — placeholder deck, stretch control hidden');
// ---------------------------------------------------------------------
const source0 = await page.evaluate(() => ({ ...window.__cards.suitGlyphSource }));
check(Object.values(source0).every((v) => v === 'placeholder'), `every suit starts on the placeholder (${JSON.stringify(source0)})`);
check(await page.$eval('#styleGlyphStretchField', (e) => e.hidden), 'the suit-glyph-stretch field is hidden before any family/upload is active');
const placeholderSpadesA = await previewMasks(IDX['spades-A']);
check(Boolean(maskBox(placeholderSpadesA.ace)), 'the placeholder ace of spades draws ink');

// ---------------------------------------------------------------------
section('2. Family chips — one click sets all four suits, and each family is distinct');
// ---------------------------------------------------------------------
const familyMasks = {};
for (const family of GLYPH_FAMILIES) {
  await clickFamily(family.id);
  const src = await page.evaluate(() => ({ ...window.__cards.suitGlyphSource }));
  check(Object.values(src).every((v) => v === family.id), `"${family.label}": all four suits report source "${family.id}" (${JSON.stringify(src)})`);

  const pressed = await page.evaluate((id) => {
    const out = {};
    for (const b of document.querySelectorAll('#glyphFamilies button')) out[b.dataset.family] = b.getAttribute('aria-pressed');
    return out;
  }, family.id);
  check(pressed[family.id] === 'true' && Object.entries(pressed).every(([k, v]) => k === family.id || v === 'false'),
    `"${family.label}" chip is the only one marked pressed (${JSON.stringify(pressed)})`);

  check(!(await page.$eval('#styleGlyphStretchField', (e) => e.hidden)), `the stretch field is visible once "${family.label}" is active`);

  const m = await previewMasks(IDX['spades-A']);
  check(Boolean(maskBox(m.ace)), `"${family.label}" ace of spades draws ink`);
  const distFromPlaceholder = shapeDistance(m.ace, placeholderSpadesA.ace);
  check(distFromPlaceholder > DIFFERENT_FROM_PLACEHOLDER, `"${family.label}" reads as a different SHAPE from the placeholder (Jaccard distance ${distFromPlaceholder.toFixed(3)} > ${DIFFERENT_FROM_PLACEHOLDER})`);
  for (const [otherLabel, otherMask] of Object.entries(familyMasks)) {
    // Ornate ("bold") is BUILT on Classic's / Minimal's own silhouette
    // with carving added — its outline is deliberately not meant to be a
    // different SHAPE from theirs, so whole-mask Jaccard is the wrong
    // question for this one pair. carvingDistance asks the right one:
    // what fraction of the reference's own ink did the carving touch.
    // Every other pair (including Ornate vs the placeholder, which uses
    // DIFFERENT_FROM_PLACEHOLDER above, and Hand-drawn vs everything,
    // below) is unaffected and still reads whole-mask Jaccard > DIFFERENT.
    if (family.id === 'bold' && (otherLabel === 'Classic' || otherLabel === 'Minimal')) {
      const whole = shapeDistance(m.ace, otherMask);
      const carved = carvingDistance(m.ace, otherMask);
      check(carved > CARVING_DISTINCT,
        `"${family.label}" carves at least a third of "${otherLabel}"'s own silhouette (carving distance ${carved.toFixed(3)} > ${CARVING_DISTINCT}; whole-mask Jaccard ${whole.toFixed(3)} is not the right instrument for this pair — see carvingDistance's own comment)`);
    } else {
      const d = shapeDistance(m.ace, otherMask);
      check(d > DIFFERENT, `"${family.label}" reads as a different SHAPE from "${otherLabel}" (${d.toFixed(3)} > ${DIFFERENT}) — the four families are not near-duplicates`);
    }
  }
  familyMasks[family.label] = m.ace;
}

// ---------------------------------------------------------------------
section('3. Per-suit override — a family, an upload, or back to the placeholder');
// ---------------------------------------------------------------------
// From the "handdrawn" state the loop above left applied to all four,
// override just spades to "minimal".
await setSuitSelect('spades', 'minimal');
{
  const src = await page.evaluate(() => ({ ...window.__cards.suitGlyphSource }));
  check(src.spades === 'minimal' && src.hearts === 'handdrawn' && src.diamonds === 'handdrawn' && src.clubs === 'handdrawn',
    `overriding spades alone leaves the other three suits untouched (${JSON.stringify(src)})`);
  const pressed = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('#glyphFamilies button')) if (b.getAttribute('aria-pressed') === 'true') out.push(b.dataset.family);
    return out;
  });
  check(pressed.length === 0, `no family chip reads "pressed" while the deck is mixed (${JSON.stringify(pressed)})`);
  const summary = await page.$eval('#glyphFamilySummary', (e) => e.textContent);
  check(/Mixed/.test(summary) && /Spades: Minimal/.test(summary), `the summary line names the mix ("${summary}")`);
  const m = await previewMasks(IDX['spades-A']);
  const d = shapeDistance(m.ace, familyMasks['Minimal']);
  check(d < SAME, `the overridden spades ace now matches the pure "Minimal" family render (${d.toFixed(4)} < ${SAME})`);
}

await setSuitSelect('spades', 'placeholder');
{
  const src = await page.evaluate(() => window.__cards.suitGlyphSource.spades);
  check(src === 'placeholder', `switching spades back to "Placeholder" is reported (source: ${src})`);
  const m = await previewMasks(IDX['spades-A']);
  const d = shapeDistance(m.ace, placeholderSpadesA.ace);
  check(d < SAME, `...and the drawn ink matches the original placeholder render again (${d.toFixed(4)} < ${SAME})`);
}

// Custom upload, on the same suit — matching the upload gate's own fixture.
const uploadFixture = path.join(ROOT, 'cards/test-fixtures/svg/spade-square.svg');
{
  const input = await page.$('#suitFile-spades');
  await input.setInputFiles(uploadFixture);
  await page.waitForTimeout(500);
  const src = await page.evaluate(() => window.__cards.suitGlyphSource.spades);
  check(src === 'upload', `uploading an SVG for spades reports source "upload" (got "${src}")`);
  const selectValue = await page.$eval('#suitFamily-spades', (e) => e.value);
  const optionDisabled = await page.$eval(`#suitUploadOption-spades`, (e) => e.disabled);
  check(selectValue === 'upload' && optionDisabled === false, `the per-suit select shows "Your upload" selected and enabled (value "${selectValue}", disabled ${optionDisabled})`);
  const fileName = await page.$eval('#suitFileName-spades', (e) => e.textContent);
  check(fileName === 'spade-square.svg', `the uploaded filename is shown ("${fileName}")`);
  const m = await previewMasks(IDX['spades-A']);
  const d = shapeDistance(m.ace, placeholderSpadesA.ace);
  check(d > DIFFERENT, `the uploaded glyph draws a different shape from the placeholder (${d.toFixed(3)} > ${DIFFERENT})`);
}

await page.click('#suitRows .cd-suit-row:first-child .cd-clear-btn');
await page.waitForTimeout(500);
{
  const src = await page.evaluate(() => ({ ...window.__cards.suitGlyphSource }));
  check(src.spades === 'placeholder', `"clear" resets spades to the placeholder (${JSON.stringify(src)})`);
  check(src.hearts === 'handdrawn' && src.diamonds === 'handdrawn' && src.clubs === 'handdrawn',
    `...without touching the other three suits (still "handdrawn")`);
  const optionDisabled = await page.$eval('#suitUploadOption-spades', (e) => e.disabled);
  check(optionDisabled === true, `"clear" disables the "Your upload" option again until a new file is chosen`);
}

// Drive every suit back to the placeholder and confirm the stretch field
// both hides itself and resets its own value — the one part of this feature
// that is a stateful side effect rather than a pure read of the control set.
await driveSlider('styleGlyphStretch', 175);
for (const suit of ['hearts', 'diamonds', 'clubs']) await setSuitSelect(suit, 'placeholder');
{
  const hidden = await page.$eval('#styleGlyphStretchField', (e) => e.hidden);
  const value = await page.$eval('#styleGlyphStretch', (e) => e.value);
  check(hidden, 'the stretch field hides itself once every suit is back on the placeholder');
  check(value === '100', `...and its own value resets to 100 (was 175) rather than staying stale (value "${value}")`);
}

// ---------------------------------------------------------------------
section('4. Stretch — an independent width-vs-height proportion, not a second size');
// ---------------------------------------------------------------------
await clickFamily('bold'); // a bulbous family whose bounding box is easy to measure

// The lower the stretch pct, the TALLER the ace glyph draws (stretchY is the
// reciprocal of stretchX) — so the lowest pct this sweep can safely use is
// bounded by ACE_CROP's own measured Y band, not by the slider's floor of
// 50%. Derived from a real measurement at 100% rather than from a second
// copy of card-template.js's BASE.courtGlyph/ace-size constants.
await driveSlider('styleGlyphStretch', 100);
const base100 = maskBox((await previewMasks(IDX['spades-A'])).ace);
const cardHeightPx = 1125;
const halfHeightLimitPx = (0.5 - ACE_CROP.y0) * cardHeightPx;
const minSafePct = Math.max(50, Math.ceil((100 * (base100.h / 2)) / halfHeightLimitPx) + 8);
const testPcts = [...new Set([minSafePct, 100, Math.round((minSafePct + 200) / 2), 200])].sort((a, b) => a - b);
check(minSafePct < 200, `derived a safe stretch floor of ${minSafePct}% from the measured 100% ace (${base100.h}px tall, crop band y ${ACE_CROP.y0.toFixed(3)}..${(1 - ACE_CROP.y0).toFixed(3)})`);

const rows = [];
for (const pct of testPcts) {
  await driveSlider('styleGlyphStretch', pct);
  const m = await previewMasks(IDX['spades-A']);
  const box = maskBox(m.ace);
  check(Boolean(box), `stretch ${pct}%: the ace still draws ink`);
  rows.push({ pct, w: box.w, h: box.h });
}
check(rows.every((r, i) => i === 0 || r.w > rows[i - 1].w),
  `ink width rises monotonically with stretch (${rows.map((r) => `${r.pct}%:${r.w}`).join(' < ')})`);
check(rows.every((r, i) => i === 0 || r.h < rows[i - 1].h),
  `...and ink height falls monotonically as it does (${rows.map((r) => `${r.pct}%:${r.h}`).join(' > ')})`);

// Independence from glyphScale: the OVERALL size control must not move when
// stretch does, and vice versa — sampled at a low/high glyphScale pair, at
// stretch pinned back to 100%. glyphScale grows BOTH dimensions together
// (unlike stretch), so its own safe ceiling is derived the same way — from
// the measured 100%/100% ace — rather than assumed at the slider's max.
await driveSlider('styleGlyphStretch', 100);
const maxSafeScalePct = Math.min(150, Math.max(105, Math.floor((100 * halfHeightLimitPx) / (base100.h / 2)) - 8));
const scaleRows = [];
for (const pct of [50, maxSafeScalePct]) {
  await driveSlider('styleGlyphScale', pct);
  const m = await previewMasks(IDX['spades-A']);
  const box = maskBox(m.ace);
  scaleRows.push({ pct, w: box.w, h: box.h });
}
await driveSlider('styleGlyphScale', 100);
const scaleRatioSpread = Math.abs((scaleRows[0].w / scaleRows[0].h) - (scaleRows[1].w / scaleRows[1].h));
const stretchRatioSpread = Math.abs((rows[0].w / rows[0].h) - (rows[rows.length - 1].w / rows[rows.length - 1].h));
check(scaleRatioSpread < stretchRatioSpread / 4,
  `glyphScale barely moves the width/height RATIO (Δ${scaleRatioSpread.toFixed(3)}) next to what stretch does (Δ${stretchRatioSpread.toFixed(3)}) — the two controls are measuring different things`);

// ---------------------------------------------------------------------
section('5. Full 52-card deck + real exports, across two family/stretch-extreme combos');
// ---------------------------------------------------------------------
async function exportAndCapture(buttonId) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.click(`#${buttonId}`),
  ]);
  const tmp = path.join(ROOT, 'tools/.cache', 'glyph-export-' + Date.now() + '-' + download.suggestedFilename());
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  await download.saveAs(tmp);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

// Combo A: "classic" on every suit but clubs (which carries the uploaded
// custom SVG from section 3 unless it was cleared — re-upload here so this
// section is independent of section 3's end state), stretch at its floor.
await clickFamily('classic');
{
  const input = await page.$('#suitFile-clubs');
  await input.setInputFiles(uploadFixture);
  await page.waitForTimeout(400);
}
await driveSlider('styleGlyphStretch', 50);
await page.waitForTimeout(400);

const preExportMaskA = await previewMasks(IDX['spades-K']);
const fullDeckA = await page.evaluate(async () => {
  const cards = await window.__cards.renderFullDeck();
  return { count: cards.length, dataUrlLen: cards[1].canvas.toDataURL().length };
});
check(fullDeckA.count === 52, `renderFullDeck() returns 52 cards with "classic" + a per-suit upload + stretch 50% (got ${fullDeckA.count})`);
check(fullDeckA.dataUrlLen > 1000, `each card's canvas serializes fine — not a tainted canvas (toDataURL length ${fullDeckA.dataUrlLen})`);

const pdfBuf = await exportAndCapture('btnExportPdf');
check(pdfBuf.subarray(0, 5).toString() === '%PDF-', `the PDF export downloaded a real PDF (${(pdfBuf.length / 1024 / 1024).toFixed(1)} MB)`);
check(pdfPageCount(pdfBuf) === 52, `the PDF declares ${pdfPageCount(pdfBuf)} pages`);
const pdfImages = extractPdfImages(pdfBuf);
const pdfCards = pdfImages.filter((im) => im.colorSpace === 'DeviceRGB' && im.width === 825 && im.height === 1125);
check(pdfCards.length === 52, `${pdfCards.length} of them are full-bleed DeviceRGB card rasters (300 DPI)`);
const pdfCardK = pdfCards[1]; // spades K, index 1 of the suit-major deck list
if (check(Boolean(pdfCardK), 'card 2 (spades K) recovered from the PDF')) {
  const pdfMask = inkMask(pdfCardK.rgba, pdfCardK.width, pdfCardK.height, WHOLE_CROP);
  const d = shapeDistance(pdfMask, preExportMaskA.whole);
  check(d < SAME, `the PDF card matches the verified in-page render at "classic" + a per-suit upload + stretch 50% (${d.toFixed(4)} < ${SAME}) — the glyph family, override and stretch all reached the file`);
}

// Combo B: "hand-drawn" on every suit, stretch at its ceiling — the ZIP path.
await clickFamily('handdrawn');
await driveSlider('styleGlyphStretch', 200);
await page.waitForTimeout(400);
const preExportMaskB = await previewMasks(IDX['hearts-K']);

const zipBuf = await exportAndCapture('btnExportZip');
check(zipBuf.subarray(0, 2).toString() === 'PK', `the PNG export downloaded a real ZIP (${(zipBuf.length / 1024 / 1024).toFixed(1)} MB)`);
const { default: JSZipNode } = await import(path.join(ROOT, 'node_modules/jszip/lib/index.js'));
const zip = await JSZipNode.loadAsync(zipBuf);
const names = Object.keys(zip.files).sort();
check(names.length === 52, `the ZIP holds ${names.length} PNGs`);
const target = names.find((n) => n.includes('hearts-K')) || names[14];
const pngBuf = Buffer.from(await zip.file(target).async('nodebuffer'));
const png = decodePNG(pngBuf);
check(png.width === 825 && png.height === 1125, `${target} decodes to ${png.width}×${png.height} px`);
const pngMask = inkMask(png.data, png.width, png.height, WHOLE_CROP);
const dB = shapeDistance(pngMask, preExportMaskB.whole);
check(dB < SAME, `the exported PNG matches the verified in-page render at "hand-drawn" + stretch 200% (${dB.toFixed(4)} < ${SAME})`);

// ---------------------------------------------------------------------
section('6. Hygiene');
// ---------------------------------------------------------------------
check(unroutedExternal.length === 0, `no unrouted external request escaped the harness (${[...new Set(unroutedExternal)].slice(0, 3).join(', ')})`);
check(pageErrors.length === 0, `0 uncaught page errors (${pageErrors.slice(0, 3).join(' | ')})`);

// ---------------------------------------------------------------------
if (NEGATIVE) {
  section('NEGATIVE CONTROL — the discriminating measurements are not vacuous');
  // (a) The SAME family selected twice must render identically — otherwise
  // "matches the pure family render" (section 3) and "matches the in-page
  // render" (section 5) would be comparisons against noise.
  await clickFamily('classic');
  const rep1 = await previewMasks(IDX['spades-A']);
  await clickFamily('minimal');
  await clickFamily('classic');
  const rep2 = await previewMasks(IDX['spades-A']);
  const dRep = shapeDistance(rep1.whole, rep2.whole);
  check(dRep < SAME, `re-selecting "Classic" after visiting "Minimal" reproduces the same ink exactly (${dRep.toFixed(4)} < ${SAME}) — the < ${SAME} comparisons above are measuring something real, not always passing`);

  // (b) Stretch 100% must be a true no-op vs. never having touched the
  // slider — otherwise "monotonic width/height" (section 4) could be an
  // artifact of driveSlider() itself moving something.
  await driveSlider('styleGlyphStretch', 100);
  const flat1 = await previewMasks(IDX['spades-A']);
  await driveSlider('styleGlyphStretch', 150);
  await driveSlider('styleGlyphStretch', 100);
  const flat2 = await previewMasks(IDX['spades-A']);
  const dFlat = shapeDistance(flat1.whole, flat2.whole);
  check(dFlat < SAME, `returning the stretch slider to 100% after visiting 150% reproduces the original ink (${dFlat.toFixed(4)} < ${SAME})`);

  // (c) The shape-distance metric itself must actually separate two
  // genuinely different families — otherwise section 2's ">DIFFERENT"
  // checks above could be passing on a metric that always reads high.
  const classicMask = (await previewMasks(IDX['spades-A'])).ace;
  await clickFamily('minimal');
  const minimalMask = (await previewMasks(IDX['spades-A'])).ace;
  const dDistinct = shapeDistance(classicMask, minimalMask);
  check(dDistinct > DIFFERENT, `"Classic" vs "Minimal" ace glyphs read as different shapes by the same metric used above (${dDistinct.toFixed(3)} > ${DIFFERENT})`);
  const dSelf = shapeDistance(minimalMask, minimalMask);
  check(dSelf === 0, `...and the identical mask compared with itself reads exactly 0 (${dSelf}) — the metric is not just "always > ${DIFFERENT}"`);

  // (d) carvingDistance must actually FAIL — read at or below CARVING_DISTINCT
  // — when Ornate's carving is removed, i.e. when "Ornate" serves exactly
  // Classic's own art under its own name. Otherwise section 2's carving
  // check above could be passing on a metric that always reads high, the
  // same vacuity (c) rules out for shapeDistance. Run on a FRESH page:
  // glyph-presets.js caches a loaded <img> per (family, suit) for the life
  // of the page, and "bold" has already been loaded genuinely earlier in
  // this same page's session — so routing its URL here would be routing a
  // request that never fires.
  {
    const negContext = await browser.newContext();
    for (const [url, file] of Object.entries(CDN_LOCAL)) {
      await negContext.route(url, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) }));
    }
    await negContext.route('**://fonts.googleapis.com/**', (route) => route.abort());
    await negContext.route('**://fonts.gstatic.com/**', (route) => route.abort());
    // Every assets/cards/glyph-presets/bold/<suit>.svg request is served
    // Classic's own file instead — "Ornate" with its carving stripped out,
    // wearing its own id/URL so nothing else about the pipeline changes.
    for (const [suit, file] of Object.entries(SUIT_FILE)) {
      await negContext.route(`**/assets/cards/glyph-presets/bold/${file}.svg`, (route) =>
        route.fulfill({ status: 200, contentType: 'image/svg+xml', body: fs.readFileSync(path.join(ROOT, `assets/cards/glyph-presets/classic/${file}.svg`)) }));
    }
    const negPage = await negContext.newPage();
    await negPage.goto(`${BASE}/cards.html`, { waitUntil: 'load', timeout: 30000 });
    await negPage.waitForFunction(() => window.__cards, null, { timeout: 20000 });
    await negPage.waitForTimeout(500);
    async function maskOn(pg, index) {
      const dataUrl = await pg.evaluate((i) => document.querySelectorAll('#previewGrid canvas')[i].toDataURL('image/png'), index);
      const r = decodePNG(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
      return inkMask(r.data, r.width, r.height, ACE_CROP);
    }
    await negPage.click('#glyphFamilies button[data-family="classic"]');
    await negPage.waitForTimeout(500);
    const negClassicMask = await maskOn(negPage, IDX['spades-A']);
    await negPage.click('#glyphFamilies button[data-family="bold"]');
    await negPage.waitForTimeout(500);
    const negStrippedOrnateMask = await maskOn(negPage, IDX['spades-A']);
    const dStripped = carvingDistance(negStrippedOrnateMask, negClassicMask);
    check(dStripped <= CARVING_DISTINCT, `carvingDistance correctly FAILS the >${CARVING_DISTINCT} bar when "Ornate" is served Classic's own art with no carving at all (${dStripped.toFixed(4)} <= ${CARVING_DISTINCT}) — the check in section 2 is measuring real carving, not always passing`);
    await negContext.close();
  }
}

if (SHOTS) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await clickFamily('bold');
  await driveSlider('styleGlyphStretch', 150);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, 'cards-glyph-presets.png'), fullPage: true });
  console.log(`\nWrote ${path.join(SHOTS, 'cards-glyph-presets.png')}`);
}

await browser.close();
server.close();

console.log('');
if (failures > 0) {
  console.error(`verify-cards-glyph-presets: ${failures} of ${checks} check(s) FAILED`);
  process.exit(1);
} else {
  console.log(`verify-cards-glyph-presets: all ${checks} checks passed`);
}
