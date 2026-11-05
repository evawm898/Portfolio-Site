#!/usr/bin/env node
// shot-scene-studio-style.mjs — the cat silhouette, on every surface.
//
//   node tools/shot-scene-studio-style.mjs <dir> [--png <file>]
//
// Each cat on each perch — floor, chair, table, windowsill, chaise — in five
// poses (sitting facing the camera, standing in profile, a loaf at three
// quarters, curled asleep, sitting with its back to the camera), drawn with the
// SHIPPED modules (studio-room / studio-cat / studio-rig / studio-draw) onto a
// room drawn by the shipped drawRoom, on a page this tool serves. Every cat is
// stepped half a second from rest so its paws have planted and its tail and
// head have sprung; nothing here positions a cat the director would — it is a
// still life, not the scene. The jump key frames are tools/shot-scene-studio.mjs.
//
// Nothing here is a gate. tools/verify-scene-studio.mjs is.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find(a => !a.startsWith('--')) || 'studio-style');
const pngAt = args.indexOf('--png');
const PNG = pngAt >= 0 ? path.resolve(args[pngAt + 1]) : path.join(OUT, 'sheet.png');
fs.mkdirSync(OUT, { recursive: true });

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const root of [...(process.env.NODE_PATH || '').split(path.delimiter), '/opt/node22/lib/node_modules', '/usr/lib/node_modules']) {
    if (root && fs.existsSync(path.join(root, 'playwright', 'index.js'))) return require(path.join(root, 'playwright'));
  }
  return require('playwright');
}

const W = 1280, H = 800;
const PAGE = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff}canvas{position:absolute;left:0;top:0;width:${W}px;height:${H}px}</style>
<canvas id="b"></canvas><canvas id="f"></canvas>
<script type="module">
import { createView, NODES, ledgeAt, ledgeLength } from '/scene/studio-room.js';
import { createCat, stepCat } from '/scene/studio-cat.js';
import { solveRig } from '/scene/studio-rig.js';
import { drawRoom, drawActors } from '/scene/studio-draw.js';
const dpr = 2, view = createView(${W}, ${H});
const ctxOf = (id) => { const c = document.getElementById(id); c.width = ${W} * dpr; c.height = ${H} * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr); return x; };
const back = ctxOf('b'), front = ctxOf('f');
drawRoom(back, view);
const sillPath = NODES.sill.area.path, sillL = ledgeLength(sillPath);
window.place = (cats) => {
  const made = cats.map((c, i) => {
    let { node, x, z, heading } = c;
    if (node === 'sill') { const q = ledgeAt(sillPath, sillL * c.s); x = q.x; z = q.z; if (heading == null) heading = q.heading; }
    const cat = createCat({ id: c.id, seed: 11 + i * 7, node, x, z, heading, posture: c.posture });
    for (let k = 0; k < 60; k++) stepCat(cat, 1 / 120);
    return cat;
  });
  const rigs = made.map(solveRig);
  drawActors(front, view, made, made.map(() => null), rigs);
  // each cat's screen box, from what the rig drew
  return rigs.map((r) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const add = (q, rr = 0) => { const p = view.p(q[0], q[1], q[2]); x0 = Math.min(x0, p.x - rr * p.s); x1 = Math.max(x1, p.x + rr * p.s); y0 = Math.min(y0, p.y - rr * p.s); y1 = Math.max(y1, p.y + rr * p.s); };
    r.spine.forEach(s => add(s.p, s.r * 1.2)); add(r.head.c, r.head.r * 1.5); r.tail.forEach(t => add(t.p, 2.6));
    r.legs.forEach(L => add(L.paw, 3)); r.ears.forEach(t => t.forEach(q => add(q)));
    return { x0, y0, x1, y1 };
  });
};
window.ready = true;
</script>`;

function serve() {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    if (rel === '__style.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(PAGE); return; }
    const f = path.join(REPO, rel);
    if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

// heading: forward in plan is [cos h, sin h] over (x, z); the camera is at -z
const TOWARD = -Math.PI / 2, AWAY = Math.PI / 2;
const POSES = [
  { label: 'sitting, facing the camera', posture: 'sit', h: TOWARD + 0.15 },
  { label: 'standing, in profile', posture: 'stand', h: Math.PI },
  { label: 'loaf, three-quarter', posture: 'loaf', h: TOWARD + 0.75 },
  { label: 'curled asleep', posture: 'curl', h: 0.4 },
  { label: 'sitting, back to the camera', posture: 'sit', h: AWAY - 0.3 },
];
const SURFACES = [
  { label: 'floor', at: { node: 'floor', x: -40, z: 220 } },
  { label: 'chair', at: { node: 'chairL', x: -64, z: 392 } },
  { label: 'table', at: { node: 'table', x: 0, z: 388 } },
  { label: 'windowsill', at: { node: 'sill', s: 0.2 } },
  { label: 'chaise', at: { node: 'chaise', x: 177, z: 280 } },
];

async function main() {
  const { chromium } = loadPlaywright();
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__style.html`);
  await page.waitForFunction(() => window.ready);
  const rows = [];
  for (const S of SURFACES) {
    const cells = [];
    for (let j = 0; j < POSES.length; j++) {
      const P = POSES[j];
      const id = j % 2 ? 'soot' : 'ink';
      const [b] = await page.evaluate((c) => window.place([c]), { id, ...S.at, heading: P.h, posture: P.posture });
      const m = 18, cw = Math.max(b.x1 - b.x0, b.y1 - b.y0) + 2 * m;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const clip = { x: Math.max(0, cx - cw / 2), y: Math.max(0, cy - cw / 2), width: cw, height: cw };
      clip.width = Math.min(W - clip.x, clip.width); clip.height = Math.min(H - clip.y, clip.height);
      const file = `${S.label}-${j}.png`;
      await page.screenshot({ path: path.join(OUT, file), clip });
      cells.push({ file, label: `${id} · ${P.label}` });
    }
    // both cats at once, in context, for the surface's wide shot
    const both = S.label === 'floor'
      ? [{ id: 'ink', node: 'floor', x: -60, z: 200, heading: TOWARD + 0.3, posture: 'sit' }, { id: 'soot', node: 'floor', x: 80, z: 260, heading: Math.PI + 0.2, posture: 'stand' }]
      : [{ id: 'ink', ...S.at, heading: POSES[0].h, posture: 'sit' }];
    await page.evaluate((c) => window.place(c), both);
    const wide = `${S.label}-room.png`;
    await page.screenshot({ path: path.join(OUT, wide) });
    rows.push({ label: S.label, cells, wide });
    console.log(S.label, cells.length);
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Studio cats — silhouette on every surface</title>
<style>body{font:13px/1.4 "IBM Plex Mono",monospace;background:#f4f2ee;color:#222;margin:20px;width:1500px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px}.row{display:flex;gap:6px;align-items:flex-start}
.f{background:#fff;border:1px solid #ccc;padding:3px}.f img{display:block;width:200px;height:200px}.f div{font-size:11px;text-align:center;width:200px}
.w img{display:block;height:206px;border:1px solid #ccc}</style>
<h1>Scene 4 — the cat silhouette, every surface</h1>
<div>Shipped modules, a still life: each cat placed on the perch and stepped 0.5 s from rest. One pure black fill, no visible legs (the IK still solves them; the drawing keeps only the paws as nubs), white ring eyes, three whiskers a side.</div>
${rows.map(r => `<h2>${r.label}</h2><div class="row"><div class="w"><img src="${r.wide}"></div>${r.cells.map(c => `<div class="f"><img src="${c.file}"><div>${c.label}</div></div>`).join('')}</div>`).join('')}`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  const sheet = await browser.newPage({ viewport: { width: 1540, height: 900 }, deviceScaleFactor: 1 });
  await sheet.setContent(html.replace(/src="([^"]+\.png)"/g, (_, f) => `src="data:image/png;base64,${fs.readFileSync(path.join(OUT, f)).toString('base64')}"`));
  await sheet.waitForTimeout(300);
  await sheet.screenshot({ path: PNG, fullPage: true });
  console.log('errors', errs.length ? errs : 'none');
  console.log('sheet', PNG);
  await browser.close();
  server.close();
}

main().catch(e => { console.error(e); process.exit(1); });
