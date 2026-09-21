/* ===================================================================
   THE ANDROECIUM SHEET (session 21, phase 2 B2) — composed so Eva can rule
   on the three things this session leaves to her eye, all of which Phase A's
   sheet could not show because it was plan-radius only:

   (1) THE PILL AT BOTH COUNT EXTREMES. She ruled the pill at 120 and has
       never seen it at six: SIX on a RING (the six-stamen candidate, Q7's
       L/d 18.3 state) straight, and ONE HUNDRED AND TWENTY on the Vogel disc
       (the cushion — the disc CLAMPED at the hub radius on the defaults, 86
       of 120 roots inside the petal-root annulus, told), each from above the
       apex, from the side, and the six at the whole bloom.
   (2) THE SIX-FILAMENT CURL RANGE: curl -180 (reflexed outward), +90, +180
       (bent in over the centre) — spineLaw() at tilt 0, the straight rod
       its zero-curvature branch.
   (3) DOES HEAD RISE RELIEVE THE PACKING? The 120-disc flat beside rise
       0.50 and a hemisphere, on one camera: the ROOTS do not move (the
       surface chord is 1.248 -> 1.253 mm), the TIPS fan out with the cap's
       normals (1.25 -> 3.5 -> 4.1 mm between the nearest anthers). The
       captions carry the owner's own numbers.
   Plus the recommendation the report makes on the radius control (a
   MULTIPLIER on the filaments' own area rule, out to the hub, clamped and
   told) shown at its ends, ONE stamen alone, SIX on the disc, the shipping
   default (ABSENT — the control), and THE BYTE CLAIM ON THE SHEET: every
   androecium control at maximum under SPHERE exports the bare sphere's own
   sha, and every sub-control at maximum with count 0 exports the default's
   — REQUIRED equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction AND androecium assertions (JS1-JS4) run
   before the shutter, the STL sha of that cell, every frame decoded and
   required to carry content. Captions are the app's own STAMENS and
   SLENDERNESS lines, never re-derived.

   RUN:  node tools/shot-bloom-androecium.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, stamenAssertions, settleBuild, modeTag, shownModeOf, ANTHER_DIAMETER_FACTOR, ANTHER_LENGTH_FACTOR } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-androecium';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-androecium-sheet-'));
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
const SPH = { placement: 'CONTINUOUS', hubShape: 'SPHERE' };
const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const STAMEN_MAX = { stamenCount: 120, stamenLayout: 'DISC', stamenSpread: 6, stamenLength: 40, stamenCurl: 180 };

console.log('THE ANDROECIUM SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS1-JS4 asserted before the shutter.\n');
const six = await cell({ label: 'SIX on a RING, straight — the six-stamen candidate', set: set(SIX), ruling: 'THE PILL AT SIX — rule the anther shape here', note: 'Six filaments one sheet thick (1.20 mm), 20 mm free above the hub, on one ring at 2.00x the filaments\' own area rule (2.94 mm), each tipped with the fixed PILL. Straight is spineLaw() at zero curvature, not a second code path.' });
const curlN = await cell({ label: 'SIX on a RING, curl -180 — reflexed outward', set: set({ ...SIX, stamenCurl: -180 }), frame: six.own, views: ['centre', 'profile'], ruling: 'the curl range, low end' });
const curl90 = await cell({ label: 'SIX on a RING, curl +90', set: set({ ...SIX, stamenCurl: 90 }), frame: six.own, views: ['centre', 'profile'], ruling: 'the curl range, middle' });
const curlP = await cell({ label: 'SIX on a RING, curl +180 — bent in over the centre', set: set({ ...SIX, stamenCurl: 180 }), frame: six.own, views: ['centre', 'profile'], ruling: 'the curl range, high end', note: 'Positive curl bends the filament INWARD over the centre — the petal spine\'s own sign. At 180 the six anthers cross the axis and land on the far side.' });
const cushion = await cell({ label: 'ONE HUNDRED AND TWENTY on the DISC, flat hub — the cushion', set: set(DISC120), views: ['whole', 'above', 'centre', 'profile'], ruling: 'THE PILL AT 120 — the state Phase A ruled on, now in the real generator', note: 'The Vogel disc (r ∝ √i at the golden angle). At 2.00x the reference the disc asks 13.15 mm and is CLAMPED at the hub radius (8.84 mm): the roots stand 1.25 mm apart against a 1.20 mm filament and a 1.92 mm anther — the anthers fuse. 86 of 120 roots stand inside the petal-root annulus: a flag, never a refusal.' });
const rise05 = await cell({ label: '120 on the DISC x Head rise 0.50', set: set({ ...DISC120, headRise: 0.5 }), frame: cushion.own, views: ['above', 'centre', 'profile'], ruling: 'DOES RISE RELIEVE THE PACKING — the middle of the range' });
const rise1 = await cell({ label: '120 on the DISC x Head rise 1.00 — a hemisphere', set: set({ ...DISC120, headRise: 1 }), frame: cushion.own, views: ['above', 'centre', 'profile'], ruling: 'DOES RISE RELIEVE THE PACKING — the top of the range', note: 'The roots do not move (the surface chord between the nearest pair is 1.253 mm here against 1.248 flat). The TIPS fan out with the cap\'s normals: the nearest anthers go from 1.25 mm apart on the flat hub to 4.7 mm here. Rise unfuses the anthers by splaying the filaments, not by adding surface — on a bloom with an androecium Head rise is the stamen splay.' });
const one = await cell({ label: 'ONE stamen on a RING', set: set({ stamenCount: 1 }), views: ['centre', 'profile'], ruling: 'the low extreme of the slider' });
const sixDisc = await cell({ label: 'SIX on the DISC', set: set({ ...SIX, stamenLayout: 'DISC' }), frame: six.own, views: ['above', 'centre'], ruling: 'the other layout at six — a scatter, not a whorl' });
const spreadLo = await cell({ label: 'SIX x stamen spread 0.60 — the roots fuse', set: set({ ...SIX, stamenSpread: 0.6 }), frame: six.own, views: ['centre'], ruling: 'the multiplier\'s low end (a flag)' });
const spreadHi = await cell({ label: 'SIX x stamen spread 6.00 — CLAMPED at the hub radius', set: set({ ...SIX, stamenSpread: 6 }), views: ['centre', 'above'], ruling: 'the multiplier\'s high end (the range runs out at the hub, told)' });
const dflt = await cell({ label: 'the shipping default — ABSENT (the control)', set: [], views: ['whole', 'centre'], ruling: 'the bare apex, unchanged: 10,080 triangles' });

/* THE BYTE CLAIM, on the sheet: the GATED inertness pairs. */
const bareSph = await cell({ label: 'CONTROL — the bare SPHERE (shipping sliders)', set: set(SPH), views: ['whole'], ruling: 'the bare sphere' });
const gatedSph = await cell({ label: 'GATED — every androecium control at MAXIMUM under SPHERE (hidden and inert)', set: set({ ...SPH, ...STAMEN_MAX }), views: ['whole'], ruling: 'must export the bare sphere\'s own sha' });
if (gatedSph.sha !== bareSph.sha) await die(`the androecium at maximum under SPHERE exported ${gatedSph.sha}, the bare sphere ${bareSph.sha} — the hidden section reached the geometry`);
const incSph = await cell({ label: 'CONTROL — the INCURVE sphere', set: set({ ...INCURVE, ...SPH }), views: ['whole'], ruling: 'the incurve sphere' });
const gatedInc = await cell({ label: 'GATED — every androecium control at MAXIMUM under the INCURVE sphere', set: set({ ...INCURVE, ...SPH, ...STAMEN_MAX }), views: ['whole'], ruling: 'must export the incurve sphere\'s own sha' });
if (gatedInc.sha !== incSph.sha) await die(`the androecium at maximum under the incurve sphere exported ${gatedInc.sha}, the bare incurve sphere ${incSph.sha}`);
const gatedZero = await cell({ label: 'GATED — every sub-control at MAXIMUM with count 0 (hidden and inert)', set: set({ ...STAMEN_MAX, stamenCount: 0 }), views: ['whole'], ruling: 'must export the shipping default\'s own sha' });
if (gatedZero.sha !== dflt.sha) await die(`the sub-controls at maximum with count 0 exported ${gatedZero.sha}, the default ${dflt.sha} — a hidden slider reached the geometry`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})`
  + (c.A ? `<br>${esc(c.stamenLine)}<br>${esc(c.slenderLine)}` : '<br>no androecium')
  + (c.headLine ? `<br><small>${esc(c.headLine)}</small>` : '');
const fig = (c, view, cap) => { if (!c.shots[view]) throw new Error(`${c.label}: the page references a "${view}" frame this cell never shot`); return `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}` + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`; };
const html = `<title>The androecium</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The androecium — filaments and the PILL anther, session 21 (phase 2, B2)</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; JS1-JS4 and the junction assertions ran before every shutter; the STL sha is that cell's own export. The pill is ONE shape (A1, FIXED): ${ANTHER_DIAMETER_FACTOR}x the filament across, ${ANTHER_LENGTH_FACTOR} of its own diameters long — two constants, stated for your ruling from these cells, never controls. The filament is one sheet thick (1.20 mm here; floored to 1.00 mm at export on a thinner sheet). The radius control is a MULTIPLIER on the filaments' own area rule, out to the hub radius, where it is clamped and told — the report says why a multiplier and not millimetres; your ruling. Every STAMENS and SLENDERNESS line is the app's own read-out. SLENDERNESS is telemetry: UNMEASURED — no coupon has been printed.</p>
<h2>1. The pill at both count extremes — six on a ring, a hundred and twenty on the disc</h2>
<main>${fig(six, 'centre', 'the apex from 40° off the axis')}${fig(cushion, 'centre', 'the apex from 40° off the axis')}</main>
<main>${fig(six, 'profile', 'from the side')}${fig(cushion, 'profile', 'from the side')}</main>
<main>${fig(six, 'whole', 'whole bloom')}${fig(cushion, 'above', 'straight down onto the apex')}</main>
<h2>2. The six-filament curl range — spineLaw() at tilt 0</h2>
<main class="three">${fig(curlN, 'profile', 'curl -180, from the side')}${fig(curl90, 'profile', 'curl +90, from the side')}${fig(curlP, 'profile', 'curl +180, from the side')}</main>
<main class="three">${fig(curlN, 'centre', 'curl -180')}${fig(curl90, 'centre', 'curl +90')}${fig(curlP, 'centre', 'curl +180')}</main>
<h2>3. Does Head rise relieve the packing? The 120-disc flat, at rise 0.50, at a hemisphere — one camera</h2>
<main class="three">${fig(cushion, 'above', 'flat, straight down')}${fig(rise05, 'above', 'rise 0.50, straight down')}${fig(rise1, 'above', 'hemisphere, straight down')}</main>
<main class="three">${fig(cushion, 'profile', 'flat, from the side')}${fig(rise05, 'profile', 'rise 0.50, from the side')}${fig(rise1, 'profile', 'hemisphere, from the side')}</main>
<h2>4. The radius control at its ends, one stamen, six on the disc, the absent default</h2>
<main class="three">${fig(spreadLo, 'centre', 'spread 0.60 — the roots fuse')}${fig(six, 'centre', 'spread 2.00 — the default')}${fig(spreadHi, 'centre', 'spread 6.00 — clamped at the hub')}</main>
<main class="three">${fig(one, 'centre', 'one stamen')}${fig(sixDisc, 'above', 'six on the disc, straight down')}${fig(dflt, 'centre', 'the shipping default — absent')}</main>
<h2>5. The byte claim, on the sheet</h2>
<main class="three">${fig(gatedSph, 'whole', 'every control at MAXIMUM under SPHERE — sha REQUIRED equal to the bare sphere\'s')}${fig(gatedInc, 'whole', 'every control at MAXIMUM under the incurve sphere — sha REQUIRED equal to the incurve sphere\'s')}${fig(gatedZero, 'whole', 'every sub-control at MAXIMUM with count 0 — sha REQUIRED equal to the default\'s')}</main>
<main class="three">${fig(bareSph, 'whole', 'the bare sphere')}${fig(incSph, 'whole', 'the incurve sphere')}${fig(dflt, 'whole', 'the shipping default')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
