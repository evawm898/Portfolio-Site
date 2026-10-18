#!/usr/bin/env node
/* THE DESIGN FILE GATE — bloom-file.js (save / load a bloom design).

   THE TRAP (plot-file.js's, carried over): a restore that silently does not
   restore something is invisible — a field dropped by the writer, skipped by
   the reader, or defaulted instead of reported leaves a page that looks
   restored. Every clause below names the failure it exists for, and
   `--negative-control` serves seven broken copies of bloom-file.js and requires
   each to redden exactly the clauses it names.

   THE CLAUSES
     F0  THE TABLE CENSUS, against an INDEPENDENT OWNER. Every registry control
         is a field of CONTROL_FIELDS or a named CONTROL_EXCEPTIONS entry, and
         every table row names a live control, both directions — the registry
         is the census, because the writer and the reader walk the SAME table
         and agree perfectly about a row that is simply gone. The top-level
         keys and the two containers' scope names are checked against a
         WRITTEN-DOWN list here, for the same reason: a container that
         vanished would round-trip cleanly too.
     F1  THE DEFAULTS ROUND TRIP: compose(DEFAULTS) carries every control
         verbatim, both containers EMPTY, and reads back with ZERO notes and
         every value identical (`Object.is` on a slider, `===` on a choice).
     F2  EVERY LIVE MATRIX ROW round-trips: read(compose(state)) reports
         nothing and hands back every control's value identical. A row whose
         own set lies outside the registry's bounds cannot round-trip clean and
         is REPORTED by name rather than excused.
     F3  BYTES: on fifteen named rows, one per feature family (the smoke
         subset with --smoke, every row with --full), both modes, the
         geometry built from the round-tripped state is positionally identical
         under `Object.is` to the geometry built from the state itself, at an
         identical triangle count. F2 makes this true by construction (the
         head is a pure function of its state — tools/verify-bloom-build-order);
         it is measured anyway, because by-construction is an argument.
     F4  THE READER'S RULES, on written-down fixtures: a missing field is
         reported and ABSENT from the result (never defaulted); an unknown
         field is reported; a newer version and a wrong format are REFUSED
         whole; a slider past its bounds is clamped and told, off its step
         snapped and told, a choice outside its options refused and told; a
         RETIRED id with an exact migration lands on every replacement and is
         told; a retired id with no migration is told and not applied; a file
         naming a retired id AND its replacement applies neither; an entry in
         a curves container is told as not applied, a well-formed overrides
         entry is read (Scoping-a), a tier entry kept and told, a malformed one
         dropped and told; a missing container is told.
     F7  THE CURVE KIND (the curve-editor session): the shipped walkers
         (`composeControls` / `readControls`) over a fixture curve descriptor
         write a curve verbatim and read it back identical with no note, and
         refuse a curve the spec cannot hold WHOLE, told. F0 also holds the
         field kinds to the registry's CONTROL_KINDS, both directions.
     F8  THE LIVE SPINE CURVE (F3-global): the first registry curve control
         round-trips a hooked spine in CURVE mode verbatim through the shipped
         document walkers, an out-of-box spine is refused whole and told, and
         the control is a curve field of the file.
     F9  THE OUTLINE CURVE (F6-sym): the second registry curve control
         round-trips a spoon outline in CURVE mode verbatim, an out-of-order
         outline is refused whole and told, and it is a curve field of the file.
     F11 THE ASYMMETRIC OUTLINE (F6-asym): mode and both halves round-trip
         verbatim; a #417 symmetric file loads unchanged; a bad right half is
         refused whole.
     F12 THE ASYMMETRIC MODE'S EQUAL-HALVES IDENTITY (F6-asym),
         tools/verify-bloom-outline-asym-equal.mjs, SPAWNED here for F6's
         reason: an Asymmetric outline with equal halves IS the Symmetric one,
         every export float and grid value, both modes.
     F10 THE OUTLINE WIDTH GATE (F6-sym-2), tools/verify-bloom-outline-width.mjs,
         is SPAWNED here for F6's reason: the Petal width drag in CURVE mode
         asks the outline's validator, a narrowing drag is refused and told.
     F6  THE SCOPE MODEL'S OWN GATE, tools/verify-bloom-scopes.mjs, is SPAWNED
         here (and its --negative-control under ours) so it rides in CI through
         this workflow step — the file's overrides containers are that model's
         file shape, and adding a workflow step would cost every frozen tag
         dispatched afterwards from an older base (CLAUDE.md, "WHEN A FROZEN
         TAG PUBLISHES") while another session is in flight on one.
     F5  THE PAGE (browser): Save and Load render in the panel; the page's own
         save carries EXACTLY the registry's ids under `controls`; a load
         through the page's own hook of its own save reports NOTHING and moves
         no control; a load that changes a control moves the page's state
         snapshot and its status line says clean; a load of a doc missing a
         field keeps that control and says `missing`; a load of a retired id
         lands on both halves and says `migrated`; a newer version is refused
         on the status line; the REAL file input (setInputFiles) and a REAL
         drop (DataTransfer + DragEvent) both load; and the STL exported after
         save → reset → load is byte-identical to the STL exported before.

   Run: node tools/verify-bloom-design-file.mjs [--no-browser] [--smoke|--full]
        [--negative-control] [--mutant=a,b]
   Needs playwright-core and three@0.161.0 (npm i --no-save) for the browser
   part. In CI it rides in bloom-panel.yml. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const NEGATIVE = argv.includes('--negative-control');
const NO_BROWSER = argv.includes('--no-browser');
const FULL = argv.includes('--full');
const SMOKE_ROWS = argv.includes('--smoke');
const BYTE_ROWS = [
  'DEFAULT (the shipping configuration)',
  'ALL MIN',   // petalCount OFF its default, so a field dropped on write moves bytes here (the mutants drop petalCount)
  'FORM: FIDDLEHEAD (spine curl alone)',
  'SPIRAL x defaults',
  'CONTINUOUS x 3 turns',
  'SPHERE: defaults (8 per turn x 1 turn — eight feet on a sphere)',
  'STAMENS: 6 on a RING (the six-stamen candidate)',
  'LEAVES: alternate x 3 nodes at the ruled 35 deg',
  'INFILL: the ruled defaults (20 cells, 5 Lloyd passes, law 0.30, stretch 1.65, a 1.00 mm wall, a 1.50 mm hole bar)',
  'SEPALS: the shipped whorl (5 of 8, interleaved, size 0.60, angle 0)',
  'INFLO: the raceme (5 nodes x 1, 5-petal florets on 20 mm pedicels)',
  "STEM NODES: the flower's 0.48 on 100 x 6 mm, three alternate leaves",
  'TUBE: 8 petals x k 2 (2 panels)',
  'LOBES: 10 asked at the default coverage — CLAMPED to 6, told',
  'VARIANCE: size ±50% (1 cycle round the shipping whorl, phase 0)',
];
const ONLY = (argv.find((a) => a.startsWith('--mutant=')) || '').slice(9).split(',').filter(Boolean);

/* THE WRITTEN-DOWN CENSUS of the format's own shape — never derived from the
   module under test. */
const CENSUS = {
  top: ['format', 'version', 'app', 'savedAt', 'controls', 'overrides', 'curves'],
  scopes: ['layers', 'petals', 'tiers'],
  curves: ['spine', 'outline'],
  format: 'bloom-design',
  version: 1,
};

const load = (f) => import(pathToFileURL(path.join(ROOT, f)).href + `?t=${Date.now()}_${Math.random()}`);
const REG = await load('bloom-registry.js');
const GEO = await load('bloom-geometry.js');
const H = await load('tools/bloom-harness.mjs');
const SMOKE = await load('tools/bloom-smoke.mjs');
const kindOf = new Map(REG.CONTROLS.map((c) => [c.id, c]));
function stateOf(row) {
  const s = { ...REG.DEFAULTS };
  for (const w of row.set || []) {
    if (w.id === REG.SCOPES_SET_ID) continue;   // the row's overrides record — read by H.rowScopes, written as the file's overrides
    const c = kindOf.get(w.id); if (!c) throw new Error(`${row.label}: no control ${w.id}`);
    s[w.id] = c.kind === 'slider' ? Number(w.value) : w.value;
  }
  return s;
}
/* a CURVE is compared coordinate by coordinate under Object.is (its own
   `curveEquals` — a matrix row's JSON text and the page's object are one value) */
const same = (c, a, b) => (c.kind === 'slider' ? Object.is(a, b) : c.kind === 'curve' ? REG.valuesEqual(c, typeof a === 'string' ? JSON.parse(a) : a, typeof b === 'string' ? JSON.parse(b) : b) : a === b);

/* ---------------- the Node clauses, over a (possibly mutated) module ---------------- */
async function nodeClauses(F, rec) {
  /* F0 */
  {
    const p = [];
    const ids = new Set(REG.CONTROLS.map((c) => c.id));
    const keys = new Set(F.CONTROL_FIELDS.map((f) => f.key));
    const exc = new Set(F.CONTROL_EXCEPTIONS.map((e) => e.id));
    for (const id of ids) if (!keys.has(id) && !exc.has(id)) p.push(`registry control ${id} is neither a field of the file nor a named exception`);
    for (const f of F.CONTROL_FIELDS) { if (!ids.has(f.control)) p.push(`table row ${f.key} names ${f.control}, not a live control`); if (f.key !== f.control) p.push(`table row ${f.key} is not the control's own id`); }
    for (const e of F.CONTROL_EXCEPTIONS) { if (!ids.has(e.id)) p.push(`exception ${e.id} is not a live control`); if (keys.has(e.id)) p.push(`exception ${e.id} is also a field`); if (!e.why) p.push(`exception ${e.id} has no why`); }
    const eq = (a, b) => JSON.stringify([...a]) === JSON.stringify([...b]);
    if (!eq(F.TOP_LEVEL_KEYS, CENSUS.top)) p.push(`top-level keys ${JSON.stringify([...F.TOP_LEVEL_KEYS])} differ from the census ${JSON.stringify(CENSUS.top)}`);
    if (!eq(F.SCOPE_CONTAINERS, CENSUS.scopes)) p.push(`overrides scopes ${JSON.stringify([...F.SCOPE_CONTAINERS])} differ from the census ${JSON.stringify(CENSUS.scopes)}`);
    if (!eq(F.CURVE_CONTAINERS, CENSUS.curves)) p.push(`curve containers ${JSON.stringify([...F.CURVE_CONTAINERS])} differ from the census ${JSON.stringify(CENSUS.curves)}`);
    if (F.FORMAT !== CENSUS.format || F.VERSION !== CENSUS.version) p.push(`format/version ${F.FORMAT}/${F.VERSION} differ from the census ${CENSUS.format}/${CENSUS.version}`);
    /* EVERY KIND THE REGISTRY KNOWS HAS A FIELD-KIND ROW, both directions —
       the registry's CONTROL_KINDS is the census (the curve-editor session) */
    const fk = Object.keys(F.FIELD_KINDS || {}), rk = [...REG.CONTROL_KINDS];
    for (const k of rk) if (!fk.includes(k)) p.push(`registry kind ${k} has no field-kind row — a control of that kind could not be saved`);
    for (const k of fk) if (!rk.includes(k)) p.push(`field-kind row ${k} names no registry kind`);
    for (const c of REG.CONTROLS) if (!rk.includes(c.kind)) p.push(`control ${c.id} has kind ${c.kind}, not one of the registry's kinds`);
    rec('F0', p, `${F.CONTROL_FIELDS.length} table rows over ${ids.size} registry controls, ${F.CONTROL_EXCEPTIONS.length} exceptions; top ${CENSUS.top.length} keys, scopes ${CENSUS.scopes.join('/')}, curves ${CENSUS.curves.join('/')}`);
  }
  /* F1 */
  {
    const p = [];
    const doc = F.composeDoc(REG.DEFAULTS, { savedAt: 'x' });
    const txt = F.toText(doc);
    const back = JSON.parse(txt);
    for (const k of CENSUS.top) if (!(k in back)) p.push(`the written file lacks ${k}`);
    for (const c of REG.CONTROLS) if (!same(c, back.controls && back.controls[c.id], REG.DEFAULTS[c.id])) p.push(`controls.${c.id} written as ${JSON.stringify(back.controls && back.controls[c.id])}, not the default ${JSON.stringify(REG.DEFAULTS[c.id])}`);
    for (const k of CENSUS.scopes) if (!Array.isArray(back.overrides && back.overrides[k]) || back.overrides[k].length) p.push(`overrides.${k} is not an empty list`);
    for (const k of CENSUS.curves) if (!Array.isArray(back.curves && back.curves[k]) || back.curves[k].length) p.push(`curves.${k} is not an empty list`);
    const r = F.readDoc(back);
    if (!r.ok) p.push(`read refused: ${r.error}`);
    else {
      if (r.notes.length) p.push(`a clean round trip reported ${r.notes.length} note(s): ${r.notes.slice(0, 3).map((n) => n.text).join(' | ')}`);
      for (const c of REG.CONTROLS) if (!(c.id in r.doc.controls) || !same(c, r.doc.controls[c.id], REG.DEFAULTS[c.id])) p.push(`read back controls.${c.id} as ${JSON.stringify(r.doc.controls[c.id])}, not ${JSON.stringify(REG.DEFAULTS[c.id])}`);
    }
    rec('F1', p, `the DEFAULTS round-trip: ${REG.CONTROLS.length} controls, 0 notes`);
  }
  /* F2 */
  const MATRIX = H.buildMatrix();
  {
    const p = []; let clean = 0;
    for (const row of MATRIX) {
      const st = stateOf(row);
      /* a row that carries a scope record (a stored role design, migrated —
         Q3.4) saves it as the file's overrides and must read it back */
      const rec0 = H.rowScopes(row);
      const r = F.readDoc(JSON.parse(F.toText(F.composeDoc(st, { savedAt: 'x', ...(rec0 ? { scopes: rec0 } : {}) }))));
      if (!r.ok) { p.push(`${row.label}: refused — ${r.error}`); continue; }
      const bad = [];
      if (r.notes.length) bad.push(`${r.notes.length} note(s): ${r.notes.slice(0, 2).map((n) => n.text).join(' | ')}`);
      if (rec0 && JSON.stringify(r.doc.overrides) !== JSON.stringify({ layers: rec0.layers || [], petals: rec0.petals || [], tiers: rec0.tiers || [] })) bad.push(`the overrides did not round-trip: ${JSON.stringify(r.doc.overrides)}`);
      for (const c of REG.CONTROLS) if (!(c.id in r.doc.controls) || !same(c, r.doc.controls[c.id], st[c.id])) { bad.push(`${c.id} ${JSON.stringify(st[c.id])} -> ${JSON.stringify(r.doc.controls[c.id])}`); break; }
      if (bad.length) p.push(`${row.label}: ${bad.join('; ')}`); else clean++;
    }
    rec('F2', p, `${clean} of ${MATRIX.length} live matrix rows round-trip clean and identical`);
  }
  /* F3 */
  {
    const p = [];
    /* THE BYTE ROWS: one per feature family by default (named here so the
       set is written down), the smoke subset under --smoke, every row under
       --full. The whole smoke subset builds every heavy corner twice in both
       modes and runs past ten minutes in Node; F2's identity is what makes
       the full build a construction, and this measures a sample of it. */
    const labels = new Set(SMOKE.SMOKE_LABELS);
    const rows = FULL ? MATRIX : SMOKE_ROWS ? MATRIX.filter((r) => labels.has(r.label)) : BYTE_ROWS.map((l) => {
      const row = MATRIX.find((r) => r.label === l);
      if (!row) throw new Error(`F3: the named byte row "${l}" is not in the live matrix — re-point it`);
      return row;
    });
    let n = 0, floats = 0;
    for (const row of rows) {
      if (/ALL MAX$/.test(row.label) && !FULL) continue;   // minutes a build; CI's own export gate covers it
      const st = stateOf(row);
      const rec0 = H.rowScopes(row);
      const r = F.readDoc(JSON.parse(F.toText(F.composeDoc(st, { savedAt: 'x', ...(rec0 ? { scopes: rec0 } : {}) }))));
      const back = { ...REG.DEFAULTS, ...(r.ok ? r.doc.controls : {}) };
      const scA = rec0 ? F.scopesForBuild(rec0) : null, scB = r.ok ? F.scopesForBuild(r.doc.overrides) : null;
      for (const exportMode of [false, true]) {
        const build = (s, scopes) => { const acc = new GEO.MeshBuilder({ exportMode }); GEO.buildBloomInto(acc, s, { below: null, capability: row.capability || null, scopes }); return acc; };
        let A, B;
        try { A = build(st, scA); B = build(back, scB); } catch (e) { p.push(`${row.label} (${exportMode ? 'export' : 'live'}): build threw — ${e.message}`); continue; }
        if (A.triangleCount !== B.triangleCount) { p.push(`${row.label} (${exportMode ? 'export' : 'live'}): ${A.triangleCount} tris from the state, ${B.triangleCount} from the round trip`); continue; }
        const pa = A.positions, pb = B.positions;
        let moved = 0; const L = Math.min(pa.length, pb.length);
        for (let i = 0; i < L; i++) if (!Object.is(pa[i], pb[i])) moved++;
        if (pa.length !== pb.length) moved += Math.abs(pa.length - pb.length);
        floats += pa.length; n++;
        if (moved) p.push(`${row.label} (${exportMode ? 'export' : 'live'}): ${moved} floats moved`);
      }
    }
    rec('F3', p, `${n} row-modes built twice, ${floats.toLocaleString('en-US')} floats positionally identical under Object.is${FULL ? '' : ' (the named byte rows; --smoke for the smoke subset, --full for every row)'}`);
  }
  /* F4 */
  {
    const p = [];
    const base = () => JSON.parse(F.toText(F.composeDoc(REG.DEFAULTS, { savedAt: 'x' })));
    const kinds = (r) => r.notes.map((n) => n.kind);
    const texts = (r) => r.notes.map((n) => n.text).join(' | ');
    // missing field: reported, ABSENT, never defaulted
    { const o = base(); delete o.controls.petalCount; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'missing' && /controls\.petalCount is missing/.test(n.text)) || 'petalCount' in r.doc.controls) p.push(`missing field: ${r.ok ? `notes [${kinds(r)}], petalCount in result: ${'petalCount' in r.doc.controls}` : r.error}`); }
    // unknown field
    { const o = base(); o.controls.notAControl = 3; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'unknown' && /controls\.notAControl/.test(n.text)) || 'notAControl' in r.doc.controls) p.push(`unknown field: ${r.ok ? texts(r) : r.error}`); }
    // unknown top-level key
    { const o = base(); o.extra = 1; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'unknown' && /^extra is not a field/.test(n.text))) p.push(`unknown top-level key: ${r.ok ? texts(r) : r.error}`); }
    // newer version refused whole
    { const o = base(); o.version = F.VERSION + 1; const r = F.readDoc(o);
      if (r.ok || !/version/.test(r.error)) p.push(`a newer version was ${r.ok ? 'READ' : `refused with "${r.error}"`}`); }
    // wrong format refused
    { const o = base(); o.format = 'plot-composition'; const r = F.readDoc(o);
      if (r.ok) p.push('a plot-composition file was read as a design'); }
    { const r = F.readDoc([1, 2]); if (r.ok) p.push('a JSON array was read as a design'); }
    // slider out of bounds: clamped, told
    { const o = base(); o.controls.petalCount = 999; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'clamped' && /petalCount: clamped 999 to 40/.test(n.text)) || r.doc.controls.petalCount !== 40) p.push(`out of bounds: ${r.ok ? `${texts(r)} -> ${r.doc.controls.petalCount}` : r.error}`); }
    // slider off its step: snapped, told
    { const o = base(); o.controls.petalCount = 8.4; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'clamped' && /off the control's 1 step — snapped to 8/.test(n.text)) || r.doc.controls.petalCount !== 8) p.push(`off step: ${r.ok ? `${texts(r)} -> ${r.doc.controls.petalCount}` : r.error}`); }
    // slider not a number: invalid, absent
    { const o = base(); o.controls.petalCount = '8'; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'invalid' && /petalCount/.test(n.text)) || 'petalCount' in r.doc.controls) p.push(`a string slider value: ${r.ok ? texts(r) : r.error}`); }
    // choice outside its options: invalid, absent
    { const o = base(); o.controls.placement = 'HELIX'; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'invalid' && /placement.*HELIX/.test(n.text)) || 'placement' in r.doc.controls) p.push(`bad choice: ${r.ok ? texts(r) : r.error}`); }
    // retired id with an exact migration: lands on both, told
    { const o = base(); delete o.controls.stemNodeSwelling; delete o.controls.stemNodeKink; o.controls['stemNodeProminence'] = 0.45; const r = F.readDoc(o);
      const ok = r.ok && r.doc.controls.stemNodeSwelling === 0.45 && r.doc.controls.stemNodeKink === 0.45 && r.notes.some((n) => n.kind === 'migrated' && /stemNodeProminence.*stemNodeSwelling and stemNodeKink/.test(n.text))
        && !r.notes.some((n) => /stemNodeSwelling is missing|stemNodeKink is missing/.test(n.text));   // the migration supplies them, so they are not "missing"
      if (!ok) p.push(`migration: ${r.ok ? `swelling ${r.doc.controls.stemNodeSwelling}, kink ${r.doc.controls.stemNodeKink}; ${texts(r)}` : r.error}`); }
    // retired id AND its replacement: neither applied
    { const o = base(); o.controls['stemNodeProminence'] = 0.45; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'invalid' && /stemNodeProminence is retired AND/.test(n.text)) || 'stemNodeSwelling' in r.doc.controls || 'stemNodeKink' in r.doc.controls) p.push(`retired + replacement: ${r.ok ? `swelling in result ${'stemNodeSwelling' in r.doc.controls}; ${texts(r)}` : r.error}`); }
    // retired id with no migration: told, not applied
    { const o = base(); o.controls['centerStyle'] = 'DISC'; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'retired' && /centerStyle.*not applied/.test(n.text)) || 'centerStyle' in r.doc.controls) p.push(`retired without migration: ${r.ok ? texts(r) : r.error}`); }
    // an entry in a container: told as not applied
    /* a curves entry is told not applied; an overrides entry is READ now
       (Scoping-a) — a well-formed layer entry reads clean and is kept, a tier
       entry reads clean and is APPLIED (F1.1a: a sepal tier is built from it),
       a malformed one is dropped and told; the model's own gate
       (tools/verify-bloom-scopes.mjs, spawned below) carries the rest */
    { const o = base(); o.overrides.layers = [{ layer: 1, offsets: { petalLength: 3 } }]; o.overrides.tiers = [{ tier: 0, offsets: { sepalCup: 0.2 } }]; o.overrides.petals = [{ layer: 1, petalLength: 3 }]; o.curves.spine = [[0, 0]]; const r = F.readDoc(o);
      if (!r.ok || !r.notes.some((n) => n.kind === 'not-applied' && /curves\.spine holds 1 entry/.test(n.text))
        || r.notes.some((n) => /overrides\.tiers/.test(n.text))
        || !r.notes.some((n) => n.kind === 'invalid' && /overrides\.petals\[0\]\.slot/.test(n.text))
        || r.notes.some((n) => /overrides\.layers/.test(n.text))
        || JSON.stringify(r.doc.overrides) !== JSON.stringify({ layers: [{ layer: 1, offsets: { petalLength: 3 } }], petals: [], tiers: [{ tier: 0, offsets: { sepalCup: 0.2 } }] })) p.push(`container entries: ${r.ok ? texts(r) + ' | ' + JSON.stringify(r.doc.overrides) : r.error}`); }
    // a missing container, a missing scope, a scope that is not a list, an unknown scope
    { const o = base(); delete o.curves; delete o.overrides.tiers; o.overrides.petals = 5; o.overrides.flowers = []; const r = F.readDoc(o);
      const want = [['missing', /^curves is missing/], ['missing', /overrides\.tiers is missing/], ['invalid', /overrides\.petals is not a list/], ['unknown', /overrides\.flowers/]];
      for (const [k, re] of want) if (!r.ok || !r.notes.some((n) => n.kind === k && re.test(n.text))) p.push(`containers: no [${k}] note matching ${re} in: ${r.ok ? texts(r) : r.error}`); }
    // the controls group missing entirely
    { const o = base(); delete o.controls; const r = F.readDoc(o);
      if (!r.ok || Object.keys(r.doc.controls).length || !r.notes.some((n) => n.kind === 'missing' && /^controls is missing/.test(n.text))) p.push(`no controls group: ${r.ok ? `${Object.keys(r.doc.controls).length} applied; ${texts(r)}` : r.error}`); }
    rec('F4', p, 'fourteen written-down reader fixtures behave');
  }
  /* F7 — THE CURVE KIND (the curve-editor session). No registry control is a
     curve yet, so F1/F2 cannot see the curve row; this walks the SHIPPED
     writer and reader (`composeControls` / `readControls`) over a one-row
     table for a FIXTURE curve descriptor (`fieldFor`), with values written
     down here. A value is written VERBATIM (an off-grid coordinate survives to
     the bit) and read back identical with no note; a value the spec cannot
     hold is refused WHOLE, absent from the result, and told — never clamped
     point by point. The spec is the test outline's: x 0..1 with both ends
     x-locked, y 0..0.4, a function curve, 2..12 points. */
  {
    const p = [];
    const SPEC = { modes: ['symmetric', 'two-sided'], x: [0, 1], y: [0, 0.4], lock: { first: 'x', last: 'x' }, monotoneX: true, points: [2, 12], owner: 'petalLength' };
    const fx = { id: 'fxCurve', kind: 'curve', curve: SPEC, default: { mode: 'symmetric', points: [[0, 0.1], [1, 0.05]] } };
    const table = [F.fieldFor(fx)];
    const sameCurve = (a, b) => !!a && !!b && a.mode === b.mode && ['points', 'right'].every((k) => (a[k] === undefined && b[k] === undefined) || (Array.isArray(a[k]) && Array.isArray(b[k]) && a[k].length === b[k].length && a[k].every((q, i) => Object.is(q[0], b[k][i][0]) && Object.is(q[1], b[k][i][1]))));
    const trip = (value) => { const txt = JSON.stringify({ controls: F.composeControls({ fxCurve: value }, table) }); const notes = []; const out = F.readControls(JSON.parse(txt).controls, notes, table); return { txt, notes, out }; };
    for (const [what, v] of [
      ['symmetric, an off-grid coordinate', { mode: 'symmetric', points: [[0, 0.08], [0.4512345678901, 0.2234567891], [1, 0.03]] }],
      ['two-sided, its own right side', { mode: 'two-sided', points: [[0, 0.08], [0.5, 0.26], [1, 0.03]], right: [[0, 0.08], [0.62, 0.12], [0.8, 0.1], [1, 0.03]] }],
    ]) {
      const r = trip(v);
      if (r.notes.length) p.push(`${what}: a clean round trip reported ${r.notes.map((n) => n.text).join(' | ')}`);
      if (!sameCurve(r.out.fxCurve, v)) p.push(`${what}: wrote ${r.txt.slice(0, 120)} and read back ${JSON.stringify(r.out.fxCurve)} — not the value, verbatim`);
    }
    const refuse = (what, raw, re) => {
      const notes = []; const out = F.readControls({ fxCurve: raw }, notes, table);
      if ('fxCurve' in out || !notes.some((n) => n.kind === 'invalid' && /not a curve this control can hold/.test(n.text) && re.test(n.text))) p.push(`${what}: not refused whole and told (result ${'fxCurve' in out ? JSON.stringify(out.fxCurve) : 'absent'}; notes ${notes.map((n) => n.text).join(' | ')})`);
    };
    refuse('a point outside the box', { mode: 'symmetric', points: [[0, 0.1], [0.5, 0.9], [1, 0.1]] }, /outside the box/);
    refuse('a mode the spec does not offer', { mode: 'single', points: [[0, 0.1], [1, 0.1]] }, /not offered here/);
    refuse('two-sided with no right side', { mode: 'two-sided', points: [[0, 0.1], [1, 0.1]] }, /no right side/);
    refuse('an unlocked end', { mode: 'symmetric', points: [[0.1, 0.1], [1, 0.1]] }, /must sit at x 0/);
    refuse('points out of order along the length', { mode: 'symmetric', points: [[0, 0.1], [0.6, 0.2], [0.4, 0.2], [1, 0.1]] }, /not past point/);
    refuse('a field that is not a curve\'s', { mode: 'symmetric', points: [[0, 0.1], [1, 0.1]], tension: 0.5 }, /"tension" is not a field/);
    refuse('a string', 'M0 0 L1 1', /not a curve value/);
    rec('F7', p, 'the curve kind: two values round-trip verbatim (an off-grid coordinate to the bit, a two-sided right side whole) with no note, and seven a spec cannot hold are refused whole and told');
  }
  /* F8 — THE LIVE CURVE CONTROL (F3-global, the spine curve). `petalSpineCurve`
     is the first registry row of kind curve, so the SHIPPED document walkers
     (`composeDoc` / `readDoc`, over CONTROL_FIELDS) now carry a curve: a hooked
     spine in CURVE mode round-trips verbatim with no note (every coordinate to
     the bit, the mode with it), a curve outside the spine's box is refused
     WHOLE and told with the page keeping its curve, and the control is a field
     of the file (F0's census would say otherwise, but this says it by name). */
  {
    const p = [];
    const c = REG.CONTROLS.find((x) => x.id === 'petalSpineCurve');
    if (!c || c.kind !== 'curve') p.push(`petalSpineCurve is ${c ? `of kind ${c.kind}` : 'not a registry control'}`);
    else {
      const hook = { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.75, 0.45], [0.5, 0.6], [0.3, 0.45]] };
      const st = { ...REG.DEFAULTS, petalCurlMode: 'CURVE', petalSpineCurve: hook };
      const r = F.readDoc(JSON.parse(F.toText(F.composeDoc(st, { savedAt: 'x' }))));
      if (!r.ok) p.push(`the hooked spine's document did not read: ${JSON.stringify(r.notes)}`);
      else {
        if (r.notes.length) p.push(`a clean round trip of the hooked spine reported ${r.notes.map((n) => n.text).join(' | ')}`);
        const back = r.doc.controls.petalSpineCurve;
        const same = back && back.mode === hook.mode && back.points.length === hook.points.length && back.points.every((q, i) => Object.is(q[0], hook.points[i][0]) && Object.is(q[1], hook.points[i][1])) && back.right === undefined;
        if (!same) p.push(`the hooked spine read back as ${JSON.stringify(back)}`);
        if (r.doc.controls.petalCurlMode !== 'CURVE') p.push(`the curl mode read back as ${JSON.stringify(r.doc.controls.petalCurlMode)}`);
      }
      const doc = JSON.parse(F.toText(F.composeDoc(REG.DEFAULTS, { savedAt: 'x' })));
      doc.controls.petalSpineCurve = { mode: 'single', points: [[0, 0], [0.5, 1.4], [1, 0.2]] };
      const r2 = F.readDoc(doc);
      if (!r2.ok) p.push(`a document with an out-of-box spine did not read at all: ${JSON.stringify(r2.notes)}`);
      else {
        if ('petalSpineCurve' in r2.doc.controls) p.push(`an out-of-box spine was applied as ${JSON.stringify(r2.doc.controls.petalSpineCurve)} rather than refused whole`);
        if (!r2.notes.some((n) => n.kind === 'invalid' && /petalSpineCurve.*not a curve this control can hold.*outside the box/.test(n.text))) p.push(`the refusal was not told: ${r2.notes.map((n) => n.text).join(' | ')}`);
      }
      if (!F.CONTROL_FIELDS.some((f) => f.control === 'petalSpineCurve' && f.kind === 'curve')) p.push('petalSpineCurve is not a curve field of the file');
    }
    rec('F8', p, 'the live spine curve: a hooked spine in CURVE mode round-trips verbatim through the shipped document walkers with no note; an out-of-box spine is refused whole and told; the control is a curve field of the file');
  }
  /* F9 — THE OUTLINE CURVE (F6-sym). `petalOutlineCurve` is the second
     registry curve: a spoon-shaped outline in CURVE mode round-trips verbatim
     (every coordinate to the bit, the mode with it) with no note; an outline
     whose points go back along the length is refused WHOLE and told, the page
     keeping its curve; and the control is a curve field of the file. */
  {
    const p = [];
    const c = REG.CONTROLS.find((x) => x.id === 'petalOutlineCurve');
    if (!c || c.kind !== 'curve') p.push(`petalOutlineCurve is ${c ? `of kind ${c.kind}` : 'not a registry control'}`);
    else {
      const spoon = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05123], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
      const st = { ...REG.DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: spoon };
      const r = F.readDoc(JSON.parse(F.toText(F.composeDoc(st, { savedAt: 'x' }))));
      if (!r.ok) p.push(`the spoon outline's document did not read: ${JSON.stringify(r.notes)}`);
      else {
        if (r.notes.length) p.push(`a clean round trip of the spoon outline reported ${r.notes.map((n) => n.text).join(' | ')}`);
        const back = r.doc.controls.petalOutlineCurve;
        const same = back && back.mode === spoon.mode && back.points.length === spoon.points.length && back.points.every((q, i) => Object.is(q[0], spoon.points[i][0]) && Object.is(q[1], spoon.points[i][1])) && back.right === undefined;
        if (!same) p.push(`the spoon outline read back as ${JSON.stringify(back)}`);
        if (r.doc.controls.petalOutlineMode !== 'CURVE') p.push(`the outline mode read back as ${JSON.stringify(r.doc.controls.petalOutlineMode)}`);
      }
      const doc = JSON.parse(F.toText(F.composeDoc(REG.DEFAULTS, { savedAt: 'x' })));
      doc.controls.petalOutlineCurve = { mode: 'symmetric', points: [[0, 0.1], [0.6, 0.2], [0.4, 0.15], [1, 0]] };
      const r2 = F.readDoc(doc);
      if (!r2.ok) p.push(`a document with an out-of-order outline did not read at all: ${JSON.stringify(r2.notes)}`);
      else {
        if ('petalOutlineCurve' in r2.doc.controls) p.push(`an out-of-order outline was applied as ${JSON.stringify(r2.doc.controls.petalOutlineCurve)} rather than refused whole`);
        if (!r2.notes.some((n) => n.kind === 'invalid' && /petalOutlineCurve.*not a curve this control can hold.*not past point/.test(n.text))) p.push(`the refusal was not told: ${r2.notes.map((n) => n.text).join(' | ')}`);
      }
      if (!F.CONTROL_FIELDS.some((f) => f.control === 'petalOutlineCurve' && f.kind === 'curve')) p.push('petalOutlineCurve is not a curve field of the file');
    }
    rec('F9', p, 'the outline curve: a spoon outline in CURVE mode round-trips verbatim through the shipped document walkers with no note; an out-of-order outline is refused whole and told; the control is a curve field of the file');
  }
  /* F11 — THE ASYMMETRIC OUTLINE (F6-asym). The file carries the mode and BOTH
     halves: a two-sided outline round-trips verbatim (mode, left, right, every
     coordinate to the bit) with no note; a #417 / #418 symmetric outline —
     written exactly as those trees wrote it, with no `right` key — loads as
     SYMMETRIC, unchanged and untold; and a two-sided outline whose RIGHT half
     goes back along the length is refused whole and told (the right half is
     held to the same shape rule as the left). */
  {
    const p = [];
    const sameSide = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((q, i) => Object.is(q[0], b[i][0]) && Object.is(q[1], b[i][1]));
    const asym = { mode: 'two-sided', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]], right: [[0, 0.05], [0.2, 0.09123], [0.5, 0.12], [0.8, 0.08], [1, 0]] };
    const r = F.readDoc(JSON.parse(F.toText(F.composeDoc({ ...REG.DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: asym }, { savedAt: 'x' }))));
    if (!r.ok) p.push(`the asymmetric outline's document did not read: ${JSON.stringify(r.notes)}`);
    else {
      if (r.notes.length) p.push(`a clean round trip of the asymmetric outline reported ${r.notes.map((n) => n.text).join(' | ')}`);
      const back = r.doc.controls.petalOutlineCurve;
      if (!(back && back.mode === 'two-sided' && sameSide(back.points, asym.points) && sameSide(back.right, asym.right))) p.push(`the asymmetric outline read back as ${JSON.stringify(back)}`);
    }
    const old = JSON.parse(F.toText(F.composeDoc({ ...REG.DEFAULTS, petalOutlineMode: 'CURVE' }, { savedAt: 'x' })));
    old.controls.petalOutlineCurve = { mode: 'symmetric', points: [[0, 0.03], [0.35, 0.05], [0.65, 0.2], [0.85, 0.22], [0.96, 0.12], [1, 0]] };
    const r1 = F.readDoc(old);
    if (!r1.ok || r1.notes.length) p.push(`a #417-shaped symmetric outline did not load clean: ${JSON.stringify(r1.notes)}`);
    else {
      const b1 = r1.doc.controls.petalOutlineCurve;
      if (!(b1 && b1.mode === 'symmetric' && b1.right === undefined && sameSide(b1.points, old.controls.petalOutlineCurve.points))) p.push(`a #417-shaped symmetric outline loaded as ${JSON.stringify(b1)}`);
    }
    const bad = JSON.parse(F.toText(F.composeDoc(REG.DEFAULTS, { savedAt: 'x' })));
    bad.controls.petalOutlineCurve = { mode: 'two-sided', points: asym.points, right: [[0, 0.05], [0.6, 0.1], [0.4, 0.12], [1, 0]] };
    const r2 = F.readDoc(bad);
    if (!r2.ok) p.push(`a document with a bad right half did not read at all: ${JSON.stringify(r2.notes)}`);
    else {
      if ('petalOutlineCurve' in r2.doc.controls) p.push(`a bad right half was applied as ${JSON.stringify(r2.doc.controls.petalOutlineCurve)} rather than refused whole`);
      if (!r2.notes.some((n) => n.kind === 'invalid' && /petalOutlineCurve.*right side.*not past point/.test(n.text))) p.push(`the bad right half was not told: ${r2.notes.map((n) => n.text).join(' | ')}`);
    }
    rec('F11', p, 'the asymmetric outline: mode and both halves round-trip verbatim with no note; a #417 symmetric outline loads unchanged as symmetric; a bad right half is refused whole and told');
  }
  /* F13 — PER-SCOPE OUTLINES (F6-scope). A layer entry and a petal entry each
     OWNING an outline (`values`: the mode, an asymmetric curve) round-trip
     verbatim — every coordinate to the bit, the ownership (which keys each
     entry carries) intact, offsets beside them untouched — with no note; a
     file written before the field (#417-#420: entries with offsets only, the
     outline under `controls`) loads with no note and no `values` invented; a
     value this control cannot hold, a value for a non-value control and one for
     sheet thickness are each refused and told, and a tier's values are told
     not applied. */
  {
    const p = [];
    const sameSide = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((q, i) => Object.is(q[0], b[i][0]) && Object.is(q[1], b[i][1]));
    const asym = { mode: 'two-sided', points: [[0, 0.05], [0.2, 0.2], [0.5, 0.3], [0.8, 0.2], [1, 0]], right: [[0, 0.04], [0.3, 0.06], [0.7, 0.05123], [1, 0]] };
    const sym = { mode: 'symmetric', points: [[0, 0.03], [0.4, 0.22], [0.45, 0.25], [0.5, 0.22], [1, 0]] };
    const scopes = {
      layers: [{ layer: 1, offsets: { petalCup: 0.4 }, values: { petalOutlineMode: 'CURVE', petalOutlineCurve: sym } }],
      petals: [{ layer: 0, slot: 2, offsets: {}, values: { petalOutlineCurve: asym } }],
      tiers: [],
    };
    const r = F.readDoc(JSON.parse(F.toText(F.composeDoc({ ...REG.DEFAULTS, petalOutlineMode: 'LAW' }, { savedAt: 'x', scopes }))));
    if (!r.ok) p.push(`a per-scope outline document did not read: ${JSON.stringify(r.notes)}`);
    else {
      if (r.notes.length) p.push(`a clean round trip of per-scope outlines reported ${r.notes.map((n) => n.text).join(' | ')}`);
      const L = r.doc.overrides.layers[0], P = r.doc.overrides.petals[0];
      if (!L || L.layer !== 1 || L.offsets.petalCup !== 0.4 || !L.values || Object.keys(L.values).join() !== 'petalOutlineMode,petalOutlineCurve' || L.values.petalOutlineMode !== 'CURVE'
        || !(L.values.petalOutlineCurve && L.values.petalOutlineCurve.mode === 'symmetric' && sameSide(L.values.petalOutlineCurve.points, sym.points) && L.values.petalOutlineCurve.right === undefined)) p.push(`the layer's owned outline read back as ${JSON.stringify(L)}`);
      if (!P || P.layer !== 0 || P.slot !== 2 || !P.values || Object.keys(P.values).join() !== 'petalOutlineCurve'
        || !(P.values.petalOutlineCurve && P.values.petalOutlineCurve.mode === 'two-sided' && sameSide(P.values.petalOutlineCurve.points, asym.points) && sameSide(P.values.petalOutlineCurve.right, asym.right))) p.push(`the pair's owned curve read back as ${JSON.stringify(P)}`);
      if (r.doc.controls.petalOutlineMode !== 'LAW') p.push(`the whole bloom's mode read back as ${r.doc.controls.petalOutlineMode} — a scope's value leaked into the global`);
    }
    /* a #417-#420 file: offsets only, the outline under controls */
    const old = JSON.parse(F.toText(F.composeDoc({ ...REG.DEFAULTS, petalOutlineMode: 'CURVE', petalOutlineCurve: asym, scopeLayers: 'ON', layerCount: 3 }, { savedAt: 'x', scopes: { layers: [{ layer: 2, offsets: { petalCup: 0.4 } }], petals: [], tiers: [] } })));
    if (old.overrides.layers.some((e) => 'values' in e)) p.push('the writer invented a `values` key for an entry that owns none');
    const r1 = F.readDoc(old);
    if (!r1.ok || r1.notes.length) p.push(`a #420-shaped file did not load clean: ${JSON.stringify(r1.ok ? r1.notes : r1.error)}`);
    else if (r1.doc.overrides.layers.some((e) => 'values' in e)) p.push(`a #420-shaped file's entries came back with values: ${JSON.stringify(r1.doc.overrides.layers)}`);
    const bad = JSON.parse(F.toText(F.composeDoc(REG.DEFAULTS, { savedAt: 'x' })));
    bad.overrides = { layers: [{ layer: 0, offsets: {}, values: { petalOutlineMode: 'BOGUS', petalCup: 1, sheetThickness: 2, petalOutlineCurve: { mode: 'symmetric', points: [[0, 0.1], [0.6, 0.2], [0.4, 0.15], [1, 0]] } } }], petals: [], tiers: [{ tier: 0, offsets: {}, values: { petalOutlineMode: 'CURVE' } }] };
    const r2 = F.readDoc(bad);
    if (!r2.ok) p.push(`a document with bad scope values did not read: ${r2.error}`);
    else {
      if (r2.doc.overrides.layers[0] && r2.doc.overrides.layers[0].values) p.push(`bad scope values were applied: ${JSON.stringify(r2.doc.overrides.layers[0].values)}`);
      for (const re of [/values\.petalOutlineMode.*not one of/, /values\.petalCup.*only petalOutlineMode/, /values\.sheetThickness.*never scoped/, /values\.petalOutlineCurve.*not a curve/, /tiers\[0\]\.values.*not applied/])
        if (!r2.notes.some((n) => re.test(n.text))) p.push(`not told: ${re} — ${r2.notes.map((n) => n.text).join(' | ')}`);
    }
    rec('F13', p, 'per-scope outlines: a layer and a pair owning a mode and curves round-trip verbatim, ownership and offsets intact, with no note; a #417-#420 file loads clean with no values invented; bad values (a bad choice, a non-value control, sheet thickness, a bad curve) are refused and told, a tier\'s told not applied');
  }
}

/* ---------------- the browser clauses ---------------- */
async function browserClauses(port, rec, bloomFileOverride = null) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-design-'));
  const { browser, page } = await H.launchPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    if (bloomFileOverride) await page.route('**/bloom-file.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: bloomFileOverride }));
    await H.openBloom(page, port);
    const ids = REG.CONTROLS.map((c) => c.id);
    const SETS = [{ id: 'petalCount', value: '12' }, { id: 'petalCup', value: '0.6' }, { id: 'placement', value: 'SPIRAL' }, { id: 'stemLength', value: '40' }];
    const state = () => page.evaluate(() => window.__bloomUIState());
    const status = () => page.evaluate(() => { const el = document.getElementById('designStatus'); return { hidden: el.hidden, text: el.textContent }; });
    /* the controls render */
    {
      const p = [];
      const ui = await page.evaluate(() => ({ save: !!document.getElementById('saveDesign'), file: !!document.getElementById('designFile'), label: !!document.querySelector('label[for="designFile"]'), status: !!document.getElementById('designStatus'), inPanel: !!document.querySelector('.bl-panel #saveDesign') && !document.querySelector('#panelControls #saveDesign') }));
      for (const [k, v] of Object.entries(ui)) if (!v) p.push(`${k} is not on the page as expected`);
      rec('F5 render', p, 'Save, the Load file input and its label, and the status line render in the panel, outside the registry’s own controls');
    }
    const bad = await H.applyConfig(page, SETS);
    if (bad.length) throw new Error(`applyConfig: ${bad.join('; ')}`);
    const before = await state();
    const stlBefore = await H.exportStl(page, tmp);
    /* the save census */
    const saved = await page.evaluate(() => window.__bloomDesign.save());
    {
      const p = [];
      let obj = null; try { obj = JSON.parse(saved); } catch (e) { p.push(`the save is not JSON: ${e.message}`); }
      if (obj) {
        const keys = Object.keys(obj.controls || {});
        if (JSON.stringify(keys) !== JSON.stringify(ids)) p.push(`the save's controls keys are not the registry's ids in order: ${keys.length} against ${ids.length}; first difference at ${keys.findIndex((k, i) => k !== ids[i])}`);
        for (const c of REG.CONTROLS) if (!same(c, obj.controls[c.id], before[c.id])) { p.push(`controls.${c.id} saved as ${JSON.stringify(obj.controls[c.id])} where the page holds ${JSON.stringify(before[c.id])}`); break; }
        if (obj.format !== CENSUS.format || obj.version !== CENSUS.version) p.push(`format/version ${obj.format}/${obj.version}`);
        for (const k of CENSUS.top) if (!(k in obj)) p.push(`the save lacks ${k}`);
        if (obj.controls.petalCount !== 12 || obj.controls.placement !== 'SPIRAL') p.push(`the save does not carry the driven values (petalCount ${obj.controls.petalCount}, placement ${obj.controls.placement})`);
      }
      rec('F5 save', p, `the page's own save carries exactly the ${ids.length} registry ids, verbatim`);
    }
    /* a load of the page's own save: nothing reported, nothing moved */
    {
      const p = [];
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'own-save.json'), saved);
      await H.settleBuild(page);
      if (r.action !== 'loaded') p.push(`load reported ${r.action}: ${r.error}`);
      else { if (r.notes.length) p.push(`a clean load reported ${r.notes.length} note(s): ${r.notes.slice(0, 3).map((n) => n.text).join(' | ')}`); if (r.applied !== ids.length) p.push(`${r.applied} of ${ids.length} controls set`); }
      const after = await state();
      for (const c of REG.CONTROLS) if (!same(c, after[c.id], before[c.id])) { p.push(`${c.id} moved ${JSON.stringify(before[c.id])} -> ${JSON.stringify(after[c.id])} on a load of the page's own save`); break; }
      const s = await status();
      if (s.hidden || !/every field read clean, nothing to report/.test(s.text)) p.push(`the status line reads "${s.text.slice(0, 120)}"`);
      rec('F5 own save', p, 'a load of the page’s own save reports nothing and moves no control');
    }
    /* a load that changes a control */
    {
      const p = [];
      const o = JSON.parse(saved); o.controls.petalCount = 5; o.controls.placement = 'RADIAL';
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'changed.json'), JSON.stringify(o));
      await H.settleBuild(page);
      const after = await state();
      if (r.action !== 'loaded' || r.notes.length) p.push(`load: ${r.action}, ${r.notes && r.notes.length} notes`);
      if (after.petalCount !== 5 || after.placement !== 'RADIAL') p.push(`the page holds petalCount ${after.petalCount}, placement ${after.placement}`);
      const m = await page.evaluate(() => window.__bloomMetrics());
      if (m.petalsBuilt !== 5) p.push(`the builder built ${m.petalsBuilt} petals after a load asking for 5`);
      rec('F5 changed', p, 'a load that changes two controls moves the page’s state and the built geometry');
    }
    /* a missing field keeps the page's value and is told */
    {
      const p = [];
      const o = JSON.parse(saved); delete o.controls.petalCount;   // the save holds 12; the page holds 5
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'missing.json'), JSON.stringify(o));
      await H.settleBuild(page);
      const after = await state();
      if (after.petalCount !== 5) p.push(`petalCount is ${after.petalCount} after a load whose file lacks it — it was 5 and must stay 5`);
      if (r.action !== 'loaded' || !r.notes.some((n) => n.kind === 'missing' && /petalCount/.test(n.text))) p.push(`no [missing] note for petalCount: ${JSON.stringify(r.notes)}`);
      if (r.applied !== ids.length - 1) p.push(`${r.applied} applied, expected ${ids.length - 1}`);
      const s = await status();
      if (!/\[missing\] controls\.petalCount is missing/.test(s.text)) p.push(`the status line does not say so: "${s.text.slice(0, 160)}"`);
      rec('F5 missing', p, 'a missing field keeps the page’s own value and is reported on the status line');
    }
    /* a retired id migrates onto both halves on the page */
    {
      const p = [];
      const o = JSON.parse(saved); delete o.controls.stemNodeSwelling; delete o.controls.stemNodeKink; o.controls['stemNodeProminence'] = 0.35;
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'retired.json'), JSON.stringify(o));
      await H.settleBuild(page);
      const after = await state();
      if (after.stemNodeSwelling !== 0.35 || after.stemNodeKink !== 0.35) p.push(`the page holds swelling ${after.stemNodeSwelling}, kink ${after.stemNodeKink}`);
      if (!r.notes.some((n) => n.kind === 'migrated')) p.push(`no [migrated] note: ${JSON.stringify(r.notes)}`);
      rec('F5 migrated', p, 'stemNodeProminence lands on swelling AND kink through the page, and is told');
    }
    /* a newer version is refused on the status line and moves nothing */
    {
      const p = [];
      const prior = await state();
      const o = JSON.parse(saved); o.version = CENSUS.version + 1; o.controls.petalCount = 30;
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'newer.json'), JSON.stringify(o));
      await H.settleBuild(page);
      const after = await state();
      if (r.action !== 'refused') p.push(`a newer version was ${r.action}`);
      for (const c of REG.CONTROLS) if (!same(c, after[c.id], prior[c.id])) { p.push(`${c.id} moved on a refused load`); break; }
      const s = await status();
      if (!/could not load newer\.json: this file is version 2/.test(s.text)) p.push(`the status line reads "${s.text.slice(0, 160)}"`);
      rec('F5 newer', p, 'a newer version is refused whole, on the status line, and moves nothing');
    }
    /* the real file input, and a real drop */
    {
      const p = [];
      const o = JSON.parse(saved); o.controls.petalCount = 9;
      const fp = path.join(tmp, 'design-nine.json'); fs.writeFileSync(fp, JSON.stringify(o));
      await page.setInputFiles('#designFile', fp);
      await page.waitForFunction(() => { const d = window.__bloomDesign.last(); return d && d.name === 'design-nine.json'; }, { timeout: 15000 }).catch(() => null);
      await H.settleBuild(page);
      let after = await state();
      const last = await page.evaluate(() => window.__bloomDesign.last());
      if (after.petalCount !== 9 || !last || last.name !== 'design-nine.json' || last.action !== 'loaded') p.push(`the file input: petalCount ${after.petalCount}, last ${JSON.stringify(last && { name: last.name, action: last.action })}`);
      o.controls.petalCount = 11;
      await page.evaluate((txt) => {
        const f = new File([txt], 'dropped.json', { type: 'application/json' });
        const dt = new DataTransfer(); dt.items.add(f);
        window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      }, JSON.stringify(o));
      await page.waitForFunction(() => { const d = window.__bloomDesign.last(); return d && d.name === 'dropped.json'; }, { timeout: 15000 }).catch(() => null);
      await H.settleBuild(page);
      after = await state();
      const last2 = await page.evaluate(() => window.__bloomDesign.last());
      if (after.petalCount !== 11 || !last2 || last2.name !== 'dropped.json') p.push(`the drop: petalCount ${after.petalCount}, last ${JSON.stringify(last2 && { name: last2.name, action: last2.action })}`);
      rec('F5 input+drop', p, 'the real file input and a real DragEvent drop both load a design');
    }
    /* save -> reset -> load exports the same bytes */
    {
      const p = [];
      await page.evaluate((t) => window.__bloomDesign.load(t, 'own-save.json'), saved);
      await H.settleBuild(page);
      await page.click('#resetBtn');
      await H.settleBuild(page);
      const resetState = await state();
      if (resetState.petalCount !== REG.DEFAULTS.petalCount) p.push(`reset did not reset (petalCount ${resetState.petalCount})`);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#saveDesign')]);
      const fp = path.join(tmp, dl.suggestedFilename()); await dl.saveAs(fp);
      const resetDoc = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (dl.suggestedFilename() !== 'bloom-design.json') p.push(`the Save button downloaded ${dl.suggestedFilename()}`);
      if (resetDoc.controls.petalCount !== REG.DEFAULTS.petalCount) p.push('the downloaded file does not describe the reset page');
      const r = await page.evaluate((t) => window.__bloomDesign.load(t, 'own-save.json'), saved);
      await H.settleBuild(page);
      if (r.notes.length) p.push(`the reload reported ${r.notes.length} note(s)`);
      const stlAfter = await H.exportStl(page, tmp);
      if (!stlBefore || !stlAfter) p.push(`an export did not download (before ${!!stlBefore}, after ${!!stlAfter})`);
      else if (!stlBefore.equals(stlAfter)) p.push(`the STL after save → reset → load differs from the STL before (${stlBefore.length} against ${stlAfter.length} bytes)`);
      rec('F5 bytes', p, `save → reset → load exports ${stlBefore ? stlBefore.length.toLocaleString('en-US') : '?'} STL bytes identical to before`);
    }
    if (errors.length) rec('F5 errors', errors, '');
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ---------------- the mutants ---------------- */
const MUTANTS = [
  /* EVERY MUTANT ACTS ON petalCount. F3 can only see a field that is dropped
     where the row's value is OFF the default — `{...DEFAULTS, ...read}` is
     what a fresh page does with a missing field — so ALL MIN (petalCount 3)
     is among the byte rows for that reason and no other. The `F5 *` claims
     are consequences on the page: a save without petalCount restores the
     reset value, a reader that never reads it leaves every load short. */
  { id: 'a-dropped-field-on-write', breaks: ['F1', 'F2', 'F3', 'F5 save', 'F5 own save', 'F5 bytes', 'F8', 'F9', 'F11'],
    /* re-anchored by the curve-editor session: the writer's loop moved into
       `composeControls` (one walker for the registry's table and a test
       table) — the same mutation, on the line that now does the writing */
    from: '    controls[f.key] = state && k ? k.write(state[f.control]) : undefined;',
    to: "    if (f.key !== 'petalCount') controls[f.key] = state && k ? k.write(state[f.control]) : undefined;" },
  { id: 'a-skipped-field-on-read', breaks: ['F1', 'F2', 'F3', 'F4', 'F5 own save', 'F5 changed', 'F5 missing', 'F5 input+drop', 'F5 bytes'],
    from: "    if (!has(f.key)) { notes.push(note('missing', `controls.${f.key} is missing — the page keeps the value it has`)); continue; }",
    to: "    if (f.key === 'petalCount') continue;\n    if (!has(f.key)) { notes.push(note('missing', `controls.${f.key} is missing — the page keeps the value it has`)); continue; }" },
  { id: 'a-missing-field-is-defaulted', breaks: ['F4', 'F5 missing'],
    from: "    if (!has(f.key)) { notes.push(note('missing', `controls.${f.key} is missing — the page keeps the value it has`)); continue; }",
    to: "    if (!has(f.key)) { out[f.key] = controlOf.get(f.control).default; continue; }" },
  { id: 'a-newer-version-is-read', breaks: ['F4', 'F5 newer'],
    from: '  if (v > VERSION) return { ok: false,',
    to: '  if (v > VERSION + 1) return { ok: false,' },
  { id: 'a-retired-id-is-not-migrated', breaks: ['F4', 'F5 migrated'],
    from: "    if (!Array.isArray(r.migrateTo)) { notes.push(note('retired',",
    to: "    if (true) { notes.push(note('retired'," },
  { id: 'a-table-row-is-removed', breaks: ['F0', 'F1', 'F2', 'F3', 'F4', 'F5 save', 'F5 own save', 'F5 changed', 'F5 missing', 'F5 input+drop', 'F5 bytes'],
    from: 'export const CONTROL_FIELDS = Object.freeze(CONTROLS.map(',
    to: "export const CONTROL_FIELDS = Object.freeze(CONTROLS.filter((c) => c.id !== 'petalCount').map(" },
  /* THE CURVE KIND'S ROW (the curve-editor session): a writer that drops a
     curve value. No registry control is a curve yet, so only F7's fixture
     can see it — which is why F7 exists. */
  /* F3-global: with a LIVE curve control in the registry, dropping the kind's
     writer also reddens the round trip (F1/F2) and the spine-curve rows (F8),
     not only the kinds census. F6-asym: and F11, the asymmetric outline's own
     round trip, for the same reason (this mutant and the dropped-field one above
     were run in CI before F11 had them listed — the first thing the sweep said). */
  /* F6-scope: an owned value dropped on the way out, and one dropped on the way in */
  { id: 'scope-values-are-not-written', breaks: ['F13'],
    from: '    if (e.values && Object.keys(e.values).length) {\n      out.values = {};',
    to: '    if (false) {\n      out.values = {};' },
  { id: 'scope-values-are-not-read', breaks: ['F13'],
    from: '      if (Object.keys(vals).length) out.values = vals;',
    to: '      if (false) out.values = vals;' },
  { id: 'the-curve-kind-is-not-written', breaks: ['F7', 'F1', 'F2', 'F8', 'F9', 'F11', 'F13', 'F5 save', 'F5 own save', 'F5 changed', 'F5 missing', 'F5 bytes'],
    from: '    write: (v) => (v === undefined ? undefined : cloneCurve(v)),',
    to: '    write: () => undefined,' },
];
function mutate(src, m) {
  const n = src.split(m.from).length - 1;
  if (n !== 1) throw new Error(`mutant ${m.id}: anchor matches ${n} times, not once`);
  return src.replace(m.from, m.to);
}

/* ---------------- run ---------------- */
async function runAll(F, port, override) {
  const results = [];
  const rec = (clause, problems, detail) => results.push({ clause, ok: !problems.length, detail: problems.length ? problems.slice(0, 6).join('; ') : detail });
  await nodeClauses(F, rec);
  if (!NO_BROWSER) await browserClauses(port, rec, override);
  return results;
}
const print = (results) => { for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.clause}: ${r.detail}`); };

/* F6 — the scope model's gate, as its own process with its own verdict line,
   before anything else runs: a model whose gate is red has no business in a
   round trip. `--mutant=` scopes OUR mutants, so the spawn is skipped then. */
if (!ONLY.length) {
  const { spawnSync } = await import('node:child_process');
  const args = [path.join(ROOT, 'tools/verify-bloom-scopes.mjs'), ...(NEGATIVE ? ['--negative-control'] : NO_BROWSER ? [] : ['--browser'])];
  console.log(`F6 — spawning node ${args.map((a) => path.relative(ROOT, a) || a).join(' ')}`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status !== 0) { console.log(`\nDESIGN FILE GATE: FAIL — F6: the scope model's gate exited ${r.status}`); process.exit(1); }
  /* F10 — THE OUTLINE WIDTH GATE (F6-sym-2), spawned for F6's reason: a
     browser witness that the Petal width drag asks the outline's validator
     (tools/verify-bloom-outline-width.mjs, WD0-WD2 and its must-fails). */
  if (!NO_BROWSER) {
    const a10 = [path.join(ROOT, 'tools/verify-bloom-outline-width.mjs'), ...(NEGATIVE ? ['--negative-control'] : [])];
    console.log(`F10 — spawning node ${a10.map((a) => path.relative(ROOT, a) || a).join(' ')}`);
    const r10 = spawnSync(process.execPath, a10, { stdio: 'inherit' });
    if (r10.status !== 0) { console.log(`\nDESIGN FILE GATE: FAIL — F10: the outline width gate exited ${r10.status}`); process.exit(1); }
  }
  /* F12 — THE ASYMMETRIC MODE'S EQUAL-HALVES IDENTITY (F6-asym), spawned for
     F6's reason: a file saved Asymmetric with equal halves must build the
     Symmetric bloom to the bit, in both modes (tools/verify-bloom-outline-asym-
     equal.mjs; its --control is part of the run). Node only, so it runs under
     --no-browser too; the negative control has its own mutants and skips it. */
  if (!NEGATIVE) {
    const a12 = [path.join(ROOT, 'tools/verify-bloom-outline-asym-equal.mjs'), '--control'];
    console.log(`F12 — spawning node ${a12.map((a) => path.relative(ROOT, a) || a).join(' ')}`);
    const r12 = spawnSync(process.execPath, a12, { stdio: 'inherit' });
    if (r12.status !== 0) { console.log(`\nDESIGN FILE GATE: FAIL — F12: the equal-halves identity exited ${r12.status}`); process.exit(1); }
  }
}

let server = null, port = null;
if (!NO_BROWSER) ({ server, port } = await H.serveRepo());
let exit = 0;
try {
  if (!NEGATIVE) {
    const F = await load('bloom-file.js');
    const results = await runAll(F, port, null);
    print(results);
    const failed = results.filter((r) => !r.ok);
    console.log(failed.length ? `\nDESIGN FILE GATE: FAIL — ${failed.length} clause(s)` : `\nDESIGN FILE GATE: PASS — ${results.length} clauses${NO_BROWSER ? ' (Node only; --no-browser)' : ''}`);
    exit = failed.length ? 1 : 0;
  } else {
    const src = fs.readFileSync(path.join(ROOT, 'bloom-file.js'), 'utf8');
    for (const m of MUTANTS) mutate(src, m);   // every anchor, before any mutant runs
    console.log(`anchors: all ${MUTANTS.length} mutants match exactly once`);
    const run = ONLY.length ? MUTANTS.filter((m) => ONLY.includes(m.id)) : MUTANTS;
    let failed = false;
    for (const m of run) {
      const body = mutate(src, m);
      const tmpName = `bloom-file.__mutant_${m.id.replace(/[^a-z0-9]/gi, '_')}.js`;
      const tmpPath = path.join(ROOT, tmpName);   // in the repo root, so `./bloom-registry.js` resolves
      fs.writeFileSync(tmpPath, body);
      let results;
      try { results = await runAll(await load(tmpName), port, body); } finally { fs.unlinkSync(tmpPath); }
      const red = results.filter((r) => !r.ok).map((r) => r.clause);
      const want = NO_BROWSER ? m.breaks.filter((b) => !b.startsWith('F5')) : m.breaks;
      const missed = want.filter((b) => !red.includes(b));
      const unclaimed = red.filter((b) => !want.includes(b) && b !== 'F5 errors');
      const okM = !missed.length && !unclaimed.length;
      if (!okM) failed = true;
      console.log(`${okM ? 'ok  ' : 'FAIL'} ${m.id}: reddened [${red.join(', ')}]${missed.length ? `; MISSED [${missed.join(', ')}]` : ''}${unclaimed.length ? `; UNCLAIMED [${unclaimed.join(', ')}]` : ''}`);
    }
    console.log(failed ? '\nNEGATIVE CONTROL: FAILED' : `\nNEGATIVE CONTROL: PASS — ${run.length}${ONLY.length ? ` of ${MUTANTS.length} (a SUBSET)` : ''} mutants each reddened exactly the clauses they name`);
    exit = failed ? 1 : 0;
  }
} finally {
  if (server) server.close();
}
process.exit(exit);
