#!/usr/bin/env node
/* shot-frame-rinceau-wired.mjs <dir> --base <worktree> [--only <regex>] —
   phase 3f step 2 (docs/frame-charter.md §18.6): THE RINCEAU WIRED, beside
   the 9.5 mm vine it replaced. The three default frames front-on at the
   default 180 mm print, a mid-run close-up (the rectangle's side run) and a
   corner (the rectangle's top-right, the arch's springing), front-on and
   three-quarter — each cell this tree (the rinceau on its 16 mm band) beside
   the BASE tree (a worktree of main: the vine on the 9.5 mm band), both
   served from their own HTTP server and rendered by their own page, the
   camera pinned to the same print-mm point and radius.

   Captions are each tree's own Node build of the same params (band, volutes,
   turns drawn, leaves, triangles, boundary edges, voxel regions). No pixel
   claim anywhere: for ruling by eye. Writes <dir>/index.html and
   <dir>/frame-rinceau-wired.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-rinceau-wired');
fs.mkdirSync(OUT, { recursive: true });
const baseAt = process.argv.indexOf('--base');
if (baseAt < 0) { console.log('usage: shot-frame-rinceau-wired.mjs <dir> --base <worktree of main>'); process.exit(1); }
const BASE = path.resolve(process.argv[baseAt + 1]);
const onlyAt = process.argv.indexOf('--only'), ONLY = onlyAt > 0 ? new RegExp(process.argv[onlyAt + 1]) : null;

// ---- the two trees' Node builds (the captions) ----
async function treeOf(root) {
  const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
  const G = await imp('frame-geometry.js'), FL = await imp('frame-filigree.js'), RL = await imp('frame-relief.js');
  return (params) => {
    const p = { ...G.DEFAULTS, filigree: 'scrolls', ...params };
    const m = FL.withOrnament(G.buildFrame(p)), o = m.ornament, r = RL.buildRelief(m), a = RL.analyzeStl(RL.exportStl(r)), c = RL.connected(r);
    const vol = (o.items || []).filter((i) => i.kind === 'volute'), t = vol.map((i) => i.curves[0].info.turnsDrawn);
    const kinds = {}; for (const it of o.items || []) kinds[it.kind] = (kinds[it.kind] || 0) + 1;
    return { band: (r.info.bandW).toFixed(1), layout: o.layout, kinds, vol: vol.length, leaves: vol.reduce((n, i) => n + i.curves.length - 1, 0), turns: t.length ? `${Math.min(...t).toFixed(2)}–${Math.max(...t).toFixed(2)}` : '—', tris: r.indices.length / 3, boundary: a.boundary, regions: c.comps };
  };
}
const nodeNew = await treeOf(ROOT), nodeOld = await treeOf(BASE);
const capOf = (n) => n.layout === 'rinceau'
  ? `the rinceau · band ${n.band} mm · ${n.vol} volutes per side, turns drawn ${n.turns} · ${n.leaves} acanthus leaves · ${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}`
  : `the vine (main) · band ${n.band} mm · items per side ${Object.entries(n.kinds).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'} · ${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}`;

// ---- two servers, two pages ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
async function serve(root) {
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  return server;
}
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function pageFor(root) {
  const server = await serve(root);
  const page = await browser.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${path.basename(root)}: ${e}`));
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
    catch { route.abort(); }
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/frame.html`);
  await page.waitForFunction(() => !!window.__frame);
  await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
  await page.evaluate(() => window.__frame.setView('3d'));
  await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });
  return { page, server };
}
const NEW = await pageFor(ROOT), OLD = await pageFor(BASE);

// a target point (print mm, on the frame's OUTER edge region) read off the
// page's own model: a run's middle or an anchor
async function target(page, where) {
  return page.evaluate((where) => {
    const m = window.__frame.model(), s = window.__frame.stl().info, A = m.info.anchors;
    let pt;
    if (where === 'side') pt = [(A.cornerTR.pt[0] + A.cornerBR.pt[0]) / 2, (A.cornerTR.pt[1] + A.cornerBR.pt[1]) / 2];
    else pt = A[where].pt;
    return [pt[0] * s.scale, pt[1] * s.scale, s.plateT];
  }, where);
}
async function shoot(page, params, cam) {
  await page.evaluate((p) => window.__frame.setParams(p), params);
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  return png.toString('base64');
}
const VIEWS = { front: { dir: [0, 0, 1], name: 'front-on' }, tq: { dir: [0.5, 0.35, 1], name: 'three-quarter' } };
const rows = [];
const want = (label) => !ONLY || ONLY.test(label);
// the whole frames, front-on at 180 mm
for (const [sk, q] of [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]]) {
  if (!want(`whole ${sk}`)) continue;
  const params = { filigree: 'scrolls', ...q }, cells = [];
  for (const [who, T, nb] of [['before — the vine on the 9.5 mm band (main)', OLD, nodeOld], ['after — the rinceau on the 16 mm band', NEW, nodeNew]]) {
    cells.push({ label: `${sk} · ${who} · whole, front-on`, png: await shoot(T.page, params, { dir: [0, 0, 1], radius: 385 }), cap: capOf(nb(params)) });
  }
  rows.push({ head: `the whole ${sk} at the default 180 mm print, front-on`, cells });
}
// the close-ups
for (const [nm, q, where, radius] of [['mid-run — the rectangle\'s side', { skeleton: 'rect' }, 'side', 62], ['corner — the rectangle\'s top right', { skeleton: 'rect' }, 'cornerTR', 62], ['corner — the arch\'s springing', {}, 'springR', 62]]) {
  for (const [vk, v] of Object.entries(VIEWS)) {
    if (!want(`${nm} ${vk}`)) continue;
    const params = { filigree: 'scrolls', ...q }, cells = [];
    for (const [who, T, nb] of [['before — the vine (main)', OLD, nodeOld], ['after — the rinceau', NEW, nodeNew]]) {
      await T.page.evaluate((p) => window.__frame.setParams(p), params);
      const t = await target(T.page, where);
      cells.push({ label: `${who} · ${v.name}`, png: await shoot(T.page, params, { dir: v.dir, radius, target: t }), cap: capOf(nb(params)) });
    }
    rows.push({ head: `${nm} — ${v.name}`, cells });
  }
}
for (const T of [NEW, OLD]) { await T.page.evaluate(() => window.__frame.pinCamera(null)); T.server.close(); }

const html = `<!doctype html><meta charset="utf-8"><title>/frame — the rinceau wired</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:10px;flex-wrap:wrap}.cell{width:520px}.cell img{width:100%;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3f step 2: the rinceau wired</h1><div>Each row: main's vine on the 9.5 mm band (left) beside the rinceau on the band widened to 16 mm (right) — Eva's picks B / E, ruling (b) and (d), the stem and acanthus weighted up to fill the wide band. Relief view: the STL's own positions under the one fixed light; the same print-mm camera on both. Nothing here has been printed; the 1.0 mm floor is an assumption. Captions: each tree's own Node build. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r.head}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.cap}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-rinceau-wired.png'), fullPage: true });
await browser.close();
console.log(`${rows.reduce((a, r) => a + r.cells.length, 0)} cells → ${OUT}/index.html, frame-rinceau-wired.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
