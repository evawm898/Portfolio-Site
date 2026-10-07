#!/usr/bin/env node
/* shot-bug-junction.mjs <dir> --base <worktree> — the contact sheet for
   bug-project-design-doc.md §16, the wing–body JUNCTION BLEND.

   BEFORE is the base tree's own code (served from its worktree and imported
   from it), AFTER is this tree. For each case: the SVG export (the top-down
   projection of the model), two crops of it where the junction is — the
   forewing's leading edge by the head and the hindwing's inner edge by the
   abdomen — and the real page's 3D view, at 3/4 and close on the thorax.
     1. the default bug, before / after;
     2. the radius ladder on the default bug (this tree only), the default marked;
     3. six library shapes before / after: the most swept (#31, #40), the
        narrowest root with the blend off (#48), the deepest slots (#18, #39)
        and the narrowest neck with the blend on (#55);
     4. one hand-drawn wing (HAND_OUTLINES.falcate as the forewing) and one
        blend (the #20/#31 fixture, whose hindwing root the base refuses).
   Every number under a panel is read off the model that tree built, by
   tools/bug-junction-measure.mjs — the gate's own JB1-JB3 measures — so a
   number here is the gate's number for that tree. No pixel claim anywhere.
   Click any panel to see it full size. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { HAND_OUTLINES, rootUnderFloor } from './bug-fixtures.mjs';
import { makeJunctionMeasures } from './bug-junction-measure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OUT = path.resolve(args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || 'bug-junction');
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

const LIB = [[31, 'the most swept (hindwing 72°)'], [40, 'swept (hindwing 66°), a 3.5 mm slot'], [48, 'the narrowest root with the blend off'], [18, 'the deepest slot'], [39, 'a 3.3 mm slot'], [55, 'the narrowest neck with the blend on']];
const LADDER = [0, 0.5, 1, 1.5, 2, 3];
const SLOT_GAP = 1.5;          // the stated minimum gap at the default radius (JB1 at r = 1)

// what the sheet prints under a panel, read off a built model
function readModel(G, JM, m) {
  const sl = JM.slotScan(m, SLOT_GAP), nk = JM.neckScan(m), bu = JM.buriedScan(m);
  let stl = 'exports';
  try { G.exportStl(m); } catch (e) { stl = e instanceof G.FloorError ? 'REFUSED' : `threw: ${e.message.slice(0, 60)}`; }
  // how far down the abdomen the last pair's outline joins the body (its
  // contour within 0.05 mm of, or inside, the body's)
  const bv = JM.bodyView(m), L = m.layout, hind = m.parts.find((q) => q.kind === `wing${m.params.wingPairs}` && q.side === 'R');
  let yLow = Infinity;
  if (hind) for (const l of G.contourLoops(m, hind)) for (const [x, y] of l) if (bv.sd(x, y) < 0.05) yLow = Math.min(yLow, y);
  const ab0 = L.yA0 ?? null, ab1 = L.yA1 ?? null;
  const joined = Number.isFinite(yLow) && ab0 !== null ? Math.max(0, ab0 - Math.max(yLow, ab1)) : null;
  return {
    slot: sl.depth, necks: nk.map((q) => q.neck), exposed: bu.reduce((a, q) => a + q.exposed + (q.thinOver || 0), 0),   // JB3's failures, both arms judged: bu.reduce((a, q) => a + q.judged, 0),
    stl, tris: m.indices.length / 3, notes: m.notes.slice(), joined, abdomen: ab0 !== null ? ab0 - ab1 : null,
  };
}

async function treeShooter(dir, label) {
  const G = await import(pathToFileURL(path.join(dir, 'bug-geometry.js')).href + `?${label}`);
  const JM = makeJunctionMeasures(G);
  const { s, url } = await serve(dir);
  const page = await browser.newPage({ viewport: { width: 900, height: 680 }, deviceScaleFactor: 1.5 });
  page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
  await page.route('**cdn.jsdelivr.net/**', (route) => {
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
    try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
  });
  await page.route('**fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**fonts.gstatic.com/**', (r) => r.abort());
  await page.goto(`${url}/bug.html`);
  await page.waitForFunction(() => !!window.__bug);
  // the wings panel with the new slider (this tree), before the chrome is hidden
  let panel = null;
  if (label === 'after') {
    const row = await page.$('#wingJunction');
    if (row) { await row.scrollIntoViewIfNeeded(); const sec = await row.evaluateHandle((e) => e.closest('details') || e.parentElement.parentElement); panel = (await sec.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'); }
  }
  await page.addStyleTag({ content: '.bg-panel,.bg-view,.bg-header,.bg-edbar,.bg-viewtoggle{visibility:hidden!important}' });
  const shoot = async (p) => {
    const m = G.buildBug(p), ex = G.exportSvg(m), fr = ex.frame, info = readModel(G, JM, m);
    const svgFull = ex.svg.replace(/<\?xml[^>]*>/, '').replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, '');
    const L = m.layout, H = G.wingHinges(m.params, m.layout), h0 = H[0].hinge, hk = H[H.length - 1].hinge;
    const crop = (x0, y0, x1, y1) => { const [X0, Y0] = G.svgFromWorld(fr, x0, y0), [X1, Y1] = G.svgFromWorld(fr, x1, y1); return svgFull.replace(/viewBox="[^"]*"/, `viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}"`); };
    // (a) the forewing's leading edge by the head; (b) the hindwing's inner edge by the abdomen
    const svgHead = crop(-1.2, L.yMax + 0.8, 5.8, h0[1] - 3.5);
    const svgAbd = crop(-1.2, hk[1] + 1.5, 6.8, hk[1] - 12);
    await page.evaluate((q) => window.__bug.setParams(q), p);
    await page.evaluate(() => window.__bug.flushBuild());
    await page.evaluate(() => window.__bug.setView('three'));
    const cy = (h0[1] + hk[1]) / 2;
    await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [6, cy - 4, 0], d: [0.55, -0.75, 0.95], dist: 105 });
    const img = (await page.screenshot({ type: 'jpeg', quality: 88 })).toString('base64');
    await page.evaluate((c) => window.__bug.lookAt(c.t, c.d, c.dist), { t: [1.2, cy - 0.5, 0.3], d: [0.5, -0.45, 1.0], dist: 15 });
    const imgClose = (await page.screenshot({ type: 'jpeg', quality: 88 })).toString('base64');
    return { svgFull, svgHead, svgAbd, img, imgClose, info };
  };
  return { G, shoot, panel, close: async () => { await page.close(); s.close(); } };
}

const B = await treeShooter(BASE, 'before'), A = await treeShooter(ROOT, 'after');
const defP = (G, extra = {}) => ({ ...G.defaultParams(), ...extra });
const libP = (G, id) => G.applyWingShape(G.defaultParams(), G.WING_LIBRARY.find((s) => s.id === id));
const handP = (G) => { const p = G.defaultParams(); p.wings.first.points = HAND_OUTLINES.falcate.map((q) => q.slice()); return p; };
const out = { def: null, ladder: [], lib: [], hand: null, blend: null };
out.def = { b: await B.shoot(defP(B.G)), a: await A.shoot(defP(A.G)) };
for (const r of LADDER) out.ladder.push({ r, a: await A.shoot(defP(A.G, { wingJunction: r })) });
for (const [id, why] of LIB) out.lib.push({ id, why, b: await B.shoot(libP(B.G, id)), a: await A.shoot(libP(A.G, id)) });
out.hand = { b: await B.shoot(handP(B.G)), a: await A.shoot(handP(A.G)) };
out.blend = { b: await B.shoot(rootUnderFloor()), a: await A.shoot({ ...rootUnderFloor(), wingJunction: A.G.JUNCTION_DEFAULT_MM }) };
const panel = A.panel;
await B.close(); await A.close();

const f2 = (v) => (v == null ? '—' : v.toFixed(2));
const cap = (c) => {
  const i = c.info;
  return `slot (gaps under ${SLOT_GAP} mm) <b>${f2(i.slot)} mm</b> deep · necks <b>${i.necks.map(f2).join(' / ')}</b> mm` +
    ` · buried part showing: <b>${i.exposed}</b> of ${i.judged} vertices` +
    (i.joined != null ? ` · last pair joins the abdomen for ${f2(i.joined)} of ${f2(i.abdomen)} mm` : '') +
    ` · ${i.tris.toLocaleString()} tris · STL <b>${i.stl}</b>${i.notes.length ? `<br><i>${i.notes.join('<br>')}</i>` : ''}`;
};
const pane = (inner, k) => `<div class="pane" data-k="${k}">${inner}</div>`;
const col = (c, t) => `<div class="c"><div class="k">${t}</div><div class="row2">${pane(c.svgFull, 'top view (SVG export)')}${pane(`<img src="data:image/jpeg;base64,${c.img}">`, '3D, 3/4')}</div>` +
  `<div class="row3">${pane(c.svgHead, '(a) forewing leading edge by the head')}${pane(c.svgAbd, '(b) hindwing inner edge by the abdomen')}${pane(`<img src="data:image/jpeg;base64,${c.imgClose}">`, '3D, close on the thorax')}</div><div class="cap">${cap(c)}</div></div>`;
const pair = (title, b, a, note = '') => `<h2>${title}</h2>${note ? `<div class="note">${note}</div>` : ''}<div class="g2">${col(b, 'BEFORE — main')}${col(a, 'AFTER — this branch')}</div>`;
const ladder = out.ladder.map(({ r, a }) => `<div class="c${r === A.G.JUNCTION_DEFAULT_MM ? ' def' : ''}"><div class="k">${r === 0 ? 'blend OFF (0)' : `${r.toFixed(2)} mm`}${r === A.G.JUNCTION_DEFAULT_MM ? ' — THE DEFAULT' : ''}</div>` +
  `${pane(a.svgHead, `r ${r}: (a) head`)}${pane(a.svgAbd, `r ${r}: (b) abdomen`)}${pane(`<img src="data:image/jpeg;base64,${a.imgClose}">`, `r ${r}: 3D`)}<div class="cap">${cap(a)}</div></div>`).join('');

const html = `<!doctype html><meta charset="utf-8"><title>bug — the wing–body junction blend</title><style>
body{margin:0;background:#f4f3ee;color:#111;font:13px/1.45 ui-monospace,monospace;padding:18px;max-width:2000px}
h1{font-size:19px;margin:0 0 6px} h2{font-size:16px;margin:26px 0 6px} .note{margin:0 0 6px;max-width:1400px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px} .c{background:#fff;border:1px solid #ccc;padding:8px}
.c.def{outline:4px solid #1f6f3f} .k{font-size:15px;font-weight:bold;margin-bottom:4px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px} .row2{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}
.pane{cursor:zoom-in;border:1px solid #e3e1d8;background:#fff;position:relative} .pane svg,.pane img{display:block;width:100%;height:auto;max-height:560px}
.pane::after{content:attr(data-k);position:absolute;left:4px;top:2px;font-size:11px;color:#555;background:rgba(255,255,255,.8);padding:0 3px}
.cap{margin-top:4px} .lad{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
#zoom{display:none;position:fixed;inset:0;background:rgba(20,20,20,.92);overflow:auto;z-index:9;cursor:zoom-out}
#zoom .in{background:#fff;margin:20px auto;width:min(1800px,96vw)} #zoom .in svg,#zoom .in img{width:100%;height:auto;display:block}
#zoom .t{color:#fff;font-size:14px;padding:10px 20px}
</style>
<h1>/bug — the wing–body junction blend (design doc §16): before / after</h1>
<div class="note">BEFORE is main's code, AFTER this branch, each building the same parameters. Under every panel: JB1's slot depth (the empty space between a wing and the body narrower than ${SLOT_GAP} mm — the minimum gap stated at the default radius), JB2's neck per right wing (the narrowest place it hangs from the body, top-down; the gate's bar is 1.5 floors), JB3's count of buried wing vertices that show outside the body's solid (the plate), how far down the abdomen the last pair joins it, and whether the STL exports. The measures are the gate's own (tools/bug-junction-measure.mjs) run on each tree's model. Click any panel to see it full size.</div>
${pair('1. The default bug', out.def.b, out.def.a, 'The two places Eva marked: (a) the wedge between the forewing\'s leading edge and the head/thorax; (b) the slot between the hindwing\'s inner edge and the abdomen. 3D close-up: the buried root tabs show as a flat plate on the thorax before.')}
<h2>2. The radius ladder on the default bug (this branch), the default marked</h2>
<div class="note">The closing fills every gap between a wing and the body narrower than about 2r and rounds the concave corners where they meet with radius r. 1.0 mm is the smallest radius at which no 1.5 mm slot is left on any library shape or the #20/#31 fixture (0.5 leaves that fixture a 4.3 mm slot); larger radii run the hindwing further down the abdomen (the number under each panel) and the wings start to read as one mass with the body.</div>
<div class="lad">${ladder}</div>
${out.lib.map((L) => pair(`3. Library #${L.id} — ${L.why}`, L.b, L.a)).join('')}
${pair('4a. A hand-drawn forewing (HAND_OUTLINES.falcate)', out.hand.b, out.hand.a)}
${pair('4b. A blend: #20/#31 at 0.62, three pairs (the gate\'s fixture)', out.blend.b, out.blend.a, 'The base refuses this STL: the hindwing hangs from a drawn root chord narrower than the floor. With the blend the root is the closing\'s, and the same blend exports.')}
${panel ? `<h2>The control</h2><div class="c" style="max-width:520px"><img src="data:image/jpeg;base64,${panel}" style="width:100%"></div>` : ''}
<div id="zoom"><div class="t"></div><div class="in"></div></div>
<script>
const z = document.getElementById('zoom');
document.querySelectorAll('.pane').forEach((p) => p.addEventListener('click', () => { z.querySelector('.in').innerHTML = p.innerHTML; z.querySelector('.t').textContent = p.dataset.k + ' — click or Esc to close'; z.style.display = 'block'; }));
z.addEventListener('click', () => { z.style.display = 'none'; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') z.style.display = 'none'; });
</script>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const line = (t, c) => console.log(`${t.padEnd(34)} slot ${f2(c.info.slot)} necks ${c.info.necks.map(f2).join('/')} showing ${c.info.exposed}/${c.info.judged} joined ${f2(c.info.joined)} tris ${c.info.tris} STL ${c.info.stl}${c.info.notes.length ? ' notes: ' + c.info.notes.join(' | ') : ''}`);
line('default before', out.def.b); line('default after', out.def.a);
for (const L of out.ladder) line(`ladder r ${L.r}`, L.a);
for (const L of out.lib) { line(`#${L.id} before`, L.b); line(`#${L.id} after`, L.a); }
line('hand before', out.hand.b); line('hand after', out.hand.a); line('blend before', out.blend.b); line('blend after', out.blend.a);
console.log(`wrote ${path.join(OUT, 'index.html')} (${(fs.statSync(path.join(OUT, 'index.html')).size / 1e6).toFixed(1)} MB)`);
await browser.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
if (errors.length) process.exit(1);
