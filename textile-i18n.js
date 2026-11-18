// textile-i18n.js — the runtime half of the page translations (tools/i18n/build.mjs is the other).
//
// Strings a module DRAWS (svg captions, panel names) cannot be replaced in the HTML, so a module
// wraps each one in tr('English text'). On an English page there is no table and tr() returns its
// argument: the English text in the source IS the key. A generated page carries a
// <script type="application/json" id="i18n-strings"> table of { English: translation } that the
// generator fills from i18n/<locale>/<page>.json; an entry that is missing or empty falls back to
// English. {name} placeholders are filled from `vars` after the lookup, so a translation can move them.
let table = null;
const load = () => {
  table = {};
  try {
    const el = typeof document !== 'undefined' && document.getElementById('i18n-strings');
    if (el) table = JSON.parse(el.textContent) || {};
  } catch { table = {}; }
  return table;
};
// msg('English') marks a string held in DATA (a table of labels) for translation; it returns it
// unchanged, and the code that draws it calls tr() on the value.
export const msg = s => s;
export const tr = (s, vars) => {
  const out = (table || load())[s] || s;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : out;
};
