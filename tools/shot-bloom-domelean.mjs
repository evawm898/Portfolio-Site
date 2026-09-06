/* ===================================================================
   shot-bloom-domelean.mjs — the DOME LEAN sheet (Eva, Sep 4, the
   crown-coverage session). domeLean is not a control — there is no "off"
   position to toggle on this tree the way headRise's own sweep can, because
   the whole point is that it is derived and always on once the hub is
   domed. So the honest comparison is BEFORE/AFTER from a git worktree of
   the commit this session's own work started from (the orchid retirement
   sheet's own precedent, tools/shot-bloom-orchid.mjs): the SAME config, the
   SAME camera, one tree with domeLean and one without.

   TWO CONFIGS, deliberately opposite cases:
     INCURVE   the dome-CAUSED regression domeLean exists to fix (flat is
               nearly closed already; rise 0.5 reopened a real hole before
               this change). Expect BEFORE bald, AFTER closed.
     EVA       the headRise-INDEPENDENT baseline shortfall domeLean was
               never aimed at (bald from rise 0 through rise 1 alike,
               before AND after this change, unmoved by design — see
               footRing()'s own note on `domeLean`). Expect BEFORE and
               AFTER to read the SAME, on purpose: a mechanism that "fixed"
               this row would be fixing the wrong thing.
   Every caption states BOTH tools' numbers, read from the app, never
   re-derived: tools/bloom-plan-coverage.mjs's bald-cap radius and
   tools/bloom-crowding.mjs's D_max, so the crown-coverage claim and the
   over-connection claim are never confused for one another.

   CHROME HIDDEN, AUTO-ROTATE OFF, ASSERTED — stillFrame()'s own contract,
   the same one every contact sheet in this project uses; a chrome-visible
   frame here would not be a failure the eye could even name, which is
   exactly why it is checked rather than trusted.

   RUN:  node tools/shot-bloom-domelean.mjs <out-dir> <before-worktree-dir>
         <before-worktree-dir> is a `git worktree add <dir> <commit-before-
         this-change>` — never the live tree, never mutate-and-restore.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl } from './bloom-harness.mjs';
import { measure, coverageLine } from './bloom-plan-coverage.mjs';
import { footCrowding, crowdingLine } from './bloom-crowding.mjs';

const outDir = process.argv[2] || '/tmp/bloom-domelean';
const beforeRoot = process.argv[3];
if (!beforeRoot || !fs.existsSync(path.join(beforeRoot, 'bloom.html'))) {
  console.error('usage: node tools/shot-bloom-domelean.mjs <out-dir> <before-worktree-dir>');
  console.error('  <before-worktree-dir> must be a git worktree of the commit before dome lean (e.g. `git worktree add <dir> HEAD~1`), with bloom.html at its root.');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const EVA_CONFIG = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 6, spread: 1.15, headRise: 1.00 };
const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25, headRise: 0.5 };

const CELLS = [
  ['incurve-before', 'INCURVE TARGET x rise 0.5 — BEFORE dome lean (the regression)', INCURVE, true],
  ['incurve-after', 'INCURVE TARGET x rise 0.5 — AFTER dome lean (closed)', INCURVE, false],
  ['eva-before', 'EVA_CONFIG x rise 1.0 — BEFORE dome lean', EVA_CONFIG, true],
  ['eva-after', 'EVA_CONFIG x rise 1.0 — AFTER dome lean (unmoved, on purpose)', EVA_CONFIG, false],
];

const { server: liveServer, port: livePort } = await serveRepo();
const { server: beforeServer, port: beforePort } = await serveRepo(beforeRoot);
const { browser, page } = await launchPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 2 });

const bad = [];
const cellsOut = [];
for (const [name, caption, cfg, useBefore] of CELLS) {
  const port = useBefore ? beforePort : livePort;
  await openBloom(page, port);
  const bad0 = await applyConfig(page, set(cfg));
  if (bad0.length) { bad.push(`${name}: ${bad0.join('; ')}`); continue; }
  const drift = await fullStateDrift(page, set(cfg));
  if (drift.length) { bad.push(`${name}: ${drift.join('; ')}`); continue; }

  const { bad: cvBad, r: cv } = await measure(page, {});
  if (cvBad.length) { bad.push(`${name} coverage: ${cvBad.join('; ')}`); continue; }
  const buf = await exportStl(page, outDir);
  const { bad: crBad, r: cr } = await footCrowding(page, { label: name, set: set(cfg) }, analyzeStl(buf));
  if (crBad.length) { bad.push(`${name} crowding: ${crBad.join('; ')}`); continue; }

  await page.evaluate(() => { const el = document.getElementById('viewPreset'); el.value = 'top'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(800);
  const chromeBad = await stillFrame(page);
  if (chromeBad.length) { bad.push(`${name} stillFrame: ${chromeBad.join('; ')}`); continue; }
  const file = path.join(outDir, `${name}.png`);
  // Centre-cropped: the crown is what this sheet is about, not the whole bloom.
  await page.screenshot({ path: file, clip: { x: 300, y: 300, width: 600, height: 600 } });

  cellsOut.push({ name, caption, file: `${name}.png`, coverageLine: coverageLine(cv), crowdingLine: crowdingLine(cr) });
  console.log(`  ${caption}\n    ${coverageLine(cv)}\n    ${crowdingLine(cr)}`);
}

await browser.close(); liveServer.close(); beforeServer.close();

if (bad.length) {
  console.error(`\nHARNESS INVALID — ${bad.length} validity assertion(s) failed:`);
  for (const b of bad) console.error(`  - ${b}`);
  process.exit(1);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>dome lean — before/after</title>
<style>body{font-family:system-ui,sans-serif;background:#111;color:#eee;padding:24px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:1100px}
figure{margin:0}img{width:100%;display:block;border:1px solid #444}
figcaption{font-size:13px;line-height:1.5;margin-top:8px}
.mono{font-family:ui-monospace,monospace;font-size:11px;color:#9cf;word-break:break-word}</style>
</head><body>
<h1>Dome lean — before/after, centre-cropped</h1>
<p>BEFORE = a git worktree of the commit before dome lean (${esc(beforeRoot)}). AFTER = this tree. Chrome hidden, auto-rotate off, asserted by stillFrame() on every cell.</p>
<div class="grid">
${cellsOut.map((c) => `<figure><img src="${c.file}" alt="${esc(c.caption)}"><figcaption><strong>${esc(c.caption)}</strong><br><span class="mono">${esc(c.coverageLine)}</span><br><span class="mono">${esc(c.crowdingLine)}</span></figcaption></figure>`).join('\n')}
</div>
</body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${cellsOut.length} cells to ${outDir}/index.html`);
