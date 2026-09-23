/* ===================================================================
   THE PETAL'S EDGE, BEFORE AND AFTER — three cells the brief named.

     node tools/shot-bloom-edge-profile.mjs <out-dir> --base <worktree> [--only re]

   WHAT IS BEING ASKED: `emitPanel` used to close every petal with a FLAT WALL
   one sheet thickness tall. It now eases the sheet toward a 1.0 mm rim over
   3.0 mm of surface and closes it with a half-round bead. The eye is being
   asked one question per row — does the edge read as a rolled edge rather
   than a cut one — on A WIDE PETAL, on a POINTED APEX, and on THE NARROWEST
   SPAN the matrix reaches, where the bead has to shrink to fit and the rim
   goes BELOW the floor (0.5990 mm on `CAPABILITY: cleft x 6 layers`).

   THE BEFORE CELL IS A REAL RENDER OF THE OLD CODE. Both trees are served
   over their OWN HTTP servers and the page is loaded from whichever port a
   cell names — the stem-plug and seam-ruling construction, right here for the
   same reason: the base tree's `bloom.js` has no edge-profile read-out, so
   swapping one module into a running page would leave the read-out and the
   geometry disagreeing.

   THE CAMERA IS COMPUTED ON THE BASE TREE AND SHARED BY BOTH CELLS OF A PAIR,
   and it is read off the geometry rather than guessed: the target is a point
   of the captured MID-SURFACE, which is BYTE-IDENTICAL between the trees —
   that is exactly what `verify-bloom-grid-bytes.mjs` proves over 242 builds.
   So "the two cells share one camera" is an identity here and not a promise,
   and the base tree is the owner of a number this session's geometry writes.

   PRINT PREVIEW IS ON in every cell (the app's own `shownMode` asserted
   "export"), because the STL is the object and the floors move the geometry.

   A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL, and a
   before/after pair here is TWO TREES, TWO SERVERS AND TWO PAGE SESSIONS — so
   NO PIXEL DELTA IS QUOTED FOR ANY PAIR (this repo's own rule). What is
   reported is the SAME-TREE control, one cell shot twice at one camera on one
   tree, and the geometry's own exact numbers: the triangle count, the drawn
   bead radius, the segment count and the measured rim thickness.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, shownModeOf, CAPABILITY_CLEFT } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-edge-profile';
const baseArg = process.argv.indexOf('--base');
const BASE = baseArg >= 0 ? process.argv[baseArg + 1] : null;
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom.html'))) {
  console.error('shot-bloom-edge-profile: need --base <worktree of the tree BEFORE the edge profile>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 620, DPR = 2;

/* ---- the cells, and the camera each one wants ------------------------ */
const CELLS = [
  { id: 'wide',   set: { petalWidth: 30 }, cap: null,
    title: 'A WIDE PETAL &mdash; the margin at half length', pick: 'margin', radius: 3.2 },
  { id: 'apex',   set: { petalTipShape: 0.6 }, cap: null,
    title: 'A POINTED APEX &mdash; tip shape 0.60, the acute floor', pick: 'apex', radius: 2.6 },
  { id: 'narrow', set: { layerCount: 6 }, cap: 'cleft',
    title: 'THE NARROWEST SPAN &mdash; a cleft at six whorls, where the bead shrinks to fit', pick: 'narrowest', radius: 2.2 },
];
const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

/* ---- targets, computed on the BASE tree's own mid-surface ------------ */
const BG = await import(pathToFileURL(path.join(BASE, 'bloom-geometry.js')).href);
const BR = await import(pathToFileURL(path.join(BASE, 'bloom-registry.js')).href);
function targetFor(c) {
  const acc = new BG.MeshBuilder({ exportMode: true, captureGrid: true });
  const built = BG.buildBloomInto(acc, { ...BR.DEFAULTS, ...c.set }, { below: null, capability: c.cap === 'cleft' ? CAPABILITY_CLEFT : null });
  const p = (built.petalsAll || built.petals || []).filter(Boolean)[0];
  const panels = p.grid || [];
  let row = null, col = 0;
  if (c.pick === 'apex') {
    const rows = panels[0].rows.filter((r) => r.u > 0);
    row = rows[rows.length - 1]; col = Math.floor(row.mid.length / 2);
  } else if (c.pick === 'margin') {
    const rows = panels[0].rows.filter((r) => r.u > 0);
    row = rows.find((r) => r.u >= 0.5) || rows[rows.length - 1]; col = 0;
  } else {
    /* THE NARROWEST SPAN is the smallest half-width any blade row carries,
       over EVERY panel — on a cleft that is a lobe, not the base. */
    let best = null;
    for (const pan of panels) for (const r of pan.rows) if (r.u > 0 && (!best || r.halfWidth < best.halfWidth)) best = r;
    row = best; col = 0;
  }
  const P = row.mid[col];
  /* `dir` is the vector FROM the target TO the camera (the stem-plug sheet's
     own convention — its "from below" is a NEGATIVE z). So this puts the eye
     OUTSIDE the bloom and a little above, looking back down the point's own
     outward direction: the rim is then near edge-on and its profile is the
     silhouette, which is the thing the two trees differ in. Getting this
     backwards puts the camera inside the solid and renders black, which is
     what the first draft did. */
  const r = Math.hypot(P[0], P[1]) || 1;
  const dir = [P[0] / r, P[1] / r, 0.55];
  return { at: P, dir, radius: c.radius, row };
}

/* ---- render ---------------------------------------------------------- */
const here = await serveRepo();
const there = await serveRepo(BASE);
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); there.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const CLIP = { x: 0, y: 0, width: VIEW, height: VIEW };

async function settleOnly(id) {
  let a = null, b = null;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip: CLIP, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return k;
    a = b; b = c;
  }
  return -1;
}
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4) if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  return n;
}

async function shoot(c, tree, tgt, suffix) {
  const id = `${c.id}-${suffix}`;
  await openBloom(page, tree.port);
  const bad = await applyConfig(page, set(c.set));
  if (bad.length) await die(`${id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(c.set));
  if (drift.length) await die(`${id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (c.cap === 'cleft') await page.evaluate((s) => window.__bloomCapability(s), CAPABILITY_CLEFT);
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const mode = await shownModeOf(page);
  if (mode !== 'export') await die(`${id}: print preview ON asked for, app reports shownMode "${mode}"`);
  const still = await stillFrame(page);
  if (still.length) await die(`${id}: ${still.join('; ')}`);
  await page.evaluate((a) => window.__bloomFrame(a.radius, 0, a.at, a.dir, null), tgt);
  const settled = await settleOnly(id);
  if (settled < 0) await die(`${id}: never came to rest`);
  const buf = await page.screenshot({ clip: CLIP, timeout: 180000 });
  fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const edge = (readout.match(/EDGE PROFILE[^\n]*/) || [''])[0];
  const clamp = (readout.match(/RIM CLAMPED[^\n]*/) || [''])[0];
  return { id, buf, tris: m.shownTris, edge, clamp, mmPerPx: (2 * tgt.radius) / VIEW };
}

const rows = [];
for (const c of chosen) {
  const tgt = targetFor(c);
  const before = await shoot(c, there, tgt, 'before');
  const after = await shoot(c, here, tgt, 'after');
  rows.push({ c, tgt, before, after });
  console.log(`${c.id}: target [${tgt.at.map((v) => v.toFixed(2)).join(', ')}] r=${tgt.radius} mm · ${tgt.row.halfWidth.toFixed(3)} mm half-width · before ${before.tris} tris, after ${after.tris}`);
}

/* THE SAME-TREE CONTROL — one cell, one tree, one camera, shot twice.  It is
   the only pixel number on this sheet, and it is REPORTED rather than a bar. */
const first = rows[0];
const again = await shoot(first.c, here, first.tgt, 'control');
const controlPx = pixelDiff(first.after.buf, again.buf);
console.log(`same-tree control (${first.c.id}, this tree, one camera, shot twice): ${controlPx} px differ of ${VIEW * VIEW}`);

/* ---- the sheet ------------------------------------------------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const cellHtml = (s, label) => `<figure><img src="${s.id}.png" width="${VIEW}"><figcaption><b>${label}</b><br>${s.tris.toLocaleString()} tris (export) · ${s.mmPerPx.toFixed(5)} mm per pixel${s.edge ? `<br><span class=ro>${esc(s.edge)}</span>` : ''}${s.clamp ? `<br><span class=ro>${esc(s.clamp)}</span>` : ''}</figcaption></figure>`;
const html = `<!doctype html><meta charset=utf-8><title>bloom — the petal's edge, before and after</title>
<style>body{background:#111;color:#ddd;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:19px}h2{font-size:15px;margin:28px 0 6px;color:#9fd}
.row{display:flex;gap:14px;flex-wrap:wrap}figure{margin:0}img{display:block;border:1px solid #333}
figcaption{max-width:${VIEW}px;font-size:12px;color:#aaa;padding-top:6px}
.ro{color:#7a9;font-size:11px}p{max-width:900px;color:#bbb}</style>
<h1>The petal's edge &mdash; a thickness taper and a round bead on the rim</h1>
<p>Each pair is ONE camera, computed on the base tree's own captured mid-surface &mdash; which is
byte-identical between the two trees, so the pair sharing a camera is an identity rather than a promise.
Print preview is ON in every cell (the app's own <code>shownMode</code> asserted <code>export</code>),
because the STL is the object. <b>No pixel delta is quoted for any pair</b>: two trees, two servers, two
page sessions. The one pixel number on this sheet is the same-tree control below.</p>
${rows.map((r) => `<h2>${r.c.title}</h2><div class=row>${cellHtml(r.before, 'BEFORE &mdash; the flat wall')}${cellHtml(r.after, 'AFTER &mdash; taper and bead')}</div>`).join('\n')}
<h2>The same-tree control</h2>
<p><code>${esc(first.c.id)}</code> on this tree, one camera, shot twice: <b>${controlPx}</b> px differ of ${VIEW * VIEW}.
Reported, never a bar &mdash; a single control draw is not a floor (this repo's own rule).</p>
<div class=row>${cellHtml(first.after, 'first draw')}${cellHtml(again, 'second draw')}</div>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); here.server.close(); there.server.close();
