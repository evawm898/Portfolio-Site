/* ===================================================================
   THE VIEW SHEET — this session's deliverable, and the picture Eva rules
   from. Two claims, both measured rather than described:

   (1) EVERY PRESET FRAMES THE DEFAULT BLOOM. The five VIEW-box entries
       (DEFAULT/FRONT/SIDE/TOP-DOWN/ISOMETRIC), driven through the real
       #viewPreset <select> and its real 'change' event — not through
       __bloomFrame, which would test fitCamera's framing rather than the
       new dropdown's. Each cell waits out the full 650 ms tween before
       shooting, so what's captured is the SETTLED frame, not a mid-flight
       one.

   (2) THE FAN SNAP IS A BEFORE/AFTER PAIR, immediate and un-tweened. A
       radial bloom's own DEFAULT framing is "before"; selecting FAN
       placement (via applyConfig, the same path any registry control
       change takes) is "after". Both auto-rotate's checkbox and the VIEW
       dropdown's own displayed value are read back afterward — the snap
       claims to turn auto-rotate off and to leave the dropdown honest
       about the framing it now shows, and a caption asserting that without
       checking it would be exactly the kind of claim this project's own
       discipline refuses to make.

   (3) THE ORIENTATION FIX IS ALSO A BEFORE/AFTER PAIR (Eva, Sep 2
       amendment: the top-down snap landed the bloom upside down — the
       labellum must read at the TOP, mirror axis vertical, arc opening
       downward). Both cells use the SAME fan (LABELLUM overrides applied
       so the mirror-line petal is visually distinct, exactly the technique
       shot-bloom-fan.mjs/shot-bloom-orchid.mjs already use) and the SAME
       __bloomFrame harness hook, differing ONLY in the up vector: "before"
       passes [-1,0,0] — the value the app shipped with, reproduced
       directly here since the app itself no longer offers it, not a
       drawing — and "after" passes VIEW_PRESETS.top.up, the shipped fix,
       imported rather than retyped so this cell cannot silently drift from
       what the dropdown and the FAN snap actually use.

   VIEW STATE'S OWN REGRESSION TEST IS IN THE SAME RUN, NOT A SEPARATE ONE:
   after every preset cycle and the fan snap, fullStateDrift(page, []) must
   still report zero — proof, not assertion, that picking a view preset
   never moves a single registry control. A drift here would mean view
   chrome had leaked into the registry, which is the one thing Phase A
   promised it would not do.

   RUN:  node tools/shot-bloom-view.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame } from './bloom-harness.mjs';
import { VIEW_PRESETS } from '../bloom-view-presets.js';

const outDir = process.argv[2] || '/tmp/bloom-view';
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

fs.mkdirSync(outDir, { recursive: true });

/* Drives the real <select id="viewPreset"> exactly as a visitor would —
   set the value, fire the same 'change' event applyViewPreset() listens
   for — then waits out the full tween (650 ms + margin) so the shot is the
   settled frame, never a mid-flight one. */
async function pickPreset(name) {
  await page.evaluate((v) => {
    const el = document.getElementById('viewPreset');
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, name);
  await page.waitForTimeout(800);
}

async function shot(file) {
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 900, height: 900 } });
}

const cells = [];

/* ---- (1) every preset, on the default bloom ---- */
await openBloom(page, port);
const bad0 = await stillFrame(page);
if (bad0.length) await die(`setup: ${bad0.join('; ')}`);

const PRESETS = [
  ['default', 'DEFAULT (3/4)'],
  ['front', 'FRONT'],
  ['side', 'SIDE'],
  ['top', 'TOP-DOWN'],
  ['iso', 'ISOMETRIC'],
];
for (const [value, label] of PRESETS) {
  await pickPreset(value);
  const file = path.join(outDir, `preset-${value}.png`);
  await shot(file);
  cells.push({ label, file: path.basename(file) });
}

/* Proof, not assertion: cycling every preset must not have moved a single
   registry control — view chrome stays chrome. */
const driftAfterPresets = await fullStateDrift(page, []);
if (driftAfterPresets.length) await die(`preset cycle moved registry state: ${driftAfterPresets.join('; ')}`);

/* ---- (2) the FAN snap, before/after ---- */
await openBloom(page, port);
const bad1 = await stillFrame(page);
if (bad1.length) await die(`fan setup: ${bad1.join('; ')}`);
await page.waitForTimeout(300);
const beforeFile = path.join(outDir, 'fan-before.png');
await shot(beforeFile);

const bad2 = await applyConfig(page, [{ id: 'placement', value: 'FAN' }]);
if (bad2.length) await die(`fan: ${bad2.join('; ')}`);
/* No wait beyond the settle applyConfig already does — the whole point
   under test is that the snap is immediate, not tweened. A wait here would
   hide a regression that made it tween after all. */
const afterFile = path.join(outDir, 'fan-after.png');
await shot(afterFile);

const fanState = await page.evaluate(() => ({
  autoRotateChecked: document.getElementById('autoRotate').checked,
  viewPresetValue: document.getElementById('viewPreset').value,
}));
if (fanState.autoRotateChecked) await die('FAN snap left auto-rotate ON — Eva\'s ruling was "auto-rotate off", and nothing should silently leave it running');
if (fanState.viewPresetValue !== 'top') await die(`FAN snap left the VIEW dropdown reading "${fanState.viewPresetValue}", not "top" — the dropdown would be lying about the framing it now shows`);

const driftAfterFan = await fullStateDrift(page, [{ id: 'placement', value: 'FAN' }]);
if (driftAfterFan.length) await die(`FAN snap moved OTHER registry state beyond placement: ${driftAfterFan.join('; ')}`);

console.log(`preset cycle: 0 registry controls moved (${PRESETS.length} presets)`);
console.log(`fan snap: auto-rotate off (${!fanState.autoRotateChecked}), dropdown reads "${fanState.viewPresetValue}", 0 registry controls moved beyond placement`);

/* ---- (3) the orientation fix, before/after ---- */
await openBloom(page, port);
const bad3 = await stillFrame(page);
if (bad3.length) await die(`orientation setup: ${bad3.join('; ')}`);
/* THE LABELLUM MUST BE VISUALLY DISTINCT for "which end is up" to be a
   legible claim at all — the same overrides shot-bloom-fan.mjs's LAB uses. */
const bad4 = await applyConfig(page, [
  { id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'ON' },
  { id: 'labellumSize', value: '1.6' }, { id: 'labellumTilt', value: '-25' },
  { id: 'labellumCup', value: '0.5' }, { id: 'labellumCurl', value: '-60' },
  { id: 'labellumTipBreadth', value: '0.25' },
]);
if (bad4.length) await die(`orientation: ${bad4.join('; ')}`);
const m = await page.evaluate(() => window.__bloomMetrics());
const orientBeforeFile = path.join(outDir, 'orientation-before.png');
const orientAfterFile = path.join(outDir, 'orientation-after.png');
/* SAME fan, SAME __bloomFrame call, ONLY the up vector differs — an
   apples-to-apples pair, not two different code paths photographed. */
await page.evaluate(([r, c, d, u]) => window.__bloomFrame(r, 0, c, d, u), [m.fitRadius, m.fitCenter, [0, 0, 1], [-1, 0, 0]]);
await page.waitForTimeout(250);
await shot(orientBeforeFile);
await page.evaluate(([r, c, d, u]) => window.__bloomFrame(r, 0, c, d, u), [m.fitRadius, m.fitCenter, [0, 0, 1], VIEW_PRESETS.top.up]);
await page.waitForTimeout(250);
await shot(orientAfterFile);
console.log(`orientation: before up=[-1,0,0] (the shipped bug), after up=[${VIEW_PRESETS.top.up}] (VIEW_PRESETS.top.up, the fix) — see ${outDir}/orientation-*.png`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (label, file) => `<figure><img src="${file}"><figcaption>${esc(label)}</figcaption></figure>`;
const html = `<title>The VIEW box — five presets, and the fan snap</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;margin-top:20px}
main.pair{grid-template-columns:repeat(2,minmax(0,1fr));max-width:640px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px;text-align:center;color:#9fb3a9}</style>
<h1>The VIEW box — five presets, on the default bloom</h1>
<p class="note">Driven through the real #viewPreset dropdown and its real 'change' event, each shot after the full 650&nbsp;ms tween settles. Cycling every preset moved zero registry controls (proof, not claim — fullStateDrift ran clean after).</p>
<main>${cells.map((c) => fig(c.label, c.file)).join('')}</main>
<h1 style="margin-top:28px">Selecting FAN — immediate snap, no tween</h1>
<p class="note">Left: a fresh page's DEFAULT framing (RADIAL, the shipping default). Right: the instant placement selects FAN — top-down, centred on the fan's own bounding-sphere centre, auto-rotate forced off (measured: ${!fanState.autoRotateChecked}) and the dropdown reading "${esc(fanState.viewPresetValue)}" rather than left stale. No wait was inserted between applying FAN and the shot beyond what the build itself needs, so a regression that made this tween would show as a half-finished frame here.</p>
<main class="pair">${fig('before — DEFAULT (3/4), RADIAL', 'fan-before.png')}${fig('after — FAN selected, immediate TOP-DOWN snap', 'fan-after.png')}</main>
<h1 style="margin-top:28px">The orientation fix — labellum at the top, not the bottom</h1>
<p class="note">Same fan (labellum overrides applied so the mirror-line petal is visually distinct), same top-down framing, same __bloomFrame call — only the up vector differs. Left: up = [-1, 0, 0], the value this shipped with (reproduced directly here, since the app no longer offers it). Right: up = VIEW_PRESETS.top.up, imported rather than retyped, so this cell cannot silently drift from what the dropdown and the FAN snap actually use.</p>
<main class="pair">${fig('before — labellum at the BOTTOM (the reported bug)', 'orientation-before.png')}${fig('after — labellum at the TOP (the fix)', 'orientation-after.png')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close();
