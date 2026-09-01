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
         GOLDEN_ANGLE, FOOT_MIN_WIDTH_MM } from './bloom-harness.mjs';
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
function gapRatio(seq, placement) {
  const TAU = Math.PI * 2;
  if (placement === 'RADIAL') return 1;
  /* CONTINUOUS steps by the same golden angle, over the WHOLE sequence rather
     than per whorl — so the statistic is the same computation on a longer
     list, and it is passed the sequence length rather than petalCount. It is
     still only a caption: at 120 slots the gaps are tiny and the number says
     less about the picture than the picture does. */
  const az = Array.from({ length: seq }, (_, i) => ((i * GOLDEN_ANGLE) % TAU + TAU) % TAU).sort((a, b) => a - b);
  const gaps = az.map((a, i) => (i === seq - 1 ? az[0] + TAU : az[i + 1]) - a);
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
  const isCont = String(want.placement) === 'CONTINUOUS';
  /* THE SEQUENCE LENGTH, and the sheet derives it from the two controls it
     SET rather than from the page — so agreeing with the app's own
     `sequenceLength` is a check rather than a tautology. */
  const seq = isCont ? Number(want.petalCount) * Number(want.layerCount) : Number(want.petalCount);
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  /* WHAT THE READOUT SAYS UNDER EACH ARM: "petals 8" when a ring is a whorl,
     "petals 120 (40/turn)" when the whole bloom is one sequence. Asserting
     the ringed phrasing on a continuous cell would have made this reactivity
     check fail on every new cell; asserting nothing would have made it stop
     checking. It asserts the arm's own phrasing. */
  const wantPetals = isCont ? `petals ${seq} (${Number(want.petalCount)}/turn)` : `petals ${Number(want.petalCount)}`;
  if (!readout.includes(wantPetals)) {
    await die(`${label}: set petalCount ${want.petalCount} through the UI but the readout says "${readout}" — expected "${wantPetals}"; the app did not react`);
  }
  /* THE FLAG IS READ BACK FROM THE PAGE, not predicted. This sheet exists to
     let Eva judge the flagged state, so a cell claiming the flag is on had
     better be showing a bloom the app flagged. What it counts is the
     SEQUENCE, which is petalCount under SPIRAL and petalCount x layerCount
     under CONTINUOUS. */
  const flagShown = /SPIRAL BELOW \d+ IN THE SEQUENCE/.test(readout);
  const flagWanted = (String(want.placement) === 'SPIRAL' || isCont) && seq < SPIRAL_LEGIBLE_COUNT;
  if (flagShown !== flagWanted) await die(`${label}: low-count spiral flag ${flagShown ? 'SHOWN' : 'ABSENT'}, expected ${flagWanted ? 'SHOWN' : 'ABSENT'} (sequence ${seq})`);

  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!(m.hubRadius > 0)) await die(`${label}: metrics report hub radius ${m.hubRadius}`);
  /* ONE RING PER LAYER, OR ONE PER PETAL — checked against the arm the cell
     asked for, so a continuous cell that quietly built rings dies here as
     well as at J5 rather than being photographed. */
  const wantRings = isCont ? seq : Number(want.layerCount);
  if (m.rings.length !== wantRings) {
    await die(`${label}: asked for ${wantRings} rings (${want.placement}, depth ${want.layerCount}), the builder reports ${m.rings.length}`);
  }
  if (m.continuousMode !== isCont) await die(`${label}: placement ${want.placement} but the builder reports continuousMode ${m.continuousMode}`);

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
  const ratio = gapRatio(seq, String(want.placement));
  const unit = isCont ? 'turn' : 'layer';
  /* AT UP TO 120 RINGS THE LIST IS NOT A CAPTION. The continuous arm prints
     the span and the per-slot step instead — the two numbers that say whether
     the layers dissolved, which is the whole question this sheet is for. */
  const ringSpan = isCont
    ? `${m.rings.length} rings ${m.rings[0].radius.toFixed(1)} → ${m.rings[m.rings.length - 1].radius.toFixed(1)} mm, step ${(m.rings[0].radius - m.rings[1].radius).toFixed(3)}–${(m.rings[m.rings.length - 2].radius - m.rings[m.rings.length - 1].radius).toFixed(3)} mm`
    : m.rings.map((r) => r.radius.toFixed(1)).join(' / ') + ' mm';
  const floored = m.rings.filter((r) => r.widthClamped).length;
  /* Every number carries its MODE. `tris` is LIVE here and says so. */
  const caption = `${isCont ? `${seq} petals (${n}/turn)` : `${n} petals`} · ${String(want.placement).toLowerCase()} · ${layers} ${unit}${layers > 1 ? 's' : ''}`
    + (layers > 1 ? ` · shrink ${Number(want.layerSize).toFixed(2)}x/${unit}${isCont ? '' : ` · offset ${Number(want.layerPhase).toFixed(2)} slot`} · tilt +${want.layerTilt}°/${unit}` : '')
    + `<br>rings (live) ${ringSpan} · hub ${m.hubRadius.toFixed(1)} mm · tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`
    + (floored ? `<br><b>${floored} of ${m.rings.length} feet at the ${FOOT_MIN_WIDTH_MM.toFixed(2)} mm width floor</b>` : '')
    + `<br>gap max/min ${ratio.toFixed(2)}${flagShown ? ' · <b>FLAGGED: sequence below ' + SPIRAL_LEGIBLE_COUNT + '</b>' : ''}`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(56)} ${layers}${unit[0].toUpperCase()} ${String(want.placement).padEnd(10)} n=${String(n).padStart(2)} rings ${m.rings.length} · tris(live) ${m.liveTris}${floored ? ` · ${floored} floored` : ''}${flagShown ? ' · FLAGGED' : ''}`);
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
/* Spiral under SPIRAL is applied PER LAYER — each whorl runs its own
   golden-angle sequence, offset by its own layerPhase. The continuous
   cross-layer sequence that used to be recorded here as an alternative IS NOW
   BUILT, as the third placement value; its own sheet is below. */
placement.push(await cell({
  label: 'SPIRAL x 3 layers x 13 petals', set: set({ placement: 'SPIRAL', layerCount: 3, petalCount: 13 }),
  views: ['plan', 'whorl'],
  note: 'The two arrangement axes together under the LAYERED spiral. Each layer runs its OWN golden-angle sequence offset by layerPhase — which is exactly what reads as three stacked rings wearing spiral azimuths, and what the continuous sheet below is the answer to.',
}));
placement.push(await cell({
  label: 'CONTINUOUS x 3 turns x 13 petals', set: set({ placement: 'CONTINUOUS', layerCount: 3, petalCount: 13 }),
  views: ['plan', 'whorl'],
  note: 'The same two axes under the CONTINUOUS spiral, for direct comparison with the cell beside it: one sequence of 39 slots winding inward, every petal on a ring of its own. Same golden angle, same controls, same petal budget — the rings are gone.',
}));

/* ---- 2b. THE HEADLINE: Eva's own screenshot config, ringed against
       continuous. This is the pair the session exists to put in front of
       her, and it is deliberately the FIRST thing on its sheet: 40 petals,
       spread 1.55, three deep, tilt-stepped — the state she described as
       "still very distinct layers". Both cells carry the identical petal
       budget (120) and therefore the identical triangle count, so nothing in
       the comparison is bought with geometry. ---- */
console.log('the headline pair — Eva\'s config, ringed against continuous:');
const EVA = { petalCount: 40, spread: 1.55, layerCount: 3 };
const headline = [];
headline.push(await cell({
  label: 'RINGED — layered spiral, 40 petals x 3 layers',
  set: set({ ...EVA, placement: 'SPIRAL' }), views: ['whorl', 'plan'],
  note: 'THE STATE EVA DESCRIBED. Three whorls of 40, each running its own golden-angle sequence. The radius is a STEP FUNCTION over the build order: 117 of the 119 steps between consecutive petals are exactly 0.0000 mm and 2 of them are 6.4209 mm — 28.0% of the hub radius in one jump. That cliff is what reads as three stacked rings.',
}));
headline.push(await cell({
  label: 'CONTINUOUS — one sequence, same 120 petals',
  set: set({ ...EVA, placement: 'CONTINUOUS' }), views: ['whorl', 'plan'],
  note: 'THE SAME CONTROLS, THE SAME 120 PETALS, THE SAME 149,568 EXPORT TRIANGLES. Every one of the 119 steps is now between 0.0658 and 0.1735 mm — 0.82% of the hub radius, about one percent of a petal width. The hub is 7.5% smaller because the area rule sums smaller inner feet, and the innermost blade is 13.17 mm against the ringed 18.14 mm because three TURNS wind deeper than three stacked rings, which are only two turns apart. Both are derived; neither is tuned.',
}));

/* ---- 2c. THE CONTINUUM'S OWN AXES: winding depth and shrink rate, plus the
       whole-bloom default before and after. ---- */
console.log('the continuum — winding depth and shrink rate:');
const continuous = [];
for (const [label, s2, note] of [
  ['DEFAULT — 1 layer, RADIAL (unchanged)', {}, 'The shipping default, and the byte claim: nothing selects the new value, so every pre-existing export is bit-identical. 0 of 47, 0 of 76, 0 of 86, 0 of 106, 0 of 125 and 0 of 158 frozen rows moved — 598 rows, and the default bloom is 11,136 tris live and export alike at 543.8 KiB, before and after.'],
  ['CONTINUOUS x 1 turn (the default, dissolved)', { placement: 'CONTINUOUS' }, 'THE DEFAULT BLOOM UNDER THE NEW VALUE — the whole-bloom before/after against the cell beside it. At one turn the sequence winds 0.875 of a turn inward, so CONTINUOUS is NOT the same object as SPIRAL even here: eight petals on eight rings rather than eight on one. Same 11,136 triangles.'],
  ['CONTINUOUS x 2 turns', { placement: 'CONTINUOUS', layerCount: 2 }, 'Depth 2. `layerCount` is turns in this mode and the read-out says so; the law is the same one the layered arm uses, evaluated at a non-integer layer index.'],
  ['CONTINUOUS x 3 turns', { placement: 'CONTINUOUS', layerCount: 3 }, 'Depth 3, the maximum. MAX_LAYERS still bounds the DEPTH — 24 rings here, not 24 layers — and the binding constraint is still the petal rather than the triangle count.'],
  ['CONTINUOUS x 3 turns x shrink 0.90', { placement: 'CONTINUOUS', layerCount: 3, layerSize: 0.9 }, 'THE SHALLOWEST GRADIENT. The innermost blade is 25.58 mm against the outermost 35 — the sequence barely tapers, and the hub is only 2.5% smaller than the ringed equivalent. The 0.90 cap is the layered arm\'s measured coincidence bound and it carries over unchanged.'],
  ['CONTINUOUS x 3 turns x shrink 0.35 (the deepest foot)', { placement: 'CONTINUOUS', layerCount: 3, layerSize: 0.35, petalCount: 40 }, 'THE EXTREME THIS SESSION\'S FAILURE MODES LIVE AT, and it is an AESTHETIC degeneracy rather than a topological one. The deepest reachable scale is 0.35^2.975 = 0.0440: a 1.54 mm blade on a foot floored at 1.60 mm — a blade narrower than its own root, which is the same condition that caps MAX_LAYERS at three. 67 of the 120 feet are at the floor and the read-out names the range. It stays watertight and one connected piece; it is a tab, not a petal. Photographed rather than capped, on the standing pattern.'],
] ) continuous.push(await cell({ label, set: set(s2), views: ['whorl', 'plan'], note }));

/* ---- 3. the extreme, photographed rather than capped ---- */
console.log('the parked extreme:');
const extremes = [];
extremes.push(await cell({
  label: '135° EFFECTIVE TILT — petalTilt 75 x layerTilt 30',
  set: set({ layerCount: 3, petalTilt: 75, layerTilt: 30 }), views: ['profile', 'whorl'],
  note: 'RULED SHIP-AND-PHOTOGRAPH (Eva, Sep 1), on her own standing pattern for every extreme so far. The third whorl is at 135 degrees — past vertical, leaning back in over the centre, a state petalTilt (max 75) cannot reach alone. A blade sweeping into the hub adds no boundary edges and can only read as MORE connected; it is a shape decision, not a hazard. Exports watertight and as ONE piece — it is a named row in both gates. If it offends, capping layerTilt is one range change with this cell as its evidence.',
}));
extremes.push(await cell({
  label: '161.25° EFFECTIVE TILT — CONTINUOUS x petalTilt 75 x tilt +30/turn',
  set: set({ placement: 'CONTINUOUS', layerCount: 3, petalTilt: 75, layerTilt: 30 }), views: ['profile', 'whorl'],
  note: 'A NEW EXTREME, past the 135-degree cell above and unreachable by any combination of the layered controls. Continuous accumulates the tilt gain over 2.975 TURNS rather than 2 layer steps, so it reaches 86.25 degrees of gain against the layered arm\'s 60. Same standing pattern applies — a blade sweeping back over the hub adds no boundary edges and can only read as MORE connected — so this ships photographed rather than capped, and it is a named row in both gates. Capping layerTilt is one range change with THIS cell as its evidence; do not cap it on the strength of the number.',
}));
extremes.push(await cell({
  label: 'CONTINUOUS x 3 turns x ALL THIN x spread min — 120 rings at the worst corner',
  set: set({ placement: 'CONTINUOUS', layerCount: 3, petalCount: 40, sheetThickness: 0.6, tipThinning: 0.8, footDelicacy: 0.25, spread: 0.6 }),
  views: ['whorl', 'profile'],
  note: `THE OVERLAP BOX AT 120 RINGS INSTEAD OF 3, and it is the SAME 1.50 x 1.60 x 1.00 mm = 2.400 mm³ — because none of overhang (1.5 mm absolute floor), width (FOOT_MIN_WIDTH_MM) or thickness (MIN_FEATURE_MM in export) is a function of the SLOT index any more than it was of the layer index. The innermost ring radius here is 0.206 mm, so the deepest feet run through the axis and out the other side; that is the same reachable design state spread-min has always had, not a new one. SCOPE: ${JUNCTION_SCOPE}`,
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
  ['arrangement-continuous', 'The continuous spiral — Eva\'s config, ringed against continuous',
   'THE HEADLINE PAIR IS THE FIRST TWO CELLS, and it is the whole brief: 40 petals, spread 1.55, three deep, tilt-stepped — the state Eva described as "still very distinct layers" — beside the same controls under the continuous law. Both carry 120 petals and 149,568 export triangles, so nothing in the comparison is bought with geometry; what changes is that the radius stops being a step function. RINGED: 117 of 119 steps between consecutive petals are exactly 0.0000 mm and 2 are 6.4209 mm (28.0% of the hub radius). CONTINUOUS: every step is 0.0658–0.1735 mm, about one percent of a petal width. The law is ONE law under two quantizers of the layer index — floor(k/petalCount) against k/petalCount — so `petalCount` is still petals per turn, `layerCount` still the depth, `layerSize` still the shrink per unit of depth, and nothing reinterprets. Rows three onward sweep the continuum\'s own axes and end at the deepest foot the ranges reach, which is where this session\'s failure modes live: an aesthetic degeneracy (a blade narrower than its own root), never a topological one.',
   pairs([...headline, ...continuous], 'whorl', 'plan'), 'shot', 4],
  ['arrangement-extremes', 'The arrangement — the parked extremes, and the junction\'s worst corners',
   'Four cells, all shipped rather than capped, all photographed so the ruling is made with eyes open. The 135-degree effective tilt is a state petalTilt alone cannot reach (75 max); the 161.25-degree cell beside it is the continuous arm reaching further still, because it accumulates the same tilt gain over 2.975 turns rather than 2 layer steps — a NEW extreme this session introduces, and the one thing on this sheet that is not inherited. The two ALL THIN x spread min corners are where the junction argument is thinnest, at 3 rings and at 120: the overlap box is the SAME 1.50 x 1.60 x 1.00 mm = 2.400 mm³ in both, because none of its three dimensions is a function of the layer OR slot index. All four are named rows in both geometry gates and all four export watertight and as one connected piece.',
   pairs(extremes, 'profile', 'whorl'), 'shot', 4],
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
