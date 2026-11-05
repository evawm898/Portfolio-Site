#!/usr/bin/env node
// Before/after screenshots for a design-system migration batch.
//
//   node tools/shot-design-batch.mjs <out-dir> --base <worktree> --pages index,about,...
//
// Serves THIS tree and the --base tree (a git worktree of the commit before
// the batch) over two local HTTP servers, and shoots every named page full-page
// at 1280 px and at a 390 px phone width, from both trees. Writes the raw
// shots plus one composite per page (before | after, desktop then phone) so a
// reviewer reads one image a page. Google Fonts are fetched for real through
// the session proxy when one is set, so the type in the shots is the type on
// the site. Animations are frozen (reduced motion + a stylesheet) so the two
// sides differ only where the code differs. No pixel delta is quoted — the
// composite is for the eye (CLAUDE.md: a pixel number needs its own control).
//
// Dev-only: needs a global `playwright` (NODE_PATH) and its Chromium.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const out = args[0];
const opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const base = opt('--base');
const pages = (opt('--pages') || '').split(',').filter(Boolean);
if (!out || !base || !pages.length) {
  console.error('usage: shot-design-batch.mjs <out-dir> --base <worktree> --pages a,b,c');
  process.exit(2);
}
const MAX_H = Number(opt('--max-height') || 6000); // composite crop, CSS px
fs.mkdirSync(out, { recursive: true });

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.gif': 'image/gif' };
function serve(root) {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let f = path.join(root, p);
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!f.startsWith(path.resolve(root)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const FREEZE = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;
  transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}`;

const VIEWS = [{ id: 'd', width: 1280, height: 800 }, { id: 'm', width: 390, height: 844 }];

const servers = { before: await serve(path.resolve(base)), after: await serve(process.cwd()) };
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ proxy });

async function shoot(side, page, view) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 1, reducedMotion: 'reduce', ignoreHTTPSErrors: true });
  // A gated private page (the tracker) is opened, never unlocked.
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  const url = `http://127.0.0.1:${servers[side].address().port}/${page}.html`;
  await pg.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push('goto: ' + e.message));
  await pg.addStyleTag({ content: FREEZE });
  await pg.evaluate(() => document.fonts.ready);
  // Reveal-on-scroll content: walk the page once so IntersectionObservers fire.
  await pg.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
    window.scrollTo(0, 0);
  });
  await pg.waitForTimeout(300);
  const file = path.join(out, `${page}.${view.id}.${side}.png`);
  await pg.screenshot({ path: file, fullPage: true });
  const fonts = await pg.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
  await ctx.close();
  return { file, errors, fonts: [...new Set(fonts)] };
}

const report = [];
for (const page of pages) {
  const row = { page };
  for (const view of VIEWS) for (const side of ['before', 'after']) row[`${view.id}.${side}`] = await shoot(side, page, view);
  // Composite: desktop pair on top, phone pair below, cropped to MAX_H.
  const img = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  const cell = (k, label) => `<figure><figcaption>${label}</figcaption><div class="clip"><img src="${img(row[k].file)}"></div></figure>`;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#1a1d1d;color:#e9ecec;font:13px/1.4 monospace;padding:16px}
    h1{font-size:16px;margin:0 0 12px} .row{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}
    figure{margin:0} figcaption{margin-bottom:6px;color:#a7afaf}
    .clip{max-height:${MAX_H}px;overflow:hidden;border:1px solid #34393a} img{display:block}
  </style><h1>${page} — before (main) | after (this branch)</h1>
  <div class="row">${cell('d.before', 'before · 1280')}${cell('d.after', 'after · 1280')}</div>
  <div class="row">${cell('m.before', 'before · 390')}${cell('m.after', 'after · 390')}</div>`;
  const ctx = await browser.newContext({ viewport: { width: 2 * 1280 + 64, height: 800 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: 'load' });
  row.composite = path.join(out, `${page}.compare.png`);
  await pg.screenshot({ path: row.composite, fullPage: true });
  await ctx.close();
  report.push(row);
  const errs = ['d.before', 'd.after', 'm.before', 'm.after'].flatMap((k) => row[k].errors.map((e) => `${k}: ${e}`));
  console.log(`${page}: fonts(after)=${row['d.after'].fonts.join(', ') || 'none'}${errs.length ? '  ERRORS ' + errs.join(' | ') : ''}`);
}
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report.map((r) => ({ page: r.page, composite: r.composite,
  fontsAfter: r['d.after'].fonts, fontsBefore: r['d.before'].fonts,
  errors: Object.fromEntries(['d.before', 'd.after', 'm.before', 'm.after'].map((k) => [k, r[k].errors])) })), null, 2));
await browser.close();
for (const s of Object.values(servers)) s.close();
