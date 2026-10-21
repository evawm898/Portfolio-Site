/* ===================================================================
   THE BRAID SHEET (the braid session — Eva's rulings: a braid is ONE bundle,
   every filament of the androecium wound round the others; the anther sits on
   the braid's END TANGENT; select-and-edit picks a strand or the bundle).
   Composed so what the session leaves to Eva's eye is on one page:

   (1) THE BRAID AT 3, 6 AND 30 STAMENS, each beside an INDEPENDENT coil at the
       same count — from the side, ONE CAMERA PER COUNT (sized from the
       independent cell, which reaches further out), and the same pair from
       above.
   (2) THE ANTHER ON THE END TANGENT — a macro of the braid's top end, every
       strand's anther along its own last segment (JS9 asserts the angle; the
       caption prints the builder's own worst angle off the EMITTED stations).
   (3) THE PICKER — the panel with the scope bar showing "the bundle" and the
       strands, strand 3 picked and given +10 mm of its own (the Androecium
       section's length control telling "the bundle 20 + 10 offset = 30"),
       beside the braid it built (strand 3 standing above the bundle).
   Plus THE BYTE CLAIM ON THE SHEET: BRAIDED at radius 0 exports six plain
   stamens' own sha (the plain rod by branch) — REQUIRED equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction AND androecium assertions (JS0-JS9) run
   before the shutter, the STL sha of that cell, every frame decoded and
   required to carry content. No pixel delta is quoted anywhere (this
   renderer is not deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-stamen-braid.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, stamenAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-stamen-braid';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-stamen-braid-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* The framings, sized from the cell's own numbers: the androecium's radius
   and filament length. `tip` is the macro on the braid's top end. */
const reach = (f) => Math.max(f.A + 4, f.L * 0.75, 6);
const VIEWS = {
  above: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.5], dir: [0.02, -0.02, 1] }),
  profile: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.5], dir: [0.1, -0.94, 0.34] }),
  tip: (f) => ({ r: 6, at: [0, 0, f.L * 0.9], dir: [0.3, -0.85, 0.43] }),
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* Settled on the real signal: two consecutive byte-identical frames, never a
   fixed sleep (CLAUDE.md's contact-sheet rule). */
async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    const f = VIEWS[view](frame); f.r *= scale;
    await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
    let prev = null, buf = null;
    for (let k = 0; k < 20; k++) { await page.waitForTimeout(200); buf = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 800 } }); if (prev && buf.equals(prev)) break; prev = buf; }
    fs.writeFileSync(file, buf);
    const { width, height, data } = decodePNG(buf);
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac >= 0.02 && frac <= 0.98) return { file: path.basename(file), scale };
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= 1.6;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

/* The anther against its strand: the angle between each strand's reported end
   direction and its LAST EMITTED segment — the builder's own stations, never
   the restatement (JS9 is the gate; this is the caption's number). */
const antherAngle = () => page.evaluate(() => {
  const st = window.__bloomMetrics().stamens || [];
  let worst = 0;
  for (const s of st) { if (!s.stations || s.stations.length < 2) continue; const a = s.stations[s.stations.length - 2], b = s.stations[s.stations.length - 1], v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], n = Math.hypot(...v); worst = Math.max(worst, Math.acos(Math.min(1, (v[0] * s.dir[0] + v[1] * s.dir[1] + v[2] * s.dir[2]) / n)) * 180 / Math.PI); }
  return worst;
});

async function cell({ label, set: sets = [], scopes = null, views = ['profile', 'above'], ruling = '', frame = null }) {
  await openBloom(page, port);
  const all = scopes ? [...sets, { id: '@scopes', value: scopes }] : sets;
  const bad = await applyConfig(page, all);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: all };
  const jct = await junctionAssertions(page, row);
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const stm = await stamenAssertions(page, row);
  if (stm.length) await die(`${label}: androecium: ${stm.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const A0 = m0.androecium;
  const own = { R: m0.hubRadius, A: A0 ? A0.radius : 0, L: A0 ? A0.length : 0, fit: m0.fitRadius };
  const angle = await antherAngle();
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const fr = frame || own;
  const shots = {};
  for (const view of views) shots[view] = (await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr)).file;
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const lines = readout.split('\n');
  const rec = { label, ruling, shots, own, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, shownTris: m.shownTris, angle,
    stamenLine: lines.find((l) => /^STAMENS /.test(l)) || '' };
  console.log(`  ${label.padEnd(64)} tris ${stl.tris} sha ${rec.sha} anther ${angle.toFixed(1)} deg · ${rec.tag}`);
  return rec;
}

const BR = { stamenCoil: 'BRAIDED' }, IND = { stamenCoil: 'INDEPENDENT' };
const COUNTS = [{ n: 3, extra: {} }, { n: 6, extra: {} }, { n: 30, extra: { stamenLayout: 'DISC' } }];
console.log('THE BRAID SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS0-JS9 asserted before the shutter.\n');
const pairs = [];
for (const { n, extra } of COUNTS) {
  const ind = await cell({ label: `${n} stamens — INDEPENDENT (the control)`, set: set({ stamenCount: n, ...extra, ...IND }), ruling: 'each filament coiled about its own axis' });
  const br = await cell({ label: `${n} stamens — BRAIDED, one bundle`, set: set({ stamenCount: n, ...extra, ...BR }), frame: ind.own, ruling: 'every filament wound round the others' });
  pairs.push({ n, ind, br });
}
const tip = await cell({ label: '6 stamens BRAIDED — the anthers on the end tangent', set: set({ stamenCount: 6, ...BR }), views: ['tip'], ruling: 'each anther along its strand\'s last segment' });
const plain = await cell({ label: '6 stamens plain (the control)', set: set({ stamenCount: 6 }), views: ['profile'] });
const r0 = await cell({ label: 'GATED — BRAIDED at radius 0 (the plain rod by branch)', set: set({ stamenCount: 6, ...BR, stamenCoilRadius: 0 }), views: ['profile'], frame: plain.own, ruling: 'must export six plain stamens\' own sha' });
if (r0.sha !== plain.sha) await die(`BRAIDED at radius 0 exported ${r0.sha}, six plain ${plain.sha} — the branch did not hold`);

/* THE PICKER, driven as a hand would: pick strand 3, give it +10 mm. The pick
   is a pure load (no rebuild, no write), checked before the edit. */
await openBloom(page, port);
{ const bad = await applyConfig(page, set({ stamenCount: 6, ...BR })); if (bad.length) await die(`picker: ${bad.join('; ')}`); }
const before = await page.evaluate(() => ({ count: window.__bloomBuildState().count, rec: JSON.stringify(window.__bloomDesign.scopes()) }));
await page.evaluate(() => window.__bloomScopeView.select('strand:2:0'));
await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
await settleBuild(page);
const after = await page.evaluate(() => ({ count: window.__bloomBuildState().count, rec: JSON.stringify(window.__bloomDesign.scopes()) }));
if (before.count !== after.count || before.rec !== after.rec) await die('picking strand 3 rebuilt or wrote to the record');
{ const bad = await applyConfig(page, set({ stamenLength: 30 })); if (bad.length) await die(`picker edit: ${bad.join('; ')}`); }
const pk = await page.evaluate(() => ({ rec: window.__bloomDesign.scopes(), lengths: window.__bloomMetrics().androecium.stamens.map((s) => s.lengthMm), bar: window.__bloomScopeView.bar() }));
if (JSON.stringify(pk.lengths) !== JSON.stringify([20, 20, 30, 20, 20, 20])) await die(`the strand edit built lengths ${JSON.stringify(pk.lengths)} — expected strand 3 alone at 30`);
await page.setViewportSize({ width: 900, height: 2400 });
await page.evaluate(() => {
  for (const d of document.querySelectorAll('#panelControls details')) d.open = false;
  for (const id of ['center', 'androecium']) { const d = document.getElementById(`sec-${id}`); if (d) d.open = true; }
});
await page.waitForTimeout(400);
const box = await page.evaluate(() => {
  const p = document.querySelector('.bl-panel'), ro = document.getElementById('readout');
  const r = p.getBoundingClientRect(), t = ro ? ro.getBoundingClientRect().top : r.bottom;
  return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, t - r.top) };
});
fs.writeFileSync(path.join(outDir, 'picker-panel.png'), await page.screenshot({ clip: box }));
await page.setViewportSize({ width: 800, height: 800 });
const picked = await cell({ label: '6 stamens BRAIDED — strand 3 with +10 mm of its own', set: set({ stamenCount: 6, ...BR }), scopes: { layers: [], petals: [], tiers: [], strands: [{ strand: 2, offsets: { stamenLength: 10 } }] }, views: ['profile'], frame: pairs[1].ind.own, ruling: 'the edit the panel beside it made' });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export) · worst anther off its strand ${c.angle.toFixed(1)}°<br><small>${esc(c.stamenLine)}</small>`;
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap})</i><br><small>${esc(c.ruling)}</small><br>${num(c)}</figcaption></figure>`;
const html = `<title>Stamen braid</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.six{grid-template-columns:repeat(6,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The braid — every filament of the androecium as ONE bundle</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; JS0-JS9 and the junction assertions ran before every shutter; the STL sha is that cell's own export. Each strand gathers from its own root onto the bundle's axis (the style's) and winds round it at the coil's radius and turns, at its own lay angle — its root's azimuth — so the strands go round one another; the anther follows the braid's END TANGENT. Strands are separate closed solids that touch and cross by design (cross-shell overlap, the export contract's own case). One camera per count, sized from the independent control.</p>
<h2>1. The braid at 3, 6 and 30 stamens, each beside an INDEPENDENT coil</h2>
${pairs.map((p) => `<main>${fig(p.ind, 'profile', 'INDEPENDENT, from the side')}${fig(p.br, 'profile', 'BRAIDED, from the side')}</main><main>${fig(p.ind, 'above', 'INDEPENDENT, from above')}${fig(p.br, 'above', 'BRAIDED, from above')}</main>`).join('\n')}
<h2>2. The anther on the end tangent</h2>
<main>${fig(tip, 'tip', 'macro on the top of the bundle')}${fig(r0, 'profile', 'BRAIDED at radius 0 — sha REQUIRED equal to six plain stamens')}</main>
<h2>3. The picker — select and edit</h2>
<main><figure><img src="picker-panel.png"><figcaption><b>The panel</b>: the scope bar lists "the bundle" and six strands; strand 3 picked; its length control tells the bundle's 20 mm plus its own +10 offset; every other androecium control is told as the bundle's. Built lengths read off the builder: ${esc(JSON.stringify(pk.lengths))} mm. Record: <small>${esc(JSON.stringify(pk.rec))}</small></figcaption></figure>${fig(picked, 'profile', 'the braid that edit built')}</main>`;
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
