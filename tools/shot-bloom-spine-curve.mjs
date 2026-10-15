#!/usr/bin/env node
/* ===================================================================
   THE SPINE CURVE SHEET (F3-global, Oct 15 — Eva's rulings Q4.1 / Q4.2 /
   Q4.4; docs/bloom-spine-curve-outcome.md). What the session leaves to
   Eva's eye, on one page:

   (1) THE NEAREST SLIDER SHAPE — spine curl 150, bias 0, start 0 (the hoop
       the slider family draws) — beside an S-CURVE and a HOOKED TIP drawn
       in CURVE mode, every bloom cell PRINT PREVIEW ON on one camera, whole
       and in profile.
   (2) THE EDITOR BESIDE EACH CURVE — the live `petalSpineCurve` control as
       the panel shows it (the curl section opened), so the drawn points and
       the built spine are on one page.
   (3) A REFUSED DRAG AT THE LIMIT — the curve at the printable limit, a
       handle dragged toward a tighter bend with the pointer STILL DOWN: the
       point where it last was, ringed, the validator's reason under the
       editor, and the value after release REQUIRED identical to before.

   EVERY BLOOM CELL: print preview ON (read back from the app's own
   shownMode), chrome hidden, auto-rotate off through the asserted
   stillFrame(), whole state read back, the junction (J1-J9) and curl (C1-C3)
   assertions run before the shutter, the STL exported and required
   watertight. No pixel delta is quoted anywhere (this renderer is not
   deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-spine-curve.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-spine-curve';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-spine-curve-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'string' ? value : JSON.stringify(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

const CURVES = {
  s: { mode: 'single', points: [[0, 0], [0.3, 0.12], [0.6, -0.1], [1, 0.15]] },
  hook: { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.75, 0.45], [0.5, 0.6], [0.3, 0.45]] },
  limit: { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.72, 0.42], [0.55, 0.55], [0.42, 0.45]] },
};

const VIEWS = {
  whole: null,
  profile: (f) => ({ r: f.fit * 1.05, at: [0, 0, f.L * 0.35], dir: [0.1, -0.94, 0.34] }),
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
    const host = document.getElementById('petalSpineCurve');
    if (!host) return 'no #petalSpineCurve on the page';
    for (let d = host.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    host.scrollIntoView({ block: 'center' });
    return null;
  });
  if (ok) await die(ok);
  await page.waitForTimeout(150);
  const wrap = await page.evaluate(() => { const r = document.getElementById('petalSpineCurve').closest('.bl-ctrl').getBoundingClientRect(); return { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: r.width + 12, height: r.height + 12 }; });
  await page.screenshot({ path: file, clip: wrap });
  return path.basename(file);
}

async function cell({ label, set: sets = [], views = ['whole', 'profile'], ruling = '', frame = null, editor = false }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const crl = await curlAssertions(page, { label, set: sets });
  if (crl.length) await die(`${label}: curl: ${crl.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const own = { fit: m.fitRadius, L: Number((await page.evaluate(() => window.__bloomUIState())).petalLength) };
  const fr = frame || own;
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n');
  const rec = { label, tag: modeTag(m), ruling, shots, widened, own, sha: sha(buf), bytes: buf.length, tris: stl.tris, boundary: stl.boundary, shownTris: m.shownTris,
    spineLine: lines.find((l) => /^SPINE (CURL|CURVE)/.test(l)) || '', ctl: await page.evaluate(() => document.querySelector('.bl-ctrl:has(#petalSpineCurve) .bl-val')?.textContent || '') };
  if (editor) {
    await page.evaluate(() => { document.body.classList.remove('bl-preview'); });
    rec.editor = await shootEditor(path.join(outDir, `${slug(label)}-editor.png`));
  }
  await setPreview(false);
  console.log(`  ${label.padEnd(70)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.spineLine) console.log(`  ${''.padEnd(70)} ${rec.spineLine}`);
  return rec;
}

console.log('THE SPINE CURVE SHEET — every bloom cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, J1-J9 and C1-C3 asserted before the shutter.\n');
const slider = await cell({ label: 'the nearest SLIDER shape — spine curl 150 (bias 0, start 0: the hoop)', set: set({ petalSpineCurl: 150 }), ruling: 'the slider family: one turn, uniformly' });
const sCurve = await cell({ label: 'CURVE: an S-curve', set: set({ petalCurlMode: 'CURVE', petalSpineCurve: CURVES.s }), frame: slider.own, editor: true, ruling: 'the spine bends one way, then the other — a shape no slider reaches' });
const hook = await cell({ label: 'CURVE: a hooked tip', set: set({ petalCurlMode: 'CURVE', petalSpineCurve: CURVES.hook }), frame: slider.own, editor: true, ruling: 'the spine doubles back: the drawn curve is not a function of x' });
const limit = await cell({ label: 'CURVE: at the printable limit (tightest radius a hair over one sheet thickness)', set: set({ petalCurlMode: 'CURVE', petalSpineCurve: CURVES.limit }), frame: slider.own, editor: true, ruling: 'accepted by the validator, not clamped by the build' });

/* THE REFUSED DRAG, caught with the pointer still down on the live control */
{
  await openBloom(page, port);
  const sets = set({ petalCurlMode: 'CURVE', petalSpineCurve: CURVES.limit });
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`refused drag: ${bad.join('; ')}`);
  await page.evaluate(() => { for (let d = document.getElementById('petalSpineCurve').closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; document.getElementById('petalSpineCurve').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(150);
  const ed = () => page.evaluate(() => { const h = document.getElementById('petalSpineCurve'); return { value: h.value, refusal: h.curveEditor.refusal(), status: (h.closest('.bl-ctrl').querySelector('.bl-curve-status') || {}).textContent || '' }; });
  const before = JSON.stringify((await ed()).value);
  /* point 3 (the bend's far corner) dragged BACK toward point 4 — a tighter
     bend than one sheet thickness (the law in Node reads 0.65 mm there against
     the limit curve's own 1.34; the first target, [0.62, 0.5], LOOSENED the
     bend to 1.71 mm and the validator was right to accept it) */
  const from = await page.evaluate(() => document.getElementById('petalSpineCurve').curveEditor.pointClient('left', 3));
  const to = await page.evaluate(() => document.getElementById('petalSpineCurve').curveEditor.fracClient('left', [0.45, 0.52]));
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 2 });
  await page.waitForTimeout(150);
  const mid = await ed();
  const editorShot = await shootEditor(path.join(outDir, 'refused-drag-editor.png'));
  await page.mouse.up();
  await settleBuild(page);
  const after = await ed();
  const held = JSON.stringify(after.value) === before;
  if (!mid.refusal) await die(`the drag at the limit was not refused (refusal ${JSON.stringify(mid.refusal)}) — the sheet cannot show a refusal that did not happen`);
  if (!held) await die(`the refused drag moved the value: ${before} -> ${JSON.stringify(after.value)}`);
  limit.refused = { editor: editorShot, reason: mid.refusal.reason, status: mid.status, held };
  console.log(`  refused drag: ${mid.refusal.reason}\n  value after release ${held ? 'IDENTICAL' : 'MOVED'}`);
}
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})<br>${esc(c.spineLine)}`;
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)}</small><br>${num(c)}</figcaption></figure>`;
const edfig = (c) => `<figure><img src="${c.editor}"><figcaption><b>${esc(c.label)}</b> — the editor<br><small>${esc(c.ctl)}</small></figcaption></figure>`;
const html = `<title>Spine curve</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The spine curve — F3-global</h1>
<p class="note"><b>Every bloom cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; J1-J9 and C1-C3 ran before every shutter; the STL sha is that cell's own export. In CURVE mode the points of Spine curve draw the spine's SHAPE in the curl plane (Q4.1); curvature is derived, scaled so the drawn arc is the petal's length, the start laid along the blade; the slider family is hidden and inert (Q4.2). A drag past the printable floor — one sheet thickness of spine radius, spineLaw's own — is REFUSED and the point does not move (Q4.4). One camera for every bloom cell, sized from the slider cell.</p>
<h2>1. The nearest slider shape beside two drawn curves and the limit — whole</h2>
<main>${fig(slider, 'whole', 'whole')}${fig(sCurve, 'whole', 'whole')}${fig(hook, 'whole', 'whole')}${fig(limit, 'whole', 'whole')}</main>
<h2>2. The same four in profile</h2>
<main>${fig(slider, 'profile', 'profile')}${fig(sCurve, 'profile', 'profile')}${fig(hook, 'profile', 'profile')}${fig(limit, 'profile', 'profile')}</main>
<h2>3. The editor beside each curve</h2>
<main class="three">${edfig(sCurve)}${edfig(hook)}${edfig(limit)}</main>
<h2>4. A refused drag at the limit — pointer still down</h2>
<main class="two"><figure><img src="${limit.refused.editor}"><figcaption><b>the limit curve, point 4 dragged toward a tighter bend</b><br><small>${esc(limit.refused.reason)}</small><br>status line: ${esc(limit.refused.status)}<br>value after release ${limit.refused.held ? 'IDENTICAL to before the drag (REQUIRED)' : 'MOVED'}</figcaption></figure>${fig(limit, 'profile', 'the bloom at the limit, profile')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
