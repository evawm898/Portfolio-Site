/*
 * make-contact-sheet.mjs — compose two shot directories into one before/after sheet.
 *
 * RUN:  node tools/make-contact-sheet.mjs <beforeDir> <afterDir> <out.png>
 *
 * Pure presentation: it lays the PNGs out in a grid and screenshots the page. The
 * measurement lives in diff-contact.mjs; this is the thing a person looks at.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from './chromium-harness.mjs';

const [beforeDir, afterDir, out, beforeLabel, afterLabel] = process.argv.slice(2);
if (!beforeDir || !afterDir || !out) { console.error('usage: node tools/make-contact-sheet.mjs <beforeDir> <afterDir> <out.png> [beforeLabel] [afterLabel]'); process.exit(2); }
// The right-hand caption was the hardcoded string "after (#77)" and stayed that way after
// #77 merged, so every sheet made since has been labelled with the wrong PR. A caption is a
// claim about which tree produced the frame; a hardcoded one is a claim nothing checks.
// Both captions are arguments now, defaulting to something that cannot be wrong.
const capBefore = beforeLabel || `before (${path.basename(beforeDir)})`;
const capAfter = afterLabel || `after (${path.basename(afterDir)})`;

const names = fs.readdirSync(beforeDir).filter((f) => f.endsWith('.png')).sort();
const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const CELL = 380;

const rows = names.map((n) => `
  <div class="row">
    <div class="lab">${n.replace(/\.png$/, '')}</div>
    <figure><img src="${b64(path.join(beforeDir, n))}"><figcaption>${capBefore}</figcaption></figure>
    <figure><img src="${b64(path.join(afterDir, n))}"><figcaption>${capAfter}</figcaption></figure>
  </div>`).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; background:#000; color:#9fdcdc; font:13px ui-monospace,Menlo,monospace; }
  .row { display:flex; align-items:center; gap:12px; padding:8px 14px; border-bottom:1px solid #163; }
  .lab { width:130px; letter-spacing:.06em; text-transform:uppercase; }
  figure { margin:0; }
  img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
  figcaption { text-align:center; opacity:.55; padding-top:3px; }
</style>${rows}`;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 2 * CELL + 190, height: 900 } });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('sheet:', out, fs.statSync(out).size + ' bytes');
