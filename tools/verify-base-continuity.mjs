/* ===================================================================
   verify-base-continuity.mjs — GATE: petal-to-BASE continuity under the bloom-base
   construction (docs/flower-petal-origin-surface.md, Phase A; issue #106's first
   defect made measurable).

   WHAT IT MEASURES. With `bloomBase: dome`, every petal ORIGIN is assigned onto the
   base surface — but an assignment is not geometry, and asserting the code's own
   assignment would be a tautology. What can actually fail, and what this gate
   measures, is the BUILT mesh: for every petal the construction placed, at least
   one of that petal's emitted vertices must lie strictly INSIDE the printed base
   body's solid of revolution (the app's own per-petal `embedCount`, computed with
   one estimator on the same vertices the export writes). A petal whose base merely
   grazes the surface and springs away untouched is exactly the free-standing
   failure #106 records the connectedness gate cannot see (a member attached above
   and dangling below is ONE voxel component).

   It also asserts the CENTRE overlaps the body (`centreVertsInside > 0`) on every
   dome row that builds a body — the deliberate centre attachment issue #108 asks
   for, as a named row that fails if it stops. (#108's full closure also needs the
   default-law story; this row covers the dome construction's half.)

   WHAT IT DOES NOT COVER, so a pass is not over-read:
     - whole-model one-piece-ness — that is tools/verify-connectedness.mjs;
     - free ends / the minimum-wire rule (#97);
     - anything at `bloomBase: none` — the construction is inert there by design,
       and the NONE row below asserts exactly that inertness (negative control);
     - non-default `elevation` extremes for the centre assertion — the centre can
       legitimately sit above the pole at elevation +1; rows here run the default.

   VALIDITY (never satisfiable by accident): every set value is read back and the
   run fails on any value that did not take; the NONE row must report the
   construction OFF; each single-layer row's telemetry petal count must equal the
   petalCount it set. GATES-FIRST RECORD: before the construction existed this gate
   failed RED ("bloomBase: not in the DOM") — the recorded red of the Phase A build.

   Usage: node tools/verify-base-continuity.mjs   (exit 0 = pass)
   =================================================================== */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_VERSION = '0.161.0';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const BARE = [
  { id: 'stemType', value: 'none', evt: 'change' },
  { id: 'sepalsType', value: 'none', evt: 'change' },
  { id: 'receptacleType', value: 'none', evt: 'change' },
];

// Each row: label, set, and expectations. `expectOn` — the construction reports on;
// `expectBody` — a body was actually built (false for the tightness-0 collapse, where
// the equator radius is ~0 and the body is deliberately skipped); `petals` — expected
// telemetry petal count (single-layer rows only; null to skip the count assertion).
const ROWS = [
  { label: 'NONE (negative control: construction reports OFF, no telemetry rows)',
    set: [...BARE], expectOn: false, expectBody: false, petals: null },
  { label: 'DOME radial 9, bare', petals: 9,
    set: [...BARE, { id: 'bloomBase', value: 'dome', evt: 'change' }], expectOn: true, expectBody: true },
  { label: 'DOME coiled 12 + START 0.5 (innermost origin moved down the curve)', petals: 12,
    set: [...BARE, { id: 'bloomBase', value: 'dome', evt: 'change' }, { id: 'bloomType', value: 'coiled', evt: 'change' },
          { id: 'petalCount', value: '12' }, { id: 'bloomBaseStart', value: '0.5' }], expectOn: true, expectBody: true },
  { label: 'DOME radial 9 + EXTENT 1.2 (origins on the tuck-under)', petals: 9,
    set: [...BARE, { id: 'bloomBase', value: 'dome', evt: 'change' }, { id: 'bloomBaseExtent', value: '1.2' }],
    expectOn: true, expectBody: true },
  { label: 'DOME + stem + sepals', petals: 9,
    set: [{ id: 'bloomBase', value: 'dome', evt: 'change' }], expectOn: true, expectBody: true },
  { label: 'DOME radial tightness 0 (ring on the axis — body deliberately skipped)', petals: null,
    set: [...BARE, { id: 'bloomBase', value: 'dome', evt: 'change' }, { id: 'tightness', value: '0' }],
    expectOn: true, expectBody: false },
];

// ===== SHIPPED PRESETS + dome — coverage against what actually ships ==============
// The hand-picked rows above all passed while Lily's six petals read embedCount 0: the
// tangential-contact failure lived in a shipped petal recipe (long reflexed straps,
// GROWTH infill), not in the 9-petal probe design. Every preset is therefore a named
// row: loaded by clicking its gallery cell (the real applyDesign path), then dome on.
// A failure reads "preset: Lily", never "config N".
import { pathToFileURL } from 'node:url';
const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
for (const p of PRESETS) {
  ROWS.push({ label: `preset: ${p.name} + dome`, presetSlug: p.slug, petals: null,
    set: [{ id: 'bloomBase', value: 'dome', evt: 'change' }], expectOn: true, expectBody: true });
}

// BASE state every row starts from (mirrors verify-connectedness.mjs's BASE).
const BASE = [
  { id: 'bloomType', value: 'radial', evt: 'change' }, { id: 'petalCount', value: '9' },
  { id: 'layerCount', value: '1' }, { id: 'infillType', value: 'veins', evt: 'change' },
  { id: 'continuousMargin', value: 'on', evt: 'change' }, { id: 'heightMM', value: '120' },
  { id: 'stemType', value: 'stem', evt: 'change' }, { id: 'sepalsType', value: 'sepals', evt: 'change' },
  { id: 'tube', value: '0.4' }, { id: 'stemCurve', value: '0' }, { id: 'stemLength', value: '4' },
  { id: 'stemThickness', value: '1' }, { id: 'receptacleType', value: 'none', evt: 'change' },
];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});

const failures = [];
for (const row of ROWS) {
  // Fresh page per row — a row's meaning must not depend on the row before it.
  await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
  await page.evaluate(() => {
    const t = document.getElementById('advancedToggle'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (row.presetSlug) {
    // Load the preset through the real gallery-click path, then apply only the row's
    // own set (dome on). No BASE here — the preset fully replaces state.
    const clicked = await page.evaluate((slug) => {
      const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${slug}"]`);
      if (!cell) return false; cell.click(); return true;
    }, row.presetSlug);
    if (!clicked) { failures.push(`${row.label}: gallery cell not found`); continue; }
    await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 });
  }
  // READ-BACK: fail the row on any value that did not take; never warn.
  const bad = await page.evaluate((ss) => {
    const out = [];
    for (const s of ss) {
      const el = document.getElementById(s.id);
      if (!el) { out.push(`${s.id}: not in the DOM`); continue; }
      el.value = s.value;
      el.dispatchEvent(new Event(s.evt || 'input', { bubbles: true }));
      if ((s.evt || 'input') !== 'change') el.dispatchEvent(new Event('change', { bubbles: true }));
      const got = el.value;
      const num = s.value !== '' && got !== '' && isFinite(Number(s.value)) && isFinite(Number(got));
      if (!(num ? Math.abs(Number(s.value) - Number(got)) < 1e-9 : String(s.value) === String(got))) out.push(`${s.id}: set "${s.value}", reads back "${got}"`);
    }
    return out;
  }, row.presetSlug ? row.set : [...BASE, ...row.set]);
  if (bad.length) { failures.push(`${row.label}: config did not take: ${bad.join('; ')}`); continue; }
  // Wait for the scheduled rebuild the last input triggered, on the real signal.
  await page.waitForFunction(() => { const b = document.getElementById('building'); return !b || !b.classList.contains('is-on'); }, { timeout: 120000 });
  await page.waitForTimeout(300);
  const meta = await page.evaluate(() => window.__bloomBaseMeta || null);
  if (!meta) { failures.push(`${row.label}: window.__bloomBaseMeta is not published — the construction's telemetry is missing`); continue; }
  if (!!meta.on !== row.expectOn) { failures.push(`${row.label}: meta.on=${meta.on}, expected ${row.expectOn}`); continue; }
  if (!row.expectOn) {
    if ((meta.petals || []).length !== 0) failures.push(`${row.label}: construction OFF but ${meta.petals.length} telemetry petals recorded`);
    continue;
  }
  if (!!meta.bodyBuilt !== row.expectBody) { failures.push(`${row.label}: bodyBuilt=${meta.bodyBuilt}, expected ${row.expectBody}`); continue; }
  if (!row.expectBody) continue;   // skipped-body row: the outcome above IS the assertion
  const petals = meta.petals || [];
  if (row.petals != null && petals.length !== row.petals) {
    failures.push(`${row.label}: telemetry records ${petals.length} petals, expected ${row.petals}`); continue;
  }
  if (!petals.length) { failures.push(`${row.label}: no telemetry petals recorded on a dome row`); continue; }
  const loose = petals.filter((p) => !(p.embedCount >= 1));
  if (loose.length) {
    failures.push(`${row.label}: ${loose.length}/${petals.length} petal(s) have NO built vertex inside the base body `
      + `(first: az=${loose[0].az.toFixed(3)}, s=${loose[0].s.toFixed(3)}, embedCount=${loose[0].embedCount})`);
  }
  if (!(meta.centreVertsInside > 0)) {
    failures.push(`${row.label}: centreVertsInside=${meta.centreVertsInside} — the centre does not overlap the base body (#108's deliberate-attachment row)`);
  }
  const minEmbed = Math.min(...petals.map((p) => p.embedCount));
  console.log(`  ok    ${row.label}: ${petals.length} petals all embedded (min embedCount ${minEmbed}), centreVertsInside=${meta.centreVertsInside}, R=${meta.R.toFixed(3)} H=${meta.H.toFixed(3)} E=${meta.E.toFixed(3)}`);
}
await browser.close();
server.close();

if (failures.length) {
  console.error(`\nbase-continuity: FAIL — ${failures.length} row(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nbase-continuity: PASS — every dome petal embeds in the printed base body, the centre overlaps it, and the construction is inert at bloomBase none.');
