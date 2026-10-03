#!/usr/bin/env node
/* shot-bug-image-fixes.mjs <dir> --base <worktree> — the contact sheet for the
   second round of IMAGE -> BUG (design doc §11.7), after Eva's Morpho photo:

     same tone   a picture whose body is the same tone as the wing roots (no
                 narrow column shows), BEFORE (the previous commit, rendered from
                 a git worktree of it and served by its own HTTP server) and
                 AFTER (this tree): the body measured as a sliver and the wings
                 laid over it as one plate, against the body estimated from the
                 wingspan and the wings clipped at its edge
     clutter     a rotated picture on paper with a paper edge and a dark table
                 beyond it, a "1 cm" scale bar and a typed label — BEFORE and
                 AFTER — and the whole sheet in view on the table
     refusal     a one-sided shape (the left forewing missing): the message names
                 the step, and "show what was found" switches itself on (it is
                 switched OFF before the picture is loaded, to show that)
     wingspan    the slider at its minimum: the fit is 20 mm across, and the
                 readout and the SVG note say what each number is

   Every picture is SYNTHETIC (tools/verify-bug-image-fixtures.mjs); none is a
   photograph. No pixel claim anywhere: every number is read off the page. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';
import { IMAGE_FIXTURES, encodePNG } from './verify-bug-image-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--base') || 'bug-image-fixes');
const BASE = args.includes('--base') ? path.resolve(args[args.indexOf('--base') + 1]) : null;
if (!BASE || !fs.existsSync(path.join(BASE, 'bug-image.js'))) { console.error('usage: shot-bug-image-fixes.mjs <dir> --base <worktree of the previous commit>'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const serve = async (root) => {
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
};
const NOW = await serve(ROOT), OLD = await serve(BASE);
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function openPage(srv, tag, dsf = 1) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: dsf });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`); });
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
  });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`${srv.url}/bug.html`);
  await page.waitForFunction(() => !!window.__bug);
  await page.waitForTimeout(300);
  return page;
}

// the pictures, as PNG files
const FIX = {};
const put = (name, img) => { FIX[name] = { file: path.join(OUT, `fixture-${name}.png`), img }; fs.writeFileSync(FIX[name].file, encodePNG(img)); };
for (const name of ['sametone', 'clutter', 'sheet', 'butterfly']) put(name, IMAGE_FIXTURES[name]());
{ // one-sided: the butterfly with its LEFT forewing painted over with the paper
  const img = IMAGE_FIXTURES.butterfly(), t = img.truth, W = img.width, H = img.height;
  const paper = [img.data[0], img.data[1], img.data[2]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const w = t.fromPx([x + 0.5, y + 0.5]); if (w[0] < -3 && w[1] > -1) { const i = 4 * (y * W + x); img.data[i] = paper[0]; img.data[i + 1] = paper[1]; img.data[i + 2] = paper[2]; } }
  put('onesided', img);
}
const b64 = (f) => fs.readFileSync(f).toString('base64');
const STAGE = { x: 0, y: 0, width: 960, height: 820 };
const shot = async (page, clip = STAGE) => (await page.screenshot({ type: 'png', clip })).toString('base64');
const settle = async (page) => { await page.evaluate(() => window.__bug.flushBuild()); await page.waitForTimeout(200); };
async function load(page, name) {
  const before = await page.evaluate(() => (window.__bug.importState() || {}).message || '');
  await page.setInputFiles('#imFile', FIX[name].file);
  await page.waitForFunction((b) => { const s = window.__bug.importState(); return s && s.message && s.message !== b; }, before, { timeout: 30000 });
  await settle(page);
  return page.evaluate(() => window.__bug.importState());
}
const viewTop = async (page) => { await page.click('#viewButtons button[data-view="top"]'); if ((await page.evaluate(() => window.__bug.mainMode())) !== 'svg') await page.click('#viewToggle button[data-main="svg"]'); await settle(page); };
const view34 = async (page) => { await page.click('#viewButtons button[data-view="three"]'); await page.waitForTimeout(300); };
const bodyOf = (p) => `abdomen ${p.abdomenWidth} mm wide · thorax ${p.thoraxWidth} · head ${p.headSize}`;
const cells = { same: [], clutter: [], refusal: [], span: [] };
const facts = {};

/* ---------- same tone: BEFORE and AFTER ---------- */
for (const [tag, srv] of [['BEFORE (the previous commit)', OLD], ['AFTER (this tree)', NOW]]) {
  const page = await openPage(srv, tag, 2);
  const s = await load(page, 'sametone'); await viewTop(page);
  const p = await page.evaluate(() => window.__bug.getParams());
  const m = G.buildBug(p);
  const svgImg = await shot(page);
  // the BODY, close: a crop centred on where the page itself puts the thorax
  // (the picture's own world origin, through the fit's transform)
  const o = await page.evaluate(([x, y]) => window.__bug.pictureScreen(x, y), FIX.sametone.img.truth.origin);
  const zoomImg = await shot(page, { x: o[0] - 150, y: o[1] - 170, width: 300, height: 340 });
  await view34(page); const threeImg = await shot(page);
  const src = s.body ? s.body.source : '(no body confidence in this version)';
  facts[`sametone ${tag}`] = { ok: s.ok, body: src, abdomen: p.abdomenWidth, thorax: p.thoraxWidth, head: p.headSize, floor: m.floorViolations.length, mirror: G.mirrorDiff(m) };
  cells.same.push({ tag, svgImg, threeImg, zoomImg, note: `${s.ok ? 'fitted' : 'REFUSED'} · body ${src} · ${bodyOf(p)} · mirror diff ${G.mirrorDiff(m)} · floor violations ${m.floorViolations.length}`, message: s.message });
  await page.close();
}

/* ---------- clutter: BEFORE and AFTER, then the whole sheet ---------- */
for (const name of ['clutter', 'sheet']) {
  for (const [tag, srv] of name === 'clutter' ? [['BEFORE (the previous commit)', OLD], ['AFTER (this tree)', NOW]] : [['AFTER (this tree)', NOW]]) {
    const page = await openPage(srv, tag);
    const s = await load(page, name); await viewTop(page);
    const p = await page.evaluate(() => window.__bug.getParams());
    const m = s.ok ? G.buildBug(p) : null;
    const img = await shot(page, { x: 0, y: 0, width: 1280, height: 820 });
    facts[`${name} ${tag}`] = { ok: s.ok, step: s.step ?? null, mode: s.mode, clutterDrawn: s.clutterDrawn ?? null, message: s.message };
    cells.clutter.push({ name, tag, img, note: s.ok ? `fitted · ${s.mode} · body ${s.body ? s.body.source : '—'} · mirror diff ${G.mirrorDiff(m)} · floor violations ${m.floorViolations.length}` : 'REFUSED', message: s.message });
    await page.close();
  }
}

/* ---------- refusal names its step; "show what was found" turns itself on ---------- */
{
  const page = await openPage(NOW, 'refusal');
  await page.evaluate(() => { const c = document.getElementById('imSeg'); c.checked = false; c.dispatchEvent(new Event('change')); });
  const offBefore = await page.evaluate(() => document.getElementById('imSeg').checked);
  const s = await load(page, 'onesided'); await viewTop(page);
  facts.refusal = { segBefore: offBefore, segAfter: s.segShown, step: s.step, ok: s.ok, message: s.message };
  cells.refusal.push({ img: await shot(page, { x: 0, y: 0, width: 1280, height: 820 }), note: `"show what was found" was ${offBefore ? 'ON' : 'OFF'} before loading, ${s.segShown ? 'ON' : 'OFF'} after the refusal · step ${s.step}`, message: s.message });
  await page.close();
}

/* ---------- the wingspan slider at its ends ---------- */
{
  const page = await openPage(NOW, 'span');
  await load(page, 'butterfly'); await viewTop(page);
  for (const v of [20, 130]) {
    await page.$eval('#imSpan', (el, x) => { el.value = x; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await page.waitForTimeout(150); await page.evaluate(() => window.__bug.refitNow()); await settle(page);
    const s = await page.evaluate(() => window.__bug.importState());
    facts[`span ${v}`] = { slider: s.spanSlider, out: s.spanOut, bug: +s.bugSpan.toFixed(2), svgNote: s.svgNote.slice(0, 120) };
    cells.span.push({ img: await shot(page, { x: 0, y: 0, width: 1280, height: 820 }), label: `wingspan slider at ${v} mm`, note: `the fitted bug is ${s.bugSpan.toFixed(2)} mm tip to tip · readout "${s.spanOut}" · ${s.svgNote.split(' — ')[0]}` });
  }
  await page.close();
}

console.log(JSON.stringify(facts, (k, v) => (typeof v === 'number' ? +v.toFixed(3) : v), 1));
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (img, title, sub) => `<figure class="cell"><img src="data:image/png;base64,${img}"><figcaption><b>${esc(title)}</b><br><span>${esc(sub)}</span></figcaption></figure>`;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — image to bug, round 2</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1400px;line-height:1.5;margin:0 0 6px} p.warn{color:#e2a74c}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px}
.grid{display:grid;gap:14px}.c2{grid-template-columns:repeat(2,1fr)}.c3{grid-template-columns:repeat(3,1fr)}.c5{grid-template-columns:0.7fr 1fr 1fr 1fr 1fr}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:8px}.cell img{width:100%;display:block;background:#fff}
figcaption{margin-top:6px;line-height:1.5}figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>Image → bug — round 2: the body, clutter, the wingspan</h1>
<p>Eva's Morpho photo (PR #346): the body was swallowed under the wings, one attempt was refused at 41% symmetry, and the wingspan slider read 20 mm while the SVG read 76. Design doc §11.7.</p>
<p class="warn">Every picture here is SYNTHETIC — drawn from a known bug. None is a photograph, and the Morpho itself is not in the repository: the same-tone picture is the best reproduction of what it does to the import, and only trying the Morpho again on the deploy preview says whether it is fixed.</p>
<h2>Same tone — the body touches the wing roots, no narrow column shows</h2>
<div class="grid c3">${fig(b64(FIX.sametone.file), 'the picture', 'the default bug with the gap between its body and each wing\'s inner edge inked over from the thorax back — only the abdomen\'s tip shows below the wings')}
${cells.same.map((c) => fig(c.zoomImg, `${c.tag} — the body, close (Top → SVG, the picture behind)`, c.note)).join('')}</div>
<div class="grid c2" style="margin-top:14px">${cells.same.map((c) => fig(c.svgImg, `${c.tag} — Top → SVG`, c.note)).join('')}</div>
<div class="grid c2" style="margin-top:14px">${cells.same.map((c) => fig(c.threeImg, `${c.tag} — 3/4`, c.message)).join('')}</div>
<h2>Clutter — a paper edge, a dark table, a 1 cm scale bar, a label</h2>
<div class="grid c3">${fig(b64(FIX.clutter.file), 'the picture (rotated 9°)', 'the table beyond the paper\'s corner is a LARGER shape than the bug')}${cells.clutter.filter((c) => c.name === 'clutter').map((c) => fig(c.img, c.tag, `${c.note} — ${c.message}`)).join('')}</div>
<div class="grid c2" style="margin-top:14px">${fig(b64(FIX.sheet.file), 'the whole sheet in view on the table (rotated −7°)', 'in the light-on-dark reading the sheet is the subject, with the bug as a hole in it — a frame')}${cells.clutter.filter((c) => c.name === 'sheet').map((c) => fig(c.img, c.tag, `${c.note} — ${c.message}`)).join('')}</div>
<h2>A refusal names its step, and shows what was found</h2>
<div class="grid c2">${fig(b64(FIX.onesided.file), 'the picture', 'the butterfly with its left forewing missing — no mirror axis can fit it')}${cells.refusal.map((c) => fig(c.img, 'refused', `${c.note} — ${c.message}`)).join('')}</div>
<h2>The wingspan slider</h2>
<div class="grid c2">${cells.span.map((c) => fig(c.img, c.label, c.note)).join('')}</div>
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-image-fixes.jpg'), fullPage: true, type: 'jpeg', quality: 80 });
await browser.close();
NOW.server.close(); OLD.server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-image-fixes.jpg`);
if (errors.length) process.exit(1);
