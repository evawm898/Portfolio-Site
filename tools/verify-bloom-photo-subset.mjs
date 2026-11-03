#!/usr/bin/env node
/* ===================================================================
   THE PHOTO-SUBSET VALIDATOR (photo-to-bloom S1 — read §7 and §9 of
   docs/bloom-photo-to-bloom-discovery.md, and bloom-file.js's LOAD AS A NEW
   DESIGN block, before touching it).

   Given a SUBSET design file — what route A writes from a photo: a
   `bloom-design` v1 envelope whose `controls` names only some controls — this
   loads it AS A NEW DESIGN on the real page (the page's own `loadAsNew`, the
   function the "Load as new" button calls) and FAILS on any departure from a
   clean load. The acceptance rule is §2.4's, unchanged: a file the feature
   emits must load with ZERO notes.

   EVERY FILE IS LOADED ONTO A DIRTY PAGE. Before the subset, the page is given
   a complete, clean design through the OLD load path that moves ${DIRTY_MIN}+
   controls off their defaults and carries a layer scope, and the run asserts
   that it took (a validity assertion — a clean page would make "the new
   design reset everything" true by accident, and the run aborts rather than
   report). So a load-as-new that kept a leftover is visible.

   THE CLAUSES, per file (each names its owner):
     V0  the file is a design file the page reads (the reader did not REFUSE it
         — a missing envelope, a newer version, not JSON);
     V1  ZERO NOTES on the page's own load record (`__bloomDesign.last()`):
         clamped, snapped, invalid, unknown, retired, migrated, conflict,
         hidden — any one is a fail, named;
     V2  THE READ-BACK, against an owner `readNewDesign` does not write: the
         registry's DEFAULTS with the file's own values on top, compared with
         the page's `readUI()` on EVERY control in its own kind
         (`valuesEqual`). It sees what V1 cannot: a value a page-side listener
         put back silently (the outline's width refusal is one, and it is not
         gated on a trusted event), and a leftover from the dirty page;
     V3  every control the file names SHOWS on the page after the load (its
         wrapper is not hidden) — the page's own applyVisibility, a second owner
         of "hidden" beside the reader's evalPredicate;
     V4  the scopes the page holds are the file's (none when it carries none) —
         the dirty page's layer scope must be gone;
     V5  the status line says the load was clean;
     V6  no page error.

   RUN:  node tools/verify-bloom-photo-subset.mjs <file.json> [...]
           [--wrap]   a file with no `format` (the discovery's dry-run shape,
                      `{ views, controls, frame, frameZ }`) is ALSO validated
                      with its `controls` put in the v1 envelope; the dropped
                      keys are named. The raw file is still validated as it is.
         node tools/verify-bloom-photo-subset.mjs --self
                      the eight written-down fixtures below, each against its
                      expected clause set (CI: spawned by the design-file gate)
         node tools/verify-bloom-photo-subset.mjs --negative-control [--mutant=a,b]
                      the fixtures again under each mutant of bloom.js /
                      bloom-file.js; every mutant must move EXACTLY the
                      (fixture, clause) pairs it names, every anchor checked
                      before any mutant runs
   Needs playwright-core and three@0.161.0 (npm i --no-save). On a container
   whose Chromium lives under chrome-linux64/, set CHROMIUM_EXECUTABLE.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROLS, DEFAULTS, valuesEqual } from '../bloom-registry.js';
import { composeDoc, toText } from '../bloom-file.js';
import { serveRepo, launchPage, openBloom, settleBuild } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const SELF = argv.includes('--self');
const NEGATIVE = argv.includes('--negative-control');
const WRAP = argv.includes('--wrap');
const ONLY = (argv.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);
const FILES = argv.filter((a) => !a.startsWith('--'));
const DIRTY_MIN = 15;
const controlOf = new Map(CONTROLS.map((c) => [c.id, c]));

/* THE DIRTY DESIGN — complete, clean through the old path, far from DEFAULTS. */
const DIRTY_STATE = {
  ...DEFAULTS, petalCount: 13, layerCount: 3, layerSize: 0.6, layerTilt: 20, petalLength: 52, petalWidth: 22,
  petalTilt: 47, petalCup: 0.33, petalTwist: 20, petalSpineCurl: 45, buckleAmp: 0.2, petalTipShape: 1.2,
  spread: 3, headRise: 0.3, stamenCount: 12, gynoecium: 'STYLE', sepalCount: 5, stemLength: 60, scopeLayers: 'ON',
};
const DIRTY_SCOPES = { layers: [{ layer: 1, offsets: { petalTilt: 5 } }], petals: [], tiers: [], strands: [] };
const DIRTY_TEXT = toText(composeDoc(DIRTY_STATE, { savedAt: '2026-11-03T00:00:00.000Z', scopes: DIRTY_SCOPES }));

const ENV = { format: 'bloom-design', version: 1 };
const CLEAN = { petalCount: 12, petalTilt: 40, petalCup: 0.3, layerCount: 2, layerSize: 0.8 };
/* THE FIXTURES, WRITTEN DOWN with the clauses each must fire — never derived
   from the module under test. The three the brief names are OUT_OF_RANGE,
   UNKNOWN_FIELD and HIDDEN_CONTROL; the rest close the obvious neighbours. */
const FIXTURES = [
  { id: 'CLEAN', file: { ...ENV, controls: { ...CLEAN } }, expect: [] },
  { id: 'OUT_OF_RANGE', file: { ...ENV, controls: { ...CLEAN, petalLength: 140 } }, expect: ['V1', 'V2', 'V5'] },
  { id: 'UNKNOWN_FIELD', file: { ...ENV, controls: { ...CLEAN, petalColour: 'red' } }, expect: ['V1', 'V5'] },
  { id: 'HIDDEN_CONTROL', file: { ...ENV, controls: { ...CLEAN, fringeDepth: 0.3 } }, expect: ['V1', 'V2', 'V3', 'V5'] },
  { id: 'HIDDEN_OPTION', file: { ...ENV, controls: { ...CLEAN, petalTexture: 'PEBBLE' } }, expect: ['V1', 'V2', 'V5'] },
  { id: 'OFF_STEP', file: { ...ENV, controls: { ...CLEAN, petalTilt: 40.5 } }, expect: ['V1', 'V2', 'V5'] },
  { id: 'SIDECAR_INSIDE', file: { ...ENV, controls: { ...CLEAN }, confidence: { petalCount: 0.9 } }, expect: ['V1', 'V5'] },
  { id: 'NO_ENVELOPE', file: { views: ['front'], controls: { ...CLEAN }, frame: 1 }, expect: ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'] },   // V3: the dirty page's own layerSize hides under Per-layer values
];

/* THE MUTANTS — each a broken copy of a page module, served to the page only.
   `breaks` is every (fixture:clause) whose verdict the mutation must flip. */
const MUTANTS = [
  {
    id: 'the-new-design-keeps-the-page-value', file: 'bloom.js',
    from: '  selectScope(null);\n  for (const c of CONTROLS) {\n    inputs[c.id].value = r.doc.controls[c.id];',
    to: '  selectScope(null);\n  for (const c of CONTROLS) {\n    if (!r.applied.includes(c.id)) continue;\n    inputs[c.id].value = r.doc.controls[c.id];',
    /* V2 on the fixtures whose V2 did not already fire; V3 wherever the subset
       names layerSize — the dirty page's leftover Per-layer values (ON) hides it */
    breaks: ['CLEAN:V2', 'CLEAN:V3', 'HIDDEN_OPTION:V3', 'OFF_STEP:V3', 'OUT_OF_RANGE:V3', 'SIDECAR_INSIDE:V2', 'SIDECAR_INSIDE:V3', 'UNKNOWN_FIELD:V2', 'UNKNOWN_FIELD:V3'],
  },
  {
    id: 'the-scopes-survive-a-new-design', file: 'bloom.js',
    from: "next[k] = r.doc.overrides[k] || [];", to: "next[k] = (had && had[k]) || [];",
    breaks: ['CLEAN:V4', 'OUT_OF_RANGE:V4', 'UNKNOWN_FIELD:V4', 'HIDDEN_CONTROL:V4', 'HIDDEN_OPTION:V4', 'OFF_STEP:V4', 'SIDECAR_INSIDE:V4'],
  },
  {
    id: 'hidden-controls-are-applied', file: 'bloom-file.js',
    from: '    if (!drop.length) break;', to: '    break;',
    breaks: ['HIDDEN_CONTROL:V1', 'HIDDEN_CONTROL:V2', 'HIDDEN_CONTROL:V5', 'HIDDEN_OPTION:V1', 'HIDDEN_OPTION:V2', 'HIDDEN_OPTION:V5'],
  },
  {
    id: 'a-reader-note-is-dropped', file: 'bloom-file.js',
    from: '  const notes = r.notes.slice();\n  const named', to: '  const notes = [];\n  const named',
    breaks: ['OUT_OF_RANGE:V1', 'OUT_OF_RANGE:V5', 'UNKNOWN_FIELD:V1', 'UNKNOWN_FIELD:V5', 'OFF_STEP:V1', 'OFF_STEP:V5', 'SIDECAR_INSIDE:V1', 'SIDECAR_INSIDE:V5'],
  },
  {
    id: 'the-subset-is-composed-over-the-page', file: 'bloom.js',
    from: '  const r = readNewDesign(obj);', to: '  const r = readNewDesign({ ...obj, controls: { ...readUI(), ...(obj.controls || {}) } });',
    /* rule 3's construction — the obvious wrong implementation: every page
       leftover becomes a NAMED control, so the hidden rule talks (V1/V5 on the
       clean file), the leftovers stay (V2) and the leftover Per-layer values
       hides the named layerSize (V3) */
    breaks: ['CLEAN:V1', 'CLEAN:V2', 'CLEAN:V3', 'CLEAN:V5', 'HIDDEN_OPTION:V3', 'OFF_STEP:V3', 'OUT_OF_RANGE:V3', 'SIDECAR_INSIDE:V2', 'SIDECAR_INSIDE:V3', 'UNKNOWN_FIELD:V2', 'UNKNOWN_FIELD:V3'],
  },
];

function mutate(src, m) {
  const n = src.split(m.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${m.id}: anchor matches ${n} times in ${m.file} (want exactly 1)`);
  return src.replace(m.from, m.to);
}

async function validate(page, port, text, name) {
  const errors = [];
  const onErr = (e) => errors.push(String(e && e.message || e));
  page.on('pageerror', onErr);
  try {
    await openBloom(page, port);
    const d0 = await page.evaluate(([t]) => window.__bloomDesign.load(t, 'dirty.bloom-design.json'), [DIRTY_TEXT]);
    await settleBuild(page, 120000);
    const dirty = await page.evaluate(() => ({ ui: window.__bloomUIState(), scopes: window.__bloomDesign.scopes() }));
    const off = CONTROLS.filter((c) => !valuesEqual(c, dirty.ui[c.id], DEFAULTS[c.id])).length;
    if (d0.action !== 'loaded' || d0.notes.length || off < DIRTY_MIN || !dirty.scopes || !dirty.scopes.layers.length) {
      throw new Error(`HARNESS INVALID: the dirty page did not take (${d0.action}, ${d0.notes.length} notes, ${off} controls off default, scopes ${JSON.stringify(dirty.scopes)})`);
    }
    const rec = await page.evaluate(([t, n]) => window.__bloomDesign.loadAsNew(t, n), [text, name]);
    await settleBuild(page, 120000);
    const after = await page.evaluate(([ids]) => ({
      ui: window.__bloomUIState(), scopes: window.__bloomDesign.scopes(),
      status: document.getElementById('designStatus').textContent,
      hidden: ids.filter((id) => { const el = document.getElementById(id); const w = el && el.closest('.bl-ctrl'); return !w || w.hidden; }),
    }), [(() => { try { const o = JSON.parse(text); return o && o.controls && typeof o.controls === 'object' ? Object.keys(o.controls).filter((k) => controlOf.has(k)) : []; } catch { return []; } })()]);
    let obj = null; try { obj = JSON.parse(text); } catch { /* V0 */ }
    const fired = {};
    if (rec.action !== 'loaded') fired.V0 = rec.error || rec.action;
    if (rec.action !== 'loaded' || (rec.notes || []).length) fired.V1 = rec.action !== 'loaded' ? `nothing loaded` : rec.notes.map((n) => `[${n.kind}] ${n.text}`).join(' | ');
    const want = { ...DEFAULTS, ...(obj && obj.controls && typeof obj.controls === 'object' ? Object.fromEntries(Object.entries(obj.controls).filter(([k]) => controlOf.has(k))) : {}) };
    const diff = CONTROLS.filter((c) => !valuesEqual(c, after.ui[c.id], want[c.id])).map((c) => `${c.id}: page ${JSON.stringify(after.ui[c.id])} vs file-over-defaults ${JSON.stringify(want[c.id])}`);
    if (diff.length) fired.V2 = `${diff.length} control(s): ${diff.slice(0, 6).join('; ')}${diff.length > 6 ? ' …' : ''}`;
    if (after.hidden.length) fired.V3 = `named but not shown: ${after.hidden.join(', ')}`;
    const wantScopes = obj && obj.overrides && typeof obj.overrides === 'object' ? obj.overrides : null;
    const has = (s) => s && ['layers', 'petals', 'tiers', 'strands'].some((k) => Array.isArray(s[k]) && s[k].length);
    const sOk = has(wantScopes) ? JSON.stringify(after.scopes) === JSON.stringify({ layers: [], petals: [], tiers: [], strands: [], ...wantScopes }) : after.scopes === null;
    if (!sOk) fired.V4 = `page scopes ${JSON.stringify(after.scopes)}`;
    if (!/as a NEW design/.test(after.status) || !/every field read clean, nothing to report/.test(after.status)) fired.V5 = after.status.replace(/\s+/g, ' ').slice(0, 300);
    if (errors.length) fired.V6 = errors.join(' | ');
    return { fired, rec, applied: rec.appliedIds || [] };
  } finally { page.off('pageerror', onErr); }
}

async function runFixtures(page, port) {
  const out = {};
  for (const f of FIXTURES) out[f.id] = await validate(page, port, JSON.stringify(f.file), `${f.id}.json`);
  return out;
}
const firedSet = (res) => new Set(Object.entries(res).flatMap(([id, r]) => Object.keys(r.fired).map((k) => `${id}:${k}`)));

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 900, height: 700 } });
let failed = false;
try {
  if (FILES.length) {
    for (const f of FILES) {
      const raw = fs.readFileSync(f, 'utf8');
      const runs = [[path.basename(f), raw]];
      let o = null; try { o = JSON.parse(raw); } catch { /* reported by V0 */ }
      if (WRAP && o && !o.format && o.controls) {
        const dropped = Object.keys(o).filter((k) => k !== 'controls');
        console.log(`  (--wrap: ${path.basename(f)} has no envelope; its controls are also validated as { format, version: 1, controls }, dropping ${dropped.join(', ') || 'nothing'})`);
        runs.push([`${path.basename(f)} [wrapped]`, JSON.stringify({ ...ENV, controls: o.controls })]);
      }
      for (const [name, text] of runs) {
        const r = await validate(page, port, text, name);
        const bad = Object.entries(r.fired);
        console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${name} — ${r.rec.action}${r.rec.action === 'loaded' ? `, ${r.applied.length} of ${r.rec.named} named controls applied, ${r.rec.notes.length} notes` : ''}`);
        for (const [k, why] of bad) console.log(`        ${k}: ${why}`);
        if (bad.length) failed = true;
      }
    }
  }
  if (SELF || NEGATIVE) {
    const base = await runFixtures(page, port);
    for (const f of FIXTURES) {
      const got = Object.keys(base[f.id].fired).sort(), want = [...f.expect].sort();
      const ok = JSON.stringify(got) === JSON.stringify(want);
      console.log(`${ok ? 'ok  ' : 'FAIL'}  fixture ${f.id}: fired [${got.join(' ')}]${ok ? '' : ` — expected [${want.join(' ')}]`}`);
      if (!ok) { failed = true; for (const [k, why] of Object.entries(base[f.id].fired)) console.log(`        ${k}: ${why}`); }
    }
    if (NEGATIVE && !failed) {
      const srcs = Object.fromEntries(['bloom.js', 'bloom-file.js'].map((n) => [n, fs.readFileSync(path.join(ROOT, n), 'utf8')]));
      for (const m of MUTANTS) mutate(srcs[m.file], m);
      console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
      const b0 = firedSet(base);
      for (const m of (ONLY.length ? MUTANTS.filter((x) => ONLY.includes(x.id)) : MUTANTS)) {
        const body = mutate(srcs[m.file], m);
        await page.route(`**/${m.file}`, (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body }));
        const res = await runFixtures(page, port);
        await page.unroute(`**/${m.file}`);
        const b1 = firedSet(res);
        const moved = [...new Set([...b0, ...b1])].filter((x) => b0.has(x) !== b1.has(x)).sort();
        const want = [...m.breaks].sort();
        const ok = moved.length > 0 && JSON.stringify(moved) === JSON.stringify(want);
        console.log(`${ok ? 'ok  ' : 'FAIL'}  mutant ${m.id}: moved [${moved.join(' ')}]${ok ? '' : ` — named [${want.join(' ')}]`}`);
        if (!ok) failed = true;
      }
    }
  }
} finally { await browser.close(); server.close(); }
if (!FILES.length && !SELF && !NEGATIVE) { console.log('nothing to do — give files, --self or --negative-control'); process.exit(2); }
console.log(failed ? '\nPHOTO-SUBSET VALIDATOR: FAIL' : `\nPHOTO-SUBSET VALIDATOR: PASS${NEGATIVE ? ` — every mutant moved exactly the clauses it names` : ''}`);
process.exit(failed ? 1 : 0);
