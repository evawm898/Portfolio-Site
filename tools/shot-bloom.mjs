/* ===================================================================
   shot-bloom.mjs — contact sheets for the Parametric Bloom. Canvas only.

   The metric screens; eyes decide. A sheet is required before committing
   anything visual, and for the phase-2 A/B rig the sheet IS the deliverable:
   Eva rules on the centre archetype from it. So it is built to carry a
   ruling, not to look tidy.

   WHAT IT SHOOTS
     overview  every style (NONE / DOME / DISC / RING) x spread
               {min, 1.00, max} x petal count {5, 8, 13} — 36 cells.
     centres   the same style x spread grid at petal count 8, with the CAMERA
               PULLED IN to the foot ring — 12 cells. This strip exists
               because the subject occupies a small fraction of the frame: at
               the 1.00 default the foot ring is 4.4 mm against a 35 mm petal,
               and a whole-flower shot cannot carry a centre ruling. The
               flower project made exactly this mistake with `tailXZ`,
               answering "is anything down there" for a question that was
               "how far down".
     honest    the two deliberately ugly states, full frame and zoomed. A
               sheet of clean cases is a sales brochure; the ruling has to be
               made with these in it.
                 - the crowded bud: ALL MIN x spread 0.60, where the ring is
                   tighter than the area rule's derived radius and the feet
                   cross the axis;
                 - the plate: defaults x spread 6.00 x centre NONE, where the
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
   route — and now that a <select> is in the panel, that route covers a choice
   control too.

   RUN:  node tools/shot-bloom.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, CONTROLS, DEFAULTS } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-sheets';
const STYLES = ['NONE', 'DOME', 'DISC', 'RING'];
const spreadCtl = CONTROLS.find((c) => c.id === 'spread');
const SPREADS = [spreadCtl.min, spreadCtl.default, spreadCtl.max];
const COUNTS = [5, 8, 13];
const ZOOM_COUNT = 8;
const sliderMins = Object.fromEntries(CONTROLS.filter((c) => c.kind === 'slider' && c.role !== 'center').map((c) => [c.id, c.min]));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* Preview mode + still camera, then ASSERT both took. */
async function stillFrame() {
  await page.evaluate(() => {
    document.body.classList.add('bl-preview');
    const ar = document.getElementById('autoRotate');
    if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(120);
  const bad = await page.evaluate(() => {
    const out = [];
    const ar = document.getElementById('autoRotate');
    if (!ar) out.push('#autoRotate missing'); else if (ar.checked) out.push('autoRotate still on');
    for (const sel of ['.bl-panel', '.bl-viewpanel', '.bl-header']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
    }
    return out;
  });
  if (bad.length) await die(bad.join('; '));
}

/* One cell: fresh page, real controls, every assertion, then the shots. */
async function cell({ label, set, zoom }) {
  await openBloom(page, port);
  await stillFrame();
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await page.waitForTimeout(450);   // rAF rebuild + camera refit

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  /* The app REACTED — asserted against the readout the rebuild writes, for a
     slider, the new spread slider, and the <select>, so a choice control that
     set its value without driving a rebuild cannot pass. */
  for (const [re, what] of [
    [new RegExp(`petals ${Number(want.petalCount)}\\b`), `petalCount ${want.petalCount}`],
    [new RegExp(`spread ${Number(want.spread).toFixed(2)}x`), `spread ${want.spread}`],
    [new RegExp(`center ${String(want.centerStyle).toLowerCase()}\\b`), `centerStyle ${want.centerStyle}`],
  ]) if (!re.test(readout)) await die(`${label}: set ${what} through the UI but the readout says "${readout}" — the app did not react`);

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.centerStyle !== want.centerStyle) await die(`${label}: metrics say centre "${m.centerStyle}", state says "${want.centerStyle}"`);
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
    + (m.centerTris ? ` (+${m.centerTris.toLocaleString('en-US')} centre)` : '')
    + ` · max dim (live) ${m.maxDimMm.toFixed(1)} mm`;
  console.log(`  ${label.padEnd(34)} ${caption}`);
  return { label, caption, ...shots };
}

const overview = [], centres = [], honest = [];
console.log(`overview + centres: ${STYLES.length} styles × ${SPREADS.length} spreads × ${COUNTS.length} counts`);
for (const style of STYLES) {
  for (const spread of SPREADS) {
    for (const count of COUNTS) {
      const zoom = count === ZOOM_COUNT;
      const c = await cell({
        label: `${style} · spread ${spread.toFixed(2)} · ${count}p`,
        set: [{ id: 'centerStyle', value: style }, { id: 'spread', value: String(spread) }, { id: 'petalCount', value: String(count) }],
        zoom,
      });
      overview.push(c);
      if (zoom) centres.push(c);
    }
  }
}

console.log('honest states:');
honest.push(await cell({
  label: 'THE CROWDED BUD · ALL MIN × spread 0.60',
  set: [...Object.entries(sliderMins).map(([id, v]) => ({ id, value: String(v) })), { id: 'centerStyle', value: 'NONE' }],
  zoom: true,
}));
honest.push(await cell({
  label: 'THE PLATE · defaults × spread 6.00 × NONE',
  set: [{ id: 'spread', value: '6' }, { id: 'centerStyle', value: 'NONE' }],
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
  ['bloom-overview', 'Bloom centre A/B — overview', `Every style x spread {${SPREADS.map((s) => s.toFixed(2)).join(', ')}} x petal count {${COUNTS.join(', ')}}. Chrome hidden, autoRotate off, one fresh page per cell, every value read back. Whole-flower framing: the centre is a small fraction of each frame — rule on the centre from the strip below, not from these.`, overview, 'full', COUNTS.length * SPREADS.length],
  ['bloom-centres', 'Bloom centre A/B — centre strip (zoomed)', `The same style x spread grid at ${ZOOM_COUNT} petals, camera pulled in to 2.2x the foot ring using the app's own fitCamera. THIS is the ruling surface. NONE is the derived hub disc alone — the plumbing, shown so each designed centre is judged against what it replaces.`, centres, 'zoom', SPREADS.length],
  ['bloom-honest', 'Bloom centre A/B — the two states worth objecting to', 'Left pair: the crowded bud, ALL MIN x spread 0.60 — the ring is tighter than the area rule derived radius and the feet cross the axis. Right pair: the plate, defaults x spread 6.00 with no centre — the derived hub disc spanning the ring at sheet thickness. Both are watertight, both export as one connected piece, and both are reachable on purpose. Full frame then zoomed.', [...honest.map((c) => ({ ...c, full: c.full })), ...honest.map((c) => ({ ...c, full: c.zoom, label: c.label + ' (zoomed)' }))], 'full', 2],
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
