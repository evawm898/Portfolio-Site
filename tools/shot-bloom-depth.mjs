/* ===================================================================
   THE DEPTH SHEET — the print-preview toggle and the depth raise to six,
   composed to carry two rulings rather than to look tidy (Eva, Sep 3).

   (1) THE MUM, LIVE BESIDE PRINT PREVIEW, SAME CAMERA. This pair is the whole
       argument for the toggle: the run Eva ruled a fused mass has 120 feet
       floored at 1.60 mm on a 3.63 mm ring live and a 4.69 mm ring printed,
       and until today the viewport could only show the former. Both cells
       are the SAME page, the SAME __bloomFrame call with the SAME numbers
       (sized once from the LIVE hub — the first render sized each mode from
       its own hub and the larger printed hub came out pulled back to the
       same apparent size) and the SAME base crop from below at hub
       magnification (the crowding sheet's rule: a camera close enough to
       read the base stands inside the canopy from every other side); only
       the real #printPreview box differs between them.
       If the two look the same, the caption says so in numbers rather than
       the sheet pretending otherwise: the ring radius, the foot and the
       hub-plane D_max are printed for each, from the app's own metrics for
       the geometry it is showing.

   (2) DEPTH 4 / 5 / 6 AT SPREAD 2.00 on the layers sheet's "reads as depth"
       cell (3 x 0.90 x tilt 12, ruled clean), with each cell's crowding
       number — the states that sit UNRULED just under the threshold Eva
       held at 11 pending this sheet (4 / 5 / 4 measured). And the mum taken
       to six turns, with its base crop: the deepest state of the one
       configuration ruled bad (19).

   (3) CONTROLS: the shipping default and the three-deep depth cell, with
       their numbers, so the eye has the clean end of the scale on the same
       page.

   EVERY CELL STATES ITS MODE, from the app's own `shownMode` through the
   harness's modeTag() — never from what this tool believes it set — and the
   crowding number is registered against a real export (R1). Chrome hidden
   and auto-rotate off through the harness's asserted stillFrame(); whole
   state read back on every cell; the gates' own junction assertions run
   before the shutter; the frame is decoded and required to carry content.
   The toggle's state is read back after every flip, so a cell captioned
   PRINT PREVIEW is one the app confirmed it was rendering.

   WHAT THIS SHEET IS NOT: a gate. Watertightness and connectedness are the
   two STL gates' business, and both are green on every one of these cells
   by construction — the depth raise moves no topology and the toggle moves
   no bytes. This shows what the deep end LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-depth.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, settleBuild, modeTag, shownModeOf, MIN_FEATURE_MM, MAX_LAYERS } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, CROWDED_DMAX } from './bloom-crowding.mjs';

const outDir = process.argv[2] || '/tmp/bloom-depth';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-depth-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/* The base crop and the whole bloom — the crowding sheet's two framings,
   the base from below at a magnification set by the hub. */
const VIEWS = {
  base: (hubR) => ({ r: Math.max(hubR * 2.0, 5), at: [0, 0, 0], dir: [0.35, -0.9, -0.45] }),
  whole: null,
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

async function shoot(file, view, hubR, fitRadius) {
  if (VIEWS[view]) { const f = VIEWS[view](hubR); await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
  else await page.evaluate((rr) => window.__bloomFrame(rr, 0.15), fitRadius);
  await page.waitForTimeout(260);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 800, height: 800 } });
  const { width, height, data } = decodePNG(fs.readFileSync(file));
  let content = 0;
  for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  const frac = content / (width * height);
  if (frac < 0.02 || frac > 0.98) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
  return path.basename(file);
}

/* One configuration, photographed in one or both modes. Returns one record
   per mode with its own numbers read from the app while that mode was on
   screen. */
async function cell({ label, set: sets = [], modes = ['live'], views = ['base', 'whole'], ruling = '', note = '' }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  /* The crowding number, registered against a real export (R1) — taken
     BEFORE chrome goes away, because the export click needs the button. */
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const { bad: cb, r } = await footCrowding(page, { label, set: sets }, analyzeStl(buf));
  if (cb.length) await die(`${label}: ${cb.join('; ')}`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  /* THE CAMERA IS FIXED FROM THE LIVE GEOMETRY, ONCE PER CONFIGURATION. The
     first render of the mum pair framed each mode from its own hub radius,
     and the 29% larger printed hub was pulled back by exactly 29% — two
     cells that looked the same size and were not. Both modes are shot with
     the same numbers, so what differs on the sheet is the object. */
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const frameHub = m0.hubRadius, frameFit = m0.fitRadius;
  const out = [];
  for (const mode of modes) {
    await setPreview(mode === 'export');
    const m = await page.evaluate(() => window.__bloomMetrics());
    const shots = {};
    for (const view of views) shots[view] = await shoot(path.join(outDir, `${slug(label)}-${mode}-${view}.png`), view, frameHub, frameFit);
    out.push({
      label, mode, tag: modeTag(m), ruling, note, shots, r,
      shownTris: m.shownTris, hub: m.hubRadius, foot: m.ringWidth, maxDim: m.maxDimMm,
      rings: m.rings.length, inner: Math.min(...m.rings.map((x) => x.radius)),
      readoutFirst: await page.evaluate(() => document.getElementById('readout').textContent.split('\n')[0]),
    });
    console.log(`  ${label.padEnd(50)} ${mode.padEnd(6)} hub ${m.hubRadius.toFixed(2)} inner ${Math.min(...m.rings.map((x) => x.radius)).toFixed(2)} tris ${m.shownTris} · ${modeTag(m)}`);
  }
  await setPreview(false);
  console.log(`  ${''.padEnd(50)} ${crowdingLine(r)}`);
  return out;
}

const MUM = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 };
const DEPTH_CELL = { layerSize: 0.9 };

const pair = await cell({ label: 'THE MUM — live and print preview, same camera', set: set(MUM), modes: ['live', 'export'],
  ruling: 'RULED BAD (Eva, Sep 3): the fused base', note: 'Left: the live geometry, as authored — sheet 0.60 mm, feet 1.60 mm on a 3.63 mm ring. Right: the print preview, the same page with the box ticked — sheet floored to 1.00 mm and the ring re-derived at 4.69 mm from the floored feet. The STL is the right-hand object; until this toggle the viewport could only show the left one.' });
const deep = [];
for (const d of [4, 5, 6]) deep.push(...await cell({ label: `DEPTH CELL at ${d} layers — 0.90 x tilt 12, spread 2.00`, set: set({ ...DEPTH_CELL, layerCount: d }),
  ruling: 'UNRULED — the three-deep cell was ruled "reads as depth"; these are it, deeper', note: `D_max measured 4 / 5 / 4 at depths 4 / 5 / 6 — under the threshold of ${CROWDED_DMAX}, and the nearest unruled states to it on a configuration Eva has already ruled clean at three.` }));
const mum6 = await cell({ label: `THE MUM at ${MAX_LAYERS} turns — the deepest state of the ruled-bad run`, set: set({ ...MUM, layerCount: MAX_LAYERS }),
  ruling: 'CROWDED (D_max 19 measured)', note: 'The same run at the new maximum depth: 240 feet, every one floored at 1.60 mm, on rings from 6.63 mm down to 1.75 mm printed. Over-connection, not detachment — this exports watertight and as one piece.' });
const controls = [
  ...await cell({ label: 'SHIPPING DEFAULTS — 8 petals, spread 2.00, DISC', set: [], ruling: 'RULED CLEAN', note: 'The control every other cell is read against.' }),
  ...await cell({ label: 'THE DEPTH CELL at 3 layers — 0.90 x tilt 12', set: set({ ...DEPTH_CELL, layerCount: 3 }), ruling: 'RULED CLEAN — "reads as depth" (the layers sheet)', note: 'The three-deep cell as it was ruled.' }),
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => {
  const r = c.r;
  return `<b>${esc(c.tag)}</b> · shown geometry: hub ${c.hub.toFixed(2)} mm · innermost ring ${c.inner.toFixed(2)} mm · foot ${c.foot.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (${c.mode}) · max dim ${c.maxDim.toFixed(1)} mm (${c.mode})`
    + `<br>CROWDING (export): D_max ${r.dmax} at r ${r.dmaxAt.r.toFixed(2)} mm · D_mean ${r.dmean.toFixed(2)} · ${r.n} feet`
    + (r.liveDmax !== r.dmax ? ` · live geometry reads D_max ${r.liveDmax}` : '') + (r.crowded ? ` · <b class="flag">CROWDED (D_max &ge; ${CROWDED_DMAX})</b>` : '');
};
const fig = (c, view) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${view === 'base' ? 'base from below, hub magnification' : 'whole bloom'}, ${c.mode === 'export' ? 'PRINT PREVIEW' : 'LIVE'})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}`
  + (view === 'base' && c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`;
const html = `<title>Depth to six, and the print preview</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}.flag{color:#f0b060}</style>
<h1>The print preview, and depth to six</h1>
<p class="note"><b>Every cell states which geometry it shows</b> — read from the app's own shownMode after the real box was flipped, never from what this tool intended. The crowding number in every caption is the EXPORT's, registered against a real STL of that cell (R1); where the shown geometry is the live one and its base reads differently, that reading is printed beside it. Chrome hidden and auto-rotate off, asserted. Threshold: CROWDED at D_max &ge; ${CROWDED_DMAX} (Eva, Sep 3, held pending this sheet).</p>
<h2>1. The mum — live beside print preview, same camera</h2>
<p class="note">The pair that justifies the toggle. Same page, same framing, same crop from below at hub magnification; only the Print preview box differs. Left is what the viewport has always shown; right is the object the STL describes — sheet floored from 0.60 to 1.00 mm, the ring re-derived from the floored feet at 4.69 mm instead of 3.63 mm (+29%).</p>
<main>${pair.map((c) => fig(c, 'base')).join('')}</main>
<main>${pair.map((c) => fig(c, 'whole')).join('')}</main>
<h2>2. The depth cell at 4 / 5 / 6 layers, spread 2.00 — the unruled states under the line</h2>
<main class="three">${deep.map((c) => fig(c, 'whole')).join('')}</main>
<main class="three">${deep.map((c) => fig(c, 'base')).join('')}</main>
<h2>3. The mum at six turns — the deepest state of the ruled-bad run</h2>
<main>${mum6.map((c) => fig(c, 'base')).join('')}${mum6.map((c) => fig(c, 'whole')).join('')}</main>
<h2>4. Controls — the clean end of the scale</h2>
<main>${controls.map((c) => fig(c, 'base')).join('')}</main>
<main>${controls.map((c) => fig(c, 'whole')).join('')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
