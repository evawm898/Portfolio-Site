/* ===================================================================
   shot-bloom-form.mjs — contact sheets for the PETAL'S 3D FORM: the four
   curves. Canvas only.

   THE FIRST SHEET IS A TEACHING SHEET, and that is its job rather than a
   presentation choice. The flower project lost a full session to conflating
   these four, and its working agreements carry a vocabulary table for
   exactly that reason. One row per curve, each swept ALONE from its minimum
   through zero to its maximum, so the four are visibly four different
   things and no one has to take the table's word for it:

     PETAL CUP          parabolic lift ACROSS the width
     SPINE CURL         bend ALONG the length
     CROSS-SECTION ROLL curl ACROSS the width
     TWIST              rotation about the midrib ALONG the length

   Cup and roll both bend the cross-section and are the pair most easily
   confused. The sweep is what separates them: roll closes toward a tube and
   holds |dP/dv| at exactly 1, cup opens into a dish, can never wrap, and
   stretches the material — both numbers are printed in every cell.

   THREE VIEWS, BECAUSE THERE ARE THREE PLANES. A curve invisible in the
   frame it is photographed in has not been photographed.
     whorl    the app's automatic fit — the bloom as a whole
     petal    FACE-ON, down the blade's own normal — the silhouette
     profile  down the blade's WIDTH direction — the spine, so curl
     section  END-ON, down the blade's LENGTH axis — the cross-section, so
              cup and roll
   All three directions come from __bloomMetrics(), i.e. from the builder
   that made the frame. Under twist the width direction is NOT the ring
   tangent, so a tool deriving it from azimuth would not merely be a second
   owner — it would be pointing the camera the wrong way.

   TWO RULINGS ARE PARKED ON THIS SHEET (Eva, Aug 31), both deliberately
   photographed rather than engineered around:

     1. CUP AT MAXIMUM. +1.20 carries a measured metric factor of 2.600 at
        the rim — a stated distortion, not a hazard, and the closed tulip it
        makes is a real form. The flower's 0.72 was a range choice, not a
        safety rule. The worst case is here, tip-cropped, where the
        distortion is largest.
     2. ROLL FACETING. NV stays 10, so the emitted cross-section is a
        9-segment chord path inscribed in the arc and carries up to 7.9%
        less material than the flat row at maximum roll. Constant topology
        is load-bearing for the zero-triangle-cost claim, so the faceting is
        shown with the measured ratio printed in the cell rather than fixed
        by spending triangles. If it reads badly, NV-under-roll is later,
        separately-evidenced work with its own triangle-count story.

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and
   autoRotate off, both read back via stillFrame(); one fresh page per cell;
   every value read back; the whole registry state compared against
   DEFAULTS + set; and the readout checked so the app is known to have
   REACTED through the real UI route rather than merely holding the value.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness and
   connectedness are measured on the export by verify-bloom-export.mjs and
   verify-bloom-connectedness.mjs, and the form layer's own structural
   claims — foot invariance, roll isometry, the curvature floor, the
   all-zero guard — are asserted by formAssertions() in both of those, and
   FOOT INVARIANCE by junctionAssertions() beside it (it moved there when
   layers arrived, because "the foot" stopped being one ring). This
   shows what the geometry LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-form.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, applyCapability,
         formAssertions, FORM_SCOPE, junctionAssertions, CONTROLS, DEFAULTS, CAPABILITY_CLEFT, modeTag } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-form';
const FORM = ['petalCup', 'petalSpineCurl', 'petalRoll', 'petalTwist'];
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* Only the curves that are actually ON are named, so a teaching cell reads
   as one curve doing one thing instead of four numbers three of which are
   zero. A cell with nothing on says so. */
const formCaption = (want) => {
  const on = FORM.filter((id) => Number(want[id]) !== 0)
    .map((id) => `${byId[id].label.toLowerCase()} ${Number(want[id])}`);
  return on.length ? on.join(' · ') : 'all four at 0 — flat';
};

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
  /* The sheet runs the gates' OWN assertions rather than a relaxed copy. A
     picture of geometry whose foot moved is not evidence of anything, and the
     sheet is the one place a human would not notice.

     BOTH are called, and that is not belt-and-braces: FOOT INVARIANCE MOVED
     out of formAssertions() into junctionAssertions() when layers arrived (it
     had only ever seen layer 0). Calling formAssertions alone here would have
     kept passing while quietly dropping the very check this comment claims. */
  const frm = await formAssertions(page, { set, capability });
  if (frm.length) await die(`${label}: ${frm.join('; ')}`);
  const jct = await junctionAssertions(page, { set, capability });
  if (jct.length) await die(`${label}: ${jct.join('; ')}`);
  await page.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  if (!new RegExp(`petals ${Number(want.petalCount)}\\b`).test(readout)) {
    await die(`${label}: set petalCount ${want.petalCount} through the UI but the readout says "${readout}" — the app did not react`);
  }

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!(m.ringRadius > 0)) await die(`${label}: metrics report ring radius ${m.ringRadius}`);
  for (const [k, v] of [['petalMid', m.petalMid], ['petalNormal', m.petalNormal], ['petalTangent', m.petalTangent], ['petalAxis', m.petalAxis]]) {
    if (!v) await die(`${label}: metrics report no ${k} — framing would be a guess`);
  }

  const shots = {};
  const L = Number(want.petalLength);
  for (const v of views) {
    if (v === 'whorl') await page.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    else if (v === 'petal') await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.62, at: m.petalMid, dir: m.petalNormal });
    else if (v === 'profile') await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.62, at: m.petalMid, dir: m.petalTangent });
    else if (v === 'section') await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: Number(want.petalWidth) * 0.85, at: m.petalMid, dir: m.petalAxis });
    else if (v === 'tip') await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.17, at: m.petalTip, dir: m.petalNormal });
    await page.waitForTimeout(220);
    shots[v] = await page.locator('#bloom-canvas').screenshot();
  }

  const f = m.petalForm;
  /* Every number in a caption carries its MODE or its meaning. `tris` is
     LIVE here and says so — live and export are different geometry and the
     flower printed both as a bare "tris" for months. */
  const nums = f
    ? `|dP/dv|/h ${f.metricMin.toFixed(4)}..${f.metricMax.toFixed(4)}`
      + ` · emitted/flat width ${f.polylineMin.toFixed(4)}..${f.polylineMax.toFixed(4)}`
      + (f.rollDeg !== 0 ? ` · roll radius ${f.rollRadiusMm.toFixed(2)} mm${f.rollClamped ? ' (CLAMPED)' : ''}` : '')
    : `flat — no form law built (the guard short-circuited); guard residual ${m.petalGuardResidual}`;
  const caption = `${formCaption(want)}<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm · ${modeTag(m)}<br>${nums}`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(46)} ${formCaption(want)} · tris(live) ${m.liveTris} · maxdim ${m.maxDimMm.toFixed(1)}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. THE TEACHING SHEET: each curve swept ALONE ---- */
/* Five stops per curve — min, half-min, zero, half-max, max — so the zero
   column runs down the middle of the sheet and every row is visibly the
   SAME petal deformed a different way. The view is chosen per curve: a
   cross-section curve photographed face-on is a picture of nothing. */
const SWEEPS = [
  { id: 'petalCup', view: 'section', stops: [-0.8, -0.4, 0, 0.6, 1.2],
    note: 'ACROSS the width, parabolic. Signed: reflexed through flat to cupped. Cannot wrap, and it is the only one of the four that stretches the material.' },
  { id: 'petalSpineCurl', view: 'profile', stops: [-180, -90, 0, 180, 360],
    note: 'ALONG the length. The bend axis is the width direction, so this is a plane curve — and it is NOT petal tilt: tilt is the constant of integration, curl is the rate.' },
  { id: 'petalRoll', view: 'section', stops: [-330, -165, 0, 165, 330],
    note: 'ACROSS the width, constant-curvature arc. Isometric by construction — the ratio stays exactly 1 at every sample — and it closes toward a tube, which cup can never do.' },
  { id: 'petalTwist', view: 'petal', stops: [-180, -90, 0, 90, 180],
    note: 'ABOUT the midrib, along the length. A rigid rotation of the width/normal pair, so it moves no material across the width at all.' },
];
const teach = [];
for (const s of SWEEPS) {
  console.log(`${byId[s.id].label} swept alone (view: ${s.view}):`);
  for (const v of s.stops) {
    teach.push({ curve: s.id, view: s.view, ...await cell({ label: `${byId[s.id].label} ${v}`, set: set({ [s.id]: v }), views: [s.view] }) });
  }
}

/* ---- 2. combined corners ---- */
console.log('corners:');
const corners = [];
for (const [label, s, note] of [
  ['QUILL — roll alone', { petalRoll: 330 }, 'Cross-section roll at maximum. A tube of ONE radius the whole length: constant curvature, so the narrow tip rows wrap less than the wide middle. The alternative (constant wrap per row) puts a 0.127 mm radius at the 0.8 mm tip and inverts the sheet.'],
  ['FIDDLEHEAD — spine curl alone', { petalSpineCurl: 360 }, 'A full turn of spine curl. Max bounding dimension falls from 81.6 mm flat to 27.5 mm — curl REDUCES the envelope, which is why the readout prints the bounding dimension in every cell.'],
  ['CONTORTED — twist alone', { petalTwist: 180 }, 'Half a turn about the midrib, base to tip. Chirality: the sign is dextral or sinistral, not a mirror of the same petal in a whorl.'],
  ['REFLEXED — cup min x curl below the plane', { petalCup: -0.8, petalSpineCurl: -180 }, 'Tips passing BEHIND the bloom — martagon / cyclamen. Reachable on purpose (Eva, Aug 31): nothing is below the bloom today, so the state is geometrically free.'],
  ['ROLL CLAMP — roll max x narrowest petal', { petalRoll: 330, petalWidth: 8 }, 'The only reachable state where the curvature floor BINDS. Unclamped this asks for a 0.64 mm radius against a 0.6 mm half-thickness — the sheet\'s inner surface would invert, staying watertight and connected the whole time. Cap the output, never the input.'],
  ['ALL FOUR AT MAX', { petalCup: 1.2, petalSpineCurl: 360, petalRoll: 330, petalTwist: 180 }, 'The compound worst case. Cup and roll bend the same cross-section, so at the same sign they compound — the metric factor reaches 3.39, higher than either alone.'],
  ['ALL FOUR AT MIN', { petalCup: -0.8, petalSpineCurl: -180, petalRoll: -330, petalTwist: -180 }, 'The opposite corner. Every curve signed the other way.'],
]) corners.push(await cell({ label, set: set(s), views: ['whorl', 'petal'], note }));

/* ---- 3. the two parked rulings, cropped to where the evidence is ---- */
console.log('rulings:');
const rulings = [];
rulings.push(await cell({
  label: 'CUP AT MAXIMUM (+1.20) — the distortion, tip-cropped',
  set: set({ petalCup: 1.2 }), views: ['section', 'tip'],
  note: 'RULED KEEP (Eva, Aug 31). Metric factor 2.600 at the rim against the flower\'s 0.72 / 1.753 — a measured, stated distortion rather than a hazard. End-on then tip-cropped, where it is largest.',
}));
rulings.push(await cell({
  label: 'ROLL AT MAXIMUM (330 deg) — the faceting, at NV = 10',
  set: set({ petalRoll: 330 }), views: ['section', 'tip'],
  note: 'RULED KEEP-AND-PHOTOGRAPH (Eva, Aug 31). The emitted 9-segment chord path against the true arc — the ratio in this caption IS the deficit. NV stays 10 so triangle count stays a constant; raising it under roll is later work with its own triangle-count story.',
}));
rulings.push(await cell({
  label: 'CLEFT x ROLL MAX — two lobes on ONE arc',
  capability: CAPABILITY_CLEFT, set: set({ petalRoll: 330 }), views: ['section', 'petal'],
  note: `A clefted petal is three panels, and each lobe evaluates the row's cross-section over its OWN span of v. Were the section a function of a panel's LOCAL parameter, the lobes would sit on two different arcs and pull apart under roll — watertight, and in pieces. NON-SHIPPING capability row. SCOPE: ${FORM_SCOPE}.`,
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
/* The teaching sheet's cells were each shot in the view that shows their own
   curve, so the grid holds a mixed set — flattened here into one `shot` key
   rather than asking the composer to know which view a row used. */
const flat = teach.map((c) => ({ ...c, shot: c[c.view], label: `${c.label}  [${c.view}]` }));
const pairs = (cells, a, b) => [...cells.map((c) => ({ ...c, shot: c[a] })), ...cells.map((c) => ({ ...c, shot: c[b], label: c.label + ` (${b})` }))];

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, cells, which, perRow] of [
  ['form-vocabulary', 'The petal\'s 3D form — the four curves, each swept alone',
   'THE TEACHING SHEET. One row per curve: petal cup, spine curl, cross-section roll, twist — min, half-min, ZERO (the centre column, the shipping default), half-max, max. Each row is shot in the view its own curve is visible in, named in the cell: section is end-on down the blade axis, profile is down the width direction, petal is face-on down the normal. No amount of range on one produces another; a fiddlehead is spine curl and a quill is cross-section roll. Every cell prints the metric ratio |dP/dv|/h — roll holds it at exactly 1, cup is the only curve that moves it.',
   flat, 'shot', 5],
  ['form-corners', 'The petal\'s 3D form — named corners',
   'The curves in combination, whorl view then face-on petal crop. ROLL CLAMP is the load-bearing cell: it is the only reachable state where the curvature floor binds, and the failure it prevents (the sheet\'s inner offset surface inverting) stays watertight AND connected, so neither gate can see it. Chrome hidden, autoRotate off, one fresh page per cell, every value read back, and the gates\' own form assertions run on every cell before the shutter.',
   pairs(corners, 'whorl', 'petal'), 'shot', 4],
  ['form-rulings', 'The petal\'s 3D form — the two parked rulings, and the cleft under roll',
   'Cropped to where the evidence is. Cup at maximum carries a measured 2.600 metric factor and stays (Eva, Aug 31) — the closed tulip is a real form and the distortion is stated, not hidden. Roll at maximum facets, because NV stays 10 so triangle count stays a constant; the emitted/flat width ratio in each caption IS the deficit, and the picture is what the ruling gets made on. The third pair is the cleft under maximum roll: two lobe panels staying on one arc.',
   pairs(rulings, 'section', 'tip'), 'shot', 3],
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
