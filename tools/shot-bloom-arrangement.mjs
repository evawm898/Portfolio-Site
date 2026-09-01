/* ===================================================================
   shot-bloom-arrangement.mjs — contact sheets for the ARRANGEMENT: multiple
   whorls, and golden-angle placement. Canvas only.

   THE SHEET EXISTS TO ANSWER ONE QUESTION THE NUMBERS CANNOT, and it is the
   condition Eva's ruling attached to the layer work: DOES TILT-DRIVEN DEPTH
   READ? Layered depth here comes from tilt, not from height. Every layer's
   feet sit at z = 0, because a foot at z = h leaves the hub slab at
   |h| >= t — 1.20 mm at the shipping sheet, 0.60 ALL-THIN, against a 35 mm
   petal — so a height control's whole range is invisible and it cannot be
   widened, the bound being the sheet itself. Tilting inner whorls steeper
   instead raises their tips 6.60 mm above the outer whorl (layerSize 0.90 x
   layerTilt +12), 5.5x what any safe height control could give.

   THAT IS A MEASUREMENT, NOT A PICTURE, WHICH IS WHY THIS SHEET IS THE
   RULING'S CONDITION. If the layering reads FLAT to Eva's eye, that is the
   evidence — the only evidence — that reopens the costed fallback recorded
   in footRing()'s header: extending the junction to REACH lifted feet, a
   derived collar spanning [0, h] under each inner ring, with its own
   watertightness argument and gate rows. It is not built and there is no
   stub for it. Nothing else reopens it.

   THREE VIEWS, BECAUSE DEPTH IS NOT VISIBLE FROM ABOVE.
     whorl    the app's automatic fit — the bloom as it is normally seen
     plan     straight down the axis — the PLACEMENT question: how the slots
              sit around the circle, which is what RADIAL vs SPIRAL changes
              and the only view that answers it
     profile  horizontal, through the hub plane — the DEPTH question: how far
              the inner whorls stand above the outer, which is the whole of
              what tilt is doing here and is invisible in plan
   A cell photographed in a view its own subject is invisible in has not been
   photographed (the flower project's lesson, and the form sheet's).

   TWO STATES ARE ON THIS SHEET BECAUSE A RULING NEEDS THEM, not to decorate:

     1. THE SUB-8 SPIRAL. The charter used to say "gate or flag golden-angle
        placement below n ~ 8". Measured: the gap-ratio statistic oscillates
        between 1.62 and 2.62 at EVERY count, with no discontinuity at 8 or
        anywhere else, so there is no geometric threshold to gate on. Low
        counts are ALLOWED and FLAGGED. The sheet shows the flagged state
        beside the same count in RADIAL and beside a high-count spiral, so
        the aesthetic claim the flag makes can be judged rather than trusted.

     2. THE 135-DEGREE EFFECTIVE TILT. petalTilt 75 x layerTilt 30 puts the
        third layer's blades past vertical, leaning back in over the centre —
        a state petalTilt alone cannot reach. Eva's ruling (Sep 1): SHIP IT
        AND PHOTOGRAPH IT, on her own standing pattern for every extreme so
        far (max-roll faceting, the spread-6 plate, the ROLL CLAMP look). The
        cell is here so that ruling is made with eyes open; if it offends,
        capping layerTilt is one range change with this picture as evidence.

   AND ONE BEFORE/AFTER AT THE DEFAULTS, which is the byte claim made
   visible: layerCount 1 + RADIAL is the shipping default and must be the
   pre-layer bloom exactly. The numbers say 0 of 47, 0 of 76, 0 of 86 and
   0 of 106 frozen rows moved; this is the same statement as a picture.

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and
   autoRotate off, both read back via stillFrame(); one fresh page per cell;
   every value read back; the whole registry state compared against
   DEFAULTS + set; the readout checked so the app is known to have REACTED
   through the real UI route; and the gates' OWN junction assertions run on
   every cell before the shutter, because a picture of geometry whose feet
   left the hub plane is not evidence of anything and the sheet is the one
   place a human would not notice.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness and connectedness
   are measured on the export by verify-bloom-export.mjs and
   verify-bloom-connectedness.mjs, and the junction's own structural claims —
   J1-J4 — are asserted by junctionAssertions() in both. Note that a green
   connectedness run does NOT endorse the junction under layers: the
   wrong-hub mutation passes it on every configuration tried. This shows what
   the arrangement LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-arrangement.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, JUNCTION_SCOPE, CONTROLS, DEFAULTS, SPIRAL_LEGIBLE_COUNT,
         GOLDEN_ANGLE } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-arrangement';
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* The angular gap statistic, computed here for the caption ONLY — it is a
   description of the picture, never an input to it. RADIAL is 360/n by
   definition; SPIRAL's gaps are what the golden angle leaves once the slots
   are sorted around the circle. This is the number that has no threshold in
   it, printed so the reader can see that for themselves. */
function gapRatio(n, placement) {
  const TAU = Math.PI * 2;
  if (placement !== 'SPIRAL') return 1;
  const az = Array.from({ length: n }, (_, i) => ((i * GOLDEN_ANGLE) % TAU + TAU) % TAU).sort((a, b) => a - b);
  const gaps = az.map((a, i) => (i === n - 1 ? az[0] + TAU : az[i + 1]) - a);
  return Math.max(...gaps) / Math.min(...gaps);
}

async function cell({ label, set = [], views = ['whorl'], note = '' }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  /* The gates' OWN junction assertions, not a relaxed copy. J1 is the one
     that matters here: a picture of a bloom whose feet left the hub plane
     would look fine and be broken, and the voxel gate would not fire until
     roughly 2.5 mm of lift. */
  const jct = await junctionAssertions(page, { set });
  if (jct.length) await die(`${label}: ${jct.join('; ')}`);
  await page.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  if (!new RegExp(`petals ${Number(want.petalCount)}\\b`).test(readout)) {
    await die(`${label}: set petalCount ${want.petalCount} through the UI but the readout says "${readout}" — the app did not react`);
  }
  /* THE FLAG IS READ BACK FROM THE PAGE, not predicted. This sheet exists to
     let Eva judge the flagged state, so a cell claiming the flag is on had
     better be showing a bloom the app flagged. */
  const flagShown = /SPIRAL BELOW \d+ PETALS/.test(readout);
  const flagWanted = String(want.placement) === 'SPIRAL' && Number(want.petalCount) < SPIRAL_LEGIBLE_COUNT;
  if (flagShown !== flagWanted) await die(`${label}: low-count spiral flag ${flagShown ? 'SHOWN' : 'ABSENT'}, expected ${flagWanted ? 'SHOWN' : 'ABSENT'}`);

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!(m.hubRadius > 0)) await die(`${label}: metrics report hub radius ${m.hubRadius}`);
  if (m.ringLayers.length !== Number(want.layerCount)) {
    await die(`${label}: asked for ${want.layerCount} layers, the builder reports ${m.ringLayers.length}`);
  }

  const shots = {};
  for (const v of views) {
    if (v === 'whorl') await page.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    /* PLAN — straight down the axis. Placement is an azimuth question and
       this is the only view that answers it. */
    else if (v === 'plan') await page.evaluate((a) => window.__bloomFrame(a.r, 0, [0, 0, 0], [0, 0, 1]), { r: m.fitRadius });
    /* PROFILE — horizontal, through the hub plane. The DEPTH view: how far
       each inner whorl stands above the outer one. Looking down +x with the
       camera up still +z, so "higher on the page" is "higher on the bloom". */
    else if (v === 'profile') await page.evaluate((a) => window.__bloomFrame(a.r, 0, [0, 0, 0], [1, 0, 0]), { r: m.fitRadius });
    await page.waitForTimeout(220);
    shots[v] = await page.locator('#bloom-canvas').screenshot();
  }

  const n = Number(want.petalCount);
  const layers = Number(want.layerCount);
  const ratio = gapRatio(n, String(want.placement));
  const rings = m.ringLayers.map((r) => r.radius.toFixed(1)).join(' / ');
  /* Every number carries its MODE. `tris` is LIVE here and says so. */
  const caption = `${n} petals · ${String(want.placement).toLowerCase()} · ${layers} layer${layers > 1 ? 's' : ''}`
    + (layers > 1 ? ` · size ${Number(want.layerSize).toFixed(2)}x · offset ${Number(want.layerPhase).toFixed(2)} slot · tilt +${want.layerTilt}°/layer` : '')
    + `<br>rings (live) ${rings} mm · hub ${m.hubRadius.toFixed(1)} mm · tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`
    + `<br>gap max/min ${ratio.toFixed(2)}${flagShown ? ' · <b>FLAGGED: below ' + SPIRAL_LEGIBLE_COUNT + ' petals</b>' : ''}`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(52)} ${layers}L ${String(want.placement).padEnd(6)} n=${String(n).padStart(2)} rings ${rings} · tris(live) ${m.liveTris}${flagShown ? ' · FLAGGED' : ''}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. DOES THE LAYERING READ? size x phase, at 2 and 3 layers ---- */
console.log('layered blooms — size and phase variations:');
const layered = [];
for (const [label, s, note] of [
  ['1 layer — the shipping default', {}, 'The default, and the byte claim: layerCount 1 + RADIAL executes the pre-layer path verbatim. 0 of 47, 0 of 76, 0 of 86 and 0 of 106 frozen rows moved.'],
  ['2 layers — size 0.72, offset 0.50', { layerCount: 2 }, 'The shipping layer defaults. Offset 0.50 is half a slot — the botanically universal alternation of successive whorls, carried as the DEFAULT VALUE rather than as the absence of a control.'],
  ['2 layers — size 0.90 (barely smaller)', { layerCount: 2, layerSize: 0.9 }, 'The upper bound of layerSize, and it is MEASURED rather than tidy: at 1.00 with offset 0 two whorls are exactly coincident and the export carries 14,832 non-manifold edges. At 0.90 it is 0.'],
  ['2 layers — size 0.35 (a small inner rosette)', { layerCount: 2, layerSize: 0.35 }, 'The lower bound, where the inner blade is short and its foot is already floored by FOOT_MIN_WIDTH_MM. Reachable, reported with (CLAMPED), not a defect.'],
  ['2 layers — offset 0 (whorls ALIGNED)', { layerCount: 2, layerPhase: 0 }, 'Inner petals directly behind outer ones instead of between them. The alternative to alternation, and the reason offset is exposed rather than derived.'],
  ['3 layers — size 0.72, offset 0.50', { layerCount: 3 }, 'Three whorls at the shipping defaults. Ring radii nest by the size ratio directly; the hub is the outermost, sized by the area rule over EVERY foot.'],
  ['3 layers — size 0.90, tilt +12 (the deepest cup)', { layerCount: 3, layerSize: 0.9 }, 'THE DEPTH CASE. Inner tips stand 6.60 mm above the outer whorl — five and a half times what a height control could give before its feet left the hub slab. Every foot is still flat at z = 0.'],
  ['3 layers — tilt step 0 (no erection)', { layerCount: 3, layerTilt: 0 }, 'The control case for the depth question: size and radius nesting ALONE, with no tilt step. Inner whorls sit BELOW the outer tips (-4.14 mm and -7.12 mm) rather than proud of them. This is what the sheet is comparing against.'],
  ['3 layers — tilt step +30 (max erection)', { layerCount: 3, layerTilt: 30 }, 'Maximum layer tilt at the default petalTilt: the third whorl is at 85 degrees, essentially vertical.'],
] ) layered.push(await cell({ label, set: set(s), views: ['whorl', 'profile'], note }));

/* ---- 2. PLACEMENT: radial vs spiral, low and high count ---- */
console.log('placement — radial vs spiral, plan view:');
const placement = [];
for (const n of [5, SPIRAL_LEGIBLE_COUNT, 21]) {
  for (const p of ['RADIAL', 'SPIRAL']) {
    const sub = p === 'SPIRAL' && n < SPIRAL_LEGIBLE_COUNT;
    placement.push(await cell({
      label: `${p} x ${n} petals${sub ? ' — THE FLAGGED STATE' : ''}`,
      set: set({ placement: p, petalCount: n }), views: ['plan', 'whorl'],
      note: sub
        ? `THE STATE THE FLAG IS ABOUT, and the one Eva is asked to judge. It is ALLOWED and LABELLED, never hidden: the gap ratio has no discontinuity at ${SPIRAL_LEGIBLE_COUNT} (it oscillates 1.62/2.62 at every count), so there is no threshold to gate on — the claim that this reads as an irregular whorl rather than as phyllotaxis is aesthetic, and this is the picture it gets ruled from.`
        : (p === 'SPIRAL'
          ? 'Golden angle, 137.51 degrees per slot. The gaps fall into Fibonacci runs rather than a single spacing — that is what parastichies are made of.'
          : 'Even spacing, the shipping default. Every gap identical by construction, so the ratio is exactly 1.00.'),
    }));
  }
}
/* Spiral is applied PER LAYER — each whorl runs its own golden-angle
   sequence, offset by its own layerPhase. The continuous cross-layer
   sequence (index = L*count + i) is the more phyllotactic reading and is
   recorded as an alternative, not built. */
placement.push(await cell({
  label: 'SPIRAL x 3 layers x 13 petals', set: set({ placement: 'SPIRAL', layerCount: 3, petalCount: 13 }),
  views: ['plan', 'whorl'],
  note: 'The two arrangement axes together. Each layer runs its OWN golden-angle sequence offset by layerPhase; a single continuous sequence across all layers is a recorded alternative, deliberately not built.',
}));

/* ---- 3. the extreme, photographed rather than capped ---- */
console.log('the parked extreme:');
const extremes = [];
extremes.push(await cell({
  label: '135° EFFECTIVE TILT — petalTilt 75 x layerTilt 30',
  set: set({ layerCount: 3, petalTilt: 75, layerTilt: 30 }), views: ['profile', 'whorl'],
  note: 'RULED SHIP-AND-PHOTOGRAPH (Eva, Sep 1), on her own standing pattern for every extreme so far. The third whorl is at 135 degrees — past vertical, leaning back in over the centre, a state petalTilt (max 75) cannot reach alone. A blade sweeping into the hub adds no boundary edges and can only read as MORE connected; it is a shape decision, not a hazard. Exports watertight and as ONE piece — it is a named row in both gates. If it offends, capping layerTilt is one range change with this cell as its evidence.',
}));
extremes.push(await cell({
  label: '3 layers x ALL THIN x spread min — the junction\'s worst corner',
  set: set({ layerCount: 3, sheetThickness: 0.6, tipThinning: 0.8, footDelicacy: 0.25, spread: 0.6 }),
  views: ['whorl', 'profile'],
  note: `The tightest ring against the most delicate foot, three layers deep. The overlap box is 1.50 x 1.60 x 1.00 mm ON EVERY LAYER — the same bound the single ring had, because none of overhang (1.5 mm floor), width (FOOT_MIN_WIDTH_MM) or thickness (MIN_FEATURE_MM) is a function of the layer index. SCOPE: ${JUNCTION_SCOPE}`,
}));

await browser.close();
server.close();

/* ---- compose (pure presentation: one page screenshot per sheet) ---- */
const CELL = 300;
/* COMPOSITION, and it is a real correction rather than styling. The canvas is
   square and a bloom seen EDGE-ON is wide and flat, so a profile shot leaves
   roughly two thirds of its cell empty and the depth — the thing the profile
   row exists to show — lands small. The fix is presentational and touches no
   render: profile frames are DISPLAYED in a short letterbox, centre-cropped
   with object-fit, so the vertical padding goes and the subject fills the
   width. The pixels are the app's own camera either way; nothing is rescaled
   or re-projected, and the plan and whorl views keep the square cell their
   subject actually fills. */
const LETTERBOX = new Set(['profile']);
const fig = (c, which) => (c[which] ? `<figure><img class="${LETTERBOX.has(c.view || which) ? 'wide' : ''}" src="data:image/png;base64,${c[which].toString('base64')}">
  <figcaption><b>${c.label}</b><br>${c.caption}</figcaption></figure>` : '');
function sheet(title, note, cells, which, perRow) {
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin:0; background:#000; color:#9fdcc4; font:12px ui-monospace,Menlo,monospace; }
    h1 { font-size:15px; margin:14px 12px 2px; color:#cfeee0; }
    p.note { margin:0 12px 10px; opacity:.65; max-width:1100px; line-height:1.5; }
    main { display:grid; grid-template-columns:repeat(${perRow}, ${CELL}px); gap:10px; padding:12px; }
    figure { margin:0; }
    img { width:${CELL}px; height:${CELL}px; display:block; background:#000; }
    img.wide { height:${Math.round(CELL * 0.46)}px; object-fit:cover; object-position:center; }
    figcaption { padding-top:4px; opacity:.72; font-size:10.5px; line-height:1.45; }
    figcaption b { color:#cfeee0; font-weight:500; }
  </style><h1>${title}</h1><p class="note">${note}</p><main>${cells.map((c) => fig(c, which)).join('')}</main>`;
}
/* `shot` is the composed key, but the LETTERBOX rule needs to know which view
   produced it, so the view name travels with the cell rather than being
   inferred from its position in the grid. */
const pairs = (cells, a, b) => [
  ...cells.map((c) => ({ ...c, shot: c[a], view: a })),
  ...cells.map((c) => ({ ...c, shot: c[b], view: b, label: c.label + ` (${b})` })),
];

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, cells, which, perRow] of [
  ['arrangement-layers', 'The arrangement — layers, and whether tilt-driven depth reads',
   'THE RULING\'S CONDITION. Layered depth here comes from TILT, not height: every layer\'s feet sit at z = 0 because a foot at z = h leaves the hub slab at |h| >= t (1.20 mm at the shipping sheet, 0.60 ALL-THIN) against a 35 mm petal — a height control\'s whole range is invisible and cannot be widened, the bound being the sheet itself. Tilting inner whorls steeper raises their tips 6.60 mm above the outer whorl instead, 5.5x what any safe height control could give. Top row is the whorl view as the bloom is normally seen; SECOND ROW IS THE PROFILE, horizontal through the hub plane, which is where depth is actually visible. The "tilt step 0" cell is the control case: size and radius nesting with no erection at all. If this reads FLAT, that is the evidence — the only evidence — that reopens the costed collar fallback recorded in footRing()\'s header.',
   pairs(layered, 'whorl', 'profile'), 'shot', 3],
  ['arrangement-placement', 'The arrangement — radial against golden-angle placement',
   'PLAN VIEW FIRST, straight down the axis, because placement is an azimuth question and no other view answers it; the whorl view follows. The charter used to say "gate or flag golden-angle placement below eight petals". Measured: the gap ratio oscillates between 1.62 and 2.62 at EVERY count with no discontinuity at 8 or anywhere else, so there is no geometric threshold to gate on — low counts are ALLOWED and FLAGGED, and the flagged cells here are the state that claim is about. Gating was rejected on two further grounds: hiding the option would strand the model IN the spiral state with the control unreachable, and auto-resetting would move geometry as a side effect of a hidden rule.',
   pairs(placement, 'plan', 'whorl'), 'shot', 4],
  ['arrangement-extremes', 'The arrangement — the parked extreme, and the junction\'s worst corner',
   'Two cells, both shipped rather than capped, both photographed so the ruling is made with eyes open. The 135-degree effective tilt is a state petalTilt alone cannot reach (75 max) and it leans the innermost whorl back in over the centre; Eva ruled ship-and-photograph on her own standing pattern for extremes. The ALL THIN x spread min corner is where the junction argument is thinnest — and the overlap box is the SAME 1.50 x 1.60 x 1.00 mm on every layer, because none of its three dimensions is a function of the layer index. Both are named rows in both geometry gates and both export watertight and as one connected piece.',
   pairs(extremes, 'profile', 'whorl'), 'shot', 2],
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
