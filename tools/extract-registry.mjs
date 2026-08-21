// Extract a faithful base registry from flower.html's static source, so the registry
// mirrors today's controls exactly (fidelity for the STL-diff). Emits JSON to scratchpad.
import { readFileSync, writeFileSync } from 'node:fs';
const H = readFileSync(new URL('../flower.html', import.meta.url), 'utf8');

// section boundaries: aria-controls="acc-X" marks a section body; assign by index range.
const secRe = /aria-controls="(acc-[a-z]+)"/g; let m; const secs = [];
while ((m = secRe.exec(H))) secs.push({ id: m[1], at: m.index });
secs.push({ id: '(end)', at: H.length });
const sectionOf = (idx) => { let s = '(view)'; for (let i = 0; i < secs.length - 1; i++) if (idx >= secs[i].at && idx < secs[i + 1].at) s = secs[i].id; return s; };

const attr = (tag, name) => { const r = new RegExp(name + '="([^"]*)"').exec(tag); return r ? r[1] : (new RegExp('(?:^|\\s)' + name + '(?=\\s|>|$)').test(tag) ? true : null); };
const stripTags = (s) => s.replace(/<[^>]*>/g, '').replace(/&mdash;/g, '—').replace(/&rarr;/g, '→').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// find each <input ...id=...> and <select id=...>...</select>
const controls = [];
const inputRe = /<input\b[^>]*\bid="([a-zA-Z0-9]+)"[^>]*>/g;
while ((m = inputRe.exec(H))) {
  const tag = m[0], id = m[1], idx = m.index;
  const type = attr(tag, 'type') || 'text';
  controls.push({ id, idx, tag, kind: type === 'checkbox' ? 'checkbox' : (type === 'range' ? 'slider' : type), el: 'input',
    min: attr(tag, 'min'), max: attr(tag, 'max'), step: attr(tag, 'step'),
    default: type === 'checkbox' ? (attr(tag, 'checked') === true) : (attr(tag, 'value') ?? '') });
}
const selRe = /<select\b[^>]*\bid="([a-zA-Z0-9]+)"[^>]*>([\s\S]*?)<\/select>/g;
while ((m = selRe.exec(H))) {
  const id = m[1], idx = m.index, body = m[2];
  const opts = []; let o; const oRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/g;
  while ((o = oRe.exec(body))) { const oa = o[1]; opts.push({ value: (attr('<x ' + oa + '>', 'value') ?? stripTags(o[2])), selected: attr('<x ' + oa + '>', 'selected') === true, hidden: attr('<x ' + oa + '>', 'hidden') === true, disabled: attr('<x ' + oa + '>', 'disabled') === true, text: stripTags(o[2]) }); }
  const def = (opts.find((x) => x.selected) || opts[0] || {}).value;
  controls.push({ id, idx, kind: 'select', el: 'select', options: opts, default: def });
}

// for each control: enclosing <div class="fl-ctrl" ...> opening tag, label text, first hint, section
for (const c of controls) {
  const before = H.slice(0, c.idx);
  const divAt = before.lastIndexOf('<div class="fl-ctrl"');
  const divTag = H.slice(divAt, H.indexOf('>', divAt) + 1);
  const gating = {};
  for (const g of ['data-bloom-styles', 'data-tip-styles', 'data-infill-styles', 'data-cont-margin', 'data-center-arch', 'data-center-styles', 'data-recept', 'data-recept-dome', 'data-recept-open', 'data-recept-ribbed', 'data-sepal', 'data-sepal-tip', 'data-stem', 'data-leaf', 'data-layers-multi', 'data-bil-petal', 'data-hide-bilateral']) {
    const v = attr(divTag, g); if (v !== null) gating[g] = v;
  }
  c.divId = attr(divTag, 'id') || null;                 // imperative-gated wrapper (e.g. captureDistCtrl)
  c.permanentHidden = attr(divTag, 'hidden') === true;
  c.gating = gating;
  const lblRe = new RegExp('<label for="' + c.id + '">([\\s\\S]*?)</label>'); const lm = lblRe.exec(H);
  c.label = lm ? stripTags(lm[1]) : null;
  c.hasVal = new RegExp('data-value="' + c.id + '"').test(H);
  const afterInput = H.indexOf('>', c.idx);
  const hintM = /<span class="fl-ctrl__hint"[^>]*>([\s\S]*?)<\/span>/.exec(H.slice(afterInput, afterInput + 900));
  c.hint = hintM ? stripTags(hintM[1]) : null;
  c.section = sectionOf(c.idx);
}
controls.sort((a, b) => a.idx - b.idx);
controls.forEach((c) => { delete c.idx; delete c.tag; });

// --- emit the committable base registry module (single source of truth, WIP) ---
const SEC_LABEL = { 'acc-bloom': 'Bloom', 'acc-layers': 'Layers', 'acc-petal': 'Petal', 'acc-tip': 'Tip', 'acc-infill': 'Infill', 'acc-center': 'Center', 'acc-base': 'Base' };
const CHROME = new Set(['viewPreset', 'autoRotate', 'saveNameInput', 'spaceSeed']);
const params = controls.filter((c) => !CHROME.has(c.id));            // design/calibration params only
const row = (c) => {
  const o = { id: c.id, section: c.section, kind: c.kind };
  if (c.kind === 'slider') { o.min = +c.min; o.max = +c.max; o.step = +c.step; o.default = +c.default; }
  else if (c.kind === 'checkbox') o.default = !!c.default;
  else if (c.kind === 'select') { o.options = c.options.map((x) => ({ value: x.value, text: x.text, ...(x.hidden ? { hidden: true } : {}), ...(x.disabled ? { disabled: true } : {}) })); o.default = c.default; }
  else o.default = c.default;                                        // text
  if (c.label) o.label = c.label;
  if (c.hint) o.hint = c.hint;
  if (Object.keys(c.gating).length) o.gating = c.gating;
  if (c.divId) o.divId = c.divId;
  if (c.permanentHidden) o.permanentHidden = true;
  return o;
};
const header = `/* ===================================================================\n   flower-registry.js — SINGLE SOURCE OF TRUTH for the control panel.\n\n   Auto-extracted base (id / kind / range / default / label / hint / options /\n   section / gating) from flower.html by tools/extract-registry.mjs. Augmentation\n   (tier, standardLabel, declarative gate predicates) is layered on in the fields\n   marked below. The DOM, readUI, DEFAULTS, applyDesign, reset, labels, listeners\n   and the Standard/Advanced filter are all derived from this one array, so adding\n   or removing a control is a single edit here.  [P1 — work in progress]\n   =================================================================== */\n\n`;
const secLine = 'export const SECTIONS = [\n' + Object.entries(SEC_LABEL).map(([id, label]) => `  { id: ${JSON.stringify(id)}, label: ${JSON.stringify(label)} },`).join('\n') + '\n];\n\n';
const ctrlLine = 'export const CONTROLS = [\n' + params.map((c) => '  ' + JSON.stringify(row(c))).join(',\n') + ',\n];\n';
writeFileSync(new URL('../flower-registry.js', import.meta.url), header + secLine + ctrlLine);
console.log('emitted flower-registry.js with', params.length, 'params (', controls.length - params.length, 'chrome excluded )');
// summary
const bySec = {}; for (const c of controls) bySec[c.section] = (bySec[c.section] || 0) + 1;
console.log('total controls:', controls.length);
console.log('by section:', JSON.stringify(bySec));
console.log('kinds:', JSON.stringify(controls.reduce((a, c) => (a[c.kind] = (a[c.kind] || 0) + 1, a), {})));
console.log('permanent-hidden:', controls.filter((c) => c.permanentHidden).map((c) => c.id).join(', '));
console.log('div-id gated:', controls.filter((c) => c.divId).map((c) => c.id + '#' + c.divId).join(', '));
console.log('no label:', controls.filter((c) => !c.label).map((c) => c.id).join(', '));
console.log('selects with hidden/disabled options:', controls.filter((c) => c.options && c.options.some((o) => o.hidden || o.disabled)).map((c) => c.id + '[' + c.options.filter((o) => o.hidden || o.disabled).map((o) => o.value).join(',') + ']').join(' '));
