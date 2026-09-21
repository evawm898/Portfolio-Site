#!/usr/bin/env node
// shot-beach-break.mjs — where the break lands, and what it costs the sea.
//
//   node tools/shot-beach-break.mjs <dir>
//
// NOT A GATE AND NOT A CONTACT SHEET: an instrument for ONE ruling, kept
// because the table it prints is quoted in docs/beach-drawing-layer.md §8 and
// nothing else in the repo can reproduce it. An unenforced number becomes
// folklore within two sessions; this is the number's own witness.
//
// WHAT IT MEASURES AND WHY THE TWO HALVES ARE ONE DIAL. `BREAK_S` decides
// where a wave breaks, and the drawing's break phase `b` is LINEAR IN s
// between there and the waterline — so the curl (b = 0.50) sits at a fixed
// fraction of the way, and the foam, which exists only past FOAM_ONSET_B,
// occupies exactly `[breakS, WATERLINE_S]`. Lowering the curl and shortening
// the foam are therefore the same move. What that costs on screen is the
// balance of ink to paper in the wave zone, because the dark face is drawn
// for every wave whether it has broken or not and the foam band is what used
// to whiten it.
//
// THE SAME SEEDS AND THE SAME PUMPED TIME AT EVERY VALUE, with one constant
// rewritten in the served module — the gate's own mutant mechanism.
//
// AND THE SAMPLING IS NAMED BECAUSE IT HAD TO BE LEARNED TWICE. The first cut
// read ONE moment and reported a 6-wave state against a 4-wave one, which is
// measuring which waves happened to be alive. The second averaged 24 moments
// and still did not reproduce — 44.7% ink on one run and 39.4% on the next —
// because `scene.html` with no `?seed=` seeds from `Date.now()`, so every run
// is a different sea. Three SEEDS x 24 moments each, and the RANGE across
// seeds is printed beside the mean: one sea is one draw, and a figure quoted
// without its spread is a figure that will not reproduce.
//
// It prints the table and writes one render per value plus an index.html.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = REPO;
const OUT = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(REPO, 'shots-beach-break'));
fs.mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    path.join(REPO, 'node_modules'),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules'].filter(Boolean);
  for (const r of roots) {
    for (const n of ['playwright', 'playwright-core']) {
      const e = path.join(r, n, 'index.js');
      if (fs.existsSync(e)) return require(e);
    }
  }
  return require('playwright-core');
}

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css' };
let BRK = null;
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html';
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  let body = fs.readFileSync(f, 'utf8');
  if (BRK && rel === 'scene/beach-wave.js') {
    const from = 'export const BREAK_S = [0.300, 0.205];';
    if (!body.includes(from)) { res.writeHead(500); res.end('anchor'); return; }
    body = body.replace(from, `export const BREAK_S = [${BRK[0]}, ${BRK[1]}];`);
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' });
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const { chromium } = loadPlaywright();
const browser = await chromium.launch();

/** one sea is one draw, so every figure is a mean over these with its range */
const SEEDS = [7, 1234, 4242];

const CASES = [
  ['a-0115', [0.115, 0.020], 'as it shipped'],
  ['b-0180', [0.180, 0.085], null],
  ['c-0230', [0.230, 0.135], null],
  ['d-0300', [0.300, 0.205], 'this branch'],
];
const rows = [];
for (const [tag, brk, note] of CASES) {
  BRK = brk;
  const per = [];
  for (const seed of SEEDS) {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  await page.goto(`${base}/scene.html?scene=3&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__scene && window.__scene.activeId === 3);
  const m = await page.evaluate(async () => {
    const S = await import('/scene/beach-shore.js');
    window.__scene.pause(true);
    window.__scene.scenePump(40);
    const c = document.querySelector('.scene-canvas');
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const yWl = Math.round(S.WATERLINE_S * H);
    let inkS = 0, paperS = 0, greyS = 0, wavesS = 0, brokenS = 0, n = 0;
    for (let k = 0; k < 24; k++) {
      window.__scene.scenePump(1.7);
      window.__scene.step();
      const d = g.getImageData(0, 40, W, H - 40).data;
      let ink = 0, paper = 0, px = 0, grey = 0;
      for (let i = 0; i < d.length; i += 4) {
        const y = 40 + Math.floor((i / 4) / W);
        const v = d[i];
        if (y < yWl) { px++; if (v < 60) ink++; else if (v > 200) paper++; }
        else if (v > 180 && v < 215) grey++;
      }
      const st = window.__scene.sceneState();
      const ws = st.waveStages || [];
      inkS += 100 * ink / px; paperS += 100 * paper / px;
      greyS += 100 * grey / (W * (H - yWl));
      wavesS += st.drawnWaves;
      brokenS += ws.filter(w => (w.phase || []).some(p => p > 0.28)).length;
      n++;
    }
    window.__scene.scenePump(9.3); window.__scene.step();
    return { inkPct: inkS / n, paperPct: paperS / n, greyPct: greyS / n,
             waves: wavesS / n, drawn: wavesS / n, broken: brokenS / n };
  });
  if (seed === SEEDS[0]) await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  per.push(m);
  await page.close();
  }
  const mean = (k) => per.reduce((a, b) => a + b[k], 0) / per.length;
  const rng2 = (k) => [Math.min(...per.map(x => x[k])), Math.max(...per.map(x => x[k]))];
  rows.push({ tag, brk, note, inkPct: mean('inkPct'), paperPct: mean('paperPct'),
              greyPct: mean('greyPct'), drawn: mean('drawn'), broken: mean('broken'),
              inkR: rng2('inkPct'), paperR: rng2('paperPct') });
}
console.log(`SAMPLING: ${SEEDS.length} seeds x 24 moments each. ink/paper are of the WAVE ZONE`);
console.log('(top of frame down to the waterline); wet-band is of the BEACH below it.');
console.log('The bracket after each mean is its RANGE ACROSS SEEDS.\n');
console.log('  BREAK_S           ink %            paper %         wet %  drawn  broken   note');
for (const r of rows) {
  console.log(`  [${r.brk[0].toFixed(3)}, ${r.brk[1].toFixed(3)}]  ${r.inkPct.toFixed(1).padStart(5)}`
    + ` [${r.inkR[0].toFixed(1)}-${r.inkR[1].toFixed(1)}]   ${r.paperPct.toFixed(1).padStart(5)}`
    + ` [${r.paperR[0].toFixed(1)}-${r.paperR[1].toFixed(1)}]  ${r.greyPct.toFixed(1).padStart(5)}`
    + `  ${r.drawn.toFixed(1).padStart(5)}  ${r.broken.toFixed(1).padStart(6)}   ${r.note || ''}`);
}
fs.writeFileSync(path.join(OUT, 'index.html'),
  '<!doctype html><meta charset=utf-8><title>BREAK_S composition</title>'
  + '<style>body{background:#111;color:#eee;font:14px/1.5 ui-monospace,monospace;margin:24px}h1{font-size:18px}'
  + 'figure{margin:0 0 28px}img{width:100%;max-width:960px;border:1px solid #444;display:block}'
  + 'figcaption{margin:6px 0 0;color:#bbb}b{color:#fff}</style>'
  + '<h1>scene 3 — where the break lands, and what it costs the sea</h1>'
  + '<p>Same seed, same pumped moment, one constant changed. Percentages are averaged over 24 moments '
  + 'and are of the WAVE ZONE (top of frame down to the waterline).</p>'
  + rows.map(r => `<figure><img src="${r.tag}.png"><figcaption><b>[${r.brk[0].toFixed(3)}, ${r.brk[1].toFixed(3)}]`
    + `${r.note ? ' — ' + r.note : ''}</b><br>ink ${r.inkPct.toFixed(1)}% · paper ${r.paperPct.toFixed(1)}%`
    + ` · wet band ${r.greyPct.toFixed(1)}% · ${r.broken.toFixed(1)} of ${r.drawn.toFixed(1)} waves broken</figcaption></figure>`).join(''));
console.log(`\n  -> ${OUT}/index.html`);
await browser.close(); server.close();
