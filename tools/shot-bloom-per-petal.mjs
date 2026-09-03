/* ===================================================================
   THE PER-PETAL SHEET — session 11's deliverable, and the picture Eva rules
   from.

   THE COMPOSITION IS THE FAN SHEET'S, which is the flower's: the fan read
   FACE-ON with the mirror plane drawn down the middle of every frame, one
   untouched fan and one radial bloom as controls, and the extreme
   photographed rather than argued about. What this sheet adds is the thing
   the session is for — PETAL ONE CALLED OUT ON THE MIRROR LINE, and one group
   visibly differentiated from its neighbours.

   THE MIRROR LINE IS MEASURED PER CELL, never drawn at a layout guess. The
   plane contains the axis and +x; the face-on camera passes up = [-1, 0, 0],
   so +x is at the BOTTOM of the frame and the plane projects to a vertical
   line at 50% width. Every cell recomputes it from the EMITTED azimuths (the
   midpoint of a mirror pair, the same property Z4b asserts) and this sheet
   ABORTS rather than write a frame whose line is not the model's plane.

   THE RETIREMENT IS PHOTOGRAPHED, NOT ONLY RECORDED (Eva's instruction,
   Sep 3). Eva ruled that per-petal roles SUPERSEDE slot roles on the fan, so
   a fan that used to be shaped with `labellum*` is shaped with `petal1*` now
   and the old sliders do nothing there. A ruling that removes a capability
   should be visible, so the BEFORE/AFTER pair renders the IDENTICAL config on
   the base tree and on this one — two servers, two roots, one set of sliders
   — and the "before" cell is the only cell on this sheet not produced by the
   code under review. Its caption says so.

   EVERY CELL ASSERTS ITSELF, on the fan sheet's own rule. A per-petal fan
   whose numbering does not follow the mirror line renders as a perfectly
   plausible fan, and NOTHING in the frame says so — measured on a throwaway
   worktree, where an off-by-one orbit index exported watertight, in one
   piece, with zero degenerate triangles, at an identical triangle count and
   an identical STL byte length, and fired nothing in the shipped instrument
   until Z8 existed. So each cell runs the junction assertions (J7 included)
   and the zygomorphy assertions (Z7, Z8 and Z9 included), reads its whole
   state back, measures its own plane, and decodes its own PNG to refuse a
   crop.

   RUN:  node tools/shot-bloom-per-petal.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, zygoAssertions, JUNCTION_SCOPE, mirrorPartner } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-per-petal';
/* THE BASE TREE FOR THE BEFORE CELL. A git worktree of this branch's base
   commit; the sheet skips that one cell (loudly) rather than dying if it is
   not there, because the other cells are the ruling and a missing worktree is
   an operator problem rather than a defect in the code. */
const BASE_ROOT = process.argv[3] || '/tmp/base-main';
const HAVE_BASE = fs.existsSync(path.join(BASE_ROOT, 'bloom.html'));

const { server, port } = await serveRepo();
const base = HAVE_BASE ? await serveRepo(BASE_ROOT) : null;
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) {
  console.error('HARNESS INVALID: ' + msg);
  return browser.close().then(() => { server.close(); if (base) base.server.close(); process.exit(2); });
}

const FACE_UP = [-1, 0, 0];
const DEG = 180 / Math.PI;

/* `assertSelf` is FALSE only for the BEFORE cell, whose tree predates Z7-Z9
   and whose whole point is that it is built by different code. Every other
   cell asserts, and the flag is named so a reader can see which one does
   not. */
async function cell({ label, set = [], note = '', expectFan = true, onBase = false, assertSelf = true }) {
  const p = onBase ? base.port : port;
  await openBloom(page, p);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  if (assertSelf) {
    const drift = await fullStateDrift(page, set);
    if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
    for (const [n, fn] of [['junction', junctionAssertions], ['zygomorphy', zygoAssertions]]) {
      const out = await fn(page, { label, set });
      if (out.length) await die(`${label}: ${n}: ${out.join('; ')}`);
    }
  }
  await page.waitForTimeout(450);
  const m = await page.evaluate(() => window.__bloomMetrics());

  if (Boolean(m.fan) !== expectFan) {
    await die(`${label}: the cell declares expectFan=${expectFan} and the app reports ${Boolean(m.fan)} — the caption would describe a bloom other than the one in the frame`);
  }

  /* THE PLANE, FROM THE PAIR MIDPOINTS. Not from the arrangement's angular
     EXTENT, which is right for an arc and meaningless for a full circle — the
     fan sheet's own control cell caught that, reporting 22.5 deg for a bloom
     whose plane is plainly at 0. */
  if (Array.isArray(m.slotAzimuths) && m.slotAzimuths.length && (m.perPetalEligible || m.slotRolesEligible)) {
    const row = m.slotAzimuths[0];
    const n = row.length;
    for (let i = 0; i < n; i++) {
      const j = mirrorPartner(i, n, m.mirror);
      let phi = ((row[i] + row[j]) / 2) * DEG;
      phi = ((phi % 180) + 180) % 180;
      if (Math.min(Math.abs(phi), 180 - Math.abs(phi)) > 1e-6) {
        await die(`${label}: slots ${i}/${j} put the plane at ${phi.toFixed(6)} deg rather than vertical — the line this sheet draws would not be the model's plane`);
      }
    }
  }

  const arc = m.fan
    ? `${m.fan.spanDeg.toFixed(1)}° arc · ${m.fan.gapDeg.toFixed(1)}° notch · step ${m.fan.stepDeg.toFixed(2)}°${m.fan.capped ? ` (CAPPED from ${m.fan.askedDeg.toFixed(0)}°)` : ''}`
    : `radial · ${(360 / m.slotCount).toFixed(1)}° even step`;
  /* WHICHEVER POSITION AXIS SPLIT THIS WHORL — per-petal under FAN, slot roles
     under RADIAL. Reading only one of them would print "no groups engaged"
     under half the cells on this sheet. */
  const posRole = (r) => (r.slotRole !== null ? r.slotRole.toLowerCase() : (r.petalRole ? r.petalRole.replace('PETAL_', 'petal ') : null));
  const roleLine = m.rings.filter((r) => posRole(r) !== null)
    .filter((r, i, a) => a.findIndex((x) => posRole(x) === posRole(r)) === i)
    .map((r) => `${posRole(r)} ${r.slots.length === 1 ? `slot ${r.slots[0]}` : `slots ${r.slots.join('+')}`}`).join(' · ');
  const groups = m.petalGroupCount === null || m.petalGroupCount === undefined ? null : m.petalGroupCount;

  const shots = {};
  for (const [view, dir, up] of [['face', [0, 0, 1], FACE_UP], ['profile', [1, 0, 0], null]]) {
    const file = path.join(outDir, `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${view}.png`);
    let framed = false;
    for (const grow of [1.15, 1.4, 1.8, 2.4]) {
      await page.evaluate(([r, c, d, u]) => window.__bloomFrame(r, 0, c, d, u), [m.fitRadius * grow, m.fitCenter, dir, up]);
      await page.waitForTimeout(220);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 900, height: 900 } });
      const { width, height, data: pixels } = decodePNG(fs.readFileSync(file));
      const M = 12;
      const isBg = (x, y) => {
        const o = (y * width + x) * 4;
        return Math.abs(pixels[o] - 0x0c) < 10 && Math.abs(pixels[o + 1] - 0x0f) < 10 && Math.abs(pixels[o + 2] - 0x0e) < 10;
      };
      let touches = false;
      for (let x = 0; x < width && !touches; x++) {
        for (let y = 0; y < M; y++) if (!isBg(x, y) || !isBg(x, height - 1 - y)) { touches = true; break; }
      }
      for (let y = 0; y < height && !touches; y++) {
        for (let x = 0; x < M; x++) if (!isBg(x, y) || !isBg(width - 1 - x, y)) { touches = true; break; }
      }
      if (!touches) { framed = true; break; }
    }
    if (!framed) await die(`${label}: the ${view} view still reaches the frame edge at 2.4x the fitted radius — a cropped cell is the one picture that could carry a ruling with the subject missing`);
    shots[view] = path.basename(file);
  }
  console.log(`  ${label.padEnd(56)} petals=${m.slotCount} groups=${groups ?? '-'} ${arc}${roleLine ? '  ' + roleLine : ''}`);
  return { label, note, shots, arc, roleLine, groups, petals: m.slotCount, liveTris: m.liveTris, isFan: Boolean(m.fan), onBase };
}

fs.mkdirSync(outDir, { recursive: true });
const asSet = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const FAN_ON = { placement: 'FAN', fanCenterPetal: 'ON' };
const FAN_OFF = { placement: 'FAN', fanCenterPetal: 'OFF' };
const P1 = { petal1Size: 1.6, petal1Tilt: -25, petal1Cup: 0.5, petal1Curl: -60 };
const LAB = { labellumSize: 1.6, labellumTilt: -25, labellumCup: 0.5, labellumCurl: -60 };
const ORCHID = { labellumSize: 1.6, labellumTilt: -25, labellumCup: 0.5, labellumCurl: -60, labellumTipBreadth: 0.25, hoodSize: 1.15, hoodTilt: 40, hoodCup: -0.3 };

const cells = [];

cells.push(await cell({ label: 'CONTROL — a radial bloom, unmoved', set: [], expectFan: false,
  note: 'The reference every other cell is read against. Per-petal roles are FAN-only, so RADIAL, SPIRAL and CONTINUOUS are untouched by this change — a sheet is where an eye catches what a number would otherwise have to be asked for. THE BYTE RESULT IS NOT RESTATED HERE ON PURPOSE: the frozen matrices are its one owner (tools/diff-bloom-bytes.mjs --compare), and a caption carrying a row total is how a figure outlives the run that produced it.' }));

cells.push(await cell({ label: 'CONTROL — the orchid, still radial, still whole', set: asSet(ORCHID), expectFan: false,
  note: 'NOTHING WAS RETIRED, and this is the cell that shows it. Per-petal roles supersede slot roles ON THE FAN; under RADIAL the labellum and hood are exactly what session B shipped — same ids, same laws, same ranges, same picture. The ruling is a visibility and applicability change, not a retirement, which is why no id went into RETIRED_IDS and no migration is owed.' }));

cells.push(await cell({ label: 'CONTROL — the fan, undifferentiated', set: asSet(FAN_ON),
  note: 'THE SAME FAN AS THE NEXT CELL, with every per-petal slider at its identity. Four groups exist here — the mirror-line petal and three pairs — and none of them is overridden, so the whorl does not split at all and the model takes the pre-session arithmetic character for character. That is what makes byte-identity at the defaults a construction rather than a hope: with no group off its identity there is no record, and the builder is handed the caller’s own state object.' }));

cells.push(await cell({ label: 'PETAL 1 — the mirror-line petal, alone', set: asSet({ ...FAN_ON, ...P1 }),
  note: 'THE HEADLINE, AND THE PRINCIPLE THE SESSION EXISTS FOR: "the petal on the mirror line is petal number one, and it has its own sliders." It sits ON the dashed line, it is the fixed point of the involution this arrangement declares, and it is the only petal that moved — larger, tipped toward horizontal, cupped and curled forward, while the three pairs behind it are untouched. Same arrangement and same triangle count as the cell before it; the only difference is which state one slot was built from.' }));

cells.push(await cell({ label: 'PETAL 1 — toggle OFF, now the INNER PAIR', set: asSet({ ...FAN_OFF, ...P1 }),
  note: 'THE SAME FOUR SLIDERS, THE OTHER INVOLUTION — and the ruled cost of the numbering. With no petal on the line there is no fixed point, so petal 1 is TWO petals straddling the mirror; one control drives both and the area rule multiplies that group by 2 rather than by 1. The group COUNT also drops from four to three, so every pair shifts up a number: what was petal 2 in the cell above is petal 1 here. Ruled deliberately (Eva, ruling 3) so that petal one is always the group nearest the line — and asserted, because a numbering that stops following the plane is invisible to everything else.' }));

cells.push(await cell({ label: 'PETAL 2 — a middle group, against its neighbours', set: asSet({ ...FAN_ON, petal2Size: 1.5, petal2Tilt: 45, petal2Cup: 0.5, petal2Curl: -60 }),
  note: 'THE GENUINELY NEW REGION. Petal 2 is the pair one step out from the line — under slot roles it was a LATERAL, the group with NO controls at all, so until this session there was no way to reach it. Read it against its neighbours: petal 1 on the line and petals 3 and 4 behind are all at their identity, and one pair steps out of the fan. This is the cell that shows per-petal is a refinement rather than a rename.' }));

cells.push(await cell({ label: 'PETAL 4 — the outermost group', set: asSet({ ...FAN_ON, petal4Size: 1.5, petal4Tilt: 60, petal4Curl: 120 }),
  note: 'THE FAR END OF THE ARC, which under slot roles was the HOOD. The outermost pair is the last group at three per side, and the arrangement is otherwise the shipping default — so the whole difference between this cell and the control is one pair at the back of the fan.' }));

cells.push(await cell({ label: 'THE EXTREME — 1/side x 170°, petal 1 at MAX', set: asSet({ ...FAN_ON, fanPerSide: 1, fanSpacing: 170, petal1Size: 2, petal1Tilt: 75, petal1Cup: 1.2, petal1Curl: 360 }),
  note: 'THE CORNER THE CONTAINMENT ARGUMENT HAD TO SURVIVE: the largest single petal at the widest spacing at the fewest petals — a 340° arc with a 20° notch, three petals, and every one of petal one’s sliders at its stop. Measured through footRing() at this corner: the foot–hub overlap box is 2.166 x 6.400 x 1.200 = 16.639 mm3 live, and 1.500 x 1.600 x 1.000 = 2.400 mm3 at ALL THIN in export — the SAME standing number as the single-ring, layered, continuous and fan corners, because a size multiplier never reaches the ring. The size slider SATURATES here (x2.00 on a 35 mm petal asks 70 and gets 60) and the read-out says so. Shipped photographed, on Eva’s standing pattern for extremes.' }));

cells.push(await cell({ label: 'NINE GROUPS — 8/side x 60°, every group at MAX', set: asSet({ ...FAN_ON, fanPerSide: 8, fanSpacing: 60,
    ...Object.fromEntries([1,2,3,4,5,6,7,8,9].flatMap((k) => [[`petal${k}Size`, 2], [`petal${k}Tilt`, 75], [`petal${k}Cup`, 1.2], [`petal${k}Curl`, 360]])) }),
  note: 'EVERY GROUP THE FAN CAN REACH, all nine, all at their stops, on a capped arc — the step saturates at 21.25° against the 60° asked for. With every group at the same value the bloom reads as one gesture rather than nine, which is the honest result: per-petal differentiation is about groups DIFFERING, and this cell is here as a coverage extreme rather than as a shape anyone would choose. The panel at this arrangement is nine sections of four sliders; measured, it leaves the control column at 874 px against today’s 788 px worst case, which is the whole reason the groups are sections rather than headings.' }));

/* ===================================================================
   THE RETIREMENT, PHOTOGRAPHED. Same sliders, same arrangement, two trees. */
if (HAVE_BASE) {
  cells.push(await cell({ label: 'BEFORE — the same fan shaped by labellum*, on the base tree', set: asSet({ ...FAN_ON, ...LAB }), onBase: true, assertSelf: false,
    note: 'THIS IS THE ONLY CELL ON THIS SHEET NOT BUILT BY THE CODE UNDER REVIEW. It is rendered from a git worktree of this branch’s base commit, where `labellum*` still applied to a fan, and it is here because Eva asked for the superseded behaviour to be photographed rather than only recorded. Its assertions are NOT run — that tree predates Z7, Z8 and Z9, so running them would report an absence as a failure. Read it against the cell beside it.' }));
  cells.push(await cell({ label: 'AFTER — the identical sliders, on this tree', set: asSet({ ...FAN_ON, ...LAB }),
    note: 'THE SAME FOUR LABELLUM SLIDERS AT THE SAME VALUES, on the shipped tree: the fan is UNDIFFERENTIATED, because per-petal roles supersede slot roles here and those controls are hidden and inert. Measured rather than described — this export is BIT-IDENTICAL to the fan with no overrides at all (sha c9c686d9 on both). What the ruling costs is visible in the pair: the shape in the BEFORE cell is reachable again through petal 1 (four cells up), with one exception — the per-petal set ships without a TIP BREADTH row, so `labellumTipBreadth` has no per-petal counterpart and that one capability is gone from the fan until a row is added to two tables. Stated at both ends, and this is the picture of it.' }));
} else {
  console.error(`NOTE: no base tree at ${BASE_ROOT} — the BEFORE/AFTER pair is omitted. Create it with: git worktree add ${BASE_ROOT} <base sha>`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c, view) => `<figure><div class="frame${view === 'face' && c.isFan ? ' mirror' : ''}${c.onBase ? ' base' : ''}"><img src="${c.shots[view]}"></div>`
  + `<figcaption><b>${esc(c.label)}</b>${view === 'profile' ? ' <i>(profile)</i>' : ''}${c.onBase ? ' <i>(base tree)</i>' : ''}<br>`
  + `<small>${esc(c.arc)} · ${c.petals} petals${c.groups ? ` · ${c.groups} per-petal group${c.groups === 1 ? '' : 's'}` : ''} · ${esc(c.roleLine || 'no groups engaged')} · ${Number(c.liveTris).toLocaleString('en-US')} tris (live)</small>`
  + `<p>${esc(c.note)}</p></figcaption></figure>`;
const html = `<title>Per-petal sliders for the fan</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
figure{margin:0}.frame{position:relative;line-height:0}
img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
.frame.base img{border-color:#6b4b2a}
.frame.mirror::after{content:"";position:absolute;left:50%;top:6px;bottom:6px;width:0;border-left:1px dashed rgba(120,200,170,.55)}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>Per-petal sliders for the fan</h1>
<p class="note"><b>EVERY PETAL IN THE FAN GETS ITS OWN CONTROL GROUP, AND THE MIRROR-LINE PETAL IS PETAL ONE.</b> The dashed line is the mirror plane, measured per cell from the emitted azimuths — this sheet refuses to render a frame whose line is not the model’s plane. Groups are counted OUTWARD from that line, so petal one is the mirror-line petal when the toggle is on and the inner PAIR when it is off.<br>
<b>Per petal means per PAIR.</b> A fan’s defining property is its one plane of symmetry, and the shipped instrument already asserts that the group assignment is symmetric under the involution the arrangement declares — so left and right of a pair are one group, as they are in the flower’s own fan. Independent sides would make the word "mirror" false and is a separate feature with its own ruling.<br>
<b>The last pair is a before/after across two trees</b>, showing what the supersession ruling removes.<br>
<b>Scope:</b> ${esc(JUNCTION_SCOPE)}</p>
<main>${cells.map((c) => fig(c, 'face')).join('')}</main>
<h1 style="margin-top:28px">The same cells, in profile</h1>
<p class="note">A fan seen edge-on hides its own arc, which is exactly what makes this row useful for the per-petal work: TILT and CURL are the two overrides a face-on view reads worst, and they are what a profile shows. Petal one lifting or hanging is visible here and nowhere else.</p>
<main>${cells.map((c) => fig(c, 'profile')).join('')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); if (base) base.server.close();
