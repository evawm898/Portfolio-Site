/* ===================================================================
   THE SPHERE SHEET — the full-sphere head (session 18), composed so Eva can
   rule on the two things this session leaves to her eye: whether the ball
   reads as ONE thing with no seam and no bald pole, and Q1b — whether lean 0
   (the primitive's own frame, everywhere) is the right aim for the face
   pole, or the faded lean (costed, not built) has to come.

   (1) THE INCURVE SLIDERS ON A SPHERE — the headline — from the side (the
       equator, where a seam would show), FACE-POLE CROP from above (the
       crowding question lives here), and the RESERVED POLE from below (clear
       of feet by construction, covered by converging blade tips — or not:
       that is a finding for the report, not something to patch).
   (2) THE CONTROL: the same sliders as a CAP at Head rise 1 — the hemisphere
       the sphere continues past its own rim — on the SAME camera, so what
       differs between the cells is the far half of the ball and the lean.
   (3) THE HIGH-K ROW: 40 per turn x 6 turns, 240 feet, the densest reachable
       pole, face-pole crop with its crowding number.
   (4) THE DEFAULT SPHERE (eight feet) and THE MUM'S SLIDERS on a sphere.
   (5) THE BYTE CLAIM ON THE SHEET ITSELF: Head rise 1 under SPHERE exports
       the same sha as the sphere at rise 0, and SPHERE stored under RADIAL
       the same sha as the shipping default — REQUIRED equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction assertions (S1-S4 among them) run before
   the shutter, the crowding number the EXPORT's registered against a real
   STL (R1) and measured on the sphere's own surface with the POLE READINGS
   in the caption, every frame decoded and required to carry content.

   RUN:  node tools/shot-bloom-sphere.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, CROWDED_DMAX } from './bloom-crowding.mjs';

const outDir = process.argv[2] || '/tmp/bloom-sphere';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-sphere-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* The framings. `dir` is the direction from the target TO the camera.
   `face` looks down onto the face pole from 25 degrees off the axis at a
   magnification set by the sphere's radius; `faceDown` straight down it;
   `reserved` up at the far pole from below; `profile` at the equator from
   the side, where a seam would show. */
/* EVERY POLE CAMERA STANDS OUTSIDE THE CANOPY, and the canopy is the BLADES,
   not the sphere: the mum's 60 mm florets on a 4.69 mm ball put a camera at
   1.35 R deep inside them (the second render did exactly that). So each
   frame is the larger of a multiple of the sphere's radius and a fraction of
   the model's own bounding-sphere radius (`fit`, reported by the app), which
   is what the blades reach. */
const VIEWS = {
  whole: null,
  profile: (R, f) => ({ r: Math.max(R * 3.2, f.fit * 1.1, 8), at: [0, 0, 0], dir: [0.12, -0.99, 0.06] }),
  /* THE FACE-POLE CAMERAS STAND OUTSIDE THE CANOPY: the incurve florets are
     20 mm long and curl 150 degrees at the pole, so a camera at 1.35 R (the
     reserved pole's magnification) sits INSIDE them and photographs blade
     sides — the first render did exactly that and passed the content check.
     2.8 R clears a 20 mm blade on a 12.5 mm sphere with the pole still the
     subject; the reserved pole keeps the tighter frame because its blades
     point AWAY from the camera there. */
  face: (R, f) => ({ r: Math.max(R * 2.8, f.fit * 0.8, 10), at: [0, 0, R], dir: [0.3, -0.3, 0.9] }),
  faceDown: (R, f) => ({ r: Math.max(R * 2.8, f.fit * 0.8, 10), at: [0, 0, R], dir: [0.03, -0.03, 1] }),
  reserved: (R, f) => ({ r: Math.max(R * 1.35, f.fit * 0.6, 5), at: [0, 0, -R], dir: [0.3, -0.3, -0.9] }),
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
    if (VIEWS[view]) { const f = VIEWS[view](frame.R, frame); f.r *= scale; await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
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

async function cell({ label, set: sets = [], views = ['whole', 'profile', 'face', 'reserved'], ruling = '', note = '', frame = null }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const { bad: cb, r } = await footCrowding(page, { label, set: sets }, analyzeStl(buf));
  if (cb.length) await die(`${label}: ${cb.join('; ')}`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const own = { R: m0.hubRadius, fit: m0.fitRadius };
  const fr = frame || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const rec = { label, tag: modeTag(m), ruling, note, shots, widened, r, own, sha: sha(buf), bytes: buf.length,
    shownTris: m.shownTris, hub: m.hubRadius, foot: m.ringWidth, maxDim: m.maxDimMm, dome: m.hubDome, seat: m.centerSeat, sphere: m.sphereMode === true,
    rings: m.rings.length, readoutFirst: readout.split('\n')[0],
    headLine: (readout.split('\n').find((l) => /^HEAD/.test(l)) || '') };
  console.log(`  ${label.padEnd(60)} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  console.log(`  ${''.padEnd(60)} ${crowdingLine(r)}`);
  return rec;
}

const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const MUM = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 };
const SPH = { placement: 'CONTINUOUS', hubShape: 'SPHERE' };

console.log('THE SPHERE SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');
const incSph = await cell({ label: 'INCURVE sliders — FULL SPHERE', set: set({ ...INCURVE, ...SPH }), ruling: 'THE HEADLINE — rule Q1b from the face-pole crop',
  note: '40 per turn x 3 turns pole to pole (120 feet, equal-area), spread 1.60, 20 mm florets, tilt 75, curl 150, ALL THIN feet. Lean 0: every blade leaves the surface at its authored tilt from the local tangent, heading away from the face pole. The reserved pole is clear of feet by construction; whether the blades COVER it, and whether the face pole reads bald or reflexed, is what this cell is for.' });
const incCap = await cell({ label: 'INCURVE sliders — CAP at Head rise 1 (the control)', set: set({ ...INCURVE, headRise: 1 }), frame: incSph.own, views: ['whole', 'profile', 'face'], ruling: 'THE CONTROL — the hemisphere the sphere continues past its own rim, same camera',
  note: 'The same sliders on the cap at a hemisphere: the same sphere radius, the upper half only, with the cap\'s restore-the-flat-aim lean (domeLean = slope). What differs from the cell beside it is the far half of the ball and the lean.' });
const dense = await cell({ label: '40 per turn x 6 turns — FULL SPHERE (240 feet)', set: set({ ...SPH, petalCount: 40, layerCount: 6 }), ruling: 'THE HIGH-K ROW — the face pole at its densest',
  note: 'The densest reachable pole: 240 feet, the nearest 1.14 mm from each pole on a hub this size, feet crossing the face pole. The caption carries the crowding at the face pole and at the reserved pole within one equal-area step of each.' });
const dflt = await cell({ label: 'shipping sliders — FULL SPHERE (eight feet)', set: set(SPH), views: ['whole', 'profile', 'reserved'], ruling: 'the sparse case', note: 'Eight petals on one turn, pole to pole: what the mode does with the shipping sliders. Each foot owns an eighth of the sphere.' });
const mum = await cell({ label: 'the mum sliders — FULL SPHERE', set: set({ ...MUM, ...SPH }), ruling: 'the ruled-bad base on a sphere',
  note: '120 floored feet on a 4.69 mm sphere (printed). Over-subscribed on the cap (D_max 11 flat, 9 on a hemisphere); on the sphere the feet have the whole surface.' });

/* THE BYTE CLAIM, on the sheet: the two GATED inertness pairs. */
const gatedRise = await cell({ label: 'GATED — Head rise 1 under SPHERE (hidden and inert)', set: set({ ...INCURVE, ...SPH, headRise: 1 }), views: ['whole'], ruling: 'must export the incurve sphere\'s own sha' });
if (gatedRise.sha !== incSph.sha) await die(`Head rise 1 under SPHERE exported ${gatedRise.sha}, the sphere at rise 0 exported ${incSph.sha} — the hidden slider reached the geometry`);
const dfltCap = await cell({ label: 'CONTROL — the shipping default (RADIAL, CAP, flat)', set: [], views: ['whole'], ruling: 'the shipping default, unchanged' });
const gatedStored = await cell({ label: 'GATED — SPHERE stored under RADIAL (hidden and inert)', set: set({ hubShape: 'SPHERE' }), views: ['whole'], ruling: 'must export the shipping default\'s own sha' });
if (gatedStored.sha !== dfltCap.sha) await die(`SPHERE stored under RADIAL exported ${gatedStored.sha}, the default exported ${dfltCap.sha} — a hidden enum reached the geometry`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => {
  const r = c.r;
  return `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · foot ${c.foot.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · max dim ${c.maxDim.toFixed(1)} mm · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB)`
    + (c.dome && c.dome.closed ? `<br>FULL SPHERE: radius ${c.dome.Rd.toFixed(2)} mm${c.dome.clamped ? ' (CLAMPED at one sheet)' : ''} · ${c.dome.K} feet pole to pole · reserved pole clear by ${c.dome.reserved.mm.toFixed(2)} mm (${c.dome.reserved.deg.toFixed(2)}°) · nearest foot end to the face pole ${c.dome.faceReach.mm.toFixed(2)} mm${c.dome.faceReach.crossing ? ` (${c.dome.faceReach.crossing} feet cross it)` : ''}` : c.dome ? `<br>CAP: rise ${c.dome.riseBuilt.toFixed(2)} · radius ${c.dome.Rd.toFixed(2)} mm · lean = slope` : '<br>flat hub')
    + `<br>CROWDING (export, on the surface): D_max ${r.dmax}${r.dome && r.dome.dmaxPolarDeg != null ? ` at polar ${r.dome.dmaxPolarDeg.toFixed(1)}°` : r.dmaxAt ? ` at r ${r.dmaxAt.r.toFixed(2)} mm` : ''} · D_mean ${r.dmean.toFixed(2)} · ${r.n} feet`
    + (r.dome && r.dome.poles ? ` · <b>at the FACE pole D ${r.dome.poles.face}, at the RESERVED pole D ${r.dome.poles.reserved}</b> (within ${r.dome.poles.withinMm.toFixed(2)} mm, one equal-area step)` : '')
    + (r.crowded ? ` · <b class="flag">CROWDED (D_max &ge; ${CROWDED_DMAX})</b>` : '')
    + (c.seat ? `<br>SEAT: ${c.seat.fullFootprint ? 'the whole footprint' : `a ${c.seat.patchRadius.toFixed(2)} mm patch of the ${c.seat.footprint.toFixed(2)} mm footprint`} overlaps the shell · rim hovers ${c.seat.hover.toFixed(2)} mm` : '');
};
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x to clear the canopy` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}`
  + (c.headLine ? `<br><small>${esc(c.headLine)}</small>` : '') + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`;
const html = `<title>The full-sphere head</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}.flag{color:#f0b060}</style>
<h1>The full-sphere head — CAP / SPHERE, session 18</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the crowding number is the export's, registered against a real STL of that cell and measured on the sphere's own surface (pole to pole, in the surface's coordinates), with the deepest cell within one equal-area step of EACH pole printed for Q1b. The headline pair shares one camera sized from the sphere. Threshold: CROWDED at D_max &ge; ${CROWDED_DMAX} (Eva, Sep 3). Lean is 0 on every sphere cell (Eva's ruling); the faded lean is costed in the outcome doc and not built — this sheet is what decides whether it has to be.</p>
<h2>1. The incurve sliders — sphere beside the cap at a hemisphere, same camera, from the side</h2>
<main>${fig(incSph, 'profile', 'the equator from the side')}${fig(incCap, 'profile', 'the equator from the side')}</main>
<main>${fig(incSph, 'whole', 'whole bloom')}${fig(incCap, 'whole', 'whole bloom')}</main>
<h2>2. The FACE POLE — rule Q1b here</h2>
<main>${fig(incSph, 'face', 'face pole from 25° off the axis')}${fig(incCap, 'face', 'face pole from 25° off the axis')}</main>
<main>${fig(incSph, 'faceDown', 'straight down the axis onto the face pole')}${fig(dense, 'faceDown', 'straight down the axis onto the face pole')}</main>
<h2>3. The RESERVED POLE from below — clear of feet by construction; is it covered by the blades?</h2>
<main class="three">${fig(incSph, 'reserved', 'the reserved pole from below')}${fig(dense, 'reserved', 'the reserved pole from below')}${fig(mum, 'reserved', 'the reserved pole from below')}</main>
<h2>4. The high-K row, the sparse case and the mum's sliders</h2>
<main class="three">${fig(dense, 'whole', 'whole bloom')}${fig(dflt, 'whole', 'whole bloom')}${fig(mum, 'whole', 'whole bloom')}</main>
<main class="three">${fig(dense, 'face', 'face pole')}${fig(dflt, 'profile', 'the equator from the side')}${fig(mum, 'face', 'face pole')}</main>
<h2>5. The byte claim, on the sheet</h2>
<main class="three">${fig(gatedRise, 'whole', 'Head rise 1 under SPHERE — sha REQUIRED equal to the headline\'s')}${fig(dfltCap, 'whole', 'the shipping default')}${fig(gatedStored, 'whole', 'SPHERE stored under RADIAL — sha REQUIRED equal to the default\'s')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
