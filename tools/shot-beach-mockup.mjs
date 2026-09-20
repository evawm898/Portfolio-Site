#!/usr/bin/env node
// shot-beach-mockup.mjs — the STATIC mockup of scene 3's composition and value
// structure, rendered before any animation is wired. The brief asks for the
// look to be confirmed before the mechanics, and this is that: a frozen state
// through the shipped renderer, so what it photographs is the real draw path
// and not a picture of one.
//
//   node tools/shot-beach-mockup.mjs <dir>
//
// EVERY CELL IS A FROZEN STATE, NOT A PAUSED SIMULATION. The swash module does
// not exist yet when this is first run; the states below are written down, so
// a cell shows exactly the geometry its caption claims.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(REPO, 'shots-beach'));

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'].filter(Boolean);
  for (const r of roots) { const e = path.join(r, 'playwright', 'index.js'); if (fs.existsSync(e)) return require(e); }
  return require('playwright');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
function serve() {
  const s = http.createServer((req, res) => {
    const p = path.join(REPO, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(REPO) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ s, port: s.address().port })));
}

// The cells. Each is a WRITTEN-DOWN state: where the swash edge is, where the
// high-water mark is, how wide the glossy band behind the edge is.
const W = 900, H = 600;
const CELLS = [
  { id: '01-drained', title: 'Drained — the three bands at rest',
    note: 'swash at the waterline (s 0.40), high-water at s 0.60. The brief’s 40/20/40.',
    st: { swash: 0.40, wet: 0.60, gloss: 0.02, frontFoam: 0.35, breakEnergy: 0.12 } },
  { id: '02-runup', title: 'Mid runup — the wet band is under water',
    note: 'the swash has covered the wet band; there is no wet sand while the sheet is over it.',
    st: { swash: 0.60, wet: 0.60, gloss: 0.01, frontFoam: 1.0, breakEnergy: 0.30 } },
  { id: '03-draining', title: 'Draining — the wet band re-appears behind the sheet',
    note: 'swash back to s 0.50, high-water still 0.60. Gloss band behind the departing edge.',
    st: { swash: 0.50, wet: 0.60, gloss: 0.055, frontFoam: 0.6, breakEnergy: 0.18 } },
  { id: '04-overrun', title: 'Overrun — a big set past the normal high-water mark',
    note: 'swash to s 0.86; the high-water mark has jumped out to meet it.',
    st: { swash: 0.86, wet: 0.86, gloss: 0.01, frontFoam: 1.0, breakEnergy: 0.95 } },
  { id: '05-overrun-drying', title: 'Overrun drying back — the only time the slow line moves',
    note: 'swash back at the waterline; high-water at 0.74, receding toward the saturated 0.60.',
    st: { swash: 0.42, wet: 0.74, gloss: 0.03, frontFoam: 0.4, breakEnergy: 0.35 } },
  { id: '06-invert', title: 'The same drawing inverted — scene 1’s polarity',
    note: 'a photographic negative of cell 01, not a second mark plan. For the polarity ruling.',
    st: { swash: 0.40, wet: 0.60, gloss: 0.02, frontFoam: 0.35, breakEnergy: 0.12 }, invert: true },
];

const { chromium } = loadPlaywright();
const { s: server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/scene.html`);

fs.mkdirSync(OUT, { recursive: true });
const shot = [];
for (const c of CELLS) {
  const info = await page.evaluate(async ({ cell, W, H }) => {
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.display = 'block';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d', { alpha: false });
    const shoreMod = await import('/scene/beach-shore.js');
    const drawMod = await import('/scene/beach-draw.js');
    const shore = shoreMod.createShore();
    shore.resize(W, H);
    const rend = drawMod.createRenderer(ctx, shore);
    // A written-down state. Both boundaries are FLAT here except for a small
    // fixed scallop, because this cell is about the composition and the value
    // structure, not about the wobble.
    const wob = (u, k) => Math.sin(u * 6.3 + k) * 0.008 + Math.sin(u * 15.1 + k * 2) * 0.004;
    const streaks = [];
    for (let i = 0; i < 230; i++) {
      const u = (i * 0.61803398) % 1;
      const s = 0.015 + ((i * 0.38196601 + i * i * 0.007) % 1) * Math.max(0.02, cell.st.swash - 0.04);
      streaks.push({ u, s, len: 0.015 + ((i * 0.7320508) % 1) * 0.055 });
    }
    rend.draw({
      width: W, height: H, dpr: 2,
      swashAt: (u) => cell.st.swash + wob(u, 1.7),
      wetAt: (u) => cell.st.wet + wob(u, 4.1) * 0.7,
      glossDepth: cell.st.gloss,
      frontFoam: cell.st.frontFoam,
      breakEnergy: cell.st.breakEnergy,
      frontSeed: 11,
      drift: 0,
      streaks,
      invert: !!cell.invert,
    });
    return { rows: rend.rows };
  }, { cell: c, W, H });
  const file = path.join(OUT, `${c.id}.png`);
  await page.locator('canvas').screenshot({ path: file });
  shot.push({ ...c, file: path.basename(file), rows: info.rows });
  console.log(`  ${c.id}  rows=${info.rows}`);
}

fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>Scene 3 — beach mockup</title>
<style>body{background:#111;color:#ddd;font:13px/1.5 ui-monospace,monospace;margin:0;padding:24px}
h1{font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
figure{margin:0 0 30px}img{width:100%;max-width:900px;display:block;border:1px solid #333}
figcaption{margin-top:7px;color:#9aa}b{color:#fff}</style>
<h1>Scene 3 — beach / swash line — static mockup</h1>
<p style="color:#9aa;max-width:900px">Frozen states through the shipped renderer. No animation is wired.
Tone ladder measured off the reference clips (deep water 47 · shore 118 · glossy wet 125 · wet sand 152-161 · dry sand 186-194 · <b>foam 197</b>).
Shoreline tilt 5.5&deg;, lower on the left — the sign every measurement on the clips agrees about.</p>
${shot.map(c => `<figure><img src="${c.file}"><figcaption><b>${c.title}</b><br>${c.note}<br><span style="color:#667">${c.rows} rows</span></figcaption></figure>`).join('\n')}
`);
console.log(`\n${shot.length} cells -> ${OUT}`);
if (errs.length) console.log('PAGE ERRORS:', errs);
await browser.close(); server.close();
