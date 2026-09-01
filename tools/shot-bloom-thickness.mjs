/* ===================================================================
   shot-bloom-thickness.mjs — contact sheets for THE THICKNESS LAYER: the
   sheet-thickness profile and foot delicacy. Canvas only.

   WHY THESE FRAMES AND NOT A WHOLE-FLOWER GRID. Eva's ruling came from the
   live page — the petal-to-centre connection is too thick, the tip is too
   thick — and both subjects are a couple of percent of a whole-bloom frame.
   The flower project's rule applies exactly: a contact sheet framing the
   whole flower when the subject is a junction is answering "is anything
   there" for a question that was "how much".

   THE FOOT CANNOT BE PHOTOGRAPHED, and deriving that before rendering would
   have saved a pass. The three foot rows run from `ring.radius` INWARD by
   `ring.overhang`, and the hub is a disc of exactly `ring.radius` at the same
   thickness on the same plane — so the feet are entirely inside the hub's
   footprint and buried in its slab. They are invisible from every direction,
   which is precisely what makes the junction good plumbing. A first pass shot
   "foot close-ups" down the ring tangent and got a wall of grey: the camera
   was inside the geometry, looking at a neighbour.

   WHAT EVA IS ACTUALLY SEEING when she says the connection is too thick is
   the HUB RIM plus the BLADE ROOT emerging from it — and the blade root's
   width is the root blend reading `ring.width`, so delicacy moves exactly the
   thing in frame. The plan view down the axis is where that reads: at
   delicacy 1.00 the roots are fat wedges tiling over the disc, at 0.25 they
   are slim spikes with the disc exposed. The three-quarter view carries the
   plate's own thickness.

   THE FRAME IS SIZED BY THE PETAL, NEVER BY THE RING. Scaling the camera to
   `ring.radius` would normalise away the very shrink being measured — every
   delicacy cell would come out the same size on screen and the comparison
   would be destroyed. The junction views are framed at a fixed fraction of
   `petalLength`, which is constant across a delicacy sweep, so the ring
   genuinely shrinks in frame.

   A SHEET HAS NO THICKNESS FACE-ON, which is the same mistake one layer up:
   the first pass cropped the tip down the petal's NORMAL and produced four
   identical rectangles across the whole thinning sweep. The tip views look
   down the petal's WIDTH direction, where the wedge is a silhouette.

   THE FRAMING COMES FROM THE BUILDER. `petalTip`, `petalTangent` and
   `petalFootFrames` are reported by the builder that made the geometry, and
   the camera is aimed with them through the app's own fitCamera. Under twist
   the width direction is not the ring tangent, so a tool re-deriving it from
   azimuth would not merely be a second owner — it would point the camera the
   wrong way.

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
/* CAPTIONS DEGRADE PER FIELD, never per hardcoded tree. A before/after pair
   renders an OLD tree whose app reports fewer fields, and which fields are
   missing depends on which commit it is — the thickness baseline (3c542fb) has
   no thickness telemetry, the tip baseline (306d459) has thickness but no tip
   cap. A caption keyed on "is this the legacy cell" gets that wrong the moment
   a second baseline exists, and a missing field rendered as a blank or a
   plausible default is the `f3(undefined)` defect: a null that reads exactly
   like a real value. So each line asks whether its own field is present and
   says so when it is not. */
const numbers = (m) => {
  if (!m.petalThickness) {
    return `sheet 1.20 mm — the CONSTANT, at both call sites, no control`
      + `<br>ring ${m.ringRadius.toFixed(2)} mm (live = printed: this tree cannot cross the export floor)`
      + `<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`;
  }
  const th = m.petalThickness;
  const printedTip = Math.max(th.tipEmitted, MIN_FEATURE_MM);
  const tip = th.floorBinds
    ? `tip ${th.tipEmitted.toFixed(2)} mm live · ${printedTip.toFixed(2)} mm printed (CLAMPED)`
    : `tip ${th.tipEmitted.toFixed(2)} mm`;
  const sheet = m.ringThicknessFloorBinds
    ? `sheet ${th.authored.toFixed(2)} mm live · ${MIN_FEATURE_MM.toFixed(2)} mm printed (CLAMPED)`
    : `sheet ${th.authored.toFixed(2)} mm`;
  const tc = m.petalTipCap;
  const capLine = !tc
    ? `<br>tip end: the FLOORED STUB — TIP_HALF_MM clamps every row in both modes, so the last rows run parallel at ${(2 * 0.8).toFixed(2)} mm and are capped square`
    : tc.pointed
      ? `<br>tip end: CONVERGING from ${(2 * tc.entryHalf).toFixed(2)} mm at u=${tc.uCap.toFixed(2)} to a ${(2 * tc.terminalHalf).toFixed(2)} mm face (live) · ${(2 * 0.8).toFixed(2)} mm printed`
      : `<br>tip end: AUTHORED TRUNCATE (tip breadth > 0) — flat by choice, not by floor; bit-identical to the pre-ruling tree`;
  return `${sheet} · ${tip}`
    + `<br>foot ${m.ringWidth.toFixed(2)} × ${m.ringThickness.toFixed(2)} mm`
    + `${m.ringWidthClamped ? ` (width CLAMPED at the assumed ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm floor)` : ''}`
    + ` · ring ${m.ringRadius.toFixed(2)} mm (live)`
    + capLine
    + `<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`;
};

/* `legacy` marks a cell rendered from the BEFORE tree. It is an explicit
   argument rather than a comparison against the live port or page, because
   the before cell reuses the same page on a different port — keying the
   check on the page object made it look like a live cell and ran the whole
   registry state comparison against an app that has none of the new
   controls. Explicit, because a guard inferred from an object identity is a
   guard that silently stops guarding when the plumbing changes. */
async function cell({ label, set = [], views = ['foot'], note = '', prt = port, legacy = false }) {
  const pg = page;
  await openBloom(pg, prt);
  const bad0 = await stillFrame(pg);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(pg, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  /* The BEFORE tree has no thickness controls, so a whole-state comparison
     against THIS registry's DEFAULTS would fail on ids its app never had.
     Its cells set nothing, and applyConfig's read-back plus the readout check
     below still prove it built what its label says. */
  if (!legacy) {
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
  if (!legacy && !m.petalThickness) await die(`${label}: no thickness telemetry reported — the caption would be describing an object it cannot see`);
  if (!legacy && !m.petalTipCap) await die(`${label}: no tip-cap telemetry reported — the caption would be describing an object it cannot see`);

  const shots = {};
  const L = Number(want.petalLength);
  for (const v of views) {
    if (v === 'whorl') await pg.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    /* TIP, EDGE-ON — down the petal's own WIDTH direction, where the sheet is
       a silhouette and its thickness is a measurable line. Face-on it is a
       rectangle at every thinning value. */
    else if (v === 'tip') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.13, at: m.petalTip, dir: m.petalTangent });
    /* TIP, FACE-ON — down the petal's own NORMAL. The tip now has a WIDTH
       story as well as a thickness one, and the width lives in the outline:
       edge-on shows how thick the end is, face-on shows whether it comes to a
       point. Both are needed, which is exactly why the first tip sheet's
       single face-on crop was the wrong choice rather than a bad one. */
    else if (v === 'tipface') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.13, at: m.petalTip, dir: m.petalNormal });
    /* The whole blade edge-on: the WEDGE, thick at the root and thin at the
       tip, which is what a gradient looks like. */
    else if (v === 'profile') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.62, at: m.petalMid, dir: m.petalTangent });
    /* PLAN — down the axis at the junction. The blade roots against the hub
       disc, which is what "the connection" actually is (the feet themselves
       are buried in the slab; see the header). Framed by petalLength, never
       by the ring, so the ring's shrink is not normalised away. */
    else if (v === 'plan') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.50, at: [0, 0, 0], dir: [0.05, -0.05, 1] });
    /* Three-quarter at the junction: the same subject with the hub plate's
       own thickness visible. */
    else if (v === 'junction') await pg.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), { r: L * 0.44, at: [0, 0, 0], dir: [0.35, -0.9, 0.45] });
    await pg.waitForTimeout(220);
    shots[v] = await pg.locator('#bloom-canvas').screenshot();
  }
  const caption = `${numbers(m)}${note ? `<br>${note}` : ''}`;
  console.log(`  ${label.padEnd(52)} ${legacy ? 'foot n/a (no controls)' : `foot ${m.ringWidth.toFixed(2)}x${m.ringThickness.toFixed(2)}`} ring ${m.ringRadius.toFixed(2)} tris(live) ${m.liveTris}`);
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
]) feet.push(await cell({ label, set: set(s), views: ['plan', 'junction'], note }));

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
]) tips.push(await cell({ label, set: set(s), views: ['tip', 'profile'], note }));

/* ---- 3. THE DIVERGENCE CELL (Eva's ruling, Aug 31) ---- */
console.log('the live-vs-printed divergence:');
const diverge = [];
for (const [label, s, note] of [
  ['sheet 1.20 — live IS printed', { sheetThickness: 1.2 },
   'Above the 1.0 mm floor, so the two modes are the same geometry and the read-out prints one line. Every bloom shipped so far has been in this state, which is exactly why the divergence had never had to be told.'],
  ['sheet 0.60 — live is NOT printed', { sheetThickness: 0.6 },
   'RULED (Eva, Aug 31): no geometry change in either mode, but the divergence must be TOLD. footRing()\'s area rule reads the thickness the solids are ACTUALLY built at, so flooring the sheet moves the RING — 6.25 mm live against 8.07 mm printed, a 29% difference in the arrangement, not a wall. The read-out prints both, labelled. A "print preview" toggle rendering the floored geometry live is PARKED in the charter and deliberately not built: a preview that silently shows an arrangement the print will not produce is the same lie as an unlabelled triangle count.'],
]) diverge.push(await cell({ label, set: set(s), views: ['whorl', 'junction'], note }));

/* ---- 3b. THE TIP RULING: before / after, edge-on AND face-on ---- */
const tipRuling = [];
{
  const tipBase = process.argv.indexOf('--tip-before') > 0 ? process.argv[process.argv.indexOf('--tip-before') + 1] : null;
  if (tipBase) {
    console.log(`the tip ruling, before/after (before = ${tipBase}):`);
    const tb = await serveRepo(tipBase);
    tipRuling.push(await cell({
      label: 'BEFORE — the floored stub', views: ['tip', 'tipface', 'whorl'], prt: tb.port, legacy: true,
      note: 'TIP_HALF_MM floored EVERY row in both modes, so the last four of 28 blade rows (profile 0.795, 0.398, 0.119, 0.000) all clamped to 0.800 and ran PARALLEL — then a flat face square to the blade closed the stub. The exponent family already reaches zero; the floor truncated it and capped the truncation.',
    }));
    tb.server.close();
    tipRuling.push(await cell({
      label: 'AFTER — the converging cap', views: ['tip', 'tipface', 'whorl'],
      note: 'The cap enters where the profile falls to twice the print floor (or the final fifth, whichever is later) and converges linearly to the terminal face. Live reaches 0.30 mm; export floors it at 1.60 mm and still converges at least 2:1. The apex is an explicitly truncated mini-face, NOT a true apex vertex: a true apex collapses NV columns onto one edge, which is the DOME cos(PI/2) defect, and it would also make live and export different meshes — a property the export gate now rates.',
    }));
    tipRuling.push(await cell({
      label: 'HELD — the authored truncate (breadth 0.60)', set: set({ petalTipBreadth: 0.6 }), views: ['tip', 'tipface', 'whorl'],
      note: 'The other side of the partition. Above breadth 0 the flat end is a CHOSEN shape (rose, poppy), not a floor artifact, so it is untouched and bit-identical to the pre-ruling tree. Every row here must hold while every pointed row moves — asserted both ways.',
    }));
  }
}

/* ---- 4. BEFORE / AFTER at the shipping default ---- */
const beforeAfter = [];
if (beforeRoot) {
  console.log(`before/after at the shipping default (before = ${beforeRoot}):`);
  const b = await serveRepo(beforeRoot);
  beforeAfter.push({ ...(await cell({ label: 'BEFORE — 3c542fb, the shipping default', views: ['whorl', 'junction'], prt: b.port, legacy: true,
    note: 'The tree immediately before the thickness layer, served from a git worktree and rendered by the same browser, camera and framing. Its app has no thickness controls at all, so the whole-registry state comparison is skipped for this cell alone — its read-back and its readout check still run.' })) });
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
   `Eva's first ruling (Aug 31, from the live page): the connection is too thick. Top row is the PLAN VIEW down the axis; bottom row the same junction three-quarter, with the hub plate's own thickness visible. THE FEET THEMSELVES CANNOT BE PHOTOGRAPHED: they run inward from the ring inside a hub disc of exactly the ring radius, on the same plane at the same thickness, so they are buried in the slab — which is what makes the junction good plumbing. What reads as the connection is the hub rim plus the blade root, and the root's width is the root blend reading ring.width, so delicacy moves exactly what is in frame. Both views are framed by petalLength, never by the ring: scaling the camera to the quantity under test would normalise its shrink away. Delicacy scales the foot's WIDTH and nothing else: a thickness-scaling delicacy is inert in export below 0.833 at the default sheet, because the 1.0 mm floor eats 83% of its range, and a live page showing delicacy the print cannot deliver is the thing this session exists to stop. Chrome hidden, autoRotate off, one fresh page per cell, every value read back, and both gates' structural assertions run before the shutter. SCOPE: ${THICKNESS_SCOPE}.`,
   pairs(feet, 'plan', 'junction'), 'shot', 4],
  ['thickness-tip', 'Tip thinning — and where the export floor takes over',
   `Eva's second ruling: the tip is too thick. Both rows are EDGE-ON, down the petal's own width direction — face-on a sheet has no thickness and every cell comes out the same rectangle. Top row crops the tip; bottom row is the whole blade, where a gradient reads as a wedge. Read the captions with the pictures: the live view is authoring-true and renders what was asked for, while the print is floored at 1.0 mm, so from thinning 0.17 upward at the shipping sheet the two are different objects and every cell says which is which. The last cell is the only shape of state where the gradient survives to the print. The first cell also carries the TIP_HALF_MM photograph — the tip is 1.60 mm WIDE, a floor this session reports and does not touch, so a later edge-treatment ruling has a picture rather than a number.`,
   pairs(tips, 'tip', 'profile'), 'shot', 4],
  ['thickness-divergence', 'Live is not printed — the ring radius, labelled',
   `The divergence this layer introduces, and Eva's ruling on it. Because footRing()'s area rule reads the thickness the solids are actually built at, the export floor moves the whole arrangement, not just a wall: at a 0.60 mm sheet the ring is 6.25 mm live and 8.07 mm printed. Nothing about the geometry changes in either mode — the one-owner rule is doing exactly what its header says — but the read-out now prints both numbers, labelled, whenever they differ, on the same discipline the triangle counts have carried since the counts stopped being convertible.`,
   pairs(diverge, 'whorl', 'junction'), 'shot', 2],
];
if (tipRuling.length) SHEETS.push(['tip-ruling', 'The tip comes to a point — before, after, and the side that holds',
  "Eva's ruling (Sep 1) and the evidence for it. Left cell is the tree immediately before, served from a git worktree and rendered by the same browser and camera. Three views per cell because the tip now has a WIDTH story as well as a thickness one: EDGE-ON (top) shows how thick the end is, FACE-ON (middle) shows whether it comes to a point, and the whole bloom (bottom) shows what it does at arm's length. The third cell is the held side of the partition — an authored truncate at tip breadth 0.60, which must not change and does not. Note what the export floor still does to the printed tip: live converges to a 0.30 mm face, the print to 1.60 mm, so the point you see is finer than the point that prints — the same divergence the sheet next door is about, and one more reason the coupon matters.",
  [...tipRuling.map((c) => ({ ...c, shot: c.tip, label: c.label + ' (edge-on)' })),
   ...tipRuling.map((c) => ({ ...c, shot: c.tipface, label: c.label + ' (face-on)' })),
   ...tipRuling.map((c) => ({ ...c, shot: c.whorl, label: c.label + ' (whole bloom)' }))], 'shot', 3]);
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
