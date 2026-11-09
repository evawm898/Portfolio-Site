#!/usr/bin/env node
/* shot-cage-reskin.mjs <dir> [--png <file>] — the /cage design-system re-skin sheet.

   Row 1: the whole page as a visitor sees it, in the Render view and in the
   SVG view, at 1280 px (chrome visible — this is the sheet about the chrome).
   Row 2: the two default candidates side by side, rendered the same way:
   Phase 1's first default (90 × 110 mm on 1.4 mm bars) beside the shipped one
   (90 × 140 on 1.1 mm — §6 of docs/cage-phase-1.md, already ruled Oct 29).
   Captions are the page's own read-out. No pixel claim anywhere: for ruling
   by eye. */
import fs from 'node:fs';
import path from 'node:path';
import { openCage } from './cage-page-harness.mjs';

const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || 'cage-reskin');
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : null;
fs.mkdirSync(OUT, { recursive: true });

const { page, errors, close } = await openCage({ viewport: { width: 1280, height: 860 } });
const main = async (m) => { await page.evaluate((k) => document.querySelector(`#viewToggle [data-main="${k}"]`).click(), m); await page.waitForTimeout(200); };
const cap = (i) => `${i.widthMm.toFixed(0)} × ${i.heightMm.toFixed(0)} mm overall · bars ${i.barCount}${i.ribCount ? ` + ${i.ribCount} ribs` : ''} · bar floor ${i.floor} mm · ${i.triangles.toLocaleString()} tris${i.told.length ? ' · told: ' + i.told.join('; ') : ''}`;

await page.evaluate(() => { window.__cage.setView('three'); });
await main('render'); await page.screenshot({ path: path.join(OUT, 'page-render.png') });
await main('svg'); await page.screenshot({ path: path.join(OUT, 'page-svg.png') });
await main('render');
// the variant cells are about the cage, so the chrome is hidden for them (the page cells above show it)
await page.addStyleTag({ content: '.cg-panel,.cg-view,.cg-viewtoggle,.cg-header{display:none!important} #svgStage{right:0;padding:24px}' });

const variants = [
  { id: 'phase1-default', label: 'Phase 1 default — 90 × 110 mm, 1.4 mm bars', set: { widthMm: 90, heightMm: 110, barMm: 1.4 } },
  { id: 'shipped-default', label: 'Shipped default — 90 × 140 mm, 1.1 mm bars (ruled Oct 29)', set: {} },
];
const vcells = [];
for (const v of variants) {
  await page.evaluate((s) => { document.getElementById('resetBtn').click(); if (Object.keys(s).length) window.__cage.setParams(s); window.__cage.setView('front'); }, v.set);
  await main('render');
  const info = await page.evaluate(() => window.__cage.info());
  const r = `${v.id}-render.png`; await page.screenshot({ path: path.join(OUT, r), clip: { x: 340, y: 20, width: 600, height: 820 } });
  await main('svg');
  const s = `${v.id}-svg.png`; await page.screenshot({ path: path.join(OUT, s), clip: { x: 340, y: 20, width: 600, height: 820 } });
  await main('render');
  vcells.push({ ...v, r, s, cap: cap(info) });
  console.log(v.id, cap(info));
}
await close();
if (errors.length) { console.error('page errors:', errors); process.exit(1); }

const html = `<!doctype html><meta charset="utf-8"><title>/cage — re-skin sheet</title>
<link rel="stylesheet" href="${path.relative(OUT, path.resolve('tokens.css'))}">
<style>body{background:var(--color-ground);color:var(--color-ink);font:12px var(--type-mono);margin:0;padding:22px;width:1820px}
h1{font:600 26px var(--type-serif);margin:4px 0}h2{font:500 15px var(--type-serif);margin:0 0 6px}.eye{color:var(--color-petrol);letter-spacing:.22em;font-size:11px;text-transform:uppercase}
.cap{color:var(--color-dim);font-size:11px;line-height:1.5;margin-top:6px}.row{display:grid;gap:16px;margin-top:18px}.r1{grid-template-columns:1fr 1fr}.r2{grid-template-columns:1fr 1fr}
.cell{border:1px solid var(--color-line-strong);padding:10px}.cell img{width:100%;display:block}.pair{display:grid;grid-template-columns:1fr 1fr;gap:4px}</style>
<div class="eye">EM / CAGE</div><h1>Re-skin onto the site design system</h1>
<div class="cap">Fraunces headings, IBM Plex Mono UI, the neutral and petrol tokens. The canvas ground is the ground token; the cage's metal and the SVG's paper sheet are artwork and keep their colours.</div>
<div class="row r1">
<div class="cell"><h2>The page — Render view</h2><img src="page-render.png"></div>
<div class="cell"><h2>The page — SVG view (the stage is ground; only the sheet is paper)</h2><img src="page-svg.png"></div>
</div>
<div class="row r2">${vcells.map((c) => `<div class="cell"><h2>${c.label}</h2><div class="pair"><img src="${c.r}"><img src="${c.s}"></div><div class="cap">${c.cap}</div></div>`).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (PNG) {
  const { page: p2, close: c2 } = await openCage({ viewport: { width: 1864, height: 1000 } });
  await p2.goto('file://' + path.join(OUT, 'index.html'));
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: PNG, fullPage: true });
  await c2();
  console.log('wrote', PNG);
}
