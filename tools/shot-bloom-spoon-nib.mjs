#!/usr/bin/env node
/* ===================================================================
   THE SPOON'S RIM TURN, CLOSE UP (F6-spoon, Oct 18 —
   docs/bloom-spoon-rim-turn-outcome.md). `OUTLINE CURVE: the spoon x cup
   0.6` reads a 71.99 deg E2 turn and the question was whether that is the cup
   misbehaving on a WAISTED outline or the geometry of cupping a blunt blade.
   The turn is not at the waist: it sits on the last ladder gap before the
   nib, where a blunt end's half-width falls from ~2.4 mm to the nib's 0.2 mm
   in ONE row step and the cup's lift (c x h at the margin) falls with it.
   This sheet puts that site under the camera on four petals at one cup:
   the spoon (CURVE, waisted), the near-rectangle (CURVE, not waisted), the
   nearest LAW shape (spatulate: base taper 3, tip taper 0.6, tip shape 1.7)
   and the spoon at cup 0 (the control) — each from above and close up on
   petal 1's tip.

   EVERY CELL: print preview ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), the whole
   state read back, J1-J9, C1-C3 and AN0-AN3 / OC0-OC3 run before the shutter,
   the STL exported and required watertight. No pixel delta is quoted (this
   renderer is not deterministic between page sessions — CLAUDE.md).

   RUN:  node tools/shot-bloom-spoon-nib.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, apexNibAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-spoon-nib';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-spoon-nib-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'string' ? value : JSON.stringify(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* `tip` is the shown build's own petal tip (__bloomMetrics().petalTip), `az`
   its azimuth; the close-ups look at it from outside-and-above and from the
   side, 4 mm across, so the last ladder gap (0.66 mm) and the nib's arc fill
   the frame. */
const VIEWS = {
  top: (f) => ({ r: f.fit * 0.95, at: [0, 0, 0], dir: [0, -0.18, 0.98] }),
  nibAbove: (f) => ({ r: 2.2, at: f.tip, dir: [Math.cos(f.az) * 0.55, Math.sin(f.az) * 0.55, 0.83] }),
  nibSide: (f) => ({ r: 2.2, at: f.tip, dir: [-Math.sin(f.az) * 0.9, Math.cos(f.az) * 0.9, 0.42] }),
};
async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}
async function shoot(file, view, frame) {
  const f = VIEWS[view](frame);
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
  /* settle on the real signal: two consecutive byte-identical frames */
  let prev = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(200);
    const buf = await page.screenshot({ clip: { x: 300, y: 0, width: 800, height: 800 } });
    if (prev && buf.equals(prev)) { fs.writeFileSync(file, buf); break; }
    prev = buf;
    if (i === 39) { fs.writeFileSync(file, buf); console.log(`  (${path.basename(file)} did not settle in 40 frames)`); }
  }
  const { width, height, data } = decodePNG(fs.readFileSync(file));
  let content = 0;
  for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  const frac = content / (width * height);
  if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
  return path.basename(file);
}

async function cell({ label, sets, ruling, frame = null }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  for (const [fam, fn] of [['junction', junctionAssertions], ['curl', curlAssertions], ['apex nib / outline', apexNibAssertions]]) {
    const r = await fn(page, { label, set: sets });
    if (r.length) await die(`${label}: ${fam}: ${r.join('; ')}`);
  }
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!m.petalTip) await die(`${label}: no petalTip in the metrics`);
  const own = { fit: m.fitRadius };
  const fr = { ...(frame || own), tip: m.petalTip, az: Math.atan2(m.petalTip[1], m.petalTip[0]) };
  const shots = {};
  for (const view of Object.keys(VIEWS)) shots[view] = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr);
  await setPreview(false);
  console.log(`  ${label.padEnd(72)} tris ${m.shownTris} sha ${sha(buf)} · ${modeTag(m)}`);
  return { label, ruling, shots, own, tag: modeTag(m), shownTris: m.shownTris, sha: sha(buf), tris: stl.tris, bytes: buf.length };
}

/* THE NUMBERS ON EACH CAPTION are the E2 turn and its site, measured by
   tools/verify-bloom-edge-profile.mjs's own clause on the same state (export),
   stated in the outcome doc §2; written here so the picture carries them. */
const SPOON = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
const RECT = { mode: 'symmetric', points: [[0, 0.15], [0.1, 0.16], [0.9, 0.16], [0.97, 0.12], [1, 0]] };
const CV = (c) => ({ petalOutlineMode: 'CURVE', petalOutlineCurve: c });
console.log('THE SPOON NIB SHEET — PRINT PREVIEW ON, chrome hidden, auto-rotate off, J/C/AN/OC asserted before every shutter.\n');
const spoon = await cell({ label: 'CURVE: the spoon x cup 0.6', sets: set({ ...CV(SPOON), petalCup: 0.6 }), ruling: 'E2 71.99 deg (face-to-face 89.96, outline 17.98) at row 52/58, u 0.9992 — the first nib-arc row; the last ladder gap before it spans h 2.42 -> 0.20 mm over 0.66 mm' });
const rect = await cell({ label: 'CURVE: the near-rectangle x cup 0.6 (NOT waisted)', sets: set({ ...CV(RECT), petalCup: 0.6 }), frame: spoon.own, ruling: 'E2 89.84 deg at row 52/58, u 0.9994 — h 3.05 -> 0.20 mm over 0.61 mm' });
const law = await cell({ label: 'LAW: spatulate (base taper 3, tip taper 0.6, tip shape 1.7) x cup 0.6', sets: set({ petalBaseTaper: 3, petalTipTaper: 0.6, petalTipShape: 1.7, petalCup: 0.6 }), frame: spoon.own, ruling: 'E2 81.33 deg at row 52/58, u 0.9996 — h 2.62 -> 0.20 mm over 0.55 mm; main\'s own geometry' });
const ctl = await cell({ label: 'CURVE: the spoon x cup 0 (the control)', sets: set(CV(SPOON)), frame: spoon.own, ruling: 'E2 44.53 deg at row 16/58, u 0.25 — the claw; the nib reads under the allowance with no cup' });
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cap = (c) => `<b>${esc(c.label)}</b><br><small>${esc(c.ruling)}</small><br><small>${esc(c.tag)} · ${Number(c.shownTris).toLocaleString('en-US')} tris shown · STL ${c.sha} (${c.tris.toLocaleString('en-US')} tris export)</small>`;
const row = (c) => `<main>${['top', 'nibAbove', 'nibSide'].map((v) => `<figure><img src="${c.shots[v]}"><figcaption>${v === 'top' ? cap(c) : `<i>${v === 'nibAbove' ? 'petal 1\'s tip from outside and above, 4.4 mm across' : 'petal 1\'s tip from the side, 4.4 mm across'}</i>`}</figcaption></figure>`).join('')}</main>`;
const html = `<title>Spoon nib</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The spoon's 72° rim turn — where it is, and who else has it</h1>
<p class="note"><b>Print preview on every cell</b>, chrome hidden, auto-rotate off, asserted; J1-J9, C1-C3, AN0-AN3 and OC0-OC3 ran before every shutter. Each row: the bloom from above, then petal 1's tip close up from two sides. The turn is not at the waist: it is the last ladder gap before the nib on a BLUNT end, where the half-width and the cup's lift (c × h) fall together in one row step. The near-rectangle (not waisted) and the LAW spatulate (main's geometry) read worse than the spoon. No pixel delta is quoted.</p>
${row(spoon)}${row(rect)}${row(law)}${row(ctl)}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); server.close();
