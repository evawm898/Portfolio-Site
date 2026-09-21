#!/usr/bin/env node
// shot-scene-pads.mjs — the contact sheet for scene 1's lily pads.
//
//   node tools/shot-scene-pads.mjs <dir> [--seeds a,b,c]
//
// WHAT IT IS FOR: the pad SILHOUETTE and the CLUSTERING are taste, and taste is
// ruled on from a render rather than from a paragraph. Everything mechanical
// about the pads — the wave law, the rock, the draw order — is asserted by
// tools/verify-scene.mjs; this sheet exists for the half a gate cannot judge.
//
// NO PIXEL DELTA IS QUOTED ANYWHERE ON IT, and the reason is stronger here than
// on this repo's other sheets: those photograph scenes that are STILL between
// inputs, so "screenshot until two consecutive frames are byte-identical" is
// available to them. A pond is never still — rain falls, koi swim, rings
// spread — so there is no settled frame to wait for and a pixel comparison
// between two captures would be measuring the weather. Every cell is instead
// taken at a stated SIMULATION time on a pinned seed, which is reproducible,
// and every caption carries numbers read off the page's own reported state
// rather than off the picture.
//
// THE MACRO CELLS ARE CROPS, NOT A CAMERA. /scene has no zoom by design, so a
// close look at one pad is a crop of the full-resolution framebuffer around
// that pad's own reported position — which is why the sheet runs at
// deviceScaleFactor 2 and states the magnification on the cell.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const roots = [
    ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
    '/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules',
  ].filter(Boolean);
  for (const root of roots) {
    const entry = path.join(root, 'playwright', 'index.js');
    if (fs.existsSync(entry)) return require(entry);
  }
  return require('playwright');
}

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.json': 'application/json',
};

function serveRepo() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(REPO, rel);
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const body = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const VP = { width: 1280, height: 800 };
const DSF = 2;

async function openPond(browser, base, seed) {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: DSF });
  await ctx.route('https://fonts.googleapis.com/**',
    r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route('https://fonts.gstatic.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${base}/scene.html?seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__scene && window.__scene.activeId !== null,
    null, { timeout: 15000 });
  return { page, ctx, errors };
}

// Wait on the POND's own clock, never the wall's: headless software GL runs at
// a couple of frames a second and a scene advances by the sum of its clamped
// deltas, so a fixed sleep photographs an arbitrary moment (the gate's own
// measured lesson).
async function pond(page, secs, capMs = 90000) {
  const from = await page.evaluate(() => window.__scene.sceneState().clock);
  await page.waitForFunction(([t0, want]) => window.__scene.sceneState().clock - t0 >= want,
    [from, secs], { timeout: capMs, polling: 50 });
}

const st = (page) => page.evaluate(() => window.__scene.sceneState());

// A pad's own plane position, in CSS pixels. The squash is the page's, read
// back rather than restated.
const toScreen = (s, x, y) => ({ x, y: y * s.squash });

async function crop(page, file, cx, cy, w, h) {
  const x = Math.max(0, Math.min(VP.width - w, Math.round(cx - w / 2)));
  const y = Math.max(0, Math.min(VP.height - h, Math.round(cy - h / 2)));
  await page.screenshot({ path: file, clip: { x, y, width: w, height: h } });
  return { x, y, w, h };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node tools/shot-scene-pads.mjs <dir> [--seeds a,b,c]'); process.exit(2); }
  const seedArg = (process.argv.find(a => a.startsWith('--seeds=')) || '').split('=')[1];
  const seeds = (seedArg ? seedArg.split(',') : ['4242', '7', '90210']).map(Number);
  fs.mkdirSync(dir, { recursive: true });

  const server = await serveRepo();
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const cells = [];
  const allErrors = [];

  try {
    // --- the field, at three seeds ------------------------------------------
    for (const seed of seeds) {
      const { page, ctx, errors } = await openPond(browser, base, seed);
      try {
        await pond(page, 6);
        const s = await st(page);
        const f = `field-${seed}.png`;
        await page.screenshot({ path: path.join(dir, f) });
        const rs = s.padAt.map(p => p[2]);
        cells.push({
          file: f, title: `The field — seed ${seed}`,
          note: `${s.pads} pads in ${s.clusters} clusters, ${s.blooms} blooms. `
            + `Radii ${Math.min(...rs).toFixed(0)}–${Math.max(...rs).toFixed(0)} plane px. `
            + `${s.visible} koi on screen, ${s.ripples} ripples. Pond clock ${s.clock.toFixed(1)} s, idle rain.`,
        });
        allErrors.push(...errors);
      } finally { await ctx.close(); }
    }

    // --- the shape, up close, on the first seed -----------------------------
    {
      const { page, ctx, errors } = await openPond(browser, base, seeds[0]);
      try {
        await pond(page, 6);
        let s = await st(page);

        // The largest pad whose whole silhouette is on screen: a crop of one cut
        // in half says nothing about the outline.
        const onScreen = s.padAt
          .map(([x, y, R], i) => ({ i, x, y, R, ...toScreen(s, x, y) }))
          .filter(p => p.x - p.R > 20 && p.x + p.R < VP.width - 20
                    && p.y - p.R * s.squash > 20 && p.y + p.R * s.squash < VP.height - 20);
        onScreen.sort((a, b) => b.R - a.R);
        const big = onScreen[0];
        if (big) {
          const box = Math.round(big.R * 3.2);
          await crop(page, path.join(dir, 'pad-macro.png'), big.x, big.y, box, Math.round(box * 0.8));
          cells.push({
            file: 'pad-macro.png', title: 'One pad',
            // THE NUMBER IS THE PAD'S OWN DISC AND THE CAPTION SAYS SO. `R` is the
            // radius the pad is built on, so `2R` x the squash is the disc it would
            // draw if its rim were a circle — which it is not. Measured over seeds
            // 1-40 (1,515 pads), the lobed outline's own box runs 0.91 to 1.03 of
            // that, median 1.00, in BOTH axes alike. Calling the nominal "drawn"
            // is the nominal reported as the drawn, which is the reading this
            // sheet exists to make checkable.
            note: `Radius ${big.R.toFixed(0)} plane px, so its own disc is `
              + `${(big.R * 2).toFixed(0)}x${(big.R * 2 * s.squash).toFixed(0)} CSS px — `
              + `the lobed rim carries the silhouette between 0.91 and 1.03 of that. `
              + `Crop of the live frame at `
              + `${DSF}x, so ${DSF} image px per CSS px. The rim is organic rather than `
              + `circular, the wedge is the stem notch, the midrib runs from its apex.`,
          });
        }

        // The densest clump: the thing the brief is actually about.
        const near = s.padAt.map(([x, y, R]) => {
          const n = s.padAt.filter(([ox, oy]) => Math.hypot(ox - x, oy - y) < 190).length;
          return { x, y, R, n, ...toScreen(s, x, y) };
        }).filter(p => p.x > 200 && p.x < VP.width - 200 && p.y > 140 && p.y < VP.height - 140);
        near.sort((a, b) => b.n - a.n);
        if (near[0]) {
          await crop(page, path.join(dir, 'cluster.png'), near[0].x, near[0].y, 560, 420);
          cells.push({
            file: 'cluster.png', title: 'A clump',
            note: `${near[0].n} pads within 190 plane px of one another. Clusters are placed `
              + `first and pads are drawn around them, so the open water between clumps is `
              + `structural rather than a gap a scatter happened to leave.`,
          });
        }

        // A bloom, if one is on screen.
        const bl = s.bloomAt.map(([x, y, R]) => ({ x, y, R, ...toScreen(s, x, y) }))
          .filter(b => b.x > 120 && b.x < VP.width - 120 && b.y > 100 && b.y < VP.height - 100);
        if (bl[0]) {
          await crop(page, path.join(dir, 'bloom-macro.png'), bl[0].x, bl[0].y, 300, 240);
          cells.push({
            file: 'bloom-macro.png', title: 'A bloom',
            note: `Outer reach ${bl[0].R.toFixed(0)} plane px. Two tiers of radiating petals `
              + `and a ring of stamens — the reference's flower at the koi's own level of `
              + `detail, which is to say no more than that. It stands above the water, so it `
              + `sits ${(3.4 * s.lift).toFixed(1)} screen px higher than its own plane point.`,
          });
        }
        allErrors.push(...errors);
      } finally { await ctx.close(); }
    }

    // --- a koi under a pad, and a pad under a front -------------------------
    {
      const { page, ctx, errors } = await openPond(browser, base, seeds[0]);
      try {
        await pond(page, 4);
        // Watch for a frame where a koi's head is actually inside a pad's rim.
        // Searched for rather than staged: a staged one would not be evidence
        // that it happens on its own.
        let found = null;
        for (let t = 0; t < 40 && !found; t++) {
          const s = await st(page);
          for (const [, fx, fy] of s.fishAt) {
            for (const [px, py, R] of s.padAt) {
              if (Math.hypot(fx - px, fy - py) < R * 0.85) {
                const sc = toScreen(s, px, py);
                if (sc.x > 180 && sc.x < VP.width - 180 && sc.y > 140 && sc.y < VP.height - 140) {
                  found = { sc, R, s };
                }
                break;
              }
            }
            if (found) break;
          }
          if (!found) await pond(page, 1.5);
        }
        if (found) {
          await crop(page, path.join(dir, 'under-a-pad.png'), found.sc.x, found.sc.y, 520, 400);
          cells.push({
            file: 'under-a-pad.png', title: 'A koi under a pad',
            note: `Found by watching, not staged. The pad is drawn after the fish and after `
              + `the ripples, so it hides both — draw order is the only depth cue this scene `
              + `has, and a koi drawn OVER a pad would read as a pad painted on the pond `
              + `floor. Nothing steers a koi around a pad; koi shelter under them.`,
          });
        } else {
          cells.push({ file: null, title: 'A koi under a pad', note: 'No koi crossed a pad in a minute of pond on this seed.' });
        }

        // The rock: click right beside a pad and catch the front crossing it.
        const s0 = await st(page);
        const cand = s0.padAt.map(([x, y, R], i) => ({ i, x, y, R, ...toScreen(s0, x, y) }))
          .filter(p => p.R > 26 && p.x > 240 && p.x < VP.width - 240 && p.y > 200 && p.y < VP.height - 200);
        if (cand[0]) {
          const p = cand[0];
          await page.mouse.click(Math.round(p.x - p.R * 1.35), Math.round(p.y));
          let best = { tilt: 0, lift: 0 };
          for (let k = 0; k < 24; k++) {
            const s = await st(page);
            const [, , , tilt, lift] = s.padAt[p.i];
            if (Math.abs(tilt) > Math.abs(best.tilt)) {
              best = { tilt, lift };
              await crop(page, path.join(dir, 'rocking.png'), p.x, p.y, 480, 360);
            }
            await page.waitForTimeout(90);
          }
          cells.push({
            file: 'rocking.png', title: 'A front crossing a pad',
            note: `Caught at the pad's own peak rock: tilt ${(best.tilt * 180 / Math.PI).toFixed(2)}°, `
              + `bob ${best.lift.toFixed(2)} plane px (${(best.lift * s0.lift).toFixed(2)} screen px). `
              + `The pad reads the ripple field as a height field: the height is the bob and its `
              + `gradient is the rock. It cannot tell this click from a raindrop.`,
          });
        }
        allErrors.push(...errors);
      } finally { await ctx.close(); }
    }

    // --- the index -----------------------------------------------------------
    const html = `<!DOCTYPE html><meta charset="utf-8"><title>scene 1 — lily pads</title>
<style>
 body{background:#0a0b0d;color:#c8d0d8;font:14px/1.6 "IBM Plex Mono",ui-monospace,monospace;margin:0;padding:28px}
 h1{font-size:15px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#8fa0ae}
 p.lede{max-width:74ch;color:#93a1ad}
 .cell{margin:34px 0;max-width:1320px}
 .cell h2{font-size:13px;font-weight:500;letter-spacing:.06em;color:#dfe6ec;margin:0 0 6px}
 .cell p{margin:6px 0 0;max-width:86ch;color:#8b98a4;font-size:12.5px}
 img{display:block;max-width:100%;border:1px solid #1b1f24;background:#000}
 .missing{padding:20px;border:1px dashed #2a2f36;color:#6d7a86}
 code{color:#a9bcc9}
</style>
<h1>Scene 1 — lily pads and blooms</h1>
<p class="lede">Every cell is a crop of, or the whole of, a live frame at a pinned seed and a stated
pond time. <strong>No pixel delta is quoted anywhere</strong>: a pond is never still, so there is no
settled frame to compare against — every number below is read off the page's own reported state.
Viewport 1280&times;800 at deviceScaleFactor ${DSF}.</p>
${cells.map(c => `<div class="cell"><h2>${c.title}</h2>${
  c.file ? `<img src="${c.file}" alt="${c.title}">` : `<div class="missing">not captured</div>`
}<p>${c.note}</p></div>`).join('\n')}
<p class="lede">Console across every page session: ${allErrors.length ? `<code>${allErrors.join(' | ')}</code>` : 'clean.'}</p>
`;
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`${cells.filter(c => c.file).length} cells -> ${path.join(dir, 'index.html')}`);
    if (allErrors.length) console.error('PAGE ERRORS:\n  ' + allErrors.join('\n  '));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(2); });
