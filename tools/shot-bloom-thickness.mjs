/* ===================================================================
   shot-bloom-thickness.mjs — contact sheets for THE THICKNESS LAYER: the
   sheet-thickness profile and foot delicacy. Canvas only.

   WHY THESE FRAMES AND NOT A WHOLE-FLOWER GRID. Eva's ruling came from the
   live page — the petal-to-centre connection is too thick, the tip is too
   thick — and both subjects are a couple of percent of a whole-bloom frame.
   The flower project's rule applies exactly: a contact sheet framing the
   whole flower when the subject is a junction is answering "is anything
   there" for a question that was "how much". So the delicacy cells are FOOT
   CLOSE-UPS, shot down the ring tangent (the view a sheet's thickness is
   visible in at all — face-on a sheet has no thickness), and the thinning
   cells are TIP CROPS.

   THE FRAMING COMES FROM THE BUILDER. `petalFootFrames` reports each foot
   row's own centre and width direction, and the camera is aimed with those
   through the app's own fitCamera. A shot tool deriving a foot position from
   ring radius and azimuth would be a second owner of the foot — the thing
   this whole session is about not having.

   WHAT A PICTURE CANNOT SHOW HERE, AND HOW THE CAPTION CARRIES IT. The live
   view is authoring-true: it renders the sheet at the thickness that was
   authored, not at the thickness that will print. Below the 1.0 mm minimum
   feature those differ, and there is no print-preview mode (parked in the
   charter, deliberately not built). So every cell prints BOTH numbers,
   labelled, exactly as the read-out does — `tip 0.24 mm live · 1.00 mm
   printed (CLAMPED)`. A cell whose picture and caption disagree about which
   object is being described is the instrument error this project keeps
   finding; naming the mode in the caption is the fix.

   THE BEFORE/AFTER PAIR IS TWO TREES, NOT TWO STATES. The "before" cell is
   3c542fb served from a `git worktree` and rendered by the same browser,
   camera and assertions — never `git checkout` over the working tree, which
   stages a revert that a stray commit can push. At the shipping default the
   two should be INDISTINGUISHABLE, and that is the claim the pair makes:
   the byte report says 0 of 106 moved, and this is what 0 looks like.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness and connectedness
   are measured on the export by verify-bloom-export.mjs and
   verify-bloom-connectedness.mjs; the thickness layer's own structural
   claims — foot invariance against footRing()'s own answer, the export
   floor, the uniform guard — are asserted by formAssertions() and
   thicknessAssertions() in both of those, and this tool runs them too,
   because a picture of geometry whose foot moved is evidence of nothing.

   RUN:  node tools/shot-bloom-thickness.mjs <out-dir> [--before <worktree>]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         formAssertions, thicknessAssertions, THICKNESS_SCOPE, CONTROLS, DEFAULTS,
         MIN_FEATURE_MM, FOOT_MIN_WIDTH_MM } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-thickness';
const bi = process.argv.indexOf('--before');
const beforeRoot = bi > 0 ? process.argv[bi + 1] : null;

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* Every number in a caption carries its MODE. Live and export are different
   geometry from this layer onward and the two are not convertible. */
const numbers = (m) => {
  const th = m.petalThickness;
  const printedTip = Math.max(th.tipEmitted, MIN_FEATURE_MM);
  const tip = th.floorBinds
    ? `tip ${th.tipEmitted.toFixed(2)} mm live · ${printedTip.toFixed(2)} mm printed (CLAMPED)`
    : `tip ${th.tipEmitted.toFixed(2)} mm`;
  const sheet = m.ringThicknessFloorBinds
    ? `sheet ${th.authored.toFixed(2)} mm live · ${MIN_FEATURE_MM.toFixed(2)} mm printed (CLAMPED)`
    : `sheet ${th.authored.toFixed(2)} mm`;
  return `${sheet} · ${tip}`
    + `<br>foot ${m.ringWidth.toFixed(2)} × ${m.ringThickness.toFixed(2)} mm`
    + `${m.ringWidthClamped ? ` (width CLAMPED at the assumed ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm floor)` : ''}`
    + ` · ring ${m.ringRadius.toFixed(2)} mm (live)`
    + `<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`;
};

async function cell({ label, set = [], views = ['foot'], note = '', pg = page, prt = port }) {
  await openBloom(pg, prt);
  const bad0 = await stillFrame(pg);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(pg, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  /* The BEFORE tree has no thickness controls, so a whole-state comparison
     against THIS registry's DEFAULTS would fail on ids its app never had.
     Its cells set nothing, and applyConfig's read-back plus the readout check
     below still prove it built what its label says. */
  if (pg === page) {
    const drift = await fullStateDrift(pg, set);
    if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
    const frm = await formAssertions(pg, { set });
    if (frm.length) await die(`${label}: ${frm.join('; ')}`);
    const thk = await thicknessAssertions(pg, { set });
    if (thk.length) await die(`${label}: ${thk.join('; ')}`);
  }
  await pg.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await pg.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  if (!new RegExp(`petals ${Number(want.petalCount)}\\b`).test(readout)) {
    await die(`${label}: set petalCount ${want.petalCount} through the UI but the readout says "${readout}" — the app did not react`);
  }

  const m = await pg.evaluate(() => window.__bloomMetrics());
  if (!(m.ringRadius > 0)) await die(`${label}: metrics report ring radius ${m.ringRadius}`);
  const ff = m.petalFootFrames;
  if (!Array.isArray(ff) || !ff.length) await die(`${label}: no foot frames reported — a foot crop would be a guess`);

  const shots = {};
  const L = Number(want.petalLength);
  for (const v of views) {
    if (v === 'whorl') await pg.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    else if (v === 'tip') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.10, at: m.petalTip, dir: m.petalNormal });
    else if (v === 'foot') {
      /* Down the ring TANGENT at the middle foot row — the only direction a
         sheet's thickness is visible in. The frame is the builder's own
         (`petalFootFrames[1].C` and `.T`), never re-derived from azimuth.
         The radius is sized from the foot's own extent so the crop stays on
         the subject as delicacy narrows it. */
      const mid = ff[Math.floor(ff.length / 2)];
      await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir),
        { r: Math.max(m.ringWidth, m.ringOverhang) * 1.35, at: mid.C, dir: mid.T });
    } else if (v === 'junction') {
      /* One step back from `foot`: the foot AND the hub it lands on, so the
         overlap the connectedness argument rests on is in frame. */
      await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir),
        { r: m.ringRadius * 1.9, at: [0, 0, 0], dir: [0.2, -1, 0.35] });
    }
    await pg.waitForTimeout(220);
    shots[v] = await pg.locator('#bloom-canvas').screenshot();
  }
  const caption = `${numbers(m)}${note ? `<br>${note}` : ''}`;
  console.log(`  ${label.padEnd(52)} foot ${m.ringWidth.toFixed(2)}x${m.ringThickness.toFixed(2)} ring ${m.ringRadius.toFixed(2)} tris(live) ${m.liveTris}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. FOOT DELICACY, close up ---- */
console.log('foot delicacy (view: foot close-up, down the ring tangent):');
const feet = [];
for (const [label, s, note] of [
  ['delicacy 1.00 — the shipping default', { footDelicacy: 1 },
   'The state Eva ruled on: the connection as it has been since phase 1. A 6.40 mm foot on a 16 mm petal, 1.20 mm thick.'],
  ['delicacy 0.60', { footDelicacy: 0.6 }, 'Mid-range. The area rule reads the foot, so the ring — and the hub plate spanning it — closes with the foot.'],
  ['delicacy 0.25 — the most delicate reachable', { footDelicacy: 0.25 },
   'Minimum. The foot is 1.60 mm wide, exactly the assumed floor. Nothing here has ever been printed: 1.60 mm is 2x the assumed 1.0 mm minimum feature, an ASSUMPTION with a number attached, and a printed coupon replaces it with a measurement.'],
  ['delicacy 0.25 × petalWidth 8 — where the floor BINDS', { footDelicacy: 0.25, petalWidth: 8 },
   'The clamp doing its job: 8 x 0.4 x 0.25 = 0.80 mm is asked for and 1.60 mm is built. Cap the OUTPUT, never the input range — the roll-clamp pattern, and the read-out says (CLAMPED) so a slider that has stopped moving does not read as broken.'],
]) feet.push(await cell({ label, set: set(s), views: ['foot', 'junction'], note }));

/* ---- 2. TIP THINNING, cropped to the tip ---- */
console.log('tip thinning (view: tip crop):');
const tips = [];
for (const [label, s, note] of [
  ['thinning 0 — the shipping default', { tipThinning: 0 },
   'The tip as it has been: 1.20 mm thick, and 1.60 mm WIDE — the TIP_HALF_MM floor, which is a width, not a thickness. It is why the tip reads blunt in both dimensions and only one of them is this session\'s. Untouched here; the picture exists so an edge session has one.'],
  ['thinning 0.40', { tipThinning: 0.4 },
   'Tip 0.72 mm authored. The export floor already binds — from 0.17 upward at this sheet — so the PRINTED tip is 1.00 mm and this picture is showing material the print will not have. That is why the caption says both.'],
  ['thinning 0.80 — maximum, floor binding hard', { tipThinning: 0.8 },
   'THE HEADLINE. Authored 0.24 mm, printed 1.00 mm. While the 1.0 mm minimum-feature ASSUMPTION stands, the printed tip can only thin from 1.20 to 1.00 mm — 17% — however far this slider goes. The slider is not broken and the range is not wrong: floors clamp the output, never the input.'],
  ['sheet 2.40 × thinning 0.80 — a REAL printed gradient', { sheetThickness: 2.4, tipThinning: 0.8 },
   'The only shape of state where the gradient survives export: 2.40 mm at the base tapering to 1.00 mm at the tip is a genuine 2.4:1 printed wedge. The route to a finer-reading tip is a thicker base sheet — or a printed coupon showing 1.0 mm is conservative.'],
]) tips.push(await cell({ label, set: set(s), views: ['tip', 'whorl'], note }));

/* ---- 3. THE DIVERGENCE CELL (Eva's ruling, Aug 31) ---- */
console.log('the live-vs-printed divergence:');
const diverge = [];
for (const [label, s, note] of [
  ['sheet 1.20 — live IS printed', { sheetThickness: 1.2 },
   'Above the 1.0 mm floor, so the two modes are the same geometry and the read-out prints one line. Every bloom shipped so far has been in this state, which is exactly why the divergence had never had to be told.'],
  ['sheet 0.60 — live is NOT printed', { sheetThickness: 0.6 },
   'RULED (Eva, Aug 31): no geometry change in either mode, but the divergence must be TOLD. footRing()\'s area rule reads the thickness the solids are ACTUALLY built at, so flooring the sheet moves the RING — 6.25 mm live against 8.07 mm printed, a 29% difference in the arrangement, not a wall. The read-out prints both, labelled. A "print preview" toggle rendering the floored geometry live is PARKED in the charter and deliberately not built: a preview that silently shows an arrangement the print will not produce is the same lie as an unlabelled triangle count.'],
]) diverge.push(await cell({ label, set: set(s), views: ['whorl', 'junction'], note }));

/* ---- 4. BEFORE / AFTER at the shipping default ---- */
const beforeAfter = [];
if (beforeRoot) {
  console.log(`before/after at the shipping default (before = ${beforeRoot}):`);
  const b = await serveRepo(beforeRoot);
  const pg2 = await (await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true })).newPage();
  await pg2.route('**cdn.jsdelivr.net/**', (route) => route.fallback());
  beforeAfter.push({ ...(await cell({ label: 'BEFORE — 3c542fb, the shipping default', views: ['whorl', 'junction'], pg: page, prt: b.port,
    note: 'The tree immediately before the thickness layer, served from a git worktree and rendered by the same browser, camera and framing. Its app has no thickness controls at all.' })) });
  await pg2.close();
  b.server.close();
  beforeAfter.push({ ...(await cell({ label: 'AFTER — the thickness layer, same default', views: ['whorl', 'junction'],
    note: 'Three new controls, all at their defaults. The byte report says 0 of 106 configs moved on phase4Matrix(); this is what 0 looks like. If these two cells differ by a pixel, the byte report and the picture disagree and the byte report is the one to believe — then find out why.' })) });
}

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
const pairs = (cells, a, b) => [...cells.map((c) => ({ ...c, shot: c[a] })), ...cells.map((c) => ({ ...c, shot: c[b], label: c.label + ` (${b})` }))];

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
const SHEETS = [
  ['thickness-delicacy', 'Foot delicacy — the petal-to-centre connection, close up',
   `Eva's first ruling (Aug 31, from the live page): the connection is too thick. Top row is the FOOT ITSELF, shot down the ring tangent, which is the only direction a sheet's thickness is visible in; bottom row steps back to the junction so the foot-hub overlap the connectedness argument rests on is in frame. Delicacy scales the foot's WIDTH and nothing else: a thickness-scaling delicacy is inert in export below 0.833 at the default sheet, because the 1.0 mm floor eats 83% of its range, and a live page showing delicacy the print cannot deliver is the thing this session exists to stop. Chrome hidden, autoRotate off, one fresh page per cell, every value read back, and both gates' structural assertions run before the shutter. SCOPE: ${THICKNESS_SCOPE}.`,
   pairs(feet, 'foot', 'junction'), 'shot', 4],
  ['thickness-tip', 'Tip thinning — and where the export floor takes over',
   `Eva's second ruling: the tip is too thick. Top row is the TIP CROP, bottom row the whole bloom for context. Read the captions with the pictures: the live view is authoring-true and renders what was asked for, while the print is floored at 1.0 mm, so from thinning 0.17 upward at the shipping sheet the two are different objects and every cell says which is which. The last cell is the only shape of state where the gradient survives to the print. The first cell also carries the TIP_HALF_MM photograph — the tip is 1.60 mm WIDE, a floor this session reports and does not touch, so a later edge-treatment ruling has a picture rather than a number.`,
   pairs(tips, 'tip', 'whorl'), 'shot', 4],
  ['thickness-divergence', 'Live is not printed — the ring radius, labelled',
   `The divergence this layer introduces, and Eva's ruling on it. Because footRing()'s area rule reads the thickness the solids are actually built at, the export floor moves the whole arrangement, not just a wall: at a 0.60 mm sheet the ring is 6.25 mm live and 8.07 mm printed. Nothing about the geometry changes in either mode — the one-owner rule is doing exactly what its header says — but the read-out now prints both numbers, labelled, whenever they differ, on the same discipline the triangle counts have carried since the counts stopped being convertible.`,
   pairs(diverge, 'whorl', 'junction'), 'shot', 2],
];
if (beforeAfter.length) SHEETS.push(['thickness-before-after', 'Before / after at the shipping default — what 0 of 106 looks like',
  'Two TREES, not two states: 3c542fb from a git worktree on the left, the thickness layer on the right, same browser, same camera, same framing. Three new controls landed and the shipping bloom is unmoved — the byte report measures that, and this is the picture of it. The working tree is never mutated to build a before; git checkout over it stages a revert that a stray commit can push.',
  pairs(beforeAfter, 'whorl', 'junction'), 'shot', 2]);

for (const [name, title, note, cells, which, perRow] of SHEETS) {
  const p2 = await b2.newPage({ viewport: { width: perRow * (CELL + 10) + 30, height: 900 } });
  await p2.setContent(sheet(title, note, cells, which, perRow), { waitUntil: 'load' });
  const fp = path.join(outDir, name + '.png');
  await p2.screenshot({ path: fp, fullPage: true });
  await p2.close();
  written.push(`${fp} (${(fs.statSync(fp).size / 1024).toFixed(0)} KiB)`);
}
await b2.close();
console.log('\nsheets:\n  ' + written.join('\n  '));
