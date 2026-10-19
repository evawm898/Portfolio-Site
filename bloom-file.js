// bloom-file.js — the bloom DESIGN file: what /bloom saves, and how it reads one back.
//
// THE MODEL IS /plot's COMPOSITION FILE (plot-file.js), and its four rules are
// carried over whole, because the trap is the same: a restore that silently does
// not restore something is invisible, and the page looks plausible either way.
//
//   1. ONE FIELD TABLE, WALKED BY BOTH DIRECTIONS. `composeDoc` writes the
//      controls by iterating `CONTROL_FIELDS` and `readDoc` reads them by
//      iterating the same table, so a field cannot be written and not read.
//      The table is DERIVED from the registry's own CONTROLS array — one row
//      per control, never a hand-written second list of two hundred ids (the
//      registration rule) — and what it says is checked against the REGISTRY
//      in the gate: every registry control is a field of the file or a named
//      exception in `CONTROL_EXCEPTIONS`. A row that vanished from the table
//      would round-trip cleanly while losing its control; the registry is the
//      independent census that sees it.
//   2. EVERY SCALAR IN THE FILE IS A CONTROL'S OWN VALUE, VERBATIM — a slider's
//      number, a choice's option string, as `readUI()` holds them. Nothing is
//      converted, rescaled or renamed on the way in or out, and the BOUNDS are
//      the registry row's own `min` / `max` / `step` / `options`, read at the
//      moment of reading, so this file holds none of them and cannot drift.
//   3. A MISSING FIELD IS REPORTED AND THE PAGE KEEPS WHAT IT HAS. Never
//      defaulted: defaulting a field the writer forgot produces a page that
//      looks restored, which is the exact failure. Every departure from a
//      clean read — missing, unknown, clamped, snapped, invalid, retired,
//      migrated, not applied — comes back as a note, so "a clean round trip
//      reports nothing" is a check rather than a hope.
//   4. A NEWER VERSION IS REFUSED, NOT PARTLY READ.
//
// A RETIRED ID LOADS THROUGH `RETIRED_IDS`' OWN `migrateTo` (rule 3 of the
// brief, and the registry's own standing obligation: "the first feature that
// persists a design applies migrateControls() on load"). An entry with an exact
// migration copies the stored value into every replacement — `stemNodeProminence`
// 0.48 lands on `stemNodeSwelling` AND `stemNodeKink` — and is REPORTED; an
// entry with no migration is reported as retired and its value is NOT applied,
// which is what "never quietly stripped into a state that draws something else"
// means for a file. A file naming a retired id AND one of its replacements is a
// file somebody edited by hand: neither value is applied and the note says so.
// The registry's `migrateControls()` throws on that case; a reader that throws
// on a hand-edited file reports nothing, so the rule is restated here with a
// note instead of an exception, over the same `migrateTo` data.
//
// NOTHING RETIRED IS EVER RE-SAVED. A save writes exactly the live registry
// controls — a key the reader did not know is reported and dropped, never
// carried into the next save — so the delete-on-migration the registry's
// RETIRED_IDS comment asks of "the first feature that persists a design" is
// discharged by construction: there is no mechanism here that preserves an
// unknown key, so there is no key to delete.
//
// THE ROOT IS SHAPED FOR SCOPING (feature map §11, Q3.2 / Q3.9), AND THAT IS WHY
// THIS SHIPPED FIRST. SCOPING-a FILLED THE `overrides` CONTAINERS (see "THE
// SCOPE CONTAINERS' REAL SHAPE" below); the paragraph that follows is the
// design-file session's forward statement, kept because it is what the shape
// was derived from. Per-layer, per-petal and per-tier values arrive as OFFSETS on
// the global value, and the spine and outline curves as lists of control points.
// Those land as ADDED FIELDS inside containers this version already writes EMPTY:
//
//   controls:  { <id>: <value>, ... }           every registry control, verbatim
//   overrides: { layers: [], petals: [], tiers: [] }   per-scope offsets (empty)
//   curves:    { spine: [], outline: [] }       curve-editor control points (empty)
//
// So a file written today reads back in the version that fills them with no
// migration: a container is a key that only ever gains entries. This version
// writes them empty and REFUSES TO APPLY anything found inside one — an entry in
// `overrides.layers` is reported as "not applied: this page cannot read it" and
// nothing is guessed from it. The version is written ONCE here; the next sessions
// only add. What a version bump WOULD mean: a file whose containers are non-empty
// is a file from a page that can fill them, and if that page bumps the version
// this reader refuses it whole (rule 4) rather than applying the globals and
// dropping the offsets — which is a correct refusal, since the globals alone draw
// a different bloom from the one the file describes.

// A CURVE IS A CONTROL VALUE, NOT A CONTAINER ENTRY (the curve-editor session,
// Oct 14). The forward statement above put "the spine and outline curves" in
// a `curves` container as lists of points; the ruling that a curve is a VALUE
// the scoping model and the design file can each hold (one curve per layer /
// petal / tier under scoping) makes a curve control's value live under
// `controls` like every other control's, through FIELD_KINDS' curve row. The
// `curves` container is still WRITTEN EMPTY and its entries still told "not
// applied" — nothing reads it, and whether it is retired or given a meaning is
// F3's (the first session with a live curve control) to decide, not this one's.
import { CONTROLS, RETIRED_IDS, migrateRoles } from './bloom-registry.js';
import { SCOPE_UNSCOPED, SCOPE_TIER_WHORL_LEVEL_IDS, SCOPE_VALUE_IDS } from './bloom-geometry.js';
import { readCurveValue, cloneCurve } from './bloom-curve.js';

// THE SCOPE CONTAINERS' REAL SHAPE (Scoping-a — the parameter-scoping state
// model; bloom-geometry.js's PARAMETER SCOPING block is the law, this is the
// file). ZERO controls reach it: entries arrive through the page's
// `__bloomScopes` hook (no control) and through a loaded file.
//
//   overrides.layers: [ { layer: <int >= 0>,               offsets: { <sliderId>: <number>, ... } } ]
//   overrides.petals: [ { layer: <int >= 0>, slot: <int>, offsets: { ... } } ]
//   overrides.tiers:  [ { tier:  <int >= 0>,               offsets: { ... } } ]   // read, kept, NOT applied — told
//
// F6-SCOPE (Oct 18) ADDS ONE OPTIONAL FIELD to a layer or petal entry, with no
// version move (a container entry only ever gains fields):
//
//   values: { petalOutlineMode?: 'LAW' | 'CURVE', petalOutlineCurve?: <a curve value> }
//
// A value the scope OWNS OUTRIGHT — it replaces what the petal inherits, where
// an offset adds to it (a curve is not a number and a choice has no delta). The
// ids are the geometry's `SCOPE_VALUE_IDS`; each value is read through the
// field kind of its control (a choice's options, a curve's shape rule), so a
// value the control could not hold is refused and told exactly as it would be
// under `controls`. A file written before this field has none, and reads as it
// did. A `tiers` entry carrying values is told and they are not applied (the
// sepals' outline is a later session).
//
// F3-SCOPE (Oct 19) widens the same field, again with no version move: the
// geometry's `SCOPE_VALUE_IDS` now also names the curl mode and the spine curve,
//
//   values: { …, petalCurlMode?: 'SLIDER' | 'CURVE', petalSpineCurve?: <a curve value> }
//
// read through the same field kinds (the choice's options, the spine curve's
// own `single` shape rule), so a #411-#421 file — whose entries own an outline
// or nothing — reads exactly as it did.
//
// An offset is a DELTA on the global value (Q3.2), verbatim — never clamped
// here, because what it composes to is per petal and the geometry's one clamp
// owns that (rule 2's spirit: this file holds no range). The reader VALIDATES
// the shape and refuses, with a note, every entry it cannot apply: a missing
// or non-integer index, an `offsets` that is not an object, a key that is not
// a SLIDER control (a choice has no delta), a key that is RETIRED or unknown,
// a non-finite value, and `sheetThickness` BY NAME — it is never scoped (Q3.6),
// and a reader that dropped it silently would load a file as a bloom it does
// not describe. A refused ENTRY is dropped whole and told; a refused KEY is
// dropped from its entry and told. The `tiers` list is validated and APPLIED
// since F1.1a (sepal tiers): an entry names a tier by its 0-based index and the
// geometry's tier loop reads it; one naming a tier past the count is kept and
// inert (the layers' own rule). THE VERSION DID NOT MOVE: a v1 file with empty
// containers reads here exactly as it did, and a v1 file with filled ones read
// by the previous page is told "not applied" by that page's own reader — which
// is the shape the containers were written empty to make possible.
//
// `scopesForBuild(overrides)` is the ONE place the file's containers become the
// geometry's `scopes` argument: the three lists plus `bounds`, the REGISTRY's
// own min/max for every scopeable control, handed down because the geometry
// cannot import the registry (rule 2 again: one owner of a range, read at the
// moment of building).
//
// A FILE SAVED BEFORE THE ROLE RETIREMENT (Q3.4) names the forty-seven retired
// petal-role controls (every v1 file wrote every control). They are read aside
// and handed, with the file's own controls, to the registry's ONE migration
// (`migrateRoles`): an ALL delta folds into the global, INNER and the per-petal
// groups become scope entries APPENDED to `overrides` with the toggle that lets
// them reach a petal, the RADIAL labellum and hood are dropped by ruling — and
// EVERY id off its identity comes back as a note saying which of those it was.
// Never silent: a clean v1 file reports one line, that its role controls were
// all at their identity.

export const FORMAT = 'bloom-design';
export const VERSION = 1;
export const APP = '/bloom';

/* ---- the field table ----------------------------------------------------- */
/* Derived from the registry, one row per control. `key` is the name in the
   file, `control` the registry id that owns the value, `kind` the registry's
   own kind. Bounds are NOT here (rule 2). */
export const CONTROL_FIELDS = Object.freeze(CONTROLS.map((c) => Object.freeze({ key: c.id, control: c.id, kind: c.kind })));

/* Registry controls that are deliberately NOT fields of the file, each with a
   reason. Empty today: every registry control is a design value. A control
   added later is a field automatically (the table is derived), so this list
   is for the day a registry row is NOT design state — and the gate requires
   that every entry here names a live control that is absent from the table,
   so a stale exemption is red. */
export const CONTROL_EXCEPTIONS = Object.freeze([]);

/* The two containers and their scopes — the forward shape above. */
export const SCOPE_CONTAINERS = Object.freeze(['layers', 'petals', 'tiers']);
export const CURVE_CONTAINERS = Object.freeze(['spine', 'outline']);
export const TOP_LEVEL_KEYS = Object.freeze(['format', 'version', 'app', 'savedAt', 'controls', 'overrides', 'curves']);

const controlOf = new Map(CONTROLS.map((c) => [c.id, c]));
const retiredOf = new Map(RETIRED_IDS.map((r) => [r.id, r]));

/* ---- writing ------------------------------------------------------------- */

/* `state` is a `readUI()` snapshot — every control's own coerced value. A
   control the snapshot lacks is written as `undefined` and so OMITTED by
   JSON, which the reader then reports as missing; nothing is defaulted on the
   way out either. */
/* THE FIELD KINDS — one row per registry control kind (CONTROL_KINDS), and the
   only place a kind's value crosses the file boundary in either direction:
   `write` is what the file holds for the control's value, `read` turns a file's
   raw value back into one (`{ ok, value, kind, note }`). The curve-editor
   session added the third row: a CURVE is written as the editor's value object
   verbatim (`{ mode, points[, right] }`, every coordinate a fraction of the
   owning length) and read through bloom-curve.js's own shape rule — a value the
   control cannot hold is REFUSED WHOLE and told, never clamped point by point
   (clamping one point of a shape can make it a shape the rule refuses, and a
   curve is one value). The design-file gate holds these rows to the registry's
   CONTROL_KINDS (F0), so a kind the registry learns is a kind the file must. */
export const FIELD_KINDS = Object.freeze({
  slider: Object.freeze({ write: (v) => v, read: (c, raw) => readSlider(c, raw) }),
  choice: Object.freeze({ write: (v) => v, read: (c, raw) => readChoice(c, raw) }),
  curve: Object.freeze({
    write: (v) => (v === undefined ? undefined : cloneCurve(v)),
    read: (c, raw) => {
      const r = readCurveValue(raw, c.curve);
      return r.ok ? { ok: true, value: r.value } : { ok: false, kind: 'invalid', note: `not a curve this control can hold — ${r.note}; the page keeps its curve` };
    },
  }),
});

/* A field-table row for a descriptor that is NOT a registry control — the
   capability hook's test curve (bloom.js `__bloomCurveTest`) and the gates'
   fixtures. The row carries its descriptor (`def`), so the SAME walkers below
   read and write it; CONTROL_FIELDS' rows carry none and resolve through the
   registry. */
export const fieldFor = (d) => Object.freeze({ key: d.id, control: d.id, kind: d.kind, def: d });
const descriptorOf = (f) => f.def || controlOf.get(f.control);

/* THE WRITER over a field table — `composeDoc` walks CONTROL_FIELDS with it. */
export function composeControls(state, fields = CONTROL_FIELDS) {
  const controls = {};
  for (const f of fields) {
    const k = FIELD_KINDS[f.kind];
    controls[f.key] = state && k ? k.write(state[f.control]) : undefined;
  }
  return controls;
}

export function composeDoc(state, { savedAt, scopes = null } = {}) {
  const controls = composeControls(state);
  /* THE SCOPES THE PAGE HOLDS, verbatim and in order — an entry is written as
     the page holds it (its index, its slot, its offsets with every key the
     page kept, a 0 included), so a save after a load is the loaded file's own
     entries. Nothing is normalised on the way out (rule 2). */
  const overrides = {};
  for (const k of SCOPE_CONTAINERS) overrides[k] = (scopes && Array.isArray(scopes[k])) ? scopes[k].map((e) => {
    const out = { ...e, offsets: { ...(e.offsets || {}) } };
    /* F6-scope: owned values through each control's own field kind (a curve is
       written as its value object, cloned) */
    if (e.values && Object.keys(e.values).length) {
      out.values = {};
      for (const id of Object.keys(e.values)) { const c = controlOf.get(id); out.values[id] = c ? FIELD_KINDS[c.kind].write(e.values[id]) : e.values[id]; }
    } else delete out.values;
    return out;
  }) : [];
  const curves = {};
  for (const k of CURVE_CONTAINERS) curves[k] = [];
  return { format: FORMAT, version: VERSION, app: APP, savedAt: savedAt || new Date().toISOString(), controls, overrides, curves };
}

export const toText = (doc) => JSON.stringify(doc, null, 2) + '\n';

/* ---- reading ------------------------------------------------------------- */

const note = (kind, text) => ({ kind, text });

/* Snap to the control's own step, the way a range input would — a value already
   on the step is handed back UNTOUCHED, so the round trip is an identity. */
function snap(v, c) {
  if (!(c.step > 0)) return v;
  const base = Number.isFinite(c.min) ? c.min : 0;
  const k = Math.round((v - base) / c.step);
  const s = base + k * c.step;
  return Math.abs(s - v) < 1e-9 ? v : +s.toPrecision(12);
}

/* One control's value, in the registry's own kind and bounds. Returns
   `{ ok, value, kind, note }` — `kind`/`note` set when the value was changed on
   the way in (clamped, snapped) or refused (invalid). */
export function coerceField(c, raw) {
  const k = FIELD_KINDS[c.kind];
  if (!k) return { ok: false, kind: 'invalid', note: `no rule for control kind ${c.kind}` };
  return k.read(c, raw);
}
function readSlider(c, raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not a number` };
  let v = raw, msg = '';
  const lo = Number.isFinite(c.min) ? c.min : -Infinity, hi = Number.isFinite(c.max) ? c.max : Infinity;
  const cl = Math.min(hi, Math.max(lo, v));
  if (cl !== v) { msg = `clamped ${raw} to ${cl} (the control runs ${lo}..${hi})`; v = cl; }
  const s = snap(v, c);
  if (s !== v) { msg = `${raw} is off the control's ${c.step} step — snapped to ${s}`; v = s; }
  return { ok: true, value: v, kind: msg ? 'clamped' : '', note: msg };
}
function readChoice(c, raw) {
  const values = c.options.map((o) => o.value);
  if (typeof raw !== 'string' || !values.includes(raw)) return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not one of ${values.join(' / ')}` };
  return { ok: true, value: raw };
}

/* THE READER over a field table — `readDoc` walks CONTROL_FIELDS with it (and
   then the retired-id migrations below, which belong to the registry's table
   and to no other). A test table (`fieldFor` rows) is walked by the SAME loop. */
export function readControls(src, notes, fields = CONTROL_FIELDS) {
  const out = {};
  /* THE RETIRED ROLE VALUES, aside — non-enumerable, so the controls record's
     own shape is unchanged; readDoc hands them to the migration. */
  const roleRaw = {};
  Object.defineProperty(out, 'retiredRoles', { value: roleRaw, enumerable: false });
  if (!src || typeof src !== 'object' || Array.isArray(src)) { notes.push(note('missing', 'controls is missing — no control is changed')); return out; }
  const has = (k) => Object.prototype.hasOwnProperty.call(src, k);
  for (const f of fields) {
    if (!has(f.key)) { notes.push(note('missing', `controls.${f.key} is missing — the page keeps the value it has`)); continue; }
    const r = coerceField(descriptorOf(f), src[f.key]);
    if (r.note) notes.push(note(r.kind || 'invalid', `controls.${f.key}: ${r.note}`));
    if (r.ok) out[f.key] = r.value;
  }
  /* Keys the table does not name: a RETIRED id migrates or is refused by name;
     anything else is unknown. */
  for (const k of Object.keys(src)) {
    if (fields.some((f) => f.key === k)) continue;
    const r = retiredOf.get(k);
    if (!r) { notes.push(note('unknown', `controls.${k} is not a control this page knows — not applied`)); continue; }
    /* a retired PETAL-ROLE id: read aside, migrated whole by readDoc */
    if (r.migrateBy === 'migrateRoles') { roleRaw[k] = src[k]; continue; }
    if (!Array.isArray(r.migrateTo)) { notes.push(note('retired', `controls.${k} is a retired control with no exact migration — its value ${JSON.stringify(src[k])} is not applied`)); continue; }
    const clash = r.migrateTo.filter((t) => has(t));
    if (clash.length) {
      notes.push(note('invalid', `controls.${k} is retired AND the file also names its replacement ${clash.join(', ')} — no file saved before the retirement carries both; neither is applied`));
      for (const t of clash) delete out[t];
      continue;
    }
    for (const t of r.migrateTo) {
      /* the target was reported missing above; the migration supplies it */
      const i = notes.findIndex((n) => n.kind === 'missing' && n.text.startsWith(`controls.${t} is missing`));
      if (i >= 0) notes.splice(i, 1);
      const c = controlOf.get(t);
      const m = coerceField(c, src[k]);
      if (m.note) notes.push(note(m.kind || 'invalid', `controls.${k} → ${t}: ${m.note}`));
      if (m.ok) out[t] = m.value;
    }
    notes.push(note('migrated', `controls.${k} is retired — its value ${JSON.stringify(src[k])} was applied to ${r.migrateTo.join(' and ')} (the registry's exact migration)`));
  }
  return out;
}

/* ---- the scope containers ------------------------------------------------ */

/* WHICH CONTROLS MAY CARRY AN OFFSET: every PETAL-ROLE SLIDER the registry
   holds ("everything else may be", Q3.6 — a petal quantity is what a petal
   scope offsets), less two named sets, each with its reason (a third, the ROLE_OVERRIDES delta controls,
   left with their retirement, Q3.4 — they are not controls any more):
     SCOPE_UNSCOPED      sheet thickness — never scoped, Q3.6 (the geometry's own owner);
     SCOPE_WHORL_LEVEL   sliders the registry files under the petal role that describe
                         the WHORL, not a petal — a count, and the tube's per-whorl
                         ring values (already one row per layer) — and `footDelicacy`,
                         which Scoping-b MOVED here by measurement: its only readers
                         are footRing()'s, which read the GLOBAL (the foot is the
                         whorl's, Q3.3), so a layer offset on it moved 0 floats on a
                         live scope (SO12) — a slider that would sit dead under a
                         selection, and an entry a file could carry that draws nothing.
   A choice has no delta and is excluded by kind. The gate restates this
   derivation from the registry (SO0). */
export const SCOPE_WHORL_LEVEL = Object.freeze(['petalCount', 'tubeLayer1', 'tubeLayer2', 'tubeLayer3', 'tubeLayer4', 'tubeLayer5', 'tubeLayer6', 'tubeHeight', 'tubeBlend', 'footDelicacy']);
export const SCOPEABLE_IDS = Object.freeze(CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'petal' && !SCOPE_UNSCOPED.includes(c.id) && !SCOPE_WHORL_LEVEL.includes(c.id)).map((c) => c.id));
/* A TIER is a SEPAL scope (Q1.1: each tier owns the full sepal control set),
   so its keys are the sepal-role sliders less the two whorl-level values —
   the count and the tier count — which the GEOMETRY names (one owner, F1.1a:
   `footRing`'s tier loop applies these entries, so the list of what it refuses
   lives beside it). */
export const SCOPE_TIER_WHORL_LEVEL = SCOPE_TIER_WHORL_LEVEL_IDS;
export const SCOPEABLE_TIER_IDS = Object.freeze(CONTROLS.filter((c) => c.kind === 'slider' && c.role === 'sepal' && !SCOPE_UNSCOPED.includes(c.id) && !SCOPE_TIER_WHORL_LEVEL.includes(c.id)).map((c) => c.id));
const scopeable = new Set(SCOPEABLE_IDS);
/* WHY A CONTROL CANNOT CARRY AN OFFSET IN A CONTAINER — the ONE owner of the
   sentence, read by the file reader (a refused offset's note) and by the page
   (the note beside a whole-bloom petal control while a scope is picked), so
   the two say the same thing. (The first cut had the page call this function
   and the reader keep its own wording, and the comment claimed they could not
   disagree while four of the reasons already did — the review's finding.) null
   when the control may carry one there. `container` is 'layers' / 'petals' /
   'tiers'. */
export function scopeOffsetRefusal(id, container) {
  const c = controlOf.get(id);
  if (!c) return 'not a control this page knows';
  if (SCOPE_UNSCOPED.includes(id)) return 'never scoped — it is the material (Q3.6)';
  if (container === 'tiers' ? scopeableTier.has(id) : scopeable.has(id)) return null;
  if (c.kind !== 'slider') return `a ${c.kind} has no offset`;
  if (id === 'footDelicacy') return 'a whorl-level value — the foot is the whorl\'s (Q3.3)';
  if (SCOPE_WHORL_LEVEL.includes(id) || SCOPE_TIER_WHORL_LEVEL.includes(id)) return 'a whorl-level value has no per-petal meaning';
  return container === 'tiers' ? `${c.role} controls are not sepal (tier) scopes` : `${c.role} controls are not petal scopes`;
}
/* WHY A PETAL CONTROL IS NOT A SCOPE'S (Scoping-b) — the page prints this
   beside every petal-role control that stays whole-bloom while a scope is
   picked ("sheet thickness ... stays global and shows so while a scope is
   selected"): `scopeOffsetRefusal`'s own sentence for a layer / petal
   container. null for a scopeable control and for every control that is not a
   petal's at all (an arrangement or centre control is whole-bloom by what it
   is, and saying so on every row would bury the four that need it). */
export function scopeExclusionReason(id) {
  const c = controlOf.get(id);
  if (!c || c.role !== 'petal' || scopeable.has(id) || SCOPE_VALUE_IDS.includes(id)) return null;
  return scopeOffsetRefusal(id, 'petals');
}
const scopeableTier = new Set(SCOPEABLE_TIER_IDS);
const isIndex = (v) => Number.isInteger(v) && v >= 0;

/* ONE scope entry, validated. Returns the entry to keep (indices and the
   offsets this page can apply) or null when the entry is refused whole. */
function readScopeEntry(k, e, i, notes) {
  const where = `overrides.${k}[${i}]`;
  if (!e || typeof e !== 'object' || Array.isArray(e)) { notes.push(note('invalid', `${where} is not an entry — dropped`)); return null; }
  const out = {};
  const need = k === 'tiers' ? ['tier'] : k === 'petals' ? ['layer', 'slot'] : ['layer'];
  for (const f of need) {
    if (!isIndex(e[f])) { notes.push(note('invalid', `${where}.${f} is ${JSON.stringify(e[f] ?? null)}, not a whole number — the entry is dropped`)); return null; }
    out[f] = e[f];
  }
  if (!e.offsets || typeof e.offsets !== 'object' || Array.isArray(e.offsets)) { notes.push(note('invalid', `${where}.offsets is not an object — the entry is dropped`)); return null; }
  out.offsets = {};
  for (const id of Object.keys(e.offsets)) {
    const v = e.offsets[id];
    if (retiredOf.has(id) && !controlOf.has(id)) { notes.push(note('retired', `${where}.offsets.${id} names a retired control — the offset ${JSON.stringify(v)} is not applied`)); continue; }
    if (!controlOf.has(id)) { notes.push(note('unknown', `${where}.offsets.${id} is not a control this page knows — not applied`)); continue; }
    const why = scopeOffsetRefusal(id, k);
    if (why) { notes.push(note('invalid', `${where}.offsets.${id}: ${why} — the offset ${JSON.stringify(v)} is not applied`)); continue; }
    if (typeof v !== 'number' || !Number.isFinite(v)) { notes.push(note('invalid', `${where}.offsets.${id} is ${JSON.stringify(v)}, not a number — not applied`)); continue; }
    out.offsets[id] = v;
  }
  /* F6-SCOPE — THE OWNED VALUES. Only the geometry's value ids, each through
     its control's own field kind; a tier carries none yet. */
  if (e.values !== undefined) {
    if (k === 'tiers') notes.push(note('not-applied', `${where}.values: a sepal tier owns no outline or spine yet (petals only, F6-scope / F3-scope) — not applied`));
    else if (!e.values || typeof e.values !== 'object' || Array.isArray(e.values)) notes.push(note('invalid', `${where}.values is not an object — not applied`));
    else {
      const vals = {};
      for (const id of Object.keys(e.values)) {
        if (SCOPE_UNSCOPED.includes(id)) { notes.push(note('invalid', `${where}.values.${id}: never scoped — it is the material (Q3.6) — not applied`)); continue; }
        if (!SCOPE_VALUE_IDS.includes(id)) { notes.push(note(controlOf.has(id) ? 'invalid' : 'unknown', `${where}.values.${id}: only ${SCOPE_VALUE_IDS.join(' / ')} may be owned as a value — not applied`)); continue; }
        const r = coerceField(controlOf.get(id), e.values[id]);
        if (r.note) notes.push(note(r.kind || 'invalid', `${where}.values.${id}: ${r.note}`));
        if (r.ok) vals[id] = r.value;
      }
      if (Object.keys(vals).length) out.values = vals;
    }
  }
  for (const f of Object.keys(e)) if (!need.includes(f) && f !== 'offsets' && f !== 'values') notes.push(note('unknown', `${where}.${f} is not a field this page knows`));
  return out;
}

/* A container of lists: every named list must be present and a list. An
   `overrides` entry is VALIDATED and kept; a `curves` entry is REPORTED AND
   NOT APPLIED — this version reads nothing from those. */
/* A MISSING list (or a missing container) is reported and named in `missing`
   on the result — a non-enumerable field, so the document's own shape is
   unchanged — and the PAGE KEEPS WHAT IT HAS for it (rule 3): the first cut
   turned a missing `overrides` into empty lists and the page then dropped every
   offset the visitor had set through the picker (the review's finding). */
function readContainer(src, name, lists, notes) {
  const out = {};
  for (const k of lists) out[k] = [];
  const missing = [];
  Object.defineProperty(out, 'missing', { value: missing, enumerable: false });
  const keeps = name === 'overrides' ? ' — the page keeps the offsets it has' : '';
  if (!src || typeof src !== 'object' || Array.isArray(src)) { notes.push(note('missing', `${name} is missing${keeps}`)); missing.push(...lists); return out; }
  for (const k of lists) {
    if (!Object.prototype.hasOwnProperty.call(src, k)) { notes.push(note('missing', `${name}.${k} is missing${keeps}`)); missing.push(k); continue; }
    if (!Array.isArray(src[k])) { notes.push(note('invalid', `${name}.${k} is not a list`)); continue; }
    if (name === 'overrides') {
      out[k] = src[k].map((e, i) => readScopeEntry(k, e, i, notes)).filter((e) => e !== null);
      continue;
    }
    if (src[k].length) notes.push(note('not-applied', `${name}.${k} holds ${src[k].length} entr${src[k].length === 1 ? 'y' : 'ies'} — this page cannot read the ${k} curve yet, so they are not applied`));
    out[k] = src[k].slice();
  }
  for (const k of Object.keys(src)) if (!lists.includes(k)) notes.push(note('unknown', `${name}.${k} is not a field this page knows`));
  return out;
}

/* THE READER. Returns `{ ok: false, error }` on a refusal, else
   `{ ok: true, doc, notes }` where `doc.controls` holds ONLY the values to
   apply (a missing or refused field is absent) and `notes` every departure
   from a clean read. NOTHING is applied by this function. */
export function readDoc(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'this file is not a JSON object' };
  if (obj.format !== FORMAT) return { ok: false, error: `this is not a ${FORMAT} file — its "format" reads ${JSON.stringify(obj.format ?? null)}` };
  const v = obj.version;
  if (!Number.isInteger(v) || v < 1) return { ok: false, error: `its "version" is ${JSON.stringify(v ?? null)}, which is not a version` };
  if (v > VERSION) return { ok: false, error: `this file is version ${v} and this page reads up to ${VERSION}. Reading it would mean ignoring whatever the newer version added, which is exactly the silent partial restore this format is built to avoid.` };
  const notes = [];
  const doc = { format: FORMAT, version: v, app: obj.app ?? null, savedAt: obj.savedAt ?? null };
  doc.controls = readControls(obj.controls, notes);
  doc.overrides = readContainer(obj.overrides, 'overrides', SCOPE_CONTAINERS, notes);
  migrateRetiredRoles(doc, notes);
  doc.curves = readContainer(obj.curves, 'curves', CURVE_CONTAINERS, notes);
  for (const k of Object.keys(obj)) if (!TOP_LEVEL_KEYS.includes(k)) notes.push(note('unknown', `${k} is not a field this page knows`));
  return { ok: true, doc, notes };
}

/* THE ROLE RETIREMENT, ON LOAD (Q3.4). The file's retired role values and its
   own controls are handed to the registry's `migrateRoles` (the one owner),
   which needs the whole arrangement — so a file missing a value it reads is
   told and nothing of its roles is applied (rule 3). What it returns lands as
   changed controls (a folded global, a scope toggle) and as entries APPENDED
   to `overrides` — and if the file carried a container that went missing, the
   migrated entries are what it now holds, told. */
function migrateRetiredRoles(doc, notes) {
  const raw = doc.controls.retiredRoles || {};
  const ids = Object.keys(raw);
  if (!ids.length) return;
  const whole = { ...doc.controls, ...raw };
  const m = migrateRoles(whole);
  const kindOf = { migrated: 'migrated', dropped: 'retired', inert: 'retired', identity: 'migrated' };
  for (const n of m.notes) notes.push(note(kindOf[n.kind] || 'retired', n.id ? `controls.${n.id}: ${n.text}` : `controls: ${n.text}`));
  const controls = {};
  for (const [k, v] of Object.entries(m.state)) if (!ids.includes(k)) controls[k] = v;
  for (const k of Object.keys(doc.controls)) if (!(k in controls)) delete doc.controls[k];
  Object.assign(doc.controls, controls);
  /* a scope toggle the file did not carry (it predates Scoping-b) and the
     migration has now SET is no longer missing: the migration supplies it */
  for (const t of ['scopeLayers', 'scopePetals']) {
    if (!(t in controls)) continue;
    const i = notes.findIndex((n) => n.kind === 'missing' && n.text.startsWith(`controls.${t} is missing`));
    if (i >= 0) { notes.splice(i, 1); notes.push(note('migrated', `controls.${t} was not in the file (it predates the toggle) — the role migration set it ${controls[t]}`)); }
  }
  if (m.scopes) {
    for (const k of ['layers', 'petals']) {
      if (!m.scopes[k].length) continue;
      const at = doc.overrides.missing.indexOf(k);
      if (at >= 0) { doc.overrides.missing.splice(at, 1); notes.push(note('migrated', `overrides.${k} was missing — it now holds only the ${m.scopes[k].length} entr${m.scopes[k].length === 1 ? 'y' : 'ies'} the role migration carried`)); }
      doc.overrides[k] = [...doc.overrides[k], ...m.scopes[k]];
    }
  }
}

/* THE GEOMETRY'S `scopes` ARGUMENT from a read `overrides` record — the three
   lists plus the registry's bounds for every scopeable control. Null when every
   layer and petal list is empty (tiers alone build nothing), so the caller's
   branch on it is the shipped path. */
export function scopeBounds() {
  const out = {};
  for (const id of [...SCOPEABLE_IDS, ...SCOPEABLE_TIER_IDS]) { const c = controlOf.get(id); out[id] = { min: c.min, max: c.max }; }
  return out;
}
/* Null when every list is empty — a tier entry builds a tier (F1.1a), so
   the tiers list counts now. */
export function scopesForBuild(overrides) {
  if (!overrides) return null;
  const layers = Array.isArray(overrides.layers) ? overrides.layers : [];
  const petals = Array.isArray(overrides.petals) ? overrides.petals : [];
  const tiers = Array.isArray(overrides.tiers) ? overrides.tiers : [];
  if (!layers.length && !petals.length && !tiers.length) return null;
  return { layers, petals, tiers, bounds: scopeBounds() };
}
export const scopesAreEmpty = (o) => !o || SCOPE_CONTAINERS.every((k) => !Array.isArray(o[k]) || o[k].length === 0);

/* A design file is told by its name, never by sniffing bytes (the /plot rule). */
export const isDesignFile = (f) => /\.json$/i.test((f && f.name) || '') || (f && f.type === 'application/json');
