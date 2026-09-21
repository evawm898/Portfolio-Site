/* ===================================================================
   THE DOME SHEET — the domed hub, composed for the INCURVE (Eva, Sep 4).

   ITS JOB IS THE INCURVE MUM, not a prettier spider. The acceptance picture
   is an incurve attempt: short florets, a dense round head. So:

   (1) THE INCURVE TARGET, FLAT HUB BESIDE DOMED HUB — same page, same
       sliders, same camera, PRINT PREVIEW ON on both; only Head rise differs
       (0 against 0.50). This pair is the entire argument. Flat, the florets
       at tilt 75 and curl 150 fold over into a closed bud; on the cap the
       tangent-plane feet lean the outer florets out and the ball opens.
   (2) A BASE CROP OF EACH, at a magnification set by the hub, with the
       crowding number in the caption — from a LOW PROFILE at the rim (Eva,
       Sep 4), because a domed shell hides the inner roots from below and the
       flat disc and the shell are indistinguishable from there; and from
       below, because that is where the flat base has always been read.
   (3) EVA'S MUM RUN, flat beside domed, the same treatment — the config that
       motivated this. The dome is expected to RELIEVE its crowding, not fix
       it: predicted D_max 11 -> 10 at rise 0.50 and 9 at a hemisphere, the
       relief sitting at the rim and the peak at the inner rings.
   (4) CONTROLS: the shipping default and the session-7 layered bloom, both
       at rise 0, unchanged, with their crowding numbers.
   (5) THE CENTRE SEAT cells that stood here (the DISC button on the apex,
       Eva's Sep 4 requirement) went with the centre rig in session 20; the
       apex is bare until the androecium lands.

   EVERY CELL STATES ITS MODE from the app's own shownMode through the
   harness's modeTag(); the crowding number is the export's, registered
   against a real STL (R1) and read on the cap's own surface; chrome hidden
   and auto-rotate off through the asserted stillFrame(); whole state read
   back; the junction assertions (J1 re-derived, J3, J8) run before the
   shutter; every frame is decoded and required to carry content. Every
   pair is shot with ONE camera sized from the FLAT twin's live geometry, so
   what differs between the two cells is the object.

   RUN:  node tools/shot-bloom-dome.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { footCrowding, crowdingLine, CROWDED_DMAX } from './bloom-crowding.mjs';

const outDir = process.argv[2] || '/tmp/bloom-dome';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-dome-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/* The framings. `base` from below at hub magnification (the crowding sheet's
   rule); `profile` a low view from just above the rim plane, targeted on the
   rim, where a flat plate and a domed shell read differently and the roots
   leaving the cap are the subject. */
const VIEWS = {
  base: (hubR) => ({ r: Math.max(hubR * 2.0, 5), at: [0, 0, 0], dir: [0.35, -0.9, -0.45] }),
  profile: (hubR) => ({ r: Math.max(hubR * 1.6, 5), at: [0, 0, hubR * 0.25], dir: [0.15, -0.98, 0.12] }),
  whole: null,
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* A camera close enough to read a base stands inside the canopy of a long
   blade from most sides (the crowding sheet's finding); the profile view
   therefore WIDENS in bounded steps when the decoded frame comes back all
   content, and dies rather than write a picture nobody should rule from if
   four steps do not clear it. Returns the factor that finally framed the
   cell, so the caption can say it. */
async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (VIEWS[view]) { const f = VIEWS[view](frame.hub, frame); f.r *= scale; await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
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

/* One configuration, PRINT PREVIEW ON, photographed with a given camera
   frame (or its own, sized from its live geometry). Returns the record. */
async function cell({ label, set: sets = [], views = ['profile', 'base', 'whole'], ruling = '', note = '', frame = null }) {
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
  /* THE CAMERA IS SIZED FROM THE LIVE GEOMETRY, and a pair shares the flat
     twin's — read before the preview goes on. */
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const own = { hub: m0.hubRadius, fit: m0.fitRadius, apexZ: m0.hubDome ? m0.hubDome.H : 0 };
  const fr = frame || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const rec = { label, tag: modeTag(m), ruling, note, shots, widened, r, own,
    shownTris: m.shownTris, hub: m.hubRadius, foot: m.ringWidth, maxDim: m.maxDimMm, dome: m.hubDome,
    rings: m.rings.length, inner: Math.min(...m.rings.map((x) => x.radius)),
    reliefRim: m.rings[0].relief, reliefInner: m.rings.reduce((a, x) => (x.radius < a.radius ? x : a), m.rings[0]).relief,
    readoutFirst: readout.split('\n')[0], domeLine: (readout.split('\n').find((l) => /^HEAD RISE/.test(l)) || '') };
  console.log(`  ${label.padEnd(56)} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} · ${modeTag(m)}${m.hubDome ? ` · rise ${m.hubDome.riseBuilt.toFixed(2)}` : ''}`);
  console.log(`  ${''.padEnd(56)} ${crowdingLine(r)}`);
  return rec;
}

const MUM = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 0.6, petalLength: 60, petalWidth: 8, layerSize: 0.8, layerTilt: 11, sheetThickness: 0.6, footDelicacy: 0.25 };
const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const S7 = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.55 };

console.log('THE DOME SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');
const incFlat = await cell({ label: 'INCURVE TARGET — flat hub', set: set(INCURVE), ruling: 'THE PAIR (flat half)',
  note: '40 per turn x 3 turns, spread 1.60, 20 mm florets (the slider\'s floor; the brief\'s 15 mm is below it), 8 mm wide, shrink 0.90, tilt 75, tilt step 5, spine curl 150, sheet 0.60, delicacy 0.25. On a flat plate the florets fold over into a closed bud.' });
const incDome = await cell({ label: 'INCURVE TARGET — domed hub, head rise 0.50', set: set({ ...INCURVE, headRise: 0.5 }), ruling: 'THE PAIR (domed half) — the entire argument', frame: incFlat.own,
  note: 'The same sliders with Head rise 0.50: the junction shell is a spherical cap, every foot lands on it at its own height with its normal, the outer florets lean out and the head opens into a ball. Pre-registered crowding on the cap: D_max 5 / D_mean 1.89 from the area-ratio rule; the caption carries what the instrument measured.' });
const mumFlat = await cell({ label: 'THE MUM RUN — flat hub', set: set(MUM), ruling: 'RULED BAD (Eva, Sep 3): the fused base', note: 'The run that motivated the dome. 120 feet floored at 1.60 mm on a 4.69 mm printed ring.' });
const mumDome = await cell({ label: 'THE MUM RUN — domed hub, head rise 0.50', set: set({ ...MUM, headRise: 0.5 }), ruling: 'PREDICTED D_max 10 — relieved, not fixed', frame: mumFlat.own,
  note: 'Expected to roughly relieve, not halve: the cap\'s extra surface sits at the rim where the slope is steep, and the mum\'s peak sits at the inner rings where the cap is nearly flat. Still over-subscribed at 120 florets is the honest result.' });
const mumHemi = await cell({ label: 'THE MUM RUN — a hemisphere, head rise 1.00', set: set({ ...MUM, headRise: 1 }), ruling: 'PREDICTED D_max 9 (the area-ratio rule said 5)', frame: mumFlat.own,
  note: 'The most the dome can do for this run. The whole-annulus surface-to-plan ratio is 2.0x; the local relief at its peak is 1.1x.' });
const ctlDefault = await cell({ label: 'CONTROL — shipping defaults, head rise 0', set: [], ruling: 'RULED CLEAN — unchanged', note: 'Byte-identical to main: the guard takes the flat path verbatim.' });
const ctlS7 = await cell({ label: 'CONTROL — the session-7 layered bloom, head rise 0', set: set(S7), ruling: 'RULED CLEAN, merged — unchanged', note: '40 per turn x 3 at spread 1.55; the highest reading Eva has ruled clean, untouched by this session.' });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rel = (x) => (isFinite(x) ? `${x.toFixed(2)}x` : 'vertical');
const num = (c) => {
  const r = c.r;
  return `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · innermost ring ${c.inner.toFixed(2)} mm · foot ${c.foot.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · max dim ${c.maxDim.toFixed(1)} mm`
    + (c.dome ? `<br>DOME: rise ${c.dome.riseBuilt.toFixed(2)}${c.dome.clamped ? ` (CLAMPED from ${c.dome.rise.toFixed(2)})` : ''} · cap radius ${c.dome.Rd.toFixed(2)} mm · apex ${c.dome.H.toFixed(2)} mm above the rim · surface ${c.dome.surfaceToPlan.toFixed(2)}x plan over the feet · local relief ${rel(c.reliefRim)} at the rim, ${rel(c.reliefInner)} at the innermost ring` : '<br>flat hub')
    + `<br>CROWDING (export, on the surface): D_max ${r.dmax} at r ${r.dmaxAt.r.toFixed(2)} mm · D_mean ${r.dmean.toFixed(2)} · ${r.n} feet`
    + (r.dome ? ` · local relief at D_max ${rel(r.dome.reliefAtDmax)}` : '')
    + (r.liveDmax !== r.dmax ? ` · live geometry reads D_max ${r.liveDmax}` : '') + (r.crowded ? ` · <b class="flag">CROWDED (D_max &ge; ${CROWDED_DMAX})</b>` : '');
};
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x to clear the canopy` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}`
  + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`;
const html = `<title>The domed hub, for the incurve</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}.flag{color:#f0b060}</style>
<h1>The domed hub — Head rise, for the incurve</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b> — the export-floored geometry, read back from the app's own shownMode after the real box was flipped — with chrome hidden and auto-rotate off, asserted. Each pair shares one camera sized from its flat twin. The crowding number is the export's, registered against a real STL of that cell (R1) and measured ON THE CAP's surface; the local relief at the D_max point is printed beside the rim's, because the dome relieves radial stacking most where the slope is steepest and least near the apex. Threshold: CROWDED at D_max &ge; ${CROWDED_DMAX} (Eva, Sep 3).</p>
<h2>1. The incurve target — flat hub beside domed hub, same camera</h2>
<main>${fig(incFlat, 'whole', 'whole bloom')}${fig(incDome, 'whole', 'whole bloom')}</main>
<h2>2. The base of each — low profile at the rim, then from below, hub magnification</h2>
<main>${fig(incFlat, 'profile', 'low profile at the rim')}${fig(incDome, 'profile', 'low profile at the rim')}</main>
<main>${fig(incFlat, 'base', 'base from below')}${fig(incDome, 'base', 'base from below')}</main>
<h2>3. Eva's mum run — flat, domed at 0.50, and a hemisphere</h2>
<main class="three">${fig(mumFlat, 'whole', 'whole bloom')}${fig(mumDome, 'whole', 'whole bloom')}${fig(mumHemi, 'whole', 'whole bloom')}</main>
<main class="three">${fig(mumFlat, 'profile', 'low profile at the rim')}${fig(mumDome, 'profile', 'low profile at the rim')}${fig(mumHemi, 'profile', 'low profile at the rim')}</main>
<main class="three">${fig(mumFlat, 'base', 'base from below')}${fig(mumDome, 'base', 'base from below')}${fig(mumHemi, 'base', 'base from below')}</main>
<h2>4. Controls — unchanged at head rise 0</h2>
<main>${fig(ctlDefault, 'whole', 'whole bloom')}${fig(ctlS7, 'whole', 'whole bloom')}</main>
<main>${fig(ctlDefault, 'base', 'base from below')}${fig(ctlS7, 'base', 'base from below')}</main>
<p class="note">Section 5 of this sheet — the centre seat on the apex — went with the centre rig in session 20; the apex is bare.</p>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
