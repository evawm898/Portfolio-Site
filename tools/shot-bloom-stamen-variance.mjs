/* ===================================================================
   THE STAMEN LENGTH VARIANCE SHEET (F1.2 — Eva's rulings of Oct 12: the
   variance RANDOM per stamen, SEEDED from the index; the `stamenLength`
   ceiling a FIXED 120 mm). Composed so the two things the session leaves to
   Eva's eye are on one page:

   (1) THE VARIANCE AT 0 / 0.5 / 1.0 on a LILY-LIKE head (six on a ring, the
       six-stamen candidate) and on a DENSE one (120 on the Vogel disc),
       from the side and from 40 degrees off the axis, every cell at the
       same camera within its row so the lengths read against each other.
       The captions carry the app's own STAMENS line — the built range and
       how many the 5..120 mm range CLAMPED — never re-derived here.
   (2) THE 120 mm END, from the side: six straight at 120 (L/d 100 on the
       shipping sheet, UNMEASURED — no coupon has been printed), the same six
       with the variance at its maximum (the ceiling clamps the long draws),
       and 120 mm at the curl ceiling (the long-rod corner).
   Plus THE BYTE CLAIM ON THE SHEET: the variance at its maximum with count 0
   exports the shipping default's own sha — REQUIRED equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction AND androecium assertions (JS0-JS8) run
   before the shutter, the STL sha of that cell, every frame decoded and
   required to carry content. No pixel delta is quoted anywhere (this
   renderer is not deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-stamen-variance.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, stamenAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { STAMEN_LENGTH_RANGE } from '../bloom-geometry.js';

const outDir = process.argv[2] || '/tmp/bloom-stamen-variance';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-stamen-variance-sheet-'));
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
    readoutFirst: lines[0], stamenLine: lines.find((l) => /^STAMENS /.test(l)) || '', slenderLine: lines.find((l) => /^SLENDERNESS /.test(l)) || '', headLine: lines.find((l) => /^HEAD/.test(l)) || '' };
  console.log(`  ${label.padEnd(64)} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.stamenLine) console.log(`  ${''.padEnd(64)} ${rec.stamenLine}`);
  return rec;
}

const SIX = { stamenCount: 6 };
const DISC120 = { stamenCount: 120, stamenLayout: 'DISC' };
const HI = STAMEN_LENGTH_RANGE[1];

console.log('THE STAMEN LENGTH VARIANCE SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS0-JS8 asserted before the shutter.\n');
const six0 = await cell({ label: 'SIX on a RING — variance 0 (the lily-like head, every filament 20 mm)', set: set(SIX), views: ['centre', 'profile'], ruling: 'the control: no variance' });
/* ONE CAMERA PER ROW, sized from the LONGEST cell: the max-variance cell's
   own frame (its longest filament reaches 40 mm) is handed to the other two. */
const six1 = await cell({ label: 'SIX on a RING — variance 1.00 (random per stamen, seeded from the index)', set: set({ ...SIX, stamenLengthVariance: 1 }), views: ['centre', 'profile'], ruling: 'the top of the amount — six draws between 0 and 40 mm, the floor clamping the short ones, told' });
const sixHalf = await cell({ label: 'SIX on a RING — variance 0.50', set: set({ ...SIX, stamenLengthVariance: 0.5 }), frame: six1.own, views: ['centre', 'profile'], ruling: 'the middle of the amount' });
const six0f = await cell({ label: 'SIX on a RING — variance 0, at the varied row\'s camera', set: set(SIX), frame: six1.own, views: ['centre', 'profile'], ruling: 'the control at the row\'s camera' });
if (six0f.sha !== six0.sha) await die(`the same state exported two shas (${six0.sha} / ${six0f.sha}) — the camera reached the geometry`);
const d0 = await cell({ label: '120 on the DISC — variance 0 (the dense head)', set: set(DISC120), views: ['above', 'centre', 'profile'], ruling: 'the control: no variance, the cushion' });
const d1 = await cell({ label: '120 on the DISC — variance 1.00', set: set({ ...DISC120, stamenLengthVariance: 1 }), frame: d0.own, views: ['above', 'centre', 'profile'], ruling: 'the top of the amount on the dense head' });
const dHalf = await cell({ label: '120 on the DISC — variance 0.50', set: set({ ...DISC120, stamenLengthVariance: 0.5 }), frame: d0.own, views: ['above', 'centre', 'profile'], ruling: 'the middle of the amount on the dense head' });
const long0 = await cell({ label: 'SIX at the 120 mm CEILING, straight — L/d 100 (UNMEASURED — no coupon has been printed)', set: set({ ...SIX, stamenLength: HI }), views: ['whole', 'profile'], ruling: 'THE CEILING (Eva, Oct 12: a fixed 120 mm)' });
const long1 = await cell({ label: 'SIX at 120 mm x variance 1.00 — the ceiling CLAMPS the long draws, told', set: set({ ...SIX, stamenLength: HI, stamenLengthVariance: 1 }), frame: long0.own, views: ['whole', 'profile'], ruling: 'the clamp at the ceiling: every draw past 120 is built AT 120 and counted on the STAMENS line' });
const longCurl = await cell({ label: 'SIX at 120 mm x curl +180 — the long-rod corner', set: set({ ...SIX, stamenLength: HI, stamenCurl: 180 }), views: ['whole', 'profile'], ruling: 'the combination check\'s corner: six 38 mm hoops over the centre, the rods crossing (the combination gate declares it, by value)' });
const dflt = await cell({ label: 'the shipping default — ABSENT (the control)', set: [], views: ['whole'], ruling: 'the bare apex, unchanged' });
const gatedZero = await cell({ label: 'GATED — the variance at MAXIMUM (and every sub-control) with count 0 (hidden and inert)', set: set({ stamenCount: 0, stamenLayout: 'DISC', stamenSpread: 6, stamenLength: HI, stamenCurl: 180, stamenLengthVariance: 1 }), views: ['whole'], ruling: 'must export the shipping default\'s own sha' });
if (gatedZero.sha !== dflt.sha) await die(`the sub-controls at maximum with count 0 exported ${gatedZero.sha}, the default ${dflt.sha} — a hidden slider reached the geometry`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})`
  + (c.A ? `<br>${esc(c.stamenLine)}<br>${esc(c.slenderLine)}` : '<br>no androecium');
const fig = (c, view, cap) => { if (!c.shots[view]) throw new Error(`${c.label}: the page references a "${view}" frame this cell never shot`); return `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}` + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`; };
const html = `<title>Stamen length variance</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>Stamen length variance and the 120 mm ceiling — F1.2</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; JS0-JS8 and the junction assertions ran before every shutter; the STL sha is that cell's own export. The variance is RANDOM per stamen and SEEDED from the stamen's index — never a control, never the shared variance wave (Eva, Oct 12) — so the same design builds the same filaments every time. Each filament is built at length x (1 + amount x u), u in [-1, 1], CLAMPED to ${STAMEN_LENGTH_RANGE[0]}..${STAMEN_LENGTH_RANGE[1]} mm and told. Every STAMENS and SLENDERNESS line is the app's own read-out; SLENDERNESS is the longest filament's and is telemetry: UNMEASURED — no coupon has been printed.</p>
<h2>1. The lily-like head — six on a ring at variance 0 / 0.50 / 1.00, one camera</h2>
<main class="three">${fig(six0f, 'profile', 'variance 0, from the side')}${fig(sixHalf, 'profile', 'variance 0.50, from the side')}${fig(six1, 'profile', 'variance 1.00, from the side')}</main>
<main class="three">${fig(six0f, 'centre', 'variance 0')}${fig(sixHalf, 'centre', 'variance 0.50')}${fig(six1, 'centre', 'variance 1.00')}</main>
<h2>2. The dense head — 120 on the disc at variance 0 / 0.50 / 1.00, one camera</h2>
<main class="three">${fig(d0, 'profile', 'variance 0, from the side')}${fig(dHalf, 'profile', 'variance 0.50, from the side')}${fig(d1, 'profile', 'variance 1.00, from the side')}</main>
<main class="three">${fig(d0, 'above', 'variance 0, straight down')}${fig(dHalf, 'above', 'variance 0.50, straight down')}${fig(d1, 'above', 'variance 1.00, straight down')}</main>
<h2>3. The 120 mm ceiling, from the side</h2>
<main class="three">${fig(long0, 'profile', 'six at 120 mm, straight')}${fig(long1, 'profile', 'six at 120 mm x variance 1.00 — the ceiling clamps')}${fig(longCurl, 'profile', 'six at 120 mm x curl +180')}</main>
<main class="three">${fig(long0, 'whole', 'whole bloom')}${fig(long1, 'whole', 'whole bloom')}${fig(longCurl, 'whole', 'whole bloom')}</main>
<h2>4. The byte claim, on the sheet</h2>
<main>${fig(gatedZero, 'whole', 'the variance at MAXIMUM with count 0 — sha REQUIRED equal to the default\'s')}${fig(dflt, 'whole', 'the shipping default')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
