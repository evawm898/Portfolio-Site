#!/usr/bin/env node
/* ===================================================================
   THE SPINE CURVE'S DRAG COST (F3-global). A drag on a handle of the live
   `petalSpineCurve` editor rides F7's drag path: pointerdown on the editor's
   svg arms the drag, every `input` the editor fires rebuilds the drag-light
   geometry (infill cells dropped), and the release pays the full build. This
   measures that on a HEAVY configuration — the Voronoi infill on 40 petals
   over three whorls, the infill's own budget corner — and on the shipping
   petal, reading the page's own build counters (`__bloomDragState`,
   `__bloomBuildState`) and wall-clock per build. Numbers are this box's and
   are quoted as such; the ratio light/full is the figure that travels.

   RUN:  node tools/bloom-spine-curve-drag-cost.mjs
   =================================================================== */
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild } from './bloom-harness.mjs';

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: 1100, height: 800 } });
const HOOK = { mode: 'single', points: [[0, 0], [0.55, 0.1], [0.75, 0.45], [0.5, 0.6], [0.3, 0.45]] };
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: typeof value === 'string' ? value : JSON.stringify(value) }));
const waitBuilds = async (n) => { await page.waitForFunction((k) => window.__bloomBuildState().count >= k && !window.__bloomBuildState().pending, n, { timeout: 120000 }); };

for (const [name, sets] of [
  ['the shipping petal, CURVE mode', { petalCurlMode: 'CURVE', petalSpineCurve: HOOK }],
  ['the infill corner — VORONOI on 40 petals x 3 whorls, CURVE mode', { petalCurlMode: 'CURVE', petalSpineCurve: HOOK, petalInfill: 'VORONOI', petalCount: 40, layerCount: 3 }],
]) {
  await openBloom(page, port, { asShipped: true });
  const bad = await applyConfig(page, set(sets), null, { settleMs: 120000 });
  if (bad.length) throw new Error(`${name}: ${bad.join('; ')}`);
  await page.evaluate(() => { for (let d = document.getElementById('petalSpineCurve').closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; document.getElementById('petalSpineCurve').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(200);
  /* one full build at rest, timed through the page's own counter */
  const t0 = Date.now(), c0 = await page.evaluate(() => window.__bloomBuildState().count);
  await page.evaluate(() => { const el = document.getElementById('petalLength'); el.value = String(Number(el.value) + 1); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await waitBuilds(c0 + 1);
  const fullMs = Date.now() - t0;
  /* a real drag on point 2 of the hook, ten steps, each step waiting for its build */
  const from = await page.evaluate(() => document.getElementById('petalSpineCurve').curveEditor.pointClient('left', 2));
  const to = await page.evaluate(() => document.getElementById('petalSpineCurve').curveEditor.fracClient('left', [0.7, 0.4]));
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  const lightBefore = (await page.evaluate(() => window.__bloomDragState())).lightBuilds;
  const steps = 8, stepMs = [];
  for (let i = 1; i <= steps; i++) {
    const c = await page.evaluate(() => window.__bloomBuildState().count);
    const t = Date.now();
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await waitBuilds(c + 1);
    stepMs.push(Date.now() - t);
  }
  const mid = await page.evaluate(() => window.__bloomDragState());
  const c1 = await page.evaluate(() => window.__bloomBuildState().count), t1 = Date.now();
  await page.mouse.up();
  await waitBuilds(c1 + 1);
  await settleBuild(page, 120000);
  const releaseMs = Date.now() - t1;
  const after = await page.evaluate(() => window.__bloomDragState());
  const med = stepMs.slice().sort((a, b) => a - b)[Math.floor(stepMs.length / 2)];
  console.log(`${name}\n  full build at rest: ${fullMs} ms · per drag step (median of ${steps}): ${med} ms (${stepMs.join(' / ')}) · release: ${releaseMs} ms\n  dragging mid-drag: ${mid.dragging}, light on screen mid-drag: ${mid.lightOnScreen}, light builds during the drag: ${mid.lightBuilds - lightBefore}; after release light on screen: ${after.lightOnScreen}`);
}
await browser.close(); server.close();
