#!/usr/bin/env node
/* shot-frame-flowers.mjs <dir> --base <worktree> [--only <regex>] —
   phase 3f step 2b (docs/frame-charter.md §18.7): THE FLOWER IS THE FEATURE,
   beside the step-2 sheet's version (a worktree of cd90cf5: the rosettes
   sunk into the molding, the stems sweeping over them). The three default
   frames front-on at the default 180 mm print, and the two corners Eva named
   (the rectangle's top-right, the arch's springing) front-on and
   three-quarter — each cell this tree beside the BASE tree, both served from
   their own HTTP server and rendered by their own page, the camera pinned to
   the same print-mm point and radius.

   Captions are each tree's own Node build of the same params, the heights
   read off the RELIEF it builds (never a record): every motif's crown over
   the back, the highest rinceau wire near it, and how far any wire stands
   over its top surface (a stem crossing over it). No pixel claim anywhere:
   for ruling by eye. Writes <dir>/index.html and <dir>/frame-flowers.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-rinceau-wired');
fs.mkdirSync(OUT, { recursive: true });
const baseAt = process.argv.indexOf('--base');
if (baseAt < 0) { console.log('usage: shot-frame-flowers.mjs <dir> --base <worktree of cd90cf5>'); process.exit(1); }
const BASE = path.resolve(process.argv[baseAt + 1]);
const onlyAt = process.argv.indexOf('--only'), ONLY = onlyAt > 0 ? new RegExp(process.argv[onlyAt + 1]) : null;

// ---- the two trees' Node builds (the captions), the heights off the relief ----
function heights(r) {
  const P = r.positions, I = r.indices, T = r.plateT;
  const vs = (pp) => { const s = new Set(); for (let t = pp.t0; t < pp.t1; t++) for (let k = 0; k < 3; k++) s.add(I[3 * t + k]); return s; };
  const W = []; for (const pp of r.parts) if (pp.kind === 'band' && /^orn/.test(pp.id)) for (const v of vs(pp)) W.push(v);
  const els = new Map(); for (const pp of r.parts) if (pp.kind === 'element') { if (!els.has(pp.element)) els.set(pp.element, { kind: pp.elKind, tris: [] }); for (let t = pp.t0; t < pp.t1; t++) els.get(pp.element).tris.push(t); }
  const out = [];
  for (const [, e] of els) {
    const cell = 0.5, B = new Map(); let crown = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const t of e.tris) {
      const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2]; for (const v of [a, b, c]) crown = Math.max(crown, P[3 * v + 2]);
      const xs = [P[3 * a], P[3 * b], P[3 * c]], ys = [P[3 * a + 1], P[3 * b + 1], P[3 * c + 1]];
      x0 = Math.min(x0, ...xs); x1 = Math.max(x1, ...xs); y0 = Math.min(y0, ...ys); y1 = Math.max(y1, ...ys);
      for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...ys) / cell); j <= Math.floor(Math.max(...ys) / cell); j++) { const k = `${i},${j}`; if (!B.has(k)) B.set(k, []); B.get(k).push(t); }
    }
    const top = (x, y) => { let best = -Infinity; for (const t of B.get(`${Math.floor(x / cell)},${Math.floor(y / cell)}`) || []) { const a = I[3 * t], b = I[3 * t + 1], c = I[3 * t + 2]; const ax = P[3 * a], ay = P[3 * a + 1], bx = P[3 * b], by = P[3 * b + 1], cx = P[3 * c], cy = P[3 * c + 1]; const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-12) continue; const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, l3 = 1 - l1 - l2; if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue; best = Math.max(best, l1 * P[3 * a + 2] + l2 * P[3 * b + 2] + l3 * P[3 * c + 2]); } return best; };
    let near = -Infinity, over = -Infinity;
    for (const v of W) { const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2]; if (x < x0 - 2 || x > x1 + 2 || y < y0 - 2 || y > y1 + 2) continue; const s = top(x, y); if (s > -Infinity) over = Math.max(over, z - s); if (s > -Infinity || [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => top(x + dx, y + dy) > -Infinity)) near = Math.max(near, z); }
    out.push({ kind: e.kind, x: (x0 + x1) / 2, crown: crown - T, near: near - T, over });
  }
  return out;
}
async function treeOf(root) {
  const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
  const G = await imp('frame-geometry.js'), FL = await imp('frame-filigree.js'), RL = await imp('frame-relief.js');
  return (params) => {
    const p = { ...G.DEFAULTS, filigree: 'scrolls', ...params };
    const m = FL.withOrnament(G.buildFrame(p)), r = RL.buildRelief(m), a = RL.analyzeStl(RL.exportStl(r)), c = RL.connected(r);
    return { tris: r.indices.length / 3, boundary: a.boundary, regions: c.comps, h: heights(r).filter((e) => e.x >= -1e-6) };
  };
}
const nodeNew = await treeOf(ROOT), nodeOld = await treeOf(BASE);
const capOf = (n) => `${n.h.map((e) => `<b>${e.kind}</b> crown ${e.crown.toFixed(2)} mm · highest wire near ${e.near.toFixed(2)} · ${e.over > 0 ? `a wire ${e.over.toFixed(2)} mm OVER it` : `every wire under it (${(-e.over).toFixed(2)} mm clear)`}`).join('<br>')}<br>${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}`;

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
  for (const [who, T, nb] of [['before — the step-2 sheet (rosettes sunk)', OLD, nodeOld], ['after — the flowers in front', NEW, nodeNew]]) {
    cells.push({ label: `${sk} · ${who} · whole, front-on`, png: await shoot(T.page, params, { dir: [0, 0, 1], radius: 385 }), cap: capOf(nb(params)) });
  }
  rows.push({ head: `the whole ${sk} at the default 180 mm print, front-on`, cells });
}
// the close-ups
for (const [nm, q, where, radius] of [['corner — the rectangle\'s top right', { skeleton: 'rect' }, 'cornerTR', 62], ['corner — the arch\'s springing', {}, 'springR', 62], ['the crest — the arch\'s apex', {}, 'apex', 115]]) {
  for (const [vk, v] of Object.entries(VIEWS)) {
    if (!want(`${nm} ${vk}`)) continue;
    const params = { filigree: 'scrolls', ...q }, cells = [];
    for (const [who, T, nb] of [['before — the step-2 sheet', OLD, nodeOld], ['after — the flowers in front', NEW, nodeNew]]) {
      await T.page.evaluate((p) => window.__frame.setParams(p), params);
      const t = await target(T.page, where);
      cells.push({ label: `${who} · ${v.name}`, png: await shoot(T.page, params, { dir: v.dir, radius, target: t }), cap: capOf(nb(params)) });
    }
    rows.push({ head: `${nm} — ${v.name}`, cells });
  }
}
for (const T of [NEW, OLD]) { await T.page.evaluate(() => window.__frame.pinCamera(null)); T.server.close(); }

const html = `<!doctype html><meta charset="utf-8"><title>/frame — the flower in front</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:10px;flex-wrap:wrap}.cell{width:520px}.cell img{width:100%;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3f step 2b: the flower is the feature</h1><div>Each row: the step-2 sheet (left: the rosettes sunk into the molding, the stems sweeping over them) beside this tree (right: every flower raised until each stem under it runs beneath its top and its crown stands 1 mm over the rinceau near it; the crest shell draped higher again, 1 mm over every flower). Heights are over the back, read off each tree's own relief; the right half of each frame. Relief view: the STL's own positions under the one fixed light; the same print-mm camera on both. Nothing here has been printed; the 1.0 mm floor is an assumption. Captions: each tree's own Node build. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r.head}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.cap}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-flowers.png'), fullPage: true });
await browser.close();
console.log(`${rows.reduce((a, r) => a + r.cells.length, 0)} cells → ${OUT}/index.html, frame-flowers.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
