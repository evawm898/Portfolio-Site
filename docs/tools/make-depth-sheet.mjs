/*
 * make-depth-sheet.mjs — compose the junction depth sweep into one contact sheet.
 *
 * Pure presentation. The measurement is docs/tools/diag-junction-depth-sweep.mjs; this
 * lays its PNGs out as designs (rows) x depths (columns) so the silhouette can be compared
 * across depths at a glance, which is the whole point — the metric screens, eyes decide.
 *
 * Two sheets, because the underside is what is in question and a head-on view would beg it:
 * one for the three-quarter view and one for the side view.
 *
 * RUN:  node docs/tools/make-depth-sheet.mjs <sweepDir> <out-prefix>
 *   writes <out-prefix>-34.png and <out-prefix>-side.png
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from '../../tools/chromium-harness.mjs';

const [dir, outPrefix] = process.argv.slice(2);
if (!dir || !outPrefix) { console.error('usage: node docs/tools/make-depth-sheet.mjs <sweepDir> <out-prefix>'); process.exit(2); }

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
// <design>__depth<N>__<view>.png  — the sweep's own naming, parsed rather than assumed.
const parsed = files.map((f) => {
  const m = /^(.+?)__depth([0-9p]+)__(34|side)\.png$/.exec(f);
  return m ? { file: f, design: m[1], depth: m[2].replace('p', '.'), view: m[3] } : null;
}).filter(Boolean);
if (!parsed.length) { console.error(`no sweep PNGs matched in ${dir}`); process.exit(1); }

// Design order as the sweep reports it, not alphabetical: defaults first, then the presets.
const ORDER = ['defaults', 'daisy', 'lily', 'poppy', 'thistle', 'dahlia'];
const designs = [...new Set(parsed.map((p) => p.design))]
  .sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
const depths = [...new Set(parsed.map((p) => p.depth))].sort((a, b) => Number(a) - Number(b));

const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });

for (const view of ['34', 'side']) {
  const have = parsed.filter((p) => p.view === view);
  if (!have.length) continue;
  const rows = designs.map((d) => {
    const cells = depths.map((dep) => {
      const hit = have.find((p) => p.design === d && p.depth === dep);
      return `<td>${hit ? `<img src="${b64(hit.file)}">` : '<div class="miss">—</div>'}</td>`;
    }).join('');
    return `<tr><th class="rowlab">${d}</th>${cells}</tr>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; background: #0d1412; color: #cfe8e2; font: 13px/1.4 ui-monospace, Menlo, monospace; padding: 18px; }
    h1 { font-size: 15px; font-weight: 600; margin: 0 0 4px; letter-spacing: .02em; }
    p.note { margin: 0 0 14px; color: #7fa79f; }
    table { border-collapse: collapse; }
    th, td { padding: 3px; }
    th.collab { font-weight: 600; color: #9fe0d2; padding-bottom: 8px; }
    th.rowlab { text-align: right; padding-right: 10px; color: #9fe0d2; white-space: nowrap; }
    img { display: block; width: 250px; height: 250px; object-fit: contain; background: #0a100f; border: 1px solid #1e2f2b; }
    .miss { width: 250px; height: 250px; display: grid; place-items: center; color: #44605a; border: 1px dashed #1e2f2b; }
  </style>
  <h1>Junction depth sweep — ${view === '34' ? 'three-quarter' : 'side'} view</h1>
  <p class="note">receptacleDepth left to right: ${depths.join(' &nbsp; ')} &nbsp;&middot;&nbsp; every cell exports as ONE connected piece<br>
  depthW = lerp(0.18, top, depth) &mdash; top is 1.15 when something below the bloom receives the descent (a stem, or a side bud's branch),
  and the 0.3-equivalent when nothing does. Every design here is stemless, so every cell is on the capped range.</p>
  <table><tr><th></th>${depths.map((d) => `<th class="collab">depth ${d}</th>`).join('')}</tr>${rows}</table>`;

  const page = await browser.newPage({ viewport: { width: 260 * depths.length + 220, height: 300 * designs.length + 120 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const out = `${outPrefix}-${view}.png`;
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log(`${out}  (${designs.length} designs x ${depths.length} depths)`);
}
await browser.close();
