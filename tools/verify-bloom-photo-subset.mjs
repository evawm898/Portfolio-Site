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
   SCHEMA v3 (S4, Nov 5) — the outline rows (global petal + sepal outline
   mode and curve; the outline as a LAYER value): W1 no longer fires on a
   layer outline value, and
     W2  also: a petal or sepal OUTLINE POINT THE BUILD LIFTS to the print floor
         (`outlineCurvePlan`'s own `lifted` record, read off a NODE build of the
         composed state with the file's scopes — the page's metrics do not
         expose it). The file loads clean and the build draws a different
         curve, told only on the read-out.
   SCHEMA v2 (S3, Nov 5) — the per-layer rows, `LAYER_SCHEMA` in the census:
     W1  also: a layer entry's offset that the layer does NOT own (a delta on
         the global — petalCup, petalSpineCurl, …), a layer value off the v2
         schema (the outline's — the outline is the next stage), or any
         petal / tier / strand entry;
     W2  also: an OWNED quantity whose effective value (the file's global, or
         the default, plus the layer's offset) lies outside the registry's own
         range — the build clamps it SILENTLY (the reader never sees a sum).
   SCHEMA v4 (S5, Nov 5) — per-layer CUP and SPINE CURL, `LAYER_SCHEMA.deltas`:
     DELTAS on the global, never owned. W1 no longer fires on them; every other
     delta still does.
     W2  also: a delta whose effective value (global + offset) leaves the
         registry range — clamped silently by the build, as an owned sum is.
     W3  (RETIRED by Eva's ruling of Nov 5 — now the failing clause V8) a
         schema value the BUILD makes INERT.
     TOLD (not a clause, not a warning): what the page's READ-OUT says it
         clamped — CUP CLAMPED (the section's fold clamp) and FOLD LIMIT (the
         spine's). No reader note carries either. Printed, pinned by the
         fixtures, never decides the exit.
   EVA'S RULINGS ON §14.7 (Nov 5):
     V8  (a CLAUSE — it was W3) a spine-curl delta on a layer whose petals are
         drawn on a CURVE spine (the layer's own curl mode, else the whole
         bloom's): curl mode CURVE reads no slider curl, so the value builds
         nothing — rule 3, as V7 holds for an inert entry. Pure, from the file.
     W4  the fold clamp binds AWAY FROM THE PETAL TIP. The tip is the NIB, the
         region the geometry itself gives (`tipCap.apex`: from where the drawn
         outline passes the law's crossing of the print floor). Read off a
         NODE build of the composed state in both modes, per petal and sepal,
         from the part's own clamp record: a clamp is tip-only when its
         reported (worst) station is on the nib AND its reported row count is
         no more than the part's emitted nib stations; anything else warns
         (`clampLocated` says why the count is needed). A tip-only clamp stays
         TOLD and never changes the result. A warning: exit 0.
   SCHEMA v5 (S6, Nov 7) — a layer's OWN RING (#495 option A), `LAYER_SCHEMA.ring`:
     `values.layerRing` on a layer entry, a fraction of the hub ring that
     replaces the derived ring. W1 no longer fires on it.
     V9  (a CLAUSE) every ring the file names on a layer the build reaches is
         the ring footRing() BUILT — `__bloomMetrics().rings[i].ownRing`, an
         owner the reader does not write: asked = the file's number, built =
         that number clamped to LAYER_RING_RANGE; and no ring is owned that
         the file does not name. V4 cannot see a page that keeps the ring in
         its scopes and builds without it (`the-build-drops-the-layer-ring`).
     W2  also: a ring outside LAYER_RING_RANGE (the reader tells it as a
         clamp, V1; this says so from the file alone).
     TOLD also: HUB GROWN — a ring past 1 grows the hub (Oct 16), on the read-out.
   NOT BUILT, by the same ruling: a self-intersection check.
   A name that is not a control at all is V1's (`unknown`), never a warning.

   RUN:  node tools/verify-bloom-photo-subset.mjs <file.json> [...]
           [--wrap]   a file with no `format` (the discovery's dry-run shape,
                      `{ views, controls, frame, frameZ }`) is ALSO validated
                      with its `controls` put in the v1 envelope; the dropped
                      keys are named. The raw file is still validated as it is.
         node tools/verify-bloom-photo-subset.mjs --self
                      the thirty-two written-down fixtures below (five added for schema v2, S3; six for v3, S4; five for v4, S5; one for the CUP CLAMPED ruling; five for v5, S6), each against its
                      expected clause, warning AND told sets, then two fixtures
                      through a SPAWNED copy of this validator: the off-schema
                      one must list W1 and exit 0, the away-from-tip clamp W4
                      and exit 0 (CI: spawned by the design-file gate)
         node tools/verify-bloom-photo-subset.mjs --self --save <base.json>
                      as --self, and writes the fixtures' fired / warned sets with
                      the sha256 of every file that decides them
         node tools/verify-bloom-photo-subset.mjs --negative-control [--mutant=a,b] [--base <base.json>]
                      --base reuses a saved base instead of re-running it (one
                      mutant then fits a foreground run); it REFUSES a base whose
                      recorded hashes are not this tree's
                      the fixtures again under each mutant of bloom.js /
                      bloom-file.js; every mutant must move EXACTLY the
                      (fixture, clause) pairs it names, every anchor checked
                      before any mutant runs; then three mutants of THIS file
                      (a warning fails the run, the W1 warning is dropped,
                      the clamp located by its worst station alone), each of
                      which must break exactly the spawned exit-0 legs it names
   Needs playwright-core and three@0.161.0 (npm i --no-save). On a container
   whose Chromium lives under chrome-linux64/, set CHROMIUM_EXECUTABLE.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROLS, DEFAULTS, valuesEqual } from '../bloom-registry.js';
import { composeDoc, toText, readNewDesign, scopesForBuild } from '../bloom-file.js';
import * as G from '../bloom-geometry.js';
import crypto from 'node:crypto';
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
const optVal = (k) => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const SAVE = optVal('--save'), BASE_FILE = optVal('--base');
const FILES = argv.filter((a) => !a.startsWith('--'));
const DIRTY_MIN = 15;
const TOLD_KEYS = ['CUP CLAMPED', 'FOLD LIMIT', 'HUB GROWN'];
const controlOf = new Map(CONTROLS.map((c) => [c.id, c]));
const SCHEMA_ROW = new Map(SCHEMA.map((r) => [r.id, r]));

/* THE BUILD'S OWN LIFTS (schema v3) — a NODE export build of the composed
   state with the file's scopes; every petal's and sepal's outline plan
   (`tipCap.outline`, both halves on a two-sided curve), deduplicated by what
   it says. Empty on a LAW bloom and on a file the reader refuses. */
function outlineLifts(obj) {
  if (!obj || !obj.controls || typeof obj.controls !== 'object') return [];
  const touches = ['petalOutlineMode', 'sepalOutlineMode'].some((k) => obj.controls[k] === 'CURVE')
    || (((obj.overrides || {}).layers) || []).some((e) => e && e.values && e.values.petalOutlineMode === 'CURVE');
  if (!touches) return [];
  const r = readNewDesign(obj);
  if (!r.ok) return [];
  const acc = new G.MeshBuilder({ exportMode: true });
  const b = G.buildBloomInto(acc, r.doc.controls, { below: null, scopes: scopesForBuild(r.doc.overrides) });
  const seen = new Set();
  const plans = (who, o) => (o ? (o.sides ? [[`${who} left`, o.sides.left], [`${who} right`, o.sides.right]] : [[who, o]]) : []);
  const recs = [...(b.petalsAll || []).filter(Boolean).flatMap((p) => plans(`petal (layer ${p.whorl ?? '?'})`, p.tipCap && p.tipCap.outline)),
    ...(((b.sepals || {}).built) || []).filter(Boolean).flatMap((p) => plans('sepal', p.tipCap && p.tipCap.outline))];
  for (const [who, o] of recs) for (const f of o.lifted || []) {
    if (f.why === 'the last point is held at 0') continue;
    seen.add(`${who} point ${f.point} ${f.askedMm.toFixed(2)} -> ${f.builtMm.toFixed(2)} mm`);
  }
  return [...seen];
}
/* THE FOLD CLAMP, LOCATED (Eva's ruling of Nov 5 on §14.7 2) — a NODE build of
   the composed state with the file's scopes, in BOTH modes, read off every
   petal's and sepal's OWN clamp record (`form.cupClamp`, the record the page's
   CUP CLAMPED line is printed from) against that part's OWN NIB (the builder's
   declared plan, `tipCap.apex`: the nib starts where the drawn outline passes
   `xLawMm`, the law's crossing of the print floor — `apexNibPlan`'s own
   `halfAt` test, x = u * drawnLength > xLawMm).

   THE TIP IS THE NIB. The geometry gives that region; no constant is typed.
   A clamp is TIP-ONLY when BOTH hold for every clamped part:
     (a) its reported station (the worst — the smallest radius asked) lies on
         the nib, and
     (b) its reported ROW COUNT is no more than the part's emitted stations on
         the nib (summed over both halves of a two-sided outline, whose clamp
         counts a row once per half).
   (b) is what makes (a) honest. On the nib the cup is scaled with the
   half-width (`cupScale = hb / TIP_HALF_MM`), so the radius it asks is the
   same at every nib station and no larger than anywhere off it — the worst
   station is ON the nib whenever the nib binds, whatever else binds. Measured
   on the default petal: cup 1.0 binds 8 rows against 7 nib stations, worst u
   0.9995 (on the nib), so (a) alone calls a clamp that also binds above the
   nib tip-only. The residual exposure (a cup gradient that drops the cup
   across the nib's own last millimetre, so some nib stations stop binding
   while an off-nib one binds) is stated, not closed.
   A part with NO nib (a squared terminal holds the outline above the floor)
   has no tip region: any clamp there is away from it.
   VALIDITY: a part whose clamp counts more rows than it emitted stations
   (x halves) means the record counts something other than emitted rows, and
   the run aborts rather than classify on it. */
function clampLocated(obj) {
  if (!obj || !obj.controls || typeof obj.controls !== 'object') return { away: [], tip: 0 };
  const r = readNewDesign(obj);
  if (!r.ok) return { away: [], tip: 0 };
  const away = new Set(); let tip = 0;
  for (const exportMode of [false, true]) {
    const acc = new G.MeshBuilder({ exportMode });
    const b = G.buildBloomInto(acc, r.doc.controls, { below: null, scopes: scopesForBuild(r.doc.overrides) });
    const parts = [...(b.petalsAll || []).filter(Boolean).map((p) => [`petal (layer ${p.whorl ?? '?'})`, p]),
      ...(((b.sepals || {}).built) || []).filter(Boolean).map((p) => ['sepal', p])];
    for (const [who, p] of parts) {
      const cc = p.form && p.form.cupClamp;
      if (!cc) continue;
      const tc = p.tipCap || {};
      const caps = tc.twoSided ? [tc.sides.left, tc.sides.right] : [tc];
      const stations = p.profileU || [];
      if (cc.rows > stations.length * caps.length) throw new Error(`HARNESS INVALID: ${who}'s fold clamp counts ${cc.rows} rows against ${stations.length * caps.length} emitted (stations x halves) — the record is not counting emitted rows`);
      const nibs = caps.map((c) => (c && c.apex && c.apex.active ? c.apex : null));
      const onNib = (u, a) => a !== null && u * a.drawnLengthMm > a.xLawMm;
      const nibRows = nibs.reduce((n, a) => n + stations.filter((u) => onNib(u, a)).length, 0);
      const worstOn = nibs.some((a) => onNib(cc.u, a));
      if (worstOn && cc.rows <= nibRows) { tip++; continue; }
      const from = nibs.filter(Boolean).map((a) => (a.xLawMm / a.drawnLengthMm).toFixed(4));
      /* HOW FAR BELOW THE NIB, INFERRED and labelled so: the record keeps the
         worst station and a count, not every station. Where the half-width
         falls monotonically into the nib the extra rows are the stations
         nearest it, so the clamp reaches the k-th emitted station below the
         nib's first. Per half on a two-sided outline (the halves share
         stations), so k is halved there. */
      const below = Math.ceil((cc.rows - nibRows) / caps.length);
      const firstNib = stations.findIndex((u) => nibs.some((a) => onNib(u, a)));
      const reachI = firstNib < 0 ? stations.length - below : firstNib - below;
      const reachU = reachI >= 0 && reachI < stations.length ? stations[reachI] : null;
      const lenMm = (caps[0] && caps[0].apex && caps[0].apex.drawnLengthMm) || null;
      const reach = reachU === null ? '' : `, reaching (inferred) the ${below} station${below === 1 ? '' : 's'} below the nib, down to u ${reachU.toFixed(4)}${lenMm ? ` — ${((1 - reachU) * lenMm).toFixed(2)} mm from the tip` : ''}`;
      away.add(`${who}: ${cc.rows} row${cc.rows === 1 ? '' : 's'} clamped against ${nibRows} nib station${nibRows === 1 ? '' : 's'} (${from.length ? `nib from u ${[...new Set(from)].join(' / ')}` : 'no nib — a squared terminal'})${reach}; worst at u ${cc.u.toFixed(4)}, asked radius ${cc.askedRadiusMm.toFixed(3)} mm, drawn ${cc.drawnRadiusMm.toFixed(3)} (${exportMode ? 'export' : 'live'})`);
    }
  }
  return { away: [...away], tip };
}
/* W1 / W2 / W4 and V8 — pure, from the file's own `controls`, its scopes and
   the schema; no page. V8 is a CLAUSE computed here because it needs no page
   (rule 3's inert value — it was W3 before Eva's ruling of Nov 5). */
function schemaWarnings(obj) {
  const warned = {};
  const named = obj && obj.controls && typeof obj.controls === 'object' ? Object.entries(obj.controls).filter(([k]) => controlOf.has(k)) : [];
  const off = [], out = [], inert = [];
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
      const delta = LAYER_SCHEMA.deltas.includes(id);
      if (!LAYER_SCHEMA.offsets.includes(id) && !delta) { off.push(`layers[${i}].offsets.${id}=${JSON.stringify(d)} (a delta on the global off the schema — v4 admits ${LAYER_SCHEMA.deltas.join(' / ')} only)`); continue; }
      const c = controlOf.get(id), eff = Number(glob(id)) + d;
      if (c && typeof d === 'number' && (eff < c.min || eff > c.max)) out.push(`layers[${i}] ${delta ? 'nudges' : 'owns'} ${id} ${glob(id)} + ${d} = ${eff} (registry ${c.min}..${c.max}: clamped silently by the build)`);
      /* schema v4: a spine-curl DELTA on a layer whose petals are drawn on a
         CURVE spine (the layer's own value, else the whole bloom's mode) is
         INERT there — curl mode CURVE reads no slider curl */
      const mode = e.values && 'petalCurlMode' in e.values ? e.values.petalCurlMode : glob('petalCurlMode');
      if (id === 'petalSpineCurl' && mode === 'CURVE') inert.push(`layers[${i}].offsets.petalSpineCurl=${JSON.stringify(d)} (the layer's petals are drawn on a CURVE spine, which reads no slider curl)`);
    }
    for (const id of Object.keys(e.values || {})) if (!LAYER_SCHEMA.values.includes(id) && !LAYER_SCHEMA.ring.includes(id)) off.push(`layers[${i}].values.${id} (not a per-layer value in schema v5)`);
    /* schema v5: a ring past LAYER_RING_RANGE is clamped by the build — the reader tells it
       (V1), and this says so from the file alone, a second owner beside the reader's note */
    for (const id of LAYER_SCHEMA.ring) if (e.values && id in e.values && typeof e.values[id] === 'number' && (e.values[id] < G.LAYER_RING_RANGE[0] || e.values[id] > G.LAYER_RING_RANGE[1])) out.push(`layers[${i}] owns ${id} ${e.values[id]} (range ${G.LAYER_RING_RANGE[0]}..${G.LAYER_RING_RANGE[1]}: built at the nearest end)`);
  });
  /* schema v3: a petal or sepal outline point the BUILD lifts to the floor */
  const lifted = outlineLifts(obj);
  if (lifted.length) out.push(`outline point(s) LIFTED to the print floor by the build: ${lifted.join('; ')}`);
  for (const k of ['petals', 'tiers', 'strands']) if (Array.isArray(ov[k]) && ov[k].length) off.push(`overrides.${k} (${ov[k].length} entr${ov[k].length === 1 ? 'y' : 'ies'} — schema v2 writes layer entries only)`);
  if (off.length) warned.W1 = `off the photo schema: ${off.join(', ')}`;
  if (out.length) warned.W2 = `outside the photo schema's own range: ${out.join(', ')}`;
  /* Eva's ruling (Nov 5): W3 becomes a FAIL — clause V8 */
  const fired = {};
  if (inert.length) fired.V8 = `a schema value the build makes INERT: ${inert.join(', ')}`;
  /* Eva's ruling (Nov 5): CUP CLAMPED warns only AWAY from the tip */
  const cl = clampLocated(obj);
  if (cl.away.length) warned.W4 = `the fold clamp binds AWAY from the petal tip (the nib): ${cl.away.join('; ')}`;
  return { warned, fired };
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
/* schema v3's curves — written down, never read from the geometry's defaults */
const OUTLINE_STRAP = { mode: 'symmetric', points: [[0, 0.06], [0.15, 0.17], [0.5, 0.2], [0.85, 0.19], [0.96, 0.12], [1, 0]] };
const OUTLINE_ASYM = { mode: 'two-sided', points: [[0, 0.05], [0.4, 0.2], [0.9, 0.09], [1, 0]], right: [[0, 0.05], [0.3, 0.16], [0.8, 0.12], [1, 0]] };
const OUTLINE_NARROW = { mode: 'symmetric', points: [[0, 0.04], [0.3, 0.07], [0.7, 0.06], [0.92, 0.04], [1, 0]] };
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
  /* (S5: petalTwist, since schema v4 puts petalCup ON the schema as a delta row) */
  { id: 'SCOPED_DELTA', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10, petalTwist: 10 } }] } }, expect: [], warn: ['W1'] },
  /* an owned sum past the registry range loads clean (the build clamps it) and warns */
  { id: 'SCOPED_OWNED_RANGE', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalLength: 90 } }] } }, expect: [], warn: ['W2'] },
  /* layer entries with Per-layer values left OFF: zero notes, nothing built — V7 */
  { id: 'SCOPED_INERT', file: { ...ENV, controls: { ...CLEAN }, overrides: { layers: [{ layer: 1, offsets: { petalLength: 6 } }] } }, expect: ['V7'] },
  /* SCHEMA v3 (S4): the OUTLINE. An intended curve passes (global, and per
     layer two-sided); a curve written with outline mode off is HIDDEN; lobes /
     fringe written under CURVE are HIDDEN; a curve point under the print floor
     loads clean, is LIFTED by the build and warns W2. */
  { id: 'OUTLINE_CURVE', file: { ...ENV, controls: { ...CLEAN, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_STRAP } }, expect: [] },
  { id: 'OUTLINE_LAYER', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10 } }, { layer: 1, offsets: { petalLength: 0, petalTilt: 15 }, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_ASYM } }] } }, expect: [] },
  { id: 'OUTLINE_MODE_OFF', file: { ...ENV, controls: { ...CLEAN, petalOutlineCurve: OUTLINE_STRAP } }, expect: ['V1', 'V2', 'V3', 'V5'] },
  { id: 'LOBES_UNDER_CURVE', file: { ...ENV, controls: { ...CLEAN, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_STRAP, lobeDepth: 0.3, fringeCount: 3 } }, expect: ['V1', 'V2', 'V3', 'V5'] },
  { id: 'OUTLINE_LIFTED', file: { ...ENV, controls: { ...CLEAN, petalOutlineMode: 'CURVE', petalOutlineCurve: { mode: 'symmetric', points: [[0, 0.05], [0.5, 0.2], [0.95, 0.01], [1, 0]] } } }, expect: [], warn: ['W2'] },
  /* THE WIDTH-REFUSAL HAZARD (§9.6): the page's Petal width refusal is not
     gated on a trusted event and reads the PREVIOUS build's petals. Onto a
     dirty page drawing a NARROW curve, a file that asks the minimum width (and
     its own broad curve) has the width put back by the refusal — V2 is the
     only clause that can see it (the reader has no note; the status says
     clean). A LIVE PAGE DEFECT, pre-existing; the fixture pins that the
     read-back still catches it with outline curves on. */
  { id: 'WIDTH_REFUSED_ON_LOAD', dirty: { petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_NARROW }, file: { ...ENV, controls: { ...CLEAN, petalOutlineMode: 'CURVE', petalOutlineCurve: OUTLINE_STRAP, petalWidth: 8 } }, expect: ['V2'] },
  /* SCHEMA v4 (S5): per-layer CUP and SPINE CURL, deltas on the global. An
     intended pair passes (effective cups 0.1 / 0.4, under the fold clamp);
     the same entries with Per-layer values OFF load with zero notes and build
     nothing — V7 (the reader keeps an inert record; no control is hidden, the
     ENTRY is inert); a cup delta that takes the layer past the fold clamp loads
     clean and is TOLD on the page read-out only; a delta past the registry
     range warns W2 (clamped silently); a curl delta on a CURVE-spine layer
     warns W3 (inert).
     EVA'S RULINGS (Nov 5): a clamp that binds ON THE NIB ONLY stays TOLD
     (SCOPED_CUP_CLAMPED, effective cup 0.55: 7 rows on 7 nib stations); one
     that binds below the nib WARNS W4 and exits 0 (SCOPED_CUP_AWAY: cup 1.2
     on an 8 mm layer, 13 rows against 8 nib stations — the spawned exit leg
     runs it too); W3 is now the FAILING clause V8. */
  { id: 'SCOPED_CUPCURL', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10, petalCup: -0.2, petalSpineCurl: -20 } }, { layer: 1, offsets: { petalTilt: 15, petalCup: 0.1, petalSpineCurl: 40 } }] } }, expect: [] },
  { id: 'SCOPED_CUPCURL_OFF', file: { ...ENV, controls: { ...CLEAN }, overrides: { layers: [{ layer: 0, offsets: { petalCup: -0.2, petalSpineCurl: -20 } }, { layer: 1, offsets: { petalCup: 0.1, petalSpineCurl: 40 } }] } }, expect: ['V7'] },
  { id: 'SCOPED_CUP_CLAMPED', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalTilt: 15, petalCup: 0.25 } }] } }, expect: [], told: ['CUP CLAMPED'] },
  { id: 'SCOPED_CUP_AWAY', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalTilt: 15, petalCup: 0.9, petalWidth: -8 } }] } }, expect: [], warn: ['W4'], told: ['CUP CLAMPED'] },
  { id: 'SCOPED_DELTA_RANGE', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalTilt: 15, petalCup: 1.0 } }] } }, expect: [], warn: ['W2', 'W4'], told: ['CUP CLAMPED'] },
  { id: 'SCOPED_CURL_INERT', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: { petalTilt: 15, petalSpineCurl: 30 }, values: { petalCurlMode: 'CURVE', petalSpineCurve: { mode: 'single', points: [[0, 0], [0.5, 0.1], [0.9, 0.3]] } } }] } }, expect: ['V8'] },
  /* SCHEMA v5 (S6): a layer's OWN RING (#495). An intended ring loads clean (V9
     reads it off footRing()'s record); a ring-only entry is a scope with values
     and builds; a ring past 1 grows the hub, TOLD on the read-out; a ring with
     Per-layer values OFF is inert — V7; a ring past the range is clamped and told
     by the reader (V1 / V5) and warned from the file (W2), and V9 still finds
     asked 2.6 built 2.0. */
  { id: 'RING_OWNED', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: { petalTilt: -10 } }, { layer: 1, offsets: { petalTilt: 15 }, values: { layerRing: 0.6 } }] } }, expect: [] },
  { id: 'RING_ONLY', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: {}, values: { layerRing: 0.55 } }] } }, expect: [] },
  { id: 'RING_GROWS', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 0, offsets: {}, values: { layerRing: 1.3 } }] } }, expect: [], told: ['HUB GROWN'] },
  { id: 'RING_INERT', file: { ...ENV, controls: { ...CLEAN }, overrides: { layers: [{ layer: 1, offsets: {}, values: { layerRing: 0.6 } }] } }, expect: ['V7'] },
  { id: 'RING_PAST', file: { ...ENV, controls: { ...SCOPED }, overrides: { layers: [{ layer: 1, offsets: {}, values: { layerRing: 2.6 } }] } }, expect: ['V1', 'V5'], warn: ['W2'], told: ['HUB GROWN'] },
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
      'SCOPED_RADIAL:V2', 'SCOPED_SPIRAL:V2', 'SCOPED_DELTA:V2', 'SCOPED_OWNED_RANGE:V2', 'SCOPED_INERT:V2', 'SCOPED_INERT:V3', 'SCOPED_INERT:V7',
      /* S4: the outline fixtures, the same two mechanisms */
      'OUTLINE_CURVE:V2', 'OUTLINE_CURVE:V3', 'OUTLINE_LAYER:V2', 'OUTLINE_LIFTED:V2', 'OUTLINE_LIFTED:V3', 'WIDTH_REFUSED_ON_LOAD:V3',
      /* S5: the cup/curl fixtures, the S3 mechanisms again (SCOPED_CUPCURL_OFF is SCOPED_INERT's shape) */
      'SCOPED_CUPCURL:V2', 'SCOPED_CUPCURL_OFF:V2', 'SCOPED_CUPCURL_OFF:V3', 'SCOPED_CUPCURL_OFF:V7', 'SCOPED_CUP_CLAMPED:V2', 'SCOPED_CUP_AWAY:V2', 'SCOPED_DELTA_RANGE:V2', 'SCOPED_CURL_INERT:V2',
      /* S6: the ring fixtures, the same mechanisms (RING_INERT is SCOPED_INERT's shape) */
      'RING_OWNED:V2', 'RING_ONLY:V2', 'RING_GROWS:V2', 'RING_PAST:V2', 'RING_INERT:V2', 'RING_INERT:V3', 'RING_INERT:V7'],
  },
  {
    id: 'the-scopes-survive-a-new-design', file: 'bloom.js',
    from: "next[k] = r.doc.overrides[k] || [];", to: "next[k] = (had && had[k]) || [];",
    breaks: ['CLEAN:V4', 'OUT_OF_RANGE:V4', 'UNKNOWN_FIELD:V4', 'HIDDEN_CONTROL:V4', 'HIDDEN_OPTION:V4', 'OFF_STEP:V4', 'SIDECAR_INSIDE:V4', 'OFF_SCHEMA:V4', 'SCHEMA_RANGE:V4',
      /* S3: a scoped file's own layers are REPLACED by the leftover (layer 1) —
         V4 always, V7 wherever the file's layer set is not [1] */
      'SCOPED_RADIAL:V4', 'SCOPED_RADIAL:V7', 'SCOPED_SPIRAL:V4', 'SCOPED_SPIRAL:V7', 'SCOPED_DELTA:V4', 'SCOPED_DELTA:V7', 'SCOPED_OWNED_RANGE:V4', 'SCOPED_INERT:V4',
      /* S4: V4 on every outline fixture that loads; V7 on OUTLINE_LAYER (its layers [0, 1]) */
      'OUTLINE_CURVE:V4', 'OUTLINE_LAYER:V4', 'OUTLINE_LAYER:V7', 'OUTLINE_MODE_OFF:V4', 'LOBES_UNDER_CURVE:V4', 'OUTLINE_LIFTED:V4', 'WIDTH_REFUSED_ON_LOAD:V4',
      /* S5: V4 on every cup/curl fixture; V7 on SCOPED_CUPCURL (its layers [0, 1]) */
      'SCOPED_CUPCURL:V4', 'SCOPED_CUPCURL:V7', 'SCOPED_CUPCURL_OFF:V4', 'SCOPED_CUP_CLAMPED:V4', 'SCOPED_CUP_AWAY:V4', 'SCOPED_DELTA_RANGE:V4', 'SCOPED_CURL_INERT:V4',
      /* S6: V4 on every ring fixture; V7 where the file's layers are not [1]; V9 wherever the
         file's ring is replaced by the leftover entry, which owns none (RING_INERT builds no layer) */
      'RING_OWNED:V4', 'RING_OWNED:V7', 'RING_OWNED:V9', 'RING_ONLY:V4', 'RING_ONLY:V9', 'RING_GROWS:V4', 'RING_GROWS:V7', 'RING_GROWS:V9', 'RING_PAST:V4', 'RING_PAST:V9', 'RING_INERT:V4'],
  },
  {
    /* S3: the page MERGES the leftover scope into the file's — the plausible
       wrong reading of "take the file's scopes" once a file carries some */
    id: 'the-leftover-scope-is-merged-into-the-file', file: 'bloom.js',
    from: "next[k] = r.doc.overrides[k] || [];", to: "next[k] = [...((had && had[k]) || []), ...(r.doc.overrides[k] || [])];",
    /* V4 on every fixture — scoped or not, the dirty page's layer-1 entry
       survives; and V7 on SCOPED_DELTA, whose own layers are [0]: the leftover
       adds layer 1, so the BUILDER's scoped layers stop being the file's */
    breaks: ['CLEAN:V4', 'HIDDEN_CONTROL:V4', 'HIDDEN_OPTION:V4', 'OFF_SCHEMA:V4', 'OFF_STEP:V4', 'OUT_OF_RANGE:V4', 'SCHEMA_RANGE:V4', 'SCOPED_DELTA:V4', 'SCOPED_DELTA:V7', 'SCOPED_INERT:V4', 'SCOPED_OWNED_RANGE:V4', 'SCOPED_RADIAL:V4', 'SCOPED_SPIRAL:V4', 'SIDECAR_INSIDE:V4', 'UNKNOWN_FIELD:V4',
      /* S4: V4 on every outline fixture that loads (OUTLINE_LAYER's layers [0, 1] already hold the leftover's 1, so no V7) */
      'OUTLINE_CURVE:V4', 'OUTLINE_LAYER:V4', 'OUTLINE_MODE_OFF:V4', 'LOBES_UNDER_CURVE:V4', 'OUTLINE_LIFTED:V4', 'WIDTH_REFUSED_ON_LOAD:V4',
      /* S5: V4 on every cup/curl fixture (each already names layer 1) */
      'SCOPED_CUPCURL:V4', 'SCOPED_CUPCURL_OFF:V4', 'SCOPED_CUP_CLAMPED:V4', 'SCOPED_CUP_AWAY:V4', 'SCOPED_DELTA_RANGE:V4', 'SCOPED_CURL_INERT:V4',
      /* S6: V4 on every ring fixture; V7 on RING_GROWS, whose own layers are [0]. No V9: the
         merged leftover owns no ring, and every ring the file names is still built */
      'RING_OWNED:V4', 'RING_ONLY:V4', 'RING_GROWS:V4', 'RING_GROWS:V7', 'RING_PAST:V4', 'RING_INERT:V4'],
  },
  {
    id: 'hidden-controls-are-applied', file: 'bloom-file.js',
    from: '    if (!drop.length) break;', to: '    break;',
    breaks: ['HIDDEN_CONTROL:V1', 'HIDDEN_CONTROL:V2', 'HIDDEN_CONTROL:V5', 'HIDDEN_OPTION:V1', 'HIDDEN_OPTION:V2', 'HIDDEN_OPTION:V5',
      /* S4: the two outline negative controls rest on THIS rule — a curve with
         the mode off, lobes/fringe under CURVE (V3 stays: the page still hides them) */
      'OUTLINE_MODE_OFF:V1', 'OUTLINE_MODE_OFF:V2', 'OUTLINE_MODE_OFF:V5', 'LOBES_UNDER_CURVE:V1', 'LOBES_UNDER_CURVE:V2', 'LOBES_UNDER_CURVE:V5'],
  },
  {
    id: 'a-reader-note-is-dropped', file: 'bloom-file.js',
    from: '  const notes = r.notes.slice();\n  const named', to: '  const notes = [];\n  const named',
    breaks: ['OUT_OF_RANGE:V1', 'OUT_OF_RANGE:V5', 'UNKNOWN_FIELD:V1', 'UNKNOWN_FIELD:V5', 'OFF_STEP:V1', 'OFF_STEP:V5', 'SIDECAR_INSIDE:V1', 'SIDECAR_INSIDE:V5',
      /* S6: the reader's clamp note on a ring past the range — with it gone the file passes
         every clause, and only W2 (pure, from the file) still says so */
      'RING_PAST:V1', 'RING_PAST:V5'],
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
      'SCOPED_OWNED_RANGE:V1', 'SCOPED_OWNED_RANGE:V2', 'SCOPED_OWNED_RANGE:V5', 'SCOPED_INERT:V1', 'SCOPED_INERT:V2', 'SCOPED_INERT:V3', 'SCOPED_INERT:V5', 'SCOPED_INERT:V7',
      /* S4: the outline fixtures, the same mechanism (WIDTH_REFUSED_ON_LOAD's V2 already fires) */
      'OUTLINE_CURVE:V1', 'OUTLINE_CURVE:V2', 'OUTLINE_CURVE:V3', 'OUTLINE_CURVE:V5', 'OUTLINE_LAYER:V1', 'OUTLINE_LAYER:V2', 'OUTLINE_LAYER:V5',
      'OUTLINE_LIFTED:V1', 'OUTLINE_LIFTED:V2', 'OUTLINE_LIFTED:V3', 'OUTLINE_LIFTED:V5', 'WIDTH_REFUSED_ON_LOAD:V1', 'WIDTH_REFUSED_ON_LOAD:V3', 'WIDTH_REFUSED_ON_LOAD:V5',
      /* S5: the scoped cup/curl fixtures as the S3 scoped ones; SCOPED_CUPCURL_OFF as SCOPED_INERT */
      'SCOPED_CUPCURL:V1', 'SCOPED_CUPCURL:V2', 'SCOPED_CUPCURL:V5', 'SCOPED_CUP_CLAMPED:V1', 'SCOPED_CUP_CLAMPED:V2', 'SCOPED_CUP_CLAMPED:V5', 'SCOPED_CUP_AWAY:V1', 'SCOPED_CUP_AWAY:V2', 'SCOPED_CUP_AWAY:V5', 'SCOPED_DELTA_RANGE:V1', 'SCOPED_DELTA_RANGE:V2', 'SCOPED_DELTA_RANGE:V5',
      'SCOPED_CURL_INERT:V1', 'SCOPED_CURL_INERT:V2', 'SCOPED_CURL_INERT:V5', 'SCOPED_CUPCURL_OFF:V1', 'SCOPED_CUPCURL_OFF:V2', 'SCOPED_CUPCURL_OFF:V3', 'SCOPED_CUPCURL_OFF:V5', 'SCOPED_CUPCURL_OFF:V7',
      /* S6: the ring fixtures as the scoped ones (RING_PAST's V1/V5 already fire); RING_INERT as SCOPED_INERT */
      'RING_OWNED:V1', 'RING_OWNED:V2', 'RING_OWNED:V5', 'RING_ONLY:V1', 'RING_ONLY:V2', 'RING_ONLY:V5', 'RING_GROWS:V1', 'RING_GROWS:V2', 'RING_GROWS:V5', 'RING_PAST:V2',
      'RING_INERT:V1', 'RING_INERT:V2', 'RING_INERT:V3', 'RING_INERT:V5', 'RING_INERT:V7'],
  },
  {
    /* S6 (schema v5): the page builds WITHOUT the layer rings it holds — the
       reader keeps them (V4 sees the file's scopes on the page) and the build
       places the derived ring. Only V9 reads footRing()'s record; a ring-only
       entry is left with no value at all, so its layer stops reaching the
       build (V7) too. */
    id: 'the-build-drops-the-layer-ring', file: 'bloom-file.js',
    from: '  return { layers, petals, tiers, strands, bounds: scopeBounds() };',
    to: "  return { layers: layers.map((e) => (e.values && 'layerRing' in e.values ? { ...e, values: Object.fromEntries(Object.entries(e.values).filter(([k]) => k !== 'layerRing')) } : e)), petals, tiers, strands, bounds: scopeBounds() };",
    breaks: ['RING_OWNED:V9', 'RING_ONLY:V7', 'RING_ONLY:V9', 'RING_GROWS:V7', 'RING_GROWS:V9', 'RING_PAST:V7', 'RING_PAST:V9'],
  },
];

function mutate(src, m) {
  const n = src.split(m.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${m.id}: anchor matches ${n} times in ${m.file} (want exactly 1)`);
  return src.replace(m.from, m.to);
}

async function validate(page, port, text, name, dirtyOver = null) {
  const errors = [];
  const onErr = (e) => errors.push(String(e && e.message || e));
  page.on('pageerror', onErr);
  try {
    await openBloom(page, port);
    const dirtyText = dirtyOver ? toText(composeDoc({ ...DIRTY_STATE, ...dirtyOver }, { savedAt: '2026-11-03T00:00:00.000Z', scopes: DIRTY_SCOPES })) : DIRTY_TEXT;
    const d0 = await page.evaluate(([t]) => window.__bloomDesign.load(t, 'dirty.bloom-design.json'), [dirtyText]);
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
      rings: ((window.__bloomMetrics() || {}).rings || []).map((r) => ({ index: r.index, ownRing: r.ownRing || null })),
      status: document.getElementById('designStatus').textContent,
      readout: (document.getElementById('readout') || {}).textContent || '',
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
    /* V9 (schema v5, S6): every ring the file names on a layer the build
       reaches is the ring footRing() BUILT — read off footRing()'s own per-ring
       record (`__bloomMetrics().rings[i].ownRing`), an owner the reader does not
       write: its `asked` is the file's number and its `built` the number clamped
       to LAYER_RING_RANGE (imported into Node from the geometry; a page mutant
       changes the page's copy, never this one). And the
       converse: no ring is owned that the file does not name (a leftover from
       the dirty page). Judged only where V7's builder says the layers are live;
       an inert ring is V7's. */
    if (after.built && after.built.layersLive) {
      const asked = new Map();
      for (const e of (obj && obj.overrides && Array.isArray(obj.overrides.layers) ? obj.overrides.layers : [])) {
        if (e && e.values && LAYER_SCHEMA.ring.some((k) => k in e.values)) asked.set(e.layer, e.values.layerRing);
      }
      const [lo, hi] = G.LAYER_RING_RANGE;
      const bad9 = [];
      for (const [layer, v] of asked) {
        const r = after.rings.find((x) => x.index === layer);
        if (!r) { if (layer < after.rings.length) bad9.push(`layer ${layer}: no ring record`); continue; }
        const want = Math.min(hi, Math.max(lo, v));
        if (!r.ownRing || r.ownRing.asked !== v || r.ownRing.built !== want) bad9.push(`layer ${layer}: the file asks ${v} (built ${want}), footRing() ${r.ownRing ? `asked ${r.ownRing.asked}, built ${r.ownRing.built}` : 'owns no ring — the derived ring was built'}`);
      }
      for (const r of after.rings) if (r.ownRing && !asked.has(r.index)) bad9.push(`layer ${r.index}: footRing() built an owned ring ${r.ownRing.built} the file does not name`);
      if (bad9.length) fired.V9 = `the ring the build placed is not the file's: ${bad9.join('; ')}`;
    }
    /* TOLD (schema v4, S5) — what the page's READ-OUT says it clamped, which no
       reader note carries: the fold clamp on the section (CUP CLAMPED) and on
       the spine (FOLD LIMIT). Recorded, never a clause or a warning: how the
       validator should treat a clamp the photo's values ask for is Eva's ruling
       (§14). A fixture pins what is told so the observation cannot drift. */
    const told = {};
    for (const k of TOLD_KEYS) { const at = after.readout.indexOf(k); if (at >= 0) { const end = after.readout.indexOf('\n', at); told[k] = after.readout.slice(at, end < 0 ? at + 400 : Math.min(end, at + 400)).replace(/\s+/g, ' '); } }
    const sw = schemaWarnings(obj);
    Object.assign(fired, sw.fired);
    return { fired, warned: sw.warned, told, rec, applied: rec.appliedIds || [] };
  } finally { page.off('pageerror', onErr); }
}

async function runFixtures(page, port) {
  const out = {};
  for (const f of FIXTURES) out[f.id] = await validate(page, port, JSON.stringify(f.file), `${f.id}.json`, f.dirty || null);
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
        for (const [, why] of Object.entries(r.told)) console.log(`        told (page read-out, not a warning): ${why}`);
        warnCount += warns.length;
        if (bad.length) failed = true;
      }
    }
  }
  if (SELF || NEGATIVE) {
    /* what decides a fixture's verdict: the page modules, the reader, the
       geometry, the registry, this validator and the fixtures themselves */
    const deciders = ['bloom.js', 'bloom-file.js', 'bloom-geometry.js', 'bloom-registry.js', 'bloom-curve.js', 'bloom.html', 'tools/verify-bloom-photo-subset.mjs', 'tools/bloom-photo-census.mjs', 'tools/bloom-harness.mjs'];
    /* this validator is hashed WITHOUT its MUTANTS table: a mutant's `breaks`
       list decides nothing about a fixture, and widening one must not stale
       the base. Everything else in the file is hashed. */
    const bytesOf = (f) => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (f !== 'tools/verify-bloom-photo-subset.mjs') return t; const a = t.indexOf('const MUTANTS = ['), b = t.indexOf('\nfunction mutate('); if (a < 0 || b < a) throw new Error('the MUTANTS table cannot be located for the base hash'); return t.slice(0, a) + t.slice(b); };
    const treeSha = Object.fromEntries(deciders.map((f) => [f, crypto.createHash('sha256').update(bytesOf(f)).digest('hex')]));
    let base;
    if (BASE_FILE && NEGATIVE) {
      const saved = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
      const stale = deciders.filter((f) => saved.treeSha[f] !== treeSha[f]);
      if (stale.length) throw new Error(`--base ${BASE_FILE} was saved on another tree (${stale.join(', ')} differ) — re-run --self --save`);
      base = Object.fromEntries(Object.entries(saved.fixtures).map(([id, r]) => [id, { fired: Object.fromEntries(r.fired.map((k) => [k, 'saved'])), warned: Object.fromEntries(r.warned.map((k) => [k, 'saved'])), told: Object.fromEntries((r.told || []).map((k) => [k, 'saved'])) }]));
      console.log(`base: reused from ${BASE_FILE} (saved ${saved.savedAt}, every deciding file's sha256 matches)`);
    } else base = await runFixtures(page, port);
    if (SAVE) fs.writeFileSync(SAVE, JSON.stringify({ savedAt: new Date().toISOString(), treeSha, fixtures: Object.fromEntries(Object.entries(base).map(([id, r]) => [id, { fired: Object.keys(r.fired), warned: Object.keys(r.warned), told: Object.keys(r.told) }])) }, null, 1));
    for (const f of FIXTURES) {
      const got = Object.keys(base[f.id].fired).sort(), want = [...f.expect].sort();
      const gotW = Object.keys(base[f.id].warned).sort(), wantW = [...(f.warn || [])].sort();
      const gotT = Object.keys(base[f.id].told || {}).sort(), wantT = [...(f.told || [])].sort();
      const ok = JSON.stringify(got) === JSON.stringify(want) && JSON.stringify(gotW) === JSON.stringify(wantW) && JSON.stringify(gotT) === JSON.stringify(wantT);
      console.log(`${ok ? 'ok  ' : 'FAIL'}  fixture ${f.id}: fired [${got.join(' ')}] warned [${gotW.join(' ')}]${gotT.length ? ` told [${gotT.join(' / ')}]` : ''}${ok ? '' : ` — expected [${want.join(' ')}] warned [${wantW.join(' ')}] told [${wantT.join(' / ')}]`}`);
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

/* THE EXIT-CODE LEGS (ruling 2, and Eva's CUP CLAMPED ruling of Nov 5): the
   OFF_SCHEMA fixture must list W1 and exit 0, and SCOPED_CUP_AWAY must list
   W4 (the fold clamp below the nib) and exit 0 — each written to a file and
   handed to a SPAWNED copy of this validator, because the exit code is the
   claim and only a separate process can show it. Under --negative-control
   each validator mutant must break the leg it names. */
const SELF_MUTANTS = [
  /* anchors joined from pieces so the definitions below do not match themselves */
  { id: 'a-warning-fails-the-run', from: ['        if (bad.length)', ' failed = true;'].join(''), to: '        if (bad.length || warns.length) failed = true;', breaks: ['W1', 'W4'] },
  { id: 'the-off-schema-warning-is-dropped', from: ['    if (!row) { if (id !== LAYER_SCHEMA.switch)', ' off.push('].join(''), to: '    if (!row) { if (0) off.push(', breaks: ['W1'] },
  /* the obvious reading of "from the clamp's own reported location": the worst
     station alone — which sits on the nib whenever the nib binds, so a clamp
     reaching below it is called tip-only */
  { id: 'the-clamp-is-located-by-its-worst-station-alone', from: ['      if (worstOn &&', ' cc.rows <= nibRows) { tip++; continue; }'].join(''), to: '      if (worstOn) { tip++; continue; }', breaks: ['W4'] },
];
const LEGS = [
  { warn: 'W1', fixture: 'OFF_SCHEMA', name: 'off-schema', line: /^\s+warn W1: off the photo schema: antherElongation=4$/m },
  { warn: 'W4', fixture: 'SCOPED_CUP_AWAY', name: 'cup-away', line: /^\s+warn W4: the fold clamp binds AWAY from the petal tip \(the nib\): petal \(layer 1\): 13 rows clamped against 8 nib stations/m },
];
function exitLeg(script, leg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-subset-'));
  const file = path.join(dir, `${leg.name}.subset.bloom-design.json`);
  fs.writeFileSync(file, JSON.stringify(FIXTURES.find((f) => f.id === leg.fixture).file));
  const r = spawnSync(process.execPath, [script, file], { encoding: 'utf8', env: process.env });
  fs.rmSync(dir, { recursive: true, force: true });
  const out = (r.stdout || '') + (r.stderr || '');
  return { status: r.status, listed: leg.line.test(out), pass: new RegExp(`^PASS  ${leg.name}`, 'm').test(out), out };
}
if (SELF || NEGATIVE) {
  const me = fileURLToPath(import.meta.url);
  let legsOk = true;
  for (const leg of LEGS) {
    const r = exitLeg(me, leg);
    const ok = r.status === 0 && r.listed && r.pass;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  exit-code leg (${leg.warn}): the ${leg.name} file PASSES, lists ${leg.warn} and exits ${r.status}${ok ? '' : `\n${r.out.split('\n').map((l) => '        ' + l).join('\n')}`}`);
    if (!ok) { failed = true; legsOk = false; }
  }
  if (NEGATIVE && legsOk && (!ONLY.length || SELF_MUTANTS.some((m) => ONLY.includes(m.id)))) {
    const src = fs.readFileSync(me, 'utf8');
    for (const m of SELF_MUTANTS) mutate(src, { ...m, file: path.basename(me) });
    console.log(`anchors: all ${SELF_MUTANTS.length} validator mutants match exactly once`);
    for (const m of SELF_MUTANTS.filter((x) => !ONLY.length || ONLY.includes(x.id))) {
      const copy = path.join(path.dirname(me), `.photo-subset-mutant-${m.id}.mjs`);
      fs.writeFileSync(copy, mutate(src, { ...m, file: path.basename(me) }));
      const broke = [];
      try { for (const leg of LEGS) { const r = exitLeg(copy, leg); if (!(r.status === 0 && r.listed && r.pass)) broke.push(leg.warn); } } finally { fs.rmSync(copy, { force: true }); }
      const ok = JSON.stringify(broke) === JSON.stringify([...m.breaks].sort());
      console.log(`${ok ? 'ok  ' : 'FAIL'}  validator mutant ${m.id}: broke the leg(s) [${broke.join(' ')}] — names [${m.breaks.join(' ')}]`);
      if (!ok) failed = true;
    }
  }
}
if (!FILES.length && !SELF && !NEGATIVE) { console.log('nothing to do — give files, --self or --negative-control'); process.exit(2); }
if (warnCount) console.log(`\n${warnCount} warning(s) — listed apart from the clauses; warnings do not change the exit code`);
console.log(failed ? '\nPHOTO-SUBSET VALIDATOR: FAIL' : `\nPHOTO-SUBSET VALIDATOR: PASS${NEGATIVE ? ` — every mutant moved exactly the clauses it names` : ''}`);
process.exit(failed ? 1 : 0);
