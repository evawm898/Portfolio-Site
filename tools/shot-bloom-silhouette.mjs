/* ===================================================================
   shot-bloom-silhouette.mjs — contact sheets for the PETAL SILHOUETTE
   model. Canvas only.

   The metric screens; eyes decide. A sheet is required before committing
   anything visual, and this one carries two live rulings:

     1. THE CANDIDATE DEFAULTS — RULED, Aug 31: the pointed ovate stays.
        The sheet puts TODAY, ROSE-ish and POPPY-ish side by side with their
        control values printed in the cell, and Eva ruled against both
        candidates from it. The cells STAY: they are the evidence the ruling
        was made on, and ROSE-ish and POPPY-ish are also named rows in the
        gate matrix covering the region the controls are for. Neither is an
        unused preset to be tidied away. Reopening the default is a fresh
        ruling needing a fresh sheet.

     2. THE KINK — RULED, Aug 31: it reads fine, plain Math.max stays, no
        p-norm blend. The worst reachable case — maximum tip breadth against
        the steepest falling core — is PHOTOGRAPHED here rather than
        pre-engineered away, at a crop tight enough to actually see a corner
        at that scale. A whole-flower frame cannot carry a kink ruling; the
        flower project made exactly that mistake with `tailXZ`, answering
        "is anything there" for a question that was "how much". The crop
        stays for the same reason the candidate cells do: it is what the
        ruling was made on, and re-opening needs a fresh one.

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. fitCamera() in bloom.js was WIDENED with an optional
   target point rather than bypassed, so a single-petal view is the same one
   owner at a different target; the petal's midpoint and tip come from
   __bloomMetrics(), i.e. from the builder that made them.

   THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and autoRotate off,
   both read back, via the harness's stillFrame(). Every cell is a fresh
   page, every value is read back, the whole registry state is compared
   against DEFAULTS + set, and the readout is checked so the app is known to
   have REACTED through the real UI route rather than merely holding the
   value.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness, connectedness
   and the capability rows' structural claims are measured by
   verify-bloom-export.mjs and verify-bloom-connectedness.mjs; this shows
   what the geometry LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-silhouette.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, applyCapability,
         CONTROLS, DEFAULTS, CAPABILITY_CLAW, CAPABILITY_CLEFT, CAPABILITY_SCOPE } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-silhouette';
const SIL = ['petalBaseTaper', 'petalTipTaper', 'petalTipBreadth'];
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* The silhouette values a cell is showing, spelled out — a candidate default
   cannot be ruled on from a picture whose parameters are not in the caption. */
const silCaption = (want) => SIL.map((id) => `${byId[id].label.toLowerCase()} ${Number(want[id])}`).join(' · ');

/* One cell: fresh page, real controls, every assertion, then the shots.
   `view` picks which of the app's own framings to shoot:
     whorl  the automatic fit — the bloom as a whole
     petal  the camera at petal 0's midpoint, blade filling the frame
     tip    the camera at petal 0's tip, tight enough to read a corner  */
async function cell({ label, set = [], capability = null, views = ['petal'], note = '' }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const cap = await applyCapability(page, { capability });
  if (cap.length) await die(`${label}: ${cap.join('; ')}`);
  await page.waitForTimeout(450);   // rAF rebuild + camera refit

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  /* The app REACTED — asserted through the readout the rebuild writes, for a
     slider and for the capability, so a state that was set without driving a
     rebuild cannot pass. */
  for (const [re, what] of [
    [new RegExp(`petals ${Number(want.petalCount)}\\b`), `petalCount ${want.petalCount}`],
    [capability ? new RegExp(`capability ${capability.label}\\b`) : /^/, `capability ${capability && capability.label}`],
  ]) if (!re.test(readout)) await die(`${label}: set ${what} through the UI but the readout says "${readout}" — the app did not react`);

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!(m.ringRadius > 0)) await die(`${label}: metrics report ring radius ${m.ringRadius}`);
  if (!m.petalMid || !m.petalNormal) await die(`${label}: metrics report no petal midpoint/normal — framing would be a guess`);

  const shots = {};
  for (const v of views) {
    if (v === 'whorl') {
      /* The app's own automatic framing, at the radius the app itself
         computed for this build — asked for, never re-derived from the
         bounding box (a different quantity for a different job). */
      await page.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    } else if (v === 'petal') {
      /* FACE-ON, down the petal's own normal. A silhouette is an outline, and
         a three-quarter view foreshortens exactly the thing being ruled on. */
      await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: Number(want.petalLength) * 0.62, at: m.petalMid, dir: m.petalNormal });
    } else if (v === 'tip') {
      await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: Number(want.petalLength) * 0.17, at: m.petalTip, dir: m.petalNormal });
    }
    await page.waitForTimeout(220);
    shots[v] = await page.locator('#bloom-canvas').screenshot();
  }

  const caption = `${silCaption(want)}<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · panels ${JSON.stringify(m.petalPanels)} · tip spans ${m.petalTipSpans}`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(44)} ${silCaption(want)} · tris(live) ${m.liveTris}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. candidate defaults: today's ovate against the two family corners ---- */
console.log('candidate defaults:');
const candidates = [];
for (const [label, s, note] of [
  ['TODAY — the pointed ovate (shipping default)', {}, 'The placeholder silhouette, reproduced BIT-IDENTICALLY by the new engine. Widest at 0.36; the tip is not a shape at all — it is the 0.8 mm blunt-tip floor governing the last 4 of 28 blade rows.'],
  ['ROSE-ish — obovate, broad tip', { petalBaseTaper: 2, petalTipTaper: 1.1, petalTipBreadth: 0.3 }, 'Widest at 0.65 — above the middle, which is what obovate means. CANDIDATE DEFAULT.'],
  ['POPPY-ish — orbicular, truncate', { petalBaseTaper: 0.6, petalTipTaper: 0.7, petalTipBreadth: 0.5 }, 'Blunt on both sides, tip held at half the max width. CANDIDATE DEFAULT.'],
]) candidates.push(await cell({ label, set: set(s), views: ['whorl', 'petal'], note }));

/* ---- 2. the family swept across its two exponents ---- */
console.log('family sweep (base taper x tip taper, tip breadth 0):');
const family = [];
const BASE = [0.3, 1, 2, 3], TIPT = [0.6, 1.8, 4];
for (const b of TIPT) for (const a of BASE) {
  family.push(await cell({ label: `base ${a} × tip ${b}`, set: set({ petalBaseTaper: a, petalTipTaper: b }) }));
}

/* ---- 3. tip breadth: the one term that reaches outside the exponent family ---- */
console.log('tip breadth sweep:');
const breadth = [];
for (const w of [0, 0.15, 0.3, 0.45, 0.6]) {
  breadth.push(await cell({ label: `tip breadth ${w}`, set: set({ petalTipBreadth: w }) }));
}

/* ---- 4. THE KINK — worst reachable crossover, cropped tight to the tip ---- */
console.log('the kink (worst reachable crossover):');
const kink = [];
for (const [label, s, note] of [
  ['no crossover — tip breadth 0', { petalLength: 60, petalBaseTaper: 0.3, petalTipTaper: 4, petalTipBreadth: 0 }, 'One term active. No crossover, no kink — the control case.'],
  ['THE KINK — breadth 0.60 × steepest core', { petalLength: 60, petalBaseTaper: 0.3, petalTipTaper: 4, petalTipBreadth: 0.6 }, 'Maximum tip breadth against the steepest falling core: the two terms cross mid-blade and plain max leaves a C0 corner there. This is the worst case the shipped ranges can reach.'],
  ['mid crossover — breadth 0.30', { petalLength: 60, petalBaseTaper: 0.3, petalTipTaper: 4, petalTipBreadth: 0.3 }, 'A gentler crossover, for scale.'],
]) kink.push(await cell({ label, set: set(s), views: ['petal', 'tip'], note }));

/* ---- 5. capability — what the architecture buys later ---- */
console.log('capability rows:');
const caps = [];
caps.push(await cell({
  label: 'CAPABILITY: CLAW', capability: CAPABILITY_CLAW, views: ['whorl', 'petal'],
  note: `Non-monotone width: a 1.4 mm stalk below u = 0.30, narrower than BOTH the 3.2 mm foot and the blade. NOT SHIPPED — no control reaches it. ${CAPABILITY_SCOPE}.`,
}));
caps.push(await cell({
  label: 'CAPABILITY: CLEFT', capability: CAPABILITY_CLEFT, views: ['whorl', 'petal'],
  note: `Two-span trimmed domain above u = 0.55: a base panel plus two lobe panels reaching down into it. NOT SHIPPED — no control reaches it. ${CAPABILITY_SCOPE}.`,
}));

await browser.close();
server.close();

/* ---- compose (pure presentation: one page screenshot per sheet) ---- */
const CELL = 300;
const fig = (c, which) => (c[which] ? `<figure><img src="data:image/png;base64,${c[which].toString('base64')}">
  <figcaption><b>${c.label}</b><br>${c.caption}</figcaption></figure>` : '');
function sheet(title, note, cells, which, perRow) {
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin:0; background:#000; color:#9fdcc4; font:12px ui-monospace,Menlo,monospace; }
    h1 { font-size:15px; margin:14px 12px 2px; color:#cfeee0; }
    p.note { margin:0 12px 10px; opacity:.65; max-width:1100px; line-height:1.5; }
    main { display:grid; grid-template-columns:repeat(${perRow}, ${CELL}px); gap:10px; padding:12px; }
    figure { margin:0; }
    img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
    figcaption { padding-top:4px; opacity:.72; font-size:10.5px; line-height:1.45; }
    figcaption b { color:#cfeee0; font-weight:500; }
  </style><h1>${title}</h1><p class="note">${note}</p><main>${cells.map((c) => fig(c, which)).join('')}</main>`;
}

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
const pairs = (cells, a, b) => [...cells.map((c) => ({ ...c, shot: c[a], label: c.label })), ...cells.map((c) => ({ ...c, shot: c[b], label: c.label + ' (petal)' }))];
for (const [name, title, note, cells, which, perRow] of [
  ['silhouette-candidates', 'Petal silhouette — candidate defaults',
   'THE RULING SURFACE. Today\'s pointed ovate against the two family corners, whorl view then single-petal crop. Control values are printed in every cell. The engine landed byte-identical, so TODAY is what ships unless a candidate is chosen; choosing one is a separate event with its own partition report. Chrome hidden, autoRotate off, one fresh page per cell, every value read back.',
   pairs(candidates, 'whorl', 'petal'), 'shot', 3],
  ['silhouette-family', 'Petal silhouette — the rounded family swept',
   'Base taper (a) across, tip taper (b) down, tip breadth 0 throughout. These two exponents are the whole CORE term, u^a (1-u)^b — and every member of that family is pinched to a point at BOTH ends, which is the measured reason the tip-breadth control has to exist. Single-petal crops: the subject is the outline, so the frame is the petal.',
   family, 'petal', BASE.length],
  ['silhouette-tip-breadth', 'Petal silhouette — tip breadth',
   'The only shipped term that reaches outside the exponent family: truncate and rounded tips (rose, poppy) are unreachable without it. 0 is the shipping default and contributes EXACTLY zero, which is what makes the whole engine byte-identical.',
   breadth, 'petal', 5],
  ['silhouette-kink', 'Petal silhouette — the max-combinator kink',
   'Plain Math.max puts a C0 corner wherever two profile terms cross. This is the worst case the shipped ranges reach: maximum tip breadth against the steepest falling core, at 60 mm petals. Top row is the whole blade, bottom row is the tip cropped tight — a whole-flower frame cannot carry this ruling. If the corner reads badly, a smooth p-norm blend is a later, separately-evidenced change; if it reads fine, the complexity was never needed.',
   pairs(kink, 'petal', 'tip'), 'shot', 3],
  ['silhouette-capability', 'Petal silhouette — capability, not claims',
   'NEITHER OF THESE SHIPS. No control reaches them; they are set only through the harness hook, and they exist so "architected for claw and cleft from day one" is something the gates build and measure rather than a sentence in a header. Both export watertight and as one connected piece — measured on the STL by the two gates. The structural claims (non-monotone width, two-span domain) are read from the app\'s own profile and trim evaluation, not from the STL.',
   pairs(caps, 'whorl', 'petal'), 'shot', 2],
]) {
  const p2 = await b2.newPage({ viewport: { width: perRow * (CELL + 10) + 30, height: 900 } });
  await p2.setContent(sheet(title, note, cells, which, perRow), { waitUntil: 'load' });
  const fp = path.join(outDir, name + '.png');
  await p2.screenshot({ path: fp, fullPage: true });
  await p2.close();
  written.push(`${fp} (${(fs.statSync(fp).size / 1024).toFixed(0)} KiB)`);
}
await b2.close();
console.log('\nsheets:\n  ' + written.join('\n  '));
