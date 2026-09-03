/* ===================================================================
   THE CROWDING SHEET — the metric's validation, so it is load-bearing rather
   than decorative. Nobody has ever seen this region close up.

   WHAT IT SHOWS. The BASE of the bloom, cropped to the hub at readable
   magnification, for each configuration Eva has already ruled on by eye plus
   the unruled ones that sit near the threshold — with that configuration's
   crowding number printed in its caption. The metric is finished only when
   it separates configurations she has ruled on: the mum run must read badly,
   the shipping default and the depth cell clean. This sheet is where that is
   checked against the PICTURE rather than against the metric.

   THE PICTURE IS LIVE, THE NUMBER IS THE EXPORT, AND EVERY CAPTION SAYS SO.
   The app renders the live build (the print-preview toggle is parked in the
   charter), and the flag is about the artefact — footRing's area rule reads
   the export floor, so on the mum the ring is 3.63 mm live and 4.69 mm
   printed and the depth reads 17 live against 11 exported. Both are printed
   wherever they differ, on the print-truth line's discipline.

   EVERY CELL ASSERTS ITSELF. Chrome hidden and autoRotate off through the
   harness's asserted stillFrame(); whole state read back; the crowding
   module's own R1-R5 validity assertions run per cell (R1 against a real STL
   export, so the caption's number is the shipped geometry's); the frame is
   decoded and required to carry content (a blank or all-content frame is a
   framing failure, not a picture); and the caption is written from the SAME
   footCrowding() call the gates print — one owner for the number.

   WHAT THE CROP CANNOT SHOW: blade-to-blade crowding above the root, which
   the metric is blind to (bloom-crowding.mjs's header). The whole-bloom cell
   beside each crop exists so a reader can see the blades the base number
   says nothing about.

   RUN:  node tools/shot-bloom-crowding.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl, junctionAssertions } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, CROWDED_DMAX, CROWDING_SCOPE } from './bloom-crowding.mjs';

const outDir = process.argv[2] || '/tmp/bloom-crowding';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-crowding-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* THE BASE CROP. Framed on the origin at a radius proportional to the HUB,
   not to the bloom, so the base fills the frame whatever the petal length:
   the same magnification rule for every cell, which is what makes the cells
   comparable.

   FROM BELOW, AND THAT IS FORCED RATHER THAN CHOSEN. fitCamera puts the
   camera at 2.6 x the radius, so a hub-scale crop stands ~20 mm from the
   origin — INSIDE the canopy of a 60 mm blade, and the first render of the
   mum came back 99.8% content (the sheet's own frame check caught it). Every
   blade rises from the hub plane (tilt >= 0, and the foot rows are at z = 0
   exactly, J1), so the one half-space a close camera can stand in is below
   the plane. Two crops from there — a low oblique looking up at the roots
   leaving the ring, and a close crop targeted on the rim itself where the
   roots are the subject — plus the whole bloom for context. */
const VIEWS = [
  ['base', (hubR) => ({ r: Math.max(hubR * 2.0, 5), at: [0, 0, 0], dir: [0.35, -0.9, -0.45] })],
  /* THE RIM, close: targeted on the ring itself at azimuth 0, so the roots
     leaving it are the subject rather than the hub. */
  ['rim', (hubR) => ({ r: Math.max(hubR * 0.9, 3), at: [hubR * 0.85, 0, 0], dir: [0.55, -0.6, -0.55] })],
  ['whole', null],
];

async function cell({ label, set: sets = [], ruling, note = '' }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { label, set: sets });
  if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
  /* THE NUMBER, registered against a real export (R1). */
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download — the caption would carry a number registered against nothing`);
  const { bad: cb, r } = await footCrowding(page, { label, set: sets }, analyzeStl(buf));
  if (cb.length) await die(`${label}: ${cb.join('; ')}`);
  /* CHROME OFF ONLY NOW: the export click above needs the panel's button, and
     body.bl-preview hides the panel. Asserted, as every sheet asserts it. */
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => window.__bloomMetrics());

  const shots = {};
  for (const [view, frame] of VIEWS) {
    const file = path.join(outDir, `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${view}.png`);
    if (frame) { const f = frame(m.hubRadius); await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
    else await page.evaluate((rr) => window.__bloomFrame(rr, 0.15), m.fitRadius);
    await page.waitForTimeout(260);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 800, height: 800 } });
    /* THE FRAME CARRIES CONTENT. Background is the canvas's flat 0x0c0f0e; a
       frame under 2% content is a camera looking at nothing, and one over
       98% is a camera inside the model. Either is a framing failure. */
    const { width, height, data } = decodePNG(fs.readFileSync(file));
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    if (frac < 0.02 || frac > 0.98) await die(`${label}: the ${view} frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    shots[view] = path.basename(file);
  }
  console.log(`  ${label.padEnd(58)} ${crowdingLine(r)}`);
  return { label, ruling, note, shots, r, liveTris: m.liveTris };
}

const MUM = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 };
const cells = [];
cells.push(await cell({ label: 'THE MUM RUN — 120 continuous, spread 0.60, feet floored', set: set(MUM), ruling: 'RULED BAD (Eva, Sep 3, from the live page)',
  note: 'The run that opened this session: 40 per turn, 3 turns, spread 0.60, an 8 mm blade 60 mm long, shrink 0.80, tilt step +11°, sheet 0.60 and delicacy 0.25 — so every one of the 120 feet is floored at 1.60 mm wide and all 120 rings span 2.3 mm of radius in the export. The feet fuse into one mass. Both STL gates are green on this bloom and stay green; this number is the only thing in the project that says what the eye said. Note the live/export divergence in the caption: the picture is the live geometry, the flag is about the print.' }));
cells.push(await cell({ label: 'SHIPPING DEFAULTS — 8 petals, spread 2.00, DISC', set: [], ruling: 'RULED CLEAN (the shipping bloom)',
  note: 'The control every other cell is read against. Eight 6.4 mm feet on an 8.84 mm ring: at the ring they very nearly tile it (a 2.5° gap between neighbours), and they overlap each other only over the inner third of their run, where the depth reaches 2.' }));
cells.push(await cell({ label: 'LAYERED DEPTH CELL — 3 layers, size 0.90, tilt +12', set: set({ layerCount: 3, layerSize: 0.9 }), ruling: 'RULED CLEAN — "reads as depth" (the layers sheet)',
  note: 'The depth case from the layers sheet, which Eva ruled reads as depth: three nested whorls whose feet overlap radially by construction (that overlap is what chains the hub under layers). Three feet stack where layer 0 and layer 2 align (phase 0.50 twice is a whole slot) under a layer-1 foot. Clean to the eye at 3.' }));
cells.push(await cell({ label: 'CONTINUOUS HEADLINE — 40/turn x 3 turns, spread 1.55', set: set({ placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.55 }), ruling: 'RULED CLEAN — merged as what Eva was reaching for (session 7)',
  note: 'Eva\'s own configuration from the continuous-spiral session, the one she merged. The SAME 120 feet as the mum, arranged by the same golden angle over the same three turns — and it reads 5 where the mum reads 11. What differs is spread 1.55 against 0.60, a 6.4 mm foot on a 21 mm ring against a floored 1.6 mm foot on a 4.7 mm ring. This is the highest reading Eva has ruled clean, which is why the threshold sits above it with the unruled 6..10 in between.' }));
cells.push(await cell({ label: 'RADIAL x 40 — the intermediate', set: set({ petalCount: 40 }), ruling: 'UNRULED — predicted D_max 4 · D_mean ≈ 2.6 before it was measured; measured 4 · 2.52',
  note: 'The prediction row. Forty 6.4 mm feet on a 19.8 mm ring occupy the ring twice over and their inner ends 3.4 times over; the prediction was made from those two numbers before the raster ran and it held. Not ruled: Eva has not been asked whether a 40-petal single whorl reads crowded at the base.' }));
cells.push(await cell({ label: 'RADIAL x 40 x spread 0.60 — unruled, one below the threshold', set: set({ petalCount: 40, spread: 0.6 }), ruling: 'UNRULED — reads 10, below the threshold of ' + CROWDED_DMAX,
  note: 'The nearest unruled state to the line. Forty 6.4 mm feet on a 5.9 mm ring: the base is 96% double-covered and 80% at four or more. It prints unmarked because 6..10 are unruled — Eva\'s instruction was to see these in the printout rather than have them marked before she has looked at one. This cell is the look.' }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => {
  const r = c.r;
  const live = (r.liveDmax !== r.dmax || Math.abs(r.liveDmean - r.dmean) > 0.005)
    ? ` · <i>live render reads D_max ${r.liveDmax} · D_mean ${r.liveDmean.toFixed(2)} (ring ${r.hubRLive.toFixed(2)} mm)</i>` : '';
  return `<b>EXPORT: stack D_max ${r.dmax}</b> at r ${r.dmaxAt.r.toFixed(2)} mm · D_mean ${r.dmean.toFixed(2)} · ${r.n} feet of ${r.footW.toFixed(2)} mm on a ${r.hubR.toFixed(2)} mm hub · NN ${r.nn.q.toFixed(2)} w (gap ${r.nn.gap})${live}`
    + (r.crowded ? ` · <b class="flag">CROWDED (D_max &ge; ${CROWDED_DMAX})</b>` : '');
};
const fig = (c, view) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${view === 'base' ? 'base from below, low oblique' : view === 'rim' ? 'the rim, close' : 'whole bloom'})</i><br>`
  + `<small>${esc(c.ruling)} · ${Number(c.liveTris).toLocaleString('en-US')} tris (live)</small><br>${num(c)}`
  + (view === 'base' ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`;
const html = `<title>Foot crowding — the base, close up</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}.flag{color:#f0b060}</style>
<h1>Foot crowding — the base, close up</h1>
<p class="note"><b>EACH ROW IS ONE CONFIGURATION: the base cropped at a magnification set by its own hub radius (a low oblique from BELOW the hub plane, then the rim itself close up), then the whole bloom for context. From below because a camera close enough to read the base stands inside the canopy of a long blade from every other side; every blade rises from the hub plane, so beneath it is the one place the roots are unoccluded.</b> The number in every caption is the EXPORT's — the artefact — and the picture is the LIVE render, which is the only render the app has; where the two geometries differ the live reading is printed beside the export one. The metric is validated against these pictures and Eva's rulings on them, never against itself: the mum must read badly, the default and the depth cell clean.<br>
<b>The flag:</b> CROWDED at D_max &ge; ${CROWDED_DMAX} (Eva, Sep 3) — the only evidence is that 5 and below reads clean and 11 reads bad; 6..10 are unruled and print unmarked. A FLAG, not a gate: spread below 1.00 was ruled reachable on purpose (Aug 31), and over-connection is not a print defect.<br>
<b>What the crop cannot show:</b> the metric counts feet, and the feet lie inside the hub slab at its own thickness — what the eye sees is the blade roots leaving the ring, whose exit width IS the foot width. Blade-to-blade crowding above the root (short, wide blades at high tilt) moves nothing here; that instrument is recorded, not built. A clean D_max is a clean base, never a clean bloom.<br>
<b>Scope:</b> ${esc(CROWDING_SCOPE)}</p>
${cells.map((c) => `<h2>${esc(c.label)}</h2><main>${['base', 'rim', 'whole'].map((v) => fig(c, v)).join('')}</main>`).join('')}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
