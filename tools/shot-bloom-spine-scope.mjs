#!/usr/bin/env node
/* ===================================================================
   THE SPINE UNDER SCOPING SHEET (F3-scope, Oct 19 — Eva's rulings;
   docs/bloom-spine-curve-scope-outcome.md). On one page:

     1. a RADIAL flower whose INNER layer is cupped by a drawn spine (the
        incurve, owned by the layer) while the OUTER layer stays on the curl
        sliders (curl 45).
     2. a SPIRAL whose two turns bend on two different drawn spines (turn 1 the
        reflex, turn 2 the incurve).
     3. an ORCHID — a FAN whose whole bloom is the asymmetric lateral, its
        outline pairs mirrored — with one pair owning the hook: both members
        bend on the SAME hook (the spine is planar in the midrib plane, so a
        pair's mirror image of it is itself).
     4. the both-curves flower with the infill — three layers, each owning a
        different outline AND a different spine, each petal's cells planned on
        its own blade.

   EVERY CELL: print preview ON (read back from the app's own shownMode),
   auto-rotate off through the asserted stillFrame(), settled until three
   consecutive frames are byte-identical, framed in THREE-QUARTER view so a
   spine's curl reads (face-on hides it). Each cell runs the junction (J1-J9)
   and curl (C1-C4) assertions before the shutter and exports a watertight
   STL. No pixel delta is quoted. The rows are this tree's own matrix rows,
   read by label, so the sheet shows exactly what the gates build.

   RUN:  node tools/shot-bloom-spine-scope.mjs <out-dir> [--png <file>]
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, settleBuild, modeTag, shownModeOf, buildMatrix } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-spine-scope';
const argOf = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG_OUT = argOf('--png');
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 640, DPR = 1.5;
const here = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-spine-scope-sheet-'));
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); process.exit(2); }); }
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
/* THREE-QUARTER: from below the rim, a little round from the side, +z up */
const VIEW_DIR = [0.55, -0.62, 0.56], UP = [0, 0, 1];

async function cell(label, { title = '' } = {}) {
  const row = rowOf(label);
  await openBloom(page, here.port);
  const bad = await applyConfig(page, row.set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  for (const [name, fn] of [['junction', junctionAssertions], ['curl (C1-C4)', curlAssertions]]) {
    const b2 = await fn(page, row);
    if (b2.length) await die(`${label}: ${name}: ${b2.join('; ')}`);
  }
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const stl = analyzeStl(buf);
  if (stl.boundary !== 0 || stl.degenerate !== 0) await die(`${label}: the export has ${stl.boundary} boundary edges and ${stl.degenerate} degenerate triangles`);
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page, 300000); /* the infill cell's export rebuild runs well past the 30 s default on a loaded box */
  if ((await shownModeOf(page)) !== 'export') await die(`${label}: print preview ON asked for, the app reports another mode`);
  const still = await stillFrame(page);
  if (still.length) await die(`${label}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${label}: not the export build on screen`);
  const r = (m.maxDimMm / 2) * 1.12;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, [0, 0, 0], a.dir, a.up), { r, dir: VIEW_DIR, up: UP });
  if ((await settleOnly()) < 0) await die(`${label}: never came to rest`);
  const file = `${slug(label)}.png`;
  await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n');
  const rec = { label, title, file, r, tag: modeTag(m), shownTris: m.shownTris, sha: sha(buf), bytes: buf.length, tris: stl.tris,
    lines: lines.filter((l) => /^(SPINE|OUTLINE BY SCOPE|INFILL)/.test(l)) };
  console.log(`  ${label.slice(0, 96).padEnd(96)} ${m.shownTris} tris sha ${rec.sha}`);
  return rec;
}

console.log('THE SPINE UNDER SCOPING SHEET — every cell PRINT PREVIEW ON, three-quarter view, settled; every cell asserts J and C1-C4 and exports watertight.\n');
const radial = await cell('SCOPED SPINE: RADIAL x 2 — the inner layer bent by a drawn spine (the incurve), the outer on the curl sliders (curl 45)', { title: 'the inner layer cupped by its own drawn spine (the incurve); the outer layer on the curl sliders, curl 45' });
const spiral = await cell('SCOPED SPINE: SPIRAL x 2 turns on two different spines (turn 1 the reflex, turn 2 the incurve)', { title: 'turn 1 owns the reflex, turn 2 the incurve' });
const orchid = await cell('SCOPED SPINE: FAN orchid — the asymmetric laterals mirrored, pair 1 owns the hook (its partner the same hook)', { title: 'an orchid: the laterals\' outlines mirrored, pair 1 bent on its own hook — both members the SAME hook (the spine lies in the midrib plane)' });
const infill = await cell('SCOPED SPINE: both curves per layer x the Voronoi infill (each petal\'s cells on its own outline and spine)', { title: 'three layers, each its own outline AND spine (LAW on the sliders / the spoon on the S / the lopsided on the incurve) — with the infill' });
if (errors.length) await die(`page errors: ${errors.join(' | ')}`);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = (c) => `<figure><img src="${c.file}"><figcaption><b>${esc(c.title)}</b><br><small>${esc(c.label)}</small><br><b>${esc(c.tag)}</b> · ${Number(c.shownTris).toLocaleString('en-US')} tris on screen · STL ${c.sha} (${(c.bytes / 1024).toFixed(0)} KiB, ${c.tris.toLocaleString('en-US')} tris, watertight)${c.lines.map((l) => `<br><small>${esc(l)}</small>`).join('')}</figcaption></figure>`;
const html = `<title>Spine under scoping</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}small{color:#7f948a}</style>
<h1>The spine curve under scoping — F3-scope</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b>, three-quarter view (a spine's curl does not read face-on), auto-rotate off and settled; every cell ran J1-J9 and C1-C4 before the shutter and the STL is that cell's own export. Eva's rulings: scoping is global → layer → petal; the curl mode and the spine curve are scopable; a drawn spine hides the old curl controls and a drag past the limit is refused. As #421 placed it for the outline: a scope with its own spine REPLACES the inherited one outright, a scope without one inherits its parent's live, and the bar offers "Spine: reset to inherited". The spine lies in the midrib plane (measured: lateral ≤ 3.6e-15 mm), so a FAN mirror pair draws ONE spine — no flip. No pixel delta is quoted.</p>
<h2>1. RADIAL — the inner layer on a drawn spine, the outer on the sliders · 2. SPIRAL — two turns on two spines</h2>
<main>${fig(radial)}${fig(spiral)}</main>
<h2>3. An orchid pair on its own spine · 4. Both curves per layer, with the infill</h2>
<main>${fig(orchid)}${fig(infill)}</main>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
if (PNG_OUT) {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('file://' + path.resolve(outDir, 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: PNG_OUT, fullPage: true });
  console.log(`wrote ${PNG_OUT}`);
}
await browser.close(); here.server.close();
