/* ===================================================================
   THE INDEPENDENT COIL SHEET (F1.3a — Eva's rulings of Oct 12, Q2.3 / Q2.5:
   the coil's curvature floored at one sheet thickness of radius; the anther
   follows the coil's END TANGENT). Composed so what the session leaves to
   Eva's eye is on one page:

   (1) A FEW COILED STAMENS, LILY-LIKE — six on a ring, plain / coiled at the
       defaults (r 1.5 mm x 3 turns) / coiled at 6 turns, from the side, one
       camera; and ONE CELL WITH THE LENGTH VARIANCE ON (the pitch follows
       each filament's own length).
   (2) THE DENSE HEAD — 120 on the disc, plain and coiled, from the side and
       from above, one camera.
   (3) THE LONG COIL — six at 120 mm, r 3 mm x 8 turns, and the clamp where
       it binds (12 turns on 20 mm, told on the STAMENS line).
   Plus THE BYTE CLAIMS ON THE SHEET: the coil at maximum with count 0
   exports the shipping default's own sha, and the coil NONE with its
   sub-controls at maximum exports six plain stamens' own sha — REQUIRED
   equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction AND androecium assertions (JS0-JS9) run
   before the shutter, the STL sha of that cell, every frame decoded and
   required to carry content. No pixel delta is quoted anywhere (this
   renderer is not deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-stamen-coil.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, stamenAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { STAMEN_LENGTH_RANGE, STAMEN_COIL_RADIUS_RANGE, STAMEN_COIL_TURNS_RANGE } from '../bloom-geometry.js';

const outDir = process.argv[2] || '/tmp/bloom-stamen-coil';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-stamen-coil-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* The framings. `f` carries the cell's own numbers: the hub radius, the
   androecium's radius and filament length (0 when absent), the model's fit
   radius. The androecium cameras are sized from the STAMENS, not the petals
   — the six-stamen candidate is 3 mm across on a 35 mm bloom. */
const reach = (f) => Math.max(f.R * 1.3, f.A + f.L * 0.9, 6);
const VIEWS = {
  whole: null,
  above: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.5], dir: [0.02, -0.02, 1] }),
  centre: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.45], dir: [0.45, -0.45, 0.77] }),
  /* 20 degrees up, not 8: the shipping petals tilt 25 degrees and their tips
     stood in front of the curl loops on the first render (measured — the
     line of sight cleared the near tip by -0.3 mm at 8 degrees, +6.8 mm at
     20), so a side camera that looks OVER the near whorl is the one that
     shows a filament that has come back under the hub. */
  profile: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.45], dir: [0.1, -0.94, 0.34] }),
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
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 800, height: 800 } });
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

async function cell({ label, set: sets = [], views = ['whole', 'centre', 'profile'], ruling = '', note = '', frame = null }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const stm = await stamenAssertions(page, { label, set: sets });
  if (stm.length) await die(`${label}: androecium: ${stm.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const A = m.androecium;
  const own = { R: m.hubRadius, A: A ? A.radius : 0, L: A ? A.length : 0, fit: m.fitRadius };
  const fr = frame || own;
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const lines = readout.split('\n');
  const rec = { label, tag: modeTag(m), ruling, note, shots, widened, own, sha: sha(buf), bytes: buf.length, tris: stl.tris, boundary: stl.boundary,
    shownTris: m.shownTris, hub: m.hubRadius, A: A ? { ...A, stamens: undefined } : null, near: m.stamenNearest, dome: m.hubDome,
    readoutFirst: lines[0], coil: A && A.coil ? A.coil : null, stamenLine: lines.find((l) => /^STAMENS /.test(l)) || '', slenderLine: lines.find((l) => /^SLENDERNESS /.test(l)) || '', headLine: lines.find((l) => /^HEAD/.test(l)) || '' };
  console.log(`  ${label.padEnd(64)} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.stamenLine) console.log(`  ${''.padEnd(64)} ${rec.stamenLine}`);
  return rec;
}

const SIX = { stamenCount: 6 };
const COIL = { stamenCoil: 'INDEPENDENT' };
const DISC120 = { stamenCount: 120, stamenLayout: 'DISC' };
const HI = STAMEN_LENGTH_RANGE[1];

console.log('THE INDEPENDENT COIL SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS0-JS9 asserted before the shutter.\n');
/* ONE CAMERA PER ROW, sized from the cell that reaches furthest. */
const sixVar = await cell({ label: 'SIX COILED x length variance 0.50 — the pitch follows each filament\'s own length', set: set({ ...SIX, ...COIL, stamenLengthVariance: 0.5 }), views: ['centre', 'profile'], ruling: 'one cell with the variance on: three turns over every filament, each its own length' });
const six0 = await cell({ label: 'SIX on a RING — plain (the control)', set: set(SIX), frame: sixVar.own, views: ['centre', 'profile'], ruling: 'the control: no coil' });
const sixC = await cell({ label: 'SIX COILED — the defaults (r 1.5 mm x 3 turns, each its own phase)', set: set({ ...SIX, ...COIL }), frame: sixVar.own, views: ['centre', 'profile'], ruling: 'the lily-like coil' });
const sixC6 = await cell({ label: 'SIX COILED — r 1.5 mm x 6 turns', set: set({ ...SIX, ...COIL, stamenCoilTurns: 6 }), frame: sixVar.own, views: ['centre', 'profile'], ruling: 'twice the turns' });
const d0 = await cell({ label: '120 on the DISC — plain (the dense head, the control)', set: set(DISC120), views: ['above', 'profile'], ruling: 'the control: the cushion' });
const dC = await cell({ label: '120 on the DISC — COILED at the defaults', set: set({ ...DISC120, ...COIL }), frame: d0.own, views: ['above', 'profile'], ruling: 'the dense head coiled: neighbours interpenetrate (declared by value, overlapping closed shells)' });
const dCr = await cell({ label: '120 on the DISC — COILED r 0.6 mm x 4 turns', set: set({ ...DISC120, ...COIL, stamenCoilRadius: 0.6, stamenCoilTurns: 4 }), frame: d0.own, views: ['above', 'profile'], ruling: 'a finer coil on the dense head' });
const long = await cell({ label: 'SIX at 120 mm COILED r 3 mm x 8 turns — the long coil', set: set({ ...SIX, ...COIL, stamenLength: HI, stamenCoilRadius: 3, stamenCoilTurns: 8 }), views: ['whole', 'profile'], ruling: 'the long coiled filament, the corner checked first (SLENDERNESS is the wire\'s arc length)' });
const clamp = await cell({ label: 'SIX COILED x 12 turns on 20 mm — the curvature floor CLAMPS the turns, told', set: set({ ...SIX, ...COIL, stamenCoilTurns: STAMEN_COIL_TURNS_RANGE[1] }), views: ['centre', 'profile'], ruling: 'the floor (one sheet thickness of radius of curvature) binds: the turns built are told on the STAMENS line' });
const dflt = await cell({ label: 'the shipping default — ABSENT (the control)', set: [], views: ['whole'], ruling: 'the bare apex, unchanged' });
const gatedZero = await cell({ label: 'GATED — the coil at MAXIMUM with count 0 (hidden and inert)', set: set({ stamenCount: 0, ...COIL, stamenCoilRadius: STAMEN_COIL_RADIUS_RANGE[1], stamenCoilTurns: STAMEN_COIL_TURNS_RANGE[1] }), views: ['whole'], ruling: 'must export the shipping default\'s own sha' });
if (gatedZero.sha !== dflt.sha) await die(`the coil at maximum with count 0 exported ${gatedZero.sha}, the default ${dflt.sha} — a hidden slider reached the geometry`);
const gatedNone = await cell({ label: 'GATED — the coil NONE with its sub-controls at MAXIMUM (inert)', set: set({ ...SIX, stamenCoil: 'NONE', stamenCoilRadius: STAMEN_COIL_RADIUS_RANGE[1], stamenCoilTurns: STAMEN_COIL_TURNS_RANGE[1] }), views: ['whole'], ruling: 'must export six plain stamens\' own sha' });
if (gatedNone.sha !== six0.sha) await die(`the coil NONE with its sub-controls at maximum exported ${gatedNone.sha}, six plain ${six0.sha} — the branch did not hold`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})`
  + (c.A ? `<br>${esc(c.stamenLine)}<br>${esc(c.slenderLine)}` : '<br>no androecium');
const fig = (c, view, cap) => { if (!c.shots[view]) throw new Error(`${c.label}: the page references a "${view}" frame this cell never shot`); return `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}` + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`; };
const html = `<title>Stamen coil</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The independent coil — F1.3a</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; JS0-JS9 and the junction assertions ran before every shutter; the STL sha is that cell's own export. Each filament coils along its own length about its curled axis, at its own phase SEEDED from its index (never a control); the coil ramps in over its first pitch so the filament leaves its root along the normal; the anther follows the coil's END TANGENT (Eva, Oct 12). The coil's curvature is FLOORED at one sheet thickness of radius — the turns (and, on a filament too short to ramp it, the radius) are CLAMPED and told. Every STAMENS and SLENDERNESS line is the app's own read-out; SLENDERNESS is the longest coiled wire's arc length over its diameter and is telemetry: UNMEASURED — no coupon has been printed.</p>
<h2>1. A few coiled stamens, lily-like — six on a ring, one camera</h2>
<main>${fig(six0, 'profile', 'plain, from the side')}${fig(sixC, 'profile', 'coiled at the defaults, from the side')}${fig(sixC6, 'profile', '6 turns, from the side')}${fig(sixVar, 'profile', 'coiled x length variance 0.50, from the side')}</main>
<main>${fig(six0, 'centre', 'plain')}${fig(sixC, 'centre', 'coiled at the defaults')}${fig(sixC6, 'centre', '6 turns')}${fig(sixVar, 'centre', 'coiled x length variance 0.50')}</main>
<h2>2. The dense head — 120 on the disc, one camera</h2>
<main class="three">${fig(d0, 'profile', 'plain, from the side')}${fig(dC, 'profile', 'coiled at the defaults, from the side')}${fig(dCr, 'profile', 'r 0.6 x 4 turns, from the side')}</main>
<main class="three">${fig(d0, 'above', 'plain, straight down')}${fig(dC, 'above', 'coiled, straight down')}${fig(dCr, 'above', 'r 0.6 x 4 turns, straight down')}</main>
<h2>3. The long coil and the clamp</h2>
<main>${fig(long, 'profile', 'six at 120 mm, r 3 x 8 turns, from the side')}${fig(clamp, 'profile', '12 turns asked on 20 mm — clamped, told')}</main>
<h2>4. The byte claims, on the sheet</h2>
<main class="three">${fig(gatedZero, 'whole', 'the coil at MAXIMUM with count 0 — sha REQUIRED equal to the default\'s')}${fig(dflt, 'whole', 'the shipping default')}${fig(gatedNone, 'whole', 'coil NONE, sub-controls at MAXIMUM — sha REQUIRED equal to six plain')}</main>`;
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
