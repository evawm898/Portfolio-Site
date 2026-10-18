#!/usr/bin/env node
/* ===================================================================
   THE OUTLINE UNDER SCOPING SHEET (F6-scope, Oct 18 — Eva's rulings;
   docs/bloom-outline-curve-scope-outcome.md). On one page:

     1. an ORCHID — a FAN whose whole bloom is the asymmetric lateral — with
        its mirror pairs drawn as MIRROR IMAGES (this tree) beside the PRE-FIX
        TWIN: the same control set on a git worktree of the base commit, where
        every petal of the fan had the same hand. Face-on, the mirror plane
        vertical, slot 0 at the bottom, both cells on ONE camera.
     2. a RADIAL flower with its INNER layer drawn (the diamond, owned by the
        layer) and the outer layer on the LAW.
     3. a SPIRAL whose two turns own two different curves (the rectangle and
        the diamond).
     4. the infill on a mixed flower (three layers, three outlines) and on the
        mirrored orchid at two whorls.

   EVERY BLOOM CELL: print preview ON (read back from the app's own
   shownMode), auto-rotate off through the asserted stillFrame(), settled
   until three consecutive frames are byte-identical. THIS tree's cells run
   the junction (J1-J9), curl (C1-C3) and apex-nib / outline (AN0-AN3,
   OC0-OC5) assertions before the shutter and export a watertight STL; the
   BEFORE cell is the old code served from its own HTTP server, and no pixel
   delta is quoted for the pair (two trees, two servers, two page sessions —
   CLAUDE.md). The rows are this tree's own matrix rows, read by label, so
   the sheet shows exactly what the gates build.

   RUN:  node tools/shot-bloom-outline-scope.mjs <out-dir> --base <worktree of f63235e> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, apexNibAssertions, settleBuild, modeTag, shownModeOf, buildMatrix } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-outline-scope';
const argOf = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG_OUT = argOf('--png'), BASE = argOf('--base');
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom-geometry.js'))) { console.error('shot-bloom-outline-scope: need --base <worktree of the base commit, before F6-scope>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const BR = await import(pathToFileURL(path.join(path.resolve(BASE), 'bloom-registry.js')).href);
const BASE_KINDS = Object.fromEntries(BR.CONTROLS.map((c) => [c.id, c.kind]));

const VIEW = 640, DPR = 1.5;
const here = await serveRepo();
const there = await serveRepo(path.resolve(BASE));
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-outline-scope-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); there.server.close(); process.exit(2); }); }
const sha = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12);
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
const MATRIX = buildMatrix();
const rowOf = (label) => { const r = MATRIX.find((x) => x.label === label); if (!r) throw new Error(`no matrix row "${label}"`); return r; };

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 120; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return k;
    a = b; b = c;
  }
  return -1;
}
/* FACE-ON: down the axis, +x (slot 0, the fan's mirror-line petal) at the BOTTOM */
const FACE = [0, 0, 1], UP = [-1, 0, 0];

async function cell(label, treeName, { radius = null, title = '' } = {}) {
  const row = rowOf(label);
  const tree = treeName === 'base' ? there : here;
  await openBloom(page, tree.port);
  const bad = await applyConfig(page, row.set, treeName === 'base' ? BASE_KINDS : null);
  if (bad.length) await die(`${label} [${treeName}]: ${bad.join('; ')}`);
  let stl = null, buf = null;
  if (treeName === 'here') {
    const drift = await fullStateDrift(page, row.set);
    if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
    for (const [name, fn] of [['junction', junctionAssertions], ['curl', curlAssertions], ['apex nib / outline', apexNibAssertions]]) {
      const b2 = await fn(page, row);
      if (b2.length) await die(`${label}: ${name}: ${b2.join('; ')}`);
    }
    buf = await exportStl(page, tmp);
    if (!buf) await die(`${label}: no STL download`);
    stl = analyzeStl(buf);
    if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  }
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  if ((await shownModeOf(page)) !== 'export') await die(`${label} [${treeName}]: print preview ON asked for, the app reports another mode`);
  const still = await stillFrame(page);
  if (still.length) await die(`${label} [${treeName}]: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${label} [${treeName}]: not the export build on screen`);
  const r = radius ?? (m.maxDimMm / 2) * 1.08;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, [0, 0, 0], a.dir, a.up), { r, dir: FACE, up: UP });
  if ((await settleOnly()) < 0) await die(`${label} [${treeName}]: never came to rest`);
  const file = `${slug(label)}-${treeName}.png`;
  await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n');
  const rec = { label, title, treeName, file, r, tag: modeTag(m), shownTris: m.shownTris,
    sha: buf ? sha(buf) : null, bytes: buf ? buf.length : null, tris: stl ? stl.tris : null,
    outlineLines: lines.filter((l) => /^(OUTLINE|INFILL)/.test(l)) };
  console.log(`  [${treeName}] ${label.slice(0, 90).padEnd(90)} ${m.shownTris} tris${rec.sha ? ` sha ${rec.sha}` : ''}`);
  return rec;
}

console.log('THE OUTLINE UNDER SCOPING SHEET — every cell PRINT PREVIEW ON, face-on, settled; this tree\'s cells assert J, C, AN and OC0-OC5 and export watertight.\n');
const ORCHID = 'ASYM OUTLINE: the lateral x FAN (a mirror pair is a mirror image — the partner draws the halves swapped)';
const orchidAfter = await cell(ORCHID, 'here', { title: 'AFTER — each mirror pair a mirror image' });
const orchidBefore = await cell(ORCHID, 'base', { radius: orchidAfter.r, title: 'BEFORE (the base tree) — every fan petal the same hand' });
const radial = await cell('SCOPED OUTLINE: RADIAL x 2 layers — the inner layer DRAWN (the diamond), the outer on the LAW', 'here', { title: 'the inner layer owns the diamond; the outer layer inherits the LAW' });
const spiral = await cell('SCOPED OUTLINE: SPIRAL x 2 turns on two different curves (turn 1 the rectangle, turn 2 the diamond)', 'here', { title: 'turn 1 owns the rectangle, turn 2 the diamond' });
const mixed = await cell('SCOPED OUTLINE: the mixed flower x the Voronoi infill (each petal\'s cells on its own outline)', 'here', { title: 'three layers, three outlines (LAW, the spoon, the lopsided curve) — each petal plans its cells on its own' });
const orchidInf = await cell('SCOPED OUTLINE: FAN orchid x 2 layers — mirrored asymmetric laterals x the Voronoi infill', 'here', { title: 'the mirror under the cell plan — each partner plans on its swapped halves' });
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c) => `<figure><img src="${c.file}"><figcaption><b>${esc(c.title)}</b><br><small>${esc(c.label)}</small><br><b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris on screen${c.sha ? ` · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris, watertight)` : ' · the base tree, served from its own worktree'}${c.outlineLines.map((l) => `<br><small>${esc(l)}</small>`).join('')}</figcaption></figure>`;
const html = `<title>Outline under scoping</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The petal outline under scoping — F6-scope</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, face-on (slot 0 at the bottom, so a fan's mirror plane is vertical), auto-rotate off and settled. This tree's cells ran J1-J9, C1-C3, AN0-AN3 and OC0-OC5 before the shutter and the STL is that cell's own export. Eva's rulings: scoping is global → layer → petal; the outline mode, the Symmetric / Asymmetric toggle and the curve(s) are scopable; a FAN mirror pair is two MIRROR IMAGES. My call, reported as a placement: a scope with its own curve REPLACES the inherited one outright, a scope without one inherits its parent's live, and the scope bar offers "Outline: reset to inherited". The BEFORE cell is the base commit's own code, served from its worktree; no pixel delta is quoted.</p>
<h2>1. An orchid — the fan's laterals as mirror images, beside the pre-fix twin</h2>
<main>${fig(orchidAfter)}${fig(orchidBefore)}</main>
<h2>2. RADIAL — the inner layer drawn, the outer on the law · 3. SPIRAL — two turns on two curves</h2>
<main>${fig(radial)}${fig(spiral)}</main>
<h2>4. With the infill</h2>
<main>${fig(mixed)}${fig(orchidInf)}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); here.server.close(); there.server.close();
