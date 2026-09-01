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
                  (a real click on its summary, through the accordion). Five
                  cells that together show every control in the panel.

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
                  WORST-CASE panel height across the five instead, which is the
                  honest version of that number under an accordion: the tallest
                  the panel can ever be is its tallest single section.
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
     gated centre the one-clear-choice-with-sub-panels pattern surviving the
                  grouping: the Center section open at DISC (size + dish) and
                  at RING (size + bore), the sub-controls swapping under one
                  choice exactly as `visibleWhen` declares.

   THE FRAME IS ASSERTED, NOT TRUSTED. A panel taller than its own scroll box
   would photograph CROPPED, and a cropped panel is the one picture that could
   make a grouping ruling on evidence that is missing the bottom of the list —
   so every cell reads back scrollHeight against clientHeight and the run dies
   if any frame is clipped. Same discipline as the canvas sheet's chrome and
   autoRotate read-backs, pointed at the failure this sheet can actually have.

   RUN:  node tools/shot-bloom-panel.mjs <out-dir>
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, CONTROLS, SECTIONS, DEFAULTS } from './bloom-harness.mjs';
import { chromium } from 'playwright-core';
import { findChromium } from './chromium-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-panel-sheets';

const { server, port } = await serveRepo();
/* Tall viewport so an ALL-EXPANDED panel fits inside its own max-height and
   the frame is a complete picture rather than a crop. The assertion below is
   what makes that a fact instead of a hope. */
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 2 });

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

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

const cells = { firstLoad: [], perSection: [], accordion: [], reactivity: [], centre: [] };

/* Open a section THE WAY A VISITOR DOES — a real click on its summary, so
   every frame on this sheet is a state the UI can actually reach. `toggle` is
   queued rather than synchronous (measured), so this waits a frame before the
   caller reads anything back. Clicking an already-open summary would CLOSE it,
   hence the guard. */
async function openSection(id) {
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
const declaredOpen = SECTIONS.filter((x) => x.open).map((x) => x.label).join(', ') || 'none';
cells.firstLoad.push(await shoot('FIRST LOAD (as the registry declares)',
  `The panel is an accordion: at most one section open. The registry declares ${declaredOpen || 'no section'} open at first load.`));

/* ---- one cell per section, each opened through the accordion ---- */
for (const sec of SECTIONS) {
  await openSection(sec.id);
  const shown = await page.evaluate((id) => [...document.querySelectorAll(`#sec-${id} .bl-ctrl`)]
    .filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent).join(', '), sec.id);
  cells.perSection.push(await shoot(`SECTION · ${sec.label}`,
    `Opened by a real click on its summary; every other section shut itself. Controls: ${shown}.`));
}

/* ---- the accordion as a sequence ---- */
await openBloom(page, port);
cells.accordion.push(await shoot('1 · FIRST LOAD', `${declaredOpen} open, the other four shut.`));
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

/* ---- the gated centre, inside its section ---- */
for (const style of ['DISC', 'RING']) {
  await openBloom(page, port);
  await openSection('center');
  await page.evaluate((st) => {
    const el = document.getElementById('centerStyle');
    el.value = st;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, style);
  await page.waitForTimeout(250);
  const sub = await page.evaluate(() => [...document.querySelectorAll('#sec-center .bl-ctrl')]
    .filter((w) => !w.hidden).map((w) => w.querySelector('label').firstChild.textContent).join(', '));
  cells.centre.push(await shoot(`CENTER · ${style}`,
    `One clear choice with sub-panels gated per choice, unchanged by the grouping. Visible here: ${sub}.`));
}

await browser.close();
server.close();

/* THE WORST-CASE PANEL HEIGHT — the honest replacement for the old
   "all expanded" number. Under an accordion the tallest the panel can ever be
   is its tallest single section, so that is the scroll a visitor can actually
   meet. Parsed from the captions this run produced, never recomputed. */
const heights = cells.perSection.map((c) => Number(/panel (\d+)px/.exec(c.caption)[1]));
const tallest = cells.perSection[heights.indexOf(Math.max(...heights))];
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
   `First cell: the panel as a visitor first finds it — the accordion holds one section open, the one the registry declares. Then one cell per section, each opened by a real click on its summary, which is how a visitor reaches it and is why there is no "all expanded" cell: under an accordion that state does not exist. Together the five show every control in the panel. Tallest single section — the worst scroll reachable — is ${Math.max(...heights)}px against ${/panel (\d+)px/.exec(cells.firstLoad[0].caption)[1]}px at first load. No geometry changed in this session.`,
   [...cells.firstLoad, ...cells.perSection], 3],
  ['panel-accordion', 'Bloom panel — the accordion',
   'Opening a section closes the others. Four frames, each reached by one real click: first load, open Petal shape (Arrangement shuts itself), open Part thickness (Petal shape shuts in turn), close it (zero open, and nothing springs open in its place). The tradeoff is stated and accepted: tweaking across two sections costs a reopen click, and the layers-are-sections structure makes single-focus the normal case.',
   cells.accordion, 4],
  ['panel-reactivity', 'Bloom panel — a collapsed section is not a hidden control',
   'The assertion tools/verify-bloom-panel.mjs makes, photographed. sheetThickness lives in Part thickness, which is shut at first load. Driving it with real input/change events — the same route every gate uses — rebuilds the model and moves the readout, and the section stays shut. Collapse and the accordion are presentation; readUI, the export path and the gates cannot see either.',
   cells.reactivity, 2],
  ['panel-centre', 'Bloom panel — the gated centre, inside its section',
   'The centre keeps the pattern it had: one clear choice, sub-panels gated per choice by visibleWhen. Grouping did not change which controls appear or when — applyVisibility() is still the only thing that hides a control, and a section is hidden only when every control in it is.',
   cells.centre, 2],
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
