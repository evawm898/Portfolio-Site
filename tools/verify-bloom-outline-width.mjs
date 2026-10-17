#!/usr/bin/env node
/* ===================================================================
   THE OUTLINE WIDTH GATE (F6-sym-2, Oct 17 — Eva's ruling: in CURVE mode
   Petal width SCALES the drawn curve's widths, and a width drag that would put
   a scaled point under the print floor is REFUSED through the outline's own
   validator, the editor saying which point; docs/bloom-outline-curve-2-
   outcome.md). Browser only, through the real page and the real slider events.

     WD0  ACCEPTED: on the default curve a width drag to 24 mm builds, the
          build's outline record carries the 1.5x scale, and no refusal shows.
     WD1  REFUSED: on the long tail (whose 0.03-of-the-length run is 1.05 mm
          wide at 16 mm and 0.66 mm at 10) a drag to 10 mm is refused — the
          slider reads 16 again, the build on screen is still the 16 mm one
          (scale 1, no point lifted), and the outline editor's status line
          names the Petal width and the point.
     WD2  LAW IS NEVER REFUSED: the same drag in LAW mode builds 10 mm.

   OC2 (both STL gates) holds the VALIDATOR and the BUILD to one decision on
   every row; this gate is the only witness that the SLIDER asks it — a width
   listener that never ran would leave every OC clause green, since the build
   then lifts and tells.

   `--negative-control` serves two broken copies of bloom.js through the page
   route and requires WD1 to redden on each: the listener never registered, and
   the candidate's width never reaching the validator (every scale left at the
   build's own). Every anchor is checked before any copy is served.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, settleBuild } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEGATIVE = process.argv.includes('--negative-control');
const TAIL = { mode: 'symmetric', points: [[0, 0.06], [0.15, 0.14], [0.3, 0.12], [0.5, 0.05], [0.85, 0.03], [1, 0]] };
const DEF = { mode: 'symmetric', points: [[0, 0.05], [0.15, 0.16], [0.36, 0.2286], [0.7, 0.178], [0.9, 0.1], [1, 0]] };

async function drag(page, value) {
  await page.evaluate((v) => { const w = document.getElementById('petalWidth'); w.value = String(v); w.dispatchEvent(new Event('input', { bubbles: true })); w.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  await settleBuild(page);
}
const facts = (page) => page.evaluate(() => {
  const m = window.__bloomMetrics();
  const tc = (m.petalRingTipCap || []).find((x) => x) || null;
  const o = tc && tc.outline;
  const st = document.querySelector('#petalOutlineCurve')?.closest('.bl-ctrl')?.querySelector('.bl-curve-status');
  return { width: document.getElementById('petalWidth').value, scale: o ? o.scale : null, lifted: o ? o.lifted.length : null,
           status: st && !st.hidden ? st.textContent : '' };
});

async function run(port, override = null) {
  const { browser, page } = await launchPage({ viewport: { width: 1400, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  if (override) await page.route('**/bloom.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: override }));
  const out = {};
  try {
    const go = async (sets) => { await openBloom(page, port); const bad = await applyConfig(page, sets); if (bad.length) throw new Error(bad.join('; ')); };
    const CV = (c) => [{ id: 'petalOutlineMode', value: 'CURVE' }, { id: 'petalOutlineCurve', value: JSON.stringify(c) }];
    /* WD0 */
    await go(CV(DEF)); await drag(page, 24);
    { const f = await facts(page); out.WD0 = (f.width === '24' && Math.abs(f.scale - 1.5) < 1e-12 && !f.status) ? null : `a drag to 24 mm on the default curve: slider ${f.width}, built scale ${f.scale}, status ${JSON.stringify(f.status)} — want 24, 1.5, none`; }
    /* WD1 */
    await go(CV(TAIL)); await drag(page, 10);
    { const f = await facts(page); out.WD1 = (f.width === '16' && f.scale === 1 && f.lifted === 0 && /Petal width 10 mm/.test(f.status) && /point \d+/.test(f.status)) ? null : `a drag to 10 mm on the long tail: slider ${f.width}, built scale ${f.scale}, lifted ${f.lifted}, status ${JSON.stringify(f.status)} — want the slider back at 16, the 16 mm build, and the editor naming the width and the point`; }
    /* WD2 */
    await go([]); await drag(page, 10);
    { const f = await facts(page); out.WD2 = f.width === '10' ? null : `a drag to 10 mm in LAW mode left the slider at ${f.width}`; }
    if (errors.length) out.page = `page errors: ${errors.join(' | ')}`;
  } finally { await browser.close(); }
  return out;
}

const { server, port } = await serveRepo();
const src = fs.readFileSync(path.join(ROOT, 'bloom.js'), 'utf8');
const MUTANTS = [
  { id: 'the-width-listener-never-runs', find: "window.addEventListener('input', onWidthEdit, true);\nwindow.addEventListener('change', onWidthEdit, true);", into: '' },
  { id: 'the-candidate-width-never-reaches-the-validator', find: "scale: outlineWidthScale({ petalWidth: o.widthMm + widthDelta })", into: 'scale: o.scale' },
];
let failed = false;
if (NEGATIVE) {
  for (const mu of MUTANTS) { const n = src.split(mu.find).length - 1; if (n !== 1) { console.log(`ANCHOR: ${mu.id} matches ${n}x — disarmed`); failed = true; } }
  if (!failed) for (const mu of MUTANTS) {
    const r = await run(port, src.replace(mu.find, mu.into));
    const fired = r.WD1 !== null;
    console.log(`  ${fired ? 'caught' : 'MISSED'}  ${mu.id}${fired ? ` — WD1: ${r.WD1}` : ''}`);
    if (!fired) failed = true;
  }
  console.log(`\nOUTLINE WIDTH GATE (negative control): ${failed ? 'FAILED' : 'every mutant reddened WD1'}`);
} else {
  const r = await run(port);
  for (const [k, v] of Object.entries(r)) { console.log(`  ${v ? 'FAIL' : 'ok  '} ${k}${v ? `: ${v}` : ''}`); if (v) failed = true; }
  console.log(`\nOUTLINE WIDTH GATE: ${failed ? 'FAIL' : 'PASS — the width scales the curve, a narrowing drag is refused and told, LAW is never refused'}`);
}
server.close();
process.exit(failed ? 1 : 0);
