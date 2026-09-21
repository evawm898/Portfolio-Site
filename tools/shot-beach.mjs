#!/usr/bin/env node
// shot-beach.mjs — SCENE 3's contact sheet. The real page, the real shell, the
// real simulation; every cell is a state the beach actually reached.
//
//   node tools/shot-beach.mjs <dir> [--seed N]
//
// CELLS ARE REACHED BY PUMPING SIMULATED TIME, NOT BY WAITING. Headless runs at
// about two frames a second with dt clamped at 1/20, so scene time advances at
// a tenth of real time and "wait for the swash to drain" is half a minute of
// wall clock per cell. `__scene.scenePump(seconds)` advances the simulation
// without drawing; the next frame draws whatever it reached. Every caption
// carries the state the scene itself reports, read back rather than assumed.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE. This repo's own rule: the renderer is not
// deterministic between page sessions, and none of these cells needs one.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(REPO, 'shots-beach'));
const SEED = Number((argv.find(a => a.startsWith('--seed=')) || '--seed=20240').split('=')[1]);

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

const W = 1000, H = 640;
const { chromium } = loadPlaywright();
const { s: server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/scene.html?scene=3&seed=${SEED}`);
await page.waitForFunction(() => window.__scene && window.__scene.activeId === 3 && window.__scene.frames > 3);

fs.mkdirSync(OUT, { recursive: true });
const shot = [];

// Advance until a predicate over the scene's own state holds, pumping in small
// steps so the cell lands ON the condition rather than past it.
async function pumpUntil(pred, { step = 0.05, max = 40 } = {}) {
  return page.evaluate(async ({ predSrc, step, max }) => {
    // eslint-disable-next-line no-new-func
    const pred = new Function('s', `return (${predSrc})(s);`);
    let t = 0;
    while (t < max) {
      if (pred(window.__scene.sceneState())) return { ok: true, t };
      window.__scene.scenePump(step);
      t += step;
    }
    return { ok: false, t };
  }, { predSrc: pred.toString(), step, max });
}
const pump = (sec) => page.evaluate((s) => window.__scene.scenePump(s), sec);
const state = () => page.evaluate(() => window.__scene.sceneState());
// A SCENE NEVER SETTLES, SO IT IS FROZEN INSTEAD. "Screenshot until two frames
// are byte-identical" is this repo's rule for a contact sheet and it assumes
// the subject comes to rest; an animation does not, so that loop runs its whole
// budget every cell and burns several seconds of scene time. Measured: a cell
// pumped to a swash at its peak (edge 0.743) was photographed after the wave
// had fully drained (0.40). The shell's `pause` stops the loop and `step` draws
// once with dt 0, so what is photographed is exactly what was asked for.
const freeze = () => page.evaluate(() => { window.__scene.pause(true); window.__scene.step(); });
const unfreeze = () => page.evaluate(() => window.__scene.pause(false));

async function cell(id, title, note, prep) {
  await unfreeze();
  await prep();
  await freeze();
  const file = path.join(OUT, `${id}.png`);
  await page.screenshot({ path: file });
  // Read the state AFTER the freeze, so the caption describes the frame that
  // was actually drawn rather than one the loop has since moved past.
  const s = await state();
  shot.push({ id, title, note, file: path.basename(file),
    line: `edge ${s.edge[2].toFixed(3)} · high-water ${s.wet[2].toFixed(3)} · saturated ${s.sat[2].toFixed(3)} · `
        + `gloss ${s.glossDepth.toFixed(3)} · sheet ${s.sheet.toFixed(2)} · set energy ${s.energy.toFixed(2)} · `
        + `${s.waves} wave(s), ${s.drawnWaves} drawn · ${s.overruns} overrun(s)` });
  console.log(`  ${id}`);
}

// 1 — at rest, fully drained: the three bands and the two boundaries apart.
await cell('01-drained', 'Drained — the two boundaries at their furthest apart',
  'The swash is back at the waterline and the wet band it uncovered is still there. This is the cell that says wet sand persists after the water has left it.',
  async () => { const r = await pumpUntil((s) => s.energy < 0.02 && s.sheet < 0.05 && s.edge[2] < 0.43, { max: 60 }); return await state(); });

// 2 — mid runup
await cell('02-runup', 'Mid runup — the sheet over the wet band',
  'The swash has covered the sand it wet last time. Advance is a picked 0.55 s, not measured: the reference catches only the tail of one.',
  async () => { await pumpUntil((s) => s.sheet > 0.92 && s.waves >= 1, { step: 0.02, max: 30 }); return await state(); });

// 3 — draining, the gloss band behind the edge
await cell('03-draining', 'Draining — the glossy band behind the departing sheet',
  'Retreat is 2.5 s, measured. The glossy band is a LENGTH — how far the edge has moved in the last half second — so a fast drain leaves a wide one.',
  async () => { await pumpUntil((s) => s.glossDepth > 0.045, { step: 0.02, max: 30 }); return await state(); });

// 4 — a big set, scrolled
await cell('04-set', 'Three scroll actions — the break at the back builds',
  'Set energy reaches the break and the NEXT wave’s runup. It never reaches a wave already running: the reach is frozen into the record at spawn.',
  async () => {
    await page.mouse.move(W / 2, H / 2);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 120 * (await page.evaluate(() => window.devicePixelRatio)));
    await pumpUntil((s) => s.energy > 0.9, { step: 0.02, max: 5 });
    return await state();
  });

// 5 — the overrun
await cell('05-overrun', 'Overrun — a swash past the normal high-water mark',
  'The mark jumps outward the moment it happens. The event feed carries the reached extent; this is what mark-erasure will read.',
  async () => { await pumpUntil((s) => s.edge[2] > 0.74, { step: 0.02, max: 40 }); return await state(); });

// 6 — the overrun drying back
await cell('06-overrun-drying', 'Drying back — the only time the slow line visibly moves',
  'The overrun zone sits ABOVE the saturated sand and gives up a frame height in 14 s; the saturated zone would take 530. Two variables, not two branches of one rate.',
  async () => { await pump(9); await pumpUntil((s) => s.sheet < 0.2, { step: 0.05, max: 12 }); return await state(); });

// 7 — quiet again
await cell('07-recovered', 'Recovered — the mark has returned, not ratcheted',
  'The high-water mark is back down to the saturated level. In quiet conditions it moves 5.9 px per 3.5 s, against the ~6 px the brief measured off the reference.',
  async () => { await pump(34); await pumpUntil((s) => s.sheet < 0.1 && s.energy < 0.05, { max: 40 }); return await state(); });

const j = shot.map(c => `<figure><img src="${c.file}"><figcaption><b>${c.title}</b><br>${c.note}<br><span class=m>${c.line}</span></figcaption></figure>`).join('\n');
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>Scene 3 — beach swash line</title>
<style>body{background:#111;color:#ddd;font:13px/1.55 ui-monospace,monospace;margin:0;padding:26px}
h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase}p.l{color:#9aa;max-width:1000px}
figure{margin:0 0 32px}img{width:100%;max-width:1000px;display:block;border:1px solid #333}
figcaption{margin-top:7px;color:#9aa}b{color:#fff}.m{color:#667}</style>
<h1>Scene 3 — beach / swash line</h1>
<p class=l>Seed ${SEED}. Every cell is the real page and the real simulation, reached by pumping simulated time.
The shoreline runs up to the right at 3.0&deg; &mdash; the sign every measurement on the three clips agrees about.
Tone set from the reference's own ink coverage: deep water 0.84 &middot; mid water 0.55 &middot; wet sand 0.23 &middot; foam 0.04 &middot; dry sand bare.</p>
${j}`);
console.log(`\n${shot.length} cells -> ${OUT}`);
if (errs.length) console.log('PAGE ERRORS:', errs);
await browser.close(); server.close();
