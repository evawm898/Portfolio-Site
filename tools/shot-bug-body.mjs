#!/usr/bin/env node
/* shot-bug-body.mjs <dir> [--base <worktree of main>] — the contact sheet for
   BODY TYPES (bug-project-design-doc.md §17). Writes <dir>/index.html with every
   picture embedded (one file to send).

   Sections:
     types     each body type on the SAME wings (the default's): Top, 3/4, Front;
     extremes  each type at SIZE and WIDTH at both ends of their sliders (3/4);
     spider    Spider sets the wing pairs to 0 (its row above) — and Undo brings
               them back, shot after a REAL Undo click;
     panel     the page's own panel: the Body section with the fine-controls
               drop-down CLOSED (as it loads) and OPEN after a real click, and
               the type reading Custom after a real drag of a fine slider;
     antenna   the front-view antenna tips: main's default (--base) beside this
               tree's Butterfly, close up from the front.
   Every number in a caption is read off the model or the page. No pixel claim. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-body-sheet');
const bi = process.argv.indexOf('--base'), BASE = bi > 0 ? path.resolve(process.argv[bi + 1]) : null;
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const serve = (root) => http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function openPage(root, vw = 1280, vh = 860) {
  const server = serve(root); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
  });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/bug.html`);
  await page.waitForFunction(() => window.__bug && window.__bug.triangleCount() > 0);
  return { page, server, errors };
}
/* the bug's own box on screen (non-background pixels of the 3D canvas), padded
   to 4:3 — so a panel shows the bug large, not the window around it */
const bugClip = (page) => page.evaluate(() => {
  const src = document.getElementById('bug-canvas'), W = src.width, H = src.height, sx = window.innerWidth / W;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const i = 4 * (y * W + x); if (d[i] + d[i + 1] + d[i + 2] > 75) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 <= x0) return null;
  let w = (x1 - x0) * 1.12 + 20, h = (y1 - y0) * 1.12 + 20; if (w / h > 4 / 3) h = (w * 3) / 4; else w = (h * 4) / 3;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const X = Math.max(0, cx - w / 2) * sx, Y = Math.max(0, cy - h / 2) * sx;
  return { x: X, y: Y, width: Math.min(w * sx, window.innerWidth - X), height: Math.min(h * sx, window.innerHeight - Y) };
});
const jpg = async (page, clip) => (await page.screenshot({ type: 'jpeg', quality: 86, ...(clip ? { clip } : {}) })).toString('base64');
const hideChrome = (page) => page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-viewtoggle,.bg-edbar{display:none!important}' });

const NAME = { butterfly: 'Butterfly', moth: 'Moth', bee: 'Bee', dragonfly: 'Dragonfly', spider: 'Spider' };
const facts = (p) => {
  const m = G.buildBug(p), f = G.fitBody(p);
  let x = 0, wings = false; for (const q of m.parts) if (/^wing\d$/.test(q.kind) && q.side === 'R') { wings = true; for (let v = q.v0; v < q.v1; v++) x = Math.max(x, m.positions[3 * v]); }
  const B = G.bodyLengthMm(p), span = wings ? 2 * x : G.BODY_REF_SPAN_MM;
  return { B, span, ratio: B / span, tris: m.triangleCount, wings, notes: [...f.notes, ...m.notes], mirror: G.mirrorDiff(m) };
};
const cap = (p, f) => `SIZE ${p.bodySize.toFixed(2)} · WIDTH ${p.bodyWidth.toFixed(2)} — body ${f.B.toFixed(1)} mm = ${f.ratio.toFixed(3)} × ${f.wings ? `the ${f.span.toFixed(1)} mm wingspan (measured off the model)` : `the ${f.span} mm reference span (no wings)`} · ${f.tris.toLocaleString()} triangles · mirror diff ${f.mirror}${f.notes.length ? ` · notes: ${f.notes.join('; ')}` : ''}`;

const sections = [];
const { page, server, errors } = await openPage(ROOT);

/* ---- panel ---- */
{
  const cells = [];
  const panelClip = async () => { const r = await page.evaluate(() => { const b = document.querySelector('.bg-panel').getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }); return r; };
  await page.evaluate(() => { const s = document.querySelector('details[data-sec="plan"]'); document.querySelector('.bg-panel').scrollTop = s.offsetTop - 10; });
  await page.waitForTimeout(200);
  cells.push({ img: await jpg(page, await panelClip()), cap: 'The Body section as the page loads: BODY TYPE, SIZE, WIDTH, the fit read out, and the fine controls CLOSED. Legs and Antennae stay their own sections below.' });
  await page.click('details[data-sec="bodyFine"] > summary');
  await page.waitForTimeout(200);
  await page.evaluate(() => { const s = document.querySelector('details[data-sec="plan"]'); document.querySelector('.bg-panel').scrollTop = s.offsetTop - 10; });
  cells.push({ img: await jpg(page, await panelClip()), cap: 'After a REAL click on the drop-down: every head / thorax / abdomen / cross-section / segment control, inside Body. (There is no separate Advanced section.)' });
  // a REAL drag of a fine slider: the type reads Custom
  const box = await page.evaluate(() => { const i = document.getElementById('thoraxWidth'); i.scrollIntoView({ block: 'center' }); const b = i.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  await page.mouse.move(box.x + box.w * 0.25, box.y + box.h / 2); await page.mouse.down(); await page.mouse.move(box.x + box.w * 0.32, box.y + box.h / 2, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(600);
  const typ = await page.evaluate(() => document.getElementById('bodyType').value);
  await page.evaluate(() => { const s = document.querySelector('details[data-sec="plan"]'); document.querySelector('.bg-panel').scrollTop = s.offsetTop - 10; });
  cells.push({ img: await jpg(page, await panelClip()), cap: `After a REAL drag of the thorax-width slider: the body type reads "${typ}" — the fine fields are the body now, as set; SIZE / WIDTH still act on it (they capture its proportions first).` });
  sections.push({ title: 'The panel', note: 'Shot from the page itself (the right-hand panel, cropped).', cells, cols: 3 });
  await page.evaluate(() => window.__bug.setParams(window.__bug.getParams()));   // (reset below)
}

await hideChrome(page);
async function shoot(p, view) {
  await page.evaluate((p) => window.__bug.setParams(p), p);
  await page.evaluate((v) => window.__bug.setView(v), view);
  await page.waitForTimeout(250);
  return jpg(page, await bugClip(page));
}

/* ---- each type on the same wings ---- */
{
  const cells = [];
  for (const t of G.BODY_TYPE_IDS) {
    const p = G.applyBodyType(G.defaultParams(), t).params, f = facts(p);
    for (const v of ['top', 'three', 'front']) cells.push({ img: await shoot(p, v), cap: `<b>${NAME[t]}</b> — ${v === 'three' ? '3/4' : v}${v === 'top' ? `<br>${cap(p, f)}` : ''}` });
  }
  sections.push({ title: 'Each body type on the same wings (the default wings)', note: 'Top, 3/4 and Front of the page\'s own render. The wings are untouched by a type — except Spider, which sets the wing pairs to 0 (its row). The bee and the dragonfly are sized against these butterfly wings, so they read as a large body under small-for-them wings: SIZE is a proportion of the span.', cells, cols: 3 });
}

/* ---- extremes ---- */
{
  const cells = [];
  for (const t of G.BODY_TYPE_IDS) {
    for (const [s, w, lab] of [[G.BODY_SIZE_RANGE[0], 1, 'SIZE min'], [G.BODY_SIZE_RANGE[1], 1, 'SIZE max'], [null, G.BODY_WIDTH_RANGE[0], 'WIDTH min'], [null, G.BODY_WIDTH_RANGE[1], 'WIDTH max']]) {
      const p = G.applyBodyType(G.defaultParams(), t).params;
      if (s !== null) p.bodySize = s; p.bodyWidth = w;
      const q = G.fitBody(p).params, f = facts(q);
      cells.push({ img: await shoot(q, 'three'), cap: `<b>${NAME[t]}</b> — ${lab}<br>${cap(q, f)}` });
    }
  }
  sections.push({ title: `Each type at the ends of SIZE (${G.BODY_SIZE_RANGE.map((v) => v.toFixed(2)).join(' – ')} × span) and WIDTH (${G.BODY_WIDTH_RANGE.map((v) => v.toFixed(2)).join(' – ')} ×)`, note: '3/4 view, each cropped to its own bug (so compare proportions, not scale — the caption gives the mm). Where a slider end asks a fine field past its own range the field is HELD there and the caption says so.', cells, cols: 2 });
}

/* ---- spider wings off, and Undo ---- */
{
  const cells = [];
  await page.evaluate((p) => window.__bug.setParams(p), G.defaultParams());
  await page.evaluate(() => { const s = document.getElementById('bodyType'); s.value = 'spider'; s.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(500); await page.evaluate(() => window.__bug.flushBuild()); await page.evaluate(() => window.__bug.setView('three')); await page.waitForTimeout(250);
  const a = await page.evaluate(() => ({ pairs: window.__bug.getParams().wingPairs, msg: document.getElementById('wlMsg').textContent }));
  cells.push({ img: await jpg(page, await bugClip(page)), cap: `Spider chosen (the dropdown's own input event): wing pairs <b>${a.pairs}</b>. The page says: “${a.msg}”` });
  await page.evaluate(() => window.__bug.undo()); await page.waitForTimeout(300); await page.evaluate(() => window.__bug.setView('three')); await page.waitForTimeout(250);
  const b = await page.evaluate(() => ({ pairs: window.__bug.getParams().wingPairs, type: window.__bug.getParams().bodyType }));
  cells.push({ img: await jpg(page, await bugClip(page)), cap: `After Undo: wing pairs <b>${b.pairs}</b>, body type ${b.type} — the wings were stored all along.` });
  sections.push({ title: 'Spider: wings off, undoable', note: '', cells, cols: 2 });
}

/* ---- the antenna tips from the front ---- */
{
  const cells = [];
  const close = async (pg, Gm) => {
    const prm = await pg.evaluate(() => window.__bug.getParams());
    const m = Gm.buildBug(prm), q = m.parts.find((x) => x.name === 'antenna' && x.side === 'R');
    let c = [0, 0, 0], n = 0; for (let v = q.v0; v < q.v1; v++) { for (let d = 0; d < 3; d++) c[d] += m.positions[3 * v + d]; n++; }
    c = c.map((x) => x / n);
    await pg.evaluate((c) => { window.__bug.setView('front'); window.__bug.lookAt([0, c[1], c[2] * 1.6], [0, 1, 0.05], 55); }, c);
    await pg.waitForTimeout(250);
    return jpg(pg);
  };
  if (BASE) {
    const o = await openPage(BASE); await hideChrome(o.page);
    const Gb = await import(path.join(BASE, 'bug-geometry.js'));
    cells.push({ img: await close(o.page, Gb), cap: 'main (before): the default from the FRONT. No ball is emitted (pointed tips on: the antenna part is one tube ending in a cone) — the 0.22-long teardrop club points almost straight at the camera (rise 0.35 ≈ 19°), so its round head is seen nearly END-ON and reads as a ball.' });
    await o.page.close(); o.server.close();
  }
  await page.evaluate((p) => window.__bug.setParams(p), G.defaultParams());
  cells.push({ img: await close(page, G), cap: 'This tree: the Butterfly type from the FRONT — the same teardrop law, the club 0.30 of the antenna, and the antennae LIFTED 45° (the new Lift control), so the club is seen from the side and reads as a teardrop.' });
  await page.evaluate((p) => window.__bug.setView('three'), null); await page.waitForTimeout(250);
  cells.push({ img: await jpg(page, await bugClip(page)), cap: 'The Butterfly type at 3/4.' });
  sections.push({ title: 'Front view: the antenna tips', note: 'The finding: not the pointed-terminations toggle and not a regression — a view-direction effect of a club pointing at the camera. The fix is the Butterfly type\'s lift and club length (the elegance teardrop law is unchanged).', cells, cols: BASE ? 3 : 2 });
}
if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
await browser.close(); server.close();

const html = `<!doctype html><meta charset="utf-8"><title>Bug body types — contact sheet</title>
<style>body{background:#0a0a0c;color:#ededE8;font:13px/1.5 'Space Mono',monospace;margin:24px auto;max-width:1800px;padding:0 24px;}h1{font:600 28px Georgia,serif;}h2{font:600 20px Georgia,serif;margin:36px 0 6px;border-top:1px solid #333;padding-top:18px;}
.g{display:grid;gap:14px;}figure{margin:0;}img{width:100%;display:block;border:1px solid #2a2a2e;}figcaption{color:#9a9a95;font-size:11.5px;margin-top:4px;}figcaption b{color:#ededE8;}.n{color:#9a9a95;max-width:1100px;}</style>
<h1>/bug — body types (design doc §17)</h1>
<p class="n">Eva's ruling: the body is too adjustable. BODY TYPE (Butterfly, Moth, Bee, Dragonfly, Spider; Custom once any fine body control is edited), SIZE (body length as a proportion of the wingspan; a wingless bug against a 72 mm reference span) and WIDTH (slender ↔ stout). The wings are never changed by a type — Spider alone sets the pair count to 0. ${errors.length ? `<b>PAGE ERRORS: ${errors.length}</b>` : 'No page errors.'}</p>
${sections.map((s) => `<h2>${s.title}</h2>${s.note ? `<p class="n">${s.note}</p>` : ''}<div class="g" style="grid-template-columns:repeat(${s.cols},1fr)">${s.cells.map((c) => `<figure><img src="data:image/jpeg;base64,${c.img}"><figcaption>${c.cap}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`wrote ${path.join(OUT, 'index.html')} (${(html.length / 1024 / 1024).toFixed(1)} MB)`);
