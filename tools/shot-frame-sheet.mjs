#!/usr/bin/env node
/* shot-frame-sheet.mjs <dir> — the phase-1 contact sheet for /frame.

   Every cell is the real page (window.__frame.setParams) with the chrome
   hidden, screenshotting the drawing at ONE pinned viewBox so cells line up
   and the frames are comparable. Rows: the shipped default; pointedness at
   its two ends and the equilateral middle; 1 against 4 mullions; every
   molding preset; shading light against heavy; the three sills. Each caption
   carries the read-out's own numbers (spring line, tone range across the
   band, stroke count) rather than a restatement.

   Writes <dir>/index.html (self-contained) and <dir>/frame-phase1-sheet.png.
   No pixel claim is made anywhere: this sheet is for ruling by eye. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-sheet');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header{display:none!important} .fr-stage{right:0!important;padding:10px!important}' });
await page.evaluate(() => window.__frame.setFixedView({ x0: -120, y0: -20, x1: 120, y1: 360 }));

const cells = [
  { row: 'shipped default', label: 'ogee · p 0.50 · 2 mullions · plain sill · intensity 0.65', params: {} },
  { row: 'pointedness', label: '0.00 — semicircular', params: { pointedness: 0 } },
  { row: 'pointedness', label: '0.50 — equilateral', params: { pointedness: 0.5 } },
  { row: 'pointedness', label: '1.00 — lancet', params: { pointedness: 1 } },
  { row: 'mullions', label: '1 mullion', params: { mullions: 1 } },
  { row: 'mullions', label: '4 mullions', params: { mullions: 4 } },
  ...['flat', 'bead', 'cove', 'ogee', 'reeded', 'fluted', 'stepped'].map((n) => ({ row: 'profile preset', label: n, params: { profilePreset: n, mullions: 1 } })),
  { row: 'shading', label: 'light — intensity 0.25', params: { shadeIntensity: 0.25, profilePreset: 'cove' } },
  { row: 'shading', label: 'heavy — intensity 1.00', params: { shadeIntensity: 1, profilePreset: 'cove' } },
  { row: 'sill', label: 'none', params: { sill: 'none' } },
  { row: 'sill', label: 'stepped', params: { sill: 'stepped' } },
];

const out = [];
for (const c of cells) {
  await page.evaluate((p) => window.__frame.setParams(p), c.params);
  const el = await page.$('#paper svg');
  const png = await el.screenshot({ type: 'png' });
  const r = await page.evaluate(() => window.__frame.readout());
  const lines = r.split('\n');
  out.push({ ...c, png: png.toString('base64'), readout: lines.slice(0, 4).join(' · ') });
}

const rows = [...new Set(out.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 1 contact sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;background:#EDEDE8}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 1</h1><div>skeleton · molding sweep · normal-derived hatching. One pinned viewBox (−120..120 × −20..360 mm) on every cell. Light: upper-left, fixed. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${out.filter((c) => c.row === r).map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.readout}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-phase1-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${out.length} cells → ${OUT}/index.html, frame-phase1-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of out) console.log(`  ${c.row.padEnd(16)} ${c.label.padEnd(28)} ${c.readout}`);
