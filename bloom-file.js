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
// THIS SHIPS FIRST. Per-layer, per-petal and per-tier values arrive as OFFSETS on
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

import { CONTROLS, RETIRED_IDS } from './bloom-registry.js';

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
export function composeDoc(state, { savedAt } = {}) {
  const controls = {};
  for (const f of CONTROL_FIELDS) controls[f.key] = state ? state[f.control] : undefined;
  const overrides = {};
  for (const k of SCOPE_CONTAINERS) overrides[k] = [];
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
  if (c.kind === 'slider') {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not a number` };
    let v = raw, msg = '';
    const lo = Number.isFinite(c.min) ? c.min : -Infinity, hi = Number.isFinite(c.max) ? c.max : Infinity;
    const cl = Math.min(hi, Math.max(lo, v));
    if (cl !== v) { msg = `clamped ${raw} to ${cl} (the control runs ${lo}..${hi})`; v = cl; }
    const s = snap(v, c);
    if (s !== v) { msg = `${raw} is off the control's ${c.step} step — snapped to ${s}`; v = s; }
    return { ok: true, value: v, kind: msg ? 'clamped' : '', note: msg };
  }
  if (c.kind === 'choice') {
    const values = c.options.map((o) => o.value);
    if (typeof raw !== 'string' || !values.includes(raw)) return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not one of ${values.join(' / ')}` };
    return { ok: true, value: raw };
  }
  return { ok: false, kind: 'invalid', note: `no rule for control kind ${c.kind}` };
}

function readControls(src, notes) {
  const out = {};
  if (!src || typeof src !== 'object' || Array.isArray(src)) { notes.push(note('missing', 'controls is missing — no control is changed')); return out; }
  const has = (k) => Object.prototype.hasOwnProperty.call(src, k);
  for (const f of CONTROL_FIELDS) {
    if (!has(f.key)) { notes.push(note('missing', `controls.${f.key} is missing — the page keeps the value it has`)); continue; }
    const r = coerceField(controlOf.get(f.control), src[f.key]);
    if (r.note) notes.push(note(r.kind || 'invalid', `controls.${f.key}: ${r.note}`));
    if (r.ok) out[f.key] = r.value;
  }
  /* Keys the table does not name: a RETIRED id migrates or is refused by name;
     anything else is unknown. */
  for (const k of Object.keys(src)) {
    if (CONTROL_FIELDS.some((f) => f.key === k)) continue;
    const r = retiredOf.get(k);
    if (!r) { notes.push(note('unknown', `controls.${k} is not a control this page knows — not applied`)); continue; }
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

/* A container of lists: every named list must be present and a list; an entry
   inside one is REPORTED AND NOT APPLIED — this version reads nothing from them. */
function readContainer(src, name, lists, notes) {
  const out = {};
  for (const k of lists) out[k] = [];
  if (!src || typeof src !== 'object' || Array.isArray(src)) { notes.push(note('missing', `${name} is missing`)); return out; }
  for (const k of lists) {
    if (!Object.prototype.hasOwnProperty.call(src, k)) { notes.push(note('missing', `${name}.${k} is missing`)); continue; }
    if (!Array.isArray(src[k])) { notes.push(note('invalid', `${name}.${k} is not a list`)); continue; }
    if (src[k].length) notes.push(note('not-applied', `${name}.${k} holds ${src[k].length} entr${src[k].length === 1 ? 'y' : 'ies'} — this page cannot read ${name === 'overrides' ? 'per-' + k.replace(/s$/, '') + ' overrides' : 'the ' + k + ' curve'} yet, so they are not applied`));
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
  doc.curves = readContainer(obj.curves, 'curves', CURVE_CONTAINERS, notes);
  for (const k of Object.keys(obj)) if (!TOP_LEVEL_KEYS.includes(k)) notes.push(note('unknown', `${k} is not a field this page knows`));
  return { ok: true, doc, notes };
}

/* A design file is told by its name, never by sniffing bytes (the /plot rule). */
export const isDesignFile = (f) => /\.json$/i.test((f && f.name) || '') || (f && f.type === 'application/json');
