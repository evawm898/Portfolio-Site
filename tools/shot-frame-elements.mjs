#!/usr/bin/env node
/* shot-frame-elements.mjs <dir> [--refs <dir>] [--base <worktree>] [--only <re>]
   — phase 3e step 2's contact sheet: each PLACED ELEMENT (the shell, the
   palmette with its boss, the rose, the rosette, the bud in its leaf cup)
   standing alone on a flat base in print mm, drawn by the page's OWN
   viewer (frame-view3d.js, the one fixed light) front-on and at a grazing
   light, each beside its reference crop (--refs names a directory holding
   shell.png, palmette.png, rose.png, rosette.png, bud.png — the crops are
   not in the repository) and beside the BEFORE: the same element built by
   a worktree of the base commit (--base), where the base tree has one
   (the chains' palmette and rosette of phase 3d, drawn as they stand on the
   default arch's crest and springing). No pixel claim anywhere: for ruling
   by eye. Every caption carries the element's own measured numbers from
   the gate's instruments: triangles, boundary edges, regions, height,
   thinnest crown. Writes <dir>/index.html and <dir>/frame-elements-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'frame-elements-sheet');
const opt = (k) => (args.indexOf(k) > 0 || args.indexOf(k) === 0 ? args[args.indexOf(k) + 1] : null);
const REFS = opt('--refs') ? path.resolve(opt('--refs')) : null, BASE = opt('--base') ? path.resolve(opt('--base')) : null, ONLY = opt('--only') ? new RegExp(opt('--only')) : null;
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/"}}</script>
<style>html,body{margin:0;background:#0a0a0c}canvas{width:480px;height:480px;display:block}</style><canvas id="c"></canvas>
<script type="module">
import { createViewer } from './frame-view3d.js';
const v = createViewer(document.getElementById('c'));
window.__el = { show: (mesh, cam) => { v.resize(); v.setMesh(mesh); v.frame(cam); v.render(); }, ink: () => v.ink() };
</script>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__elements.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});
await page.goto(`${base}/__elements.html`);
await page.waitForFunction(() => !!window.__el);

const EL = await import(pathToFileURL(path.join(ROOT, 'frame-elements.js')).href);
const RL = await import(pathToFileURL(path.join(ROOT, 'frame-relief.js')).href);
const FRONT = { dir: [0.15, 0.2, 1] }, GRAZE = { dir: [0.95, 0.35, 0.3] };
const KINDS = ['shell', 'palmette', 'rose', 'rosette', 'bud'].filter((k) => !ONLY || ONLY.test(k));
const LETTER = { shell: 'a', palmette: 'b', rose: 'c', rosette: 'd', bud: 'e' };

async function shoot(mesh, cam) {
  const radius = Math.max(...[0, 1].map((a) => { let lo = Infinity, hi = -Infinity; for (let i = a; i < mesh.positions.length; i += 3) { lo = Math.min(lo, mesh.positions[i]); hi = Math.max(hi, mesh.positions[i]); } return hi - lo; })) * 1.35 / Math.tan(15 * Math.PI / 180) / 2;
  await page.evaluate(({ m, cam }) => window.__el.show({ positions: m.p, indices: m.i }, cam), { m: { p: Array.from(mesh.positions), i: Array.from(mesh.indices) }, cam: { ...cam, radius } });
  let png = null, prev = null;
  for (let i = 0; i < 6; i++) { png = await page.screenshot({ type: 'png' }); if (prev && prev.equals(png)) break; prev = png; await page.waitForTimeout(100); }
  return png.toString('base64');
}
const numbers = (mesh) => { const a = RL.analyzeStl(RL.exportStl(mesh)), c = RL.connected(mesh); return `${a.triangles} tris · boundary ${a.boundary} · ${c.comps} region${c.comps === 1 ? '' : 's'} (${c.cell} mm) · ${mesh.info.heightMm.toFixed(2)} mm high`; };

// BEFORE: the base tree's chain motifs, cut out of the default arch's relief
// at the crest (the palmette) and the right springing (the rosette)
let before = {};
if (BASE) {
  const G0 = await import(pathToFileURL(path.join(BASE, 'frame-geometry.js')).href), FL0 = await import(pathToFileURL(path.join(BASE, 'frame-filigree.js')).href), RL0 = await import(pathToFileURL(path.join(BASE, 'frame-relief.js')).href);
  const m0 = FL0.withOrnament(G0.buildFrame({ filigree: 'scrolls' })), r0 = RL0.buildRelief(m0);
  const cut = (centre, half) => { const P = r0.positions, I = r0.indices, keep = new Map(), pos = [], idx = []; for (let t = 0; t < I.length; t += 3) { const v = [I[t], I[t + 1], I[t + 2]]; if (!v.every((k) => Math.abs(P[3 * k] - centre[0]) < half && Math.abs(P[3 * k + 1] - centre[1]) < half)) continue; for (const k of v) { if (!keep.has(k)) { keep.set(k, pos.length / 3); pos.push(P[3 * k] - centre[0], P[3 * k + 1] - centre[1], P[3 * k + 2]); } idx.push(keep.get(k)); } } return { positions: Float64Array.from(pos), indices: Uint32Array.from(idx), info: { heightMm: Math.max(...pos.filter((_, i) => i % 3 === 2)) } }; };
  const s = r0.scale, A = m0.info.anchors;
  before = { palmette: cut([0, A.apex.pt[1] * s], 22), rosette: cut([A.springR.pt[0] * s, A.springR.pt[1] * s], 18) };
}

const cells = [];
for (const k of KINDS) {
  const mesh = EL.buildElement(k, { base: true }), num = numbers(EL.buildElement(k));
  const ref = REFS && fs.existsSync(path.join(REFS, k + '.png')) ? fs.readFileSync(path.join(REFS, k + '.png')).toString('base64') : null;
  cells.push({ kind: k, ref, before: before[k] ? await shoot(before[k], FRONT) : null, after: await shoot(mesh, FRONT), graze: await shoot(mesh, GRAZE), num, info: mesh.info });
}
await browser.close(); server.close();

const html = `<!doctype html><meta charset="utf-8"><title>/frame — phase 3e, step 2: the placed elements</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:11px/1.5 "Space Mono",monospace;margin:20px}h1{font:600 22px "Playfair Display",serif;margin:0 0 4px}h2{font:400 11px monospace;letter-spacing:.18em;text-transform:uppercase;color:#5FA0A0;margin:22px 0 8px}.row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}.cell{width:240px}.cell img{width:240px;display:block;background:#0A0A0C;border:1px solid rgba(237,237,232,.22)}.cap{color:#8A8A85;margin-top:4px;font-size:10px}.cap b{color:#EDEDE8;font-weight:400}.none{width:240px;height:240px;border:1px dashed rgba(237,237,232,.22);display:flex;align-items:center;justify-content:center;color:#5a5a58;text-align:center;padding:10px;box-sizing:border-box}</style>
<h1>/frame — phase 3e, step 2: the placed elements, refined</h1><div>each element alone on a flat base, print mm, the page's own viewer under the one fixed light: the reference crop, the BEFORE (${BASE ? 'the chain motif of the base tree, cut from the default arch — (b) and (d) only; (a), (c), (e) had prototypes on no branch' : 'none — no --base given'}), the AFTER front-on and at a grazing light. Nothing here has been printed; the 1.0 mm floor is an assumption. ${errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors'}</div>
${cells.map((c) => `<h2>(${LETTER[c.kind]}) ${c.kind}</h2><div class="row">
<div class="cell">${c.ref ? `<img src="data:image/png;base64,${c.ref}">` : '<div class="none">reference crop<br>(not in the repository: pass --refs)</div>'}<div class="cap"><b>reference</b></div></div>
<div class="cell">${c.before ? `<img src="data:image/png;base64,${c.before}">` : '<div class="none">no before: the prototype was on no branch</div>'}<div class="cap"><b>before</b>${c.before ? ' · the phase-3d chain motif' : ''}</div></div>
<div class="cell"><img src="data:image/png;base64,${c.after}"><div class="cap"><b>after, front-on</b><br>${c.num}</div></div>
<div class="cell"><img src="data:image/png;base64,${c.graze}"><div class="cap"><b>after, grazing light</b></div></div></div>`).join('')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const b2 = await chromium.launch({ executablePath: exe });
const sheet = await b2.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(`file://${path.join(OUT, 'index.html')}`);
await sheet.screenshot({ path: path.join(OUT, 'frame-elements-sheet.png'), fullPage: true });
await b2.close();
console.log(`${cells.length} elements → ${OUT}/index.html, frame-elements-sheet.png${errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''}`);
for (const c of cells) console.log(`  (${LETTER[c.kind]}) ${c.kind.padEnd(10)} ${c.num}`);
