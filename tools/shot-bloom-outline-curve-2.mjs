#!/usr/bin/env node
/* ===================================================================
   THE OUTLINE CURVE FOLLOW-UPS SHEET (F6-sym-2, Oct 17 — Eva's two rulings;
   docs/bloom-outline-curve-2-outcome.md). On one page: ONE curve at three
   Petal widths (the width scales the drawn widths, the positions stay); a BELL
   and a TRUMPET, each with a drawn lobe BESIDE its LAW twin (the curve shapes
   the free lobe above the throat, the tube keeps its own law below); and a
   close-up of the THROAT SEAM, where the lobe's pinned first width meets the
   tube.

   EVERY BLOOM CELL: print preview ON (read back from the app's own
   shownMode), chrome hidden, auto-rotate off through the asserted
   stillFrame(), whole state read back, the junction (J1-J9), curl (C1-C3)
   and apex-nib / outline (AN0-AN3, OC0-OC2) assertions run before the
   shutter, the STL exported and required watertight. No pixel delta is
   quoted anywhere (this renderer is not deterministic between page sessions
   — CLAUDE.md).

   RUN:  node tools/shot-bloom-outline-curve-2.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, apexNibAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-outline-curve-2';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-outline-curve-2-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'string' ? value : JSON.stringify(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

const VIEWS = {
  top: (f) => ({ r: f.fit * 0.95, at: [0, 0, 0], dir: [0, -0.18, 0.98] }),
  profile: (f) => ({ r: f.fit * 1.05, at: [0, 0, f.L * 0.25], dir: [0.1, -0.94, 0.34] }),
  /* the throat of petal 0, from the tube's own report (the ring's top row at
     that petal's midrib), seen from outside and a little above */
  throat: (f) => ({ r: f.fit * 0.32, at: f.throat, dir: [Math.cos(f.az) * 0.8, Math.sin(f.az) * 0.8, 0.6] }),
};
async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}
async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (VIEWS[view]) { const f = VIEWS[view](frame); f.r *= scale; await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
    else await page.evaluate((rr) => window.__bloomFrame(rr, 0.15), frame.fit);
    await page.waitForTimeout(260);
    await page.screenshot({ path: file, clip: { x: 300, y: 0, width: 800, height: 800 } });
    const { width, height, data } = decodePNG(fs.readFileSync(file));
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.98) return { file: path.basename(file), scale };
    if (frac < 0.02 || !VIEWS[view]) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}
/* the live editor, as the panel shows it: open the curl section and crop the control */
async function shootEditor(file) {
  const ok = await page.evaluate(() => {
    const host = document.getElementById('petalOutlineCurve');
    if (!host) return 'no #petalOutlineCurve on the page';
    for (let d = host.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    host.scrollIntoView({ block: 'center' });
    return null;
  });
  if (ok) await die(ok);
  await page.waitForTimeout(150);
  const wrap = await page.evaluate(() => { const r = document.getElementById('petalOutlineCurve').closest('.bl-ctrl').getBoundingClientRect(); return { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.width + 12, height: r.height + 12 }; });
  await page.screenshot({ path: file, clip: wrap });
  return path.basename(file);
}

async function cell({ label, set: sets = [], views = ['top', 'profile'], ruling = '', frame = null, editor = false }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const crl = await curlAssertions(page, { label, set: sets });
  if (crl.length) await die(`${label}: curl: ${crl.join('; ')}`);
  const nib = await apexNibAssertions(page, { label, set: sets });
  if (nib.length) await die(`${label}: apex nib / outline: ${nib.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const own = { fit: m.fitRadius, L: Number((await page.evaluate(() => window.__bloomUIState())).petalLength) };
  const ring0 = m.tube && m.tube.rings && m.tube.rings[0];
  const fr = { ...(frame || own) };
  if (ring0) { fr.throat = ring0.topMid0; fr.az = Math.atan2(ring0.topMid0[1], ring0.topMid0[0]); }
  if (views.includes('throat') && !ring0) await die(`${label}: a throat close-up asked of a bloom with no fused ring`);
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n');
  const rec = { label, tag: modeTag(m), ruling, shots, widened, own, sha: sha(buf), bytes: buf.length, tris: stl.tris, boundary: stl.boundary, shownTris: m.shownTris,
    spineLine: lines.find((l) => /^OUTLINE CURVE/.test(l)) || lines.find((l) => /^APEX NIB/.test(l)) || '', tubeLine: lines.find((l) => /^TUBE/.test(l)) || '', infillLine: lines.find((l) => /^INFILL/.test(l)) || '', ctl: await page.evaluate(() => document.querySelector('.bl-ctrl:has(#petalOutlineCurve) .bl-val')?.textContent || '') };
  if (editor) {
    await page.evaluate(() => { document.body.classList.remove('bl-preview'); });
    rec.editor = await shootEditor(path.join(outDir, `${slug(label)}-editor.png`));
  }
  await setPreview(false);
  console.log(`  ${label.padEnd(70)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.spineLine) console.log(`  ${''.padEnd(70)} ${rec.spineLine}`);
  return rec;
}

console.log('THE OUTLINE CURVE FOLLOW-UPS SHEET — every bloom cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, J1-J9, C1-C3, AN0-AN3 and OC0-OC3 asserted before the shutter.\n');
const DEF = { mode: 'symmetric', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]] };
const LOBE = { mode: 'symmetric', points: [[0, 0.1], [0.35, 0.22], [0.75, 0.16], [1, 0]] };
const CV = (c) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: c });
const BELL = { petalCount: 5, tubeLayer1: 0, tubeHeight: 0.4, petalTilt: 75, petalCup: 0.6 };
const TRUMPET = { petalCount: 5, tubeLayer1: 0, tubeHeight: 0.58, petalTilt: 85, petalLength: 50, petalSpineCurl: -45 };
/* 1. one curve, three widths, one camera (sized from the widest) */
const w24 = await cell({ label: 'CURVE: the default curve at Petal width 24 (x1.5)', set: set({ ...CV(DEF), petalWidth: 24 }), views: ['top'], ruling: 'the widths x1.5, the lengthwise positions unmoved' });
const w16 = await cell({ label: 'CURVE: the default curve at Petal width 16 (x1, #417 to the bit)', set: set(CV(DEF)), frame: w24.own, views: ['top'], ruling: 'the default width — the outline #417 shipped' });
const w8 = await cell({ label: 'CURVE: the default curve at Petal width 8 (x0.5)', set: set({ ...CV(DEF), petalWidth: 8 }), frame: w24.own, views: ['top'], ruling: 'the widths x0.5' });
/* 2-3. the bell and the trumpet, each beside its LAW twin, on the LAW twin's camera */
const bellL = await cell({ label: 'LAW: the bell (5 petals, tilt 75, cup 0.6, a tube to 0.40)', set: set(BELL), ruling: 'the LAW twin' });
const bellC = await cell({ label: 'CURVE: the bell with a drawn lobe', set: set({ ...BELL, ...CV(LOBE) }), frame: bellL.own, editor: true, views: ['top', 'profile', 'throat'], ruling: 'the curve on the free lobe above the throat; the tube\'s own law below it' });
const trL = await cell({ label: 'LAW: the trumpet (5 petals, tilt 85, length 50, curl -45, a tube to 0.58)', set: set(TRUMPET), ruling: 'the LAW twin' });
const trC = await cell({ label: 'CURVE: the trumpet with a drawn lobe', set: set({ ...TRUMPET, ...CV(LOBE) }), frame: trL.own, views: ['top', 'profile', 'throat'], ruling: 'the curve on the lobe above a long tube' });
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})<br><small>${esc(c.spineLine)}</small>${c.tubeLine ? `<br><small>${esc(c.tubeLine)}</small>` : ''}`;
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)}</small><br>${num(c)}</figcaption></figure>`;
const edfig = (c) => `<figure><img src="${c.editor}"><figcaption><b>${esc(c.label)}</b> — the editor<br><small>${esc(c.ctl)}</small></figcaption></figure>`;
const html = `<title>Outline curve follow-ups</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The outline curve's follow-ups — F6-sym-2</h1>
<p class="note"><b>Every bloom cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; J1-J9, C1-C3, AN0-AN3 and OC0-OC3 ran before every shutter; the STL sha is that cell's own export. Eva's rulings: in CURVE mode Petal width SCALES the drawn curve's widths against its 16 mm default (positions untouched), and CURVE works on a tubular flower — the curve shapes the free lobe above the throat, its first width pinned to the tube's own law there, and the tube keeps that law below. No pixel delta is quoted.</p>
<h2>1. One curve at three Petal widths — one camera</h2>
<main>${fig(w8, 'top', 'from above')}${fig(w16, 'top', 'from above')}${fig(w24, 'top', 'from above')}</main>
<h2>2. The bell — LAW twin beside a drawn lobe</h2>
<main>${fig(bellL, 'top', 'from above')}${fig(bellC, 'top', 'from above')}${edfig(bellC)}</main>
<main class="two">${fig(bellL, 'profile', 'profile')}${fig(bellC, 'profile', 'profile')}</main>
<h2>3. The trumpet — LAW twin beside a drawn lobe</h2>
<main class="two">${fig(trL, 'top', 'from above')}${fig(trC, 'top', 'from above')}</main>
<main class="two">${fig(trL, 'profile', 'profile')}${fig(trC, 'profile', 'profile')}</main>
<h2>4. The throat seam, close up — where the lobe's pinned first width meets the tube</h2>
<main class="two">${fig(bellC, 'throat', 'the throat of petal 1')}${fig(trC, 'throat', 'the throat of petal 1')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); server.close();
