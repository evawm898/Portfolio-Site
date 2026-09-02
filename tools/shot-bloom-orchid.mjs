/* ===================================================================
   THE ORCHID SHEET — session B's deliverable, and the picture Eva rules from.

   WHAT IT IS FOR. The zygomorphy sheet beside it photographs the IRIS, which
   is a per-LAYER claim: whorl differs from whorl, and the view that shows it
   is the PROFILE (falls hang, standards rise). This sheet photographs a
   per-SLOT claim, which is a different thing seen from a different angle: the
   petals of ONE whorl differ from each other about a mirror plane, and the
   view that shows THAT is FACE-ON. Hence the headline: the flower now has a
   face — a labellum below, a hood above, laterals to either side.

   FACE-ON IS THE HEADLINE HERE, WHICH INVERTS THE IRIS SHEET'S ORDER, and the
   inversion is the point rather than a layout preference. On the iris sheet
   face-on says almost nothing and the profile carries the ruling; here the
   profile says almost nothing (a bilateral bloom seen edge-on hides its own
   symmetry plane) and face-on carries it. Both views are shot for both, so
   the claim that each view is the one that matters is checkable rather than
   asserted.

   THE ORIENTATION IS DECLARED, NOT LUCKY. The mirror plane contains the axis
   and slot 0's radial direction, which is +x. The face-on camera therefore
   passes up = [-1, 0, 0], putting +x at the BOTTOM of the frame: labellum
   below, hood above, laterals beside, in every face-on cell. Before this
   session `fitCamera` hardcoded up = [0,0,1], which is PARALLEL to the
   face-on view direction — so face-on roll was whatever three.js's degenerate
   fallback picked. That did not matter for a radially symmetric bloom and it
   matters completely for a bloom with a face.

   THE CONTROL IS A RADIAL BLOOM WITH NO ROLE ENGAGED, in the same
   arrangement, with the same petal count and the same triangle count — so the
   only thing that can differ between it and the orchid is which state each
   SLOT was built from. And session A's IRIS is on this sheet as a cell that
   must be UNMOVED: a session B sheet is the right place to prove session A's
   ruling still renders what she approved, rather than assuming it.

   EVERY CELL ASSERTS ITSELF. A record that resolves correctly and never
   reaches the blade renders as an undifferentiated bloom under a caption
   saying otherwise, and nothing in the frame says so — measured on a
   worktree: it exports watertight, one piece, identical triangle count and
   byte length, and passes every STL check. So each cell runs the junction and
   zygomorphy assertions, reads its whole state back, and checks its own
   caption against what the BUILDER reported using.

   RUN:  node tools/shot-bloom-orchid.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         junctionAssertions, zygoAssertions, ZYGO_SCOPE, DEFAULTS, ROLE_OVERRIDES,
         LAW_IDENTITY, SLOT_ROLE_ORDER, SLOT_LABELLUM, SLOT_HOOD } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-orchid';
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

/* THE FACE-ON UP VECTOR — one owner, because three cells and the caption all
   depend on it meaning the same thing. +x is slot 0 is the labellum, and
   up = -x puts it at the bottom of the frame. */
const FACE_UP = [-1, 0, 0];

async function cell({ label, set = [], note = '', expectSplit = true }) {
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  for (const [n, fn] of [['junction', junctionAssertions], ['zygomorphy', zygoAssertions]]) {
    const out = await fn(page, { label, set });
    if (out.length) await die(`${label}: ${n}: ${out.join('; ')}`);
  }
  await page.waitForTimeout(450);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const m = await page.evaluate(() => window.__bloomMetrics());

  /* THE CELL'S OWN CLAIM, CHECKED AGAINST THE APP. A cell captioned as an
     orchid must be showing a bloom whose slots were actually built from
     different states; a control cell must be showing one that was not. */
  const anySlot = ROLE_OVERRIDES.some((o) => SLOT_ROLE_ORDER.includes(o.role) && Number(want[o.control]) !== LAW_IDENTITY[o.law]);
  const shouldSplit = anySlot && Boolean(m.slotRolesEligible);
  if (shouldSplit !== Boolean(m.slotRolesSplit)) {
    await die(`${label}: the cell ${shouldSplit ? 'sets a slot control in an eligible state and the whorl did NOT split' : 'sets no live slot control and the whorl split anyway'} — the caption would describe a bloom other than the one in the frame`);
  }
  if (shouldSplit !== expectSplit) {
    await die(`${label}: cell declares expectSplit=${expectSplit} and the state gives ${shouldSplit} — the sheet's own table disagrees with the app`);
  }
  /* WHICH SLOTS CAME OUT AS WHAT, printed in the cell rather than described.
     The odd/even hood branch is the one place the derivation forks, so a
     reader must be able to see which branch a cell is on. */
  const roleLine = m.rings.filter((r) => r.slotRole !== null)
    .filter((r, i, a) => a.findIndex((x) => x.slotRole === r.slotRole) === i)
    .map((r) => `${r.slotRole.toLowerCase()} ${r.slots.length === 1 ? `slot ${r.slots[0]}` : `slots ${r.slots.join('+')}`}`).join(' · ');

  const shots = {};
  for (const [view, dir, up] of [['face', [0, 0, 1], FACE_UP], ['profile', [1, 0, 0], null]]) {
    await page.evaluate(([r, d, u]) => window.__bloomFrame(r, 0, [0, 0, 0], d, u), [m.fitRadius, dir, up]);
    await page.waitForTimeout(220);
    const file = path.join(outDir, `${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${view}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 900, height: 900 } });
    shots[view] = path.basename(file);
  }
  console.log(`  ${label.padEnd(46)} rings=${m.rings.length} split=${m.slotRolesSplit} tris=${m.tris} ${roleLine}`);
  return { label, note, shots, roleLine, tris: m.tris, rings: m.rings.length };
}

fs.mkdirSync(outDir, { recursive: true });

const ORCHID = { labellumSize: '1.6', labellumTilt: '-25', labellumCup: '0.5', labellumCurl: '-60', labellumTipBreadth: '0.25', hoodSize: '1.15', hoodTilt: '40', hoodCup: '-0.3' };
const asSet = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

const cells = [];
cells.push(await cell({ label: 'CONTROL — radial, no role engaged', set: [], expectSplit: false,
  note: 'The reference the headline is read against. Same arrangement, same eight petals, same triangle count — every slot built from one state. This is the pre-session-B code path character for character: with no slot control off its identity the whorl does not split at all, footRing() returns session A\'s single descriptor, and petalStateFor() hands the builder the caller\'s own state object.' }));
cells.push(await cell({ label: 'THE ORCHID — the flower has a face', set: asSet(ORCHID),
  note: 'THE SESSION\'S DELIVERABLE. Read the FACE-ON frame: the labellum is at the bottom, larger (x1.60), tipped down to horizontal, cupped and curled forward; the hood is at the top, raised 40 degrees and slightly reflexed; the laterals are untouched to either side. Identical arrangement and identical triangle count to the control beside it — the ONLY difference is which state each slot was built from. The mirror plane contains the axis and slot 0, and the assignment is exact integer arithmetic: slot i pairs with slot n-i, and the roles that can be singular are that involution\'s fixed points.' }));
cells.push(await cell({ label: 'petalCount 3 — one of three IS the labellum', set: asSet({ ...ORCHID, petalCount: '3' }),
  note: 'THE EXTREME, and the only reachable state where the control-bearing roles cover every petal in the whorl: labellum slot 0, hood slots 1+2, NO laterals at all. At an odd count the mirror\'s antipode falls in a GAP rather than on a slot, so the two petals straddling it take the hood role together — a mirror pair, so the symmetry claim is untouched, and the ordinary two-lobed upper lip. The empty group lands on LATERAL deliberately: it is the role with no controls, so nothing is stranded.' }));
cells.push(await cell({ label: 'petalCount 40 — one labellum among forty', set: asSet({ ...ORCHID, petalCount: '40' }),
  note: 'The other end of the count range, and an even one, so the hood is a SINGLE slot (20) directly opposite the labellum. At forty petals a bilateral reading is faint by construction — one differentiated petal in forty — which is worth seeing rather than assuming.' }));
cells.push(await cell({ label: 'ORCHID x IRIS — both role axes in one bloom', set: asSet({ ...ORCHID, layerCount: '3', layerPhase: '0', petalSpineCurl: '-90', innerCurl: '180', innerCup: '0.4', layerTilt: '30', petalTilt: '40' }),
  note: 'The (layer x slot role) product, which is the whole of what session B changed about the descriptor shape: nine descriptors, three whorls each split three ways. Slot roles need layerPhase 0 above one whorl, because the mirror plane is the BLOOM\'S and every whorl must share it — at phase 0.25 the best shared plane is still 11.250 degrees off at n=8 and 30.000 at n=3, measured, so the controls hide there rather than putting a symmetry label on an asymmetry.' }));
cells.push(await cell({ label: 'THE IRIS — session A, and it must not have moved', set: asSet({ layerCount: '2', petalSpineCurl: '-90', innerCurl: '180', innerCup: '0.4', layerTilt: '30', petalTilt: '40' }), expectSplit: false,
  note: 'SESSION A\'S RULING, RE-RENDERED RATHER THAN ASSUMED. No slot control is engaged, so no whorl splits and this is session A\'s code path exactly: the outer whorl curls -90 and hangs (the falls), the inner composes -90 + 180 = +90 and cups (the standards). Read the PROFILE frame — that is where an iris is defined and where face-on says nothing, which is the mirror image of what this sheet\'s own headline needs.' }));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c, view) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b>${view === 'profile' ? ' <i>(profile)</i>' : ''}<br><small>${esc(c.roleLine || 'no slot roles')} · ${c.rings} descriptor${c.rings === 1 ? '' : 's'} · ${Number(c.tris).toLocaleString('en-US')} tris</small><p>${esc(c.note)}</p></figcaption></figure>`;
const html = `<title>The orchid — slot roles and the mirror plane</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The orchid — slot roles and the mirror plane</h1>
<p class="note"><b>FACE-ON IS THE HEADLINE.</b> The mirror plane contains the axis and slot 0, and the face-on camera is rolled so that slot 0 is at the BOTTOM of every frame — labellum below, hood above, laterals beside. The profile row is beside it because a claim that one view is the one that matters should be checkable, not asserted; on the iris cell the order reverses and the profile carries the ruling.<br>
<b>Scope:</b> ${esc(ZYGO_SCOPE)}</p>
<main>${cells.map((c) => fig(c, 'face')).join('')}</main>
<h1 style="margin-top:28px">The same six, in profile</h1>
<p class="note">A bilateral bloom seen edge-on hides its own symmetry plane, so most of these say little — which is the point of shooting them. The exception is the iris cell, where the profile is the whole of the claim.</p>
<main>${cells.map((c) => fig(c, 'profile')).join('')}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close();
