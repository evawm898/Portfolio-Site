#!/usr/bin/env node
/* shot-bug-elegance.mjs <dir> [--only=<section>[,..]] — the contact sheet for the
   /bug ELEGANCE PASS (bug-project-design-doc.md §9).

   Every cell is driven through the real page (bug.html) and shows the EXPORTED
   SVG itself (the top-down projection of the 3D model) beside the 3D canvas at
   3/4. Sections:
     old    the OLD default (legacyDefaultParams(): the new controls at their old
            ends — measured bit-identical to main's default) beside the NEW one;
     ven    the new default in HOLES and in RIDGES;
     ctl    each new control at BOTH ends of its range on the new default (the
            edge cells add a close-up along the wing so the thickness reads);
     pose   SET SPECIMEN, a REAL click of the page's button on a bug that is not
            posed (before / after);
     range  a moth-like and a dragonfly-like bug built from the new default by
            SLIDERS ONLY (no outline edited, no preset);
   plus the body : wingspan ratio of the new default, measured off the model.
   Eva's lace reference is not in the repository; the sheet asks to be held
   beside it. No pixel claim is made anywhere: the sheet is for ruling by eye.

   Writes <dir>/index.html (self-contained) and <dir>/bug-elegance-sheet.png. */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import * as G from '../bug-geometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'bug-elegance-sheet');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : null;
const want = (k) => !ONLY || ONLY.includes(k);
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.161.0/', '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); } catch { route.abort(); }
});
await page.route('**fonts.googleapis.com/**', (r) => r.abort());
await page.route('**fonts.gstatic.com/**', (r) => r.abort());
await page.goto(`${base}/bug.html`);
await page.waitForFunction(() => !!window.__bug);
const HIDE = '.bg-panel,.bg-view,.bg-header,.bg-editor{visibility:hidden!important}';
const hide = await page.addStyleTag({ content: HIDE });
const show = (css) => hide.evaluate((n, c) => { n.textContent = c; }, css);

const D = () => G.defaultParams();
const set = (fn) => { const p = D(); fn(p); return p; };

/* the body : wingspan ratio, read off the MODEL: body length = the body part's
   y extent (head front to abdomen tip); wingspan = the x extent of the wing
   parts (tip to tip, top-down) */
function proportions(params) {
  const m = G.buildBug(params), P = m.positions;
  const ext = (pred, k) => { let a = Infinity, b = -Infinity; for (const q of m.parts.filter(pred)) for (let v = q.v0; v < q.v1; v++) { a = Math.min(a, P[3 * v + k]); b = Math.max(b, P[3 * v + k]); } return b - a; };
  const body = ext((q) => q.kind === 'body', 1), span = ext((q) => /^wing\d$/.test(q.kind), 0);
  const bodyW = ext((q) => q.kind === 'body', 0);
  return { body, span, bodyW, ratio: span / body };
}

const out = [];
async function shoot(label, sec, params, extra = {}) {
  if (params) await page.evaluate((p) => window.__bug.setParams(p), params);
  await page.evaluate(() => window.__bug.flushBuild());
  await page.evaluate(() => window.__bug.setView('three'));
  const png = (await page.screenshot({ type: 'png' })).toString('base64');
  let close = null;
  if (extra.closeUp) {
    await page.evaluate((c) => window.__bug.lookAt(c.target, c.dir, c.dist), extra.closeUp);
    close = (await page.screenshot({ type: 'png' })).toString('base64');
  }
  const svg = await page.evaluate(() => window.__bug.svg(false));
  const pp = await page.evaluate(() => window.__bug.getParams());
  const fl = await page.evaluate(() => window.__bug.floor());
  const rec = { label, sec, params: pp, png, close, svg: svg.svg, svgW: svg.widthMm, svgH: svg.heightMm, tris: await page.evaluate(() => window.__bug.triangleCount()), notes: await page.evaluate(() => window.__bug.notes()), floor: fl, ...extra };
  out.push(rec);
  console.log(`${label.padEnd(46)} tris=${rec.tris} floor ${fl.violations.length ? 'VIOLATED' : 'ok'} svg ${svg.widthMm.toFixed(0)}x${svg.heightMm.toFixed(0)} mm`);
  return rec;
}

/* a close-up on the right forewing's TRAILING MARGIN mid-span, low and from
   behind, so the edge profile (the taper and the chamfer) catches the light;
   aimed at the emitted outline vertex nearest 60% of the span along that
   margin. Target and direction in MODEL mm. */
function wingCloseUp(params) {
  const m = G.buildBug(params), P = m.positions, q = m.parts.find((x) => x.kind === 'wing1' && x.side === 'R');
  let x0 = Infinity, x1 = -Infinity; for (let v = q.v0; v < q.v1; v++) { x0 = Math.min(x0, P[3 * v]); x1 = Math.max(x1, P[3 * v]); }
  const xs = x0 + 0.6 * (x1 - x0);
  let best = null, by = Infinity;
  for (const [t] of q.meta.edgePairs.outline) if (Math.abs(P[3 * t] - xs) < 0.6 && P[3 * t + 1] < by) { by = P[3 * t + 1]; best = t; }
  return { target: [P[3 * best], P[3 * best + 1], P[3 * best + 2]], dir: [0.35, -1, 0.5], dist: 11 };
}

const prop = proportions(D());
console.log(`NEW default: body ${prop.body.toFixed(1)} mm, wingspan ${prop.span.toFixed(1)} mm, ratio ${prop.ratio.toFixed(2)}; body width ${prop.bodyW.toFixed(1)} mm`);
const propOld = proportions(G.legacyDefaultParams());

if (want('old')) {
  await shoot('OLD default (Phase 1/2 — the new controls at their old ends)', 'old', G.legacyDefaultParams(), { prop: propOld });
  await shoot('NEW default — a pinned specimen', 'old', D(), { prop });
}
if (want('ven')) {
  await shoot('new default, venation HOLES', 'ven', set((p) => { p.venation = 'holes'; }));
  await shoot('new default, venation RIDGES', 'ven', set((p) => { p.venation = 'ridges'; }));
}
if (want('ctl')) {
  const edge = (lab, fn) => { const p = set(fn); return shoot(lab, 'ctl', p, { closeUp: wingCloseUp(p) }); };
  await edge('edge taper 0 (even thickness; chamfer at default)', (p) => { p.wingEdgeTaper = 0; });
  await edge('edge taper 0.90 (root 1.8 mm → the 1.0 mm floor)', (p) => { p.wingEdgeTaper = 0.9; });
  await edge('edge chamfer 0 — the vertical-walled SLAB edge (taper at default)', (p) => { p.wingEdgeBevel = 0; });
  await edge('edge chamfer 4 mm', (p) => { p.wingEdgeBevel = 4; });
  await edge('taper 0 AND chamfer 0 — the Phase 1/2 slab, bit for bit', (p) => { p.wingEdgeTaper = 0; p.wingEdgeBevel = 0; });
  const ant = (lab, fn) => shoot(lab, 'ctl', set(fn), { closeUp: { target: [3.5, G.buildBug(D()).layout.yh + 14, 3], dir: [0.1, 0.05, 1], dist: 30 } });
  await ant('club length 0 — the round knob (the old club)', (p) => { p.clubLength = 0; });
  await ant('club length 0.50', (p) => { p.clubLength = 0.5; });
  await ant('club width 1.00 (no club: the shaft)', (p) => { p.clubWidth = 1; });
  await ant('club width 4.00', (p) => { p.clubWidth = 4; });
  await ant('club taper 0 (blunt end)', (p) => { p.clubTaper = 0; });
  await ant('club taper 1 (drawn back to the floor)', (p) => { p.clubTaper = 1; });
  await shoot('feathered, pointed tips — the LEAF', 'ctl', set((p) => { p.antennaType = 'feathered'; p.antennaLength = 11; }));
  await shoot('feathered, rounded tips — the old fan', 'ctl', set((p) => { p.antennaType = 'feathered'; p.antennaLength = 11; p.pointedTips = false; }));
  const abd = (lab, fn) => shoot(lab, 'ctl', set(fn), { closeUp: { target: [0, -11, 0], dir: [1, 0.05, 0.9], dist: 30 } });
  await abd('segments: groove (0) — continuous, incised lines', (p) => { p.segmentStyle = 0; p.wingPairs = 0; });
  await abd('segments: bulge (1) — the old beads', (p) => { p.segmentStyle = 1; p.wingPairs = 0; });
  await shoot('terminations pointed (legs splayed to show the tarsi)', 'ctl', set((p) => { p.legReach = 1; p.wingPairs = 0; }), { closeUp: { target: [6, -3, -4], dir: [0.4, -0.3, 1], dist: 34 } });
  await shoot('terminations rounded — the old balls (legs splayed)', 'ctl', set((p) => { p.legReach = 1; p.wingPairs = 0; p.pointedTips = false; }), { closeUp: { target: [6, -3, -4], dir: [0.4, -0.3, 1], dist: 34 } });
}
if (want('pose')) {
  const loose = set((p) => { p.wings.first.sweep = 8; p.wings.first.dihedral = 18; p.wings.last.dihedral = 12; p.wings.first.pitch = 6; p.legReach = 1; p.antennaCurl = 40; p.antennaSpread = 40; });
  await shoot('before SET SPECIMEN (sweep 8°, dihedral 18/12°, legs splayed, antennae curled)', 'pose', loose);
  // a REAL click on the page's own button (the panel shown for the click)
  await show('.bg-view,.bg-header,.bg-editor{visibility:hidden!important}');
  await page.locator('#specimenBtn').scrollIntoViewIfNeeded();
  await page.locator('#specimenBtn').click();
  const msg = await page.locator('#designMsg').textContent();
  await show(HIDE);
  const notes = /with notes/.test(msg) ? [msg] : [];
  console.log(`SET SPECIMEN clicked — the page said: "${msg}"`);
  const pp = await page.evaluate(() => window.__bug.getParams());
  await shoot(`after a REAL click of SET SPECIMEN (forewing sweep ${pp.wings.first.sweep.toFixed(2)}°)`, 'pose', null, { clicked: true, poseNotes: notes });
}
if (want('range')) {
  await shoot('MOTH-like — sliders only, from the new default', 'range', set((p) => {
    p.antennaType = 'feathered'; p.antennaLength = 9; p.headSize = 3.2;
    p.thoraxWidth = 4.6; p.thoraxDepth = 4.4; p.thoraxLength = 6; p.abdomenWidth = 4.2; p.abdomenLength = 14; p.abdomenTaper = 0.55; p.roundness = 1.8;
    p.wings.first.length = 30; p.wings.first.stretch = 0.82; p.wings.first.sweep = 10;
    p.wings.last.length = 21; p.wings.last.stretch = 1.15; p.wings.last.sweep = 28; p.wings.last.scallop = 0;
    p.wingEdgeTaper = 0.3;
  }));
  await shoot('DRAGONFLY-like — sliders only, from the new default (HOLES)', 'range', set((p) => {
    p.antennaType = 'bristle'; p.antennaLength = 3; p.headSize = 5.2;
    p.thoraxLength = 7; p.thoraxWidth = 4.6; p.thoraxDepth = 4.8; p.abdomenLength = 50; p.abdomenWidth = 2.4; p.abdomenTaper = 0.35; p.abdomenSegments = 10;
    for (const w of [p.wings.first, p.wings.last]) { w.stretch = 0.5; w.length = 40; w.scallop = 0; w.stigma = 1; w.crossDensity = 0.8; w.cellRegularity = 0.8; w.veinCount = 6; w.veinBranch = 0; }
    p.wings.first.sweep = 0; p.wings.last.sweep = 4; p.wings.last.length = 38;
    p.venation = 'holes';
  }));
}

const cap = (o) => `${o.tris.toLocaleString()} tris · SVG ${o.svgW.toFixed(0)}×${o.svgH.toFixed(0)} mm · STL ${o.floor.violations.length ? 'REFUSED' : 'exports'}${o.prop ? ` · body ${o.prop.body.toFixed(1)} mm, wingspan ${o.prop.span.toFixed(1)} mm — <b>${o.prop.ratio.toFixed(2)}×</b>` : ''}${o.poseNotes ? ` · pose notes: ${o.poseNotes.length ? o.poseNotes.join('; ') : 'none'}` : ''}${o.notes.length ? ` · notes: ${o.notes.join('; ')}` : ''}`;
const card = (o) => `
<figure class="cell">
  <div class="pair${o.close ? ' three' : ''}">
    <div class="svg">${o.svg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" ')}</div>
    <img src="data:image/png;base64,${o.png}" alt="${o.label} 3/4">
    ${o.close ? `<img src="data:image/png;base64,${o.close}" alt="${o.label} close-up">` : ''}
  </div>
  <figcaption><b>${o.label}</b><br><span>${cap(o)}</span></figcaption>
</figure>`;
const sec = (title, key, blurb = '') => (out.some((o) => o.sec === key) ? `<h2>${title}</h2>${blurb ? `<p>${blurb}</p>` : ''}<div class="grid">${out.filter((o) => o.sec === key).map(card).join('')}</div>` : '');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bug — elegance sheet</title>
<style>
body{margin:0;background:#0A0A0C;color:#EDEDE8;font-family:'Space Mono',monospace;font-size:12px;padding:24px}
h1{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;margin:4px 0 6px}
.eb{color:#5FA0A0;letter-spacing:.22em;font-size:11px}
p{color:#8A8A85;max-width:1150px;line-height:1.5;margin:0 0 6px}
h2{font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:20px;margin:22px 0 10px;color:#EDEDE8}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.cell{margin:0;border:1px solid rgba(237,237,232,.22);padding:10px}
.pair{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:100%;gap:8px;height:330px}
.pair.three{grid-template-columns:1fr 1fr 1fr;height:250px}
.pair > *{min-height:0;min-width:0}
.svg{background:#EDEDE8;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px}
.svg svg{width:100%;height:100%}
.pair img{width:100%;height:100%;object-fit:cover;background:#0A0A0C}
figcaption{margin-top:8px;line-height:1.5}
figcaption span{color:#8A8A85}
</style></head><body>
<div class="eb">EM / BUG</div><h1>The elegance pass — contact sheet</h1>
<p>Each bug as <b>left</b> the exported SVG itself (the top-down projection of the 3D model) and <b>right</b> the 3D model at 3/4; the edge, antenna, abdomen and tip cells add a third, close-up view. Governing principle: <b>bodies trend toward anatomical accuracy; wings carry the fantasy.</b> Hold it beside the lace reference (the anatomically real butterfly under impossible lace wings), which is not in the repository. New default: body ${prop.body.toFixed(1)} mm, wingspan ${prop.span.toFixed(1)} mm — <b>${prop.ratio.toFixed(2)}×</b> (old ${propOld.ratio.toFixed(2)}×); body ${prop.bodyW.toFixed(1)} mm wide at its widest (old ${propOld.bodyW.toFixed(1)}).</p>
${sec('The OLD default beside the NEW default', 'old', 'The OLD cell is the new code with every new control at its old end; it is bit-identical to main’s default build (55 configurations, 2,432,178 floats, 0 differ — design doc §9.6).')}
${sec('The new default in HOLES and in RIDGES', 'ven')}
${sec('Each new control at both ends of its range, on the new default', 'ctl', 'Edge cells: the third view is a close-up of the forewing’s trailing margin at 60% of the span, low and from behind, so the wall, the taper and the chamfer read. Antenna cells: from above, at the club. Abdomen cells: wings off so the segments read. Tip cells: wings off, legs splayed so the tarsi show.')}
${sec('SET SPECIMEN — a real click of the page’s button', 'pose', 'Forewings pulled forward until their inner margins (root trail → tornus) form one straight line square to the body; every wing flat; legs tucked; antennae a straight V. It sets slider values; every one stays editable.')}
${sec('The range stays reachable — built from the new default by sliders only', 'range', 'No outline edited, no preset: the moth is the new default with feathered (leaf) antennae, a plump body and narrower forewings; the dragonfly narrows both pairs by stretch, lengthens the abdomen and cuts HOLES with a pterostigma.')}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await sheet.goto('file://' + path.join(OUT, 'index.html'));
await sheet.screenshot({ path: path.join(OUT, 'bug-elegance-sheet.png'), fullPage: true });
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(`wrote ${path.join(OUT, 'index.html')} and bug-elegance-sheet.png`);
if (errors.length) process.exit(1);
