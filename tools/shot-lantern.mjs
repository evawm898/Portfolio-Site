#!/usr/bin/env node
/* shot-lantern.mjs <dir> — the /lantern contact sheet: the page as it opens
   (Folded, turning), the Flat cut file, the editor with a convex edge, four
   presets folded, an infeasible target's Checks, and the page at phone width.
   Every cell is the real page. No pixel claim is made anywhere: the sheet is
   for looking at. Writes <dir>/*.png and <dir>/index.html. */
import fs from 'node:fs';
import path from 'node:path';
import { openLantern, REPO } from './lantern-page-harness.mjs';

const OUT = path.resolve(process.argv[2] || 'lantern-sheet');
fs.mkdirSync(OUT, { recursive: true });
const cells = [];
const SHOT = { timeout: 120000 };   // a WebGL canvas on the runner's software GL can take past Playwright's 30 s default (the sheet step timed out at 30 s on its fourth cell)
// a clip, never locator.screenshot(): the turning canvas is never 'stable'. The element is scrolled to the TOP of its
// scroller and the clip is CLAMPED to the viewport first: a clip reaching past the viewport makes Playwright resize the
// viewport for the shot, which re-renders the turning WebGL canvas on the runner's software GL and hung the export cell
// for 120 s there (the runner's fonts make the panel taller than this box's, so #secExport ended below the fold).
const shotOf = async (sel, timeout) => {   // a Lit cell gets LIT_SHOT_MS: a lit frame on the runner's software GL takes 55-120 s, and at 120 s which cell tripped was luck (runs 39777729024, 39780364382, 39785255238)
  const loc = page.locator(sel);
  await loc.evaluate((el) => el.scrollIntoView({ block: 'start' })); await page.waitForTimeout(100);
  const b = await loc.boundingBox(); const v = page.viewportSize();
  const x = Math.max(0, b.x), y = Math.max(0, b.y);
  const clip = { x, y, width: Math.min(b.x + b.width, v.width) - x, height: Math.min(b.y + b.height, v.height) - y };
  return page.screenshot({ clip, ...SHOT, ...(timeout ? { timeout } : {}) });
};
const LIT_SHOT_MS = 300000;
const save = (name, buf, caption) => { fs.writeFileSync(path.join(OUT, name), buf); cells.push({ name, caption }); console.log(`${name.padEnd(22)} ${caption}`); };

const s = await openLantern({ storage: '', viewport: { width: 1440, height: 900 }, dsf: 2 });
const { page } = s;
const T = (f, ...a) => page.evaluate(f, ...a);
await page.waitForTimeout(600);
save('page.png', await page.screenshot(SHOT), 'the page as it opens: the default 5-point star, 20″ wide, folded and turning');
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
// The panel cells below show no preview, so they are shot in the FLAT view: the turning WebGL canvas on the runner's
// software GL made every folded cell cost 12-25 s there and the export cell hang past Playwright's 120 s twice over.
await T(() => window.__lantern.setState({ ...window.__lantern.state(), patAutoBridge: true })); await T(() => window.__lantern.view('flat')); await T(() => window.__lantern.flush()); await page.waitForTimeout(200);
await page.locator('#secMaterial').evaluate((d) => { d.open = true; }); await page.locator('#secMaterial').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('material.png', await shotOf('#secMaterial'), 'Material & Machine: the stock, the machine, the bed, and every rule derived from the caliper (starting values)');
await page.locator('#secExport').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('export.png', await shotOf('#secExport'), 'Export: the plan on the default Glowforge bed — the halves split into point modules, pieces and sheets, the paper and its weight; the ZIP, the PNG, the quick half SVGs');
{
  const sheets = await T(() => window.__lantern.sheetSvgs().length);
  const zip = await (async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('#exportZip')]); return d.path(); })();
  const JSZip = (await import('node:module')).createRequire(import.meta.url)(path.join(REPO, 'node_modules/jszip'));
  const z = await JSZip.loadAsync(fs.readFileSync(zip));
  const first = Object.keys(z.files).find((n) => /sheet-1-of/.test(n));
  const svg = (await z.file(first).async('string')).replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="1320" height="744" style="background:#f4f2ec"');
  const sheetPage = await s.browser.newPage({ viewport: { width: 1340, height: 764 }, deviceScaleFactor: 2 });
  await sheetPage.setContent(`<body style="margin:10px;background:#333">${svg}</body>`); await sheetPage.waitForTimeout(100);
  save('sheet-1.png', await sheetPage.screenshot(SHOT), `sheet 1 of ${sheets} from the ZIP, rendered: a point module with its rim tabs, the seam tab on the right valley, the pattern's cuts, the labels on the ENGRAVE layer`);
  await sheetPage.close();
}
await T(() => window.__lantern.set('backing', true)); await page.waitForTimeout(500);
save('backing.png', await shotOf('.ln-preview'), 'tissue backing on, two colours of the warm palette alternating by point, seen through the cuts');
await T(() => window.__lantern.set('backingColours', 3)); await T(() => window.__lantern.set('palette', 'dusk')); await page.waitForTimeout(500);
save('backing-dusk.png', await shotOf('.ln-preview'), 'three colours, the dusk palette');
await page.locator('#secBacking').evaluate((d) => { d.open = true; }); await page.locator('#secBacking').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('backing-panel.png', await shotOf('#secBacking'), 'the Backing section: on / off, colours, the palette and its swatches');
await T(() => window.__lantern.view('lit')); await T(() => window.__lantern.fold.fit()); await page.waitForTimeout(800);
save('lit.png', await shotOf('.ln-preview', LIT_SHOT_MS), 'the Lit view, the page\'s opening view: a warm LED inside the star, the paper glowing, the cuts bright, the pattern thrown onto the wall and floor behind (the backing\'s tissue tinting the glow)');
await T(() => window.__lantern.set('backing', false)); await T(() => window.__lantern.set('litRoom', 0.3)); await page.waitForTimeout(600);
save('lit-day.png', await shotOf('.ln-preview', LIT_SHOT_MS), 'room darkness 30 %: the lamp against daylight, the thrown pattern fading into a lit room');
await T(() => window.__lantern.set('litRoom', 1)); await T(() => window.__lantern.set('litWarmth', 2000)); await T(() => window.__lantern.set('litWall', 1.2)); await page.waitForTimeout(600);
save('lit-candle.png', await shotOf('.ln-preview', LIT_SHOT_MS), 'a 2000 K candle-warm lamp, the room black, the wall close behind the star (1.2 radii — the slider\'s floor is 1.1, past the tips) so the thrown pattern is sharp and small');
await page.locator('#secLit').evaluate((d) => { d.open = true; }); await page.locator('#secLit').scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
save('lit-panel.png', await shotOf('#secLit', LIT_SHOT_MS), 'the Light section: warmth, brightness, room darkness, wall distance — view settings, saved with the design');
// Leave the Lit view through Folded and wait for TWO cheap frames to complete before hiding the canvas: a lit frame on
// the runner's software GL takes most of a minute (every lit cell above took ~60 s against its sub-second wait), and
// hiding the canvas while one is in flight left the next screenshot waiting on it past 120 s (runs 39777729024, 39780364382).
await T(() => window.__lantern.view('folded'));
await page.waitForFunction((n0) => window.__lantern.fold.frames() >= n0 + 2, await T(() => window.__lantern.fold.frames()), { timeout: 180000 });
await T(() => window.__lantern.view('build'));   // the canvas is stopped and hidden in Build, so putting the lit values back costs no lit render
await T(() => window.__lantern.set('litRoom', 0.85)); await T(() => window.__lantern.set('litWarmth', 2700)); await T(() => window.__lantern.set('litWall', 1.4)); await T(() => window.__lantern.set('backing', true));   // four lit rebuilds with the shadow pass on the runner's software GL hung the next screenshot for 120 s (run 39777729024)
await page.waitForTimeout(400);
save('build.png', await shotOf('.ln-preview'), 'the Build view: the eleven steps with this star\'s own counts, and the machine settings table (starting values)');
{
  const grid = await T(() => window.__lantern.testGridSvg());
  const gp = await s.browser.newPage({ viewport: { width: 1220, height: 740 }, deviceScaleFactor: 2 });
  await gp.setContent(`<body style="margin:10px;background:#333">${grid.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="1200" height="720" style="background:#f4f2ec"')}</body>`); await gp.waitForTimeout(100);
  save('test-grid.png', await gp.screenshot(SHOT), 'the test grid for the stock: bridges, holes, strokes and a score beside a cut, the derived value marked ◀ — cut this before the star');
  await gp.close();
}
await T(() => window.__lantern.set('backing', false)); await T(() => window.__lantern.view('folded'));
await T(() => window.__lantern.setState({ ...window.__lantern.state(), points: 5, slender: 0.38, depthFrac: 0.2, edgeMode: 'straight', edge: { mode: 'single', points: [[0, 0], [1, 0]] } }));
await page.waitForTimeout(300);
save('clamp.png', await shotOf('.ln-panel'), 'an infeasible target (slender 0.38 at 0.2 × width): Checks says the depth was clamped to the nearest closing depth and why');
await s.close();
const m = await openLantern({ storage: '', viewport: { width: 390, height: 844 }, dsf: 2 });
await m.page.waitForTimeout(600);
save('phone.png', await m.page.screenshot({ fullPage: true, ...SHOT }), 'at phone width: the preview first, the panel below');
await m.close();
const html = `<!doctype html><meta charset="utf-8"><title>/lantern contact sheet</title>
<style>body{background:#0A0A0C;color:#EDEDE8;font:12px 'Space Mono',monospace;margin:24px}figure{margin:0 0 28px}img{max-width:100%;border:1px solid #333}figcaption{color:#8A8A85;margin-top:6px}</style>
<h1 style="font-family:Georgia,serif;font-weight:600">/lantern — contact sheet</h1>
${cells.map((c) => `<figure><img src="${c.name}" alt=""><figcaption>${c.name} — ${c.caption}</figcaption></figure>`).join('\n')}`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(`\nwrote ${cells.length} cells to ${OUT}`);
