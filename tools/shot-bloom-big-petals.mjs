/* ===================================================================
   THE BIG-PETALS SHEET (Eva's rulings, Oct 21: `petalLength` to 100 mm; a
   long petal thickens at its ROOT and tapers to the sheet toward the tip, by
   its own length; the hub thickens to match). Composed so what the session
   leaves to Eva's eye is on one page:

   (1) 35 / 60 / 100 mm SIDE BY SIDE, ONE CAMERA (sized from the 100 mm cell,
       which reaches furthest), print preview on.
   (2) THE ROOT, EDGE-ON — a macro on one petal's root seen along its width
       (three petals, so none stands between the camera and the root), at 35
       and 100 mm, beside a THICKNESS PROFILE drawn from the numbers READ OFF
       THE EXPORTED FILE along each petal's centre line (the T family's own
       reader, `rootTaperAssertions(…, out)`), with the law restated from the
       controls drawn beside it.
   (3) THE HUB FROM BELOW at 35 and 100 mm, its thickness read off the file.
   (4) A 15 CM BLOOM — the length the ruling named as a target, its measured
       width across in the caption.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction assertions and the T family run before the
   shutter, the STL sha of that cell, every frame decoded and required to
   carry content, and the MEASURED thickness (root, hub, tip — off the file)
   in the caption. No pixel delta is quoted anywhere (this renderer is not
   deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-big-petals.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl, stlPositions,
         junctionAssertions, rootTaperAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-big-petals';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-big-petals-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* The framings. `side` and `below` are sized from the cell's (or the shared
   frame's) own fit radius; `root` is a macro on the petal at azimuth 0, seen
   along its width (-y), centred on its root. */
const VIEWS = {
  side: (f) => ({ r: f.fit * 1.05, at: [0, 0, f.fit * 0.2], dir: [0.15, -0.9, 0.4] }),
  below: (f) => ({ r: f.R * 2.2 + 6, at: [0, 0, 0], dir: [0.05, -0.12, -1] }),
  root: (f) => ({ r: 9, at: [f.R + 4, 0, 1], dir: [0, -1, 0.06] }),
  whole: (f) => ({ r: f.fit * 1.05, at: [0, 0, f.fit * 0.1], dir: [0.2, -0.6, 0.78] }),
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* Settled on the real signal: two consecutive byte-identical frames. */
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

async function cell({ label, set: sets = [], views = ['side'], frame = null, ruling = '' }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: sets };
  const jct = await junctionAssertions(page, row);
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const ui = await page.evaluate(() => window.__bloomUIState());
  /* THE FILE'S OWN THICKNESS — the T family's reader, forced on so a 35 mm
     petal is read too; the clauses must be silent here. */
  const out = { force: true };
  const tb = rootTaperAssertions(stlPositions(buf), row, m0, ui, out);
  if (tb.length) await die(`${label}: T: ${tb.join('; ')}`);
  const ring0 = (out.readings || []).filter((r) => r.ring === 0).sort((a, b) => a.u - b.u);
  if (!ring0.length) await die(`${label}: the file read no thickness on ring 0`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const own = { R: m0.hubRadius, fit: m0.fitRadius, across: m0.maxDimMm };
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const fr = frame || own;
  const shots = {};
  for (const view of views) shots[view] = (await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr)).file;
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const rootLine = readout.split('\n').find((l) => /^ROOT TAPER/.test(l)) || '';
  const tip = ring0[ring0.length - 1];
  const rec = { label, ruling, shots, own, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, shownTris: m.shownTris,
    rootMm: out.rootFileMm, hubMm: out.hubFileMm, hubFrom: out.hubFrom, tipMm: tip.fileMm, tipU: tip.u, profile: ring0, rootLine };
  console.log(`  ${label.padEnd(60)} root ${rec.rootMm.toFixed(3)} hub ${rec.hubMm.toFixed(3)} tip ${rec.tipMm.toFixed(3)} mm (file) · across ${own.across.toFixed(1)} mm · ${rec.tag}`);
  return rec;
}

console.log('THE BIG-PETALS SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, junction and T asserted before the shutter.\n');
const LENGTHS = [35, 60, 100];
/* (1) one camera, sized from the 100 mm cell (built first) */
const c100 = await cell({ label: '100 mm', set: set({ petalLength: 100 }), views: [], ruling: 'the new maximum' });
const row1 = [];
for (const L of LENGTHS) row1.push(await cell({ label: `${L} mm`, set: set({ petalLength: L }), views: ['side'], frame: c100.own, ruling: L === 35 ? 'the shipping petal — the reference, the law the identity' : 'thickened at the root by its own length' }));
/* (2) the root edge-on, three petals */
const roots = [];
for (const L of [35, 100]) roots.push(await cell({ label: `${L} mm root, edge-on (3 petals)`, set: set({ petalLength: L, petalCount: 3 }), views: ['root'], ruling: 'one petal\'s root seen along its width' }));
/* (3) the hub from below */
const hubs = [];
for (const L of [35, 100]) hubs.push(await cell({ label: `${L} mm — the hub from below`, set: set({ petalLength: L }), views: ['below'], ruling: 'the plate the roots stand on' }));
/* (4) a 15 cm bloom */
const big = await cell({ label: 'a 15 cm bloom (75 mm petals, tilt 25)', set: set({ petalLength: 75 }), views: ['whole'], ruling: 'the length the ruling named as a target' });

/* the thickness profile, drawn from the FILE's readings (dots) with the law's
   own restatement (the want, a line) — 35 / 60 / 100 on one axis */
function profileSvg(cells) {
  const W = 720, Hh = 300, pad = 40;
  const tMax = Math.max(...cells.flatMap((c) => c.profile.map((p) => Math.max(p.fileMm, p.wantMm)))) * 1.08;
  const x = (u) => pad + u * (W - 2 * pad), y = (t) => Hh - pad - (t / tMax) * (Hh - 2 * pad);
  const col = ['#7f948a', '#6fb7ae', '#d6a15c'];
  let g = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" style="background:#0c0f0e;border:1px solid #26302b;border-radius:6px">`;
  g += `<line x1="${pad}" y1="${Hh - pad}" x2="${W - pad}" y2="${Hh - pad}" stroke="#26302b"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${Hh - pad}" stroke="#26302b"/>`;
  for (const t of [1, 2, 3, 4]) if (t < tMax) g += `<text x="6" y="${y(t) + 4}" fill="#7f948a" font-size="11">${t} mm</text><line x1="${pad}" y1="${y(t)}" x2="${W - pad}" y2="${y(t)}" stroke="#1a211e"/>`;
  g += `<text x="${pad}" y="${Hh - 10}" fill="#7f948a" font-size="11">root (u 0)</text><text x="${W - pad - 60}" y="${Hh - 10}" fill="#7f948a" font-size="11">tip (u 1)</text>`;
  cells.forEach((c, i) => {
    const pts = c.profile;
    g += `<polyline fill="none" stroke="${col[i]}" stroke-width="1.5" stroke-dasharray="4 3" points="${pts.map((p) => `${x(p.u).toFixed(1)},${y(p.wantMm).toFixed(1)}`).join(' ')}"/>`;
    for (const p of pts) g += `<circle cx="${x(p.u).toFixed(1)}" cy="${y(p.fileMm).toFixed(1)}" r="2.2" fill="${col[i]}"/>`;
    g += `<text x="${W - pad - 150}" y="${pad + 16 * i}" fill="${col[i]}" font-size="12">${c.label}: root ${c.rootMm.toFixed(3)} mm</text>`;
  });
  return g + '</svg>';
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · read off the FILE: root <b>${c.rootMm.toFixed(3)} mm</b> · hub <b>${c.hubMm.toFixed(3)} mm</b>${/rebuild/.test(c.hubFrom) ? ' (from the rebuild)' : ''} · tip ${c.tipMm.toFixed(3)} mm at u ${c.tipU.toFixed(3)} · across ${c.own.across.toFixed(1)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB)<br><small>${esc(c.rootLine)}</small>`;
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap})</i><br><small>${esc(c.ruling)}</small><br>${num(c)}</figcaption></figure>`;
const html = `<title>Big petals</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>Big petals — a long petal thickens at its root, by its own length</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the junction assertions and the T family (the thickness read off the exported file against the law restated from the controls) ran before every shutter, and every thickness quoted is the FILE's. The law keeps the shipping petal's root bending stress under its own weight (35 mm on the sheet — a reference nothing has validated, since nothing here has been printed); at or under 35 mm it is the identity.</p>
<h2>1. 35 / 60 / 100 mm, one camera (sized from the 100 mm bloom)</h2>
<main>${row1.map((c) => fig(c, 'side', 'from the side')).join('')}</main>
<h2>2. The root — edge-on, and the thickness along the centre line</h2>
<main class="two">${roots.map((c) => fig(c, 'root', 'macro on one root, along its width')).join('')}</main>
<p class="note">The thickness along each petal's centre line, READ OFF THE FILE (dots, the T family's own reader: the nearest skin either side along the build's normal) against the law restated from the controls (dashed). Rows within 3 mm of the rim taper or the tip are not read, as T2 does not read them.</p>
${profileSvg(row1)}
<h2>3. The hub from below</h2>
<main class="two">${hubs.map((c) => fig(c, 'below', 'the plate the roots stand on')).join('')}</main>
<h2>4. A 15 cm bloom</h2>
<main class="two">${fig(big, 'whole', 'the target the ruling named')}</main>`;
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
