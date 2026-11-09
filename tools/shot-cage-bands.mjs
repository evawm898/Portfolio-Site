#!/usr/bin/env node
/* shot-cage-bands.mjs <dir> [--png <file>] — the /cage Phase 2 RULING SHEET: the ring bands.

   Rows: the default bell and the tiered preset, each with plain rings, beading and the
   leaf-tip run — the 3/4 render beside the front-elevation SVG (the export's own text,
   rendered by the browser) — then close-ups of one ring per style, rendered large and cropped
   so a bead and a leaf can be read. Captions are the page's own read-out. No pixel claim
   anywhere: this sheet is for ruling by eye. */
import fs from 'node:fs';
import path from 'node:path';
import { openCage } from './cage-page-harness.mjs';

const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || 'cage-bands');
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : null;
fs.mkdirSync(OUT, { recursive: true });
const HIDE = '.cg-panel,.cg-view,.cg-viewtoggle,.cg-header{display:none!important} #svgStage{right:0;padding:24px}';

const STYLES = [['none', 'Plain rings'], ['beading', 'Beading'], ['leaf', 'Leaf-tip run']];
const CAGES = [['bell', 'Bell (the default)'], ['tiered', 'Tiered dome on drum']];
const cap = (i) => `${i.triangles.toLocaleString()} tris · STL ${(84 + 50 * i.triangles) / 1048576 < 1 ? ((84 + 50 * i.triangles) / 1024).toFixed(0) + ' KB' : ((84 + 50 * i.triangles) / 1048576).toFixed(1) + ' MB'}${i.bands ? ` · ${i.bands.elements} elements on ${i.bands.rings.length} rings, ${[...new Set(i.bands.rings.map((r) => r.n))].join('/')} a bar gap · sag ≤ ${i.bands.sagMax.toFixed(2)} mm` : ''}`;

const { page, errors, close } = await openCage({ viewport: { width: 1280, height: 860 } });
await page.addStyleTag({ content: HIDE });
const main = async (m) => { await page.evaluate((k) => document.querySelector(`#viewToggle [data-main="${k}"]`).click(), m); await page.waitForTimeout(200); };
const rows = [];
for (const [cage, cageLabel] of CAGES) {
  const cells = [];
  for (const [st, stLabel] of STYLES) {
    await page.evaluate(([c, s]) => { window.__cage.setPreset(c); window.__cage.setParams({ bandStyle: s }); window.__cage.setView('three'); }, [cage, st]);
    await main('render');
    const info = await page.evaluate(() => window.__cage.info());
    const r = `${cage}-${st}-render.png`; await page.screenshot({ path: path.join(OUT, r), clip: { x: 340, y: 20, width: 600, height: 820 } });
    await main('svg');
    const s = `${cage}-${st}-svg.png`; await page.screenshot({ path: path.join(OUT, s), clip: { x: 340, y: 20, width: 600, height: 820 } });
    fs.writeFileSync(path.join(OUT, `${cage}-${st}.svg`), await page.evaluate(() => window.__cage.svgText()));
    await main('render');
    cells.push({ label: stLabel, r, s, cap: cap(info), told: info.told.filter((t) => /band|snap|proud|door takes/.test(t)) });
    console.log(cage, st, cap(info));
  }
  rows.push({ label: cageLabel, cells });
}
await close();

// close-ups: the bell rendered large in the front view, cropped on its middle rings
const big = await openCage({ viewport: { width: 1800, height: 2600 } });
await big.page.addStyleTag({ content: HIDE });
const macros = [];
for (const [st, stLabel] of STYLES.slice(1)) {
  await big.page.evaluate((s) => { window.__cage.setPreset('bell'); window.__cage.setParams({ bandStyle: s }); window.__cage.setView('front'); }, st);
  await big.page.waitForTimeout(400);
  const f = `macro-${st}.png`;
  await big.page.screenshot({ path: path.join(OUT, f), clip: { x: 300, y: 1000, width: 1200, height: 900 } });
  macros.push({ label: `${stLabel} — the bell's middle rings, close`, f });
}
await big.close();
if (errors.length) { console.error('page errors:', errors); process.exit(1); }

const tok = path.relative(OUT, path.resolve('tokens.css'));
const html = `<!doctype html><meta charset="utf-8"><title>/cage — Phase 2 ring bands</title>
<link rel="stylesheet" href="${tok}">
<style>body{background:var(--color-ground);color:var(--color-ink);font:12px var(--type-mono);margin:0;padding:22px;width:1900px}
h1{font:600 26px var(--type-serif);margin:4px 0}h2{font:500 17px var(--type-serif);margin:18px 0 8px}h3{font:500 14px var(--type-serif);margin:0 0 6px}
.eye{color:var(--color-petrol);letter-spacing:.22em;font-size:11px;text-transform:uppercase}.cap{color:var(--color-dim);font-size:11px;line-height:1.5;margin-top:6px}
.row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cell{border:1px solid var(--color-line-strong);padding:8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:4px}.cell img{width:100%;display:block}
.mac{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}</style>
<div class="eye">EM / CAGE</div><h1>Phase 2 — ring bands: beading and the leaf-tip run</h1>
<div class="cap">Each element is /frame's own (frame-relief's bead, frame-filigree's laurel leaf swept in its leaf section), mapped onto the cone segment through its ring. One element sits on every bar; the count per bar gap snaps and is told. Left of each pair the 3/4 render, right the front elevation the SVG export writes.</div>
${rows.map((r) => `<h2>${r.label}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><h3>${c.label}</h3><div class="pair"><img src="${c.r}"><img src="${c.s}"></div><div class="cap">${c.cap}${c.told.length ? '<br>told: ' + c.told.join('; ') : ''}</div></div>`).join('')}</div>`).join('')}
<h2>Close</h2><div class="mac">${macros.map((m) => `<div class="cell"><h3>${m.label}</h3><img src="${m.f}"></div>`).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (PNG) {
  const sh = await openCage({ viewport: { width: 1944, height: 1000 } });
  await sh.page.goto('file://' + path.join(OUT, 'index.html'));
  await sh.page.waitForTimeout(400);
  await sh.page.screenshot({ path: PNG, fullPage: true });
  await sh.close();
  console.log('wrote', PNG);
}
