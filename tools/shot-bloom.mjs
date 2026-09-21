/* ===================================================================
   shot-bloom.mjs — contact sheets for the Parametric Bloom. Canvas only.

   The metric screens; eyes decide. A sheet is required before committing
   anything visual. This was the phase-2 A/B rig's sheet — Eva ruled the
   centre archetype from it (DISC, Aug 31) — and the rig is RETIRED (session
   20): the style axis is gone and the cells are spread x count on the bare
   apex. It is kept because the honest states below are still the honest
   states, and because a whole-flower shot cannot carry a hub ruling.

   WHAT IT SHOOTS
     overview  spread {min, default, max} x petal count {5, 8, 13} — 9 cells.
     centres   the same spread strip at petal count 8, with the CAMERA PULLED
               IN to the foot ring — 3 cells. This strip exists because the
               subject occupies a small fraction of the frame: at spread 1.00
               the foot ring is 4.4 mm against a 35 mm petal. The flower
               project made exactly this mistake with `tailXZ`, answering "is
               anything down there" for a question that was "how far down".
     honest    the two deliberately ugly states, full frame and zoomed. A
               sheet of clean cases is a sales brochure; the ruling has to be
               made with these in it.
                 - the crowded bud: ALL MIN x spread 0.60, where the ring is
                   tighter than the area rule's derived radius and the feet
                   cross the axis;
                 - the plate: defaults x spread 6.00, where the
                   derived hub disc spans 53 mm at 1.2 mm thick and the
                   plumbing becomes the loudest thing in the frame. The
                   charter predicted this state when it parked the spread
                   ruling; whether it is objectionable is a ruling, not a
                   gate, so it is photographed rather than prevented.

   THE FRAME IS ASSERTED, NOT TRUSTED — ported from the flower's two silent
   defects (the control panel composited into every frame; autoRotate left on,
   making camera angle a function of wall-clock time and every cross-run pixel
   diff meaningless). This tool sets `body.bl-preview` (the one owner of
   chrome-hiding, in bloom.css) and unchecks autoRotate through the real
   input, then READS BACK computed styles and the checkbox and exits hard if
   either did not take.

   THE ZOOM IS THE APP'S OWN CAMERA, not a crop. window.__bloomFrame drives
   bloom.js's fitCamera at a smaller radius; the tool does no projection maths,
   so it cannot drift from the camera the viewer actually sees.

   REAL-UI REACTIVITY. This is also the check that the registry-generated
   panel EXISTS and REACTS: declarations being right (what the gates' state
   read-back proves) and the app responding to real input events are two
   different properties. Every cell drives the real controls with real events
   and asserts the readout moved to match — the UI route, not the snapshot
   route.

   RUN:  node tools/shot-bloom.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, CONTROLS, DEFAULTS, modeTag } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-sheets';
const spreadCtl = CONTROLS.find((c) => c.id === 'spread');
const SPREADS = [spreadCtl.min, spreadCtl.default, spreadCtl.max];
const COUNTS = [5, 8, 13];
const ZOOM_COUNT = 8;
const sliderMins = Object.fromEntries(CONTROLS.filter((c) => c.kind === 'slider').map((c) => [c.id, c.min]));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* Preview mode + still camera. The assertion itself lives in the harness —
   there are two shot tools now, and the flower project's screenshot plumbing
   drifted precisely because each tool kept its own copy. */
async function preview() {
  const bad = await stillFrame(page);
  if (bad.length) await die(bad.join('; '));
}

/* One cell: fresh page, real controls, every assertion, then the shots. */
async function cell({ label, set, zoom }) {
  await openBloom(page, port);
  await preview();
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await page.waitForTimeout(450);   // rAF rebuild + camera refit

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  /* The app REACTED — asserted against the readout the rebuild writes, for a
     slider and the spread slider. */
  for (const [re, what] of [
    [new RegExp(`petals ${Number(want.petalCount)}\\b`), `petalCount ${want.petalCount}`],
    [new RegExp(`spread ${Number(want.spread).toFixed(2)}x`), `spread ${want.spread}`],
  ]) if (!re.test(readout)) await die(`${label}: set ${what} through the UI but the readout says "${readout}" — the app did not react`);

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!(m.ringRadius > 0)) await die(`${label}: metrics report ring radius ${m.ringRadius}`);

  const shots = { full: await page.locator('#bloom-canvas').screenshot() };
  if (zoom) {
    /* The app's own camera at the ring's scale — 2.2x the foot ring, target
       on the hub plane rather than lifted into the whorl. */
    await page.evaluate((r) => window.__bloomFrame(r * 2.2, 0), m.ringRadius);
    await page.waitForTimeout(250);
    shots.zoom = await page.locator('#bloom-canvas').screenshot();
  }
  const caption = `ring ${m.ringRadius.toFixed(2)} mm (derived ${m.derivedRadius.toFixed(2)}) · tris (live) ${m.liveTris.toLocaleString('en-US')}`
    + ` · max dim (live) ${m.maxDimMm.toFixed(1)} mm · ${modeTag(m)}`;
  console.log(`  ${label.padEnd(34)} ${caption}`);
  return { label, caption, ...shots };
}

const overview = [], centres = [], honest = [];
console.log(`overview + hub strip: ${SPREADS.length} spreads × ${COUNTS.length} counts`);
for (const spread of SPREADS) {
  for (const count of COUNTS) {
    const zoom = count === ZOOM_COUNT;
    const c = await cell({
      label: `spread ${spread.toFixed(2)} · ${count}p`,
      set: [{ id: 'spread', value: String(spread) }, { id: 'petalCount', value: String(count) }],
      zoom,
    });
    overview.push(c);
    if (zoom) centres.push(c);
  }
}

console.log('honest states:');
honest.push(await cell({
  label: 'THE CROWDED BUD · ALL MIN × spread 0.60',
  set: Object.entries(sliderMins).map(([id, v]) => ({ id, value: String(v) })),
  zoom: true,
}));
honest.push(await cell({
  label: 'THE PLATE · defaults × spread 6.00',
  set: [{ id: 'spread', value: '6' }],
  zoom: true,
}));

await browser.close();
server.close();

/* ---- compose (pure presentation: one page screenshot per sheet) ---- */
const CELL = 300;
const fig = (c, which) => `<figure><img src="data:image/png;base64,${c[which].toString('base64')}">
  <figcaption><b>${c.label}</b><br>${c.caption}</figcaption></figure>`;
function sheet(title, note, cells, which, perRow) {
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin:0; background:#000; color:#9fdcc4; font:12px ui-monospace,Menlo,monospace; }
    h1 { font-size:15px; margin:14px 12px 2px; color:#cfeee0; }
    p.note { margin:0 12px 10px; opacity:.65; max-width:1100px; line-height:1.5; }
    main { display:grid; grid-template-columns:repeat(${perRow}, ${CELL}px); gap:10px; padding:12px; }
    figure { margin:0; }
    img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
    figcaption { padding-top:4px; opacity:.72; font-size:10.5px; line-height:1.45; }
    figcaption b { color:#cfeee0; font-weight:500; }
  </style><h1>${title}</h1><p class="note">${note}</p><main>${cells.map((c) => fig(c, which)).join('')}</main>`;
}

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, cells, which, perRow] of [
  ['bloom-overview', 'Bloom — spread x count overview (bare apex)', `Spread {${SPREADS.map((s) => s.toFixed(2)).join(', ')}} x petal count {${COUNTS.join(', ')}}, the centre rig retired (session 20). Chrome hidden, autoRotate off, one fresh page per cell, every value read back. Whole-flower framing: the hub is a small fraction of each frame — read it from the strip below, not from these.`, overview, 'full', COUNTS.length * SPREADS.length],
  ['bloom-centres', 'Bloom — the hub strip (zoomed)', `The same spread strip at ${ZOOM_COUNT} petals, camera pulled in to 2.2x the foot ring using the app's own fitCamera. The derived hub disc alone — the plumbing, bare.`, centres, 'zoom', SPREADS.length],
  ['bloom-honest', 'Bloom — the two states worth objecting to', 'Left pair: the crowded bud, ALL MIN x spread 0.60 — the ring is tighter than the area rule derived radius and the feet cross the axis. Right pair: the plate, defaults x spread 6.00 — the derived hub disc spanning the ring at sheet thickness. Both are watertight, both export as one connected piece, and both are reachable on purpose. Full frame then zoomed.', [...honest.map((c) => ({ ...c, full: c.full })), ...honest.map((c) => ({ ...c, full: c.zoom, label: c.label + ' (zoomed)' }))], 'full', 2],
]) {
  const p2 = await b2.newPage({ viewport: { width: perRow * (CELL + 10) + 30, height: 900 } });
  await p2.setContent(sheet(title, note, cells, which, perRow), { waitUntil: 'load' });
  const fp = path.join(outDir, name + '.png');
  await p2.screenshot({ path: fp, fullPage: true });
  await p2.close();
  written.push(`${fp} (${(fs.statSync(fp).size / 1024).toFixed(0)} KiB)`);
}
await b2.close();
console.log('\nsheets:\n  ' + written.join('\n  '));
