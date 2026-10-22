#!/usr/bin/env node
/* shot-lantern.mjs <dir> — the /lantern contact sheet: the page as it opens
   (Folded, turning), the Flat cut file, the editor with a convex edge, four
   presets folded, an infeasible target's Checks, and the page at phone width.
   Every cell is the real page. No pixel claim is made anywhere: the sheet is
   for looking at. Writes <dir>/*.png and <dir>/index.html. */
import fs from 'node:fs';
import path from 'node:path';
import { openLantern } from './lantern-page-harness.mjs';

const OUT = path.resolve(process.argv[2] || 'lantern-sheet');
fs.mkdirSync(OUT, { recursive: true });
const cells = [];
const shotOf = async (sel) => { const b = await page.locator(sel).boundingBox(); return page.screenshot({ clip: b }); };   // a clip, never locator.screenshot(): the turning canvas is never 'stable'
const save = (name, buf, caption) => { fs.writeFileSync(path.join(OUT, name), buf); cells.push({ name, caption }); console.log(`${name.padEnd(22)} ${caption}`); };

const s = await openLantern({ storage: '', viewport: { width: 1440, height: 900 }, dsf: 2 });
const { page } = s;
const T = (f, ...a) => page.evaluate(f, ...a);
await page.waitForTimeout(600);
save('page.png', await page.screenshot(), 'the page as it opens: the default 5-point star, 20″ wide, folded and turning');
await T(() => window.__lantern.view('flat')); await page.waitForTimeout(200);
save('flat.png', await shotOf('.ln-preview'), 'the Flat view — one half as it is cut: outline and tabs in red, mountain scores blue, valley perforations green dashed, the back\'s opening and ring beside it');
await T(() => window.__lantern.edgeMode('convex')); await T(() => window.__lantern.flush()); await page.waitForTimeout(100);
save('editor.png', await shotOf('#secShape'), 'the Shape section with a convex point outline: the drawn curve (teal) and the derived bow the solver adds to close the fold (amber dashes)');
await T(() => window.__lantern.view('folded'));
for (const id of ['alt8', 'sunburst12', 'flower', 'puffy6']) {
  await T((i) => window.__lantern.preset(i), id); await T(() => window.__lantern.flush()); await page.waitForTimeout(500);
  save(`preset-${id}.png`, await shotOf('.ln-preview'), `preset ${id}, folded`);
}
await T(() => window.__lantern.preset('classic5')); await T(() => window.__lantern.flush());
for (const id of ['lace', 'botanical', 'geometric', 'celestial', 'alternate']) {
  await T((i) => window.__lantern.patternPreset(i), id); await T(() => window.__lantern.flush()); await page.waitForTimeout(500);
  save(`pattern-${id}.png`, await shotOf('.ln-preview'), `pattern preset ${id} on the default star, folded`);
}
await T(() => window.__lantern.patternPreset('victorian')); await T(() => window.__lantern.flush()); await page.waitForTimeout(200);
await T(() => window.__lantern.fold.lookAt([0, 0, 0], [0.1, 0.95, 0.3], 520)); await page.waitForTimeout(200);
save('pattern-close.png', await shotOf('.ln-preview'), 'the default Victorian scroll pattern, close: the stem, the volutes, the rim beads, cut through both halves');
await T(() => window.__lantern.view('flat')); await page.waitForTimeout(200);
save('pattern-flat.png', await shotOf('.ln-preview'), 'the Flat view with the cuts: every point carries the pattern mirrored about its ridge; amber rings mark the judge\'s thin-paper notes');
await T(() => window.__lantern.setState({ ...window.__lantern.state(), patAutoBridge: false })); await page.waitForTimeout(200);
await T(() => window.__lantern.focusIssue('island')); await page.waitForTimeout(200);
save('pattern-island.png', await shotOf('.ln-preview'), 'auto-bridge off: the Flat view zoomed on an island finding (red ring) after clicking it in Checks');
await page.locator('#secPattern').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('pattern-panel.png', await shotOf('#secPattern'), 'the Pattern section: presets with facet thumbnails, the randomizer, reseed, generator, density, intricacy, rim band, alternate-solid, auto-bridge');
await page.locator('#secChecks').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('pattern-checks.png', await shotOf('#secChecks'), 'Checks with auto-bridge off: the island as a problem, the thin-paper notes, each clickable into the Flat view');
await T(() => window.__lantern.setState({ ...window.__lantern.state(), patAutoBridge: true })); await T(() => window.__lantern.view('folded'));
await T(() => window.__lantern.setState({ ...window.__lantern.state(), points: 5, slender: 0.38, depthFrac: 0.2, edgeMode: 'straight', edge: { mode: 'single', points: [[0, 0], [1, 0]] } }));
await page.waitForTimeout(300);
save('clamp.png', await shotOf('.ln-panel'), 'an infeasible target (slender 0.38 at 0.2 × width): Checks says the depth was clamped to the nearest closing depth and why');
await s.close();
const m = await openLantern({ storage: '', viewport: { width: 390, height: 844 }, dsf: 2 });
await m.page.waitForTimeout(600);
save('phone.png', await m.page.screenshot({ fullPage: true }), 'at phone width: the preview first, the panel below');
await m.close();
const html = `<!doctype html><meta charset="utf-8"><title>/lantern contact sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:12px 'Space Mono',monospace;margin:24px}figure{margin:0 0 28px}img{max-width:100%;border:1px solid #333}figcaption{color:#8A8A85;margin-top:6px}</style>
<h1 style="font-family:Georgia,serif;font-weight:600">/lantern — contact sheet</h1>
${cells.map((c) => `<figure><img src="${c.name}" alt=""><figcaption>${c.name} — ${c.caption}</figcaption></figure>`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`\nwrote ${cells.length} cells to ${OUT}`);
