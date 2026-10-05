#!/usr/bin/env node
/* shot-bug-follow-up.mjs <dir> --base <worktree> — the contact sheet for
   bug-project-design-doc.md §15: the two library blends that found builder
   defects, BEFORE (the base tree's own code, served from its own worktree and
   imported from it) and AFTER (this tree), each as the SVG export and the real
   page's 3D view at 3/4; the #20/#31 hindwing root as a close-up (SVG cropped
   to the root, 3D looking at it); then the wing-shape gallery before and after
   the merges (#22 into #4, #19 into #10). The fixtures are the gate's own
   (tools/bug-fixtures.mjs). No pixel claim: every number is read off the model
   each tree built. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { rootUnderFloor, pitchedBeadHoles } from './bug-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OUT = path.resolve(args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || 'bug-follow-up');
const BASE = opt('--base') && path.resolve(opt('--base'));
if (!BASE || !fs.existsSync(path.join(BASE, 'bug-geometry.js'))) throw new Error('--base <worktree of the base commit> is required');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const serve = async (dir) => {
  const s = http.createServer((req, res) => {
    const p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  return { s, url: `http://127.0.0.1:${s.address().port}` };
};
const exe = fs.readdirSync('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`).find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

// world-chord bead ratio (the gate's E1 measure) and the floor read-out, off a built model
function readModel(G, m) {
  const P = m.positions, V3 = (v) => [P[3 * v], P[3 * v + 1], P[3 * v + 2]];
  let worst = 0, over = 0;
  for (const part of m.parts.filter((q) => /^wing\d$/.test(q.kind) && q.side === 'R')) {
    const B = part.meta.bead; if (!B) continue;
    for (const r of B.rings) {
      const top = V3(r.ids[0]), bot = V3(r.ids[B.K]), M = top.map((x, d) => (x + bot[d]) / 2);
      const Vn = Math.hypot(...top.map((x, d) => x - M[d])), Dn = Math.hypot(...V3(r.ids[B.K / 2]).map((x, d) => x - M[d]));
      worst = Math.max(worst, Dn / Vn); if (Dn > Vn * (1 + 1e-9) + 1e-12) over++;
    }
  }
  const hind = m.parts.find((q) => q.kind === `wing${m.params.wingPairs}` && q.side === 'R');
  const poly = hind.meta.root ? hind.meta.planform : hind.meta.planform.slice(1, -1);
  const depth = G.thinAnalysis(poly, m.params.minDiameter, { ignoreXBelow: hind.meta.root ? 0 : -Infinity }).maxDepth;
  let stl = 'exports';
  try { G.exportStl(m); } catch (e) { stl = e instanceof G.FloorError ? 'REFUSED' : `threw: ${e.message}`; }
  return { worst, over, depth, stl, viol: m.floorViolations.map((v) => `pair ${v.pair + 1} ${v.kind}`).join(', ') || 'none', tris: m.indices.length / 3 };
}

async function shootTree(dir, label) {
  const G = await import(pathToFileURL(path.join(dir, 'bug-geometry.js')).href + `?${label}`);
  const { s, url } = await serve(dir);
  const page = await browser.newPage({ viewport: { width: 760, height: 560 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
  });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`${url}/bug.html`);
  await page.waitForFunction(() => !!window.__bug);
  // the gallery: every library shape's two posed outlines (true planform, the
  // hindwing at its length ratio) and their mirror, drawn from the tree's own data
  const lib = G.WING_LIBRARY, nShapes = lib.length;
  const HL = { 4: '#b3261e', 22: '#b3261e', 10: '#1f5fbf', 19: '#1f5fbf' };
  const wingPath = (w, L, dy, sx) => { const pw = G.posedWing(w); return 'M' + G.sampleOutline(pw.points).map(([u, v]) => `${(sx * (6 + u * L)).toFixed(2)} ${(dy - v * L * pw.stretch).toFixed(2)}`).join('L') + 'Z'; };
  const gallery = lib.map((sh) => { const Lf = 40, Lh = 40 * sh.hind.lengthRatio;
    const paths = [1, -1].map((sx) => `<path d="${wingPath(sh.fore, Lf, -2, sx)}"/><path d="${wingPath(sh.hind, Lh, 6, sx)}"/>`).join('');
    return `<div class="gc" style="${HL[sh.id] ? `outline:3px solid ${HL[sh.id]}` : ''}"><svg viewBox="-62 -30 124 82" width="100%">${paths}<rect x="-3" y="-8" width="6" height="22" rx="3"/></svg><div>#${sh.id}</div></div>`; }).join('');
  await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });
  const out = { gallery, nShapes, cases: [] };
  for (const [name, fx, closeup] of [['#20/#31 at 0.62 — hindwing root under the floor', rootUnderFloor, true], ['#55/#27 at 0.37 — pitched, HOLES', pitchedBeadHoles, false]]) {
    const p = fx(), m = G.buildBug(p), ex = G.exportSvg(m), fr = ex.frame, info = readModel(G, m);
    const svgFull = ex.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, '');
    const H = G.wingHinges(m.params, m.layout), hk = H[m.params.wingPairs - 1].hinge;
    let svgRoot = null;
    if (closeup) {   // the last pair's root, world x hinge-2 .. hinge+8, y hinge+4 .. hinge-6
      const [X0, Y0] = G.svgFromWorld(fr, hk[0] - 2, hk[1] + 4), [X1, Y1] = G.svgFromWorld(fr, hk[0] + 8, hk[1] - 6);
      svgRoot = svgFull.replace(/viewBox="[^"]*"/, `viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}"`);
    }
    await page.evaluate((q) => window.__bug.setParams(q), p);
    await page.evaluate(() => window.__bug.flushBuild());
    await page.evaluate(() => window.__bug.setView('three'));
    await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [hk[0] + 6, hk[1] - 6, 0], d: [0.55, -0.75, 0.95], dist: 95 });
    const img = (await page.screenshot({ type: 'png' })).toString('base64');
    let imgRoot = null;
    if (closeup) {
      await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [hk[0] + 2, hk[1] - 1, hk[2]], d: [0.55, -0.75, 0.95], dist: 16 });
      imgRoot = (await page.screenshot({ type: 'png' })).toString('base64');
    }
    out.cases.push({ name, svgFull, svgRoot, img, imgRoot, info });
  }
  await page.close(); s.close();
  return out;
}

const before = await shootTree(BASE, 'before');
const after = await shootTree(ROOT, 'after');
const cap = (c, closeup) => closeup
  ? `hindwing root: ${c.info.depth.toFixed(2)} mm past the floor disc by the BUILDER (bar 0.50) · floor violations: ${c.info.viol} · STL <b>${c.info.stl}</b>`
  : `worst bead, world chord / half-thickness: <b>${c.info.worst.toFixed(5)}</b> · ${c.info.over} bead(s) over a half-round · STL ${c.info.stl} · ${c.info.tris.toLocaleString()} tris`;
const block = (k) => {
  const closeup = k === 0, b = before.cases[k], a = after.cases[k];
  const col = (c, t) => `<div class="c"><div class="k">${t}</div>${c.svgFull}<img src="data:image/png;base64,${c.img}">${closeup ? `<div class="k2">root close-up</div>${c.svgRoot}<img src="data:image/png;base64,${c.imgRoot}">` : ''}<div>${cap(c, closeup)}</div></div>`;
  return `<h2>${b.name}</h2><div class="g2">${col(b, 'BEFORE — main')}${col(a, 'AFTER — this branch')}</div>`;
};
const html = `<!doctype html><meta charset="utf-8"><title>bug — follow-up: draws, floor, beads, merges</title><style>
body{margin:0;background:#f4f3ee;color:#111;font:12px/1.4 ui-monospace,monospace;padding:16px;width:1560px}
h1{font-size:17px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 6px} .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.c{background:#fff;border:1px solid #ccc;padding:8px} .c img{width:100%;display:block;margin-top:4px} .c svg{display:block;background:#fff;max-height:520px}
.k{font-size:14px;font-weight:bold} .gg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px} .gc{text-align:center;padding:2px} .gc svg{fill:#1d1710} .k2{font-weight:bold;margin-top:8px}
</style><h1>/bug follow-up — the two defect blends before / after, and the gallery after the merges</h1>
<div>Each blend is the gate's fixture (tools/bug-fixtures.mjs), built by each tree's own code. SVG export, then the page's 3D view at 3/4.
The bead change is ~1% of a 0.5 mm radius (≈ 5 µm) — not visible at this scale; the number under each column is the measurement.</div>
${block(0)}${block(1)}
<h2>Wing-shape gallery — before (${before.nShapes} shapes) / after the merges (${after.nShapes} shapes: #22 → #4, #19 → #10)</h2>
<div>Red: #4 and #22 (merged into #4). Blue: #10 and #19 (merged into #10). #57 is kept (§14.5). Drawn from each tree's own library data: each wing posed at the angle it was found at, true planform, the hindwing at its length ratio.</div>
<div class="g2"><div class="c"><div class="k">BEFORE — main</div><div class="gg">${before.gallery}</div></div><div class="c"><div class="k">AFTER — this branch</div><div class="gg">${after.gallery}</div></div></div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sh = await browser.newPage({ viewport: { width: 1592, height: 900 } });
await sh.goto('file://' + path.join(OUT, 'index.html'));
await sh.screenshot({ path: path.join(OUT, 'bug-follow-up.png'), fullPage: true });
await browser.close();
for (const [t, r] of [['before', before], ['after', after]]) for (const c of r.cases) console.log(t, c.name, JSON.stringify(c.info));
console.log(`gallery: ${before.nShapes} -> ${after.nShapes}`);
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
if (errors.length) process.exit(1);
