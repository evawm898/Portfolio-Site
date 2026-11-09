#!/usr/bin/env node
/* shot-cage-door.mjs <dir> --base <worktree> [--png <file>] — the /cage DOOR-PLACEMENT ruling sheet.

   Every case Step 1 diagnosed (tools/cage-door-diagnose.mjs: every preset × round / 4 / 6 / 8 ×
   rect / arch / gothic / ogee, then the size extremes), BEFORE (the base tree's cage-geometry.js,
   imported from the worktree) beside AFTER (this tree's), each drawn as the FRONT HALF of the
   cage's own centrelines (y < 0, the side the door is on — the export's SVG draws the back bars
   through the front, which buries a door in its own back wall), the door frame in petrol, every
   diagnosed defect marked in plum ON the before cell and listed beneath it, and the after cell's
   own diagnosis beneath it (it should read clean). The default cage leads, as the page's own
   3/4 render and front-elevation SVG from both trees.

   Read off the models, never off pixels; no pixel claim anywhere — this sheet is for ruling. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChromium } from './chromium-harness.mjs';
import { diagnose, diagnosticCases } from './cage-door-diagnose.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--base' && args[args.indexOf(a) - 1] !== '--png') || 'cage-door-sheet');
const BASE = args.includes('--base') ? path.resolve(args[args.indexOf('--base') + 1]) : null;
const PNG = args.includes('--png') ? path.resolve(args[args.indexOf('--png') + 1]) : null;
if (!BASE) { console.error('usage: shot-cage-door.mjs <dir> --base <worktree of the base commit> [--png <file>]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const Gnew = await import(pathToFileURL(path.join(ROOT, 'cage-geometry.js')).href);
const Gold = await import(pathToFileURL(path.join(BASE, 'cage-geometry.js')).href);

const INK = '#e9ecec', DIM = '#8b9494', PETROL = '#2fa3a3', PLUM = '#a98cc8', GROUND = '#060707';
/* the front half of the model as an SVG cell, in a window of `win` = [x0, x1, z0, z1] mm */
function cell(r, win, wpx) {
  const m = r.m, [x0, x1, z0, z1] = win, s = wpx / (x1 - x0), hpx = (z1 - z0) * s;
  const X = (x) => ((x - x0) * s).toFixed(1), Z = (z) => ((z1 - z) * s).toFixed(1);
  const out = [];
  const order = ['skirt', 'frame', 'ring', 'bar', 'rib', 'spoke', 'hanger', 'door'];
  for (const w of [...m.wires].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
    const pts = w.closed ? [...w.pts, w.pts[0]] : w.pts;
    let d = '', pen = false;
    for (const q of pts) { if (q[1] <= 0) { d += `${pen ? 'L' : 'M'}${X(q[0])} ${Z(q[2])}`; pen = true; } else pen = false; }
    if (!d) continue;
    const door = w.kind === 'door';
    out.push(`<path d="${d}" stroke="${door ? PETROL : INK}" stroke-opacity="${door ? 1 : w.kind === 'bar' ? 0.75 : 0.9}" stroke-width="${Math.max(0.6, 2 * w.r * s).toFixed(2)}"/>`);
  }
  for (const k of r.marks || []) {
    if (k.type === 'corner') { const cx = Math.cos(k.th), rr = Math.hypot(...m.wires.find((w) => w.kind === 'door').pts[0].slice(0, 2)); out.push(`<path d="M${X(rr * cx / Math.cos(0))} ${Z(k.z0 - 4)}L${X(rr * cx)} ${Z(k.z1 + 4)}" stroke="${PLUM}" stroke-width="2.4" stroke-dasharray="5 3"/>`); }
    if (k.type === 'dot') out.push(`<circle cx="${X(k.p[0])}" cy="${Z(k.p[2])}" r="5" fill="none" stroke="${PLUM}" stroke-width="2"/>`);
    if (k.type === 'bar') { const d = k.pts.filter((q) => q[1] <= 0).map((q, i) => `${i ? 'L' : 'M'}${X(q[0])} ${Z(q[2])}`).join(''); if (d) out.push(`<path d="${d}" stroke="${PLUM}" stroke-width="2.2"/>`); }
    if (k.type === 'ring') out.push(`<path d="M0 ${Z(k.z)}H${wpx}" stroke="${PLUM}" stroke-width="1.6" stroke-dasharray="3 3"/>`);
    if (k.type === 'sill') out.push(`<path d="M${X(-30)} ${Z(k.z)}h12M${X(30)} ${Z(k.z)}h-12" stroke="${PLUM}" stroke-width="2.4"/><text x="4" y="${(+Z(k.z) - 3).toFixed(1)}" fill="${PLUM}" font-size="10">sill floats</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wpx}" height="${hpx.toFixed(0)}" viewBox="0 0 ${wpx} ${hpx.toFixed(1)}"><rect width="100%" height="100%" fill="${GROUND}"/><g fill="none" stroke-linecap="round" stroke-linejoin="round">${out.join('')}</g></svg>`;
}
const winFor = (rs) => {
  // one window per pair: the door of either tree plus a margin, the base ring included
  let a = Infinity, b = -Infinity, top = 0;
  for (const r of rs) { const fr = r.m.wires.find((w) => w.kind === 'door'); if (!fr) continue; for (const q of fr.pts) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); top = Math.max(top, q[2]); } }
  const half = Math.max(Math.abs(a), Math.abs(b)) + 20, zTop = top + 10;
  const w = 2 * half, h = zTop + 6;
  return h > 1.25 * w ? [-h / 2.5, h / 2.5, -6, zTop] : [-half, half, -6, Math.max(zTop, w * 0.8 - 6)];
};
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const short = (i) => esc(i.replace(/ — .*/, ''));

const cases = diagnosticCases(Gnew);
const pairs = [];
let fixed = 0, flagged = 0, afterBad = 0;
for (const c of cases) {
  const before = diagnose(Gold, c.params), after = diagnose(Gnew, c.params);
  if (!before.issues.length) continue;
  flagged++; if (!after.issues.length) fixed++; else afterBad++;
  const win = winFor([before, after]);
  const d0 = before.out, d1 = after.out, dI = after.m.info.door;
  pairs.push({ c, before, after, win,
    capB: `${d0.shape} ${d0.W.toFixed(0)}×${d0.Dh.toFixed(0)} · sill ${d0.z0.toFixed(1)} mm`,
    capA: dI ? `${dI.shape} ${dI.W.toFixed(1)}×${dI.Dh.toFixed(0)} · ${dI.k} gap${dI.k > 1 ? 's' : ''} on a ${dI.centre} · sill ${dI.z0.toFixed(1)} mm${dI.turnDeg ? ` · turned ${dI.turnDeg.toFixed(1)}°` : ''}` : 'no door',
    toldA: after.m.told.filter((t) => /door|turns/.test(t)) });
}
console.log(`${flagged} of ${cases.length} cases flagged on the base; ${fixed} read clean after, ${afterBad} still flagged`);

// the default cage: the page's own render and SVG from both trees
async function pageShots(root, tag) {
  const { chromium } = await import('playwright-core');
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const p = rel.startsWith('/node_modules/') ? path.join(ROOT, rel) : path.join(root, rel);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: findChromium() || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/three@0\.161\.0\//, (r) => { const f = path.join(ROOT, 'node_modules/three', new URL(r.request().url()).pathname.replace(/^\/npm\/three@0\.161\.0\//, '')); r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); });
  await page.goto(`${base}/cage.html`); await page.waitForFunction(() => window.__cage && window.__cage.info());
  await page.addStyleTag({ content: '.cg-panel,.cg-view,.cg-viewtoggle,.cg-header{display:none!important} #svgStage{right:0;padding:24px}' });
  const shots = [];
  for (const [view, f] of [['front', 'front'], ['three', 'three']]) {
    await page.evaluate((v) => { window.__cage.setView(v); document.querySelector('#viewToggle [data-main="render"]').click(); }, view);
    await page.waitForTimeout(400);
    const file = `default-${tag}-${f}.png`; await page.screenshot({ path: path.join(OUT, file), clip: { x: 370, y: 30, width: 540, height: 815 } }); shots.push(file);
  }
  await browser.close(); server.close();
  return shots;
}
const shotsB = await pageShots(BASE, 'before'), shotsA = await pageShots(ROOT, 'after');

const W = 168;
const pairHtml = (q) => `<div class="pair"><div class="lab">${esc(q.c.label)}</div><div class="two"><div>${cell(q.before, q.win, W)}<div class="cap">${esc(q.capB)}</div><ul class="bad">${q.before.issues.map((i) => `<li>${short(i)}</li>`).join('')}</ul></div><div>${cell(q.after, q.win, W)}<div class="cap">${esc(q.capA)}</div>${q.after.issues.length ? `<ul class="bad">${q.after.issues.map((i) => `<li>${short(i)}</li>`).join('')}</ul>` : '<div class="ok">clean</div>'}</div></div></div>`;
const tok = path.relative(OUT, path.join(ROOT, 'tokens.css'));
const html = `<!doctype html><meta charset="utf-8"><title>/cage — door placement</title>
<link rel="stylesheet" href="${tok}">
<style>body{background:var(--color-ground);color:var(--color-ink);font:11px var(--type-mono);margin:0;padding:22px;width:1500px}
h1{font:600 26px var(--type-serif);margin:4px 0}h2{font:500 17px var(--type-serif);margin:20px 0 8px}
.eye{color:var(--color-petrol);letter-spacing:.22em;font-size:11px;text-transform:uppercase}.note{color:var(--color-dim);font-size:12px;line-height:1.55;max-width:1400px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.pair{border:1px solid var(--color-line-strong);padding:6px}.lab{color:var(--color-ink-2);margin-bottom:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:4px}.cap{color:var(--color-dim);font-size:10px;margin-top:3px;line-height:1.35}
.bad{color:var(--color-plum);font-size:10px;margin:3px 0 0;padding-left:12px;line-height:1.35}.ok{color:var(--color-petrol);font-size:10px;margin-top:3px}
.def{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.def img{width:100%;display:block}.def .cap{font-size:11px}</style>
<div class="eye">EM / CAGE</div><h1>Door placement — before and after</h1>
<div class="note">Left of each pair: the base (d0e2ed0). Right: this branch. Each cell is the FRONT HALF of the cage's own centrelines (y &lt; 0), the door frame in petrol, every defect the diagnostic finds marked in plum and listed under it: a polygon CORNER inside the door (dashed), a jamb CUTTING a bar part-way (circled), an uncut bar standing in a SLIVER beside a jamb, a ring GRAZING the head or a shoulder / banded ring CROSSED (dashed rule), a SILL floating above every ring. ${flagged} of ${cases.length} cases were flagged on the base; ${fixed} read clean after${afterBad ? `, ${afterBad} still flagged` : ''}. The 4- and 8-sided cells look turned: the lattice turns so a FACE is the front.</div>
<h2>The default cage (the bell) — the page's own front view and 3/4 render</h2>
<div class="def"><div><img src="${shotsB[0]}"><div class="cap">before · front</div></div><div><img src="${shotsA[0]}"><div class="cap">after · front</div></div><div><img src="${shotsB[1]}"><div class="cap">before · 3/4</div></div><div><img src="${shotsA[1]}"><div class="cap">after · 3/4</div></div></div>
<h2>Every preset × cross-section × door shape</h2>
<div class="grid">${pairs.filter((q) => q.c.group === 'matrix').map(pairHtml).join('')}</div>
<h2>The extremes</h2>
<div class="grid">${pairs.filter((q) => q.c.group === 'extreme').map(pairHtml).join('')}</div>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
if (PNG) {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: findChromium() || '/opt/pw-browsers/chromium' });
  const pg = await browser.newPage({ viewport: { width: 1544, height: 1000 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.join(OUT, 'index.html')); await pg.waitForTimeout(500);
  await pg.screenshot({ path: PNG, fullPage: true }); await browser.close();
  console.log('wrote', PNG);
}
console.log('sheet:', path.join(OUT, 'index.html'));
