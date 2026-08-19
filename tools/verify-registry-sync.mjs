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
const { CONTROLS } = await import(REPO + 'flower-registry.js');

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
  const gating = {};
  const GATES = ['data-bloom-styles', 'data-tip-styles', 'data-infill-styles', 'data-cont-margin', 'data-center-arch', 'data-center-styles', 'data-recept', 'data-recept-dome', 'data-recept-open', 'data-recept-ribbed', 'data-sepal', 'data-sepal-tip', 'data-stem', 'data-leaf', 'data-layers-multi', 'data-bil-petal', 'data-hide-bilateral'];
  for (const g of GATES) { const v = attr(divTag, g); if (v !== null) gating[g] = v; }
  return { gating, divId: attr(divTag, 'id') || null, permanentHidden: attr(divTag, 'hidden') === true };
}

// ---- compare parsed HTML controls against the registry ---------------------------
const regById = new Map(CONTROLS.map((c) => [c.id, c]));
const htmlById = new Map(parsed.map((c) => [c.id, c]));

// existence
for (const p of parsed) if (!regById.has(p.id) && !CHROME.has(p.id)) err(`HTML control "${p.id}" (${p.section}) is missing from the registry`);
for (const c of CONTROLS) if (!htmlById.has(c.id)) err(`registry control "${c.id}" is missing from flower.html`);

const numEq = (a, b) => (a == null && b == null) || (+a === +b);
const gatingEq = (a = {}, b = {}) => {
  const ak = Object.keys(a).sort(), bk = Object.keys(b).sort();
  if (ak.join(',') !== bk.join(',')) return false;
  for (const k of ak) { const av = a[k] === true ? true : a[k]; const bv = b[k] === true ? true : b[k]; if (String(av) !== String(bv)) return false; }
  return true;
};

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
  if (!gatingEq(p.gating, c.gating)) err(`${c.id}: gating HTML=${JSON.stringify(p.gating)} registry=${JSON.stringify(c.gating || {})}`);
  if ((p.divId || null) !== (c.divId || null)) err(`${c.id}: divId HTML=${p.divId} registry=${c.divId || null}`);
  if (!!p.permanentHidden !== !!c.permanentHidden) err(`${c.id}: permanentHidden HTML=${!!p.permanentHidden} registry=${!!c.permanentHidden}`);
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

// ---- report ----------------------------------------------------------------------
if (fail.length) {
  console.error(`registry-sync: FAIL — ${fail.length} disagreement(s) between flower-registry.js and flower.html:\n`);
  for (const f of fail) console.error('  • ' + f);
  console.error('\nThe registry is the single source of truth; reconcile it with the markup (or vice versa) before merging.');
  process.exit(1);
}
console.log(`registry-sync: OK — ${CONTROLS.length} controls agree with flower.html (fields, options, gating, order, no duplicate/orphan spans).`);
