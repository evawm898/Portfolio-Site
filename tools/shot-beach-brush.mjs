#!/usr/bin/env node
// shot-beach-brush.mjs — the drawing layer, before and after it was wired.
//
//   node tools/shot-beach-brush.mjs <dir>
//
// TWO ROWS, AND THE FIRST ONE IS THE CONTROL. The top row is beach-brush.js
// drawn STANDALONE — `draw()` called with no wave list, no published edge and
// no shore, which is the module exactly as it was verified before any of this
// was wired to it. The bottom row is the live scene: the same module, drawing
// the simulation's own wave records at its own published edge.
//
// The standalone row is what makes the wiring checkable by eye: if a mark in
// it has moved, the wiring changed the DRAWING, which it is not allowed to do.
// (It is also checked exactly rather than by eye — see the outcome doc: 0 of
// 11,289,600 pixels over ten cells at three resolutions.)
//
// NO PIXEL DELTA IS QUOTED ANYWHERE between the two rows. They are different
// pictures of different states; this repo's rule about the renderer's
// determinism between page sessions applies, and nothing here needs one.
//
// Every caption carries the state the scene itself reports, read back rather
// than assumed.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(argv.find(a => !a.startsWith('--')) || path.join(REPO, 'shots-beach-brush'));
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

const W = 960, H = 720;
const { chromium } = loadPlaywright();
const { s: server, port } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/scene.html?scene=3&seed=${SEED}`);
await page.waitForFunction(() => window.__scene && window.__scene.activeId === 3 && window.__scene.frames > 3);
fs.mkdirSync(OUT, { recursive: true });
const cells = [];

// ---- ROW ONE: the module standalone, at frozen states --------------------
// `peel` sweeps the break across the frame. It runs DOWNWARD in time: 1.70 is
// an unbroken swell and -0.30 is spent foam, which is the opposite of the way
// the constant reads and is worth knowing before reading the row.
await page.evaluate(() => window.__scene.pause(true));
for (const [name, st, note] of [
  ['standalone-1-swell', { peel: 1.70 }, 'unbroken: the hero wave is a black mass with no foam on it at all'],
  ['standalone-2-lip', { peel: 1.10 }, 'the lip opens along the top of the face'],
  ['standalone-3-peel', { peel: 0.35 }, 'MID-PEEL — broken at one end of the frame and not the other'],
  ['standalone-4-collapse', { peel: 0.00 }, 'the curl thrown forward, the dark face still under it'],
  ['standalone-5-spent', { peel: -0.30 }, 'spent: the face has gone and a scalloped band is left'],
]) {
  await page.evaluate(async ({ st }) => {
    const B = await import('/scene/beach-brush.js');
    const c = document.querySelector('.scene-canvas');
    const g = c.getContext('2d');
    const r = c.getBoundingClientRect();
    const dpr = c.width / r.width;
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    B.draw(g, r.width, r.height, st);
    g.restore();
  }, { st });
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  cells.push({ file: `${name}.png`, title: `STANDALONE · peel ${st.peel.toFixed(2)}`, note });
}

// ---- ROW TWO: the live scene, at the six stages --------------------------
async function live(name, wantStage, note) {
  const got = await page.evaluate(async (want) => {
    // A CELL IS ITS OWN MOMENT. Several stages are live at once — that is the
    // scene working — so a search that returns the first frame satisfying the
    // one it was asked for hands three cells the same frame. Each one moves
    // the beach on before it starts looking.
    window.__scene.scenePump(3.1);
    for (let i = 0; i < 1400; i++) {
      const st = window.__scene.sceneState();
      // THE WAVE'S STAGE OR A COLUMN'S. `waveStage` can never report STEEPEN
      // on a peeling wave and that is not a defect: it returns PEEL the moment
      // its columns disagree across the break, and the steepening window is
      // 0.35 s against a peel of 0.8-1.9, so the two ends of the crest are
      // never both inside it. The column report is where the stage lives.
      if ((st.waveStages || []).some(w => w.stage === want || (w.at || []).includes(want))) {
        window.__scene.step(); return { ok: true, st };
      }
      window.__scene.scenePump(0.06);
    }
    return { ok: false };
  }, wantStage);
  if (!got.ok) { console.log('MISSED', name); return; }
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const s = got.st;
  const ws = (s.waveStages || []).map(w =>
    `${['', 'swell', 'steepen', 'peel', 'collapse', 'foam band', 'swash'][w.stage]} @ s ${w.crest.toFixed(3)} (h ${w.height.toFixed(3)})`).join(' · ');
  cells.push({ file: `${name}.png`,
    title: `LIVE · a wave in ${['', 'SWELL', 'STEEPEN', 'PEEL', 'COLLAPSE', 'FOAM BAND', 'SWASH'][wantStage]}`,
    note: `${note}<br>${s.waves} alive, ${s.drawnWaves} drawn — ${ws}<br>`
      + `edge ${s.edge[2].toFixed(3)} · high water ${s.wet[2].toFixed(3)} · set energy ${s.energy.toFixed(2)}` });
}
await live('live-1-swell', 1, 'the seaward end of the sea: a ridge with no foam');
await live('live-2-steepen', 2, 'the lip opening, before any column has broken');
await live('live-3-peel', 3, 'columns disagreeing — broken at one end of the crest and not the other');
await live('live-4-collapse', 4, 'broken, and the wave still has a face');
await live('live-5-foam-band', 5, 'the face gone, a band travelling shoreward');
await live('live-6-swash', 6, 'stage six: the swash, drawn by the published edge rather than as a wave');

// ---- the frame cost, live ------------------------------------------------
await page.evaluate(() => window.__scene.pause(false));
const cost = await page.evaluate(async () => {
  const f0 = window.__scene.frames, t0 = performance.now();
  await new Promise(r => setTimeout(r, 3000));
  return (window.__scene.frames - f0) / ((performance.now() - t0) / 1000);
});
const st = await page.evaluate(() => window.__scene.sceneState());

fs.writeFileSync(path.join(OUT, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>scene 3 — the drawing layer</title>
<style>body{background:#101014;color:#e8e6df;font:14px/1.6 ui-monospace,monospace;margin:24px}
h1{font-size:18px;font-weight:600}h2{font-size:14px;font-weight:600;margin:28px 0 8px;color:#9fb}
figure{margin:0 0 26px}img{width:100%;border:1px solid #333;display:block}
figcaption{margin-top:6px;color:#b9b6ad}b{color:#e8e6df}</style>
<h1>scene 3 — beach-brush.js, standalone and wired</h1>
<p>seed ${SEED} · ${W}x${H} · ${cost.toFixed(1)} fps live on software GL, ${st.waves} waves alive and ${st.drawnWaves} drawn.
The top row is the module drawn on its own, which is the control: it is the picture the drawing layer arrived with,
and the wiring is not allowed to move it. The bottom row is the same module drawing the simulation's own records.</p>
<h2>standalone — the module's own two waves, swept across the break</h2>
` + cells.map(c => `<figure><img src="${c.file}"><figcaption><b>${c.title}</b><br>${c.note}</figcaption></figure>`
  ).join('\n').replace('<figure><img src="live-1-swell.png">',
    '<h2>wired — the live scene, one call per live record</h2><figure><img src="live-1-swell.png">'));

await browser.close(); server.close();
console.log(errs.length ? `PAGE ERRORS:\n${errs.join('\n')}` : 'no page errors');
console.log(`${cells.length} cells -> ${path.join(OUT, 'index.html')}`);
