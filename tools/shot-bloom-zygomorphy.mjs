/* ===================================================================
   shot-bloom-zygomorphy.mjs — contact sheets for ZYGOMORPHY: petals that
   differ by POSITION. Session A of two, so this sheet is about PER-LAYER
   roles — the iris. Canvas only.

   THE QUESTION THIS SHEET EXISTS TO ANSWER, and it is the one no number here
   can: DO THE TWO WHORLS READ AS DIFFERENT THINGS? Every measurement this
   session produced says the machinery is correct — the roles partition, the
   records reach the blades, the area rule is bit-exact, the export is
   watertight and one piece. None of that says the falls hang and the
   standards rise. That is Eva's eye, and it is ruled from these cells.

   THE CONTROL IS THE POINT OF THE SHEET, not a courtesy. Every zygomorphic
   cell sits beside a RADIAL BLOOM UNCHANGED — the same controls with the
   three deltas at zero — so what changed is legible rather than asserted.
   A before/after in one frame is the only form in which "the whorls now
   differ" can be judged at all: a differentiated bloom photographed alone
   looks like a bloom.

   TWO VIEWS, AND EACH ANSWERS A DIFFERENT HALF.
     face-on  down the axis. WHICH PETALS ARE WHICH — the outer whorl's
              silhouette against the inner one's, which is where a different
              tip and a different cup are visible and where the plan of the
              flower reads.
     profile  horizontal, through the hub plane. WHICH WAY THEY CURVE — falls
              hanging against standards rising is a DEPTH statement, and it is
              invisible face-on. The iris is defined by this view.
   A cell photographed in a view its own subject is invisible in has not been
   photographed (the flower project's lesson, and every bloom sheet's since).

   WHAT IS NOT ON THIS SHEET, and it is a scope statement rather than an
   omission: the ORCHID. A labellum needs a mirror plane and a slot role, and
   both are session B. This sheet is the iris and says so; a cell captioned
   "the flower has a face" belongs to the sheet that can show one.

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and
   autoRotate off, both read back via stillFrame(); one fresh page per cell;
   every value read back; the whole registry state compared against
   DEFAULTS + set; and the gates' OWN junction AND zygomorphy assertions run
   on every cell before the shutter. That last one is not decoration: a
   picture of a bloom whose override record never reached the blade looks
   exactly like a picture of a bloom with the deltas at zero, and this sheet
   is the one place a human would rule from the picture without noticing.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness is
   verify-bloom-export.mjs, connectedness is verify-bloom-connectedness.mjs,
   and the structural claims are Z1-Z3 in zygoAssertions(), which both gates
   run on every row. This shows what zygomorphy LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-zygomorphy.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, zygoAssertions, ZYGO_SCOPE, CONTROLS, DEFAULTS,
         ROLE_OVERRIDES, ROLE_INNER, LAW_IDENTITY } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-zygomorphy';

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

async function cell({ label, set = [], views = ['face', 'profile'], note = '' }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { set });
  if (jct.length) await die(`${label}: ${jct.join('; ')}`);
  /* THE ZYGOMORPHY ASSERTIONS, ON EVERY CELL. The failure this catches is the
     one that would otherwise be ruled on from a picture: an override record
     that resolves correctly and never reaches the blade renders as an
     UNDIFFERENTIATED bloom under a caption saying it is differentiated, and
     nothing in the frame says otherwise. Measured, on a worktree: it exports
     watertight, in one piece, at an identical triangle count and byte length,
     and passes J1-J6, formAssertions and thicknessAssertions alike. */
  const zyg = await zygoAssertions(page, { label, set });
  if (zyg.length) await die(`${label}: ${zyg.join('; ')}`);
  await page.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const m = await page.evaluate(() => window.__bloomMetrics());

  /* THE CELL'S OWN CLAIM, CHECKED AGAINST THE APP. A cell captioned
     "differentiated" must be showing a bloom whose inner whorl was actually
     built from a different state; a control cell must be showing one that was
     not. Derived from the SET the cell asked for and compared against what
     the BUILDER said it used, so the caption cannot describe a design other
     than the one in the frame. */
  /* SCOPED TO THE LAYER-ROLE ROWS (session B renamed the key and added slot
     roles to this table). This sheet is session A's and photographs the IRIS
     — a per-LAYER claim — so a slot-role control must not make its cells read
     as differentiated. */
  const anyDelta = ROLE_OVERRIDES.some((o) => o.role === ROLE_INNER && Number(want[o.control]) !== LAW_IDENTITY[o.law]);
  const innerIdx = m.rings.findIndex((r) => r.role === ROLE_INNER);
  const hasInner = innerIdx >= 0;
  /* A CELL IS DIFFERENTIATED IFF A DELTA IS NON-ZERO **AND** THERE IS AN INNER
     ROLE TO CARRY IT — and separating those two is not pedantry, it is the
     gated claim. The first draft of this check conflated "the cell set the
     deltas" with "the bloom should differ" and DIED on the CONTINUOUS cell,
     which sets all three to their maximum and must build an undifferentiated
     bloom because continuous placement has no layers to carry a role. That
     cell is the one this sheet exists to photograph; a check that cannot
     express it would have had to be deleted to keep it. */
  const shouldDiffer = hasInner && anyDelta;
  const isDiff = hasInner && m.rings[innerIdx].overrides !== null;
  if (isDiff !== shouldDiffer) {
    await die(`${label}: the cell asks for ${shouldDiffer ? 'a differentiated' : 'an undifferentiated'} bloom (deltas ${anyDelta ? 'set' : 'at zero'}, INNER role ${hasInner ? 'present' : 'absent'}) and the builder reports ${isDiff ? 'an override record' : 'none'} on the inner whorl`);
  }
  /* THE GATED CLAIM, ASSERTED POSITIVELY rather than inferred from the absence
     of a record: where the deltas are set and no role can carry them, every
     ring must have been BUILT from the base state. "No record resolved" and
     "the geometry is the same" are two claims, and only the second is what the
     cell's caption says. */
  const gatedInert = anyDelta && !hasInner;
  if (gatedInert) {
    for (const [i, p] of m.petalRingApplied.entries()) {
      for (const o of ROLE_OVERRIDES) {
        if (p.applied[o.base] !== Number(want[o.base])) {
          await die(`${label}: the deltas are gated off here, but ring ${i} was built with ${o.base} = ${p.applied[o.base]} against the base state's ${want[o.base]} — the state is not inert`);
        }
      }
    }
  }
  /* WHAT THE TWO WHORLS WERE ACTUALLY BUILT WITH — the caption's numbers come
     from the builder's own effective state, not from the sliders, so the
     caption and the geometry cannot disagree. */
  const outerApplied = m.petalRingApplied[0].applied;
  const innerApplied = innerIdx >= 0 ? m.petalRingApplied[innerIdx].applied : null;

  const shots = {};
  for (const v of views) {
    /* FACE-ON — straight down the axis. WHICH petals are which. */
    if (v === 'face') await page.evaluate((r) => window.__bloomFrame(r, 0, [0, 0, 0], [0, 0, 1]), m.fitRadius);
    /* PROFILE — horizontal, through the hub plane, camera up still +z so
       "higher on the page" is "higher on the bloom". WHICH WAY they curve,
       and the only view an iris is legible in. */
    else if (v === 'profile') await page.evaluate((r) => window.__bloomFrame(r, 0, [0, 0, 0], [1, 0, 0]), m.fitRadius);
    else await page.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    await page.waitForTimeout(220);
    shots[v] = await page.locator('#bloom-canvas').screenshot();
  }

  const dl = (k) => {
    const a = outerApplied[k], b = innerApplied === null ? a : innerApplied[k];
    return a === b ? null : `${k.replace('petal', '').toLowerCase()} ${a} → ${b}`;
  };
  const diffs = ROLE_OVERRIDES.map((o) => dl(o.base)).filter(Boolean);
  const caption = `${want.petalCount} petals · ${Number(want.layerCount)} whorl${Number(want.layerCount) > 1 ? 's' : ''}`
    + ` · tilt ${want.petalTilt}° +${want.layerTilt}°/layer · shrink ${Number(want.layerSize).toFixed(2)}x`
    + `<br>outer → inner: ${diffs.length ? `<b>${diffs.join(' · ')}</b>` : (gatedInert ? '<b>IDENTICAL — deltas at MAXIMUM and gated off</b>' : 'IDENTICAL (the control)')}`
    + `<br>rings (live) ${m.rings.map((r) => `${r.radius.toFixed(1)}`).join(' / ')} mm · hub ${m.hubRadius.toFixed(1)} mm`
    + ` · tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(52)} ${isDiff ? 'DIFFERENTIATED' : (gatedInert ? 'GATED+INERT   ' : 'control       ')} ${diffs.join(', ') || '—'} · tris(live) ${m.liveTris}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. THE IRIS, AND ITS CONTROL. The headline pair, and deliberately the
       first thing on the sheet: the SAME arrangement, the same petal count,
       the same triangle count, with the three deltas at zero and then at the
       iris. Nothing in the comparison is bought with geometry. ---- */
console.log('the headline pair — the iris against the same bloom undifferentiated:');
const IRIS_ARRANGEMENT = { layerCount: 2, petalSpineCurl: -90, petalTilt: 40, layerTilt: 30, layerSize: 0.62 };
const IRIS_DELTAS = { innerCurl: 180, innerCup: 0.45 };
const headline = [];
headline.push(await cell({
  label: 'THE CONTROL — two whorls, deltas at zero',
  set: set(IRIS_ARRANGEMENT),
  note: 'THE SAME BLOOM WITH ZYGOMORPHY OFF, and the reason it is here rather than implied. Both whorls are built from ONE state: the inner ring carries the INNER role and NO override record, so petalStateFor() hands the builder the caller\'s own state object and every blade takes the pre-zygomorphy path character for character. This is the byte claim as a picture — 598 frozen rows and the whole live matrix unmoved — and it is what the cell beside it is a change FROM.',
}));
headline.push(await cell({
  label: 'THE IRIS — falls hang, standards rise',
  set: set({ ...IRIS_ARRANGEMENT, ...IRIS_DELTAS }),
  note: 'THE SESSION\'S DELIVERABLE. Identical arrangement, identical petal count, identical triangle count; the ONLY difference is that the inner whorl is built from a different effective state. The outer whorl curls -90° (the falls, hanging outward and down); the inner whorl composes -90 + 180 = +90° and cups (the standards, rising and incurved). Read the PROFILE row: that is where an iris is defined and where face-on says nothing. Nothing about the arrangement changed — the shrink, the tilt step and the offset are the same numbers in both cells.',
}));

/* ---- 2. THE THREE DELTAS, ONE AT A TIME, each against the same control, so
       what each control does is separable rather than inferred from a
       composite. The form sheet's discipline: swept alone, each in the view
       its own effect is visible in. ---- */
console.log('the three deltas, swept one at a time:');
const singles = [];
const BASE2 = { layerCount: 2, petalTilt: 35, layerTilt: 20 };
for (const [label, s, note] of [
  ['control — no delta', {}, 'The reference for the three cells beside it. Both whorls identical; the inner ring carries the role and no record.'],
  ['inner curl −180 (standards reflex outward)', { innerCurl: -180 }, 'The delta\'s lower bound. The inner whorl curls the opposite way from the outer, which is the reflexed form — a cyclamen rather than an iris. Visible in PROFILE and nowhere else.'],
  ['inner curl +360 (standards roll right over)', { innerCurl: 360 }, 'The upper bound. A full turn of spine curl on the inner whorl alone: the standards wind back over the centre while the falls stay flat. A blade sweeping into the hub adds no boundary edges and can only read as MORE connected — the charter\'s standing finding, and this cell exports watertight and as one piece.'],
  ['inner cup +1.20 (standards close into a cone)', { innerCup: 1.2 }, 'Cup at its maximum on the inner whorl only. Cup is the one of the four curves that stretches the material across the width — the metric ratio reaches 2.600 at this value — and here that stretch applies to half the bloom. FACE-ON is where this reads: the inner whorl narrows to a cone inside an open outer one.'],
  ['inner tip +0.60 (standards blunt, falls pointed)', { innerTipBreadth: 0.6 }, 'THE TIP PARTITION, BOTH WAYS IN ONE BLOOM, and it is a state no single-whorl design can reach. `petalTipBreadth === 0` is an EXACT branch — the converging pointed cap Eva ruled on Sep 1 — so the outer whorl converges to a truncated mini-face while the inner whorl is an AUTHORED TRUNCATE with a flat end. Two different tip constructions in one export. FACE-ON is the view.'],
] ) singles.push(await cell({ label, set: set({ ...BASE2, ...s }), note }));

/* ---- 3. THE EXTREMES AND THE GATED STATES. Ship-and-photograph for the
       first, and evidence-that-nothing-happens for the second — a gated
       state that no picture shows is a claim nobody checked. ---- */
console.log('the extremes, and the gated placements:');
const extremes = [];
extremes.push(await cell({
  label: 'ALL INNER MAX x 3 whorls — one role over two',
  set: set({ layerCount: 3, innerCurl: 360, innerCup: 1.2, innerTipBreadth: 0.6, layerTilt: 20 }),
  note: 'SESSION A\'S ROLE DERIVATION MADE VISIBLE, and its deliberate coarseness with it: OUTER is the outermost whorl and INNER is EVERY whorl above it, so at three layers the second and third are identical to each other and different from the first. That is a DERIVATION, not the architecture — session B changes only which descriptors exist and who assigns slots to them, and refining INNER into INNER/INNERMOST is a design ruling with its own partition report, not a rewrite. If this reads as two things where it should read as three, that is the evidence for the refinement.',
}));
extremes.push(await cell({
  label: 'ALL INNER MAX x 40 petals x ALL THIN x spread min',
  set: set({ layerCount: 3, petalCount: 40, innerCurl: 360, innerCup: 1.2, innerTipBreadth: 0.6, sheetThickness: 0.6, tipThinning: 0.8, footDelicacy: 0.25, spread: 0.6 }),
  note: `THE JUNCTION'S WORST CORNER WITH THE OVERRIDES ON, and the overlap box is the SAME 1.50 x 1.60 x 1.00 mm = 2.400 mm³ it has been since the single ring — because none of its three dimensions is a function of the ROLE any more than it was of the layer or slot index. Note the worst case is the SMALLEST role at the deepest ring, not the largest: a bigger blade only adds overlap. SCOPE: ${ZYGO_SCOPE}`,
}));
extremes.push(await cell({
  label: 'GATED — SPIRAL x the iris (roles exist, azimuth differs)',
  set: set({ ...IRIS_ARRANGEMENT, ...IRIS_DELTAS, placement: 'SPIRAL' }),
  note: 'SPIRAL IS NOT GATED FOR PER-LAYER ROLES, and this cell is why it need not be. Spiral moves AZIMUTH only — every foot stays on its layer\'s ring — so the whorls still exist and still differ, and only where each petal sits around the circle changes. It is session B\'s SLOT roles that spiral cannot carry: reflecting a golden-angle arrangement about any plane leaves the best mirror pairing off by up to 20.062° at eight petals, 45% of a slot gap, so a "mirror" control there would be a symmetry label sitting on a measured asymmetry.',
}));
extremes.push(await cell({
  label: 'GATED — CONTINUOUS x 3 turns, deltas at MAX and INERT',
  set: set({ placement: 'CONTINUOUS', layerCount: 3, innerCurl: 360, innerCup: 1.2, innerTipBreadth: 0.6 }),
  note: 'THE GATED STATE, PHOTOGRAPHED BECAUSE A GATED STATE NOBODY LOOKS AT IS A CLAIM NOBODY CHECKED. All three deltas are at their maximum and the bloom is IDENTICAL to the same design with them at zero: continuous placement has no layers to differentiate — J5 asserts exactly that — so every ring carries the OUTER role, no record resolves, and the controls are hidden by their own registry predicates. Reinterpreting a layer role as a turn role would be a second meaning under a name that already means something else, which is `layerPhase`\'s trap. Two named rows in both gates assert this is hidden AND bit-identical.',
}));

await browser.close();
server.close();

/* ---- compose (pure presentation: one page screenshot per sheet) ---- */
const CELL = 320;
/* PROFILE IS LETTERBOXED for the arrangement sheet's measured reason: the
   canvas is square and a bloom seen edge-on is wide and flat, so a profile
   shot leaves roughly two thirds of its cell empty and the depth — the thing
   the profile row exists to show, and the whole of what an iris is — lands
   small. The pixels are the app's own camera either way; nothing is rescaled
   or re-projected. */
const LETTERBOX = new Set(['profile']);
const fig = (c) => (c.shot ? `<figure><img class="${LETTERBOX.has(c.view) ? 'wide' : ''}" src="data:image/png;base64,${c.shot.toString('base64')}">
  <figcaption><b>${c.label}</b><br>${c.caption}</figcaption></figure>` : '');
function sheet(title, note, cells, perRow) {
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin:0; background:#000; color:#9fdcc4; font:12px ui-monospace,Menlo,monospace; }
    h1 { font-size:15px; margin:14px 12px 2px; color:#cfeee0; }
    p.note { margin:0 12px 10px; opacity:.65; max-width:1200px; line-height:1.5; }
    main { display:grid; grid-template-columns:repeat(${perRow}, ${CELL}px); gap:10px; padding:12px; }
    figure { margin:0; }
    img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
    img.wide { height:${Math.round(CELL * 0.46)}px; object-fit:cover; object-position:center; }
    figcaption { padding-top:4px; opacity:.72; font-size:10.5px; line-height:1.45; }
    figcaption b { color:#cfeee0; font-weight:500; }
  </style><h1>${title}</h1><p class="note">${note}</p><main>${cells.map(fig).join('')}</main>`;
}
/* The view name travels WITH the cell rather than being inferred from its
   position in the grid, so the letterbox rule cannot drift from the frame it
   is describing. */
const pairs = (cells) => [
  ...cells.map((c) => ({ ...c, shot: c.face, view: 'face' })),
  ...cells.map((c) => ({ ...c, shot: c.profile, view: 'profile', label: c.label + ' (profile)' })),
];

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, cells, perRow] of [
  ['zygomorphy-iris', 'Zygomorphy — the iris, against the same bloom undifferentiated',
   'THE HEADLINE PAIR IS THESE TWO CELLS, and the control is the point rather than a courtesy: identical arrangement, identical petal count, identical triangle count, with the three deltas at zero and then at the iris — so the only thing that can differ is which state each whorl was built from. TOP ROW IS FACE-ON (which petals are which); SECOND ROW IS THE PROFILE, horizontal through the hub plane, and that is where an iris is defined: the outer whorl curls −90° and hangs (the falls), the inner whorl composes −90 + 180 = +90° and cups (the standards). A per-layer ROLE is what makes that possible — the whorls carry different override records, not a modulation of one law — and the identity guard is object identity, so the control cell is the pre-zygomorphy code path character for character.',
   pairs(headline), 2],
  ['zygomorphy-deltas', 'Zygomorphy — the three deltas, swept one at a time',
   'EACH DELTA ALONE, against the same control at the left, so what each control does is separable rather than inferred from a composite (the form sheet\'s discipline). Curl reads in PROFILE and nowhere else; cup and tip breadth read FACE-ON. The tip cell is the subtle one: `petalTipBreadth === 0` is an EXACT branch, so a positive delta on the inner whorl puts the CONVERGING pointed cap and the AUTHORED TRUNCATE in one export — two different tip constructions in one bloom, which no single-whorl design can reach. SIZE AND TILT ARE ABSENT ON PURPOSE: `layerSize` and `layerTilt` are λ-ramps that already own per-layer size and tilt, and a role override of either would be a second owner of one quantity — and would strand CONTINUOUS, whose only depth controls those are.',
   pairs(singles), 5],
  ['zygomorphy-extremes', 'Zygomorphy — the extremes, the coarse role derivation, and the gated placements',
   'FOUR CELLS, EACH ANSWERING A DIFFERENT QUESTION. The three-whorl cell shows session A\'s role derivation for what it is — OUTER is the outermost whorl and INNER is EVERY whorl above it, so two of three are identical — and if that reads as two things where it should read as three, this cell is the evidence for refining INNER into INNER/INNERMOST, which is a design ruling with its own partition report rather than a rewrite. The ALL THIN corner is the junction at its thinnest with the overrides on: the overlap box is the same 2.400 mm³ it has been since the single ring, because none of its dimensions is a function of the role. The last two are the GATED placements, photographed because a gated state nobody looks at is a claim nobody checked — SPIRAL keeps its whorls and therefore keeps its roles, while CONTINUOUS has no layers at all and its deltas are shown at MAXIMUM producing a bloom identical to the same design with them at zero.',
   pairs(extremes), 4],
]) {
  const p2 = await b2.newPage({ viewport: { width: perRow * (CELL + 10) + 30, height: 900 } });
  await p2.setContent(sheet(title, note, cells, perRow), { waitUntil: 'load' });
  const fp = path.join(outDir, name + '.png');
  await p2.screenshot({ path: fp, fullPage: true });
  await p2.close();
  written.push(`${fp} (${(fs.statSync(fp).size / 1024).toFixed(0)} KiB)`);
}
await b2.close();
console.log('\nsheets:\n  ' + written.join('\n  '));
console.log(`\nSCOPE: ${ZYGO_SCOPE}`);
