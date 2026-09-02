/* ===================================================================
   shot-bloom-fan.mjs — contact sheets for the FAN: a symmetric arc across
   one axis instead of a full circle. Session 10. Canvas only.

   THE QUESTION THIS SHEET EXISTS TO ANSWER, and it is the one no number here
   can: DOES IT READ AS A FAN? Every measurement this session produced says
   the machinery is correct — the arc is exactly antisymmetric about the
   plane (450 of 450 slot pairs sum to exactly 0), the roles partition, the
   area rule is bit-exact, the export is watertight and one piece. None of
   that says the thing on screen looks like the fans Eva screenshotted. That
   is her eye, and it is ruled from these cells.

   THE CONTROL IS THE POINT OF THE SHEET, not a courtesy. Every fan cell sits
   beside a RADIAL BLOOM UNCHANGED — the same petal count, the same
   everything else — so what the placement changed is legible rather than
   asserted. A fan photographed alone looks like a bloom with a gap in it;
   photographed beside the ring it replaces, it looks like a decision.

   THE MIRROR LINE MUST BE LEGIBLE, which is a FRAMING requirement and the
   reason this sheet leads face-on. The plane contains the axis and azimuth
   0, so the fan opens symmetrically about screen +x — and `fitCamera` gained
   an explicit `up` in session B precisely because looking down the axis with
   `dir = up = [0,0,1]` has no defined roll. Every face-on cell here passes
   that `up` so the mirror line lands in the same place in every frame and
   two cells can be compared at all.

   THREE VIEWS, AND EACH ANSWERS A DIFFERENT HALF.
     face   down the axis. THE ARC AND THE OPEN WEDGE — where the fan is a
            fan, where the mirror line runs, and which petals are which.
     wedge  down the axis, rotated so the OPEN BACK faces down the page. The
            hood is the pair straddling that wedge, and face-on with the
            labellum at the bottom puts the hood at the top edge where it is
            hardest to read.
     profile horizontal, through the hub plane. Depth: the tilt, the layers,
            and whether a labellum hangs.
   A cell photographed in a view its own subject is invisible in has not been
   photographed (the flower project's lesson, and every bloom sheet's since).

   FRAMING IS THE APP'S OWN CAMERA, never a crop and never re-derived
   projection maths. THE FRAME IS ASSERTED, NOT TRUSTED — chrome hidden and
   autoRotate off, both read back via stillFrame(); one fresh page per cell;
   every value read back; the whole registry state compared against
   DEFAULTS + set; and the gates' OWN junction AND zygomorphy assertions
   (J1–J6, Z1–Z7) run on every cell before the shutter. That last one is not
   decoration: an arc that has lost its mirror looks exactly like one that
   has not — same triangle count, same byte length, watertight, one piece —
   and this sheet is the one place a human would rule from the picture
   without noticing.

   WHAT THIS SHEET IS NOT. It is not a gate. Watertightness is
   verify-bloom-export.mjs, connectedness is verify-bloom-connectedness.mjs,
   and the structural claims are J1–J6 and Z1–Z7, which both gates run on
   every row. This shows what a fan LOOKS like, which no gate can.

   RUN:  node tools/shot-bloom-fan.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, zygoAssertions, ZYGO_SCOPE, DEFAULTS } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-fan';

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

async function cell({ label, set = [], views = ['face'], note = '' }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const jct = await junctionAssertions(page, { set });
  if (jct.length) await die(`${label}: ${jct.join('; ')}`);
  /* Z1–Z7 ON EVERY CELL, and Z7 is the reason this line matters more here
     than on any previous sheet. An arc one half-step off the mirror plane
     renders as a fan — a plausible, symmetric-looking fan — and every other
     instrument passes it. A sheet that let such a cell through would put a
     wrong arrangement in front of the person ruling on arrangements. */
  const zyg = await zygoAssertions(page, { label, set });
  if (zyg.length) await die(`${label}: ${zyg.join('; ')}`);
  await page.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const m = await page.evaluate(() => window.__bloomMetrics());

  /* THE CELL'S OWN CLAIM, CHECKED AGAINST THE APP. A cell captioned as a fan
     must be showing one; a control cell must not be. Derived from the SET the
     cell asked for and compared against what the BUILDER reported, so the
     caption cannot describe a design other than the one in the frame. */
  const wantsFan = String(want.placement) === 'FAN';
  if (m.fanMode !== wantsFan) {
    await die(`${label}: the cell asks for ${wantsFan ? 'a fan' : 'a full circle'} and the builder reports fanMode=${m.fanMode}`);
  }
  /* AND THE PETAL COUNT IN THE CAPTION IS THE BUILDER'S, never the slider's.
     Under FAN `petalCount` is hidden and describes nothing, so a caption
     reading it would be the label-lie this whole session is about. */
  if (wantsFan && m.slotsPerWhorl !== 2 * Math.round(Number(want.fanPerSide)) + (String(want.fanMirror) === 'PETAL' ? 1 : 0)) {
    await die(`${label}: the builder reports ${m.slotsPerWhorl} slots, which is not what this cell's controls derive`);
  }

  const shots = {};
  for (const v of views) {
    /* FACE-ON — straight down the axis, with an explicit `up` so the mirror
       line has a defined place on the page. Without it "face-on" has no roll
       at all (dir and up would be parallel), which did not matter while every
       bloom was radially symmetric and matters completely for one with a
       face. */
    if (v === 'face') await page.evaluate((r) => window.__bloomFrame(r, 0, [0, 0, 0], [0, 0, 1], [-1, 0, 0]), m.fitRadius);
    /* WEDGE — the same axial view rolled a half turn, so the OPEN BACK faces
       down the page and the HOOD pair sits at the bottom edge where it can be
       read. Same camera, same distance; only the roll differs. */
    else if (v === 'wedge') await page.evaluate((r) => window.__bloomFrame(r, 0, [0, 0, 0], [0, 0, 1], [1, 0, 0]), m.fitRadius);
    /* PROFILE — horizontal, looking along the mirror plane's own normal, so
       the arc is seen edge-on and depth is what is left. Camera up is +z, so
       "higher on the page" is "higher on the bloom". */
    else if (v === 'profile') await page.evaluate((r) => window.__bloomFrame(r, 0, [0, 0, 0], [0, 1, 0]), m.fitRadius);
    else await page.evaluate((r) => window.__bloomFrame(r, 0.15), m.fitRadius);
    await page.waitForTimeout(220);
    shots[v] = await page.locator('#bloom-canvas').screenshot();
  }

  /* THE ARC, THE WEDGE AND THE STEP — all from the builder's own fan record,
     never re-derived, so the caption cannot disagree with the geometry. */
  const deg = (r) => (r * 180 / Math.PI);
  const arrangement = m.fanMode
    ? `FAN · ${m.slotsPerWhorl} petals (${m.fan.perSide}/side${m.fan.onLine ? ' + one on the mirror line' : ', mirror through the gap'})`
      + ` · step ${deg(m.fan.step).toFixed(1)}°${m.fan.capped ? ` <b>(CLAMPED from ${deg(m.fan.asked).toFixed(0)}°)</b>` : ''}`
      + ` · arc ${deg(m.fan.arcSpan).toFixed(0)}° · open wedge ${(360 - deg(m.fan.arcSpan)).toFixed(0)}°`
    : `${String(want.placement).toLowerCase()} · ${m.slotsPerWhorl} petals`;
  const roleLine = m.slotRolesSplit
    ? 'roles: ' + m.rings.filter((r) => r.lambda === 0 && r.slots).map((r) => `${r.slotRole} {${r.slots.join(',')}}`).join(' · ')
    : (m.slotRolesEligible ? 'roles: eligible, no override set (one descriptor per whorl — session A\'s list, character for character)' : 'roles: not eligible here');
  const caption = `${arrangement}`
    + `<br>${roleLine}`
    + `<br>${Number(want.layerCount)} whorl${Number(want.layerCount) > 1 ? 's' : ''} · tilt ${want.petalTilt}° · spread ${Number(want.spread).toFixed(2)}x · centre ${String(want.centerStyle).toLowerCase()}`
    + ` · hub ${m.hubRadius.toFixed(1)} mm`
    + `<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · max dim (live) ${m.maxDimMm.toFixed(1)} mm`
    + (note ? `<br>${note}` : '');
  console.log(`  ${label.padEnd(56)} ${m.fanMode ? 'FAN' : 'ctrl'} n=${String(m.slotsPerWhorl).padStart(2)} ${m.fanMode ? `arc ${deg(m.fan.arcSpan).toFixed(0)}°` : '        '} tris(live) ${m.liveTris}`);
  return { label, caption, ...shots };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ---- 1. THE HEADLINE. The same SIX petals, placed evenly and placed as a
       fan — identical count, identical triangle count, identical hub, so the
       only thing that can differ is where the petals sit. ---- */
console.log('the headline pair — the fan against the same six petals in a ring:');
const headline = [];
headline.push(await cell({
  label: 'THE CONTROL — six petals, radial',
  set: set({ petalCount: 6 }),
  views: ['face', 'profile'],
  note: 'THE SAME SIX PETALS AS A FULL CIRCLE, and the reason it is here rather than implied. It is not a different bloom: same count, same 8,664 triangles, same area-ruled hub of 7.66 mm — the area rule is AZIMUTH-BLIND, so the ring the fan lands on is the same ring this one lands on. Everything the cell beside it changed is the azimuths.',
}));
headline.push(await cell({
  label: 'THE FAN — the same six, across one axis',
  set: set({ placement: 'FAN' }),
  views: ['face', 'profile'],
  note: 'THE SESSION\'S DELIVERABLE. A 225° arc with a 135° open wedge, symmetric about the mirror line — which runs left–right across the frame, between the two inner petals. The arrangement is EXACTLY antisymmetric about it: az[i] + az[n−1−i] = 0 to the bit on every pair, which Z7 asserts and which nothing else here can see. The hub stays a FULL DISC (Eva\'s ruling from the measurements): the fan adds a median 1.6 percentage points of bare hub over this control, and at spread 6 it adds between −0.1 and 8.6.',
}));

/* ---- 2. THE TOGGLE, AS A PAIR. The one thing that changes the parity of
       the count, and therefore the whole role structure. ---- */
console.log('the toggle, both ways:');
const toggle = [];
toggle.push(await cell({
  label: 'MIRROR THROUGH THE GAP (n = 6, even)',
  set: set({ placement: 'FAN' }),
  views: ['face', 'wedge'],
  note: 'THE DEFAULT, and the arrangement Eva screenshotted. The plane runs between the two innermost petals: the involution i ↔ n−1−i is FIXED-POINT-FREE at even n, so no petal lies on the line and the labellum is the inner PAIR. That pairing is the one the charter derived three sessions ago while correcting session A\'s SPIRAL premise, before anyone knew what it was for.',
}));
toggle.push(await cell({
  label: 'PETAL ON THE MIRROR LINE (n = 7, odd)',
  set: set({ placement: 'FAN', fanMirror: 'PETAL' }),
  views: ['face', 'wedge'],
  note: 'ONE PETAL BISECTED BY THE PLANE. Adding it makes n odd, and the SAME involution then has exactly one fixed point — so the toggle changes the roles without anything in the derivation branching on it. That is the whole of what it does: the parity IS the toggle. This petal is the labellum, which is Eva\'s original fan principle (“the petal on the mirror line is petal number one, and it has its own sliders”) arriving as an arrangement rather than as a role.',
}));

/* ---- 3. THE SPACING SWEEP, at a fixed count, so the one axis moving is the
       angle between neighbours — including the state where the arc cap takes
       over from the slider. ---- */
console.log('the spacing sweep:');
const spacing = [];
for (const [v, note] of [
  [15, 'THE NARROW END. A 75° arc: the petals overlap heavily at the foot ring, which is the construction rather than a defect — blades interpenetrate at EVERY reachable setting in this generator and interpenetration adds no boundary edges.'],
  [25, 'Opening. The arc reaches 125° and the wedge is still the larger half of the circle.'],
  [35, ''],
  [45, 'THE DEFAULT — the flower\'s own, and the value the fan Eva approved was drawn at. A 225° arc and a 135° wedge.'],
  [60, 'THE WIDE END at three per side: a 300° arc, 60° of wedge left. The cap has not bitten here — the outermost petal sits at 150°, inside the 170° limit.'],
]) {
  spacing.push(await cell({ label: `spacing ${v}°`, set: set({ placement: 'FAN', fanSpacing: v }), note }));
}
spacing.push(await cell({
  label: 'spacing 60° × 6 per side — THE CAP BITES',
  set: set({ placement: 'FAN', fanPerSide: 6, fanSpacing: 60 }),
  note: 'THE ONLY REACHABLE STATE WHERE THE ARC CAP BINDS, and it ships photographed rather than hidden. Twelve petals at 60° would sweep 660°; the 170° limit on the outermost petal holds the step at 30.9°, leaving a 340° arc and a 20° wedge — the closest a fan comes to closing on itself. The slider keeps its whole range and SATURATES, and the read-out says (CLAMPED), which is the roll floor\'s discipline: a slider that has stopped moving must not read as broken.',
}));

/* ---- 4. THE COUNT SWEEP. ---- */
console.log('the count sweep:');
const counts = [];
for (const [perSide, mirror, note] of [
  [1, 'GAP', 'TWO PETALS — the fewest a fan can have, and the one state with too few slots to carry roles: both petals would be the labellum pair and the hood would have no members, which is what Z4 already fails a control-bearing role on. The eight slot controls are HIDDEN here by the registry\'s own predicate and INERT by derivation.'],
  [1, 'PETAL', 'THREE PETALS, ONE ON THE LINE — and this is the orchid, arriving through the arrangement instead of through a role: one big lip below, two raised tepals above, no laterals at all. It is the same partition session B ruled from at petalCount 3.'],
  [2, 'GAP', 'FOUR: the labellum pair and the hood pair, with no laterals between them.'],
  [4, 'GAP', ''],
  [6, 'GAP', 'TWELVE — the most a fan can carry. At 15° that is a tight sheaf; the blades overlap at the ring, as they do at every count in this generator.'],
]) {
  counts.push(await cell({
    label: `${perSide} per side · ${mirror === 'PETAL' ? 'on the line' : 'through the gap'}`,
    set: set({ placement: 'FAN', fanPerSide: perSide, fanMirror: mirror, fanSpacing: perSide >= 6 ? 15 : 45 }),
    note,
  }));
}

/* ---- 5. THE FAN × THE LABELLUM. The zygomorphy roles COMPOSING onto the
       arrangement rather than being redone — Eva's ruling, as a picture. ---- */
console.log('the fan × the labellum:');
const roles = [];
const FAN_ORCHID = { labellumSize: 1.6, labellumTilt: -25, labellumCup: 0.5, labellumCurl: -60, labellumTipBreadth: 0.25, hoodSize: 1.15, hoodTilt: 40, hoodCup: -0.3 };
roles.push(await cell({
  label: 'THE CONTROL — the fan, undifferentiated',
  set: set({ placement: 'FAN' }),
  views: ['face', 'profile'],
  note: 'THE SAME FAN WITH EVERY ROLE CONTROL AT ITS IDENTITY. No override record resolves, so footRing() returns session A\'s descriptor list on session A\'s arithmetic, character for character, and every blade takes the pre-zygomorphy path. This is the byte claim as a picture and it is what the cells beside it are a change FROM.',
}));
roles.push(await cell({
  label: 'THE LABELLUM IS THE INNER PAIR (mirror through the gap)',
  set: set({ placement: 'FAN', ...FAN_ORCHID }),
  views: ['face', 'profile'],
  note: 'THE ROLES COMPOSE ONTO THE ARRANGEMENT — Eva\'s ruling, and the seam session A wrote and session B kept: the fan changes the arrangement and the role DERIVATION reads it. Nothing about the override mechanism moved. With the mirror through the gap the labellum is a PAIR, so the same override set that makes one lip on a radial orchid makes a two-lobed one here.',
}));
roles.push(await cell({
  label: 'THE LABELLUM IS ONE BISECTED PETAL (on the line)',
  set: set({ placement: 'FAN', fanMirror: 'PETAL', ...FAN_ORCHID }),
  views: ['face', 'profile'],
  note: 'THE SAME OVERRIDES WITH THE TOGGLE THE OTHER WAY. One petal on the plane takes the whole labellum record — Eva\'s original fan principle exactly. Identical controls to the cell at its left; the only difference is the parity of the count.',
}));
roles.push(await cell({
  label: 'ONE PER SIDE, ON THE LINE — the orchid',
  set: set({ placement: 'FAN', fanPerSide: 1, fanMirror: 'PETAL', ...FAN_ORCHID }),
  views: ['face', 'profile'],
  note: 'THREE PETALS: one IS the labellum, the other two ARE the hood, and there are no laterals at all. This is the cell session B ruled the orchid from, reached through the arrangement instead of through petalCount.',
}));

/* ---- 6. THE JUNCTION, AND DEPTH. The states the disc ruling was made on,
       plus what layers do to an arc. ---- */
console.log('the junction and depth:');
const junction = [];
junction.push(await cell({
  label: 'spread 6 × centre OFF — the loudest plate',
  set: set({ placement: 'FAN', spread: 6, centerStyle: 'NONE' }),
  note: 'THE STATE THE DISC RULING WAS MADE ON, photographed rather than argued. 78.9% of this hub is bare — and its RADIAL twin at the same six petals is bare by 78.9% too, to the tenth of a point. The plate is a SPREAD problem that has shipped since #123, not a fan one: because overhang is 0.4·R0, feet only ever occupy the outer 40% of the radius, so bare hub is dominated by the radial direction rather than the azimuthal one.',
}));
junction.push(await cell({
  label: 'spread 6 × 1 per side × 15° × centre OFF — the worst of it',
  set: set({ placement: 'FAN', spread: 6, fanPerSide: 1, fanSpacing: 15, centerStyle: 'NONE' }),
  note: 'THE FAN\'S OWN CONTRIBUTION AT ITS LARGEST ON A LARGE PLATE: 91.3% bare against its radial twin\'s 88.0% — 3.3 points, on a disc 26.5 mm across. Sweeping 900 configurations, the fan\'s excess over its twin has a MEDIAN of 1.6 points; the largest percentage excess (49.5) is on a hub 3.9 mm across and amounts to 5.7 mm² of bare slab.',
}));
junction.push(await cell({
  label: 'spread 6 × centre DISC — the shipping default',
  set: set({ placement: 'FAN', spread: 6 }),
  note: 'THE SAME PLATE WITH THE SHIPPING CENTRE ON IT, which is what a visitor actually sees: the designed DISC is a full round of 0.75·R0 and covers most of the plumbing. A sector hub would have changed nothing here — the centre is round by Eva\'s own archetype ruling and the hub rim is a quarter-radius annulus behind it.',
}));
junction.push(await cell({
  label: 'spread min — feet crowd the axis',
  set: set({ placement: 'FAN', spread: 0.6 }),
  views: ['face', 'profile'],
  note: 'THE OTHER END. The ring is tighter than the derived radius and the feet crowd (the area rule is a reference, not a cage — Eva, Aug 31). The junction still reaches every foot because `overhang` is a FRACTION of the ring with a 1.5 mm floor; at this corner a SECTOR hub would have had to span 360° anyway, which is one of the seven of seventeen named corners where it degenerates to the disc it replaces.',
}));
junction.push(await cell({
  label: 'three whorls — nested arcs',
  set: set({ placement: 'FAN', layerCount: 3 }),
  views: ['face', 'profile'],
  note: 'DEPTH UNDER AN ARC. Layers are meaningful here and needed nothing new: each whorl is a smaller, steeper fan on the same plane. `layerPhase` is HIDDEN and forced to exactly 0 in this placement (Eva\'s ruling) — a whorl offset would swing the inner arcs off the one plane the arrangement exists to have, which is the 30.000°-at-n=3 asymmetry session B measured. Read the PROFILE for the tilt step.',
}));
junction.push(await cell({
  label: 'three whorls × the labellum',
  set: set({ placement: 'FAN', layerCount: 3, ...FAN_ORCHID }),
  views: ['face', 'profile'],
  note: 'BOTH ROLE AXES UNDER AN ARC: every whorl carries the (layer × slot) product, so each nested fan has its own labellum and hood. The descriptor list is one per (layer × role), which is session B\'s shape multiplied by the fan\'s derivation rather than rewritten.',
}));

await browser.close();
server.close();

/* ---- compose (pure presentation: one page screenshot per sheet) ---- */
const CELL = 320;
/* PROFILE IS LETTERBOXED for the arrangement sheet's measured reason: the
   canvas is square and a bloom seen edge-on is wide and flat, so a profile
   shot leaves roughly two thirds of its cell empty and the depth lands
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
const rowsOf = (cells, views) => views.flatMap((v) =>
  cells.map((c) => ({ ...c, shot: c[v], view: v, label: v === 'face' ? c.label : `${c.label} (${v})` })));

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, cells, perRow] of [
  ['fan-headline', 'The fan — the same six petals, in a ring and across one axis',
   'THE HEADLINE PAIR IS THESE TWO CELLS, and the control is the point rather than a courtesy: the same six petals, the same 8,664 triangles, the same 7.66 mm area-ruled hub — because the area rule is AZIMUTH-BLIND, the ring a fan lands on is the ring the circle lands on. So the only thing that can differ between them is where the petals sit. TOP ROW IS FACE-ON, with the mirror line running left–right across the frame; SECOND ROW IS THE PROFILE. The arrangement is EXACTLY antisymmetric about the plane — az[i] + az[n−1−i] = 0 to the bit on all 450 reachable slot pairs — which Z7 asserts and which no STL check, triangle count or byte length can see.',
   rowsOf(headline, ['face', 'profile']), 2],
  ['fan-toggle', 'The fan — the mirror line through a petal, and through the gap',
   'THE TOGGLE IS THE PARITY OF THE COUNT, and that is the whole of what it does to the roles. n = 2·(per side) + (one on the line ? 1 : 0), and the fan\'s involution i ↔ n−1−i is fixed-point-free at even n and has exactly one fixed point at odd n — so ONE law covers both positions and nothing in the derivation branches on the control. TOP ROW IS FACE-ON with the labellum toward the bottom of the frame; SECOND ROW IS THE SAME VIEW ROLLED A HALF TURN so the OPEN WEDGE — and the hood pair straddling it — faces down the page, which is the only way the hood is legible at all.',
   rowsOf(toggle, ['face', 'wedge']), 2],
  ['fan-spacing', 'The fan — the spacing sweep, and the arc cap',
   'ONE AXIS MOVING: the angle between neighbours, at a fixed three per side, then the one state where the 170° arc cap takes over from the slider. The cap is an OUTPUT clamp and never a range limit — the roll floor\'s pattern — so the slider keeps its whole span and saturates, with the read-out saying (CLAMPED). The last cell is the only reachable state where it binds, and it ships photographed rather than hidden, on Eva\'s standing pattern for extremes (max-roll faceting, the ROLL CLAMP look, the spread-6 plate, the 135° and 161.25° tilts).',
   rowsOf(spacing, ['face']), 6],
  ['fan-counts', 'The fan — how many petals, and where the roles land',
   'THE COUNT IS DERIVED from petals-per-side and the toggle; `petalCount` is HIDDEN in this placement rather than relabelled, because petals-per-turn describes nothing in an arrangement with no turn. The first cell is the only fan too small to carry roles — two petals, both of them the labellum pair, leaving the hood with no members — and the eight slot controls hide there by the registry\'s own predicate and are inert by derivation. The second cell is the ORCHID reached through the arrangement: three petals, one of them the labellum, two the hood, no laterals at all.',
   rowsOf(counts, ['face']), 5],
  ['fan-labellum', 'The fan × the labellum — the roles composing onto the arrangement',
   'EVA\'S RULING AS A PICTURE: the zygomorphy roles COMPOSE onto the fan rather than being redone. The override mechanism is untouched — session A\'s ROLE_OVERRIDES, resolveRoleOverrides() and the object-identity guard all survive; what changed is the DERIVATION, which now reads the fan\'s own involution. The control at the left has every role control at its identity, so no record resolves and footRing() returns session A\'s descriptor list character for character. The two cells after it carry IDENTICAL override values and differ only in the toggle: the labellum is a PAIR when the mirror runs through the gap and ONE BISECTED PETAL when it runs through a petal. TOP ROW FACE-ON, SECOND ROW PROFILE — a labellum that hangs is a depth statement and is invisible face-on.',
   rowsOf(roles, ['face', 'profile']), 4],
  ['fan-junction', 'The fan at the junction, and depth',
   'THE HUB KEEPS THE FULL DISC (Eva, session 10), and these are the states that ruling was made on. The first cell is the loudest plate a fan reaches: 78.9% of it is bare — and its RADIAL twin at the same count is bare by 78.9% too. The second is where the fan\'s own contribution is largest on a large plate: 91.3% against a twin\'s 88.0%, three points. Across 900 swept configurations the fan\'s excess over its twin has a MEDIAN of 1.6 percentage points. A derived SECTOR was measured and rejected: it would turn J2\'s exact containment equality into an atan2 bound, it must span ≥ 359.6° anyway on 7 of 17 named corners (at ALL THIN a foot\'s angular half-extent reaches 130.7° — it crosses the axis and comes out the far side), and it saves 0.29–1.2% of triangles while costing MORE than the disc when it saturates. The last two cells are depth: layers are nested arcs on one shared plane, and `layerPhase` is hidden and forced to 0 so they cannot fall out of step.',
   rowsOf(junction.slice(0, 3), ['face']).concat(rowsOf(junction.slice(3), ['face', 'profile'])), 3],
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
