// tools/shot-knit-lab.mjs — screenshots of /knit-lab.html, through the real page in headless Chromium.
//   node tools/shot-knit-lab.mjs <out-dir> [--mid 0.3] [--phase2]
// Phase 3 (default): jersey and 1x1 rib settled, side by side (jersey-rib-settled.png); jersey and
// rib each pulled ACROSS THE COURSES with the stepped test — rib paused at +mid (rib-mid-course-pull.png);
// the plot with both course curves (course-plot.png: rib in colour, jersey grey) and the panel.
// --phase2 takes the phase-2 set instead (plain and eyelet along the wales: settled, +20%, done).
// Serves the repo itself; Google Fonts are aborted (the page falls back to its font stack).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find(a => !a.startsWith('--') && !/^[\d.]+$/.test(a)) || 'knit-lab-shots');
const MID = args.includes('--mid') ? +args[args.indexOf('--mid') + 1] : 0.3;
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/knit-lab.html`);
await page.waitForFunction(() => window.__knitLab && window.__knitLab.state);
await page.evaluate(() => document.querySelector('.kl').scrollIntoView());
const canvas = page.locator('#klCanvas'), stage = page.locator('.kl__grid');
const out = { errors };
const LONG = { timeout: 3600000, polling: 500 };
const pick = async sw => { await page.click(`[data-swatch="${sw}"]`); await page.waitForFunction(s => window.__knitLab.init && window.__knitLab.init.swatch === s && window.__knitLab.state && window.__knitLab.state.frame > 0, sw); };
const settled = async () => { await page.waitForFunction(() => window.__knitLab.state.phase === 'settled', null, LONG); await page.waitForTimeout(600); };
const state = () => page.evaluate(() => { const k = window.__knitLab, s = k.state; return { phase: s.phase, ext: s.extension, frames: s.settledAt && s.settledAt.frames, wallMs: s.settleWallMs, msPerSubstep: s.timing.msPerSubstep, n: k.init.n, worstDeep: s.worstDeep, span: s.waleSpan, free: s.freeAt, steps: s.step && s.step.n }; });

if (args.includes('--phase2')) {
  for (const sw of ['plain', 'eyelet']) {
    if (sw !== 'plain') await pick(sw);
    await settled(); await stage.screenshot({ path: path.join(OUT, `${sw}-1-settled.png`) });
    await page.click('#klTest');
    await page.waitForFunction(m => window.__knitLab.state.phase === 'pulling' && window.__knitLab.state.extension > m - 1e-6 && window.__knitLab.state.step && !window.__knitLab.state.step.moving, 0.2, LONG);
    await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: true })); await page.waitForTimeout(500);
    await stage.screenshot({ path: path.join(OUT, `${sw}-2-mid-pull.png`) });
    await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: false }));
    await page.waitForFunction(() => window.__knitLab.state.phase === 'done', null, LONG); await page.waitForTimeout(600);
    await stage.screenshot({ path: path.join(OUT, `${sw}-3-done.png`) });
  }
  await page.locator('#klChart').screenshot({ path: path.join(OUT, 'load-unload-plot.png') });
} else {
  // 1. both settled, the canvas only, then side by side
  await settled(); out.jersey = { settled: await state() };
  await canvas.screenshot({ path: path.join(OUT, '_jersey-settled.png') });
  await pick('rib'); await settled(); out.rib = { settled: await state() };
  await canvas.screenshot({ path: path.join(OUT, '_rib-settled.png') });
  const pair = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const b64 = f => fs.readFileSync(path.join(OUT, f)).toString('base64');
  await pair.setContent(`<body style="margin:0;background:#060707;font:14px monospace;color:#e9ecec"><div style="display:flex;gap:12px;padding:12px">${[['_jersey-settled.png', 'stockinette, settled'], ['_rib-settled.png', '1×1 rib, settled']].map(([f, t]) => `<figure style="margin:0;flex:1"><img style="width:100%" src="data:image/png;base64,${b64(f)}"><figcaption style="padding:6px 2px">${t} — same yarn, same 10 × 10 stitches, same gauge drawn</figcaption></figure>`).join('')}</div></body>`);
  await pair.screenshot({ path: path.join(OUT, 'jersey-rib-settled.png'), fullPage: true }); await pair.close();
  // 2. jersey across the courses, to the end
  await pick('plain'); await settled();
  await page.click('[data-dir="course"]'); await page.click('#klTest');
  await page.waitForFunction(() => window.__knitLab.state.phase === 'done', null, LONG); await page.waitForTimeout(600);
  out.jersey.course = await page.evaluate(() => { const r = window.__knitLab.results['plain/course']; return { jam: r.jam.ext, loss: r.cycle.lossFraction, set: r.cycle.set, peak: r.peak, steps: r.rows.length }; });
  // 3. rib across the courses: paused at +MID, then to the end
  await pick('rib'); await settled();
  await page.click('#klTest');
  await page.waitForFunction(m => { const s = window.__knitLab.state; return s.phase === 'pulling' && s.extension > m - 1e-6 && s.step && !s.step.moving; }, MID, LONG);
  await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: true })); await page.waitForTimeout(800);
  out.rib.mid = await state();
  await stage.screenshot({ path: path.join(OUT, 'rib-mid-course-pull.png') });
  await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: false }));
  await page.waitForFunction(() => window.__knitLab.state.phase === 'done', null, LONG); await page.waitForTimeout(800);
  out.rib.course = await page.evaluate(() => { const r = window.__knitLab.results['rib/course']; return { jam: r.jam.ext, loss: r.cycle.lossFraction, set: r.cycle.set, peak: r.peak, steps: r.rows.length }; });
  await page.locator('#klChart').screenshot({ path: path.join(OUT, 'course-plot.png') });
  await page.locator('.kl__panel').screenshot({ path: path.join(OUT, 'panel.png') });
  for (const f of ['_jersey-settled.png', '_rib-settled.png']) fs.unlinkSync(path.join(OUT, f));
}
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
