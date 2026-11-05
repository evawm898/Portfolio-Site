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
     V6  no page error;
     V7  (schema v2, S3) EVERY LAYER ENTRY THE FILE NAMES REACHES A PETAL — read
         off the BUILDER's own scope summary (`__bloomMetrics().scopes`), an
         owner the reader does not write: `layersLive` true, `scopedLayers`
         exactly the file's layers, `keptLayers` empty. A layer entry the build
         keeps INERT (Per-layer values left OFF, a CONTINUOUS / FAN placement,
         a layer past the layer count) loads with zero notes — the reader keeps
         an inert record by design — so V1 cannot see it; §2.2's rule 3 (a
         value written where it builds nothing fails) applied to a scope.

   WARNINGS, listed apart from the clauses and NEVER counted in the exit code
   (Eva's ruling 2 of §9.7, Nov 4: the photo schema WARNS, it does not fail).
   Their owner is the photo-readable schema, `SCHEMA` in
   tools/bloom-photo-census.mjs (the 46 rows of §2.1), imported rather than
   restated, so it has no second copy here:
     W1  a registry control the file names that is OFF the photo schema (it
         loads, and V1-V6 judge it, but route A should not be emitting it);
     W2  a schema control whose value is outside the schema's OWN narrowed
         range or values (`varianceSize` / `varianceForm` are half the slider;
         §2.1 says why). A narrowing is a schema statement, so it warns too —
         a reading made without a ruling, one line to drop.
   SCHEMA v2 (S3, Nov 5) — the per-layer rows, `LAYER_SCHEMA` in the census:
     W1  also: a layer entry's offset that the layer does NOT own (a delta on
         the global — petalCup, petalSpineCurl, …), a layer value off the v2
         schema (the outline's — the outline is the next stage), or any
         petal / tier / strand entry;
     W2  also: an OWNED quantity whose effective value (the file's global, or
         the default, plus the layer's offset) lies outside the registry's own
         range — the build clamps it SILENTLY (the reader never sees a sum).
   A name that is not a control at all is V1's (`unknown`), never a warning.

   RUN:  node tools/verify-bloom-photo-subset.mjs <file.json> [...]
           [--wrap]   a file with no `format` (the discovery's dry-run shape,
                      `{ views, controls, frame, frameZ }`) is ALSO validated
                      with its `controls` put in the v1 envelope; the dropped
                      keys are named. The raw file is still validated as it is.
         node tools/verify-bloom-photo-subset.mjs --self
                      the fifteen written-down fixtures below (five added for schema v2, S3), each against its
                      expected clause AND warning sets, then the off-schema
                      fixture through a SPAWNED copy of this validator: it
                      must list W1 and exit 0 (CI: spawned by the design-file
                      gate)
         node tools/verify-bloom-photo-subset.mjs --negative-control [--mutant=a,b]
                      the fixtures again under each mutant of bloom.js /
                      bloom-file.js; every mutant must move EXACTLY the
                      (fixture, clause) pairs it names, every anchor checked
                      before any mutant runs; then two mutants of THIS file
                      (a warning fails the run, the W1 warning is dropped),
                      each of which must break the spawned exit-0 leg
   Needs playwright-core and three@0.161.0 (npm i --no-save). On a container
   whose Chromium lives under chrome-linux64/, set CHROMIUM_EXECUTABLE.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROLS, DEFAULTS, valuesEqual } from '../bloom-registry.js';
import { composeDoc, toText } from '../bloom-file.js';
import { serveRepo, launchPage, openBloom, settleBuild } from './bloom-harness.mjs';
import { SCHEMA, LAYER_SCHEMA } from './bloom-photo-census.mjs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const SELF = argv.includes('--self');
const NEGATIVE = argv.includes('--negative-control');
const WRAP = argv.includes('--wrap');
const ONLY = (argv.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);
const FILES = argv.filter((a) => !a.startsWith('--'));
const DIRTY_MIN = 15;
const controlOf = new Map(CONTROLS.map((c) => [c.id, c]));
const SCHEMA_ROW = new Map(SCHEMA.map((r) => [r.id, r]));

/* W1 / W2 — pure, from the file's own `controls` and the schema; no page. */
function schemaWarnings(obj) {
  const warned = {};
  const named = obj && obj.controls && typeof obj.controls === 'object' ? Object.entries(obj.controls).filter(([k]) => controlOf.has(k)) : [];
  const off = [], out = [];
  for (const [id, v] of named) {
    const row = SCHEMA_ROW.get(id);
    if (!row) { if (id !== LAYER_SCHEMA.switch) off.push(`${id}=${JSON.stringify(v)}`); continue; }
    if (row.range && typeof v === 'number' && (v < row.range[0] || v > row.range[1])) out.push(`${id} ${v} (schema ${row.range[0]}..${row.range[1]})`);
    if (row.values && !row.values.includes(v)) out.push(`${id} ${JSON.stringify(v)} (schema ${row.values.join(' / ')})`);
  }
  /* schema v2: the per-layer switch is on the schema; the per-layer rows */
  const ov = obj && obj.overrides && typeof obj.overrides === 'object' && !Array.isArray(obj.overrides) ? obj.overrides : {};
  const glob = (id) => (obj.controls && id in obj.controls ? obj.controls[id] : DEFAULTS[id]);
  (Array.isArray(ov.layers) ? ov.layers : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return;
    for (const [id, d] of Object.entries(e.offsets || {})) {
      if (!LAYER_SCHEMA.offsets.includes(id)) { off.push(`layers[${i}].offsets.${id}=${JSON.stringify(d)} (a delta on the global — a layer does not own it)`); continue; }
      const c = controlOf.get(id), eff = Number(glob(id)) + d;
      if (c && typeof d === 'number' && (eff < c.min || eff > c.max)) out.push(`layers[${i}] owns ${id} ${glob(id)} + ${d} = ${eff} (registry ${c.min}..${c.max}: clamped silently by the build)`);
    }
    for (const id of Object.keys(e.values || {})) if (!LAYER_SCHEMA.values.includes(id)) off.push(`layers[${i}].values.${id} (not a per-layer value in schema v2)`);
  });
  for (const k of ['petals', 'tiers', 'strands']) if (Array.isArray(ov[k]) && ov[k].length) off.push(`overrides.${k} (${ov[k].length} entr${ov[k].length === 1 ? 'y' : 'ies'} — schema v2 writes layer entries only)`);
  if (off.length) warned.W1 = `off the photo schema: ${off.join(', ')}`;
  if (out.length) warned.W2 = `outside the photo schema's own range: ${out.join(', ')}`;
  return warned;
}

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
const SCOPED = { petalCount: 12, petalTilt: 40, petalCup: 0.3, layerCount: 2, scopeLayers: 'ON' };
/* THE FIXTURES, WRITTEN DOWN with the clauses each must fire and the warnings
   each must list (`warn`, default none) — never derived from the module under
   test. The three the brief names are OUT_OF_RANGE, UNKNOWN_FIELD and
   HIDDEN_CONTROL; the rest close the obvious neighbours. OFF_SCHEMA is the
   dry-run's own case (`antherElongation`, which tulip-v2 and daisy-v2 carry):
   it loads clean and only warns. */
const FIXTURES = [
  { id: 'CLEAN', file: { ...ENV, controls: { ...CLEAN } }, expect: [] },
  { id: 'OUT_OF_RANGE', file: { ...ENV, controls: { ...CLEAN, petalLength: 140 } }, expect: ['V1', 'V2', 'V5'] },
  { id: 'UNKNOWN_FIELD', file: { ...ENV, controls: { ...CLEAN, petalColour: 'red' } }, expect: ['V1', 'V5'] },
  { id: 'HIDDEN_CONTROL', file: { ...ENV, controls: { ...CLEAN, fringeDepth: 0.3 } }, expect: ['V1', 'V2', 'V3', 'V5'] },
  { id: 'HIDDEN_OPTION', file: { ...ENV, controls: { ...CLEAN, petalTexture: 'PEBBLE' } }, expect: ['V1', 'V2', 'V5'], warn: ['W1'] },
  { id: 'OFF_STEP', file: { ...ENV, controls: { ...CLEAN, petalTilt: 40.5 } }, expect: ['V1', 'V2', 'V5'] },
  { id: 'SIDECAR_INSIDE', file: { ...ENV, controls: { ...CLEAN }, confidence: { petalCount: 0.9 } }, expect: ['V1', 'V5'] },
  { id: 'OFF_SCHEMA', file: { ...ENV, controls: { ...CLEAN, stamenCount: 6, antherElongation: 4 } }, expect: [], warn: ['W1'] },
  { id: 'SCHEMA_RANGE', file: { ...ENV, controls: { ...CLEAN, varianceSize: 0.4 } }, expect: [], warn: ['W2'] },
  /* SCHEMA v2 (S3): an INTENDED per-layer scope must load clean — onto the dirty
     page, whose own leftover layer entry (layer 1, petalTilt +5) V4 must not
     see survive. `layerSize` / `layerTilt` are not named: they HIDE while
     Per-layer values is live (the registry), so a scoped subset owns each
     layer's length and tilt instead. */
  { id: 'SCOPED_RADIAL', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10 } }, { layer: 1, offsets: { petalLength: 6, petalTilt: 15 } }] } }, expect: [] },
  { id: 'SCOPED_SPIRAL', file: { ...ENV, controls: { ...SCOPED, placement: 'SPIRAL' }, overrides: { layers: [{ layer: 0, offsets: { petalWidth: 4 } }, { layer: 1, offsets: { petalTilt: 20 }, values: { petalCurlMode: 'CURVE', petalSpineCurve: { mode: 'single', points: [[0, 0], [0.5, 0.15], [0.9, 0.5]] } } }] } }, expect: [] },
  /* a layer offset the layer does not OWN loads clean and only warns */
  { id: 'SCOPED_DELTA', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10, petalCup: 0.2 } }] } }, expect: [], warn: ['W1'] },
  /* an owned sum past the registry range loads clean (the build clamps it) and warns */
  { id: 'SCOPED_OWNED_RANGE', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalLength: 90 } }] } }, expect: [], warn: ['W2'] },
  /* layer entries with Per-layer values left OFF: zero notes, nothing built — V7 */
  { id: 'SCOPED_INERT', file: { ...ENV, controls: { ...CLEAN }, overrides: { layers: [{ layer: 1, offsets: { petalLength: 6 } }] } }, expect: ['V7'] },
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
    breaks: ['CLEAN:V2', 'CLEAN:V3', 'HIDDEN_OPTION:V3', 'OFF_SCHEMA:V2', 'OFF_SCHEMA:V3', 'OFF_STEP:V3', 'OUT_OF_RANGE:V3', 'SCHEMA_RANGE:V2', 'SCHEMA_RANGE:V3', 'SIDECAR_INSIDE:V2', 'SIDECAR_INSIDE:V3', 'UNKNOWN_FIELD:V2', 'UNKNOWN_FIELD:V3',
      /* S3: every scoped fixture's read-back (V2); and on SCOPED_INERT the
         dirty page's leftover Per-layer ON makes the file's inert entry LIVE,
         so V7 STOPS firing there while V2/V3 see the leftover */
      'SCOPED_RADIAL:V2', 'SCOPED_SPIRAL:V2', 'SCOPED_DELTA:V2', 'SCOPED_OWNED_RANGE:V2', 'SCOPED_INERT:V2', 'SCOPED_INERT:V3', 'SCOPED_INERT:V7'],
  },
  {
    id: 'the-scopes-survive-a-new-design', file: 'bloom.js',
    from: "next[k] = r.doc.overrides[k] || [];", to: "next[k] = (had && had[k]) || [];",
    breaks: ['CLEAN:V4', 'OUT_OF_RANGE:V4', 'UNKNOWN_FIELD:V4', 'HIDDEN_CONTROL:V4', 'HIDDEN_OPTION:V4', 'OFF_STEP:V4', 'SIDECAR_INSIDE:V4', 'OFF_SCHEMA:V4', 'SCHEMA_RANGE:V4',
      /* S3: a scoped file's own layers are REPLACED by the leftover (layer 1) —
         V4 always, V7 wherever the file's layer set is not [1] */
      'SCOPED_RADIAL:V4', 'SCOPED_RADIAL:V7', 'SCOPED_SPIRAL:V4', 'SCOPED_SPIRAL:V7', 'SCOPED_DELTA:V4', 'SCOPED_DELTA:V7', 'SCOPED_OWNED_RANGE:V4', 'SCOPED_INERT:V4'],
  },
  {
    /* S3: the page MERGES the leftover scope into the file's — the plausible
       wrong reading of "take the file's scopes" once a file carries some */
    id: 'the-leftover-scope-is-merged-into-the-file', file: 'bloom.js',
    from: "next[k] = r.doc.overrides[k] || [];", to: "next[k] = [...((had && had[k]) || []), ...(r.doc.overrides[k] || [])];",
    /* V4 on every fixture — scoped or not, the dirty page's layer-1 entry
       survives; and V7 on SCOPED_DELTA, whose own layers are [0]: the leftover
       adds layer 1, so the BUILDER's scoped layers stop being the file's */
    breaks: ['CLEAN:V4', 'HIDDEN_CONTROL:V4', 'HIDDEN_OPTION:V4', 'OFF_SCHEMA:V4', 'OFF_STEP:V4', 'OUT_OF_RANGE:V4', 'SCHEMA_RANGE:V4', 'SCOPED_DELTA:V4', 'SCOPED_DELTA:V7', 'SCOPED_INERT:V4', 'SCOPED_OWNED_RANGE:V4', 'SCOPED_RADIAL:V4', 'SCOPED_SPIRAL:V4', 'SIDECAR_INSIDE:V4', 'UNKNOWN_FIELD:V4'],
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
    breaks: ['CLEAN:V1', 'CLEAN:V2', 'CLEAN:V3', 'CLEAN:V5', 'HIDDEN_OPTION:V3', 'OFF_SCHEMA:V1', 'OFF_SCHEMA:V2', 'OFF_SCHEMA:V3', 'OFF_SCHEMA:V5', 'OFF_STEP:V3', 'OUT_OF_RANGE:V3', 'SCHEMA_RANGE:V1', 'SCHEMA_RANGE:V2', 'SCHEMA_RANGE:V3', 'SCHEMA_RANGE:V5', 'SIDECAR_INSIDE:V2', 'SIDECAR_INSIDE:V3', 'UNKNOWN_FIELD:V2', 'UNKNOWN_FIELD:V3',
      /* S3: the leftovers named on every scoped file talk (V1/V5: the dirty
         page's layerSize / layerTilt are hidden under the file's own Per-layer
         values) and stay (V2); SCOPED_INERT inherits the leftover's ON, so its
         V7 stops firing and its CLEAN-like V3 fires */
      'SCOPED_RADIAL:V1', 'SCOPED_RADIAL:V2', 'SCOPED_RADIAL:V5', 'SCOPED_SPIRAL:V1', 'SCOPED_SPIRAL:V2', 'SCOPED_SPIRAL:V5', 'SCOPED_DELTA:V1', 'SCOPED_DELTA:V2', 'SCOPED_DELTA:V5',
      'SCOPED_OWNED_RANGE:V1', 'SCOPED_OWNED_RANGE:V2', 'SCOPED_OWNED_RANGE:V5', 'SCOPED_INERT:V1', 'SCOPED_INERT:V2', 'SCOPED_INERT:V3', 'SCOPED_INERT:V5', 'SCOPED_INERT:V7'],
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
      ui: window.__bloomUIState(), scopes: window.__bloomDesign.scopes(), built: (window.__bloomMetrics() || {}).scopes || null,
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
    const fileLayers = obj && obj.overrides && Array.isArray(obj.overrides.layers)
      ? [...new Set(obj.overrides.layers.filter((e) => e && (Object.keys(e.offsets || {}).length + Object.keys(e.values || {}).length)).map((e) => e.layer))].sort((a, b) => a - b) : [];
    if (fileLayers.length) {
      const b = after.built;
      if (!b || !b.layersLive || JSON.stringify(b.scopedLayers) !== JSON.stringify(fileLayers) || (b.keptLayers || []).length) {
        fired.V7 = `the file's layers [${fileLayers}] — the build ${b ? `layersLive ${b.layersLive}, scoped [${b.scopedLayers}], kept INERT [${b.keptLayers}]` : 'reports no scopes'}`;
      }
    }
    return { fired, warned: schemaWarnings(obj), rec, applied: rec.appliedIds || [] };
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
let warnCount = 0;
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
        const warns = Object.entries(r.warned);
        console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${name} — ${r.rec.action}${r.rec.action === 'loaded' ? `, ${r.applied.length} of ${r.rec.named} named controls applied, ${r.rec.notes.length} notes` : ''}${warns.length ? `, ${warns.length} warning(s)` : ''}`);
        for (const [k, why] of bad) console.log(`        ${k}: ${why}`);
        for (const [k, why] of warns) console.log(`        warn ${k}: ${why}`);
        warnCount += warns.length;
        if (bad.length) failed = true;
      }
    }
  }
  if (SELF || NEGATIVE) {
    const base = await runFixtures(page, port);
    for (const f of FIXTURES) {
      const got = Object.keys(base[f.id].fired).sort(), want = [...f.expect].sort();
      const gotW = Object.keys(base[f.id].warned).sort(), wantW = [...(f.warn || [])].sort();
      const ok = JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(gotW) === JSON.stringify(wantW);
      console.log(`${ok ? 'ok  ' : 'FAIL'}  fixture ${f.id}: fired [${got.join(' ')}] warned [${gotW.join(' ')}]${ok ? '' : ` — expected [${want.join(' ')}] warned [${wantW.join(' ')}]`}`);
      if (!ok) for (const [k, why] of Object.entries(base[f.id].warned)) console.log(`        warn ${k}: ${why}`);
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

/* THE EXIT-CODE LEG (ruling 2): the OFF_SCHEMA fixture, written to a file and
   handed to a SPAWNED copy of this validator, must list W1 and exit 0 — the
   exit code is the claim, and only a separate process can show it. Under
   --negative-control two mutants of THIS file must each break the leg. */
const SELF_MUTANTS = [
  /* anchors joined from pieces so the definitions below do not match themselves */
  { id: 'a-warning-fails-the-run', from: ['        if (bad.length)', ' failed = true;'].join(''), to: '        if (bad.length || warns.length) failed = true;', breaks: 'the exit code' },
  { id: 'the-off-schema-warning-is-dropped', from: ['    if (!row) { if (id !== LAYER_SCHEMA.switch)', ' off.push('].join(''), to: '    if (!row) { if (0) off.push(', breaks: 'the W1 line' },
];
function exitLeg(script) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-subset-'));
  const file = path.join(dir, 'off-schema.subset.bloom-design.json');
  fs.writeFileSync(file, JSON.stringify(FIXTURES.find((f) => f.id === 'OFF_SCHEMA').file));
  const r = spawnSync(process.execPath, [script, file], { encoding: 'utf8', env: process.env });
  fs.rmSync(dir, { recursive: true, force: true });
  const out = (r.stdout || '') + (r.stderr || '');
  return { status: r.status, w1: /^\s+warn W1: off the photo schema: antherElongation=4$/m.test(out), pass: /^PASS  off-schema/m.test(out), out };
}
if (SELF || NEGATIVE) {
  const me = fileURLToPath(import.meta.url);
  const leg = exitLeg(me);
  const legOk = leg.status === 0 && leg.w1 && leg.pass;
  console.log(`${legOk ? 'ok  ' : 'FAIL'}  exit-code leg: the off-schema file PASSES, lists W1 and exits ${leg.status}${legOk ? '' : `\n${leg.out.split('\n').map((l) => '        ' + l).join('\n')}`}`);
  if (!legOk) failed = true;
  if (NEGATIVE && legOk && (!ONLY.length || SELF_MUTANTS.some((m) => ONLY.includes(m.id)))) {
    const src = fs.readFileSync(me, 'utf8');
    for (const m of SELF_MUTANTS) mutate(src, { ...m, file: path.basename(me) });
    console.log(`anchors: both validator mutants match exactly once`);
    for (const m of SELF_MUTANTS.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
      const copy = path.join(path.dirname(me), `.photo-subset-mutant-${m.id}.mjs`);
      fs.writeFileSync(copy, mutate(src, { ...m, file: path.basename(me) }));
      let r; try { r = exitLeg(copy); } finally { fs.rmSync(copy, { force: true }); }
      const broke = !(r.status === 0 && r.w1 && r.pass);
      console.log(`${broke ? 'ok  ' : 'FAIL'}  validator mutant ${m.id}: the leg ${broke ? `broke (exit ${r.status}, W1 ${r.w1 ? 'listed' : 'absent'})` : 'still passed'} — breaks ${m.breaks}`);
      if (!broke) failed = true;
    }
  }
}
if (!FILES.length && !SELF && !NEGATIVE) { console.log('nothing to do — give files, --self or --negative-control'); process.exit(2); }
if (warnCount) console.log(`\n${warnCount} warning(s) — listed apart from the clauses; warnings do not change the exit code`);
console.log(failed ? '\nPHOTO-SUBSET VALIDATOR: FAIL' : `\nPHOTO-SUBSET VALIDATOR: PASS${NEGATIVE ? ` — every mutant moved exactly the clauses it names` : ''}`);
process.exit(failed ? 1 : 0);
