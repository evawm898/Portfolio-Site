#!/usr/bin/env node
/* shot-frame-scrolls.mjs <dir> — phase 3a, step 1: the SCROLL VOCABULARY
   sheet, for Eva's ruling on the scroll look before anything is attached to
   a skeleton. Every cell is a relief built by frame-filigree.js and drawn by
   the page's own Relief view (frame-view3d.js: the mesh's own positions under
   the registry's one LIGHT, auto-rotate off), on a 1 mm base, in print
   millimetres (scale 1). Rows: C and S across tightness; length; wire
   thickness and the two wire profiles; balance; groups of two to five; the
   same groups mirrored about a vertical axis (the crest's case).

   Every caption carries numbers measured on the cell's own mesh and curves:
   turns asked / built, the least self-gap and pair gap (mm, against the
   1.0 mm assumed minimum feature), the junction web, triangles, boundary
   edges (W) and voxel regions (C). Writes <dir>/index.html (self-contained)
   and <dir>/frame-scroll-vocabulary.png. No pixel claim is made. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-scroll-sheet');
fs.mkdirSync(OUT, { recursive: true });
const S = await import(pathToFileURL(path.join(ROOT, 'frame-filigree.js')).href);
const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);

const L0 = 60, T0 = 1.6;
const one = (spec) => [S.buildScroll({ length: L0, tightness: 0.5, wire: T0, balance: 0.6, kind: 'C', ...spec })];
const group = (q) => S.buildGroup({ length: L0, tightness: 0.5, wire: T0, ...q }).map((g) => g.curve);
// the crest's case. A single C: turned so its BACK faces the axis, its back's
// outer edge EMBED_MM / 2 past it, and mirrored — two backs overlapping by the
// embed, ")(". A group: kept upright and shifted so its leftmost wire edge is
// half a feature clear of the axis, and mirrored — the halves stand a feature
// apart (two pieces here; on a frame each half roots in the molding).
const backToBack = (c) => { const r = S.placeCurve(c, { at: [c.info.wire / 2 - S.EMBED_MM / 2, 0], angle: -Math.PI / 2 }); return [r, S.placeCurve(r, { at: r.pts[r.root], mirror: true })]; };
const mirrored = (cs) => { let x0 = Infinity; for (const c of cs) for (const [x] of c.pts) x0 = Math.min(x0, x - c.info.wire / 2); const sh = cs.map((c) => ({ ...c, pts: c.pts.map(([x, y]) => [x - x0 + 0.5, y]) })); return [...sh, ...sh.map((c) => ({ ...c, pts: c.pts.map(([x, y]) => [-x, y]), nrm: c.nrm.map(([x, y]) => [-x, y]) }))]; };

const cells = [];
for (const kind of ['C', 'S']) for (const tau of [0, 0.25, 0.5, 0.75, 1]) cells.push({ row: `${kind}-scroll × tightness (length ${L0} mm, wire ${T0} mm, balance 0.6)`, label: `tightness ${tau.toFixed(2)}`, curves: one({ kind, tightness: tau }) });
for (const L of [30, 60, 90, 120]) cells.push({ row: 'C-scroll × length (tightness 0.5)', label: `length ${L} mm`, curves: one({ length: L }) });
for (const L of [30, 60, 90, 120]) cells.push({ row: 'S-scroll × length (tightness 0.5)', label: `length ${L} mm`, curves: one({ kind: 'S', length: L }) });
for (const t of [1.0, 1.6, 2.4, 3.2]) cells.push({ row: 'wire thickness (C, length 60, round)', label: `wire ${t.toFixed(1)} mm`, curves: one({ wire: t }) });
for (const [shape, t] of [['round', 1.6], ['half-round', 1.6], ['round', 2.4], ['half-round', 2.4]]) cells.push({ row: 'wire profile', label: `${shape}, ${t} mm`, curves: one({ wire: t }), shape, cam: 'low' });
for (const b of [1, 0.75, 0.6, 0.4]) cells.push({ row: 'balance (second volute against the first)', label: `balance ${b}`, curves: one({ balance: b }) });
for (const n of [2, 3, 4, 5]) cells.push({ row: 'groups of 2–5 (a lead C, children budding from its back, × 0.6 per order)', label: `${n} scrolls`, curves: group({ n }) });
for (const n of [2, 3, 4, 5]) cells.push({ row: 'groups of 2–5, tightness 1', label: `${n} scrolls, tight`, curves: group({ n, tightness: 1 }) });
for (const n of [1, 2, 3]) cells.push({ row: 'mirrored about a vertical axis (the crest\'s case)', label: n === 1 ? 'a C pair, back to back' : `${n}-scroll groups, mirrored`, curves: n === 1 ? backToBack(one({ balance: 0.6 })[0]) : mirrored(group({ n })) });

// measure every cell in Node: the mesh and the gaps
for (const c of cells) {
  const relief = S.scrollRelief(c.curves, { baseZ: 1, shape: c.shape || 'round' });
  const a = RL.analyzeStl(RL.exportStl(relief));
  const conn = RL.connected(relief);
  let self = Infinity, pair = Infinity, web = 0, touch = 0;
  for (const cv of c.curves) self = Math.min(self, S.selfGap(cv, cv.info.wire).gap);
  for (let i = 0; i < c.curves.length; i++) for (let j = i + 1; j < c.curves.length; j++) {
    const p = S.pairGap(c.curves[i], c.curves[j]);
    if (p.contact < c.curves[i].info.wire) { web = Math.max(web, p.web); touch++; }
    pair = Math.min(pair, p.gap);
  }
  const lead = c.curves[0].info;
  c.relief = relief;
  c.measure = { tris: a.triangles, boundary: a.boundary, comps: conn.comps, self, pair, web, touch, asked: lead.turnsAsked, held: lead.turnsHeld, told: c.curves.flatMap((x) => x.info.told) };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/_scrolls.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#0A0A0C}canvas{width:520px;height:400px;display:block}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/"}}</script>
<canvas id="c"></canvas><script type="module">import { createViewer } from '/frame-view3d.js'; const v = createViewer(document.getElementById('c')); v.resize();
window.__show = (pos, idx, view) => { v.setMesh({ positions: new Float64Array(pos), indices: new Uint32Array(idx) }); v.frame(view); for (let i = 0; i < 4; i++) v.render(); return true; }; window.__ready = true;</script>`);
  }
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 520, height: 400 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/_scrolls.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

for (const c of cells) {
  const P = c.relief.positions;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
  // one camera law for every cell: straight on, tipped up a little so the
  // relief reads under the light; framed on the cell's own extent
  const span = Math.max(x1 - x0, (y1 - y0) * 1.3);
  const view = c.cam === 'low'
    ? { dir: [0.0, -1.4, 1], radius: span * 2.2, target: [(x0 + x1) / 2, (y0 + y1) / 2, 1] }
    : { dir: [0.05, -0.35, 1], radius: span * 2.05, target: [(x0 + x1) / 2, (y0 + y1) / 2, 1] };
  await page.evaluate(([pos, idx, v]) => window.__show(pos, idx, v), [Array.from(P), Array.from(c.relief.indices), view]);
  c.png = (await page.screenshot({ type: 'png' })).toString('base64');
  c.span = span;
}

const fmt = (x) => (x === Infinity ? '—' : x.toFixed(2));
const rows = [...new Set(cells.map((c) => c.row))];
const html = `<!doctype html><meta charset="utf-8"><title>/frame — scroll vocabulary</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.14em;text-transform:uppercase;color:#5FA0A0;margin:20px 0 8px}.row{display:flex;gap:12px;flex-wrap:wrap}.cell{width:260px}.cell img{width:260px;display:block;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}.warn{color:#D6A15C}</style>
<h1>/frame — phase 3a: the scroll vocabulary</h1>
<div>Relief view, print mm, every wire on a 1.0 mm base, the one fixed light from the upper left. Each cell is framed on its own extent (the field width is in the caption) — compare SHAPES across a row, not sizes. Gaps are centreline distance less the wires, against the 1.0 mm minimum feature (an ASSUMPTION — nothing has been printed). "web" is the junction where two wires meet: the stretch over which they are closer than the gap floor and print as one. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${rows.map((r) => `<h2>${r}</h2><div class="row">${cells.filter((c) => c.row === r).map((c) => { const m = c.measure; return `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b> · field ${c.span.toFixed(0)} mm<br>turns ${m.asked.toFixed(2)} asked → ${m.held.toFixed(2)} built${m.held < m.asked - 1e-9 ? ' <span class="warn">(held: a closer coil webs)</span>' : ''}<br>self-gap ${fmt(m.self)} · pair gap ${fmt(m.pair)}${m.touch ? ` · ${m.touch} junction${m.touch > 1 ? 's' : ''}, web ≤ ${m.web.toFixed(1)} mm` : ''}<br>${m.tris.toLocaleString()} tris · boundary ${m.boundary} · ${m.comps} region${m.comps > 1 ? 's' : ''}</div></div>`; }).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1150, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-scroll-vocabulary.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${cells.length} cells → ${OUT}/index.html, frame-scroll-vocabulary.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of cells) { const m = c.measure; console.log(`  ${c.row.slice(0, 34).padEnd(34)} ${c.label.padEnd(30)} turns ${m.asked.toFixed(2)}→${m.held.toFixed(2)} self ${fmt(m.self)} pair ${fmt(m.pair)} web ${m.web.toFixed(1)} tris ${m.tris} b${m.boundary} r${m.comps}`); }
