// tools/shot-knit-lab.mjs — screenshots of /knit-lab.html, through the real page in headless Chromium.
//   node tools/shot-knit-lab.mjs <out-dir> [--mid 0.3] [--runs <gate out dir>] [--phase2]
// Phase 3 (default): jersey and 1x1 rib settled, side by side (jersey-rib-settled.png); rib pulled
// ACROSS THE COURSES with the stepped test, paused at +mid (rib-mid-course-pull.png), and the panel.
// --runs <gate --out dir> also draws course-plot.png (jersey along / across, rib across) from the gate's
// saved runs — the reference numbers — rather than repeating two hour-long pulls in the page.
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
  const b64 = f => fs.readFileSync(path.join(OUT, f)).toString('base64');
  const pair = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await pair.setContent(`<body style="margin:0;background:#060707;font:14px monospace;color:#e9ecec"><div style="display:flex;gap:12px;padding:12px">${[['_jersey-settled.png', 'stockinette, settled'], ['_rib-settled.png', '1×1 rib, settled']].map(([f, t]) => `<figure style="margin:0;flex:1"><img style="width:100%" src="data:image/png;base64,${b64(f)}"><figcaption style="padding:6px 2px">${t} — same yarn, same 10 × 10 stitches, same gauge drawn; cast-on still pinned at the drawn width</figcaption></figure>`).join('')}</div></body>`);
  await pair.screenshot({ path: path.join(OUT, 'jersey-rib-settled.png'), fullPage: true }); await pair.close();
  for (const f of ['_jersey-settled.png', '_rib-settled.png']) fs.unlinkSync(path.join(OUT, f));
  // 2. rib across the courses: width released, side jaws, stepped test paused at +MID
  await page.click('[data-dir="course"]'); await page.click('#klTest');
  await page.waitForFunction(m => { const s = window.__knitLab.state; return s.phase === 'pulling' && s.extension > m - 1e-6 && s.step && !s.step.moving; }, MID, LONG);
  await page.evaluate(() => window.__knitLab.send({ type: 'pause', value: true })); await page.waitForTimeout(800);
  out.rib.mid = await state();
  await stage.screenshot({ path: path.join(OUT, 'rib-mid-course-pull.png') });
  await page.locator('.kl__panel').screenshot({ path: path.join(OUT, 'panel.png') });
}
// 3. --runs <dir>: the course plot, drawn from the gate's own saved runs (plain-course.json, rib-course.json)
if (args.includes('--runs')) {
  const dir = path.resolve(args[args.indexOf('--runs') + 1]);
  const R = Object.fromEntries(['plain', 'plain-course', 'rib-course'].map(k => [k, JSON.parse(fs.readFileSync(path.join(dir, `${k}.json`), 'utf8'))]));
  const W = 1100, H = 640, L = 90, Rm = 30, T = 40, B = 70, xMax = 0.62, lo = 1e3, hi = 4e6;
  const X = e => L + (e / xMax) * (W - L - Rm), Y = v => T + (1 - (Math.log10(Math.max(lo, v)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (H - T - B);
  const line = (rows, ph, col, dash) => { const p = rows.filter(r => r.phase === ph && r.load > 0).map(r => `${X(r.ext).toFixed(1)},${Y(r.load).toFixed(1)}`); return p.length ? `<polyline fill="none" stroke="${col}" stroke-width="2.2" ${dash ? 'stroke-dasharray="6 5"' : ''} points="${p.join(' ')}"/>` : ''; };
  const ser = [['plain', '#6b7778', 'jersey, along the wales'], ['plain-course', '#e9ecec', 'jersey, across the courses'], ['rib-course', '#3fb6a8', '1×1 rib, across the courses']];
  let g = '';
  for (let e = 0; e <= 0.6001; e += 0.1) g += `<line x1="${X(e)}" x2="${X(e)}" y1="${T}" y2="${H - B}" stroke="#1d2324"/><text x="${X(e)}" y="${H - B + 22}" fill="#9aa5a6" text-anchor="middle">${Math.round(e * 100)}%</text>`;
  for (let k = 3; k <= 6; k++) g += `<line x1="${L}" x2="${W - Rm}" y1="${Y(10 ** k)}" y2="${Y(10 ** k)}" stroke="#1d2324"/><text x="${L - 10}" y="${Y(10 ** k) + 5}" fill="#9aa5a6" text-anchor="end">1e${k}</text>`;
  g += `<line x1="${L}" x2="${W - Rm}" y1="${Y(1e6)}" y2="${Y(1e6)}" stroke="#7a4f2a" stroke-dasharray="3 4"/><text x="${W - Rm}" y="${Y(1e6) - 6}" fill="#b07a45" text-anchor="end">LOAD_LIMIT</text>`;
  for (const [k, c] of ser) g += line(R[k].pull.rows, 'pulling', c, false) + line(R[k].pull.rows, 'unloading', c, true);
  g += ser.map(([k, c, t], i) => `<rect x="${L + 20}" y="${T + 12 + i * 22}" width="22" height="3" fill="${c}"/><text x="${L + 50}" y="${T + 18 + i * 22}" fill="#e9ecec">${t}</text>`).join('');
  g += `<text x="${L + 20}" y="${T + 92}" fill="#9aa5a6">solid: loading, settled steps · dashed: unloading · μ 0.25 · log load, model units</text>`;
  g += `<text x="${(L + W - Rm) / 2}" y="${H - 18}" fill="#9aa5a6" text-anchor="middle">extension (jaw travel / gauge)</text>`;
  const plot = await browser.newPage({ viewport: { width: W, height: H } });
  await plot.setContent(`<body style="margin:0;background:#060707;font:14px monospace"><svg width="${W}" height="${H}">${g}</svg></body>`);
  await plot.screenshot({ path: path.join(OUT, 'course-plot.png') }); await plot.close();
  out.plot = { from: dir };
}
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
