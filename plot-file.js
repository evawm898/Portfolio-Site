// plot-file.js — the composition file: what /plot saves, and how it reads one back.
//
// THE TRAP THIS FILE EXISTS TO CLOSE. A restore that silently does not restore
// something is the failure mode here, and it is invisible: every field is one
// that can be dropped in the write, dropped in the read, or read into the wrong
// place, and the page looks entirely plausible either way. Four things are done
// about it, and none of them is a comment:
//
//   1. ONE TABLE PER GROUP, WALKED BY BOTH DIRECTIONS. `composeDoc` builds each
//      group by iterating its field table and `readDoc` reads it by iterating
//      the same table, so a field cannot be written and not read, or read and
//      not written. What the tables themselves say is checked against a
//      written-down census in the gate — a table row that vanished would
//      otherwise round-trip cleanly while losing the field.
//   2. EVERY SCALAR IN THE FILE IS A CONTROL'S OWN VALUE, VERBATIM. No units are
//      converted, nothing is rescaled and nothing is renamed on the way in or
//      out: `draw.brightness` is the string `brightness`'s slider reads, so
//      "read into the wrong place" needs a wrong `control` in the table rather
//      than a wrong conversion nobody can see. The non-control state — the bend
//      lists, the per-petal warps, the camera and the selection — is the small
//      remainder, and each has its own reader here.
//   3. A MISSING FIELD IS REPORTED AND THE PAGE IS LEFT ALONE. Not defaulted:
//      defaulting a field the writer forgot produces a page that looks restored,
//      which is the exact failure. Every departure from a clean read — missing,
//      unknown, clamped, snapped, re-ordered, dropped — comes back as a note, so
//      "a clean round trip reports nothing" is a check rather than a hope.
//   4. A NEWER VERSION IS REFUSED, NOT PARTIALLY READ. Skipping fields a future
//      version added is the same silent-partial-restore in a different coat.
//
// THE ROOT IS A LIST OF INSTANCES, AND TODAY IT HOLDS EXACTLY ONE. A composition
// will eventually carry several blooms at different scales — the reference this
// direction is aimed at is five of them — and that is a change to the root's
// CARDINALITY, not to its fields: `{stem, petals, camera}` at the root would
// have to be migrated in every file already saved, where `{instances: [...]}`
// only ever gains entries. So each instance carries its own grid identity, stem
// parameters, per-petal warps and a transform (identity today, and REPORTED as
// not applied if a file carries another), while the frame, the camera and the
// draw settings stay at the top level, because they are properties of the
// composition and not of any one bloom. Multi-instance loading, selection and
// transforms are NOT built here; nothing about them is foreclosed.
//
// THE WARP IS PER PETAL, IN THE FILE AS ON THE PAGE. `instances[i].petals` is a
// LIST of `{index, along, across, bends}` — one entry per petal that carries a
// warp — and not one warp the whole bloom shares. That distinction is the
// correction the previous session made on the page (see plot.js), and a file
// with a single global warp could not express the state the page can already
// reach: four petals at four different shapes.
//
// THE GRID ITSELF IS NOT IN THE FILE. It is ~1.9 MB and it is already on disk.
// What is stored is enough IDENTITY to notice a mismatch — the file's name, the
// export's mode, and the census the page recounted from it — and a mismatch is
// SAID, in full, field by field, because silently restoring warps onto the wrong
// petals is the worst thing this format could do.

import { MIN_DENSITY, MAX_DENSITY } from './plot-grid.js';
import { FRAME_RATIOS, FRAME_SHAPES, isListedRatio } from './plot-frame.js';
import { POLARITIES } from './plot-polarity.js';

export const FORMAT = 'plot-composition';
/* VERSION 2 ADDS `draw.polarity`, AND THE BUMP IS THE POINT OF HAVING A VERSION.
   Nothing breaks without it — a v1 file has no polarity key, the reader reports
   it missing and the page keeps the polarity it has, which is exactly rule 3 —
   but leaving it at 1 would mean "version 1" no longer names one shape: a file
   written before this session and a file written after it would carry the same
   number and different fields, and a later reader would have no way to tell
   which it was holding. Old files still load; they say what they are missing. */
export const VERSION = 2;

/* ---- the field tables --------------------------------------------------- */
/* `key` is the name in the file, `control` the id of the element that owns the
   value, `kind` how it is validated. Bounds are deliberately NOT here: the
   control's own `min`/`max`/`step` are the one owner of a slider's range, and
   the caller passes them in, so this file cannot drift from the markup. */

export const FRAME_FIELDS = [
  { key: 'on',     control: 'frame',       kind: 'enum', values: ['on', 'off'] },
  { key: 'shape',  control: 'frameShape',  kind: 'enum', values: FRAME_SHAPES },
  { key: 'ratio',  control: 'frameRatio',  kind: 'ratio' },
  { key: 'margin', control: 'frameMargin', kind: 'number' },
];

/* POLARITY RIDES WITH THE DRAW SETTINGS AND NOT IN A GROUP OF ITS OWN, because
   it is one: it decides how the fragments blend, and it changes what the two
   controls beside it MEAN — `brightness` is an amount of light on black and an
   amount of ink on white. Splitting it out would put a draw setting somewhere
   the draw group is not.
   The values come from plot-polarity.js rather than being restated, the way the
   ratios come from plot-frame.js: two lists of polarities is one of them being
   wrong. */
export const DRAW_FIELDS = [
  { key: 'families',   control: 'families',   kind: 'enum', values: ['both', 'u', 'v'] },
  { key: 'uDensity',   control: 'uDensity',   kind: 'int' },
  { key: 'vDensity',   control: 'vDensity',   kind: 'int' },
  { key: 'weight',     control: 'weight',     kind: 'number' },
  { key: 'polarity',   control: 'polarity',   kind: 'enum', values: POLARITIES },
  { key: 'brightness', control: 'brightness', kind: 'int' },
  { key: 'depthDim',   control: 'depthDim',   kind: 'int' },
];

export const VIEW_FIELDS = [
  { key: 'stemHandles',  control: 'stemHandles',  kind: 'bool' },
  { key: 'petalHandles', control: 'petalHandles', kind: 'bool' },
];

export const STEM_FIELDS = [
  { key: 'on',       control: 'stem',       kind: 'enum', values: ['on', 'off'] },
  { key: 'bundle',   control: 'stemBundle', kind: 'number' },
  { key: 'join',     control: 'stemJoin',   kind: 'number' },
  { key: 'length',   control: 'stemLength', kind: 'number' },
  { key: 'droopDeg', control: 'stemDroop',  kind: 'number' },
  { key: 'neck',     control: 'stemNeck',   kind: 'number' },
];

/* THE TRANSFORM'S CONTROLS. The FILE's shape does not change — `transform` is
   still three vec3s, exactly as it was written before any of them existed — so
   this table is not a second definition of the format; it is what maps a
   control to its place inside those vectors, so the page can walk one table in
   both directions and the gate's control census has a row for each.

   `axis: -1` MEANS UNIFORM: one control, all three components. "Size this bloom
   against that one" is the operation an artist repeats, and three scale sliders
   would make the common case three drags and the useful case (a squashed bloom)
   no more reachable than a hand-written file already makes it. A file carrying a
   non-uniform scale IS applied exactly as written and the reader says so — see
   `readInstance` — because applying something different from the file, however
   reported, is worse than applying the file. */
export const TRANSFORM_FIELDS = [
  { key: 'position',    axis: 0,  control: 'bloomX' },
  { key: 'position',    axis: 1,  control: 'bloomY' },
  { key: 'position',    axis: 2,  control: 'bloomZ' },
  { key: 'rotationDeg', axis: 0,  control: 'bloomRotX' },
  { key: 'rotationDeg', axis: 1,  control: 'bloomRotY' },
  { key: 'rotationDeg', axis: 2,  control: 'bloomRotZ' },
  { key: 'scale',       axis: -1, control: 'bloomScale' },
];

export const PETAL_FIELDS = [
  { key: 'along',  control: 'petalAlong',  kind: 'number' },
  { key: 'across', control: 'petalAcross', kind: 'number' },
];

// The census keys a grid is identified by, beside its file name and the
// export's own mode. Taken from `census()`'s own vocabulary so the comparison
// is a lookup rather than a second set of names to keep in step.
export const GRID_CENSUS_FIELDS = ['u', 'v', 'other', 'strips', 'segments'];

export const IDENTITY_TRANSFORM = Object.freeze({
  position: Object.freeze([0, 0, 0]),
  rotationDeg: Object.freeze([0, 0, 0]),
  scale: Object.freeze([1, 1, 1]),
});

const TOP_LEVEL_KEYS = ['format', 'version', 'app', 'savedAt',
                        'frame', 'draw', 'view', 'camera', 'selection', 'instances'];
const INSTANCE_KEYS = ['id', 'grid', 'transform', 'stem', 'petals'];

/* ---- writing ------------------------------------------------------------ */

const pick = (fields, src) => {
  const o = {}, s = src || {};
  for (const f of fields) o[f.key] = s[f.key];
  return o;
};
const vec3 = v => (Array.isArray(v) ? [+v[0], +v[1], +v[2]] : [0, 0, 0]);
const bendOut = b => ({ t: +b.t, offset: vec3(b.offset) });

/* THE GRID'S IDENTITY, from the page's own census. Not a hash of the bytes: the
   point is to say WHAT differs when a composition meets a different bundle, and
   "the sha changed" says nothing an artist can act on, where "28 petals saved,
   40 here" does. */
export function gridIdentity({ name, mode, census, petals }) {
  const id = { name: String(name ?? ''), mode: mode == null ? null : String(mode),
               petals: petals | 0 };
  for (const k of GRID_CENSUS_FIELDS) id[k] = (census && census[k] | 0) || 0;
  return id;
}

export function compareIdentity(saved, current) {
  const differences = [];
  if (!saved || !current) return { match: false, differences: [{ field: 'grid', saved, current }] };
  for (const field of ['name', 'mode', 'petals', ...GRID_CENSUS_FIELDS]) {
    if (saved[field] !== current[field]) {
      differences.push({ field, saved: saved[field] ?? null, current: current[field] ?? null });
    }
  }
  return { match: differences.length === 0, differences };
}

export function composeInstance(inst) {
  const t = inst.transform || IDENTITY_TRANSFORM;
  return {
    id: String(inst.id ?? 'bloom-0'),
    grid: { ...inst.grid },
    transform: { position: vec3(t.position), rotationDeg: vec3(t.rotationDeg),
                 scale: vec3(t.scale) },
    stem: { ...pick(STEM_FIELDS, inst.stem), bends: (inst.stem.bends || []).map(bendOut) },
    // Sorted by petal index so a file is stable and diffable, and so two saves
    // of the same page produce the same bytes whatever order the Map iterated.
    petals: (inst.petals || []).slice().sort((a, b) => a.index - b.index).map(p => ({
      index: p.index | 0, ...pick(PETAL_FIELDS, p), bends: (p.bends || []).map(bendOut),
    })),
  };
}

export function composeDoc(state) {
  return {
    format: FORMAT,
    version: VERSION,
    app: '/plot',
    savedAt: state.savedAt || new Date().toISOString(),
    frame: pick(FRAME_FIELDS, state.frame),
    draw: pick(DRAW_FIELDS, state.draw),
    view: pick(VIEW_FIELDS, state.view),
    camera: { position: vec3(state.camera.position), target: vec3(state.camera.target),
              fov: +state.camera.fov },
    // ONE CURSOR, AT THE TOP LEVEL. You can only be editing one petal of one
    // bloom at a time, so the selection is a property of the composition and
    // not a remembered value on each instance — two instances each holding
    // their own "selected petal" would be two selections.
    selection: { instance: state.selection.instance | 0, petal: state.selection.petal | 0 },
    instances: state.instances.map(composeInstance),
  };
}

export const toText = doc => JSON.stringify(doc, null, 2) + '\n';

/* ---- reading ------------------------------------------------------------ */

const note = (kind, text) => ({ kind, text });

/* Snap to the control's own step, the way the browser would when the value is
   written into a range input — so what this returns IS what the control will
   hold, and the round trip is exact rather than nearly. A value already on the
   step is handed back UNTOUCHED (not re-derived), because every value this
   reader sees in practice came out of that control in the first place and
   re-deriving it would introduce float dust into an identity. */
function snap(v, bounds) {
  if (!bounds || !(bounds.step > 0)) return v;
  const base = Number.isFinite(bounds.min) ? bounds.min : 0;
  const k = Math.round((v - base) / bounds.step);
  const s = base + k * bounds.step;
  return Math.abs(s - v) < 1e-9 ? v : +s.toPrecision(12);
}

function coerce(field, raw, bounds) {
  switch (field.kind) {
    case 'enum':
      if (!field.values.includes(raw))
        return { ok: false, kind: 'invalid',
                 note: `${JSON.stringify(raw)} is not one of ${field.values.join(' / ')}` };
      return { ok: true, value: raw };
    case 'ratio': {
      if (!isListedRatio(raw))
        return { ok: false, kind: 'invalid',
                 note: `${JSON.stringify(raw)} is not a ratio this page can show `
                       + `(${FRAME_RATIOS.map(r => r.value).join(', ')})` };
      return { ok: true, value: raw };
    }
    case 'bool':
      if (typeof raw !== 'boolean')
        return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not true or false` };
      return { ok: true, value: raw };
    case 'int':
    case 'number': {
      if (typeof raw !== 'number' || !Number.isFinite(raw))
        return { ok: false, kind: 'invalid', note: `${JSON.stringify(raw)} is not a number` };
      let v = field.kind === 'int' ? Math.round(raw) : raw;
      let msg = v !== raw ? `rounded ${raw} to ${v}` : '';
      if (bounds) {
        const lo = Number.isFinite(bounds.min) ? bounds.min : -Infinity;
        const hi = Number.isFinite(bounds.max) ? bounds.max : Infinity;
        const c = Math.min(hi, Math.max(lo, v));
        if (c !== v) { msg = `clamped ${raw} to ${c} (the control runs ${lo}..${hi})`; v = c; }
        const s = snap(v, bounds);
        if (s !== v) { msg = `${raw} is off the control's ${bounds.step} step — snapped to ${s}`; v = s; }
      }
      return { ok: true, value: v, kind: msg ? 'clamped' : '', note: msg };
    }
    default:
      return { ok: false, kind: 'invalid', note: `no rule for kind ${field.kind}` };
  }
}

/* A GROUP, READ BY ITS OWN TABLE. Keys the table does not name are reported as
   unknown rather than ignored, and keys the table names that the file does not
   carry are reported as missing and LEFT OUT of the result — the applier then
   leaves the page's own value alone, and the note is what makes a writer that
   dropped a field visible instead of invisible. */
function readGroup(fields, src, path, notes, boundsOf, alsoKnown = []) {
  const out = {};
  const isObj = src && typeof src === 'object' && !Array.isArray(src);
  if (!isObj) { notes.push(note('missing', `${path} is missing`)); return out; }
  for (const f of fields) {
    if (!Object.prototype.hasOwnProperty.call(src, f.key)) {
      notes.push(note('missing', `${path}.${f.key} is missing — the page keeps the value it has`));
      continue;
    }
    const r = coerce(f, src[f.key], boundsOf && boundsOf(f.control));
    if (r.note) notes.push(note(r.kind || 'invalid', `${path}.${f.key}: ${r.note}`));
    if (r.ok) out[f.key] = r.value;
  }
  for (const k of Object.keys(src)) {
    if (!fields.some(f => f.key === k) && !alsoKnown.includes(k))
      notes.push(note('unknown', `${path}.${k} is not a field this page knows`));
  }
  return out;
}

function readVec3(raw, path, notes, fallback = null) {
  if (!Array.isArray(raw) || raw.length !== 3 || !raw.every(n => typeof n === 'number' && Number.isFinite(n))) {
    notes.push(note('invalid', `${path} is not three numbers`));
    return fallback;
  }
  return [raw[0], raw[1], raw[2]];
}

/* A BEND LIST. `t` is a fraction of the stem's or the petal's own length, so
   [0,1] is its whole domain; the page holds them ascending, and a file that is
   not is SORTED and told rather than refused, because the order is a property
   of the list and not of any one point. Over the cap, the tail is dropped and
   counted — a file asking for twelve bends on a control that stops at eight is
   asking for something the page cannot show. */
function readBends(raw, path, notes, max) {
  if (raw === undefined) { notes.push(note('missing', `${path} is missing`)); return null; }
  if (!Array.isArray(raw)) { notes.push(note('invalid', `${path} is not a list`)); return null; }
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (!b || typeof b !== 'object') { notes.push(note('invalid', `${path}[${i}] is not a bend`)); continue; }
    if (typeof b.t !== 'number' || !Number.isFinite(b.t)) {
      notes.push(note('invalid', `${path}[${i}].t is not a number`)); continue;
    }
    let t = b.t;
    if (t < 0 || t > 1) { notes.push(note('clamped', `${path}[${i}].t ${t} is outside 0..1`)); t = Math.min(1, Math.max(0, t)); }
    const offset = readVec3(b.offset, `${path}[${i}].offset`, notes, null);
    if (!offset) continue;
    out.push({ t, offset });
  }
  if (max > 0 && out.length > max) {
    notes.push(note('dropped', `${path} holds ${out.length} points and this page shows at most ${max} — the last ${out.length - max} were dropped`));
    out.length = max;
  }
  const sorted = out.slice().sort((a, b) => a.t - b.t);
  if (sorted.some((b, i) => b !== out[i]))
    notes.push(note('reordered', `${path} was not in ascending order and has been sorted`));
  return sorted;
}

function readInstance(raw, path, notes, opts) {
  const inst = { id: 'bloom-0', grid: null, transform: null, stem: null, petals: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    notes.push(note('invalid', `${path} is not an instance`));
    return inst;
  }
  inst.id = typeof raw.id === 'string' ? raw.id : 'bloom-0';
  if (raw.grid && typeof raw.grid === 'object' && !Array.isArray(raw.grid)) inst.grid = { ...raw.grid };
  else notes.push(note('missing', `${path}.grid is missing — a mismatch cannot be detected`));

  const t = raw.transform;
  if (t && typeof t === 'object') {
    inst.transform = {
      position: readVec3(t.position, `${path}.transform.position`, notes, [0, 0, 0]),
      rotationDeg: readVec3(t.rotationDeg, `${path}.transform.rotationDeg`, notes, [0, 0, 0]),
      scale: readVec3(t.scale, `${path}.transform.scale`, notes, [1, 1, 1]),
    };
  } else {
    notes.push(note('missing', `${path}.transform is missing — read as the identity`));
    inst.transform = { position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1] };
  }
  /* THE TRANSFORM IS APPLIED EXACTLY AS WRITTEN, INCLUDING A SCALE THE PANEL
     CANNOT SHOW. The scale control is uniform, so a hand-written non-uniform
     scale has no position on it — the bloom is still drawn with the scale the
     file asked for, and what is reported is that the CONTROL shows only the x
     component and that moving it makes all three equal. Reporting a departure
     the page really does honour is rule 3 the right way round; applying x to
     all three and calling it restored would be the failure. */
  const sc = inst.transform.scale;
  if (!(sc[0] === sc[1] && sc[1] === sc[2]))
    notes.push(note('clamped', `${path}.transform.scale is not uniform `
      + `(${sc.join(', ')}) — it is applied as saved, and the scale control shows `
      + `${sc[0]}; moving that control makes all three equal`));

  // `bends` rides inside `stem` in the file as it does on the page, and it is a
  // LIST rather than a control — so it is named to the group reader as a key it
  // should not call unknown, and read by its own reader below.
  inst.stem = readGroup(STEM_FIELDS, raw.stem, `${path}.stem`, notes, opts.boundsOf, ['bends']);
  inst.stem.bends = readBends(raw.stem && raw.stem.bends, `${path}.stem.bends`, notes,
                              opts.limits ? opts.limits.stemBends : 0);

  if (raw.petals === undefined) notes.push(note('missing', `${path}.petals is missing`));
  else if (!Array.isArray(raw.petals)) notes.push(note('invalid', `${path}.petals is not a list`));
  else {
    const seen = new Set();
    raw.petals.forEach((p, i) => {
      const where = `${path}.petals[${i}]`;
      if (!p || typeof p !== 'object') { notes.push(note('invalid', `${where} is not a petal warp`)); return; }
      if (!Number.isInteger(p.index) || p.index < 0) {
        notes.push(note('invalid', `${where}.index ${JSON.stringify(p.index)} is not a petal index`)); return;
      }
      if (seen.has(p.index)) { notes.push(note('invalid', `${where}.index ${p.index} appears twice`)); return; }
      seen.add(p.index);
      const vals = readGroup(PETAL_FIELDS, { along: p.along, across: p.across }, where, notes, opts.boundsOf);
      const bends = readBends(p.bends, `${where}.bends`, notes, opts.limits ? opts.limits.petalBends : 0);
      inst.petals.push({ index: p.index, ...vals, bends: bends || [] });
    });
  }
  for (const k of Object.keys(raw)) {
    if (!INSTANCE_KEYS.includes(k)) notes.push(note('unknown', `${path}.${k} is not a field this page knows`));
  }
  return inst;
}

export const isIdentityTransform = t => !!t
  && t.position.every(n => n === 0) && t.rotationDeg.every(n => n === 0)
  && t.scale.every(n => n === 1);

/* THE READER. `opts.boundsOf(controlId)` hands back that control's own
   `{min, max, step}` — the markup is the one owner of a slider's range, so this
   file holds none of them — and `opts.limits` the two bend caps the page
   enforces. Returns `{ ok, error }` on a refusal, or `{ ok, doc, notes }`;
   NOTHING is applied by this function. */
export function readDoc(obj, opts = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    return { ok: false, error: 'this file is not a JSON object' };
  if (obj.format !== FORMAT)
    return { ok: false, error: `this is not a ${FORMAT} file — its "format" reads `
                               + `${JSON.stringify(obj.format ?? null)}` };
  const v = obj.version;
  if (!Number.isInteger(v) || v < 1)
    return { ok: false, error: `its "version" is ${JSON.stringify(v ?? null)}, which is not a version` };
  if (v > VERSION)
    return { ok: false, error: `this file is version ${v} and this page reads up to ${VERSION}. `
                               + 'Reading it would mean ignoring whatever the newer version added, '
                               + 'which is exactly the silent partial restore this format is built to avoid.' };

  const notes = [];
  const doc = { format: FORMAT, version: v, app: obj.app ?? null, savedAt: obj.savedAt ?? null };
  doc.frame = readGroup(FRAME_FIELDS, obj.frame, 'frame', notes, opts.boundsOf);
  doc.draw = readGroup(DRAW_FIELDS, obj.draw, 'draw', notes, opts.boundsOf);
  doc.view = readGroup(VIEW_FIELDS, obj.view, 'view', notes, opts.boundsOf);

  doc.camera = null;
  if (!obj.camera || typeof obj.camera !== 'object') notes.push(note('missing', 'camera is missing'));
  else {
    const position = readVec3(obj.camera.position, 'camera.position', notes);
    const target = readVec3(obj.camera.target, 'camera.target', notes);
    const fov = typeof obj.camera.fov === 'number' && obj.camera.fov > 0 ? obj.camera.fov : null;
    if (fov === null) notes.push(note('invalid', 'camera.fov is not a positive number'));
    if (position && target) doc.camera = { position, target, fov };
  }

  /* A MISSING SELECTION LEAVES THE PAGE ALONE, like every other missing field —
     null here, and the applier writes nothing. A file hand-written without one
     should not deselect the petal you were working on. A selection that IS
     present but names something that is not an index is a different case: it
     cannot be honoured, so it reads as "nothing selected" with its own note. */
  doc.selection = null;
  if (!obj.selection || typeof obj.selection !== 'object') notes.push(note('missing', 'selection is missing — the page keeps the petal it has'));
  else {
    doc.selection = { instance: 0, petal: -1 };
    const s = obj.selection;
    if (Number.isInteger(s.instance)) doc.selection.instance = s.instance;
    else notes.push(note('invalid', `selection.instance ${JSON.stringify(s.instance)} is not an index`));
    if (Number.isInteger(s.petal)) doc.selection.petal = s.petal;
    else notes.push(note('invalid', `selection.petal ${JSON.stringify(s.petal)} is not an index`));
  }

  if (!Array.isArray(obj.instances) || obj.instances.length === 0)
    return { ok: false, error: 'this file carries no instances — a composition holds at least one bloom' };
  /* HOW MANY OF THESE THE PAGE CAN ACTUALLY HONOUR IS THE PAGE'S BUSINESS, NOT
     THIS READER'S. It used to be said here — "this page draws one" — which was
     true when it was written and is a claim about a capability rather than
     about the file. The applier compares the file's instance count against the
     grids that are loaded and reports the difference; this function reads them
     all. */
  doc.instances = obj.instances.map((raw, i) => readInstance(raw, `instances[${i}]`, notes, opts));

  for (const k of Object.keys(obj)) {
    if (!TOP_LEVEL_KEYS.includes(k)) notes.push(note('unknown', `${k} is not a field this page knows`));
  }
  return { ok: true, doc, notes };
}

/* WHICH SAVED WARPS THE LOADED GRID CAN ACTUALLY TAKE. Pure, so the rule is
   driven in the gate rather than inferred from a picture: a warp for a petal
   this grid does not have is DROPPED and counted, never folded onto a
   neighbour, because a warp landing on the wrong petal is the one outcome
   worse than a warp not landing at all. */
export function resolvePetals(list, hasPetal) {
  const applied = [], dropped = [];
  for (const p of list || []) (hasPetal(p.index) ? applied : dropped).push(p);
  return { applied, dropped };
}

// The density sliders' own ends, imported rather than restated, so a change to
// the grid module's range is not something this file can disagree with.
export const DENSITY_RANGE = Object.freeze({ min: MIN_DENSITY, max: MAX_DENSITY });
