#!/usr/bin/env node
// tools/i18n/build.mjs — static page translations.
//
// The ENGLISH page is the source. Every translatable element carries a data-i18n key (a
// translatable attribute: data-i18n-attr="aria-label:key"). A locale's strings live in
// i18n/<locale>/<page>.json as { key: { en, <locale> } }; the generator writes <dir>/<page>.html
// from the English page plus those strings. Nothing runs in the browser except tr() for the
// strings a module draws (textile-i18n.js).
//
//   node tools/i18n/build.mjs --annotate      add data-i18n keys to elements that have none
//   node tools/i18n/build.mjs --extract       refresh every i18n/<locale>/*.json from the pages
//   node tools/i18n/build.mjs --build         write the pages of every PUBLISHED locale
//   node tools/i18n/build.mjs --check         fail if anything above would change a file
//   node tools/i18n/build.mjs --pseudo <dir>  build a pseudo-locale into <dir> (every string
//                                             wrapped in ⟦ ⟧) — the self-test's input
//   node tools/i18n/build.mjs --self-test     prove the generator reaches every string
//
// What a key is:
//   * written into the HTML by --annotate as <scope>.<tag><n>; the scope is the nearest ancestor
//     id (the section), `chrome` for the site nav / footer / back-to-top (keyed by the slug of the
//     text, so two pages share one entry in chrome.json), `hero`, `meta` or `page`;
//   * inside a GENERATED block (config `autoRegions`, e.g. the baked knit diagram) no attribute is
//     written, because the block's own generator would drop it: the key is <scope>.<slug of text>;
//   * `js:<English text>` for a string a module draws — collected from tr('…') calls.
// A section listed in a page's `hold` is skipped whole (it is being rewritten elsewhere); --check
// names what is on hold so it cannot be forgotten.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, 'i18n/config.json'), 'utf8'));
const read = p => readFileSync(join(ROOT, p), 'utf8');

// ---------------------------------------------------------------- the HTML reader
const VOID = new Set(['meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track']);
const INLINE = new Set(['a', 'strong', 'em', 'b', 'i', 'span', 'code', 'sup', 'sub', 'br', 'abbr', 'small', 'mark', 'u', 'wbr', 'tspan']);
const ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
const ENT = { mdash: '—', ndash: '–', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', rarr: '→', larr: '←', uarr: '↑', darr: '↓', times: '×', deg: '°', hellip: '…', copy: '©', middot: '·' };
const decode = s => s.replace(/&([a-z]+);/g, (m, n) => ENT[n] ?? m);
const clean = s => decode(s).replace(/\s+/g, ' ').trim();
const slug = s => clean(s).replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'x';
const hasLetters = s => /[A-Za-z]/.test(decode(s).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ''));

const TOKEN = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
const ATTR = /([^\s=>\/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g;

export function parse(src) {
  const root = { type: 'el', name: '#root', attrs: new Map(), children: [], parent: null };
  let cur = root, last = 0, m;
  const text = (a, b) => { if (b > a) cur.children.push({ type: 'text', start: a, end: b, parent: cur }); };
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    text(last, m.index); last = TOKEN.lastIndex;
    if (m[0].startsWith('<!')) { cur.children.push({ type: 'comment', start: m.index, end: last, parent: cur }); continue; }
    const name = m[2].toLowerCase();
    if (m[1]) {                                             // a close tag
      let n = cur; while (n !== root && n.name !== name) n = n.parent;
      if (n === root) throw new Error(`stray </${name}> at offset ${m.index}`);
      n.closeStart = m.index; n.closeEnd = last; cur = n.parent; continue;
    }
    const el = { type: 'el', name, attrs: new Map(), children: [], parent: cur, openStart: m.index, openEnd: last, nameEnd: m.index + 1 + m[2].length };
    const base = el.nameEnd; let a; ATTR.lastIndex = 0;
    while ((a = ATTR.exec(m[3]))) {
      if (a[3] == null) { el.attrs.set(a[1].toLowerCase(), { value: '', vs: -1, ve: -1 }); continue; }
      const q = a[3][0] === '"' || a[3][0] === "'" ? 1 : 0, vs = base + a.index + a[1].length + a[2].length + q;
      el.attrs.set(a[1].toLowerCase(), { value: a[3].slice(q, a[3].length - q), vs, ve: vs + a[3].length - 2 * q });
    }
    cur.children.push(el);
    if (VOID.has(name) || m[4]) { el.closeStart = el.closeEnd = last; continue; }
    if (name === 'script' || name === 'style') {            // raw text to the close tag
      const end = src.toLowerCase().indexOf(`</${name}`, last), gt = src.indexOf('>', end) + 1;
      if (end < 0) throw new Error(`unclosed <${name}>`);
      el.children.push({ type: 'text', start: last, end, parent: el }); el.closeStart = end; el.closeEnd = gt;
      last = TOKEN.lastIndex = gt; continue;
    }
    cur = el;
  }
  text(last, src.length);
  if (cur !== root) throw new Error(`unclosed <${cur.name}> opened at offset ${cur.openStart}`);
  return root;
}
const walk = (n, f) => { if (f(n) === false) return; for (const c of n.children || []) if (c.type === 'el') walk(c, f); };
const inner = (src, el) => src.slice(el.openEnd, el.closeStart);
const attr = (el, n) => el.attrs.get(n)?.value;
const classes = el => (attr(el, 'class') || '').split(/\s+/);
const up = (el, f) => { for (let n = el; n && n.name !== '#root'; n = n.parent) if (f(n)) return n; return null; };
const lineOf = (src, off) => src.slice(0, off).split('\n').length;

// ---------------------------------------------------------------- units: what gets translated
// A unit is an element with text of its own whose descendants are all inline; its string is its
// inner HTML. Translatable attributes are units of their own.
export function units(src, page) {
  const root = parse(src), out = [], problems = [], held = [];
  const regions = (CONFIG.autoRegions || []).flatMap(r => {
    const spans = []; let i = 0;
    for (;;) { const a = src.indexOf(r.start, i); if (a < 0) break; const b = src.indexOf(r.end, a); if (b < 0) break; spans.push({ a, b, scope: r.scope }); i = b; }
    return spans;
  });
  const regionOf = el => regions.find(r => el.openStart >= r.a && el.openStart < r.b);
  const scopeOf = el => {
    if (up(el, n => n.name === 'head')) return 'meta';
    const reg = regionOf(el); if (reg) return reg.scope;
    if (up(el, n => (n.name === 'nav' && classes(n).includes('site-nav')) || n.name === 'footer' || classes(n).includes('back-to-top'))) return 'chrome';
    const sec = up(el.parent, n => n.name !== 'body' && attr(n, 'id'));
    if (sec) return attr(sec, 'id');
    return up(el, n => classes(n).includes('project__hero')) ? 'hero' : 'page';
  };
  const hold = new Set(page.hold || []);
  walk(root, el => {
    if (el.name === '#root') return;
    if (hold.has(attr(el, 'id'))) { held.push(attr(el, 'id')); return false; }
    if (el.name === 'script' || el.name === 'style') return false;
    const scope = scopeOf(el), auto = !!regionOf(el) , region = regionOf(el);
    for (const a of el.name === 'meta' && attr(el, 'name') === 'description' ? ['content'] : ATTRS) {
      const v = el.attrs.get(a); if (!v || !hasLetters(v.value)) continue;
      const declared = (attr(el, 'data-i18n-attr') || '').split(/\s+/).map(p => p.split(':')).find(p => p[0] === a)?.[1];
      out.push({ kind: 'attr', el, attr: a, en: clean(v.value), key: region ? `${scope}.${slug(v.value)}@${a}` : declared, scope, auto });
    }
    const svg = up(el.parent, n => n.name === 'svg');
    if (svg && !['text', 'title', 'desc'].includes(el.name)) return;
    const ownText = el.children.some(c => c.type === 'text' && src.slice(c.start, c.end).trim());
    if (!ownText) return;
    let blocky = null; for (const c of el.children) if (c.type === 'el') walk(c, n => { if (!INLINE.has(n.name)) blocky = n; });
    if (blocky) { problems.push(`${page.src}:${lineOf(src, el.openStart)} <${el.name}> has text of its own AND a <${blocky.name}> inside it — wrap the text in an element`); return false; }
    const en = clean(inner(src, el));
    if (hasLetters(en)) out.push({ kind: 'html', el, en, key: region ? `${scope}.${slug(en)}` : attr(el, 'data-i18n'), scope, auto });
    return false;
  });
  return { root, units: out, problems, held };
}

// ---------------------------------------------------------------- --annotate
export function annotate(src, page) {
  const { units: us, problems } = units(src, page);
  if (problems.length) throw new Error(problems.join('\n'));
  const used = new Set(us.map(u => u.key).filter(Boolean)), ins = [];
  const fresh = (scope, stem, text) => {
    if (scope === 'chrome') return `chrome.${slug(text)}`;
    for (let n = 1; ; n++) { const k = `${scope}.${stem}${n}`; if (!used.has(k)) { used.add(k); return k; } }
  };
  const attrAdds = new Map();
  for (const u of us) {
    if (u.key || u.auto) continue;
    if (u.kind === 'html') ins.push({ at: u.el.nameEnd, text: ` data-i18n="${fresh(u.scope, u.el.name === 'title' && u.scope === 'meta' ? 'title' : u.el.name, u.en)}"` });
    else { const k = fresh(u.scope, u.attr === 'content' ? 'description' : 'aria', u.en); (attrAdds.get(u.el) || attrAdds.set(u.el, []).get(u.el)).push(`${u.attr}:${k}`); }
  }
  for (const [el, pairs] of attrAdds) {
    const have = el.attrs.get('data-i18n-attr');
    ins.push(have ? { at: have.ve, text: ' ' + pairs.join(' ') } : { at: el.nameEnd, text: ` data-i18n-attr="${pairs.join(' ')}"` });
  }
  ins.sort((a, b) => b.at - a.at);
  let out = src; for (const i of ins) out = out.slice(0, i.at) + i.text + out.slice(i.at);
  return { out, added: ins.length };
}

// ---------------------------------------------------------------- strings a module draws
const TR = /\btr\(\s*('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")/g;
export function jsStrings(page) {
  const out = [];
  for (const f of page.js || []) for (const m of read(f).matchAll(TR)) { const s = new Function(`return ${m[1]}`)(); if (!out.includes(s)) out.push(s); }
  return out;
}

// ---------------------------------------------------------------- --extract
// { file: { key: en } } for one page: its own strings, and the chrome it shares.
export function extract(page) {
  const src = read(page.src), { units: us, problems, held } = units(src, page);
  const own = {}, chrome = {}, missing = [];
  for (const u of us) {
    if (!u.key) { missing.push(`${page.src}:${lineOf(src, u.el.openStart)} <${u.el.name}>${u.kind === 'attr' ? ` ${u.attr}` : ''} has no key — run --annotate`); continue; }
    const bag = u.key.startsWith('chrome.') ? chrome : own;
    if (bag[u.key] != null && bag[u.key] !== u.en) problems.push(`${page.src}: key ${u.key} names two different strings`);
    bag[u.key] = u.en;
  }
  for (const s of jsStrings(page)) own[`js:${s}`] = s;
  return { own, chrome, problems: [...problems, ...missing], held };
}
const stringsPath = (locale, name) => `i18n/${locale}/${name}.json`;
const pageName = page => page.src.replace(/\.html$/, '');
const loadStrings = (locale, name) => existsSync(join(ROOT, stringsPath(locale, name))) ? JSON.parse(read(stringsPath(locale, name))) : { locale, strings: {} };
// merge the page's current English into a locale file: a translation survives while its English
// does; when the English changes the old pair is kept beside the new one and the entry is `stale`.
export function merge(locale, name, en) {
  const old = loadStrings(locale, name).strings, strings = {};
  for (const [k, v] of Object.entries(en)) {
    const o = old[k];
    if (!o) strings[k] = { en: v, [locale]: '' };
    else if (o.en === v) strings[k] = o;
    else strings[k] = { en: v, [locale]: o[locale] || '', ...(o[locale] ? { stale: true, was: o.was || o.en } : {}) };
  }
  return JSON.stringify({ locale, source: name === 'chrome' ? 'shared site chrome' : `${name}.html`, strings }, null, 2) + '\n';
}

// ---------------------------------------------------------------- --build
const isLocal = u => u && !/^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
export function buildPage(page, locale, L, table) {
  const src0 = read(page.src), { units: us } = units(src0, page), strings = [];
  const t = k => table[k]?.[locale] || '';
  const translated = new Set(CONFIG.pages.map(p => p.src));
  const up1 = '../'.repeat(L.dir.split('/').filter(Boolean).length);
  for (const u of us) {
    const v = u.key && t(u.key); if (!v) continue;
    if (u.kind === 'html') strings.push({ a: u.el.openEnd, b: u.el.closeStart, text: v });
    else { const p = u.el.attrs.get(u.attr); strings.push({ a: p.vs, b: p.ve, text: v.replace(/"/g, '&quot;') }); }
  }
  // two passes: the strings first, then the page furniture on the RESULT — a translated string
  // carries its own links, and those need the same treatment as the ones outside it
  const apply = (text, list) => { list.sort((x, y) => y.a - x.a || y.b - x.b); for (const e of list) text = text.slice(0, e.a) + e.text + text.slice(e.b); return text; };
  const src = apply(src0, strings), root = parse(src), edits = [];
  let nav = null, lastSheet = null, head = null;
  walk(root, el => {
    if (el.name === 'html' && el.attrs.get('lang')) { const p = el.attrs.get('lang'); edits.push({ a: p.vs, b: p.ve, text: locale }); }
    if (el.name === 'head') head = el;
    if (el.name === 'nav' && classes(el).includes('site-nav')) nav = el;
    if (el.name === 'link') {
      const href = attr(el, 'href') || '';
      if (/fonts\.(googleapis|gstatic)\.com/.test(href)) { edits.push({ a: el.openStart, b: src[el.openEnd] === '\n' ? el.openEnd + 1 : el.openEnd, text: '' }); return; }
      if (attr(el, 'rel') === 'stylesheet' && isLocal(href)) lastSheet = el;
    }
    for (const a of ['href', 'src']) {
      const p = el.attrs.get(a); if (!p || !isLocal(p.value)) continue;
      const file = p.value.split(/[?#]/)[0];
      if (translated.has(file)) continue;                    // its translation sits beside this page
      edits.push({ a: p.vs, b: p.ve, text: up1 + p.value });
      if (el.name === 'a' && /\.html$/.test(file)) {         // an English-only page: say so
        edits.push({ a: el.nameEnd, b: el.nameEnd, text: ' hreflang="en"' });
        edits.push({ a: el.closeStart, b: el.closeStart, text: ' <span class="lang-mark" lang="en">(EN)</span>' });
      }
    }
    if (el.name === 'script' && attr(el, 'type') === 'module' && !attr(el, 'src')) {
      const c = el.children[0];
      if (c) edits.push({ a: c.start, b: c.end, text: src.slice(c.start, c.end).replace(/(from\s*|import\s*\(?\s*)(['"])\.\//g, `$1$2${up1}./`) });
    }
  });
  if (!head || !nav || !lastSheet) throw new Error(`${page.src}: needs a <head>, a nav.site-nav and a local stylesheet`);
  const name = pageName(page), site = CONFIG.siteUrl.replace(/\/$/, '');
  edits.push({ a: lastSheet.openEnd, b: lastSheet.openEnd, text: `\n<link rel="stylesheet" href="${up1}${CONFIG.fontsDir}/${locale}/fonts.css">\n<link rel="stylesheet" href="${up1}textile-i18n.css">` });
  const js = Object.fromEntries(jsStrings(page).map(s => [s, t(`js:${s}`)]).filter(([, v]) => v));
  edits.push({ a: head.closeStart, b: head.closeStart, text:
    `<link rel="alternate" hreflang="en" href="${site}/${name}">\n<link rel="alternate" hreflang="${locale}" href="${site}/${L.dir}/${name}">\n<link rel="alternate" hreflang="x-default" href="${site}/${name}">\n`
    + `<script type="application/json" id="i18n-strings">${JSON.stringify(js).replace(/</g, '\\u003c')}</script>\n` });
  edits.push({ a: nav.closeStart, b: nav.closeStart, text: `  <span class="site-nav__lang"><a href="${up1}${page.src}" hreflang="en" lang="en">EN</a> / <span aria-current="true">${L.label}</span></span>\n` });
  return apply(src, edits).replace(/(<!DOCTYPE html>\n?)/i, `$1<!-- GENERATED by tools/i18n/build.mjs from /${page.src} and /i18n/${locale}/. Do not edit: edit those, then rebuild. -->\n`);
}
const tableFor = (locale, page) => ({ ...loadStrings(locale, 'chrome').strings, ...loadStrings(locale, pageName(page)).strings });

// ---------------------------------------------------------------- the commands
const args = process.argv.slice(2), has = f => args.includes(f);
const write = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };
function plan() {                                           // every file the tool owns, as it should be
  const files = {}, problems = [], notes = [];
  const chrome = {};
  for (const page of CONFIG.pages) {
    const e = extract(page); problems.push(...e.problems);
    if (e.held.length) notes.push(`${page.src}: ON HOLD, not extracted: #${e.held.join(', #')}`);
    for (const [k, v] of Object.entries(e.chrome)) { if (chrome[k] != null && chrome[k] !== v) problems.push(`chrome key ${k} names two different strings`); chrome[k] = v; }
    for (const locale of Object.keys(CONFIG.locales)) files[stringsPath(locale, pageName(page))] = merge(locale, pageName(page), e.own);
  }
  for (const locale of Object.keys(CONFIG.locales)) files[stringsPath(locale, 'chrome')] = merge(locale, 'chrome', chrome);
  return { files, problems, notes };
}
function status(locale, files) {
  let total = 0, done = 0, stale = 0;
  for (const [p, s] of Object.entries(files)) if (p.startsWith(`i18n/${locale}/`)) for (const v of Object.values(JSON.parse(s).strings)) { total++; if (v[locale]) done++; if (v.stale) stale++; }
  return { total, done, stale };
}

if (has('--annotate')) {
  for (const page of CONFIG.pages) { const r = annotate(read(page.src), page); if (r.added) write(page.src, r.out); console.log(`${page.src}: ${r.added} key(s) added`); }
} else if (has('--extract') || has('--build') || has('--check')) {
  const { files, problems, notes } = plan(), bad = [...problems];
  const built = {};
  for (const [locale, L] of Object.entries(CONFIG.locales)) {
    const s = status(locale, files);
    notes.push(`${locale}: ${s.done} of ${s.total} strings translated${s.stale ? `, ${s.stale} stale` : ''}${L.published ? '' : ' — not published, no pages written'}`);
    if (!L.published) continue;
    if (s.done < s.total) bad.push(`${locale} is published with ${s.total - s.done} untranslated string(s)`);
    if (s.stale) bad.push(`${locale} is published with ${s.stale} stale string(s) (the English changed; re-check and remove "stale" and "was")`);
    if (!problems.length) for (const page of CONFIG.pages) built[`${L.dir}/${page.src}`] = buildPage(page, locale, L, { ...JSON.parse(files[stringsPath(locale, 'chrome')]).strings, ...JSON.parse(files[stringsPath(locale, pageName(page))]).strings });
  }
  const want = has('--extract') ? files : has('--build') ? { ...files, ...built } : null;
  if (want) { if (!problems.length) for (const [p, s] of Object.entries(want)) write(p, s); }
  else for (const [p, s] of Object.entries({ ...files, ...built })) if (!existsSync(join(ROOT, p)) || read(p) !== s) bad.push(`${p} is out of date — run --extract${built[p] ? ' and --build' : ''}`);
  for (const n of notes) console.log(n);
  if (bad.length) { console.error(bad.map(b => `FAIL ${b}`).join('\n')); process.exitCode = 1; } else console.log(want ? 'written' : 'i18n: in sync');
} else if (has('--pseudo') || has('--self-test')) {
  const dir = has('--pseudo') ? args[args.indexOf('--pseudo') + 1] : null, locale = 'x-pseudo', L = { dir: 'zh', label: '⟦pseudo⟧' }, bad = [];
  const { files, problems } = plan(); bad.push(...problems);
  const any = Object.keys(CONFIG.locales)[0], wrap = strings => Object.fromEntries(Object.entries(strings).map(([k, v]) => [k, { en: v.en, [locale]: `⟦${v.en}⟧` }]));
  for (const page of CONFIG.pages) {
    const table = wrap({ ...JSON.parse(files[stringsPath(any, 'chrome')]).strings, ...JSON.parse(files[stringsPath(any, pageName(page))]).strings });
    const out = buildPage(page, locale, L, table);
    if (dir) { mkdirSync(resolve(dir), { recursive: true }); writeFileSync(resolve(dir, page.src), out); continue; }
    // 1 · every string the page holds came out translated, and nothing else did
    const again = units(out, page).units.filter(u => !(u.kind === 'html' && u.el.attrs.get('lang')?.value === 'en') && !up(u.el, n => classes(n).includes('site-nav__lang')));
    const en = units(read(page.src), page).units;
    if (again.length !== en.length) bad.push(`${page.src}: ${en.length} strings in, ${again.length} out`);
    for (const u of again) { const body = u.en.replace(/ <span class="lang-mark" lang="en">\(EN\)<\/span>/g, ''); if (!/^⟦[\s\S]*⟧$/.test(body)) bad.push(`${page.src}: not translated: ${u.en.slice(0, 60)}`); }
    // 2 · the generated page parses, says its language, and every local URL it names exists
    const root = parse(out);
    walk(root, el => {
      if (el.name === 'html' && attr(el, 'lang') !== locale) bad.push(`${page.src}: <html lang> is ${attr(el, 'lang')}`);
      for (const a of ['href', 'src']) { const v = attr(el, a); if (!v || !isLocal(v)) continue; const f = posix.normalize(posix.join(L.dir, v.split(/[?#]/)[0]));
        if (f.startsWith(`${CONFIG.fontsDir}/${locale}/`) || CONFIG.pages.some(p => `${L.dir}/${p.src}` === f)) continue;
        if (!existsSync(join(ROOT, f))) bad.push(`${page.src}: ${a}="${v}" resolves to /${f}, which does not exist`); }
    });
    if (/fonts\.googleapis\.com/.test(out)) bad.push(`${page.src}: still loads Google Fonts`);
    for (const m of out.matchAll(/from\s*'([^']+)'/g)) if (m[1].startsWith('.') && !existsSync(join(ROOT, L.dir, m[1]))) bad.push(`${page.src}: module import ${m[1]} does not resolve`);
    const strings = JSON.parse(out.match(/<script type="application\/json" id="i18n-strings">([\s\S]*?)<\/script>/)[1]);
    for (const s of jsStrings(page)) if (strings[s] !== `⟦${s}⟧`) bad.push(`${page.src}: drawn string not in the table: ${s}`);
    console.log(`${page.src}: ${en.length} page strings, ${jsStrings(page).length} drawn strings`);
  }
  // 3 · the must-fail: a string the table lacks stays English, and the test above sees it
  if (!dir) {
    const page = CONFIG.pages[0], table = wrap({ ...JSON.parse(files[stringsPath(any, 'chrome')]).strings, ...JSON.parse(files[stringsPath(any, pageName(page))]).strings });
    const victim = Object.keys(table).find(k => !k.startsWith('js:') && !k.includes('@') && !k.startsWith('meta.')); delete table[victim];
    const left = units(buildPage(page, locale, L, table), page).units.filter(u => u.key === victim && !u.en.startsWith('⟦'));
    if (left.length !== 1) bad.push(`must-fail: dropping ${victim} from the table went unseen`);
  }
  if (bad.length) { console.error(bad.map(b => `FAIL ${b}`).join('\n')); process.exitCode = 1; } else console.log(dir ? `pseudo-locale written to ${dir}` : 'self-test: PASS');
} else console.log('usage: build.mjs --annotate | --extract | --build | --check | --self-test | --pseudo <dir>');
