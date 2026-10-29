#!/usr/bin/env node
/* shot-cage.mjs <dir> [--png <file>] — the Phase 1 RULING SHEET for /cage.

   Every preset at its defaults, as the real page draws it: the 3/4 render and
   the front-elevation SVG side by side (the SVG cell IS the export's text,
   rendered by the browser), each captioned with the read-out's own numbers.
   Writes <dir>/index.html, one PNG per cell, and the composite PNG. No pixel
   claim is made anywhere: this sheet is for ruling by eye. */
import fs from 'node:fs';
import path from 'node:path';
import { openCage } from './cage-page-harness.mjs';
import { PRESET_IDS, PRESET_LABELS } from '../cage-geometry.js';

const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || 'cage-sheet');
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : null;
fs.mkdirSync(OUT, { recursive: true });

const { page, errors, close } = await openCage({ viewport: { width: 1280, height: 860 } });
await page.addStyleTag({ content: '.cg-panel,.cg-view,.cg-viewtoggle,.cg-header{display:none!important} #svgStage{right:0;padding:24px}' });
const cells = [];
for (const id of PRESET_IDS) {
  await page.evaluate((k) => { window.__cage.setPreset(k); window.__cage.setView('three'); }, id);
  await page.evaluate(() => document.querySelector('#viewToggle [data-main="render"]').click());
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => window.__cage.info());
  const r = path.join(OUT, `${id}-render.png`); await page.screenshot({ path: r, clip: { x: 370, y: 30, width: 540, height: 815 } });
  await page.evaluate(() => document.querySelector('#viewToggle [data-main="svg"]').click());
  await page.waitForTimeout(150);
  const s = path.join(OUT, `${id}-svg.png`); await page.screenshot({ path: s, clip: { x: 370, y: 30, width: 540, height: 815 } });
  fs.writeFileSync(path.join(OUT, `${id}.svg`), await page.evaluate(() => window.__cage.svgText()));
  const cap = `${info.widthMm.toFixed(0)} × ${info.heightMm.toFixed(0)} mm · ${info.triangles.toLocaleString()} tris · bars ${info.barCount}${info.ribCount ? ` + ${info.ribCount} ribs` : ''} · door ${info.door ? `${info.door.shape} ${info.door.W.toFixed(0)}×${info.door.Dh.toFixed(0)}` : 'none'} · shallowest wire ${info.overhang.deg.toFixed(0)}° (${info.overhang.where})${info.told.length ? ' · told: ' + info.told.join('; ') : ''}`;
  cells.push({ id, label: PRESET_LABELS[id], r: path.basename(r), s: path.basename(s), cap });
  console.log(id, cap);
}
const html = `<!doctype html><meta charset="utf-8"><title>/cage — Phase 1 ruling sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:12px 'Space Mono',monospace;margin:0;padding:18px}h1{font:600 22px 'Playfair Display',serif;margin:0 0 4px}.eye{color:#5FA0A0;letter-spacing:.22em;font-size:11px;text-transform:uppercase}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}.cell{border:1px solid rgba(237,237,232,.22);padding:8px}.cell h2{font:600 15px 'Playfair Display',serif;margin:0 0 6px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:4px}.pair img{width:100%;display:block}.cap{color:#8A8A85;font-size:10px;line-height:1.5;margin-top:6px}</style>
<div class="eye">EM / CAGE</div><h1>Phase 1 — every preset at its defaults</h1><div class="cap">Left: the 3/4 render. Right: the front elevation the SVG export writes. Captions are the page's own read-out.</div>
<div class="grid">${cells.map((c) => `<div class="cell"><h2>${c.label}</h2><div class="pair"><img src="${c.r}"><img src="${c.s}"></div><div class="cap">${c.cap}</div></div>`).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (PNG) {
  const p2 = await page.context().browser().newPage({ viewport: { width: 1500, height: 1200 } });
  await p2.goto(`file://${path.join(OUT, 'index.html')}`); await p2.waitForTimeout(400);
  await p2.screenshot({ path: PNG, fullPage: true });
}
await close();
if (errors.length) { console.error('page errors:', errors); process.exit(1); }
console.log(`sheet: ${path.join(OUT, 'index.html')}${PNG ? ` and ${PNG}` : ''}`);
