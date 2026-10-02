#!/usr/bin/env node
/* shot-bug-image.mjs <dir> — the contact sheet for IMAGE -> BUG
   (bug-project-design-doc.md §11).

   Every picture is a SYNTHETIC fixture (tools/verify-bug-image-fixtures.mjs):
   drawn from a KNOWN bug, rotated a few degrees, its left half stretched,
   noisy, with background-coloured "spots" in the wings. NONE IS A PHOTOGRAPH —
   Eva's own reference pictures are not in the repository, and how the import
   does on them can only be seen by trying them on the deploy preview.

   Sections (every page cell is the real page driven by a real input):
     fits     each picture loaded through a different real route — the file
              input, a dispatched PASTE event carrying the picture, a dispatched
              DROP — and its fitted bug: the SVG view (Top -> SVG) with the
              source as the backdrop, and the 3D model at 3/4
     split    the split line dragged by a REAL pointer drag on its handle, at
              two positions, both pairs refitted
     tol      the fit-tolerance slider at both ends, the control-point counts
              read back off the page
     erase    a stray blob joined to a wing, before and after a REAL brush
              stroke over it
     refused  the busy background, refused, with the page's own message
   No pixel claim anywhere: every number is read off the page or the model. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';
import { IMAGE_FIXTURES, encodePNG } from './verify-bug-image-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-image-sheet');
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());

// the fixtures, written as PNG files (the page reads them as any picture)
const FIX = {};
for (const name of ['butterfly', 'swallowtail', 'moth', 'dragonfly', 'stray', 'busy']) {
  const img = IMAGE_FIXTURES[name]();
  FIX[name] = { file: path.join(OUT, `fixture-${name}.png`), img };
  fs.writeFileSync(FIX[name].file, encodePNG(img));
}
const b64 = (f) => fs.readFileSync(f).toString('base64');
const out = { fits: [], split: [], tol: [], erase: [], refused: [] };
const facts = {};
const STAGE = { x: 0, y: 0, width: 960, height: 820 };
const shot = async (clip = STAGE) => (await page.screenshot({ type: 'png', clip })).toString('base64');
const state = () => page.evaluate(() => window.__bug.importState());
const settle = async () => { await page.evaluate(() => window.__bug.flushBuild()); await page.waitForTimeout(150); };

await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
await page.waitForTimeout(300);

/* three real routes in: the file input, a paste, a drop */
async function viaFile(name) { await page.setInputFiles('#imFile', FIX[name].file); }
async function viaEvent(name, kind) {
  await page.evaluate(([data, kind]) => {
    const bin = atob(data), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const file = new File([u], 'picture.png', { type: 'image/png' }), dt = new DataTransfer(); dt.items.add(file);
    if (kind === 'paste') document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    else { window.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })); window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }
  }, [b64(FIX[name].file), kind]);
}
async function load(name, how) {
  const before = await page.evaluate(() => (window.__bug.importState() || {}).message || '');
  if (how === 'file') await viaFile(name); else await viaEvent(name, how);
  await page.waitForFunction((b) => { const s = window.__bug.importState(); return s && s.message && s.message !== b; }, before, { timeout: 20000 });
  await settle();
  return state();
}
const viewTop = async () => { await page.click('#viewButtons button[data-view="top"]'); if ((await page.evaluate(() => window.__bug.mainMode())) !== 'svg') await page.click('#viewToggle button[data-main="svg"]'); await settle(); };
const view34 = async () => { await page.click('#viewButtons button[data-view="three"]'); await page.waitForTimeout(250); };
const summary = (s) => s.pairs ? s.pairs.map((q, i) => `pair ${i + 1}: ${q.points} pts, ≤ ${q.maxDevMm.toFixed(2)} mm${q.tail && !q.tail.inline ? `, TAIL ${q.tail.points} pts` : ''}`).join(' · ') : '';

/* ---------- fits ---------- */
for (const [name, how] of [['butterfly', 'file'], ['swallowtail', 'paste'], ['moth', 'drop'], ['dragonfly', 'file']]) {
  const s = await load(name, how);
  await viewTop();
  const svgImg = await shot();
  const p = await page.evaluate(() => window.__bug.getParams());
  const mFit = G.buildBug(p);
  await view34();
  const threeImg = await shot();
  await viewTop();
  facts[name] = { ok: s.ok, mode: s.mode, pairs: s.pairs, mirror: G.mirrorDiff(mFit), floor: mFit.floorViolations.length, tris: mFit.triangleCount, notes: mFit.notes };
  out.fits.push({ name, how, svgImg, threeImg, note: `${s.ok ? `fitted · ${s.mode} · ${summary(s)}` : `REFUSED: ${s.reason}`} · mirror diff ${G.mirrorDiff(mFit)} · floor violations ${mFit.floorViolations.length} · ${mFit.triangleCount.toLocaleString()} triangles`, message: s.message, truth: `drawn from a known bug: rotated ${FIX[name].img.truth.angleDeg}°, left half stretched ${(100 * FIX[name].img.truth.asym).toFixed(1)}%` });
}

/* ---------- split: two positions by a REAL drag on the outer handle ---------- */
await load('butterfly', 'file');
await viewTop();
const s0 = await state();
out.split.push({ img: await shot(), label: 'split line at the notch (the default)', note: summary(s0) + ` · handle at ${s0.split.outer.map((v) => v.toFixed(1)).join(', ')} mm` });
async function dragHandle(k, dx, dy) {
  const p0 = await page.evaluate((kk) => window.__bug.splitScreen(kk), k);
  await page.mouse.move(p0[0], p0[1]); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(p0[0] + (dx * i) / 8, p0[1] + (dy * i) / 8);
  await page.mouse.up();
  await page.waitForTimeout(200); await settle();
  return { from: p0, to: await page.evaluate((kk) => window.__bug.splitScreen(kk), k) };
}
const d1 = await dragHandle('outer', 10, 40);
const s1 = await state();
const pts1 = await page.evaluate(() => window.__bug.getParams().wings);
out.split.push({ img: await shot(), label: 'outer handle dragged 40 px down the hindwing margin (a real pointer drag) — both pairs refit', note: summary(s1) + ` · handle snapped onto the margin at ${s1.split.outer.map((v) => v.toFixed(1)).join(', ')} mm` });
const d2 = await dragHandle('root', 0, 30);
const s2 = await state();
out.split.push({ img: await shot(), label: 'root handle dragged 30 px back along the body', note: summary(s2) + ` · root at ${s2.split.root.map((v) => v.toFixed(1)).join(', ')} mm` });
facts.split = { s0: s0.split, s1: s1.split, s2: s2.split, pairs: [s0.pairs.map((q) => q.points), s1.pairs.map((q) => q.points), s2.pairs.map((q) => q.points)], drags: [d1, d2] };

/* ---------- tolerance at both ends ---------- */
const setSlider = async (id, v) => { await page.$eval(id, (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v); await page.waitForTimeout(150); await page.evaluate(() => window.__bug.refitNow()); await settle(); };
await load('swallowtail', 'file'); await viewTop();
facts.tol = {};
for (const v of [0.1, 3]) {
  await setSlider('#imTol', v);
  const s = await state(), counts = await page.evaluate(() => window.__bug.pointCounts());
  const fl = await page.evaluate(() => window.__bug.floor().violations.map((x) => `pair ${x.pair + 1}`));
  facts.tol[v] = { counts, pairs: s.pairs, message: s.message, floor: fl };
  out.tol.push({ img: await shot(), label: `fit tolerance ${v} mm`, note: `control points drawn per pair (the tail's included): ${counts.join(' / ')} · ${summary(s)} · ${fl.length ? `RED — ${fl.join(', ')} narrower than the 1 mm floor (the coarse tail tip): the STL is blocked until it is widened, as for a drawn outline` : 'no floor violation'}` });
}
await setSlider('#imTol', 0.6);

/* ---------- erase: a REAL brush stroke over a stray blob ---------- */
const sd = await load('stray', 'file'); await viewTop();
out.erase.push({ img: await shot(), label: 'a stray blob joined to the forewing tip — fitted into the wing', note: summary(sd) });
await page.click('#imErase');
const er = FIX.stray.img.erase; let ex = 0, ey = 0, en = 0, W = FIX.stray.img.width;
for (let k = 0; k < er.length; k++) if (er[k]) { ex += k % W; ey += (k / W) | 0; en++; }
const c = await page.evaluate(([x, y]) => window.__bug.pictureScreen(x, y), [ex / en, ey / en]);
await page.$eval('#imBrush', (el) => { el.value = 26; el.dispatchEvent(new Event('input', { bubbles: true })); });
await page.mouse.move(c[0] - 30, c[1] - 30); await page.mouse.down();
for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 4; await page.mouse.move(c[0] + 26 * Math.cos(a) * (i / 24), c[1] + 26 * Math.sin(a) * (i / 24)); }
await page.mouse.up(); await page.waitForTimeout(200); await settle();
const se = await state();
await page.click('#imErase');
out.erase.push({ img: await shot(), label: 'after a REAL brush stroke over the blob (red: erased) — refitted', note: summary(se) });
facts.erase = { before: sd.pairs && sd.pairs.map((q) => q.points), after: se.pairs && se.pairs.map((q) => q.points) };

/* ---------- refused ---------- */
const sb = await load('busy', 'file'); await viewTop();
out.refused.push({ img: await shot({ x: 0, y: 0, width: 1280, height: 820 }), label: 'a busy background — REFUSED, the bug left as it was', note: `“${sb.message}”` });
facts.busy = { ok: sb.ok, reason: sb.reason };

console.log(JSON.stringify(facts, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v), 1));

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — image to bug sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1300px;line-height:1.5;margin:0 0 6px}
p.warn{color:#e2a74c}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px}
.grid{display:grid;gap:14px}.c2{grid-template-columns:repeat(2,1fr)}.c3{grid-template-columns:repeat(3,1fr)}.c4{grid-template-columns:repeat(4,1fr)}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:8px}
.cell img{width:100%;display:block;background:#fff}
figcaption{margin-top:6px;line-height:1.5}figcaption span{color:#8A8A85}
.row{display:grid;grid-template-columns:0.8fr 1fr 1fr;gap:14px;margin-bottom:14px}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Image → bug — contact sheet</h1>
<p>Design doc §11. A top-down picture (pasted, dropped or loaded) is segmented, its mirror axis found and turned upright, the two halves averaged, the body read off the narrow column, the wings split into pairs and each outline fitted with the FEWEST control points within a tolerance; a hindwing tail becomes the tagged TAIL group. The result is ordinary editable state, and the picture becomes the reference backdrop at the fitted scale and angle.</p>
<p class="warn">Every picture here is SYNTHETIC — drawn from a known bug (rotated, its left half stretched, noisy, background-coloured spots in the wings). None is a photograph: Eva's reference images are not in the repository. How the import does on real pictures can only be judged by trying them on the deploy preview.</p>
<h2>Fits — the source picture, the fitted bug in Top → SVG over it, and the fitted bug in 3D</h2>
${out.fits.map((f) => `<div class="row"><figure class="cell"><img src="data:image/png;base64,${b64(FIX[f.name].file)}"><figcaption><b>${f.name}</b> — loaded by ${f.how === 'file' ? 'the file input' : f.how === 'paste' ? 'a PASTE event' : 'a DROP'}<br><span>${f.truth}</span></figcaption></figure>
<figure class="cell"><img src="data:image/png;base64,${f.svgImg}"><figcaption><b>Top → SVG, the source behind it</b><br><span>${esc(f.note)}</span></figcaption></figure>
<figure class="cell"><img src="data:image/png;base64,${f.threeImg}"><figcaption><b>the same bug at 3/4</b><br><span>${esc(f.message)}</span></figcaption></figure></div>`).join('')}
<h2>The split line — dragged by its handles, both pairs refit</h2><div class="grid c3">${out.split.map((o) => `<figure class="cell"><img src="data:image/png;base64,${o.img}"><figcaption><b>${o.label}</b><br><span>${esc(o.note)}</span></figcaption></figure>`).join('')}</div>
<h2>Fit tolerance at both ends</h2><div class="grid c2">${out.tol.map((o) => `<figure class="cell"><img src="data:image/png;base64,${o.img}"><figcaption><b>${o.label}</b><br><span>${esc(o.note)}</span></figcaption></figure>`).join('')}</div>
<h2>The erase brush</h2><div class="grid c2">${out.erase.map((o) => `<figure class="cell"><img src="data:image/png;base64,${o.img}"><figcaption><b>${o.label}</b><br><span>${esc(o.note)}</span></figcaption></figure>`).join('')}</div>
<h2>Refused</h2><div class="grid c2">${out.refused.map((o) => `<figure class="cell"><img src="data:image/png;base64,${o.img}"><figcaption><b>${o.label}</b><br><span>${esc(o.note)}</span></figcaption></figure>`).join('')}</div>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-image-sheet.png'), fullPage: true });
// the committed copy is a JPEG: the sheet is mostly page captures and a PNG of it is ~4 MB
await sheet.screenshot({ path: path.join(OUT, 'bug-image-sheet.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')}, bug-image-sheet.png and bug-image-sheet.jpg`);
if (errors.length) process.exit(1);
