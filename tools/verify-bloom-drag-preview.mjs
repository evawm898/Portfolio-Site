#!/usr/bin/env node
/* DRAG PREVIEW GATE (F7, Eva's rulings — docs/bloom-print-preview-always-on.md).

   Print preview is always on, and while a slider is HELD the viewport builds
   the same geometry without the infill cells (candidate A); release builds
   the full print geometry. The property this gate exists for is the one a
   visitor cannot see is wrong: WHAT IS ON SCREEN WHEN NOTHING IS BEING
   DRAGGED MUST BE THE FULL PRINT GEOMETRY. A light build left on screen looks
   like a plausible bloom with solid petals, exports nothing wrong (the STL
   never reads it), and no other gate here drives a pointer — so without this
   it would ship silently.

   THE REFERENCE HAS A DIFFERENT OWNER FROM THE QUANTITY (CLAUDE.md's fourth
   durable rule). "Full print geometry" is read off the EXPORTED STL — the Get
   STL handler builds from readUI() in export mode and never consults the drag
   state — and "on screen" is a digest of the viewport mesh's own position
   buffer (`__bloomShownDigest`). The light reference (D1) is built by the
   geometry module directly in the page, with the infill set to NONE, so it
   is independent of bloom.js's routing too. Negative zeros are folded to +0
   on both sides: the STL exporter's identity transform turns -0 into +0.

   THE CLAUSES — every one on a fresh page opened AS SHIPPED (print preview on):
     D0  at rest after a config is applied, the screen is the full geometry
     D1  mid-drag (a real mouse held on a slider) the screen IS the light
         geometry — exactly print minus the infill cells — and it differs from
         full (otherwise every other clause is vacuous)
     D2  drag end by POINTERUP ALONE (the drag returns to its start value, so no
         'change' fires): full geometry on screen, no light build left
     D3  drag end by a 'change' event with no pointerup: full on screen
     D4  a TYPED value (F5, click the read-out, type, Enter): full on screen and
         no light build was ever made
     D5  KEYBOARD arrows on a focused slider: full on screen, no light build
     D6  a drag starting while a full build is QUEUED supersedes it (the queued
         build runs light); release then puts full geometry on screen
     D7  a design with NO infill has nothing to shed: dragging makes no light
         build at all
     D8  "Get grid" follows print preview: at load it exports the EXPORT grid
     D9  the print-preview box is checked and hidden at load
     D10 (the page profile, Oct 27) a design with an INFLORESCENCE sheds its
         REPORTS while a slider is held: mid-drag the build is light, its
         deferred reports read null (the umbel's pitch floor, the placement
         flags) and its bytes are STILL the full build's — read against the
         geometry module's own full build in the page, a different owner from
         bloom.js's routing; after pointerup the screen is the exported STL
         and EVERY deferred report is back, a number. A report that never
         runs at rest, and a held slider that defers nothing, both redden it.

   `--negative-control` serves deliberately broken copies of bloom.js through
   the gate's own page route and requires every mutant to redden exactly the
   clauses it names (and none it does not). Every anchor is checked to match
   exactly once BEFORE any mutant runs. A check nobody has seen fail is a hope.

   Run: node tools/verify-bloom-drag-preview.mjs [--negative-control] [--mutant=a,b]
   Needs playwright-core and three@0.161.0 (npm i --no-save). Not a geometry
   gate: it builds one modest design (the shipping default with Voronoi infill)
   a few dozen times. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild, exportStl } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEGATIVE = process.argv.includes('--negative-control');
const ONLY = (process.argv.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);
const SLIDER = 'petalLength';
const INFILL = [{ id: 'petalInfill', value: 'VORONOI' }];

/* ---------------- the digests ---------------- */
function fnvFloat32(values) {
  const f = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) f[i] = values[i] === 0 ? 0 : values[i];
  const b = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
function stlDigest(buf) {
  const n = buf.readUInt32LE(80);
  const v = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) v[t * 9 + k] = buf.readFloatLE(84 + t * 50 + 12 + k * 4);
  return { tris: n, fnv: fnvFloat32(v) };
}
const shown = (page) => page.evaluate(() => window.__bloomShownDigest());
const drag = (page) => page.evaluate(() => window.__bloomDragState());
/* the light reference: the geometry module, in the page, export mode, infill NONE */
const lightRef = (page) => page.evaluate(async () => {
  const mod = await import('/bloom-geometry.js');
  const ui = { ...window.__bloomUIState(), petalInfill: 'NONE' };
  const acc = new mod.MeshBuilder({ exportMode: true });
  mod.buildBloomInto(acc, ui, { below: null, capability: null });
  const f = new Float32Array(acc.positions.length);
  for (let i = 0; i < f.length; i++) { const x = Math.fround(acc.positions[i]); f[i] = x === 0 ? 0 : x; }
  const b = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return { tris: f.length / 9, fnv: h };
});
/* the FULL reference, the same way: the geometry module, in the page, export
   mode, no override and no deferral — so a deferred drag build is compared
   against an owner that defers nothing (D10) */
const fullModRef = (page) => page.evaluate(async () => {
  const mod = await import('/bloom-geometry.js');
  const acc = new mod.MeshBuilder({ exportMode: true });
  mod.buildBloomInto(acc, window.__bloomUIState(), { below: null, capability: null });
  const f = new Float32Array(acc.positions.length);
  for (let i = 0; i < f.length; i++) { const x = Math.fround(acc.positions[i]); f[i] = x === 0 ? 0 : x; }
  const b = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return { tris: f.length / 9, fnv: h };
});
/* the deferred reports as the page's own metrics hook carries them */
const infloReports = (page) => page.evaluate(() => {
  const m = window.__bloomMetrics().inflorescence || {};
  const b = window.__bloomMetrics().inflorescenceBuilt || {};
  return { pitchFloorMm: m.pitchFloorMm ?? null, sameNodeMayTouch: m.sameNodeMayTouch ?? null, placementResidual: b.placementResidual ?? null, rachisApproachMm: b.rachisApproachMm ?? null };
});
const reportsAll = (r) => Number.isFinite(r.pitchFloorMm) && typeof r.sameNodeMayTouch === 'boolean' && Number.isFinite(r.placementResidual) && Number.isFinite(r.rachisApproachMm);
const reportsNone = (r) => r.pitchFloorMm === null && r.sameNodeMayTouch === null && r.placementResidual === null && r.rachisApproachMm === null;
/* an umbel with every report live: the shipped umbel on a 120 mm stem at
   -60 deg, where a floret body comes near its own rachis so the flag is a
   number (the knot's florets), and nothing else moved */
const UMBEL = [{ id: 'stemLength', value: '120' }, { id: 'inflorescence', value: 'UMBEL' }];
const same = (a, b) => !!a && !!b && a.tris === b.tris && a.fnv === b.fnv;
const fmtD = (d) => (d ? `${d.tris} tris #${d.fnv.toString(16)}` : 'none');

/* THE SLIDER'S BOX, TAKEN ONLY ONCE THE LAYOUT HAS STOPPED MOVING AND THE
   SLIDER IS WHAT SITS UNDER ITS OWN CENTRE. Opening every section and the
   export click both re-flow the panel for a few frames, and a box measured
   mid-reflow sends the press to whatever moved under it. AND THE PANEL IS AN
   ACCORDION, so opening EVERY section in document order lets a later top-level
   section close the slider's own — measured: after the export, Petal and Petal
   shape read open=false and the "Part thickness" summary sat where the box had
   been taken, so no drag began and D1/D2 read a drag that never happened. Only
   the slider's own ancestors are opened now. A press point that is not the
   slider is a harness failure and THROWS, never a quiet miss. */
async function sliderBox(page) {
  await page.evaluate((id) => {
    for (let d = document.getElementById(id).closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
  }, SLIDER);
  const s = page.locator(`#${SLIDER}`);
  let prev = null;
  for (let i = 0; i < 40; i++) {
    await s.scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const b = await s.boundingBox();
    const hit = b && await page.evaluate(([id, x, y]) => document.elementFromPoint(x, y) === document.getElementById(id),
      [SLIDER, b.x + b.width * 0.5, b.y + b.height / 2]);
    if (b && hit && prev && b.x === prev.x && b.y === prev.y && b.width === prev.width) return b;
    prev = b;
  }
  throw new Error(`#${SLIDER} never settled under its own centre (last box ${JSON.stringify(prev)})`);
}

/* ---------------- one full run of the clauses ---------------- */
async function runClauses(port, bloomJsOverride = null, file = 'bloom.js') {
  const results = [];
  const rec = (id, ok, detail) => results.push({ id, ok, detail });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-drag-'));
  const fresh = async (sets) => {
    const { browser, page } = await launchPage({ viewport: { width: 1400, height: 1000 } });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (bloomJsOverride) await page.route(`**/${file}`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: bloomJsOverride }));
    await openBloom(page, port, { asShipped: true });
    if (sets.length) {
      const bad = await applyConfig(page, sets);
      if (bad.length) throw new Error(`read-back failed: ${bad.join('; ')}`);
    }
    return { browser, page, errors };
  };
  const fullRef = async (page) => stlDigest(await exportStl(page, tmp));
  const restIsFull = async (page, id, extra = '') => {
    await settleBuild(page);
    const st = await drag(page), on = await shown(page), ref = await fullRef(page);
    const m = await page.evaluate(() => window.__bloomMetrics().shownLight);
    const ok = !st.dragging && !st.lightOnScreen && m === false && same(on, ref);
    rec(id, ok, `${extra}dragging ${st.dragging}, light on screen ${st.lightOnScreen}, metrics.shownLight ${m}; on screen ${fmtD(on)} vs STL ${fmtD(ref)}`);
    return st;
  };
  const guard = async (fn, ids) => {
    try { await fn(); } catch (e) { for (const id of ids) if (!results.some((r) => r.id === id)) rec(id, false, `threw: ${String(e).slice(0, 200)}`); }
  };

  /* D9 + D0 + D8 — the page as shipped */
  await guard(async () => {
    const { browser, page, errors } = await fresh([]);
    const box = await page.evaluate(() => { const el = document.getElementById('printPreview'); const w = el && el.closest('.bl-toggle'); return { checked: el && el.checked, hidden: !!(w && getComputedStyle(w).display === 'none'), mode: window.__bloomMetrics().shownMode }; });
    rec('D9', box.checked === true && box.hidden && box.mode === 'export', `box checked ${box.checked}, wrapper hidden ${box.hidden}, shownMode ${box.mode}`);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#exportGrid')]);
    rec('D8', dl.suggestedFilename() === 'bloom-grid-export.glb', `the grid downloaded as ${dl.suggestedFilename()}`);
    const bad = await applyConfig(page, INFILL);
    if (bad.length) throw new Error(bad.join('; '));
    await restIsFull(page, 'D0');
    if (errors.length) rec('D0', false, `page errors: ${errors.join(' | ')}`);
    await browser.close();
  }, ['D9', 'D8', 'D0']);

  /* D1 + D2 — a real mouse drag, released by pointerup ALONE */
  await guard(async () => {
    const { browser, page } = await fresh(INFILL);
    let b = await sliderBox(page);
    const x0 = b.x + b.width * 0.3;
    let y = b.y + b.height / 2;
    /* put the thumb under x0 first (a click jumps it there and builds full),
       so the measured drag below can come back to the value it began on */
    await page.mouse.click(x0, y);
    await settleBuild(page);
    const full0 = await fullRef(page);
    /* the export CLICKS #exportStl, which can scroll and re-flow the panel, so
       the slider's box is taken again after it; the thumb's x is a fraction of
       the track and does not move with a vertical scroll */
    b = await sliderBox(page);
    y = b.y + b.height / 2;
    /* D2 is the release that ONLY pointerup can see: the drag returns to its
       starting value, so the browser fires no 'change' on release and the
       slider's own change listener queues nothing. A drag that ends on a new
       value is rescued by that 'change' whatever pointerup does — measured:
       the release-does-not-rebuild mutant passed a plain drag-and-release. */
    const v0 = await page.evaluate((id) => {
      window.__dragChanges = 0;
      document.getElementById(id).addEventListener('change', () => { window.__dragChanges++; });
      return document.getElementById(id).value;
    }, SLIDER);
    await page.mouse.move(x0, y);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.62, y, { steps: 6 });
    await settleBuild(page);
    const st = await drag(page), on = await shown(page), lref = await lightRef(page);
    const first = await page.evaluate(() => document.getElementById('readout').textContent.split('\n')[0]);
    rec('D1', st.dragging && st.lightOnScreen && same(on, lref) && on.tris < full0.tris && /while dragging/.test(first),
      `dragging ${st.dragging}, light on screen ${st.lightOnScreen}; on screen ${fmtD(on)} vs light reference ${fmtD(lref)} (full at rest was ${full0.tris} tris); read-out "${first}"`);
    await page.mouse.move(x0, y, { steps: 6 });
    await settleBuild(page);
    await page.mouse.up();
    const after = await restIsFull(page, 'D2');
    const back = await page.evaluate((id) => ({ v: document.getElementById(id).value, changes: window.__dragChanges }), SLIDER);
    if (!(after.lightBuilds > 0)) rec('D2', false, `no light build was ever made during the drag (${after.lightBuilds}) — the clause measured nothing`);
    if (back.changes !== 0 || back.v !== v0) rec('D2', false, `the release fired ${back.changes} 'change' event(s), value ${v0} -> ${back.v} — this clause must see pointerup ALONE`);
    await browser.close();
  }, ['D1', 'D2']);

  /* D3 — a drag ended by 'change' alone, no pointerup ever arrives */
  await guard(async () => {
    const { browser, page } = await fresh(INFILL);
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      el.value = String(Number(el.value) + 5);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, SLIDER);
    await settleBuild(page);
    const mid = await drag(page);
    await page.evaluate((id) => document.getElementById(id).dispatchEvent(new Event('change', { bubbles: true })), SLIDER);
    await restIsFull(page, 'D3', `mid-drag light on screen ${mid.lightOnScreen}; then change: `);
    if (!mid.lightOnScreen) rec('D3', false, 'the synthetic drag never put a light build on screen — the clause measured nothing');
    await browser.close();
  }, ['D3']);

  /* D4 — a TYPED value (F5) */
  await guard(async () => {
    const { browser, page } = await fresh(INFILL);
    await sliderBox(page);
    const was = await page.evaluate((id) => document.getElementById(id).value, SLIDER);
    const span = page.locator(`.bl-ctrl:has(#${SLIDER}) .bl-val`);
    await span.click();
    await page.keyboard.type('41');
    await page.keyboard.press('Enter');
    const st = await restIsFull(page, 'D4');
    const now = await page.evaluate((id) => document.getElementById(id).value, SLIDER);
    if (st.lightBuilds !== 0 || now === was) rec('D4', false, `typed 41: value ${was} -> ${now}, light builds ${st.lightBuilds} (must be 0)`);
    await browser.close();
  }, ['D4']);

  /* D5 — keyboard arrows */
  await guard(async () => {
    const { browser, page } = await fresh(INFILL);
    await sliderBox(page);
    const was = await page.evaluate((id) => document.getElementById(id).value, SLIDER);
    await page.focus(`#${SLIDER}`);
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    const st = await restIsFull(page, 'D5');
    const now = await page.evaluate((id) => document.getElementById(id).value, SLIDER);
    if (st.lightBuilds !== 0 || now === was) rec('D5', false, `three arrows: value ${was} -> ${now}, light builds ${st.lightBuilds} (must be 0)`);
    await browser.close();
  }, ['D5']);

  /* D6 — a drag starting while a full build is queued supersedes it */
  await guard(async () => {
    const { browser, page } = await fresh(INFILL);
    const before = (await drag(page)).lightBuilds;
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      el.value = String(Number(el.value) + 5);
      el.dispatchEvent(new Event('input', { bubbles: true }));                   // queues a FULL build (no drag)
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));      // a drag starts before it runs
    }, SLIDER);
    await settleBuild(page);
    const mid = await drag(page);
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
    await restIsFull(page, 'D6', `the queued build ran ${mid.lightOnScreen ? 'LIGHT (superseded)' : 'FULL (not superseded)'}; after release: `);
    if (!(mid.lightOnScreen && mid.lightBuilds === before + 1)) rec('D6', false, `the build queued before the drag started was not superseded: light on screen ${mid.lightOnScreen}, light builds ${before} -> ${mid.lightBuilds}`);
    await browser.close();
  }, ['D6']);

  /* D7 — no infill, nothing to shed */
  await guard(async () => {
    const { browser, page } = await fresh([]);
    const b = await sliderBox(page);
    await page.mouse.move(b.x + b.width * 0.3, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.6, b.y + b.height / 2, { steps: 6 });
    await settleBuild(page);
    const mid = await drag(page);
    await page.mouse.up();
    const st = await restIsFull(page, 'D7', `mid-drag light on screen ${mid.lightOnScreen}; `);
    if (mid.lightOnScreen || st.lightBuilds !== 0 || !mid.dragging) rec('D7', false, `a design with no infill made a light build (dragging ${mid.dragging}, light on screen ${mid.lightOnScreen}, light builds ${st.lightBuilds})`);
    await browser.close();
  }, ['D7']);

  /* D10 — an inflorescence's reports are deferred while held, and back at rest */
  await guard(async () => {
    const { browser, page } = await fresh(UMBEL);
    const rest0 = await infloReports(page);
    const b = await sliderBox(page);
    await page.mouse.move(b.x + b.width * 0.3, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.55, b.y + b.height / 2, { steps: 4 });
    await settleBuild(page, 120000);
    const st = await drag(page), mid = await infloReports(page), on = await shown(page), fref = await fullModRef(page);
    const first = await page.evaluate(() => document.getElementById('readout').textContent.split('\n')[0]);
    await page.mouse.up();
    const after = await restIsFull(page, 'D10', `at load the reports read ${JSON.stringify(rest0)}; mid-drag light on screen ${st.lightOnScreen}, reports ${JSON.stringify(mid)}, on screen ${fmtD(on)} vs the module's full build ${fmtD(fref)}; after release: `);
    const back = await infloReports(page);
    if (!reportsAll(rest0)) rec('D10', false, `at rest before any drag a report is missing: ${JSON.stringify(rest0)} — a deferred report that does not run at rest`);
    if (!(st.dragging && st.lightOnScreen && reportsNone(mid))) rec('D10', false, `mid-drag the reports were not deferred (dragging ${st.dragging}, light on screen ${st.lightOnScreen}, reports ${JSON.stringify(mid)}) — the clause measured nothing`);
    if (!same(on, fref)) rec('D10', false, `mid-drag the deferred build is ${fmtD(on)} where the full build is ${fmtD(fref)} — deferring a REPORT moved bytes`);
    if (!/while dragging/.test(first)) rec('D10', false, `mid-drag the read-out did not say a light build is on screen: "${first}"`);
    if (!reportsAll(back)) rec('D10', false, `after release a deferred report did not come back: ${JSON.stringify(back)} — it never runs at rest`);
    if (!(after.lightBuilds > 0)) rec('D10', false, `no light build was made (${after.lightBuilds})`);
    await browser.close();
  }, ['D10']);

  fs.rmSync(tmp, { recursive: true, force: true });
  /* a clause reported twice is the worse reading */
  const by = new Map();
  for (const r of results) { const p = by.get(r.id); if (!p || (p.ok && !r.ok)) by.set(r.id, r); }
  return [...by.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/* ---------------- the mutants ---------------- */
const MUTANTS = [
  { id: 'release-does-not-rebuild', breaks: ['D2', 'D6'],
    edits: [['  if (lightOnScreen || regenQueued) scheduleRegen();\n}', '}']] },
  { id: 'change-does-not-end-drag', breaks: ['D3'],
    edits: [["document.addEventListener('change', (e) => { if (isSlider(e.target)) endDrag(); }, true);", '']] },
  { id: 'every-input-builds-light', breaks: ['D0', 'D2', 'D3', 'D4', 'D5', 'D6', 'D10'],
    edits: [['function dragLight() { const ui = readUI(); return dragActive && (!infillIsAbsent(ui) || !textureIsAbsent(ui) || !inflorescenceIsAbsent(ui)); }', 'function dragLight() { const ui = readUI(); return (!infillIsAbsent(ui) || !textureIsAbsent(ui) || !inflorescenceIsAbsent(ui)); }']] },
  /* A STREAM OF INPUT EVENTS IS NOT A DRAG — the realistic wrong design, and
     the only one that can strand a keyboard nudge or a typed value on light
     geometry. Two narrower mutants were tried first and are EQUIVALENT, so
     they are not here: "a keydown on a slider enters the drag" and "a typed
     value enters the drag" both leave nothing to see, because an arrow key and
     F5's commit fire input THEN change in one task, and the change ends the
     drag before the rAF build runs. That is the property, and D3 holds it. */
  { id: 'input-events-are-the-drag', breaks: ['D3', 'D4', 'D5'],
    edits: [
      ["document.addEventListener('pointerdown', (e) => { if (isSlider(e.target)) dragActive = true; }, true);",
        "document.addEventListener('input', (e) => { if (isSlider(e.target)) dragActive = true; }, true);"],
      ["document.addEventListener('change', (e) => { if (isSlider(e.target)) endDrag(); }, true);", ''],
    ] },
  { id: 'the-kind-is-decided-when-queued', breaks: ['D6'],
    edits: [
      ['  const light = dragLight();\n', '  const light = queuedLight;\n'],
      ['  regenQueued = true;\n', '  regenQueued = true;\n  queuedLight = dragLight();\n'],
      ['let regenQueued = false;\n', 'let regenQueued = false;\nlet queuedLight = false;\n'],
    ] },
  { id: 'the-light-build-is-the-full-build', breaks: ['D1'],
    edits: [['override: light ? DRAG_LIGHT_OVERRIDE : null', 'override: null']] },
  /* THE PAGE PROFILE'S DEFERRAL (Oct 27). Two of bloom.js's own — the held
     build defers nothing, and every build defers (so the reports never run at
     rest) — and one per deferred instrument in the GEOMETRY, served through
     the same route with `file`, each a report that never runs at rest. Each
     geometry mutant is WITNESSED in Node on the mutated module before the
     clauses run: its rest build of the D10 umbel must read that report null
     where the clean module reads a number (witnessOf below). */
  { id: 'the-held-build-defers-nothing', breaks: ['D10'],
    edits: [['override: light ? DRAG_LIGHT_OVERRIDE : null, deferReports: light', 'override: light ? DRAG_LIGHT_OVERRIDE : null, deferReports: false']] },
  { id: 'the-reports-never-run-at-rest', breaks: ['D10'],
    edits: [['override: light ? DRAG_LIGHT_OVERRIDE : null, deferReports: light', 'override: light ? DRAG_LIGHT_OVERRIDE : null, deferReports: true']] },
  { id: 'the-umbel-pitch-floor-never-runs-at-rest', breaks: ['D10'], file: 'bloom-geometry.js', witness: 'pitchFloorMm',
    edits: [['  const pitchDeferred = umbel && !!deferReports && !(compound || reducedFlorets);', '  const pitchDeferred = umbel && !(compound || reducedFlorets);']] },
  { id: 'the-placement-flags-never-run-at-rest', breaks: ['D10'], file: 'bloom-geometry.js', witness: 'rachisApproachMm',
    edits: [['      if (!plan.reportsDeferred) for (let k = 0; k < src.length; k += 3) {', '      if (false) for (let k = 0; k < src.length; k += 3) {']] },
];

/* A GEOMETRY MUTANT'S WITNESS: the mutated module, imported in Node from a
   copy beside the original (its relative imports resolve), builds the D10
   umbel AT REST — no deferral asked — and reads the report the mutant names. */
async function witnessOf(m) {
  const { DEFAULTS } = await import(path.join(ROOT, 'bloom-registry.js'));
  const state = { ...DEFAULTS, ...Object.fromEntries(UMBEL.map((x) => [x.id, x.value])) };
  const read = async (file) => {
    const G = await import(`${file}?w=${Date.now()}`);
    const b = G.buildBloomInto(new G.MeshBuilder({ exportMode: true }), state, { below: null });
    const v = m.witness === 'pitchFloorMm' ? b.inflorescence.pitchFloorMm : b.inflorescenceBuilt.rachisApproachMm;
    return v ?? null;
  };
  const tmpFile = path.join(ROOT, `.__drag-witness-${process.pid}.js`);
  fs.writeFileSync(tmpFile, mutate(fs.readFileSync(path.join(ROOT, m.file), 'utf8'), m));
  try { return { clean: await read(path.join(ROOT, m.file)), mutant: await read(tmpFile) }; } finally { fs.rmSync(tmpFile, { force: true }); }
}

function mutate(src, m) {
  let out = src;
  for (const [from, to] of m.edits) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`mutant ${m.id}: anchor matches ${n} times (must be exactly 1): ${JSON.stringify(from.slice(0, 80))}`);
    out = out.replace(from, to);
  }
  return out;
}

/* ---------------- main ---------------- */
const { server, port } = await serveRepo();
let failed = false;
try {
  if (!NEGATIVE) {
    const res = await runClauses(port);
    for (const r of res) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id}: ${r.detail}`);
    const want = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10'];
    const missing = want.filter((id) => !res.some((r) => r.id === id));
    if (missing.length) { console.log(`FAIL: clauses that never reported: ${missing.join(', ')}`); failed = true; }
    if (res.some((r) => !r.ok)) failed = true;
    console.log(failed ? '\nDRAG PREVIEW: FAILED' : `\nDRAG PREVIEW: PASS — ${res.length} clauses; what is on screen at rest is the full print geometry after a pointerup, a change, a typed value and the keyboard, and an inflorescence's deferred reports run at rest`);
  } else {
    const srcOf = (m) => fs.readFileSync(path.join(ROOT, m.file || 'bloom.js'), 'utf8');
    for (const m of MUTANTS) mutate(srcOf(m), m);   // every anchor, before any mutant runs
    console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
    const base = await runClauses(port);
    if (base.some((r) => !r.ok)) { for (const r of base.filter((x) => !x.ok)) console.log(`BASE FAIL ${r.id}: ${r.detail}`); throw new Error('the clean tree does not pass — the negative control means nothing'); }
    const run = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
    for (const m of run) {
      if (m.witness) {
        const w = await witnessOf(m);
        console.log(`     witness ${m.id}: the D10 umbel at rest reads ${m.witness} ${w.clean} on the clean module and ${w.mutant} on the mutated one`);
        if (!(Number.isFinite(w.clean) && w.mutant === null)) { failed = true; console.log(`BAD  ${m.id}: the witness says the mutation did not stop the report at rest`); continue; }
      }
      const res = await runClauses(port, mutate(srcOf(m), m), m.file || 'bloom.js');
      const red = res.filter((r) => !r.ok).map((r) => r.id);
      const missed = m.breaks.filter((id) => !red.includes(id));
      const unclaimed = red.filter((id) => !m.breaks.includes(id));
      const ok = !missed.length && !unclaimed.length;
      if (!ok) failed = true;
      console.log(`${ok ? 'ok  ' : 'BAD '} ${m.id}: red ${red.join(',') || 'none'}${missed.length ? ` — MISSED ${missed.join(',')}` : ''}${unclaimed.length ? ` — UNCLAIMED ${unclaimed.join(',')}` : ''}`);
      if (!ok) for (const r of res.filter((x) => unclaimed.includes(x.id) || missed.includes(x.id))) console.log(`       ${r.id}: ${r.detail}`);
    }
    console.log(failed ? '\nNEGATIVE CONTROL: FAILED' : `\nNEGATIVE CONTROL: PASS — ${run.length}${ONLY.length ? ` of ${MUTANTS.length} (a SUBSET)` : ''} mutants each reddened exactly the clauses they name`);
  }
} finally {
  server.close();
}
process.exit(failed ? 1 : 0);
