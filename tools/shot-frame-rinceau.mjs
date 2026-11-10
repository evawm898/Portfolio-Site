#!/usr/bin/env node
/* shot-frame-rinceau.mjs <dir> [--only <regex>] [--refs <dir>] — phase 3f
   step 1, THE RINCEAU VOCABULARY (docs/frame-charter.md §18): the running
   scroll on ONE STRAIGHT BAND (the rectangle's right side, its side run
   alone) and ONE CURVED RUN (the oval's upper run, crest to side), in the
   Relief view (the STL's own positions under the one LIGHT), front-on and
   three-quarter, with the variants Eva rules between:
     - wave tightness  loose / medium / tight
     - volute turns    few / medium / many — at the default 180 mm print AND
                       at 300 mm (at 180 the band cannot hold more than ~0.9
                       of a turn, so "many" reads as "medium" there: told)
     - leaf fullness   light / full
   plus the current vine at the same cameras (the "before"), and a preview
   of the three default frames with the rinceau on every run (NOT the ruling:
   step 2 wires it).

   Through the page (window.__frame.setParams with the hidden ornRinceau /
   rinWave / rinTurns / rinLeaf params — no control writes them yet), the
   camera PINNED per cell on a mid-run point. Each caption carries the Node
   build's own counts of the same params (volutes, the turns drawn, the
   triangles, boundary edges, voxel regions). No pixel claim anywhere: for
   ruling by eye. Writes <dir>/index.html and <dir>/frame-rinceau-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { buildFrame, DEFAULTS } from '../frame-geometry.js';
import { withOrnament } from '../frame-filigree.js';
import { buildRelief, analyzeStl, exportStl, connected } from '../frame-relief.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'frame-rinceau-sheet');
fs.mkdirSync(OUT, { recursive: true });
const onlyAt = process.argv.indexOf('--only'), ONLY = onlyAt > 0 ? new RegExp(process.argv[onlyAt + 1]) : null;
const refsAt = process.argv.indexOf('--refs'), REFS = refsAt > 0 ? path.resolve(process.argv[refsAt + 1]) : null;

// ---- the two runs ----
const RUNS = {
  straight: { label: 'straight band (rect, right side run)', params: { skeleton: 'rect', ornCrest: 'off', ornCorners: 'off', ornSides: 'on', ornBottom: 'off' } },
  curved: { label: 'curved run (oval, crest → side)', params: { skeleton: 'oval', ornCorners: 'off', ornBottom: 'off' } },
};
const ON = { filigree: 'scrolls', ornRinceau: 'on' };
const VIEWS = { front: { dir: [0, 0, 1], name: 'front-on' }, tq: { dir: [0.5, 0.35, 1], name: 'three-quarter' } };
const VARIANTS = [
  ['wave tightness', 'loose', { rinWave: 'loose' }],
  ['wave tightness', 'medium', { rinWave: 'medium' }],
  ['wave tightness', 'tight', { rinWave: 'tight' }],
  ['volute turns (180 mm print)', 'few', { rinTurns: 'few' }],
  ['volute turns (180 mm print)', 'medium', { rinTurns: 'medium' }],
  ['volute turns (180 mm print)', 'many', { rinTurns: 'many' }],
  ['volute turns (300 mm print)', 'few', { rinTurns: 'few', printHeight: 300 }],
  ['volute turns (300 mm print)', 'medium', { rinTurns: 'medium', printHeight: 300 }],
  ['volute turns (300 mm print)', 'many', { rinTurns: 'many', printHeight: 300 }],
  ['leaf fullness', 'light', { rinLeaf: 'light' }],
  ['leaf fullness', 'full', { rinLeaf: 'full' }],
];

// the Node build's own numbers for a params set (the caption)
function counts(params) {
  const p = { ...DEFAULTS, ...params };
  const m = withOrnament(buildFrame(p)), o = m.ornament, r = buildRelief(m), a = analyzeStl(exportStl(r)), c = connected(r);
  const vol = (o.items || []).filter((i) => i.kind === 'volute'), t = vol.map((i) => i.curves[0].info.turnsDrawn);
  const leaves = vol.reduce((n, i) => n + i.curves.length - 1, 0);
  const lowered = o.told.filter((x) => /made smaller|not built/.test(x)).map((x) => x.replace(/ along the vine/, '')).join('; ');
  return { vol: vol.length, leaves, turns: t.length ? `${Math.min(...t).toFixed(2)}–${Math.max(...t).toFixed(2)}` : '—', tris: r.indices.length / 3, boundary: a.boundary, regions: c.comps, M: (p.moldingWidth * o.scale).toFixed(1), lowered };
}

// ---- the page ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const VW = 760, VH = 760;
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/frame.html`);
await page.waitForFunction(() => !!window.__frame);
await page.addStyleTag({ content: '.fr-panel,.fr-header,.fr-viewtoggle{display:none!important} .fr-stage{right:0!important;padding:0!important}' });
await page.evaluate(() => window.__frame.setView('3d'));
await page.waitForFunction(() => window.__frame.view() === '3d' && window.__frame.view3dInk() !== null, null, { timeout: 60000 });

// a mid-run target (print mm): the straight run's middle; the curved run at
// 50° along the oval from its crest
async function target(run) {
  return page.evaluate((run) => {
    const m = window.__frame.model(), s = window.__frame.stl().info, A = m.info.anchors;
    let pt;
    if (run === 'straight') pt = [(A.cornerTR.pt[0] + A.cornerBR.pt[0]) / 2, (A.cornerTR.pt[1] + A.cornerBR.pt[1]) / 2];
    else { const a = A.sideR.pt[0], yc = A.sideR.pt[1], b = A.topCentre.pt[1] - yc, t = 50 * Math.PI / 180; pt = [a * Math.sin(t), yc + b * Math.cos(t)]; }
    return [pt[0] * s.scale, pt[1] * s.scale, s.plateT];
  }, run);
}
async function shoot(params, cam) {
  await page.evaluate((p) => window.__frame.setParams(p), params);
  await page.evaluate((v) => window.__frame.pinCamera(v), cam);
  await page.waitForTimeout(150);
  let png = null, prev = null;
  for (let i = 0; i < 8; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(120); }
  return png.toString('base64');
}

const rows = [];
const want = (label) => !ONLY || ONLY.test(label);
const runCells = async (group, name, extra) => {
  const cells = [];
  for (const [rk, run] of Object.entries(RUNS)) {
    const params = { ...run.params, ...extra };
    const label = `${group} · ${name} · ${rk}`;
    if (!want(label)) continue;
    const n = counts(params);
    await page.evaluate((p) => window.__frame.setParams(p), params);
    const t = await target(rk), radius = (params.printHeight || 180) / 180 * 58;
    for (const [vk, v] of Object.entries(VIEWS)) {
      const png = await shoot(params, { dir: v.dir, radius, target: t });
      cells.push({ label: `${run.label} · ${v.name}`, png, cap: params.ornRinceau === 'on'
        ? `M ${n.M} mm · ${n.vol} volutes, turns drawn ${n.turns} · ${n.leaves} acanthus leaves · ${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}${n.lowered ? ' · ' + n.lowered : ''}`
        : `the vine as on main · ${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}` });
    }
  }
  if (cells.length) rows.push({ head: `${group} — ${name}`, cells });
};
await runCells('before', 'the current vine (main)', { filigree: 'scrolls' });
for (const [g, n, v] of VARIANTS) await runCells(g, n, { ...ON, ...v });
// the preview: the three default frames, the rinceau on every run
const prev = [];
for (const [sk, q] of [['arch', {}], ['rectangle', { skeleton: 'rect' }], ['oval', { skeleton: 'oval' }]]) {
  if (!want(`preview · ${sk}`)) continue;
  const params = { ...q, ...ON }, n = counts(params);
  prev.push({ label: `${sk} · full frame, front-on`, png: await shoot(params, { dir: [0, 0, 1], radius: 385 }), cap: `${n.vol} volutes · ${n.tris.toLocaleString('en-US')} tris · boundary ${n.boundary} · regions ${n.regions}` });
}
if (prev.length) rows.push({ head: 'preview, NOT the ruling — the three default frames with the rinceau on every run (the junctions and crest as the vine has them; step 2 wires it)', cells: prev });
await page.evaluate(() => window.__frame.pinCamera(null));

const refs = REFS ? `<h2>Eva's references</h2><div class="row">${fs.readdirSync(REFS).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => `<div class="cell"><img src="data:image/${path.extname(f).slice(1).replace('jpg', 'jpeg')};base64,${fs.readFileSync(path.join(REFS, f)).toString('base64')}"><div class="cap"><b>${f}</b></div></div>`).join('')}</div>` : '<h2>references 1 and 2 — not in the repository: hold the sheet beside them</h2>';
const html = `<!doctype html><meta charset="utf-8"><title>/frame — the rinceau vocabulary</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:10px;flex-wrap:wrap}.cell{width:380px}.cell img{width:100%;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:9.5px}.cap b{color:#EDEDE8;font-weight:400}</style>
<h1>/frame — phase 3f step 1: the rinceau, vocabulary</h1><div>One continuous stem per run waving across the band; at every wave a tendril branches off into the hollow and curls into a carved volute (arris), alternating sides; acanthus sheathes each branch point and laps over the volute's root. Relief view: the STL's own positions under the one fixed light. Nothing here has been printed; the 1.0 mm floor is an assumption. Captions: the Node build of the same params. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${refs}
${rows.map((r) => `<h2>${r.head}</h2><div class="row">${r.cells.map((c) => `<div class="cell"><img src="data:image/png;base64,${c.png}"><div class="cap"><b>${c.label}</b><br>${c.cap}</div></div>`).join('')}</div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-rinceau-sheet.png'), fullPage: true });
await browser.close(); server.close();
console.log(`${rows.reduce((a, r) => a + r.cells.length, 0)} cells → ${OUT}/index.html, frame-rinceau-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
