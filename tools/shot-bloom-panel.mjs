/* ===================================================================
   shot-bloom-panel.mjs — the PANEL sheet. Chrome only; no canvas.

   The metric screens, eyes decide, and a sheet is required before committing
   anything visual. tools/shot-bloom.mjs is the inverse of this tool: it hides
   the panel (body.bl-preview) to photograph the model. Here the panel IS the
   subject, so this tool never sets that class — bloom.css stays the one owner
   of what counts as chrome, and neither tool re-implements the other's job.

   WHAT IT SHOOTS
     first load   the panel exactly as a visitor finds it — the sections at the
                  `open` literals the registry declares. This is the cell the
                  grouping ruling is made from.
     expanded     every section open, i.e. the whole control set, which is what
                  the panel WAS before this change. The two cells together are
                  the before/after of the scroll problem, measured: each
                  caption carries the panel's own pixel height.
     reactivity   the collapsed-section assertion, PHOTOGRAPHED. A pair: the
                  panel at first load with Material shut, then the same panel
                  after `sheetThickness` was driven to 2.40 mm through real
                  events while that section stayed shut. Material is visibly
                  closed in both frames and the readout — which lives outside
                  every section — has moved, sheet and ring alike. What
                  verify-bloom-panel.mjs asserts, this shows.
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

const cells = { firstLoad: [], expanded: [], reactivity: [], centre: [] };

/* ---- first load: the registry's own literals ---- */
await openBloom(page, port);
cells.firstLoad.push(await shoot('FIRST LOAD (as the registry declares)',
  `Sections at their declared \`open\` literals: ${SECTIONS.map((s) => `${s.label} ${s.open ? 'open' : 'collapsed'}`).join(', ')}.`));

/* ---- all expanded: the panel this change is measured against ---- */
await page.evaluate(() => document.querySelectorAll('#panelControls details').forEach((d) => { d.open = true; }));
await page.waitForTimeout(200);
cells.expanded.push(await shoot('EVERY SECTION EXPANDED',
  `All ${CONTROLS.length} controls, minus the centre sub-controls the DISC default hides. This is the full list the panel used to open onto.`));

/* ---- reactivity through a section that stays shut ---- */
await openBloom(page, port);
cells.reactivity.push(await shoot('BEFORE · Material collapsed',
  'First load. The Material section is shut; the readout below the buttons reports the shipping sheet, tip, foot and ring.'));
const drove = await page.evaluate(async () => {
  const det = document.getElementById('sec-material');
  const el = document.getElementById('sheetThickness');
  el.value = '2.4';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { stillShut: !det.open, state: window.__bloomUIState().sheetThickness, ring: window.__bloomMetrics().ringRadius };
});
if (!drove.stillShut) await die('driving sheetThickness opened the Material section — the picture would not show what it claims');
if (Number(drove.state) !== 2.4) await die(`sheetThickness reads ${drove.state} after being driven — the app did not take the value`);
cells.reactivity.push(await shoot('AFTER · sheet 2.40 mm, section still shut',
  `sheetThickness driven 1.20 → 2.40 mm with real input/change events while Material stayed collapsed. The section is still shut in this frame; the readout and the ring (${drove.ring.toFixed(2)} mm) moved.`));

/* ---- the gated centre, inside its section ---- */
for (const style of ['DISC', 'RING']) {
  await openBloom(page, port);
  await page.evaluate((st) => {
    document.getElementById('sec-center').open = true;
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
   'Left: the panel as a visitor first finds it, sections at the registry\'s declared open literals. Right: every section expanded — the whole control set, which is what the panel opened onto before this change. No geometry changed in this session; the two frames differ only in presentation.',
   [...cells.firstLoad, ...cells.expanded], 2],
  ['panel-reactivity', 'Bloom panel — a collapsed section is not a hidden control',
   'The assertion tools/verify-bloom-panel.mjs makes, photographed. sheetThickness lives in Material, which is collapsed at first load. Driving it with real input/change events — the same route every gate uses — rebuilds the model and moves the readout, and the section stays shut. Collapse is presentation; readUI, the export path and the gates cannot see it.',
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
