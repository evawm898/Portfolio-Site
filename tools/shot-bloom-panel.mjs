/* ===================================================================
   shot-bloom-panel.mjs — the PANEL sheet. Chrome only; no canvas.

   The metric screens, eyes decide, and a sheet is required before committing
   anything visual. tools/shot-bloom.mjs is the inverse of this tool: it hides
   the panel (body.bl-preview) to photograph the model. Here the panel IS the
   subject, so this tool never sets that class — bloom.css stays the one owner
   of what counts as chrome, and neither tool re-implements the other's job.

   WHAT IT SHOOTS
     first load   the panel exactly as a visitor finds it — one section open,
                  the one the registry declares. This is the cell the grouping
                  ruling is made from.
     per section  one cell per section, each OPENED THE WAY A VISITOR OPENS IT
                  (a real click on its summary, through the accordion), the
                  nested drop-downs included — a drop-down inside "Petal roles"
                  is reached by opening its parent first, by the same click.
                  Together the cells show every control in the panel.

                  A SECTION THAT IS HIDDEN AT FIRST LOAD IS PHOTOGRAPHED WHERE
                  IT EXISTS, and the caption says what was set to get there.
                  The fan's nine per-petal groups only exist under FAN (Eva's
                  ruling 4, Sep 3), so their cells set placement to FAN with a
                  mirror-line petal and eight per side — the one arrangement in
                  which all nine have members — through real events, never
                  clicks, exactly as the panel gate's WITNESS preconditions do
                  (REACH below is that table's twin, and a cell whose section
                  is still hidden after its precondition kills the run rather
                  than photographing an empty parent).
     numbering    THE DERIVED LABEL, at three counts (Eva's ruling A, Sep 3):
                  the rosette's hood group is "Petal N" where N is the last
                  orbit's number, so the same drop-down reads Petal 2 at three
                  petals, Petal 5 at eight and Petal 21 at forty — with the
                  gap after "Petal 1" that the ruling accepted, because the
                  laterals carry no controls. And the fan beside it for the
                  comparison the ruling was made from: petal 1 to petal 4 with
                  no gap, three per side and a mirror-line petal.

                  THIS REPLACED AN "ALL EXPANDED" CELL, and the choice is worth
                  stating because the alternative was to keep it and label it.
                  Under the accordion there IS no all-expanded state: it is not
                  reachable, so photographing it would mean setting `.open` on
                  every section behind the panel's own back and captioning a
                  picture of a panel that cannot exist. A sheet exists to be
                  ruled from, and a state nobody can reach is the wrong thing
                  to rule on. The per-section walk shows the same controls,
                  every frame of it reachable, and it doubles as a visual
                  census. What is lost is the single "how tall is everything"
                  number the old cell carried — so this tool now prints the
                  WORST-CASE panel height across the per-section cells instead,
                  which is the honest version of that number under an
                  accordion: the tallest the panel can ever be is its tallest
                  single section (a parent with one drop-down open, now).
     accordion    the interaction itself, as a sequence: first load, then
                  opening a second section (the first one shuts by itself),
                  then a third, then closing it to reach the zero-open state.
                  What tools/verify-bloom-panel.mjs asserts, this shows.
     reactivity   the collapsed-section assertion, PHOTOGRAPHED. A pair: the
                  panel at first load with Part thickness shut, then the same
                  panel after `sheetThickness` was driven to 2.40 mm through
                  real events while that section stayed shut. The section is
                  visibly closed in both frames and the readout — which lives
                  outside every section — has moved, sheet and ring alike.
     (the gated-centre row — the Center section open at DISC and at RING —
                  went with the centre rig in session 20.)
     the centre  THE BEFORE / AFTER PAIRS (session 23, Eva's ruling is made
                  from this sheet), rendered against a git worktree of the
                  BASE commit when one is given — the per-petal and
                  centre-retirement sheets' pattern, a real render of the old
                  panel rather than a remembered one. Four pairs: the panel at
                  first load; the parts opened (Androecium at top level BEFORE,
                  inside "Center" AFTER); a part turned OFF with its settings
                  moved off their defaults (the kept clause on the read-out);
                  the stamen spread on the 120-stamen disc (the cap mark on
                  the slider, the CLAMPED read-out); and the STAMENS line with
                  six filaments at curl 90 beside the style (the
                  FILAMENT-AGAINST-STYLE flag). Every caption carries the
                  read-out lines, which are the other half of the ruling.
                  Without a base tree these cells are NOT produced and the run
                  says so loudly; they are never silently skipped.

   THE FRAME IS ASSERTED, NOT TRUSTED. A panel taller than its own scroll box
   would photograph CROPPED, and a cropped panel is the one picture that could
   make a grouping ruling on evidence that is missing the bottom of the list —
   so every cell reads back scrollHeight against clientHeight and the run dies
   if any frame is clipped. Same discipline as the canvas sheet's chrome and
   autoRotate read-backs, pointed at the failure this sheet can actually have.

   RUN:  node tools/shot-bloom-panel.mjs <out-dir> [base-tree]
         (base-tree: a git worktree of the commit to render BEFORE from,
          e.g. `git worktree add /tmp/base-main fd291b4`, with node_modules
          linked into it so three serves from the same pinned copy)
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, settleBuild, CONTROLS, SECTIONS, DEFAULTS, MAX_FAN_GROUPS } from './bloom-harness.mjs';
import { sectionLabel } from '../bloom-registry.js';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-panel-sheets';
const BASE_ROOT = process.argv[3] || null;
if (BASE_ROOT && !fs.existsSync(path.join(BASE_ROOT, 'bloom.html'))) {
  console.error(`HARNESS INVALID: no base tree at ${BASE_ROOT} — a base was named and is not there. Create it with: git worktree add ${BASE_ROOT} <base-sha>`);
  process.exit(2);
}

const { server, port } = await serveRepo();
const base = BASE_ROOT ? await serveRepo(BASE_ROOT) : null;
/* Tall viewport so an ALL-EXPANDED panel fits inside its own max-height and
   the frame is a complete picture rather than a crop. The assertion below is
   what makes that a fact instead of a hope. */
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 2 });

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); if (base) base.server.close(); process.exit(2); }); }

async function shoot(label, note) {
  const box = await page.evaluate(() => {
    const p = document.querySelector('.bl-panel');
    const open = [...document.querySelectorAll('#panelControls details')].map((d) => `${d.dataset.section}=${d.open ? 'open' : 'shut'}`);
    const shown = [...document.querySelectorAll('#panelControls .bl-ctrl')].filter((w) => !w.hidden && w.closest('details').open).length;
    return {
      scrollHeight: p.scrollHeight, clientHeight: p.clientHeight,
      open: open.join(' '), shown,
      readout: (document.getElementById('readout').textContent || '').replace(/\s+/g, ' ').trim(),
    };
  });
  /* A CLIPPED PANEL IS NOT EVIDENCE. */
  if (box.scrollHeight > box.clientHeight + 1) {
    await die(`${label}: the panel is ${box.scrollHeight}px inside a ${box.clientHeight}px box — this frame would be cropped`);
  }
  const png = await page.locator('.bl-panel').screenshot();
  const caption = `${box.open} · ${box.shown} control rows visible · panel ${box.scrollHeight}px`;
  console.log(`  ${label.padEnd(40)} ${caption}`);
  return { label, note, caption, readout: box.readout, png };
}

const cells = { firstLoad: [], perSection: [], numbering: [], accordion: [], reactivity: [], centre: [] };

/* HOW TO REACH A SECTION THAT IS HIDDEN AT FIRST LOAD — the panel gate's
   WITNESS `pre` for the same sections, restated here because a sheet and a
   gate are different tools with different tables; the anti-vacuity check in
   reachSection() is what keeps the two from drifting silently. */
const REACH = {
  ...Object.fromEntries(Array.from({ length: MAX_FAN_GROUPS }, (_, i) => [`petal${i + 1}`, {
    set: [{ id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'ON' }, { id: 'fanPerSide', value: '8' }],
    said: 'FAN, mirror-line petal ON, 8 per side — the one arrangement in which all nine groups have members',
  }])),
  /* PETAL 1 / PETAL N NEED TWO WHORLS IN STEP since Sep 3 (Eva's ruling from
     the deploy preview: the one-whorl orchid is retired, hidden and inert). */
  labellumGroup: { set: [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }], said: 'two whorls with Layer offset 0 — where Petal 1 / Petal N live since Sep 3' },
  hoodGroup: { set: [{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }], said: 'two whorls with Layer offset 0 — where Petal 1 / Petal N live since Sep 3' },
};

/* Set controls THROUGH REAL EVENTS — never clicks — and wait for the rebuild. */
async function drive(set) {
  const bad = await page.evaluate(async (set) => {
    const out = [];
    for (const { id, value } of set) {
      const el = document.getElementById(id);
      if (!el) { out.push(`${id}: not in the DOM`); continue; }
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (String(el.value) !== String(value)) out.push(`${id}: set "${value}", reads back "${el.value}"`);
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return out;
  }, set);
  if (bad.length) await die(`precondition did not take: ${bad.join('; ')}`);
  /* THE REAL SIGNAL, never only a sleep (session 23; the flower's rule): the
     rebuild is rAF-coalesced, and a 120-stamen disc beside a style on a loaded
     box outlasts a fixed wait — a cell would then be captioned with the
     PREVIOUS build's read-out. settleBuild() waits on the app's own pending
     flag; the short wait after it is for the paint. */
  await settleBuild(page);
  await page.waitForTimeout(250);
}

/* Make a section REACHABLE: apply its REACH precondition if it is hidden, then
   require it to be visible — a cell of a hidden section would be a picture of
   its parent captioned as something else. */
async function reachSection(id) {
  const hidden = await page.evaluate((x) => document.getElementById(`sec-${x}`).hidden, id);
  if (!hidden) return null;
  const r = REACH[id];
  if (!r) await die(`section "${id}" is hidden at this state and REACH declares no way to reach it`);
  await drive(r.set);
  const still = await page.evaluate((x) => document.getElementById(`sec-${x}`).hidden, id);
  if (still) await die(`section "${id}" is STILL hidden after its REACH precondition (${r.said}) — the precondition and the registry's predicate disagree`);
  return r.said;
}

/* Open a section THE WAY A VISITOR DOES — a real click on its summary, so
   every frame on this sheet is a state the UI can actually reach. `toggle` is
   queued rather than synchronous (measured), so this waits a frame before the
   caller reads anything back. Clicking an already-open summary would CLOSE it,
   hence the guard. */
async function openSection(id) {
  /* A nested drop-down's summary is not clickable while its parent is shut,
     which is the visitor's situation too: open the parent first, by the same
     real click. One level deep, as the registry enforces. */
  const parent = SECTIONS.find((x) => x.id === id)?.parent;
  /* The parent is THIS tree's registry's answer; a BEFORE cell rendered from
     a base tree that declares no such parent (Center, before session 23)
     has nothing to open first and is not an error — the section is at top
     level there. Checked against the served page, never assumed. */
  if (parent && await page.evaluate((x) => !!document.getElementById(`sec-${x}`), parent)) await openSection(parent);
  const already = await page.evaluate((x) => document.getElementById(`sec-${x}`).open, id);
  if (!already) await page.click(`#sec-${id} > summary`);
  await page.waitForTimeout(180);
  const open = await page.evaluate((x) => document.getElementById(`sec-${x}`).open, id);
  if (!open) await die(`section "${id}" did not open on a real summary click`);
}
async function closeSection(id) {
  const open = await page.evaluate((x) => document.getElementById(`sec-${x}`).open, id);
  if (open) await page.click(`#sec-${id} > summary`);
  await page.waitForTimeout(180);
}

/* ---- first load: the registry's own literal, one section open ---- */
await openBloom(page, port);
const declaredOpen = SECTIONS.filter((x) => x.open).map((x) => sectionLabel(x, DEFAULTS)).join(', ') || 'none';
cells.firstLoad.push(await shoot('FIRST LOAD (as the registry declares)',
  `The panel is an accordion: at most one section open. The registry declares ${declaredOpen || 'no section'} open at first load.`));

/* ---- one cell per section, each opened through the accordion ----
   A FRESH PAGE PER CELL, because a precondition (placement to FAN for the
   per-petal groups) would otherwise leak into the cells after it; the
   "every other section shut itself" behaviour is photographed as a sequence
   in the accordion row below, where one page is deliberately kept. */
for (const sec of SECTIONS) {
  await openBloom(page, port);
  const via = await reachSection(sec.id);
  await openSection(sec.id);
  const got = await page.evaluate((id) => {
    const det = document.getElementById(`sec-${id}`);
    const own = [...det.querySelectorAll(':scope > .bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent);
    const kids = [...det.querySelectorAll(':scope > details')].filter((d) => !d.hidden).map((d) => d.querySelector(':scope > summary').textContent);
    return { label: det.querySelector(':scope > summary').textContent, own: own.join(', ') || 'none', kids: kids.join(', ') || 'none', parent: det.dataset.parent || null };
  }, sec.id);
  const where = got.parent ? ` (inside "${SECTIONS.find((x) => x.id === got.parent).label}")` : '';
  cells.perSection.push(await shoot(`SECTION · ${got.label}${where}`,
    `Opened by a real click on its summary${got.parent ? ', after the same click on its parent' : ''}; every other section shut itself.`
    + ` Own controls: ${got.own}.${got.kids !== 'none' ? ` Drop-downs inside it: ${got.kids}.` : ''}`
    + (via ? ` Reached by setting ${via}.` : '')));
}

/* ---- the numbering: the derived label at three counts, and the fan beside it ---- */
/* AT TWO WHORLS IN STEP, since Sep 3 — the rosette's Petal 1 / Petal N live
   there now; at one whorl "Petal roles" is the all-petals group (its own
   cells follow). */
for (const n of [3, 8, 40]) {
  await openBloom(page, port);
  await drive([{ id: 'layerCount', value: '2' }, { id: 'layerPhase', value: '0' }, { id: 'petalCount', value: String(n) }]);
  await openSection('hoodGroup');
  const got = await page.evaluate(() => ({
    kids: [...document.querySelectorAll('#sec-roles > details')].filter((d) => !d.hidden).map((d) => d.querySelector(':scope > summary').textContent).join(', '),
    hood: document.querySelector('#sec-hoodGroup > summary').textContent,
    said: document.querySelector('#hoodSize').closest('.bl-ctrl').querySelector('.bl-val').textContent,
  }));
  cells.numbering.push(await shoot(`ROSETTE · ${n} petals · 2 whorls in step · drop-downs: ${got.kids}`,
    `layerCount 2, Layer offset 0 and petalCount ${n} driven through real events; Petal roles opened, then its last drop-down. The hood group is "${got.hood}" — the last orbit's number — and its read-out says "${got.said}". Nothing between Petal 1 and it: the laterals carry no controls, which is the gap ruling A accepted.`));
}
{
  await openBloom(page, port);
  await drive([{ id: 'placement', value: 'FAN' }, { id: 'fanCenterPetal', value: 'ON' }, { id: 'fanPerSide', value: '3' }]);
  await openSection('petal1');
  const got = await page.evaluate(() => ({
    kids: [...document.querySelectorAll('#sec-roles > details')].filter((d) => !d.hidden).map((d) => d.querySelector(':scope > summary').textContent).join(', '),
    said: document.querySelector('#petal1Size').closest('.bl-ctrl').querySelector('.bl-val').textContent,
  }));
  cells.numbering.push(await shoot(`FAN · 3 per side, mirror-line petal · drop-downs: ${got.kids}`,
    `The comparison the ruling was made from: under FAN every orbit has its own group and there is no gap. Petal 1 open; its read-out says "${got.said}".`));
}
/* ---- PETAL CURL (session 16): the modifiers appear with a curl, and the read-out tells the floor ---- */
{
  await openBloom(page, port);
  await drive([{ id: 'petalSpineCurl', value: '150' }]);
  await openSection('curl');
  const got = await page.evaluate(() => ({
    own: [...document.querySelectorAll('#sec-curl > .bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent).join(', '),
    bias: document.querySelector('#curlBias').closest('.bl-ctrl').querySelector('.bl-val').textContent,
    line: (document.getElementById('readout').textContent.split('\n').find((l) => /SPINE CURL/.test(l)) || 'no SPINE CURL line'),
  }));
  cells.numbering.push(await shoot(`PETAL CURL · spine curl 150° · ${got.own}`,
    `Spine curl driven to 150 through real events, then the section opened: Curl bias and Curl start are on screen only now (hidden and inert at curl 0, by their own predicate). Bias reads "${got.bias}". The read-out's SPINE CURL line: "${got.line}".`));
  await drive([{ id: 'curlStart', value: '0.95' }, { id: 'petalLength', value: '20' }, { id: 'sheetThickness', value: '0.6' }]);
  const got2 = await page.evaluate(() => ({
    start: document.querySelector('#curlStart').closest('.bl-ctrl').querySelector('.bl-val').textContent,
    line: (document.getElementById('readout').textContent.split('\n').find((l) => /SPINE CURL/.test(l)) || 'no SPINE CURL line'),
  }));
  cells.numbering.push(await shoot('PETAL CURL · start 0.95 on a 20 mm blade, 0.60 mm sheet · the spine floor binds',
    `Curl start reads "${got2.start}". The floor (one sheet thickness of spine radius) binds and the read-out says so, with the turn asked beside the turn built: "${got2.line}". Full range, clamped, told (Eva, Sep 4).`));
}
/* ---- one whorl: Petal roles IS the all-petals group; two whorls out of step: the caption ---- */
{
  await openBloom(page, port);
  await openSection('roles');
  const got = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('#sec-roles > .bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent).join(', '),
    kids: [...document.querySelectorAll('#sec-roles > details')].filter((d) => !d.hidden).length,
    said: document.querySelector('#allCurl').closest('.bl-ctrl').querySelector('.bl-val').textContent,
  }));
  cells.numbering.push(await shoot(`ONE WHORL · Petal roles = the all-petals group · ${got.rows}`,
    `The shipping depth, Petal roles opened. At one whorl the section holds the ALL-PETALS trio (${got.rows}) — deltas riding on Petal form's Spine curl and Cup and Petal shape's Tip breadth, defaulting to zero; the read-out at zero says "${got.said}". ${got.kids} drop-downs visible: Petal 1 / Petal N are hidden and inert here (Eva's ruling, Sep 3 — the one-whorl orchid given up).`));
  await drive([{ id: 'allCurl', value: '120' }, { id: 'allCup', value: '0.5' }]);
  const got2 = await page.evaluate(() => ({
    curl: document.querySelector('#allCurl').closest('.bl-ctrl').querySelector('.bl-val').textContent,
    cup: document.querySelector('#allCup').closest('.bl-ctrl').querySelector('.bl-val').textContent,
  }));
  cells.numbering.push(await shoot('ONE WHORL · all-petals curl +120°, cup +0.50',
    `The same section with two of the three driven: the read-outs say "${got2.curl}" and "${got2.cup}", naming the base slider each rides on, and the readout below the buttons prints what the whole whorl was built with.`));
}
{
  await openBloom(page, port);
  await drive([{ id: 'layerCount', value: '2' }]);
  await openSection('roles');
  const got = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('#sec-roles > .bl-ctrl')].filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent).join(', '),
    caption: (document.querySelector('#sec-roles > .bl-why') || {}).textContent || '(no caption)',
    captionHidden: (document.querySelector('#sec-roles > .bl-why') || {}).hidden,
    kids: [...document.querySelectorAll('#sec-roles > details')].filter((d) => !d.hidden).length,
  }));
  if (got.captionHidden !== false) await die('the hiddenReason caption is not shown at two whorls with Layer offset at its default — this cell would photograph the wrong claim');
  cells.numbering.push(await shoot('TWO WHORLS · Layer offset 0.50 · the caption says why Petal 1 / Petal N are missing',
    `layerCount 2 with Layer offset at its default (0.50). Petal roles holds the Inner trio (${got.rows}) and ${got.kids} drop-downs; where Petal 1 / Petal N would be, the registry's hiddenReason caption reads: "${got.caption}"`));
}

/* ---- the accordion as a sequence ---- */
await openBloom(page, port);
cells.accordion.push(await shoot('1 · FIRST LOAD', `${declaredOpen} open, every other section shut.`));
await openSection('shape');
cells.accordion.push(await shoot('2 · OPEN "Petal shape"', 'One click. Arrangement closed itself — nothing else was touched.'));
await openSection('thickness');
cells.accordion.push(await shoot('3 · OPEN "Part thickness"', 'Petal shape closed itself in turn. At most one section is ever open.'));
await closeSection('thickness');
cells.accordion.push(await shoot('4 · CLOSE IT AGAIN', 'Zero sections open, and nothing sprang open in its place — a state the visitor can reach, so the registry is allowed to declare it too.'));

/* ---- reactivity through a section that stays shut ---- */
await openBloom(page, port);
cells.reactivity.push(await shoot('BEFORE · Part thickness shut',
  'First load. Part thickness is shut; the readout below the buttons reports the shipping sheet, tip, foot and ring.'));
const drove = await page.evaluate(async () => {
  const det = document.getElementById('sec-thickness');
  const el = document.getElementById('sheetThickness');
  el.value = '2.4';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { stillShut: !det.open, state: window.__bloomUIState().sheetThickness, ring: window.__bloomMetrics().ringRadius };
});
if (!drove.stillShut) await die('driving sheetThickness opened the Part thickness section — the picture would not show what it claims');
if (Number(drove.state) !== 2.4) await die(`sheetThickness reads ${drove.state} after being driven — the app did not take the value`);
cells.reactivity.push(await shoot('AFTER · sheet 2.40 mm, section still shut',
  `sheetThickness driven 1.20 → 2.40 mm with real input/change events while Part thickness stayed shut. The section is still shut in this frame; the readout and the ring (${drove.ring.toFixed(2)} mm) moved.`));

/* THE GATED-CENTRE CELLS stood here (CENTER · DISC / RING) and went with the
   centre rig in session 20. */

/* ---- THE CENTRE, BEFORE AND AFTER (session 23) — against the base tree ----
   Each pair is the SAME driven state on both trees, the BEFORE cell from the
   base worktree's own page (its own registry, its own generator, its own
   read-out), the AFTER cell from this tree's. The read-out lines ride in
   every caption. `open` is applied THROUGH REAL CLICKS on both, so a section
   that the base tree does not have (Center) is simply not clicked there and
   the caption says which sections were opened. */
if (base) {
  const bothTrees = async (label, note, { set = [], open = [], spans = [] }) => {
    const pair = [];
    for (const [tree, prt] of [['BEFORE', base.port], ['AFTER', port]]) {
      await openBloom(page, prt);
      if (set.length) await drive(set);
      const opened = [];
      for (const id of open) {
        const has = await page.evaluate((x) => !!document.getElementById(`sec-${x}`), id);
        if (!has) continue;
        await openSection(id);
        opened.push(id);
      }
      const said = await page.evaluate((ids) => ids.map((id) => {
        const el = document.getElementById(id);
        return el ? `${id}: "${el.closest('.bl-ctrl').querySelector('.bl-val').textContent}"` : `${id}: (not in this tree)`;
      }), spans);
      const cap = await page.evaluate(() => {
        const w = document.getElementById('stamenSpread')?.closest('.bl-ctrl');
        return w && w.dataset.cap ? `cap mark at ${w.dataset.cap}x (--bl-cap ${w.style.getPropertyValue('--bl-cap')})` : 'no cap mark';
      });
      const shot = await shoot(`${tree} · ${label}`, `${note} Opened: ${opened.join(' › ') || 'nothing'}.${said.length ? ` Read-outs — ${said.join('; ')}.` : ''}${/stamenSpread/.test(spans.join()) ? ` ${cap}.` : ''}`);
      pair.push(shot);
    }
    cells.centre.push(...pair);
  };
  await bothTrees('first load', 'The panel as a visitor first finds it. BEFORE: Androecium and Gynoecium at top level beside the petal sections. AFTER: one Center section directly below Head, holding both as drop-downs.', {});
  await bothTrees('the androecium opened', 'BEFORE: Androecium opened at top level. AFTER: Center opened, then Androecium inside it, by the same two clicks a visitor makes; Gynoecium sits beside it, shut.', { open: ['center', 'androecium'] });
  await bothTrees('the gynoecium opened', 'BEFORE: Gynoecium opened at top level. AFTER: inside Center; opening it shut Androecium (the accordion one level down) and left Center open.', { open: ['center', 'gynoecium'] });
  await bothTrees('a part turned OFF keeps its settings', 'Six stamens on the disc at spread 3.00x, 30 mm, curl 45, then the count set back to 0; the style set to 35 mm, curl 60, then NONE. The sub-controls hide and go inert in both trees. AFTER, the two read-outs say the values are KEPT and return with the count / the style; BEFORE they said only that the apex is bare.',
    { set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenLayout', value: 'DISC' }, { id: 'stamenSpread', value: '3' }, { id: 'stamenLength', value: '30' }, { id: 'stamenCurl', value: '45' }, { id: 'gynoecium', value: 'STYLE' }, { id: 'styleLength', value: '35' }, { id: 'styleCurl', value: '60' }, { id: 'stamenCount', value: '0' }, { id: 'gynoecium', value: 'NONE' }],
      open: ['center', 'androecium'], spans: ['stamenCount', 'gynoecium'] });
  await bothTrees('the dead travel on the control · 120 on the disc, spread 2.00x', '120 stamens on the Vogel disc: the multiplier saturates at 1.25x on this hub and the slider runs to 6.00. BEFORE, only the read-out below the buttons confessed it. AFTER, the cap MARK sits on the track at 1.25x with the dead travel hatched to its right, and the control read-out says CLAMPED at 1.25x. The range is unchanged: 0.60 to 6.00 on both trees.',
    { set: [{ id: 'stamenCount', value: '120' }, { id: 'stamenLayout', value: 'DISC' }], open: ['center', 'androecium'], spans: ['stamenSpread'] });
  await bothTrees('the dead travel on the control · six on a ring, spread 5.80x', 'Six on a ring at spread 5.80x: this hub saturates at 5.61x, so the top of the travel is dead by 0.19 — the cap mark high on the track, the thumb in the hatched zone, the read-out CLAMPED. At one stamen the cap is 13.7x, past the range, and no mark is drawn (the panel gate asserts both).',
    { set: [{ id: 'stamenCount', value: '6' }, { id: 'stamenSpread', value: '5.8' }], open: ['center', 'androecium'], spans: ['stamenSpread'] });
  await bothTrees('the STAMENS line · six at curl 90 beside the style', 'Six filaments at curl 90 with the style present — the state session 22 photographed and Eva ruled the ±180 range on. AFTER, the STAMENS line ends with the nearest filament to the style (0.05 mm at 8.7 mm up) and the FILAMENT AGAINST STYLE flag; BEFORE, nothing on the line could see the crossing. A flag, never a gate — both trees export it watertight and one piece.',
    { set: [{ id: 'stamenCount', value: '6' }, { id: 'gynoecium', value: 'STYLE' }, { id: 'stamenCurl', value: '90' }], open: ['center', 'androecium'] });
  await bothTrees('the STAMENS line · six straight beside the style', 'The same six straight: the nearest filament is the ring radius away (2.94 mm) and the clause says clear. Present iff both parts are built; absent with either off.',
    { set: [{ id: 'stamenCount', value: '6' }, { id: 'gynoecium', value: 'STYLE' }], open: ['center', 'androecium'] });
} else {
  console.log('\nNO BASE TREE GIVEN — the centre BEFORE/AFTER sheet (session 23) was NOT produced. Pass a worktree of the base commit as the second argument to shoot it.');
}

await browser.close();
server.close();
if (base) base.server.close();

/* THE WORST-CASE PANEL HEIGHT — the honest replacement for the old
   "all expanded" number. Under an accordion the tallest the panel can ever be
   is its tallest single section, so that is the scroll a visitor can actually
   meet. Parsed from the captions this run produced, never recomputed. */
const measured = [...cells.perSection, ...cells.numbering];
const heights = measured.map((c) => Number(/panel (\d+)px/.exec(c.caption)[1]));
const tallest = measured[heights.indexOf(Math.max(...heights))];
console.log(`\nfirst load: ${/panel (\d+)px/.exec(cells.firstLoad[0].caption)[1]}px`
  + ` · worst case (tallest single section, ${tallest.label}): ${Math.max(...heights)}px`);

/* ---- compose ---- */
const CELL = 300;
const fig = (c) => `<figure><img src="data:image/png;base64,${c.png.toString('base64')}">
  <figcaption><b>${c.label}</b><br>${c.caption}<br><span class="note">${c.note}</span>
  <br><span class="ro">readout: ${c.readout}</span></figcaption></figure>`;
function sheet(title, note, list, perRow) {
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin:0; background:#000; color:#9fdcc4; font:12px ui-monospace,Menlo,monospace; }
    h1 { font-size:15px; margin:14px 12px 2px; color:#cfeee0; }
    p.head { margin:0 12px 10px; opacity:.65; max-width:1100px; line-height:1.5; }
    main { display:grid; grid-template-columns:repeat(${perRow}, ${CELL}px); gap:14px; padding:12px; align-items:start; }
    figure { margin:0; }
    img { width:${CELL}px; display:block; background:#0c0f0e; }
    figcaption { padding-top:5px; opacity:.75; font-size:10.5px; line-height:1.5; }
    figcaption b { color:#cfeee0; font-weight:500; }
    .note { opacity:.8; }
    .ro { color:#7fae99; }
  </style><h1>${title}</h1><p class="head">${note}</p><main>${list.map(fig).join('')}</main>`;
}

fs.mkdirSync(outDir, { recursive: true });
const b2 = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const written = [];
for (const [name, title, note, list, perRow] of [
  ['panel-grouping', 'Bloom panel — the grouping',
   `First cell: the panel as a visitor first finds it — the accordion holds one section open, the one the registry declares. Then one cell per section, each opened by a real click on its summary (a drop-down inside Petal roles by a click on its parent first), which is how a visitor reaches it and is why there is no "all expanded" cell: under an accordion that state does not exist. Together the ${cells.perSection.length} cells show every control in the panel; the nine per-petal groups only exist under FAN, so those cells say what was set to reach them. Tallest reachable panel — the worst scroll — is ${Math.max(...heights)}px against ${/panel (\d+)px/.exec(cells.firstLoad[0].caption)[1]}px at first load. No geometry changed for this sheet.`,
   [...cells.firstLoad, ...cells.perSection], 3],
  ['panel-numbering', 'Bloom panel — petal numbers on the rosette (ruling A), the all-petals group, and the caption',
   'Petal roles is the "adjust petals as a group" section at every depth (Eva, Sep 3). At two or more whorls IN STEP the rosette\'s two slot-role groups are drop-downs named by petal number, the fan\'s way: the labellum is always Petal 1 (slot 0, the plane\'s fixed point), and the hood is Petal N where N is the LAST orbit\'s number, which moves with the count — 2 at three petals, 5 at eight, 21 at forty. The gap between them is the ruling\'s accepted cost: the laterals carry no controls. The fan cell is the comparison, where every orbit has a group. Then the two states the Sep 3 ruling from the preview added: at ONE WHORL the section holds the all-petals trio (curl / cup / tip as deltas on Petal form and Petal shape) and Petal 1 / Petal N are hidden and inert — the one-whorl orchid is given up; and at two whorls with Layer offset away from 0 the registry\'s hiddenReason caption says why the two drop-downs are missing.',
   cells.numbering, 4],
  ['panel-accordion', 'Bloom panel — the accordion',
   'Opening a section closes the others. Four frames, each reached by one real click: first load, open Petal shape (Arrangement shuts itself), open Part thickness (Petal shape shuts in turn), close it (zero open, and nothing springs open in its place). The tradeoff is stated and accepted: tweaking across two sections costs a reopen click, and the layers-are-sections structure makes single-focus the normal case.',
   cells.accordion, 4],
  ['panel-reactivity', 'Bloom panel — a collapsed section is not a hidden control',
   'The assertion tools/verify-bloom-panel.mjs makes, photographed. sheetThickness lives in Part thickness, which is shut at first load. Driving it with real input/change events — the same route every gate uses — rebuilds the model and moves the readout, and the section stays shut. Collapse and the accordion are presentation; readUI, the export path and the gates cannot see either.',
   cells.reactivity, 2],
  ...(cells.centre.length ? [['panel-centre', 'Bloom panel — the centre, before and after (session 23)',
   `Left BEFORE (a real render of the base tree at ${BASE_ROOT}), right AFTER (this tree), the same driven state on both. Four things, each a pair: the Center container directly below Head holding Androecium and Gynoecium as drop-downs (a container, not a control — no value, no NONE; "no centre" is both parts off, already reachable); a part turned off with its settings moved off their defaults, the read-out saying they are KEPT and return; the stamen spread's dead travel shown ON the control — the cap mark at the owner's saturation, the range untouched (not narrowed, not adaptive); and the FILAMENT-AGAINST-STYLE flag on the STAMENS line, six at curl 90 beside the style. The read-out lines are in every caption. No geometry changed for this sheet: 0 moved on phase17 and on the live matrix, both trees.`,
   cells.centre, 2]] : []),
]) {
  const p2 = await b2.newPage({ viewport: { width: perRow * (CELL + 16) + 30, height: 900 } });
  await p2.setContent(sheet(title, note, list, perRow), { waitUntil: 'load' });
  const fp = path.join(outDir, name + '.png');
  await p2.screenshot({ path: fp, fullPage: true });
  await p2.close();
  written.push(`${fp} (${(fs.statSync(fp).size / 1024).toFixed(0)} KiB)`);
}
await b2.close();
console.log('\nsheets:\n  ' + written.join('\n  '));
