/* shot-frame-forms.mjs — the flow study's ROUND 4 sheet (docs/frame-flow-study.md §11):
   round 3's carved mass (M3, ornFlow 'mass') beside round 4's FORMS (ornFlow 'forms'), the three default skeletons
   whole at the 180 mm print front-on, then each skeleton's close-ups (the shoulder, the crest, the bottom, a
   three-quarter view), and an ELEMENT sheet: each of the bronze's traced elements (grammar §9) beside its built
   counterpart on the oval.

     node tools/shot-frame-forms.mjs <dir> [--round N] [--refs <dir with 2.webp>] [--png <file>] [--only <regex>]

   --refs puts crops of the reference photograph beside the renders. The photograph is a stock image and is NEVER
   committed: a sheet made with --refs is for the critic and stays out of the repository; the committed sheet is
   made without it. Every caption's numbers are Node builds of the same params (frame-forms.js's own record and
   tools/frame-mass-coverage.mjs). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { loadTree, CASES } from './frame-flow-measure.mjs';
import { coverageOf } from './frame-mass-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-forms-sheet');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ROUND = arg('--round') || '';
const REFS = arg('--refs') ? path.resolve(arg('--refs')) : null;
const PNG = arg('--png') ? path.resolve(arg('--png')) : path.join(OUT, `frame-forms${ROUND ? '-f' + ROUND : ''}.png`);
const ONLY = arg('--only') ? new RegExp(arg('--only')) : null;
const want = (l) => !ONLY || ONLY.test(l);

const T = await loadTree(ROOT);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
function serve(root) {
  return new Promise((res) => {
    const s = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}
const browser = await chromium.launch();
const errors = [];
const server = await serve(ROOT);
const page = await browser.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.goto(`http://127.0.0.1:${server.address().port}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 180000 });

async function shoot(params, cam) {
  await page.evaluate((p) => window.__frame.setParams(p), params);
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  return png.toString('base64');
}
// the reference: crops of 2.webp (600 × 800), drawn in a canvas in the page so no image library is needed
async function refCrop(box, size = 380) {
  if (!REFS) return null;
  const b64 = fs.readFileSync(path.join(REFS, '2.webp')).toString('base64');
  return page.evaluate(async ({ b64, box, size }) => {
    const img = new Image(); img.src = 'data:image/webp;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = size; c.height = size; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, size, size);
    const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, k = Math.min(size / w, size / h);
    x.drawImage(img, x0, y0, w, h, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
    return c.toDataURL('image/png').split(',')[1];
  }, { b64, box, size });
}

const MODES = [['round 3 — carved mass (M3)', { ornFlow: 'mass' }], [`round 4 — the forms${ROUND ? ' (F' + ROUND + ')' : ''}`, { ornFlow: 'forms' }]];
const rows = [];
const build = (params) => { const m = T.FL.withOrnament(T.G.buildFrame({ ...T.G.DEFAULTS, ...params })); const r = T.RL.buildRelief(m); return { m, r }; };
const pct = (v) => (100 * v).toFixed(1) + ' %';
const metrics = {};
for (const [sk, q] of CASES) {
  if (!want(`whole ${sk}`)) continue;
  const cells = [];
  for (const [nm, mq] of MODES) {
    const params = { filigree: 'scrolls', ...q, ...mq };
    const { m, r } = build(params), cv = coverageOf(m, r, T.RL);
    metrics[`${sk}/${mq.ornFlow}`] = { fill: cv ? cv.fill : null, tris: r.info.triangles, elements: m.ornament.formsStats ? m.ornament.formsStats.elements : null };
    cells.push({ label: `${sk} · ${nm} · front-on`, png: await shoot(params, { dir: [0, 0, 1], radius: sk === 'oval' ? 440 : 420 }), cap: `fill ${cv ? pct(cv.fill) : '—'} of the zone (2.webp's bronze: 59.3 %) · ${r.info.triangles.toLocaleString('en-US')} triangles`, told: [] });
  }
  if (REFS && sk === 'oval') cells.push({ label: 'the reference (2.webp, a stock photograph — not committed)', png: await refCrop([0, 0, 600, 800]), cap: '', told: [] });
  rows.push({ head: `the whole ${sk} at the default 180 mm print, front-on`, cells });
}
// close-ups of the forms: the shoulder C, the crest, the bottom (the foot), three-quarter — framed on the builder's own record
const refBox = { shoulder: [100, 60, 280, 240], crest: [200, 0, 400, 160], bottom: [110, 600, 330, 800], flank: [0, 200, 200, 560] };
const elementCells = [];
for (const [sk, q] of CASES) {
  if (!want(`close ${sk}`)) continue;
  const params = { filigree: 'scrolls', ...q, ornFlow: 'forms' };
  const { m } = build(params), E = m.ornament.formsStats.elements;
  const plateT = await page.evaluate((p) => { window.__frame.setParams(p); return window.__frame.stl().info.plateT; }, params);
  const find = (pred) => E.find(pred);
  const sh = find((e) => e.role === 'shoulder C'), cr = find((e) => e.kind === 'shell'), ft = find((e) => e.kind === 'foot') || E.filter((e) => e.kind === 'stem').pop();
  const flames = E.filter((e) => e.kind === 'flame');
  const cells = [];
  const add = async (label, at, radius, dir = [0, 0, 1]) => cells.push({ label: `${sk} · forms · ${label}`, png: await shoot(params, { dir, radius, target: [at[0], at[1], plateT] }), cap: '', told: [] });
  if (sh) await add('the shoulder C, front-on', sh.at, 75);
  if (cr) await add('the crest, front-on', [cr.at[0], cr.at[1] - 0.25 * cr.size], 85);
  if (flames.length) { const f = flames[flames.length - 1]; await add('the flank flames, front-on', f.at, 95); }
  if (ft) await add('the bottom (the foot), front-on', ft.at, 85);
  cells.push({ label: `${sk} · forms · three-quarter, whole`, png: await shoot(params, { dir: [0.55, 0.35, 1], radius: 470 }), cap: '', told: [] });
  rows.push({ head: `the ${sk}, round 4 (the forms): the shoulder C, the crest, the flank flames, the bottom, and three-quarter`, cells });
  if (REFS && sk === 'oval') {
    const rc = [];
    for (const [k, bx] of Object.entries(refBox)) rc.push({ label: `the reference — ${k} (2.webp, not committed)`, png: await refCrop(bx), cap: '', told: [] });
    rows.push({ head: 'the reference at the same places (2.webp, a stock photograph — not committed)', cells: rc });
  }
  // the ELEMENT sheet (the oval): each traced element beside its built counterpart
  if (sk === 'oval') {
    const crestC = find((e) => e.role === 'crest C'), stem = E.find((e) => e.kind === 'stem'), outer = flames[flames.length - 1];
    const pairs = [
      ['E1 the shoulder C-scroll', [140, 100, 255, 205], sh && sh.at, 55],
      ['E2 the crest C-scroll', [205, 55, 290, 130], crestC && crestC.at, 40],
      ['E3 the foot, curling under', [125, 690, 225, 775], ft && ft.rollAt, 40],
      ['E4 the node (the stem rolled over)', [25, 470, 115, 560], stem && stem.rollAt, 40],
      ['E5 a flank flame, its tip rolled out', [15, 270, 125, 380], outer && outer.rollAt, 45],
      ['E6 the crest shell', [245, 10, 355, 105], cr && [cr.at[0], cr.at[1]], 50],
    ];
    for (const [nm, box, at, radius] of pairs) {
      if (!at) continue;
      elementCells.push({ nm, ref: await refCrop(box, 300), built: await shoot(params, { dir: [0, 0, 1], radius, target: [at[0], at[1], plateT] }) });
    }
  }
}
await page.evaluate(() => window.__frame.pinCamera(null));
server.close();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><meta charset="utf-8"><title>frame flow study — round 4${ROUND ? ' F' + ROUND : ''}</title>
<style>body{background:#EDEDE8;color:#0A0A0C;font:12px/1.45 monospace;margin:16px} .row{display:flex;gap:10px;margin:6px 0 18px;flex-wrap:wrap} .cell{width:380px} .cell img{width:380px;height:380px;display:block;border:1px solid #bbb;background:#fff} .pair{display:flex;gap:8px;margin:4px 0 14px} .pair img{width:300px;height:300px;border:1px solid #bbb;background:#fff} h2{font-size:13px;margin:14px 0 4px} .cap{font-size:10.5px;color:#333}</style>
<h1 style="font-size:15px">/frame — the flow study, round 4${ROUND ? ` (F${ROUND})` : ''}: round 3's carved mass (M3) beside the FORMS — every element's outline built from the bronze's measured profiles (grammar §9)</h1>
${rows.map((r) => `<h2>${esc(r.head)}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div><b>${esc(c.label)}</b></div><div class="cap">${esc(c.cap)}</div></div>`).join('')}</div>`).join('')}
${elementCells.length ? `<h2>the elements: ${REFS ? 'each traced reference element (left, 2.webp — not committed) beside' : ''} its built counterpart on the oval (right)</h2>${elementCells.map((e) => `<div><b>${esc(e.nm)}</b><div class="pair">${e.ref ? `<img src="data:image/png;base64,${e.ref}">` : ''}<img src="data:image/png;base64,${e.built}"></div></div>`).join('')}` : ''}
<p class="cap">${errors.length ? 'page errors: ' + esc(errors.join(' | ')) : 'no page errors'}</p>`;
// every cell as its own PNG (larger than on the sheet), named by what it shows
const CELLS = path.join(path.dirname(PNG), `cells${ROUND ? '-f' + ROUND : ''}`);
fs.mkdirSync(CELLS, { recursive: true });
const slug = (t) => t.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
let ci = 0;
for (const r of rows) for (const c of r.cells) if (c.png) fs.writeFileSync(path.join(CELLS, `${String(++ci).padStart(2, '0')}-${slug(c.label)}.png`), Buffer.from(c.png, 'base64'));
for (const e of elementCells) { if (e.ref) fs.writeFileSync(path.join(CELLS, `${String(++ci).padStart(2, '0')}-${slug(e.nm)}-REFERENCE.png`), Buffer.from(e.ref, 'base64')); fs.writeFileSync(path.join(CELLS, `${String(++ci).padStart(2, '0')}-${slug(e.nm)}-BUILT.png`), Buffer.from(e.built, 'base64')); }
const HTML = PNG.replace(/\.png$/, '.html');
fs.writeFileSync(HTML, html);
fs.writeFileSync(path.join(OUT, `metrics${ROUND ? '-f' + ROUND : ''}.json`), JSON.stringify(metrics, null, 1));
const p2 = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await p2.goto('file://' + HTML); await p2.waitForTimeout(300);
await p2.screenshot({ path: PNG, fullPage: true });
await browser.close();
console.log('wrote', PNG, HTML, errors.length ? `(${errors.length} page errors)` : '');
