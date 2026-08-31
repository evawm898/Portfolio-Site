/* ===================================================================
   shot-bloom.mjs — contact sheet for the Parametric Bloom. Canvas only.

   Shoots the default whorl at several petal counts and composes one sheet.
   The metric screens; eyes decide — a sheet is required before committing
   anything visual (flower-project convention).

   THE FRAME IS ASSERTED, NOT TRUSTED. The flower's screenshot tool shipped
   with two silent defects — the control panel composited into ~40% of every
   frame, and autoRotate left on so the camera angle was a function of
   wall-clock time, invalidating every cross-run pixel diff. Both fixes are
   ported as ASSERTIONS: this tool sets `body.bl-preview` (the one owner of
   chrome-hiding, in bloom.css) and unchecks autoRotate through the real
   input, then READS BACK computed styles and the checkbox and exits hard if
   either did not take. A harness that sets state without reading it back
   reports whatever it happens to compute.

   REAL-UI REACTIVITY. This tool is also the minimal check that the
   registry-generated panel actually EXISTS and REACTS: declarations being
   right (what the gates' state read-back proves) and the app responding to
   input events are two different properties. Each cell here drives the real
   slider with real events and asserts the readout's petal count moved to
   match — the UI route, not the state-snapshot route.

   RUN:  node tools/shot-bloom.mjs <out.png> [count,count,...]
         default counts: 3,5,8,13
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outPath = process.argv[2] || '/tmp/bloom-contact.png';
const counts = (process.argv[3] || '3,5,8,13').split(',').map((s) => parseInt(s, 10));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });

const shots = [];   // { label, png (buffer) }
for (const n of counts) {
  await openBloom(page, port);   // fresh page per cell — no state leaks between cells

  /* Preview mode + still camera, then ASSERT both took. */
  await page.evaluate(() => {
    document.body.classList.add('bl-preview');
    const ar = document.getElementById('autoRotate');
    if (ar && ar.checked) { ar.checked = false; ar.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(120);
  const frameBad = await page.evaluate(() => {
    const out = [];
    const ar = document.getElementById('autoRotate');
    if (!ar) out.push('#autoRotate missing'); else if (ar.checked) out.push('autoRotate still on');
    for (const sel of ['.bl-panel', '.bl-viewpanel', '.bl-header']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') out.push(sel + ' still visible');
    }
    return out;
  });
  if (frameBad.length) {
    console.error('HARNESS INVALID: ' + frameBad.join('; '));
    await browser.close(); server.close(); process.exit(2);
  }

  /* Drive the REAL input, then assert both the value took and the app
     reacted through the UI (the readout is written by the rebuild). */
  const bad = await applyConfig(page, [{ id: 'petalCount', value: String(n) }]);
  const drift = bad.length ? [] : await fullStateDrift(page, [{ id: 'petalCount', value: String(n) }]);
  if (bad.length || drift.length) {
    console.error(`HARNESS INVALID at count ${n}: ${[...bad, ...drift].join('; ')}`);
    await browser.close(); server.close(); process.exit(2);
  }
  await page.waitForTimeout(500);   // rAF rebuild + camera refit
  const readout = await page.evaluate(() => document.getElementById('readout')?.textContent || '');
  if (!new RegExp(`petals ${n}\\b`).test(readout)) {
    console.error(`HARNESS INVALID: set petalCount ${n} through the UI but the readout says "${readout}" — the app did not react`);
    await browser.close(); server.close(); process.exit(2);
  }
  const png = await page.locator('#bloom-canvas').screenshot();
  shots.push({ label: `${n} petals`, png, readout: readout.replace(/\s+/g, ' ').trim() });
  console.log(`cell: ${n} petals — ${shots[shots.length - 1].readout}`);
}
await browser.close();
server.close();

/* Compose the sheet (pure presentation, one page screenshot). */
const CELL = 420;
const cells = shots.map((s) => `
  <figure><img src="data:image/png;base64,${s.png.toString('base64')}"><figcaption>${s.label} · ${s.readout}</figcaption></figure>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; background:#000; color:#9fdcc4; font:13px ui-monospace,Menlo,monospace; }
  main { display:flex; flex-wrap:wrap; gap:10px; padding:12px; }
  figure { margin:0; }
  img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
  figcaption { text-align:center; opacity:.6; padding-top:4px; }
</style><main>${cells}</main>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const p2 = await b2.newPage({ viewport: { width: 2 * CELL + 60, height: 900 } });
await p2.setContent(html, { waitUntil: 'load' });
await p2.screenshot({ path: outPath, fullPage: true });
await b2.close();
console.log('sheet:', outPath, fs.statSync(outPath).size + ' bytes');
