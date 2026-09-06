/* ===================================================================
   THE GYNOECIUM SHEET (session 22, phase 2 B3) — composed so Eva can rule
   on the three things she asked to see, none of which any earlier sheet
   could show:

   (1) ALL FOUR CENTRE STATES ON ONE ROW — androecium present / absent by
       gynoecium present / absent, on one camera: the bare apex (the
       shipping default), six stamens alone, the style alone, and both.
   (2) THE PILL AND THE TRIFID TOGETHER AT BOTH COUNT EXTREMES. She ruled
       the pill at 120 and the trifid above six, in different contexts, and
       has never seen the pair: the style among SIX on a ring and the style
       through the 120-stamen CUSHION, from 40 degrees off the axis, from
       the side, and (the cushion) straight down.
   (3) THE FILAMENT CURL AT +-180 AGAIN — the range that shipped unruled in
       B2: six filaments at -180 and +180 from the side and from above, and
       the same two beside the style, because at +180 the filaments cross
       the axis the style stands on (the STYLE line says where the stigma
       stands against the highest anther).
   Plus the style's own range — length at both ends beside six stamens (the
   stigma BELOW the anthers at 5 mm, well above at 40), curl at both ends,
   the cap's apex at a hemisphere, the fat style on a 2.40 sheet — and THE
   BYTE CLAIM ON THE SHEET: every gynoecium control at maximum under SPHERE
   exports the bare sphere's own sha, the WHOLE centre at maximum under
   SPHERE the bare sphere's, under the incurve sphere the incurve sphere's,
   and every sub-control at maximum with NONE the default's — REQUIRED
   equal, or no sheet.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode),
   chrome hidden, auto-rotate off through the asserted stillFrame(), whole
   state read back, the junction, androecium (JS1-JS4) AND gynoecium
   (JG1-JG4) assertions run before the shutter, the STL sha of that cell,
   every frame decoded and required to carry content. Captions are the
   app's own STAMENS, STYLE and SLENDERNESS lines, never re-derived.

   RUN:  node tools/shot-bloom-gynoecium.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, stamenAssertions, gynoeciumAssertions, settleBuild, modeTag, shownModeOf,
         ANTHER_DIAMETER_FACTOR, ANTHER_LENGTH_FACTOR, STIGMA_LOBES, STIGMA_LOBE_SPREAD_DEG } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-gynoecium';
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-gynoecium-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* The framings. `f` carries the cell's own numbers: the hub radius, the
   androecium's radius and the LONGER of the two rods (filament, style),
   the model's fit radius. Sized from the centre, not the petals — the
   androecium sheet's own rule, and a style on a bare apex is 1 mm across. */
const reach = (f) => Math.max(f.R * 1.3, f.A + f.L * 0.9, 6);
const VIEWS = {
  whole: null,
  above: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.5], dir: [0.02, -0.02, 1] }),
  centre: (f) => ({ r: reach(f), at: [0, 0, f.L * 0.45], dir: [0.45, -0.45, 0.77] }),
  /* 20 degrees up, the androecium sheet's measured camera: the tilted
     petals stood in front of the curl loops at 8 degrees. */
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
  const gyn = await gynoeciumAssertions(page, { label, set: sets });
  if (gyn.length) await die(`${label}: gynoecium: ${gyn.join('; ')}`);
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
  const A = m.androecium, G = m.gynoecium;
  const own = { R: m.hubRadius, A: A ? A.radius : 0, L: Math.max(A ? A.length : 0, G ? G.length : 0), fit: m.fitRadius };
  const fr = frame || own;
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const lines = readout.split('\n');
  const rec = { label, tag: modeTag(m), ruling, note, shots, widened, own, sha: sha(buf), bytes: buf.length, tris: stl.tris, boundary: stl.boundary,
    shownTris: m.shownTris, hub: m.hubRadius, A: A ? { ...A, stamens: undefined } : null, G: G ? { ...G } : null, near: m.stamenNearest,
    readoutFirst: lines[0], stamenLine: lines.find((l) => /^STAMENS /.test(l)) || '', styleLine: lines.find((l) => /^STYLE /.test(l)) || '',
    slenderLine: lines.find((l) => /^SLENDERNESS /.test(l)) || '', headLine: lines.find((l) => /^HEAD/.test(l)) || '' };
  console.log(`  ${label.padEnd(72)} hub ${m.hubRadius.toFixed(2)} tris ${m.shownTris} sha ${rec.sha} · ${modeTag(m)}`);
  if (rec.stamenLine) console.log(`  ${''.padEnd(72)} ${rec.stamenLine}`);
  if (rec.styleLine) console.log(`  ${''.padEnd(72)} ${rec.styleLine}`);
  if (rec.slenderLine) console.log(`  ${''.padEnd(72)} ${rec.slenderLine}`);
  return rec;
}

const SIX = { stamenCount: 6 };
const DISC120 = { stamenCount: 120, stamenLayout: 'DISC' };
const STYLE = { gynoecium: 'STYLE' };
const SPH = { placement: 'CONTINUOUS', hubShape: 'SPHERE' };
const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const STAMEN_MAX = { stamenCount: 120, stamenLayout: 'DISC', stamenSpread: 6, stamenLength: 40, stamenCurl: 180 };
const STYLE_MAX = { gynoecium: 'STYLE', styleLength: 40, styleCurl: 180 };

console.log('THE GYNOECIUM SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS1-JS4 and JG1-JG4 asserted before the shutter.\n');
/* 1. The four states, on ONE camera — the "both" cell's own frame. */
const both = await cell({ label: 'BOTH — the style among SIX on a ring', set: set({ ...SIX, ...STYLE }), views: ['whole', 'centre', 'profile', 'above'], ruling: 'THE FOUR STATES — both present; THE PAIR at six', note: 'One style on the axis, one sheet thick (1.20 mm), 25 mm free above the hub, tipped with the TRIFID — three lobes of the anther\'s own proportion (1.92 x 4.80 mm) at 40 degrees; six filaments at 20 mm around it. The stigma stands 5 mm above the highest anther: the STYLE line says so in millimetres.' });
const none = await cell({ label: 'NONE — the shipping default (the bare apex)', set: [], frame: both.own, views: ['whole', 'centre'], ruling: 'THE FOUR STATES — neither present: unchanged, 10,080 triangles' });
const stamensOnly = await cell({ label: 'ANDROECIUM only — six on a ring', set: set(SIX), frame: both.own, views: ['centre'], ruling: 'THE FOUR STATES — stamens alone (B2\'s six-stamen candidate)' });
const styleOnly = await cell({ label: 'GYNOECIUM only — the style on the bare apex', set: set(STYLE), frame: both.own, views: ['centre', 'profile'], ruling: 'THE FOUR STATES — the style alone', note: 'The trifid on its own: three lobes sharing the tip, each a pill of the anther\'s proportion, so the pill and the trifid read on one scale.' });
/* 2. The pair at 120. */
const cushion = await cell({ label: 'BOTH — the style through the 120-stamen CUSHION', set: set({ ...DISC120, ...STYLE }), views: ['whole', 'above', 'centre', 'profile'], ruling: 'THE PAIR at 120 — the trifid against the cushion Phase A said a knob would be lost in', note: 'The Vogel disc CLAMPED at the hub (8.24 mm), the anthers fused at 1.16 mm; the style rises through the middle of the disc and the stigma stands 5 mm above the anther tops.' });
/* 3. The filament curl at +-180 again — alone (B2's cells) and beside the style. */
const curlN = await cell({ label: 'SIX on a RING, curl -180 — reflexed outward', set: set({ ...SIX, stamenCurl: -180 }), frame: both.own, views: ['centre', 'profile', 'above'], ruling: 'THE CURL RANGE, low end — unruled in B2' });
const curlP = await cell({ label: 'SIX on a RING, curl +180 — bent in over the centre', set: set({ ...SIX, stamenCurl: 180 }), frame: both.own, views: ['centre', 'profile', 'above'], ruling: 'THE CURL RANGE, high end — unruled in B2', note: 'At +180 with 20 mm filaments the six arch over the centre and CROSS THE AXIS; the anthers come out below the hub plane on the far side.' });
const curlNS = await cell({ label: 'SIX at curl -180 beside the style', set: set({ ...SIX, stamenCurl: -180, ...STYLE }), frame: both.own, views: ['profile', 'above'], ruling: 'THE CURL RANGE, low end, with the style' });
const curlPS = await cell({ label: 'SIX at curl +180 beside the style — the filaments cross the axis the style stands on', set: set({ ...SIX, stamenCurl: 180, ...STYLE }), frame: both.own, views: ['profile', 'above'], ruling: 'THE CURL RANGE, high end, with the style', note: 'The filaments\' half-turn (6.4 mm bend radius) lands each anther one bend diameter across from its root, straight through the axis — where the style now is. Every solid is closed and the export is one piece; whether +180 is a range worth keeping beside a style is the question these cells put.' });
/* 4. The style's own range. */
const len5 = await cell({ label: 'style length 5 among six — the stigma BELOW the anthers', set: set({ ...SIX, ...STYLE, styleLength: 5 }), frame: both.own, views: ['centre', 'profile'], ruling: 'the length slider\'s low end (the STYLE line says BELOW)' });
const len40 = await cell({ label: 'style length 40 among six — L/d 33', set: set({ ...SIX, ...STYLE, styleLength: 40 }), views: ['centre', 'profile'], ruling: 'the length slider\'s high end' });
const sCurlN = await cell({ label: 'style curl -180', set: set({ ...STYLE, styleCurl: -180 }), frame: both.own, views: ['profile', 'centre'], ruling: 'the style curl\'s low end — the same law as the filament\'s, at azimuth 0' });
const sCurlP = await cell({ label: 'style curl +180 — bent over the apex', set: set({ ...STYLE, styleCurl: 180 }), frame: both.own, views: ['profile', 'centre'], ruling: 'the style curl\'s high end' });
const rise1 = await cell({ label: 'the style x Head rise 1 — rooted at the cap\'s apex', set: set({ ...SIX, ...STYLE, headRise: 1 }), frame: both.own, views: ['profile', 'centre'], ruling: 'the apex of a hemisphere: the root exactly on the pole, the normal exactly +z (JG1)' });
const fat = await cell({ label: 'the style on a 2.40 sheet — the fat style', set: set({ ...SIX, ...STYLE, sheetThickness: 2.4 }), views: ['centre', 'profile'], ruling: 'Part thickness owns the style\'s diameter: 2.40 mm here, the lobes 3.84 x 9.60' });

/* 5. THE BYTE CLAIM, on the sheet: the GATED inertness pairs. */
const bareSph = await cell({ label: 'CONTROL — the bare SPHERE (shipping sliders)', set: set(SPH), views: ['whole'], ruling: 'the bare sphere' });
const gatedSph = await cell({ label: 'GATED — every gynoecium control at MAXIMUM under SPHERE (hidden and inert)', set: set({ ...SPH, ...STYLE_MAX }), views: ['whole'], ruling: 'must export the bare sphere\'s own sha' });
if (gatedSph.sha !== bareSph.sha) await die(`the gynoecium at maximum under SPHERE exported ${gatedSph.sha}, the bare sphere ${bareSph.sha} — the hidden section reached the geometry`);
const gatedBoth = await cell({ label: 'GATED — the WHOLE centre at MAXIMUM under SPHERE (both parts hidden and inert)', set: set({ ...SPH, ...STAMEN_MAX, ...STYLE_MAX }), views: ['whole'], ruling: 'must export the bare sphere\'s own sha' });
if (gatedBoth.sha !== bareSph.sha) await die(`the whole centre at maximum under SPHERE exported ${gatedBoth.sha}, the bare sphere ${bareSph.sha}`);
const incSph = await cell({ label: 'CONTROL — the INCURVE sphere', set: set({ ...INCURVE, ...SPH }), views: ['whole'], ruling: 'the incurve sphere' });
const gatedInc = await cell({ label: 'GATED — every gynoecium control at MAXIMUM under the INCURVE sphere', set: set({ ...INCURVE, ...SPH, ...STYLE_MAX }), views: ['whole'], ruling: 'must export the incurve sphere\'s own sha' });
if (gatedInc.sha !== incSph.sha) await die(`the gynoecium at maximum under the incurve sphere exported ${gatedInc.sha}, the bare incurve sphere ${incSph.sha}`);
const gatedNone = await cell({ label: 'GATED — every sub-control at MAXIMUM with NONE (hidden and inert)', set: set({ ...STYLE_MAX, gynoecium: 'NONE' }), views: ['whole'], ruling: 'must export the shipping default\'s own sha' });
if (gatedNone.sha !== none.sha) await die(`the sub-controls at maximum with NONE exported ${gatedNone.sha}, the default ${none.sha} — a hidden slider reached the geometry`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · hub ${c.hub.toFixed(2)} mm · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export, boundary ${c.boundary})`
  + (c.stamenLine ? `<br>${esc(c.stamenLine)}` : '') + (c.styleLine ? `<br>${esc(c.styleLine)}` : '') + (c.slenderLine ? `<br>${esc(c.slenderLine)}` : '')
  + (!c.A && !c.G ? '<br>no androecium, no gynoecium — the bare apex' : '')
  + (c.headLine ? `<br><small>${esc(c.headLine)}</small>` : '');
const fig = (c, view, cap) => { if (!c.shots[view]) throw new Error(`${c.label}: the page references a "${view}" frame this cell never shot`); return `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${esc(c.ruling)} · read-out: "${esc(c.readoutFirst)}"</small><br>${num(c)}` + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`; };
const html = `<title>The gynoecium</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}main.four{grid-template-columns:repeat(4,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The gynoecium — the style and the TRIFID stigma, session 22 (phase 2, B3)</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; JS1-JS4, JG1-JG4 and the junction assertions ran before every shutter; the STL sha is that cell's own export. The stigma is ONE shape (S2 TRIFID, FIXED): ${STIGMA_LOBES} lobes sharing the style's tip at ${STIGMA_LOBE_SPREAD_DEG}°, each a pill of the anther's own proportion — ${ANTHER_DIAMETER_FACTOR}x the style across, ${ANTHER_LENGTH_FACTOR} of its own diameters long — so the pill and the trifid read on one scale; two constants of its own, stated for your ruling from these cells, never controls. The style is one sheet thick (1.20 mm here; 1.00 at the export floor on a thinner sheet), rooted through the slab on the axis, curved by the filament's own law. Every STAMENS, STYLE and SLENDERNESS line is the app's own read-out. SLENDERNESS is telemetry: UNMEASURED — no coupon has been printed. <b>The gynoecium ships ABSENT</b>; moving the shipping default to a present centre is proposed with numbers in the outcome doc, as its own partition event, and is not done here.</p>
<h2>1. The four centre states — one camera</h2>
<main class="four">${fig(none, 'centre', 'neither')}${fig(stamensOnly, 'centre', 'androecium only')}${fig(styleOnly, 'centre', 'gynoecium only')}${fig(both, 'centre', 'both')}</main>
<h2>2. The pill and the trifid together — at six and at a hundred and twenty</h2>
<main>${fig(both, 'centre', 'six on a ring, the style among them — 40° off the axis')}${fig(cushion, 'centre', 'the cushion, the style through it — 40° off the axis')}</main>
<main>${fig(both, 'profile', 'six, from the side')}${fig(cushion, 'profile', 'the cushion, from the side')}</main>
<main>${fig(both, 'above', 'six, straight down')}${fig(cushion, 'above', 'the cushion, straight down')}</main>
<h2>3. The filament curl at ±180 again — alone, and beside the style</h2>
<main class="four">${fig(curlN, 'profile', 'curl −180, from the side')}${fig(curlP, 'profile', 'curl +180, from the side')}${fig(curlNS, 'profile', 'curl −180 beside the style')}${fig(curlPS, 'profile', 'curl +180 beside the style')}</main>
<main class="four">${fig(curlN, 'above', 'curl −180, straight down')}${fig(curlP, 'above', 'curl +180, straight down')}${fig(curlNS, 'above', 'curl −180 beside the style, straight down')}${fig(curlPS, 'above', 'curl +180 beside the style, straight down')}</main>
<h2>4. The style's own range — length, curl, the cap's apex, the fat sheet</h2>
<main class="three">${fig(len5, 'profile', 'length 5 — the stigma below the anthers')}${fig(both, 'profile', 'length 25 — the default')}${fig(len40, 'profile', 'length 40')}</main>
<main class="four">${fig(sCurlN, 'profile', 'style curl −180')}${fig(sCurlP, 'profile', 'style curl +180')}${fig(rise1, 'profile', 'Head rise 1 — the root on the pole')}${fig(fat, 'centre', 'the 2.40 sheet')}</main>
<h2>5. The byte claim, on the sheet</h2>
<main class="four">${fig(gatedSph, 'whole', 'the gynoecium at MAXIMUM under SPHERE — sha REQUIRED equal to the bare sphere\'s')}${fig(gatedBoth, 'whole', 'the WHOLE centre at MAXIMUM under SPHERE — sha REQUIRED equal to the bare sphere\'s')}${fig(gatedInc, 'whole', 'the gynoecium at MAXIMUM under the incurve sphere — sha REQUIRED equal to the incurve sphere\'s')}${fig(gatedNone, 'whole', 'every sub-control at MAXIMUM with NONE — sha REQUIRED equal to the default\'s')}</main>
<main class="four">${fig(bareSph, 'whole', 'the bare sphere')}${fig(bareSph, 'whole', 'the bare sphere')}${fig(incSph, 'whole', 'the incurve sphere')}${fig(none, 'whole', 'the shipping default')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
