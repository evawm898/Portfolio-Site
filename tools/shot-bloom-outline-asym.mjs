#!/usr/bin/env node
/* ===================================================================
   THE ASYMMETRIC OUTLINE SHEET (F6-asym, Oct 18 — Eva's rulings;
   docs/bloom-outline-curve-asym-outcome.md). On one page, each asymmetric
   state BESIDE its symmetric twin (the left half mirrored — what Asym ->
   Sym gives) on ONE camera sized from the asymmetric cell:

     1. a periwinkle-like PINWHEEL — the whole flower, every petal the same
        hand (LEFT is defined once: seen from the petal's upper face, base at
        the bottom);
     2. an orchid LATERAL — a one-sided petal, a wide left half and a 3 mm
        right one, framed on one petal;
     3. a LOPSIDED blade;
     4. a NEAR-SYMMETRIC blade (the right half a hair off the left);
     5. the lateral with the Voronoi INFILL (cells on two half-widths);
     6. a close-up of the BEAD on the NARROW side (the lateral's right margin,
        mid-blade) — each half's bead sized to its own half.

   EVERY BLOOM CELL: print preview ON (read back from the app's own
   shownMode), chrome hidden, auto-rotate off through the asserted
   stillFrame(), whole state read back, the junction (J1-J9), curl (C1-C3)
   and apex-nib / outline (AN0-AN3, OC0-OC4) assertions run before the
   shutter, the STL exported and required watertight. No pixel delta is
   quoted anywhere (this renderer is not deterministic between page sessions
   — CLAUDE.md).

   RUN:  node tools/shot-bloom-outline-asym.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, apexNibAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-outline-asym';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-outline-asym-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'string' ? value : JSON.stringify(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a); return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : a; };

const VIEWS = {
  top: (f) => ({ r: f.fit * 0.95, at: [0, 0, 0], dir: [0, -0.18, 0.98] }),
  /* one petal, looking down onto its upper face from a little above and in
     front, so its LEFT half is on the viewer's left with the base at the
     bottom of the frame (the definition of left) */
  petal: (f) => ({ r: f.petalR, at: f.petalAt, dir: f.petalDir }),
  /* the narrow half's bead, mid-blade, from outside the margin and above */
  bead: (f) => ({ r: f.beadR, at: f.beadAt, dir: f.beadDir }),
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
    const f = VIEWS[view](frame); f.r *= scale;
    await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
    await page.waitForTimeout(260);
    await page.screenshot({ path: file, clip: { x: 300, y: 0, width: 800, height: 800 } });
    const { width, height, data } = decodePNG(fs.readFileSync(file));
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.98) return { file: path.basename(file), scale };
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}
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

/* the representative petal's frame, off the builder's own emitted margins
   (OC4's record): the blade's middle, its upper-face normal and its run */
function petalFrame(m) {
  const MS = (m.petalRingMarginSides || [])[0];
  if (!Array.isArray(MS) || MS.length < 4) return null;
  const mid = MS[Math.floor(MS.length * 0.5)], base = MS[0], tip = MS[MS.length - 1];
  const D = norm(sub(tip.C, base.C));
  const Lm = Math.hypot(...sub(tip.C, base.C));
  /* looking down onto the upper face (along -N), tilted toward the base so the
     base sits at the bottom of the frame */
  const dir = norm(add(mid.N, D, -0.35));
  const at = mid.C;
  /* the narrow (right) half's bead, at 0.6 of the blade */
  const b = MS[Math.floor(MS.length * 0.6)];
  const out = norm(sub(b.R, b.C));
  return { petalAt: at, petalDir: dir, petalR: Lm * 0.72, beadAt: b.R, beadDir: norm(add(add(out, b.N, 0.9), D, -0.2)), beadR: 2.2 };
}

async function cell({ label, set: sets = [], views = ['top'], ruling = '', frame = null, editor = false }) {
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
  const own = { fit: m.fitRadius, ...(petalFrame(m) || {}) };
  /* a twin borrows the asymmetric cell's camera, so the two read on one frame */
  const fr = frame ? { ...frame } : own;
  if ((views.includes('petal') || views.includes('bead')) && !fr.petalAt) await die(`${label}: a petal close-up asked of a petal with no margin record`);
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n');
  const rec = { label, tag: modeTag(m), ruling, shots, widened, own, sha: sha(buf), bytes: buf.length, tris: stl.tris, boundary: stl.boundary, shownTris: m.shownTris,
    outlineLine: lines.find((l) => /^OUTLINE CURVE/.test(l)) || '', infillLine: lines.find((l) => /^INFILL/.test(l)) || '',
    ctl: await page.evaluate(() => document.querySelector('.bl-ctrl:has(#petalOutlineCurve) .bl-val')?.textContent || '') };
  if (editor) {
    await page.evaluate(() => { document.body.classList.remove('bl-preview'); });
    rec.editor = await shootEditor(path.join(outDir, `${slug(label)}-editor.png`));
  }
  await setPreview(false);
  console.log(`  ${label.padEnd(70)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.outlineLine) console.log(`  ${''.padEnd(70)} ${rec.outlineLine}`);
  return rec;
}

console.log('THE ASYMMETRIC OUTLINE SHEET — every bloom cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, J1-J9, C1-C3, AN0-AN3 and OC0-OC4 asserted before the shutter.\n');
const DEF = [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]];
const SHAPES = {
  pinwheel: { points: [[0, 0.05], [0.3, 0.15], [0.6, 0.26], [0.85, 0.24], [1, 0]], right: [[0, 0.05], [0.3, 0.08], [0.6, 0.12], [0.85, 0.1], [1, 0]] },
  lateral: { points: [[0, 0.05], [0.2, 0.2], [0.5, 0.3], [0.8, 0.2], [1, 0]], right: [[0, 0.04], [0.3, 0.06], [0.7, 0.05], [1, 0]] },
  lopsided: { points: DEF, right: [[0, 0.05], [0.2, 0.09], [0.5, 0.12], [0.8, 0.08], [1, 0]] },
  near: { points: DEF, right: [[0, 0.05], [0.15, 0.15], [0.36, 0.22], [0.7, 0.18], [0.9, 0.1], [1, 0]] },
};
const ASYM = (k) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: { mode: 'two-sided', ...SHAPES[k] } });
const TWIN = (k) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: { mode: 'symmetric', points: SHAPES[k].points } });

const pinA = await cell({ label: 'ASYM: a periwinkle-like PINWHEEL x 5 petals', set: set({ ...ASYM('pinwheel'), petalCount: 5 }), views: ['top'], ruling: 'every petal the same hand — the wide half leads round the flower' });
const pinS = await cell({ label: 'SYM twin: the pinwheel\'s left half mirrored', set: set({ ...TWIN('pinwheel'), petalCount: 5 }), frame: pinA.own, views: ['top'], ruling: 'the symmetric petal Asym -> Sym gives' });
const latA = await cell({ label: 'ASYM: an orchid LATERAL (a wide left half, a 3 mm right half)', set: set(ASYM('lateral')), views: ['top', 'petal', 'bead'], editor: true, ruling: 'a one-sided petal; seen from the upper face, base at the bottom, the wide half on the LEFT' });
const latS = await cell({ label: 'SYM twin: the lateral\'s left half mirrored', set: set(TWIN('lateral')), frame: latA.own, views: ['top', 'petal'], ruling: 'the symmetric twin' });
const lopA = await cell({ label: 'ASYM: a LOPSIDED blade (the right half narrower)', set: set(ASYM('lopsided')), views: ['top', 'petal'], ruling: 'the default curve on the left, a narrower right half' });
const lopS = await cell({ label: 'SYM twin: the default curve', set: set(TWIN('lopsided')), frame: lopA.own, views: ['top', 'petal'], ruling: 'the symmetric twin (the default curve)' });
const nearA = await cell({ label: 'ASYM: NEAR-SYMMETRIC (the right half a hair off the left)', set: set(ASYM('near')), views: ['petal'], ruling: 'a right half 2-6% off the left' });
const nearS = await cell({ label: 'SYM twin: the default curve (near-symmetric\'s left)', set: set(TWIN('near')), frame: nearA.own, views: ['petal'], ruling: 'the symmetric twin' });
const infA = await cell({ label: 'ASYM: the lateral x the Voronoi infill', set: set({ ...ASYM('lateral'), petalInfill: 'VORONOI' }), views: ['top', 'petal'], ruling: 'cells planned in millimetres across the midrib on two half-widths; every hole and both margins beaded' });
const infS = await cell({ label: 'SYM twin: the lateral\'s left half mirrored x the infill', set: set({ ...TWIN('lateral'), petalInfill: 'VORONOI' }), frame: infA.own, views: ['top', 'petal'], ruling: 'the symmetric twin with the same infill' });
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})<br><small>${esc(c.outlineLine)}</small>${c.infillLine ? `<br><small>${esc(c.infillLine)}</small>` : ''}`;
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)}</small><br>${num(c)}</figcaption></figure>`;
const edfig = (c) => `<figure><img src="${c.editor}"><figcaption><b>${esc(c.label)}</b> — the editor in Asymmetric mode (upper curve = LEFT)<br><small>${esc(c.ctl)}</small></figcaption></figure>`;
const html = `<title>Asymmetric outline</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The asymmetric petal outline — F6-asym</h1>
<p class="note"><b>Every bloom cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; J1-J9, C1-C3, AN0-AN3 and OC0-OC4 ran before every shutter; the STL sha is that cell's own export. Eva's rulings: CURVE mode has a Symmetric / Asymmetric toggle; Asymmetric is two independent half-curves about the unchanged midrib; LEFT is seen from the petal's upper face with its base at the bottom; every petal of a whorl has the same hand. Each asymmetric cell sits beside its symmetric twin (its left half mirrored) on ONE camera, sized from the asymmetric cell. No pixel delta is quoted.</p>
<h2>1. A periwinkle-like pinwheel — the whole flower</h2>
<main class="two">${fig(pinA, 'top', 'from above')}${fig(pinS, 'top', 'from above')}</main>
<h2>2. An orchid lateral — one-sided</h2>
<main>${fig(latA, 'petal', 'one petal, its upper face')}${fig(latS, 'petal', 'one petal, its upper face')}${edfig(latA)}</main>
<main class="two">${fig(latA, 'top', 'from above')}${fig(latS, 'top', 'from above')}</main>
<h2>3. A lopsided blade</h2>
<main class="two">${fig(lopA, 'petal', 'one petal')}${fig(lopS, 'petal', 'one petal')}</main>
<main class="two">${fig(lopA, 'top', 'from above')}${fig(lopS, 'top', 'from above')}</main>
<h2>4. Near-symmetric</h2>
<main class="two">${fig(nearA, 'petal', 'one petal')}${fig(nearS, 'petal', 'one petal')}</main>
<h2>5. The infill on two half-widths</h2>
<main class="two">${fig(infA, 'petal', 'one petal')}${fig(infS, 'petal', 'one petal')}</main>
<main class="two">${fig(infA, 'top', 'from above')}${fig(infS, 'top', 'from above')}</main>
<h2>6. The bead on the narrow side, close up</h2>
<main class="two">${fig(latA, 'bead', 'the 3 mm right half\'s margin at 0.6 of the blade')}</main>`;
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
