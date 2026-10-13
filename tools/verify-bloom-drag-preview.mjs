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
const same = (a, b) => !!a && !!b && a.tris === b.tris && a.fnv === b.fnv;
const fmtD = (d) => (d ? `${d.tris} tris #${d.fnv.toString(16)}` : 'none');

async function sliderBox(page) {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  const s = page.locator(`#${SLIDER}`);
  await s.scrollIntoViewIfNeeded();
  return s.boundingBox();
}

/* ---------------- one full run of the clauses ---------------- */
async function runClauses(port, bloomJsOverride = null) {
  const results = [];
  const rec = (id, ok, detail) => results.push({ id, ok, detail });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-drag-'));
  const fresh = async (sets) => {
    const { browser, page } = await launchPage({ viewport: { width: 1400, height: 1000 } });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (bloomJsOverride) await page.route('**/bloom.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: bloomJsOverride }));
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
    const b = await sliderBox(page);
    const x0 = b.x + b.width * 0.3, y = b.y + b.height / 2;
    /* put the thumb under x0 first (a click jumps it there and builds full),
       so the measured drag below can come back to the value it began on */
    await page.mouse.click(x0, y);
    await settleBuild(page);
    const full0 = await fullRef(page);
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
  { id: 'every-input-builds-light', breaks: ['D0', 'D2', 'D3', 'D4', 'D5', 'D6'],
    edits: [['function dragLight() { return dragActive && !infillIsAbsent(readUI()); }', 'function dragLight() { return !infillIsAbsent(readUI()); }']] },
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
];

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
    const want = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
    const missing = want.filter((id) => !res.some((r) => r.id === id));
    if (missing.length) { console.log(`FAIL: clauses that never reported: ${missing.join(', ')}`); failed = true; }
    if (res.some((r) => !r.ok)) failed = true;
    console.log(failed ? '\nDRAG PREVIEW: FAILED' : `\nDRAG PREVIEW: PASS — ${res.length} clauses; what is on screen at rest is the full print geometry after a pointerup, a change, a typed value and the keyboard`);
  } else {
    const src = fs.readFileSync(path.join(ROOT, 'bloom.js'), 'utf8');
    for (const m of MUTANTS) mutate(src, m);   // every anchor, before any mutant runs
    console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
    const base = await runClauses(port);
    if (base.some((r) => !r.ok)) { for (const r of base.filter((x) => !x.ok)) console.log(`BASE FAIL ${r.id}: ${r.detail}`); throw new Error('the clean tree does not pass — the negative control means nothing'); }
    const run = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
    for (const m of run) {
      const res = await runClauses(port, mutate(src, m));
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
