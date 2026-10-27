/* ===================================================================
   THE UMBEL SHEET (the umbel session, Oct 22 — Eva's rulings: florets on
   pedicels radiating from ONE junction knot at the top of the stem, the head
   an optional toggle that ships OFF). Composed so what is left to Eva's eye is
   on one page:

   (1) THE SPIDER LILY — six florets, the head OFF, recurved narrow petals, a
       buckled margin, long upturned stamens; from the side and from above.
   (2) THE COUNT — 2, 5 and 12 florets, head OFF, one camera.
   (3) THE HEAD — six florets with the head OFF beside the same with it ON.
   (4) THE ANGLE — -60, 35 and 90 deg, head OFF, one camera.
   (5) THE JUNCTION FROM BELOW — the knot close up at 6 and at 12 florets: every
       pedicel rooted in it, the stem's top end inside it.

   EVERY CELL: PRINT PREVIEW ON (read back from the app's own shownMode), chrome
   hidden, auto-rotate off through the asserted stillFrame(), whole state read
   back, the inflorescence assertions (ID + UM0-UM4) run before the shutter, the
   cell's own STL exported and required watertight, and the MEASURED APPROACHES
   in the caption — floret to floret, floret to stem and (head ON) floret to head,
   through the combination gate's own measures (tools/bloom-inflo-approach.mjs),
   EXPORT, emitted vertices against emitted triangles. No pixel delta is quoted
   anywhere (this renderer is not deterministic between page sessions).

   RUN:  node tools/shot-bloom-umbel.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         inflorescenceAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-umbel';
const pngArg = process.argv.indexOf('--png'), PNG_OUT = pngArg > 0 ? process.argv[pngArg + 1] : null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-umbel-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 80);
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);

/* THE FRAMINGS, sized from the cell's own emitted numbers: the knot's centre
   and the placed heads' reach from it, plus the floret's own petal reach. */
const VIEWS = {
  side: (f) => ({ r: f.reach, at: [f.c[0], f.c[1], f.c[2] + f.lift * 0.4], dir: [0.12, -0.96, 0.25] }),
  above: (f) => ({ r: f.reach, at: f.c, dir: [0.15, -0.35, 0.92] }),
  below: (f) => ({ r: f.knotR * 4.5, at: f.c, dir: [0.25, -0.45, -0.86] }),
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

/* THE APPROACHES, through the combination gate's own measures on the page's
   own state — the module the page serves, in EXPORT mode. */
const approaches = (headOn) => page.evaluate(async (on) => {
  const G = await import('/bloom-geometry.js');
  const A = await import('/tools/bloom-inflo-approach.mjs');
  const ui = window.__bloomUIState();
  const out = {};
  for (const k of ['floret-floret', 'floret-stem', ...(on ? ['floret-head'] : [])]) {
    const r = A.measureInfloApproachMm(G, ui, k);
    out[k] = { mm: r.mm, why: r.why || null, crossing: !!r.crossing };
  }
  return out;
}, headOn);

async function cell({ label, set: sets, views, ruling = '', frame = null }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: sets };
  const inf = await inflorescenceAssertions(page, row);
  const fatal = inf.filter((l) => !/^ID10: \(d\)/.test(l));     // ID10 (d) is the umbel's declared overlap (§7 of the outcome doc)
  if (fatal.length) await die(`${label}: inflorescence: ${fatal.join('; ')}`);
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  const K = m0.inflorescenceBuilt && m0.inflorescenceBuilt.knot;
  if (!K) await die(`${label}: no knot was built`);
  const P = m0.inflorescenceBuilt.placed;
  const ui = await page.evaluate(() => window.__bloomUIState());
  const petalReach = Number(ui.petalLength) * Number(ui.floretScale) + 6;
  const far = Math.max(...P.map((q) => Math.hypot(q.headAt[0] - K.centre[0], q.headAt[1] - K.centre[1], q.headAt[2] - K.centre[2])));
  const lift = Math.max(...P.map((q) => q.headAt[2] - K.centre[2]));
  const own = { c: K.centre, reach: far + petalReach, lift, knotR: K.radiusMm };
  const headOn = String(ui.umbelHead) === 'ON';
  const appr = await approaches(headOn);
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const fr = frame ? { ...own, reach: frame.reach, lift: frame.lift } : own;
  const shots = {};
  for (const view of views) shots[view] = (await shoot(path.join(outDir, `${slug(label)}-${view}.png`), view, fr)).file;
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const rec = { label, ruling, shots, own, tag: modeTag(m), sha: sha(buf), bytes: buf.length, tris: stl.tris, shownTris: m.shownTris, appr,
    knot: K, headOn, n: P.length, infloLine: readout.split('\n').find((l) => /^(INFLORESCENCE|UMBEL)/.test(l)) || '' };
  const ap = Object.entries(appr).map(([k, v]) => `${k} ${Number.isFinite(v.mm) ? v.mm.toFixed(3) : '—'}`).join(' · ');
  console.log(`  ${label.padEnd(60)} tris ${stl.tris} knot ${K.radiusMm.toFixed(3)} mm · ${ap}`);
  return rec;
}

const U = { stemLength: 120, inflorescence: 'UMBEL' };
const LILY = { ...U, umbelFlorets: 6, pedicelLength: 40, pedicelAngle: 40, floretPetals: 6, floretScale: 1, petalLength: 45, petalWidth: 8, petalSpineCurl: -180, buckleAmp: 0.4, buckleFreq: 5, stamenCount: 6, stamenLength: 70, stamenCurl: 60 };
console.log('THE UMBEL SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, ID + UM0-UM4 asserted before the shutter.\n');
const lily = await cell({ label: 'THE SPIDER LILY — 6 florets, head OFF', set: set(LILY), views: ['side', 'above'], ruling: 'recurved narrow petals (curl -180, width 8), a buckled margin (0.4 x 5), long upturned stamens (6 x 70 mm, curl 60), on 40 mm pedicels at 40 deg' });
const counts = [];
const n12 = await cell({ label: '12 florets, head OFF', set: set({ ...U, umbelFlorets: 12 }), views: ['side'] });
for (const n of [2, 5]) counts.push(await cell({ label: `${n} florets, head OFF`, set: set({ ...U, umbelFlorets: n }), views: ['side'], frame: n12.own }));
counts.push(n12);
const on = await cell({ label: '6 florets, head ON', set: set({ ...U, umbelFlorets: 6, umbelHead: 'ON' }), views: ['side'], ruling: 'the knot on the stem below the head, at the reach inset' });
const off = await cell({ label: '6 florets, head OFF (the default)', set: set({ ...U, umbelFlorets: 6 }), views: ['side'], frame: on.own, ruling: 'the stem ends at the knot' });
const a90 = await cell({ label: '6 florets at 90 deg', set: set({ ...U, umbelFlorets: 6, pedicelAngle: 90 }), views: ['side'] });
const angles = [];
for (const a of [-60, 35]) angles.push(await cell({ label: `6 florets at ${a} deg`, set: set({ ...U, umbelFlorets: 6, pedicelAngle: a }), views: ['side'], frame: { reach: Math.max(a90.own.reach, 60), lift: 0 } }));
angles.push(a90);
const j6 = await cell({ label: 'the junction from below — 6 florets', set: set({ ...U, umbelFlorets: 6 }), views: ['below'], ruling: 'every pedicel rooted in the knot; the stem\'s top end inside it' });
const j12 = await cell({ label: 'the junction from below — 12 florets', set: set({ ...U, umbelFlorets: 12 }), views: ['below'] });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const mm = (v) => (Number.isFinite(v.mm) ? `${v.mm.toFixed(3)} mm${v.crossing ? ' (an edge crossing)' : ''}` : `— (${esc(v.why || 'not measured')})`);
const num = (c) => `<b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview) · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris export) · knot ${c.knot.radiusMm.toFixed(3)} mm<br>`
  + Object.entries(c.appr).map(([k, v]) => `${k}: <b>${mm(v)}</b>`).join(' · ');
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap})</i>${c.ruling ? `<br><small>${esc(c.ruling)}</small>` : ''}<br>${num(c)}</figcaption></figure>`;
const html = `<title>Umbel</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:14px}main.two{grid-template-columns:repeat(2,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The umbel — florets on pedicels from one knot</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, chrome hidden and auto-rotate off, asserted; the inflorescence assertions (ID and UM0-UM4) ran before every shutter and the cell's own STL exported watertight. The approaches are the combination gate's own measures (tools/bloom-inflo-approach.mjs, EXPORT, emitted vertices against emitted triangles, an edge crossing reads 0); the knot's own join region is excluded as the rachis's is a raceme's. Florets of one umbel overlap by construction — there is no internode to move them apart — and that is declared by value (§7 of docs/bloom-umbel-outcome.md).</p>
<h2>1. The spider lily — head OFF</h2>
<main class="two">${fig(lily, 'side', 'from the side')}${fig(lily, 'above', 'from above')}</main>
<h2>2. The count — 2, 5 and 12 florets, head OFF, one camera</h2>
<main>${counts.map((c) => fig(c, 'side', 'from the side')).join('')}</main>
<h2>3. The head — OFF (the default) and ON, one camera</h2>
<main class="two">${fig(off, 'side', 'head OFF')}${fig(on, 'side', 'head ON')}</main>
<h2>4. The angle — -60, 35 and 90 deg, head OFF, one camera</h2>
<main>${angles.map((c) => fig(c, 'side', 'from the side')).join('')}</main>
<h2>5. The junction from below</h2>
<main class="two">${fig(j6, 'below', 'the knot from below')}${fig(j12, 'below', 'the knot from below')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close();
server.close();
