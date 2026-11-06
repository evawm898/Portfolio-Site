#!/usr/bin/env node
/* verify-site-palette.mjs — every deployed HTML page renders inside the locked palette.

   WHY THIS EXISTS. #504 migrated styles.css onto tokens.css, and six public pages
   (dyeing.html and the five projects/*.html) never linked tokens.css. They stayed
   live for days looking completely wrong — unstyled colours, white ground — while
   returning 200 with no JS error, because a missing stylesheet is not an error to a
   browser: an undefined var() just falls back to the initial value. A "does the page
   load" check cannot see that by construction. This one looks at what the browser
   actually computed.

   TWO LAYERS, both cheap.
     Static (no browser, ~1 s)
       S1  a real <link rel=stylesheet> (comments and inline script ignored) resolves to
           the repo's tokens.css
       S2  it is the FIRST local stylesheet — DESIGN.md "Loading" (a page's own sheet
           must not be able to be overridden by it)
       S3  every local stylesheet href / script src resolves to a file in the repo
     Render (Chromium, both a 1280 and a 390 px viewport, external hosts blocked so the
     run is deterministic and offline)
       R1  every --color-* token on :root computes to the value in DESIGN.md's tables
       R2  the page's EFFECTIVE background (body, else html, else the browser's white
           canvas) is ground or raised
       R3  every visible chrome text node's computed colour is one of the six text
           tokens (ink, ink-2, dim, faint, petrol, seafoam)
       R4  no same-origin request answered 4xx/5xx or failed

   WHERE THE EXPECTED VALUES COME FROM. DESIGN.md's tables — parsed here — not
   tokens.css. A clause that read its reference from the file it checks would hold while
   the palette drifted (this repo's fourth durable rule). The ≤600 px step-up of dim and
   faint is restated from DESIGN.md's prose as a rule over those parsed values.

   WHICH PAGES. Discovered by walking the repo for *.html, minus NOT_DEPLOYED (dev
   copies, docs, tools), so a NEW page is covered the day it lands. Every exclusion must
   still match something, or the run fails: a stale exclusion hides a page.
   Netlify publishes the repo root with no ignore file, so the exclusions are "not a
   shipped page", not "provably unreachable" — the report says so.

   DECLARED EXCEPTIONS. cards.html is the one light page (DESIGN.md "Light pages"); it
   skips R2/R3 only, and the exception is checked against DESIGN.md's own text.

   SCOPE, STATED: this checks DOM CHROME text and the page ground. It does not read
   canvas / WebGL / SVG artwork (DESIGN.md rule 9: artwork may keep its own colours),
   and it does not read fonts, layout or JS errors.

   --negative-control re-serves deliberately broken copies and requires each to fail the
   clause that names it (and no other). --report prints every finding and every
   off-palette colour without failing. --only <regex> restricts the pages.
*/

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/* Not shipped pages. Each entry is a path PREFIX and MUST match at least one html file. */
export const NOT_DEPLOYED = [
  'docs/',                              // design notes and mocks
  'tools/',                             // dev prototypes and sheets
  'textile-gauge-reader/frontend/',     // "local dev copy" of /textile-gauge-reader, served by its own backend
];

/* The one declared exception: a light page. Reason must stay true in DESIGN.md. */
export const LIGHT_PAGES = {
  'cards.html': { skips: ['R2', 'R3'], proof: /`\/cards`\s+is\s+the\s+one\s+light\s+page/ },
};

/* FINDINGS THE GATE HAS ALREADY MADE ON THE SHIPPED TREE, declared by page + id + colour so the gate can
   be green and still say them out loud. Held BOTH ways (the #213 convention): a declared finding that
   stops firing fails the run (K0: remove the entry), an undeclared one fails it too. None of these is a
   missing stylesheet. Each is Eva's call — a design ruling, not a defect a session should "fix". */
export const KNOWN = [
  { page: 'color-change.html',              id: 'R3', key: 'rgb(6, 7, 7)',     why: 'ground-coloured text on an active chip (inverted chip); DESIGN.md rule 1 lists six text tokens and ground is not one' },
  { page: 'conductive-trace-resistance.html', id: 'R3', key: 'rgb(6, 7, 7)',   why: 'same inverted active chip' },
  { page: 'dyeing.html',                    id: 'R3', key: 'rgb(6, 7, 7)',     why: 'same inverted active chip' },
  { page: 'textile-stretch-simulator.html', id: 'R3', key: 'rgb(6, 7, 7)',     why: 'same inverted active chip' },
  { page: 'flower.html',                    id: 'R3', key: 'rgb(28, 107, 107)', why: 'a decorative "·" in --color-deep; rule 5: deep is never text (1280 px only)' },
  { page: 'quantifying-comfort.html',       id: 'R3', key: 'rgb(216, 90, 48)', why: 'the word "orange" set in orange (.qc-orange); rule 10: a material name in a caption is still ink' },
  { page: 'plot.html',                      id: 'R2', key: 'rgb(0, 0, 0)',     why: 'plot.css hard-codes html,body #000; the page ground is the drawing surface (polarity decides black or white) and not a token' },
  { page: 'scene.html',                     id: 'R2', key: 'rgb(8, 9, 11)',    why: 'scene.css keeps --scene-ground #08090b by its own header: the section has its own identity' },
  { page: 'textile-gauge-reader.html',      id: 'R2', key: 'rgb(250, 248, 244)', why: 'the page ships LIGHT; DESIGN.md "Light pages" says /cards is the only light page and /textile-gauge-reader is dark' },
  { page: 'textile-gauge-reader.html',      id: 'R3', key: 'rgb(92, 99, 99)',  why: 'light-page text (same ruling as above)' },
  { page: 'textile-gauge-reader.html',      id: 'R3', key: 'rgb(23, 122, 122)', why: 'light-page text (same ruling as above)' },
  { page: 'textile-gauge-reader.html',      id: 'R3', key: 'rgb(23, 25, 26)',  why: 'light-page text (same ruling as above)' },
];

const VIEWPORTS = [{ w: 1280, h: 800 }, { w: 390, h: 844 }];
const TEXT_TOKENS = ['ink', 'ink-2', 'dim', 'faint', 'petrol', 'seafoam'];
const GROUND_TOKENS = ['ground', 'raised'];

/* ---------- the palette, parsed from DESIGN.md ---------- */
export function parseDesign(md) {
  const tokens = {};
  const re = /^\|\s*`--color-([a-z0-9-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`/gm;
  for (let m; (m = re.exec(md));) tokens[m[1]] = m[2].toLowerCase();
  return tokens;
}
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbKey = a => a.join(',');

const clamp8 = v => Math.max(0, Math.min(255, Math.round(v * 255)));
const lin2srgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(c => clamp8(lin2srgb(c)));
}
/* Chromium reports a color-mix() result as color(srgb …) or oklab(…); both are read back to sRGB bytes. */
function parseCssColor(str) {
  str = str.trim();
  const alpha = x => (x === undefined ? 1 : x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x));
  let m = /^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+%?))?\s*\)$/.exec(str);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: alpha(m[4]) };
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(str);
  if (m) return { rgb: [clamp8(+m[1]), clamp8(+m[2]), clamp8(+m[3])], a: alpha(m[4]) };
  m = /^oklab\(\s*([\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(str);
  if (m) return { rgb: oklabToRgb(+m[1], +m[2], +m[3]), a: alpha(m[4]) };
  return null;
}

/* ---------- page discovery ---------- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(path.relative(REPO, p).split(path.sep).join('/'));
  }
  return out;
}

/* ---------- a server whose files can be overridden in memory (for the controls) ---------- */
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };

function makeFs(overrides = new Map()) {
  return {
    overrides,
    exists(rel) { return overrides.has(rel) ? overrides.get(rel) !== null : fs.existsSync(path.join(REPO, rel)) && fs.statSync(path.join(REPO, rel)).isFile(); },
    read(rel) { return overrides.has(rel) ? overrides.get(rel) : fs.readFileSync(path.join(REPO, rel)); },
  };
}

function serve(vfs) {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (rel.split('/').includes('..') || !vfs.exists(rel)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(vfs.read(rel));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

/* ---------- static layer ---------- */
const stripNoise = html => html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.match(/^<script\b[^>]*>/i)[0] + '</script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};

function resolveLocal(pageRel, href) {
  if (!href || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return null;   // external, data:, fragment
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  const base = clean.startsWith('/') ? '' : path.posix.dirname(pageRel);
  return path.posix.normalize(path.posix.join(base, clean)).replace(/^\/+/, '');
}

export function staticCheck(pageRel, html, vfs) {
  const f = [];
  const src = stripNoise(html);
  const sheets = [];
  for (const tag of src.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    if (!rel.includes('stylesheet')) continue;
    sheets.push({ href: attr(tag, 'href'), local: resolveLocal(pageRel, attr(tag, 'href')) });
  }
  const local = sheets.filter(s => s.local);
  if (!local.some(s => s.local === 'tokens.css' && vfs.exists('tokens.css')))
    f.push({ id: 'S1', msg: 'no <link rel="stylesheet"> resolving to tokens.css (comments do not count)' });
  else if (local[0].local !== 'tokens.css')
    f.push({ id: 'S2', msg: `tokens.css is not the first local stylesheet (first is ${local[0].href})` });
  for (const s of local) if (!vfs.exists(s.local)) f.push({ id: 'S3', msg: `stylesheet ${s.href} does not exist (${s.local})` });
  for (const tag of src.match(/<script\b[^>]*>/gi) || []) {
    const l = resolveLocal(pageRel, attr(tag, 'src'));
    if (l && !vfs.exists(l)) f.push({ id: 'S3', msg: `script ${attr(tag, 'src')} does not exist (${l})` });
  }
  return f;
}

/* ---------- render layer ---------- */
const COLLECT = () => {
  const cs = e => getComputedStyle(e);
  const root = cs(document.documentElement);
  const vars = {};
  for (const n of window.__tokenNames) vars[n] = root.getPropertyValue('--color-' + n).trim();
  const texts = [];
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    if (el.closest('script,style,noscript,svg,canvas,template,textarea,option')) continue;
    const s = cs(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    seen.add(el);
    texts.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? String(el.className) : '').slice(0, 40), text: n.nodeValue.trim().slice(0, 28), color: s.color });
  }
  return {
    vars,
    bodyBg: cs(document.body).backgroundColor,
    htmlBg: root.backgroundColor,
    texts,
  };
};

export async function renderCheck(browser, port, pages, palette, { vfsFs, only } = {}) {
  const out = [];   // { page, width, findings: [{id,msg}], offPalette: Map, stats }
  const tokenNames = Object.keys(palette);
  const textKeys = new Map(TEXT_TOKENS.map(t => [rgbKey(hexToRgb(palette[t])), t]));
  const groundKeys = new Map(GROUND_TOKENS.map(t => [rgbKey(hexToRgb(palette[t])), t]));
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1') route.continue(); else route.abort();
    });
    for (const pageRel of pages) {
      const findings = [];
      const page = await ctx.newPage();
      const bad = [];
      page.on('response', r => { const u = new URL(r.url()); if (u.hostname === '127.0.0.1' && !u.pathname.startsWith('/.netlify/functions/') && r.status() >= 400) bad.push(`${r.status()} ${u.pathname}`); });
      page.on('requestfailed', r => { const u = new URL(r.url()); if (u.hostname === '127.0.0.1' && !u.pathname.startsWith('/.netlify/functions/')) bad.push(`failed ${u.pathname}`); });
      let jsErrors = 0; page.on('pageerror', () => jsErrors++);
      let data = null;
      try {
        await page.addInitScript(names => { window.__tokenNames = names; }, tokenNames);
        await page.goto(`http://127.0.0.1:${port}/${pageRel}`, { waitUntil: 'load', timeout: 25000 });
        await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
        await page.waitForTimeout(150);
        data = await page.evaluate(COLLECT);
      } catch (e) {
        findings.push({ id: 'R0', key: 'render', msg: `page did not render: ${String(e.message).split('\n')[0]}` });
      }
      const skips = LIGHT_PAGES[pageRel]?.skips || [];
      const off = new Map();
      if (data) {
        // R1 — tokens resolved to the DESIGN.md values (mobile steps dim/faint up one rung)
        const mobile = vp.w <= 600;
        for (const t of tokenNames) {
          let want = palette[t];
          if (mobile && t === 'dim') want = palette['ink-2'];
          if (mobile && t === 'faint') want = palette['dim'];
          const got = data.vars[t];
          if (got.toLowerCase() !== want) findings.push({ id: 'R1', key: t, msg: `--color-${t} computes to ${got || '(undefined)'}, DESIGN.md says ${want}` });
        }
        // R2 — effective page ground
        if (!skips.includes('R2')) {
          const b = parseCssColor(data.bodyBg), h = parseCssColor(data.htmlBg);
          const eff = b && b.a === 1 ? b : h && h.a === 1 ? h : { rgb: [255, 255, 255] };   // transparent all the way up = the browser's white canvas
          if (!groundKeys.has(rgbKey(eff.rgb))) findings.push({ id: 'R2', key: `rgb(${eff.rgb.join(', ')})`, msg: `effective page background is rgb(${eff.rgb}) (body ${data.bodyBg}, html ${data.htmlBg}); expected ground or raised` });
        }
        // R3 — chrome text colours
        if (!skips.includes('R3')) {
          for (const t of data.texts) {
            const c = parseCssColor(t.color);
            if (!c) { off.set(t.color, (off.get(t.color) || []).concat(t)); continue; }
            if (c.a === 0) continue;
            if (!textKeys.has(rgbKey(c.rgb))) off.set(t.color, (off.get(t.color) || []).concat(t));
          }
          for (const [col, list] of off) findings.push({ id: 'R3', key: col, msg: `${list.length} text node(s) in ${col}, not a text token — e.g. <${list[0].tag}${list[0].cls ? ' .' + list[0].cls : ''}> "${list[0].text}"` });
        }
      }
      // R4
      if (bad.length) findings.push({ id: 'R4', msg: `same-origin request(s) failed: ${[...new Set(bad)].slice(0, 4).join(', ')}` });
      out.push({ page: pageRel, width: vp.w, findings, jsErrors, texts: data ? data.texts.length : 0 });
      await page.close();
    }
    await ctx.close();
  }
  return out;
}

/* ---------- run ---------- */
export function discover(vfs) {
  const all = new Set(walk(REPO));
  for (const [k, v] of vfs.overrides) if (k.endsWith('.html')) { v === null ? all.delete(k) : all.add(k); }
  const stale = NOT_DEPLOYED.filter(p => ![...all].some(f => f.startsWith(p)));
  const pages = [...all].filter(f => !NOT_DEPLOYED.some(p => f.startsWith(p))).sort();
  return { pages, stale, excluded: [...all].filter(f => NOT_DEPLOYED.some(p => f.startsWith(p))).sort() };
}

async function runAll({ overrides = new Map(), only = null, browser, known = KNOWN }) {
  const vfs = makeFs(overrides);
  const design = fs.readFileSync(path.join(REPO, 'DESIGN.md'), 'utf8');
  const palette = parseDesign(design);
  const pre = [];
  if (Object.keys(palette).length !== 14) pre.push({ page: '(setup)', id: 'X0', msg: `parsed ${Object.keys(palette).length} tokens from DESIGN.md, expected 14` });
  for (const [pg, ex] of Object.entries(LIGHT_PAGES)) if (!ex.proof.test(design)) pre.push({ page: pg, id: 'X0', msg: 'declared light-page exception is no longer in DESIGN.md' });
  const d = discover(vfs);
  for (const p of d.stale) pre.push({ page: '(setup)', id: 'X0', msg: `NOT_DEPLOYED entry "${p}" matches no file — a stale exclusion hides pages` });
  let pages = d.pages;
  if (only) pages = pages.filter(p => only.test(p));
  if (pages.length < 30 && !only && overrides.size === 0) pre.push({ page: '(setup)', id: 'X0', msg: `only ${pages.length} pages discovered; expected ~39` });
  const stat = {};
  for (const p of pages) stat[p] = staticCheck(p, vfs.read(p).toString(), vfs).map(x => ({ ...x, width: 'static' }));
  const { server, port } = await serve(vfs);
  let rendered;
  try { rendered = await renderCheck(browser, port, pages, palette, {}); } finally { server.close(); }
  const byPage = new Map(pages.map(p => [p, { page: p, findings: [...stat[p]], jsErrors: 0, texts: 0 }]));
  for (const r of rendered) {
    const e = byPage.get(r.page);
    e.jsErrors = Math.max(e.jsErrors, r.jsErrors); e.texts = Math.max(e.texts, r.texts);
    for (const f of r.findings) {
      const dup = e.findings.find(x => x.id === f.id && x.key === f.key);
      if (dup) dup.width += `+${r.width}`; else e.findings.push({ ...f, width: String(r.width) });
    }
  }
  // split declared from undeclared; a declared finding that did not fire is itself a finding (K0)
  const results = [...byPage.values()];
  for (const r of results) {
    const mine = known.filter(k => k.page === r.page);
    r.known = [];
    r.findings = r.findings.filter(f => {
      const k = mine.find(k => k.id === f.id && k.key === f.key);
      if (k) { r.known.push({ ...f, why: k.why }); return false; }
      return true;
    });
    for (const k of mine) if (!r.known.some(f => f.id === k.id && f.key === k.key))
      r.findings.push({ id: 'K0', key: k.key, width: 'declared', msg: `declared ${k.id} finding (${k.key}) no longer fires — it is fixed or moved; remove the KNOWN entry` });
  }
  return { pre, pages, excluded: d.excluded, results, palette };
}

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const val = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

/* ---------- negative control ---------- */
const FAKE_PAGE = '<!doctype html><html><head><meta charset="utf-8"><title>new</title><link rel="stylesheet" href="styles.css"></head><body><h1>New page</h1><p>Added without tokens.css.</p></body></html>';
const TOK_LINK = /<link[^>]*href="(\.\.\/)?tokens\.css"[^>]*>\s*/i;
const MUTANTS = [
  { id: 'the-504-failure-tokens-link-removed', page: 'dyeing.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('dyeing.html', fs.readFileSync(path.join(REPO, 'dyeing.html'), 'utf8').replace(TOK_LINK, '')); } },
  { id: 'a-project-page-loses-tokens-too', page: 'projects/vsm-base-layer-suit.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { const f = 'projects/vsm-base-layer-suit.html'; o.set(f, fs.readFileSync(path.join(REPO, f), 'utf8').replace(TOK_LINK, '')); } },
  { id: 'tokens-linked-in-a-comment-only', page: 'dyeing.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('dyeing.html', fs.readFileSync(path.join(REPO, 'dyeing.html'), 'utf8').replace(TOK_LINK, '<!-- <link rel="stylesheet" href="tokens.css"> -->\n')); } },
  { id: 'tokens-linked-after-the-page-sheet', page: 'index.html', claims: ['S2'],
    edit: o => { const h = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8'); const m = h.match(TOK_LINK)[0]; o.set('index.html', h.replace(TOK_LINK, '').replace(/(<link[^>]*href="styles\.css"[^>]*>)/i, `$1\n${m}`)); } },
  { id: 'a-stylesheet-that-does-not-exist', page: 'about.html', claims: ['S3', 'R4'],
    edit: o => { o.set('about.html', fs.readFileSync(path.join(REPO, 'about.html'), 'utf8').replace('</head>', '<link rel="stylesheet" href="no-such-sheet.css"></head>')); } },
  { id: 'a-token-drifts-in-tokens-css', page: 'index.html', claims: ['R1', 'R2'],   // R2 too: the page ground IS --color-ground
    edit: o => { o.set('tokens.css', fs.readFileSync(path.join(REPO, 'tokens.css'), 'utf8').replace(/--color-ground:\s*#060707/i, '--color-ground:      #000000')); } },
  { id: 'the-page-is-forced-white', page: 'about.html', claims: ['R2'],   // body{color} does not reach elements that set their own colour
    edit: o => { o.set('about.html', fs.readFileSync(path.join(REPO, 'about.html'), 'utf8').replace('</head>', '<style>body{background:#fff!important;color:#000!important}</style></head>')); } },
  { id: 'one-heading-in-an-off-palette-red', page: 'about.html', claims: ['R3'],
    edit: o => { o.set('about.html', fs.readFileSync(path.join(REPO, 'about.html'), 'utf8').replace('</head>', '<style>h1,h2{color:#e0245e!important}</style></head>')); } },
  { id: 'a-declared-finding-that-no-longer-fires', page: 'about.html', claims: ['K0'], known: [{ page: 'about.html', id: 'R3', key: 'rgb(1, 2, 3)', why: 'planted' }],
    edit: () => {} },
  { id: 'a-new-page-without-tokens', page: 'zz-new-page.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('zz-new-page.html', FAKE_PAGE); } },
];

async function negativeControl(browser) {
  let bad = 0;
  for (const m of MUTANTS) {
    const o = new Map(); m.edit(o);
    const run = await runAll({ overrides: o, only: new RegExp('^' + m.page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), browser, known: m.known || [] });
    const mine = run.results.find(r => r.page === m.page);
    const fired = new Set(mine ? mine.findings.map(f => f.id) : []);
    const missed = m.claims.filter(c => !fired.has(c));
    const extra = [...fired].filter(c => !m.claims.includes(c));
    const ok = mine && !missed.length && !extra.length && !run.pre.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${m.id}: fired ${[...fired].join(',') || '(nothing)'}${missed.length ? `  MISSED ${missed}` : ''}${extra.length ? `  UNCLAIMED ${extra}` : ''}`);
  }
  // the clean tree must be silent on the same pages (a control that is always red proves nothing)
  const clean = await runAll({ only: new RegExp('^(' + [...new Set(MUTANTS.map(m => m.page))].filter(p => p !== 'zz-new-page.html').map(p => p.replace(/[.]/g, '\\.')).join('|') + ')$'), browser });
  const dirty = clean.results.filter(r => r.findings.length);
  console.log(`${dirty.length ? 'FAIL' : 'ok  '} clean tree is silent on the control pages${dirty.length ? ': ' + dirty.map(r => r.page).join(', ') : ''}`);
  if (dirty.length) bad++;
  console.log(bad ? `\nNEGATIVE CONTROL FAILED (${bad})` : `\nNEGATIVE CONTROL: ${MUTANTS.length} of ${MUTANTS.length} mutants caught by the clause that names them, clean tree silent`);
  return bad ? 1 : 0;
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: findChromium() });
  try {
    if (flag('--negative-control')) return await negativeControl(browser);
    const t0 = Date.now();
    const run = await runAll({ only: val('--only') ? new RegExp(val('--only')) : null, browser });
    let failing = 0;
    for (const r of run.results) {
      const fs_ = r.findings;
      if (fs_.length) failing++;
      console.log(`${fs_.length ? 'FAIL' : 'ok  '} ${r.page}${r.jsErrors ? `  (js errors: ${r.jsErrors}, not asserted)` : ''}`);
      for (const f of fs_) console.log(`       ${f.id} @${f.width}: ${f.msg}`);
      if (flag('--report') || flag('--verbose')) for (const f of r.known) console.log(`       known ${f.id} @${f.width}: ${f.key} — ${f.why}`);
    }
    const nKnown = run.results.reduce((n, r) => n + r.known.length, 0);
    for (const p of run.pre) { console.log(`FAIL ${p.page}\n       ${p.id}: ${p.msg}`); }
    console.log(`\nSITE PALETTE: ${run.pages.length} pages discovered · ${run.results.length} checked (static + ${VIEWPORTS.map(v => v.w).join('/')} px render) · ${run.results.length - failing} passed · ${failing} failing · ${run.pre.length} setup finding(s)  [${((Date.now() - t0) / 1000).toFixed(1)} s]`);
    console.log(`not checked (NOT_DEPLOYED, still published as static files — Netlify has no ignore file here): ${run.excluded.join(', ')}`);
    console.log(`declared KNOWN findings: ${nKnown} on ${run.results.filter(r => r.known.length).length} pages (run with --report to read each reason)\ndeclared exceptions: ${Object.entries(LIGHT_PAGES).map(([p, e]) => `${p} skips ${e.skips}`).join('; ')}`);
    const bad = failing + run.pre.length;
    console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
    return flag('--report') ? 0 : (bad ? 1 : 0);
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(c => process.exit(c), e => { console.error(e); process.exit(2); });
}
