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
           tokens (ink, ink-2, dim, faint, petrol, seafoam), or inverse text per rule 1
       R4  no same-origin request answered 4xx/5xx or failed

   WHERE THE EXPECTED VALUES COME FROM. DESIGN.md's tables — parsed here — not
   tokens.css. A clause that read its reference from the file it checks would hold while
   the palette drifted (this repo's fourth durable rule). The ≤600 px step-up of dim and
   faint is restated from DESIGN.md's prose as a rule over those parsed values.

   WHICH PAGES. Discovered by walking the repo for *.html, so a NEW page is covered the day
   it lands. Two populations:
     shipped    every page outside NOT_DEPLOYED: S1-S3 and R1-R4 above
     served     NOT_DEPLOYED (docs/, tools/, the gauge reader's dev copy). Netlify publishes the
                repo root with no ignore file, so these ARE public; they are not site pages and
                are not rendered, and S1-S3 are not asked of them (some are rooted at their own dev
                server). They get
       S4  noindex: a <meta name="robots"> containing noindex (comments ignored)
       S5  (REDIRECTS only) the page sends a visitor to the production page: its inline script
           is RUN here with a deployed hostname (must redirect to the target) and with
           localhost / 127.0.0.1 / [::1] (must not — the backend serves it there), and a
           <noscript> meta refresh carries the same target
   Every NOT_DEPLOYED / REDIRECTS entry must still match a file, or the run fails: a stale
   exclusion hides a page.

   EXCEPTIONS LIVE IN DESIGN.md, NOT HERE ("Declared exceptions"; this tool has no list of its
   own and KNOWN is gone). Parsed from its tables:
     Light pages        held to the Light set: R2 ground is paper or raised; R3 text is a light
                        text token, white on a deep fill, or — on a surface that is itself dark
                        (an image viewer) — one of the six dark tokens
     Artwork surfaces   R2 also accepts the declared hex for that page
   Held both ways: an exception no page needs (a "light" page with a dark ground, an artwork
   hex nothing paints) fails as K0, so DESIGN.md cannot accumulate dead rulings.
   DESIGN.md rule 1's one allowance, INVERSE TEXT, is a rule here too: ground-coloured text is
   fine on a CONTROL (button, link, chip, tab) whose effective fill is petrol or ink, and
   nowhere else.

   SCOPE, STATED: this checks DOM CHROME text and the page ground. It does not read
   canvas / WebGL / SVG artwork (DESIGN.md rule 9: artwork may keep its own colours),
   gradients or background images, and it does not read fonts, layout or JS errors.

   --negative-control re-serves deliberately broken copies and requires each to fail the
   clause that names it (and no other). --report prints every finding and every
   off-palette colour without failing. --only <regex> restricts the pages.
*/

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { findChromium } from './chromium-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/* Not site pages — but Netlify publishes the repo root, so they are SERVED. Each entry is a path PREFIX and
   MUST match at least one html file. They are static-checked (S3, S4, S5), not rendered. */
export const NOT_DEPLOYED = [
  'docs/',                              // design notes and mocks
  'tools/',                             // dev prototypes and sheets
  'textile-gauge-reader/frontend/',     // "local dev copy" of /textile-gauge-reader, served by its own backend on localhost
];

/* A served page that must send visitors to a production page (S5). */
export const REDIRECTS = {
  'textile-gauge-reader/frontend/index.html': '/textile-gauge-reader',
};
const DEPLOYED_HOSTS = ['eva-maskalenko.com', 'www.eva-maskalenko.com', 'deploy-preview-522--eva-maskalenko.netlify.app'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

const VIEWPORTS = [{ w: 1280, h: 800 }, { w: 390, h: 844 }];
const DARK_SURFACE_LUM = 0.25;   // a composited background darker than this is a dark surface, wherever it sits
const TEXT_TOKENS = ['ink', 'ink-2', 'dim', 'faint', 'petrol', 'seafoam'];
const GROUND_TOKENS = ['ground', 'raised'];

/* ---------- the palette, parsed from DESIGN.md ---------- */
export function parseDesign(md) {
  const tokens = {};
  const re = /^\|\s*`--color-([a-z0-9-]+)`\s*\|\s*`(#[0-9A-Fa-f]{6})`/gm;
  for (let m; (m = re.exec(md));) tokens[m[1]] = m[2].toLowerCase();
  return tokens;
}

/* DESIGN.md "Declared exceptions": the Light pages table, the Light set table, the Artwork surfaces table. */
export function parseExceptions(md) {
  const sec = name => { const m = new RegExp('^###\\s+' + name + '\\s*$', 'm').exec(md); if (!m) return ''; const rest = md.slice(m.index + m[0].length); const n = rest.search(/^#{2,3}\s/m); return n < 0 ? rest : rest.slice(0, n); };
  const rows = t => t.split('\n').filter(l => /^\|\s*`/.test(l)).map(l => l.split('|').slice(1, -1).map(c => c.trim()));
  const code = c => (/`([^`]+)`/.exec(c) || [])[1];
  const light = rows(sec('Light pages')).map(r => code(r[0])).filter(Boolean);
  const lightSet = {};
  for (const r of rows(sec('Light set'))) { const k = /^--light-([a-z0-9-]+)$/.exec(code(r[0]) || ''); const h = /^#[0-9A-Fa-f]{6}$/.exec(code(r[1]) || ''); if (k && h) lightSet[k[1]] = h[0].toLowerCase(); }
  const artwork = rows(sec('Artwork surfaces')).map(r => ({ page: code(r[0]), hex: (code(r[2]) || '').toLowerCase() })).filter(a => a.page && /^#[0-9a-f]{6}$/.test(a.hex));
  return { light, lightSet, artwork };
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

export function staticCheck(pageRel, html, vfs, { shipped = true } = {}) {
  const f = [];
  const src = stripNoise(html);
  const sheets = [];
  for (const tag of src.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    if (!rel.includes('stylesheet')) continue;
    sheets.push({ href: attr(tag, 'href'), local: resolveLocal(pageRel, attr(tag, 'href')) });
  }
  const local = sheets.filter(s => s.local);
  if (shipped) {
    if (!local.some(s => s.local === 'tokens.css' && vfs.exists('tokens.css')))
      f.push({ id: 'S1', msg: 'no <link rel="stylesheet"> resolving to tokens.css (comments do not count)' });
    else if (local[0].local !== 'tokens.css')
      f.push({ id: 'S2', msg: `tokens.css is not the first local stylesheet (first is ${local[0].href})` });
  }
  if (shipped) {
    for (const s of local) if (!vfs.exists(s.local)) f.push({ id: 'S3', msg: `stylesheet ${s.href} does not exist (${s.local})` });
    for (const tag of src.match(/<script\b[^>]*>/gi) || []) {
      const l = resolveLocal(pageRel, attr(tag, 'src'));
      if (l && !vfs.exists(l)) f.push({ id: 'S3', msg: `script ${attr(tag, 'src')} does not exist (${l})` });
    }
  } else {   // S3 is not asked of a dev page: several are rooted at their own dev server (src="/editor.js")
    const robots = (src.match(/<meta\b[^>]*>/gi) || []).filter(t => (attr(t, 'name') || '').toLowerCase() === 'robots');
    if (!robots.some(t => /noindex/i.test(attr(t, 'content') || '')))
      f.push({ id: 'S4', msg: 'served but not a site page, and no <meta name="robots" content="noindex"> — search engines can index it' });
    const target = REDIRECTS[pageRel];
    if (target) f.push(...redirectCheck(html, target));
  }
  return f;
}

/* S5 — the page must send a deployed visitor to `target` and leave localhost alone. The inline script is RUN. */
function redirectCheck(html, target) {
  const f = [];
  const bare = html.replace(/<!--[\s\S]*?-->/g, '');
  const body = ((/<script\b(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/i.exec(bare) || [])[1] || '').trim();
  const redirectsAt = host => {
    const calls = [];
    try { vm.runInNewContext(body, { location: { hostname: host, replace: u => calls.push(u), assign: u => calls.push(u), href: '' } }, { timeout: 200 }); } catch (e) { return `threw ${e.message}`; }
    return calls;
  };
  if (!body) f.push({ id: 'S5', msg: `no inline redirect script (must send deployed visitors to ${target})` });
  else {
    for (const h of DEPLOYED_HOSTS) { const c = redirectsAt(h); if (!Array.isArray(c) || c.length !== 1 || c[0] !== target) f.push({ id: 'S5', msg: `on ${h} the script ${Array.isArray(c) ? `redirects to ${JSON.stringify(c)}` : c}, expected [${JSON.stringify(target)}]` }); }
    for (const h of LOCAL_HOSTS) { const c = redirectsAt(h); if (!Array.isArray(c) || c.length) f.push({ id: 'S5', msg: `on ${h} the script ${Array.isArray(c) ? `redirects to ${JSON.stringify(c)}` : c}; the backend serves this page there and it must stay` }); }
  }
  const ns = (/<noscript>\s*<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/i.exec(bare) || [])[0];
  const nsUrl = ns && /content\s*=\s*["'][^"']*url=([^"']+)["']/i.exec(ns);
  if (!nsUrl || nsUrl[1].trim() !== target) f.push({ id: 'S5', msg: `no <noscript> meta refresh to ${target}` });
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
    // every non-transparent background from the element up to <html>, nearest first (composited in Node)
    const layers = [];
    for (let x = el; x; x = x.parentElement) { const b = cs(x).backgroundColor; if (b && !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$|^transparent$/.test(b)) layers.push(b); }
    texts.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.baseVal === undefined ? String(el.className) : '').slice(0, 40), text: n.nodeValue.trim().slice(0, 28), color: s.color, layers, ctl: !!el.closest('button,a,label,summary,input,select,[role=button],[role=tab]') });
  }
  return {
    vars,
    bodyBg: cs(document.body).backgroundColor,
    htmlBg: root.backgroundColor,
    texts,
  };
};

/* the colour a person sees behind an element: its background layers composited over the browser's white canvas */
function composite(layers) {
  let base = [255, 255, 255];
  for (const str of [...layers].reverse()) { const c = parseCssColor(str); if (c) base = base.map((b, i) => c.rgb[i] * c.a + b * (1 - c.a)); }
  return base.map(Math.round);
}
const lum = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
const rgbStr = a => `rgb(${a.join(', ')})`;

/* palette = DESIGN.md's 14 tokens; ex = parseExceptions(DESIGN.md). Returns per page+width findings and
   the grounds seen, so the caller can hold every declared exception both ways. */
export async function renderCheck(browser, port, pages, palette, ex) {
  const out = [];   // { page, width, findings: [{id,msg}], effGround, stats }
  const tokenNames = Object.keys(palette);
  const keyOf = hex => rgbKey(hexToRgb(hex));
  const textKeys = new Map(TEXT_TOKENS.map(t => [keyOf(palette[t]), t]));
  const groundKeys = new Map(GROUND_TOKENS.map(t => [keyOf(palette[t]), t]));
  const lightGround = new Set(['paper', 'raised'].map(k => ex.lightSet[k] && keyOf(ex.lightSet[k])).filter(Boolean));
  const lightText = new Set(['ink', 'ink-2', 'faint', 'petrol'].map(k => ex.lightSet[k] && keyOf(ex.lightSet[k])).filter(Boolean));
  const onDeep = ex.lightSet['on-deep'] && keyOf(ex.lightSet['on-deep']);
  const K = { ground: keyOf(palette.ground), petrol: keyOf(palette.petrol), ink: keyOf(palette.ink), deep: keyOf(palette.deep) };
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
      const isLight = ex.light.includes(pageRel);
      const artwork = ex.artwork.filter(a => a.page === pageRel).map(a => keyOf(a.hex));
      let effGround = null;
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
        // R2 — effective page ground: ground/raised, or (light page) the light grounds, or a declared artwork surface
        const b = parseCssColor(data.bodyBg), h = parseCssColor(data.htmlBg);
        const eff = (b && b.a === 1 ? b : h && h.a === 1 ? h : { rgb: [255, 255, 255] }).rgb;   // transparent all the way up = the browser's white canvas
        effGround = rgbKey(eff);
        const okGround = isLight ? lightGround.has(effGround) : (groundKeys.has(effGround) || artwork.includes(effGround));
        if (!okGround) findings.push({ id: 'R2', key: rgbStr(eff), msg: `effective page background is ${rgbStr(eff)} (body ${data.bodyBg}, html ${data.htmlBg}); expected ${isLight ? 'the light set\'s paper or raised (DESIGN.md "Light set")' : 'ground or raised'}${!isLight && ex.artwork.some(a => a.page === pageRel) ? ' or its declared artwork surface' : ''}` });
        // R3 — chrome text colours
        const off = new Map();
        for (const t of data.texts) {
          const c = parseCssColor(t.color);
          if (!c) { off.set(t.color, (off.get(t.color) || []).concat(t)); continue; }
          if (c.a === 0) continue;
          const ck = rgbKey(c.rgb), bg = composite(t.layers), bgk = rgbKey(bg);
          const darkSurface = lum(bg) < DARK_SURFACE_LUM;
          let ok, key = t.color, why = 'not a text token';
          if (isLight && !darkSurface) {
            ok = lightText.has(ck) || (ck === onDeep && bgk === K.deep);
            why = 'not in the light set (ink, ink-2, faint, petrol; white only on a deep fill)';
          } else {
            ok = textKeys.has(ck);
            if (!ok && ck === K.ground) {   // rule 1's one allowance: inverse text on a petrol- or ink-filled control
              if (t.ctl && (bgk === K.petrol || bgk === K.ink)) ok = true;
              else { key = `${t.color} on ${rgbStr(bg)}`; why = `ground-coloured text is only allowed on a petrol- or ink-filled control (rule 1); this is ${t.ctl ? 'a control' : 'not a control'} on ${rgbStr(bg)}`; }
            }
          }
          if (!ok) { const e = off.get(key) || { why, list: [] }; e.list.push(t); off.set(key, e); }
        }
        for (const [key, e] of off) {
          if (Array.isArray(e)) { findings.push({ id: 'R3', key, msg: `${e.length} text node(s) in unreadable colour ${key}` }); continue; }
          findings.push({ id: 'R3', key, msg: `${e.list.length} text node(s) in ${key}, ${e.why} — e.g. <${e.list[0].tag}${e.list[0].cls ? ' .' + e.list[0].cls : ''}> "${e.list[0].text}"` });
        }
      }
      // R4
      if (bad.length) findings.push({ id: 'R4', msg: `same-origin request(s) failed: ${[...new Set(bad)].slice(0, 4).join(', ')}` });
      out.push({ page: pageRel, width: vp.w, findings, jsErrors, texts: data ? data.texts.length : 0, effGround });
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
  return { pages, stale, served: [...all].filter(f => NOT_DEPLOYED.some(p => f.startsWith(p))).sort() };
}

async function runAll({ overrides = new Map(), only = null, browser, designEdit = x => x }) {
  const vfs = makeFs(overrides);
  const design = designEdit(fs.readFileSync(path.join(REPO, 'DESIGN.md'), 'utf8'));
  const palette = parseDesign(design);
  const ex = parseExceptions(design);
  const pre = [];
  if (Object.keys(palette).length !== 14) pre.push({ page: '(setup)', id: 'X0', msg: `parsed ${Object.keys(palette).length} tokens from DESIGN.md, expected 14` });
  if (Object.keys(ex.lightSet).length !== 7) pre.push({ page: '(setup)', id: 'X0', msg: `parsed ${Object.keys(ex.lightSet).length} Light set tokens from DESIGN.md, expected 7 (paper, raised, ink, ink-2, faint, petrol, on-deep)` });
  if (!ex.light.length || !ex.artwork.length) pre.push({ page: '(setup)', id: 'X0', msg: `DESIGN.md "Declared exceptions" parsed ${ex.light.length} light page(s) and ${ex.artwork.length} artwork surface(s); the tables are missing or malformed` });
  const d = discover(vfs);
  for (const p of d.stale) pre.push({ page: '(setup)', id: 'X0', msg: `NOT_DEPLOYED entry "${p}" matches no file — a stale exclusion hides pages` });
  for (const r of Object.keys(REDIRECTS)) if (!d.served.includes(r)) pre.push({ page: r, id: 'X0', msg: 'REDIRECTS entry matches no served page' });
  for (const pg of [...ex.light, ...ex.artwork.map(a => a.page)]) if (!d.pages.includes(pg)) pre.push({ page: pg, id: 'X0', msg: 'DESIGN.md declares an exception for a page that is not a shipped page' });
  const want = list => (only ? list.filter(p => only.test(p)) : list);
  const pages = want(d.pages), served = want(d.served);
  if (d.pages.length < 30 && overrides.size === 0) pre.push({ page: '(setup)', id: 'X0', msg: `only ${d.pages.length} pages discovered; expected ~39` });
  const stat = {};
  for (const p of pages) stat[p] = staticCheck(p, vfs.read(p).toString(), vfs).map(x => ({ ...x, width: 'static' }));
  for (const p of served) stat[p] = staticCheck(p, vfs.read(p).toString(), vfs, { shipped: false }).map(x => ({ ...x, width: 'static' }));
  const { server, port } = await serve(vfs);
  let rendered;
  try { rendered = await renderCheck(browser, port, pages, palette, ex); } finally { server.close(); }
  const byPage = new Map([...pages, ...served].map(p => [p, { page: p, served: served.includes(p), findings: [...stat[p]], jsErrors: 0, texts: 0, grounds: new Set() }]));
  for (const r of rendered) {
    const e = byPage.get(r.page);
    e.jsErrors = Math.max(e.jsErrors, r.jsErrors); e.texts = Math.max(e.texts, r.texts);
    if (r.effGround) e.grounds.add(r.effGround);
    for (const f of r.findings) {
      const dup = e.findings.find(x => x.id === f.id && x.key === f.key);
      if (dup) dup.width += `+${r.width}`; else e.findings.push({ ...f, width: String(r.width) });
    }
  }
  // held both ways: a declared exception that no longer applies is itself a finding (K0)
  const keyOf = hex => rgbKey(hexToRgb(hex));
  const lightGround = ['paper', 'raised'].map(k => ex.lightSet[k] && keyOf(ex.lightSet[k])).filter(Boolean);
  const results = [...byPage.values()];
  for (const r of results) {
    if (r.served || !r.grounds.size) continue;
    if (ex.light.includes(r.page) && !lightGround.some(g => r.grounds.has(g)))
      r.findings.push({ id: 'K0', key: 'light', width: 'declared', msg: 'declared a light page in DESIGN.md but it does not render on a light ground — remove the entry (or fix the page)' });
    for (const a of ex.artwork.filter(a => a.page === r.page))
      if (!r.grounds.has(keyOf(a.hex))) r.findings.push({ id: 'K0', key: a.hex, width: 'declared', msg: `declared artwork surface ${a.hex} in DESIGN.md but the page's ground is not that colour — remove the entry` });
  }
  return { pre, pages, served, results, palette, ex };
}

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const val = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };

/* ---------- negative control ---------- */
const FAKE_PAGE = '<!doctype html><html><head><meta charset="utf-8"><title>new</title><link rel="stylesheet" href="styles.css"></head><body><h1>New page</h1><p>Added without tokens.css.</p></body></html>';
const TOK_LINK = /<link[^>]*href="(\.\.\/)?tokens\.css"[^>]*>\s*/i;
const rd = f => fs.readFileSync(path.join(REPO, f), 'utf8');
const inject = (f, html) => o => o.set(f, rd(f).replace('</body>', html + '</body>'));
const styled = (f, css) => o => o.set(f, rd(f).replace('</head>', `<style>${css}</style></head>`));
const dropRow = pageCell => md => md.split('\n').filter(l => !l.startsWith(`| \`${pageCell}\``)).join('\n');
const addRow = (afterHeading, row) => md => md.replace(new RegExp(`(### ${afterHeading}[\\s\\S]*?\\n\\|---[^\\n]*\\n)`), `$1${row}\n`);
const MUTANTS = [
  { id: 'the-504-failure-tokens-link-removed', page: 'dyeing.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('dyeing.html', rd('dyeing.html').replace(TOK_LINK, '')); } },
  { id: 'a-project-page-loses-tokens-too', page: 'projects/vsm-base-layer-suit.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { const f = 'projects/vsm-base-layer-suit.html'; o.set(f, rd(f).replace(TOK_LINK, '')); } },
  { id: 'tokens-linked-in-a-comment-only', page: 'dyeing.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('dyeing.html', rd('dyeing.html').replace(TOK_LINK, '<!-- <link rel="stylesheet" href="tokens.css"> -->\n')); } },
  { id: 'tokens-linked-after-the-page-sheet', page: 'index.html', claims: ['S2'],
    edit: o => { const h = rd('index.html'); const m = h.match(TOK_LINK)[0]; o.set('index.html', h.replace(TOK_LINK, '').replace(/(<link[^>]*href="styles\.css"[^>]*>)/i, `$1\n${m}`)); } },
  { id: 'a-stylesheet-that-does-not-exist', page: 'about.html', claims: ['S3', 'R4'],
    edit: o => { o.set('about.html', rd('about.html').replace('</head>', '<link rel="stylesheet" href="no-such-sheet.css"></head>')); } },
  { id: 'a-token-drifts-in-tokens-css', page: 'index.html', claims: ['R1', 'R2'],   // R2 too: the page ground IS --color-ground
    edit: o => { o.set('tokens.css', rd('tokens.css').replace(/--color-ground:\s*#060707/i, '--color-ground:      #000000')); } },
  { id: 'the-page-is-forced-white', page: 'about.html', claims: ['R2'],   // body{color} does not reach elements that set their own colour
    edit: styled('about.html', 'body{background:#fff!important;color:#000!important}') },
  { id: 'one-heading-in-an-off-palette-red', page: 'about.html', claims: ['R3'],
    edit: styled('about.html', 'h1,h2{color:#e0245e!important}') },
  { id: 'a-new-page-without-tokens', page: 'zz-new-page.html', claims: ['S1', 'R1', 'R2', 'R3'],
    edit: o => { o.set('zz-new-page.html', FAKE_PAGE); } },

  // rule 1's inverse text: allowed on a petrol/ink control, nowhere else
  { id: 'inverse-text-on-a-petrol-and-an-ink-button-is-allowed', page: 'about.html', claims: [],   // the allowance itself must stay silent
    edit: inject('about.html', '<button style="background:#2fa3a3;color:#060707">Open</button><button style="background:#e9ecec;color:#060707">Package</button>') },
  { id: 'ground-text-on-a-deep-button', page: 'about.html', claims: ['R3'],   // the segmented buttons this ruling fixed
    edit: inject('about.html', '<button style="background:#1c6b6b;color:#060707">Knit</button>') },
  { id: 'ground-text-on-a-petrol-paragraph-that-is-not-a-control', page: 'about.html', claims: ['R3'],
    edit: inject('about.html', '<p style="background:#2fa3a3;color:#060707">Not a control</p>') },
  { id: 'ground-text-on-the-ground-itself', page: 'about.html', claims: ['R3'],
    edit: inject('about.html', '<button style="background:#060707;color:#060707">Hidden</button>') },

  // light pages: a declared light set, not arbitrary colours
  { id: 'a-light-page-uses-an-arbitrary-colour', page: 'cards.html', claims: ['R3'],
    edit: styled('cards.html', '.cd-header__title{color:#e0245e!important}') },
  { id: 'a-light-page-with-text-deep-teal', page: 'cards.html', claims: ['R3'],   // the footer label this ruling fixed
    edit: styled('cards.html', '.footer__label{color:#1c6b6b!important}') },
  { id: 'a-light-page-is-no-longer-declared', page: 'cards.html', claims: ['R2', 'R3'], design: dropRow('cards.html'), edit: () => {} },
  { id: 'a-declared-light-page-that-renders-dark', page: 'about.html', claims: ['R2', 'K0'], design: addRow('Light pages', '| `about.html` | planted |'), edit: () => {} },

  // artwork surfaces: declared in DESIGN.md, read from there, held both ways
  { id: 'the-plot-artwork-exception-is-removed', page: 'plot.html', claims: ['R2'], design: dropRow('plot.html'), edit: () => {} },
  { id: 'the-scene-ground-drifts-to-an-undeclared-colour', page: 'scene.html', claims: ['R2', 'K0'],   // K0 too: the declared #08090b is no longer painted
    edit: styled('scene.html', 'html,body{background:#08090c!important}') },
  { id: 'an-artwork-exception-nothing-paints', page: 'about.html', claims: ['K0'], design: addRow('Artwork surfaces', '| `about.html` | the page ground | `#123456` | planted |'), edit: () => {} },

  // served-but-unshipped pages
  { id: 'a-tools-page-without-noindex', page: 'tools/leaf-lab.html', claims: ['S4'],
    edit: o => { o.set('tools/leaf-lab.html', rd('tools/leaf-lab.html').replace(/<meta name="robots"[^>]*>\s*/i, '')); } },
  { id: 'noindex-only-in-a-comment', page: 'docs/flower-standard-panel-mock.html', claims: ['S4'],
    edit: o => { o.set('docs/flower-standard-panel-mock.html', rd('docs/flower-standard-panel-mock.html').replace(/<meta name="robots"[^>]*>/i, '<!-- <meta name="robots" content="noindex"> -->')); } },
  { id: 'a-new-tool-page-without-noindex', page: 'tools/zz-new-tool.html', claims: ['S4'],
    edit: o => { o.set('tools/zz-new-tool.html', '<!doctype html><html><head><meta charset="utf-8"><title>new tool</title></head><body>x</body></html>'); } },
  { id: 'the-dev-copy-stops-redirecting', page: 'textile-gauge-reader/frontend/index.html', claims: ['S5'],
    edit: o => { const f = 'textile-gauge-reader/frontend/index.html'; o.set(f, rd(f).replace("location.replace('/textile-gauge-reader')", 'void 0')); } },
  { id: 'the-dev-copy-redirects-on-localhost-too', page: 'textile-gauge-reader/frontend/index.html', claims: ['S5'],   // the backend serves it there
    edit: o => { const f = 'textile-gauge-reader/frontend/index.html'; o.set(f, rd(f).replace(String.raw`if (!/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname)) `, '')); } },
  { id: 'the-dev-copy-has-no-noscript-refresh', page: 'textile-gauge-reader/frontend/index.html', claims: ['S5'],
    edit: o => { const f = 'textile-gauge-reader/frontend/index.html'; o.set(f, rd(f).replace(/<noscript><meta[^>]*><\/noscript>\s*/i, '')); } },
];

async function negativeControl(browser) {
  let bad = 0;
  for (const m of MUTANTS) {
    const o = new Map(); m.edit(o);
    const run = await runAll({ overrides: o, only: new RegExp('^' + m.page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), browser, designEdit: m.design });
    const mine = run.results.find(r => r.page === m.page);
    const fired = new Set(mine ? mine.findings.map(f => f.id) : []);
    const missed = m.claims.filter(c => !fired.has(c));
    const extra = [...fired].filter(c => !m.claims.includes(c));
    const ok = mine && !missed.length && !extra.length && !run.pre.length;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${m.id}: fired ${[...fired].join(',') || '(nothing)'}${missed.length ? `  MISSED ${missed}` : ''}${extra.length ? `  UNCLAIMED ${extra}` : ''}${run.pre.length ? `  SETUP ${run.pre.map(p => p.msg).join('; ')}` : ''}`);
  }
  // the clean tree must be silent on the same pages (a control that is always red proves nothing)
  const ctl = [...new Set(MUTANTS.map(m => m.page))].filter(p => !/zz-new/.test(p));
  const clean = await runAll({ only: new RegExp('^(' + ctl.map(p => p.replace(/[.]/g, '\\.')).join('|') + ')$'), browser });
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
      if (r.served && !fs_.length && !flag('--verbose')) continue;
      console.log(`${fs_.length ? 'FAIL' : 'ok  '} ${r.page}${r.served ? '  (served, not a site page)' : ''}${r.jsErrors ? `  (js errors: ${r.jsErrors}, not asserted)` : ''}`);
      for (const f of fs_) console.log(`       ${f.id} @${f.width}: ${f.msg}`);
    }
    for (const p of run.pre) { console.log(`FAIL ${p.page}\n       ${p.id}: ${p.msg}`); }
    const nShipped = run.results.filter(r => !r.served).length;
    console.log(`\nSITE PALETTE: ${run.pages.length} shipped pages discovered · ${nShipped} checked (static + ${VIEWPORTS.map(v => v.w).join('/')} px render) · ${run.served.length} served-but-unshipped pages checked (static S4/S5) · ${run.results.length - failing} passed · ${failing} failing · ${run.pre.length} setup finding(s)  [${((Date.now() - t0) / 1000).toFixed(1)} s]`);
    console.log(`exceptions (read from DESIGN.md, none live in this tool): light pages ${run.ex.light.join(', ')}; artwork surfaces ${run.ex.artwork.map(a => `${a.page} ${a.hex}`).join(', ')}`);
    console.log(`served-but-unshipped (NOT_DEPLOYED, public because Netlify has no ignore file here): ${run.served.join(', ')}`);
    const bad = failing + run.pre.length;
    console.log(bad ? 'VERDICT: FAIL' : 'VERDICT: PASS');
    return flag('--report') ? 0 : (bad ? 1 : 0);
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(c => process.exit(c), e => { console.error(e); process.exit(2); });
}
