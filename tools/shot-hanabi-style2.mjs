#!/usr/bin/env node
/* shot-hanabi-style2.mjs — the STYLE SHEET for /hanabi's Style 2, "Paper & Thread".

   node tools/shot-hanabi-style2.mjs <out.png>

   Colour on the left, greyscale on the right (CSS grayscale, the page's own toggle):
     - the full board (every suit x rank, the rainbow suit on) in Style 2 at the balanced
       blend, the default background;
     - one block each for the Flat, Paper and Thread presets (every suit at rank 1, then 5);
     - Thread on the Charcoal paper ground (ref 3);
     - Style 1 (Line) at rank 1 for reference.
   Every card is the module's own renderFace, so the sheet is what the page and the export
   draw. No pixel delta is quoted (a picture to rule on, not a measurement).
   Needs playwright-core (npm i --no-save playwright-core). Not in CI. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) { console.error('usage: node tools/shot-hanabi-style2.mjs <out.png>'); process.exit(2); }
const imp = (m) => import(pathToFileURL(path.join(REPO, 'hanabi', m)).href);
const D = await imp('deck.js'), L = await imp('layout.js'), S2 = await imp('style2.js');

let uid = 0;
const W = 118;
const face = (d, suitId, rank) => `<div class="c">${L.renderFace(d, { kind: 'card', suitId, rank }, { idPrefix: `s${uid++}` }).replace('<svg', `<svg style="width:${W}px;height:auto;display:block"`)}</div>`;
const base = () => { const d = D.defaultDesign(); d.rainbow = true; d.style = 'paper'; return d; };
const withPreset = (k) => { const d = base(); d.style2 = JSON.parse(JSON.stringify(S2.PAPER_PRESETS[k].values)); return d; };

function block(title, note, d, ranks, board = false) {
  const suits = D.activeSuits(d);
  let rows = '';
  if (board) for (const s of suits) rows += `<div class="row">${ranks.map((r) => face(d, s.id, r)).join('')}</div>`;
  else for (const r of ranks) rows += `<div class="row">${suits.map((s) => face(d, s.id, r)).join('')}</div>`;
  return `<section><h2>${title}</h2><p>${note}</p>${rows}</section>`;
}
const sections = [];
const def = base();
sections.push(block('Style 2 · Paper &amp; Thread — the balanced blend (default)', `every suit × rank; disc ${def.style2.discTone} at ${def.style2.discOpacity}, grain ${def.style2.grain}, wobble ${def.style2.wobble}, stitch ${def.style2.stitch}, mixing ${def.style2.mix}, glow ${def.style2.glow}; Night sky`, def, D.RANKS, true));
for (const k of ['flat', 'paper', 'thread']) sections.push(block(`Preset · ${S2.PAPER_PRESETS[k].label}`, `${S2.PAPER_PRESETS[k].note} — every suit at rank 1, then 5`, withPreset(k), [1, 5]));
const ch = withPreset('thread'); ch.background.sky.top = ch.background.sky.bottom = D.SKY_PRESETS.charcoal.top; ch.background.grain = D.SKY_PRESETS.charcoal.grain;
sections.push(block('Thread on Charcoal paper', 'the Thread preset on the flat charcoal ground with its paper grain (the background option, ref 3)', ch, [1, 5]));
const line = base(); line.style = 'line';
sections.push(block('Style 1 · Line — for reference', 'the same deck in the line drawing, rank 1', line, [1]));

const col = sections.join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#16181C;color:#D8DCE2;font:12px/1.4 ui-monospace,Menlo,monospace;padding:18px}
h1{font:600 20px Georgia,serif;margin:0 0 4px} h2{font-size:12px;letter-spacing:.06em;margin:16px 0 2px;color:#fff}
p{margin:0 0 6px;color:#9AA3B4} .cols{display:flex;gap:28px} .col{flex:none}
.row{display:flex;gap:6px;margin-bottom:6px} .c{background:#fff;border-radius:4px}
.grey{filter:grayscale(1)} .tag{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6FB7AE;margin-bottom:4px}
</style></head><body>
<h1>Hanabi — Style 2, Paper &amp; Thread</h1>
<p>The style changes how fireworks are drawn; suits, colours, symbols, types, counts, arrangements and the background are the deck's. Rule from this sheet: the default blend, and any type to redraw.</p>
<div class="cols"><div class="col"><div class="tag">Colour</div>${col}</div><div class="col grey"><div class="tag">Greyscale</div>${col}</div></div>
</body></html>`;
const exe = findChromium() || (() => { const b = '/opt/pw-browsers'; for (const x of fs.readdirSync(b)) { const c = path.join(b, x, 'chrome-linux64', 'chrome'); if (x.startsWith('chromium-') && fs.existsSync(c)) return c; } return undefined; })();
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`wrote ${out}`);
