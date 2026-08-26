/*
 * diag-preset-headroom.mjs — how far can a visitor customise a preset before refusal?
 *
 * REPORT-ONLY DIAGNOSTIC, not a gate. Under docs/tools/ so it is not mistaken for one.
 *
 * WHY. `checkTriBudget` THROWS over LIVE_TRI_BUDGET. Going over is not degradation, it is
 * refusal: the last-good mesh stays on screen and the visitor gets a message. Presets are
 * starting points — somebody opens Dahlia in order to change it — so "how much of the
 * budget is left" is really "how many steps of an obvious control before the app says no".
 * A margin quoted as "1.14x under budget" does not answer that; this does.
 *
 * METHOD. Load a preset through its real gallery cell, read live triangles from the
 * readout, then step ONE control upward one notch at a time, re-reading after each rebuild,
 * until the readout turns into the refusal message (`triBudgetMessage`) or the slider hits
 * its maximum. Reports the number of accepted steps and the triangle count at the last
 * accepted one.
 *
 * SELF-CHECK (hard, aborts): the lever must actually move the triangle count. If stepping
 * it leaves tris unchanged, "steps to refusal" is measuring nothing, and the run fails
 * rather than reporting a large number that looks like headroom.
 *
 * NEGATIVE CONTROL:  node docs/tools/diag-preset-headroom.mjs --negative-control
 *   Steps `heightMM`, which rescales the model and must NOT change the triangle count. The
 *   self-check has to reject it. If the run passes, the check is not measuring anything.
 *
 * RUN:  node docs/tools/diag-preset-headroom.mjs [preset ...]
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { findChromium } from '../../tools/chromium-harness.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const THREE_VERSION = '0.161.0';
const MAX_STEPS = 40;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const { PRESETS } = await import(pathToFileURL(path.join(ROOT, 'flower-presets.js')).href);
const argv = process.argv.slice(2);
const NEGATIVE_CONTROL = argv.includes('--negative-control');
const named = argv.filter((a) => !a.startsWith('--')).map((s) => s.toLowerCase());
const targets = PRESETS.filter((p) => !named.length || named.includes(p.slug));

// Levers a visitor would actually reach for first. The lace lever is DERIVED from the
// design's own infill, because `density` only drives veins and voronoi — bone counts ribs
// with `boneCount`, strands with `strandCount`, growth with `spaceDensity`. Pointing the
// probe at `density` on a bone preset measures nothing, which is exactly what the
// self-check caught the first time this ran.
const LACE_LEVER = {
  veins:    { id: 'density',      step: 1, label: 'lace density +1' },
  voronoi:  { id: 'density',      step: 1, label: 'lace density +1' },
  bone:     { id: 'boneCount',    step: 1, label: 'bone count +1' },
  strands:  { id: 'strandCount',  step: 1, label: 'strand count +1' },
  spacecol: { id: 'spaceDensity', step: 0.05, label: 'source density +0.05' },
};
const leversFor = (ui) => NEGATIVE_CONTROL
  ? [{ id: 'heightMM', step: 5, label: 'heightMM (negative control — must NOT change tris)' }]
  : [{ id: 'petalCount', step: 1, label: 'petal count +1' }, LACE_LEVER[ui.infillType] || LACE_LEVER.veins];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/flower.html';
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 800 } })).newPage();
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.route('**cdn.jsdelivr.net/**', (route) => {
  const rel = new URL(route.request().url()).pathname.replace(`/npm/three@${THREE_VERSION}/`, '');
  try { route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three', rel)) }); }
  catch { route.abort(); }
});

const readout = () => page.evaluate(() => document.getElementById('readout').textContent);
// The refusal text is triBudgetMessage's: "~N triangles — over the M budget. Lower ...".
const refused = (t) => /over the [\d,]+ budget/.test(t);
const trisOf = (t) => { const m = /~([\d,]+) tris/.exec(t); return m ? Number(m[1].replace(/,/g, '')) : null; };

async function load(slug) {
  await page.goto(`http://127.0.0.1:${port}/flower.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => { const el = document.getElementById('readout'); return el && /tris/.test(el.textContent); }, { timeout: 60000 });
  await page.evaluate(() => { const t = document.getElementById('advancedToggle'); t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); });
  const ok = await page.evaluate((s) => {
    const cell = document.querySelector(`#presetRow .fl-preset[data-slug="${s}"]`);
    if (!cell) return false; cell.click(); return true;
  }, slug);
  await page.waitForTimeout(1200);
  return ok;
}

const bad = [];
const rows = [];
for (const p of targets) {
  for (const lever of leversFor(p.ui)) {
    if (!await load(p.slug)) { bad.push(`${p.name}: gallery cell not found`); continue; }
    const base = await readout();
    const baseTris = trisOf(base);
    if (baseTris == null) { bad.push(`${p.name}/${lever.id}: could not read a triangle count from the readout`); continue; }
    let steps = 0, lastTris = baseTris, hitMax = false, moved = false, atMaxFromStart = false;
    for (let i = 0; i < MAX_STEPS; i++) {
      const res = await page.evaluate(({ id, step }) => {
        const el = document.getElementById(id);
        if (!el) return { missing: true };
        const max = Number(el.max), cur = Number(el.value), next = cur + step;
        if (isFinite(max) && next > max) return { atMax: true, value: cur };
        el.value = String(next);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { value: Number(el.value) };
      }, lever);
      if (res.missing) { bad.push(`${p.name}: no control #${lever.id}`); break; }
      if (res.atMax) { hitMax = true; if (i === 0) atMaxFromStart = true; break; }
      await page.waitForTimeout(900);
      const t = await readout();
      if (refused(t)) break;
      const n = trisOf(t);
      if (n != null) { if (n !== lastTris) moved = true; lastTris = n; }
      steps++;
    }
    // SELF-CHECK: a lever that does not move the triangle count cannot measure headroom.
    // A control that was ALREADY at its maximum has no room to give; that is a real answer
    // ("this design cannot go further on this axis"), not a lever that fails to move.
    if (!moved && !atMaxFromStart) bad.push(`${p.name}/${lever.id}: stepping it never changed the triangle count (${baseTris} throughout) — this lever measures no headroom`);
    rows.push({ preset: p.name, lever: lever.label, baseTris, steps, lastTris, hitMax, atMaxFromStart });
  }
}
await browser.close();
server.close();

console.log(`preset headroom — steps of one control before LIVE_TRI_BUDGET refuses the rebuild\n`);
console.log('preset        lever                base tris    steps   tris at last accepted');
for (const r of rows) {
  console.log(`${r.preset.padEnd(13)} ${r.lever.padEnd(20)} ${String(r.baseTris).padStart(9)}   ${(r.hitMax ? `${r.steps}+` : String(r.steps)).padStart(5)}   ${String(r.lastTris).padStart(9)}${r.atMaxFromStart ? '   (control ALREADY at max — no room on this axis)' : r.hitMax ? '   (slider maxed, never refused)' : ''}`);
}
console.log('\n"steps" is how many notches were ACCEPTED. A trailing + means the slider ran out before the budget did.');

if (NEGATIVE_CONTROL) {
  if (bad.length) { console.log('\nNEGATIVE CONTROL: PASS — the self-check rejected a lever that does not move the triangle count.'); process.exit(0); }
  console.error('\nNEGATIVE CONTROL: FAILED — stepping heightMM was accepted as a headroom measurement.');
  console.error('The self-check is not measuring anything. Do not trust a result from this tool.');
  process.exit(1);
}
if (bad.length) {
  console.error(`\ndiag: INVALID — ${bad.length} self-check failure(s); no number above is trustworthy:`);
  for (const b of bad) console.error(`  - ${b}`);
  process.exit(1);
}
console.log('\ndiag: self-check passed — every lever moved the triangle count.');
