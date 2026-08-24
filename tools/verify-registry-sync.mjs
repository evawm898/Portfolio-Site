/* ===================================================================
   verify-registry-sync.mjs — BUILD GATE: flower-registry.js must agree with
   flower.html, always. The registry is the single source of truth from which
   flower.js derives its inputs map, readUI, DEFAULTS, reset, refreshLabels and the
   slider-listener set. Those derivations are only safe if the registry can never
   silently drift from the hand-written control markup, so this check runs in CI and
   FAILS THE BUILD (non-zero exit) on any disagreement.

   It is a pure static parse of flower.html (no browser, no deps) compared field by
   field against the committed registry. It fails if, for any control:
     - it exists in the HTML but not the registry, or vice versa (chrome excepted);
     - id, kind/type, min, max, step, a select's option values / order / hidden /
       disabled flags, the default, or any gating data-attribute disagrees;
     - the DOM order within a section disagrees with the registry order.
   And, folding in the duplicate-span guard (the class of bug that mislabeled the
   absorption slider):
     - any data-value read-out span is keyed to an id with no control (orphan), or
       the same id carries more than one label or more than one data-value span;
     - a slider that declares a read-out (fmt) has exactly one data-value span.

   Usage: node tools/verify-registry-sync.mjs   (exit 0 = in sync, 1 = drift)
   =================================================================== */
import { readFileSync } from 'node:fs';

const REPO = new URL('..', import.meta.url).pathname;
const H = readFileSync(REPO + 'flower.html', 'utf8');
const { CONTROLS, evalPredicate, predicateDrivers } = await import(REPO + 'flower-registry.js');

// Gating attributes that must NO LONGER appear on any control wrapper.
const GATES = ['data-bloom-styles', 'data-tip-styles', 'data-infill-styles', 'data-cont-margin', 'data-center-arch', 'data-center-styles', 'data-recept', 'data-recept-dome', 'data-recept-open', 'data-recept-ribbed', 'data-sepal', 'data-sepal-tip', 'data-stem', 'data-leaf', 'data-layers-multi', 'data-bil-petal', 'data-hide-bilateral'];

// Chrome controls live in the HTML but intentionally not in the registry (handled
// directly in flower.js). They are exempt from the "HTML has, registry lacks" check.
const CHROME = new Set(['viewPreset', 'autoRotate', 'saveNameInput', 'spaceSeed', 'advancedToggle']);

const fail = [];
const err = (m) => fail.push(m);

// ---- attribute + section helpers (mirror tools/extract-registry.mjs) -------------
const attr = (tag, name) => {
  const r = new RegExp(name + '="([^"]*)"').exec(tag);
  if (r) return r[1];
  return new RegExp('(?:^|\\s)' + name + '(?=\\s|>|$)').test(tag) ? true : null;
};
const secRe = /aria-controls="(acc-[a-z]+)"/g;
const secs = []; let sm;
while ((sm = secRe.exec(H))) secs.push({ id: sm[1], at: sm.index });
secs.push({ id: '(end)', at: H.length });
const sectionOf = (idx) => { let s = '(view)'; for (let i = 0; i < secs.length - 1; i++) if (idx >= secs[i].at && idx < secs[i + 1].at) s = secs[i].id; return s; };

// ---- parse every control out of the HTML, in source (DOM) order ------------------
const parsed = [];
let m;
const inputRe = /<input\b[^>]*\bid="([a-zA-Z0-9]+)"[^>]*>/g;
while ((m = inputRe.exec(H))) {
  const tag = m[0], id = m[1], idx = m.index;
  const type = attr(tag, 'type') || 'text';
  const kind = type === 'checkbox' ? 'checkbox' : (type === 'range' ? 'slider' : 'text');
  parsed.push({ id, idx, kind, section: sectionOf(idx),
    min: attr(tag, 'min'), max: attr(tag, 'max'), step: attr(tag, 'step'),
    default: kind === 'checkbox' ? (attr(tag, 'checked') === true) : (attr(tag, 'value') ?? ''),
    ...divInfo(idx) });
}
const selRe = /<select\b[^>]*\bid="([a-zA-Z0-9]+)"[^>]*>([\s\S]*?)<\/select>/g;
while ((m = selRe.exec(H))) {
  const id = m[1], idx = m.index, body = m[2];
  const opts = []; let o; const oRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/g;
  while ((o = oRe.exec(body))) {
    const oa = '<x ' + o[1] + '>';
    opts.push({ value: attr(oa, 'value') ?? o[2].trim(), selected: attr(oa, 'selected') === true, hidden: attr(oa, 'hidden') === true, disabled: attr(oa, 'disabled') === true });
  }
  const def = (opts.find((x) => x.selected) || opts[0] || {}).value;
  parsed.push({ id, idx, kind: 'select', section: sectionOf(idx), options: opts, default: def, ...divInfo(idx) });
}
parsed.sort((a, b) => a.idx - b.idx);

function divInfo(idx) {
  const before = H.slice(0, idx);
  const divAt = before.lastIndexOf('<div class="fl-ctrl"');
  const divTag = H.slice(divAt, H.indexOf('>', divAt) + 1);
  // A control wrapper must carry NO gating attribute. Visibility conditions live in the
  // registry as `visibleWhen` predicates now, and a data-* attribute on a wrapper would be
  // a second, unevaluatable declaration of the same thing — the exact drift this change
  // removed. (The attributes remain on HINT and NOTE elements, which have no registry row;
  // those are swept by applyAnnotationVisibility in flower.js.)
  const strays = GATES.filter((g) => attr(divTag, g) !== null);
  return { strays, divId: attr(divTag, 'id') || null, staticHidden: attr(divTag, 'hidden') === true };
}

// ---- compare parsed HTML controls against the registry ---------------------------
const regById = new Map(CONTROLS.map((c) => [c.id, c]));
const htmlById = new Map(parsed.map((c) => [c.id, c]));

// existence
for (const p of parsed) if (!regById.has(p.id) && !CHROME.has(p.id)) err(`HTML control "${p.id}" (${p.section}) is missing from the registry`);
for (const c of CONTROLS) if (!htmlById.has(c.id)) err(`registry control "${c.id}" is missing from flower.html`);

const numEq = (a, b) => (a == null && b == null) || (+a === +b);
// A control is statically `hidden` in the markup IFF its registry predicate can never be
// satisfied. `{any: []}` is the honest expression of "never shown" — unlike the deleted
// `permanentHidden` flag, it can be evaluated by the same evaluator as every other
// predicate, and it sits beside a `hiddenReason` saying WHY. That flag was wrong on one of
// its four users for as long as nothing could check it.
const neverVisible = (c) => !!(c.visibleWhen && Array.isArray(c.visibleWhen.any) && c.visibleWhen.any.length === 0);

for (const c of CONTROLS) {
  const p = htmlById.get(c.id);
  if (!p) continue;
  if (p.kind !== c.kind) err(`${c.id}: kind HTML=${p.kind} registry=${c.kind}`);
  if (c.kind === 'slider') {
    if (!numEq(p.min, c.min)) err(`${c.id}: min HTML=${p.min} registry=${c.min}`);
    if (!numEq(p.max, c.max)) err(`${c.id}: max HTML=${p.max} registry=${c.max}`);
    if (!numEq(p.step, c.step)) err(`${c.id}: step HTML=${p.step} registry=${c.step}`);
    if (!numEq(p.default, c.default)) err(`${c.id}: default HTML=${p.default} registry=${c.default}`);
  } else if (c.kind === 'select') {
    const ph = p.options, rg = c.options || [];
    if (ph.length !== rg.length) err(`${c.id}: option count HTML=${ph.length} registry=${rg.length}`);
    else for (let i = 0; i < ph.length; i++) {
      if (String(ph[i].value) !== String(rg[i].value)) err(`${c.id}: option[${i}] value HTML=${ph[i].value} registry=${rg[i].value}`);
      if (!!ph[i].hidden !== !!rg[i].hidden) err(`${c.id}: option "${ph[i].value}" hidden HTML=${!!ph[i].hidden} registry=${!!rg[i].hidden}`);
      if (!!ph[i].disabled !== !!rg[i].disabled) err(`${c.id}: option "${ph[i].value}" disabled HTML=${!!ph[i].disabled} registry=${!!rg[i].disabled}`);
    }
    if (String(p.default) !== String(c.default)) err(`${c.id}: default HTML=${p.default} registry=${c.default}`);
  } else if (c.kind === 'checkbox') {
    if (!!p.default !== !!c.default) err(`${c.id}: default(checked) HTML=${!!p.default} registry=${!!c.default}`);
  } else { // text
    if (String(p.default) !== String(c.default)) err(`${c.id}: default HTML=${JSON.stringify(p.default)} registry=${JSON.stringify(c.default)}`);
  }
  if (p.strays.length) err(`${c.id}: wrapper still carries gating attribute(s) ${p.strays.join(', ')} — visibility is declared in the registry (visibleWhen), not in the markup`);
  if ((p.divId || null) !== (c.divId || null)) err(`${c.id}: divId HTML=${p.divId} registry=${c.divId || null}`);
  if (p.staticHidden !== neverVisible(c)) err(`${c.id}: static hidden HTML=${p.staticHidden} but registry visibleWhen is ${neverVisible(c) ? 'unsatisfiable ({any:[]})' : 'satisfiable'} — a wrapper is statically hidden iff its predicate can never be true`);
  if (neverVisible(c) && !c.hiddenReason) err(`${c.id}: visibleWhen is unsatisfiable but no hiddenReason says why — "never shown" without a reason is the permanentHidden flag again`);
}

// DOM order within each section (registry order must equal HTML source order)
const sections = [...new Set(CONTROLS.map((c) => c.section))];
for (const sid of sections) {
  const htmlIds = parsed.filter((p) => p.section === sid && regById.has(p.id)).map((p) => p.id);
  const regIds = CONTROLS.filter((c) => c.section === sid).map((c) => c.id);
  if (htmlIds.join(',') !== regIds.join(',')) err(`section ${sid}: DOM order != registry order\n    HTML:     ${htmlIds.join(', ')}\n    registry: ${regIds.join(', ')}`);
}

// ---- duplicate / orphan span + label guard (condition 2) -------------------------
const countAll = (re) => { const map = new Map(); let x; while ((x = re.exec(H))) map.set(x[1], (map.get(x[1]) || 0) + 1); return map; };
const valSpans = countAll(/data-value="([a-zA-Z0-9]+)"/g);
const labels = countAll(/<label\s+for="([a-zA-Z0-9]+)"/g);
for (const [id, n] of valSpans) {
  if (n > 1) err(`duplicate data-value span: "${id}" appears ${n}× (this is the absorption-mislabel class of bug)`);
  if (!regById.has(id) && !CHROME.has(id)) err(`orphan data-value span: "${id}" is keyed to no registry control`);
}
for (const [id, n] of labels) if (n > 1) err(`duplicate <label for="${id}">: appears ${n}×`);
// every slider that declares a read-out (fmt) must have exactly one data-value span
for (const c of CONTROLS) if (c.kind === 'slider' && c.fmt) {
  const n = valSpans.get(c.id) || 0;
  if (n !== 1) err(`${c.id}: declares fmt "${c.fmt}" but has ${n} data-value span(s) (expected exactly 1)`);
}

// ---- the retired flags must not come back ----------------------------------------
// `permanentHidden` and `imperativeGate` were both flags that ASSERTED something about
// visibility without stating the condition. captureDist carried `imperativeGate` because
// its condition is a compound AND across two selects, which the old single-attribute
// gating could not express — this file used to cap that exception at exactly one control
// and tell whoever hit it to "extend the declarative gating vocabulary instead". That is
// what happened: the vocabulary is `visibleWhen`, it expresses compound conditions, and
// neither flag has an honest use left.
for (const c of CONTROLS) {
  if (c.permanentHidden) err(`${c.id}: carries the retired permanentHidden flag — use visibleWhen {any: []} plus a hiddenReason, which is checkable`);
  if (c.imperativeGate) err(`${c.id}: carries the retired imperativeGate flag — state the condition as a visibleWhen predicate instead`);
  if (c.gating) err(`${c.id}: carries the retired gating field (an attribute NAME, not a condition) — use visibleWhen`);
}

// ---- every predicate must be evaluable and reference real controls ----------------
// A predicate naming a control that does not exist would silently... not silently do
// anything: evalPredicate reads undefined and returns false, hiding the control forever.
// That is the shipped-and-unreachable failure this project has produced four times.
const allIds = new Set(CONTROLS.map((c) => c.id));
for (const c of CONTROLS) {
  for (const field of ['visibleWhen', 'standardVisibleWhen']) {
    if (!c[field]) continue;
    let drivers;
    try { drivers = predicateDrivers(c[field]); }
    catch (e) { err(`${c.id}: ${field} is not a valid predicate — ${e.message}`); continue; }
    for (const d of drivers) if (!allIds.has(d)) err(`${c.id}: ${field} reads control "${d}", which is not in the registry`);
    try { evalPredicate(c[field], Object.fromEntries([...allIds].map((k) => [k, '']))); }
    catch (e) { err(`${c.id}: ${field} does not evaluate — ${e.message}`); }
  }
}

// ---- THIRD list: the petal-shape picker ------------------------------------------
// The registry and the markup are checked against each other above, but the shape
// picker has a third list that neither of them sees: PICKER_SHAPE_NAMES in
// flower-shapes.js, which is what applyShape() actually resolves a pick against.
// If they disagree the failure is silent in the worst way — an option listed in the
// markup whose applyShape(name) finds no bundle and returns without doing anything
// (listed-but-inert), or a bundle that exists with no way to pick it
// (implemented-but-unreachable). Both are the "shipped means reachable" failure.
{
  const { PICKER_SHAPE_NAMES, SHAPES } = await import(REPO + 'flower-shapes.js');
  const picker = CONTROLS.find((c) => c.id === 'petalShape');
  if (!picker) err('petalShape missing from the registry');
  else {
    const listed = picker.options.filter((o) => o.value !== '__custom').map((o) => o.value);
    const named = [...PICKER_SHAPE_NAMES];
    if (listed.join(',') !== named.join(',')) {
      err(`petalShape options [${listed.join(', ')}] do not match PICKER_SHAPE_NAMES [${named.join(', ')}] `
        + `(order included) — a listed option with no bundle silently does nothing when picked, and a bundle `
        + `with no option cannot be reached.`);
    }
    for (const n of named) if (!SHAPES[n]) err(`PICKER_SHAPE_NAMES lists "${n}" but flower-shapes.js has no such bundle`);
  }
}

// ---- report ----------------------------------------------------------------------
if (fail.length) {
  console.error(`registry-sync: FAIL — ${fail.length} disagreement(s) between flower-registry.js and flower.html:\n`);
  for (const f of fail) console.error('  • ' + f);
  console.error('\nThe registry is the single source of truth; reconcile it with the markup (or vice versa) before merging.');
  process.exit(1);
}
console.log(`registry-sync: OK — ${CONTROLS.length} controls agree with flower.html (fields, options, gating, order, no duplicate/orphan spans).`);
