/* ===================================================================
   ONE IMAGE — ONE GENERATOR, FROM SERRATION TO LOBING (session 40, item 5).

     node tools/shot-bloom-serration-range.mjs <out-dir> [--only <id regex>]

   WHAT EVA ASKED FOR: three cells on the SAME petal showing the four
   controls doing what she described — (a) serration, high count / low depth /
   acute; (b) lobing, low count / high depth / obtuse; (c) the midpoint.

   WHAT THE SHIPPED CONTROLS CAN REACH, AND WHAT THEY CANNOT. The COUNT axis
   is inert on the shipping tree: `ladderWindowCapacity` over
   LOBE_SAMPLES_PER_LOBE caps the built count at TWO at every coverage on
   every petal length the range offers (session 38 §B10.2, re-measured this
   session by `tools/bloom-lobe-model-b.mjs --section=4`), so "high count" is
   not a slider position — it is a state the row placer cannot resolve. So the
   image is TWO ROWS of the same three cells:

     row 1  SHIPPED — the three states as the sliders actually reach them.
            Every cell is 2 lobes, because 2 is the cap; the count axis is
            therefore not being shown, and the caption says so.
     row 2  AS DESCRIBED — the same depth and sharpness at Eva's counts,
            through the CAPABILITY hook (`lobeSamplesPerLobe`), which is the
            non-shipping mechanism the floor demonstration already uses. Each
            caption names the stations per lobe it was drawn at and whether
            that is under the shipped floor of 11 — a shape drawn under the
            floor is a polygon, and saying so is the point of the row.

   EVERY CELL: PRINT PREVIEW ON (the app's own `shownMode` asserted "export"),
   a MACRO crop framed on the petal's TIP down its own normal, so THE APEX IS
   IN EVERY CROP — it is the thing being judged. Every caption carries all
   four control values, the built count against the asked one, and the
   stations per lobe the ladder emitted.

   A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL: the first cell
   of each row is shot twice on the same tree at the same camera and the
   difference is REPORTED, never used as a bar.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf, DEFAULTS } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-serration-range';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 620, DPR = 2;
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

async function settleOnly() {
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let a = null, b = null;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    const c = await page.screenshot({ clip, timeout: 180000 });
    if (a && b && c.equals(b) && b.equals(a)) return k;
    a = b; b = c;
  }
  return -1;
}
async function shoot(file, frame) {
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null), frame);
  const settled = await settleOnly();
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  if (settled < 0) await die(`${path.basename(file)}: never settled in 90 frames`);
  fs.writeFileSync(file, buf);
  return buf;
}
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4) if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  return n;
}
async function previewOn() {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const got = await shownModeOf(page);
  if (got !== 'export') await die(`print preview ON asked for, app reports shownMode "${got}"`);
}

/* THE FRAME IS THE PETAL'S TIP, down the petal's own normal — read from the
   app's metrics, never a layout guess — at a radius that holds the apex and
   the stretch of rim below it. */
const FRAME_R = Number(DEFAULTS.petalLength) * 0.30;
/* Aimed a third of the way back from the tip toward the petal's midpoint —
   both read from the app's own metrics, never a layout guess — so the apex
   sits in the upper third and the treated rim below it fills the frame
   instead of half the cell being sky. */
const AIM_BACK = 0.33;

async function cell({ id, count, depth, q, coverage, samples }) {
  const sets = { lobeDepth: depth, lobeCount: count, lobeTipShape: q, lobeCoverage: coverage };
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (samples !== null) {
    const capName = await page.evaluate((n) => { window.__bloomCapability({ label: 'LOBE_SAMPLES', lobeSamplesPerLobe: n, lobeExactDemand: true }); return window.__bloomMetrics().capability; }, samples);
    if (capName !== 'LOBE_SAMPLES') await die(`${id}: capability reads back ${JSON.stringify(capName)}`);
  }
  await previewOn();
  const still = await stillFrame(page);
  if (still.length) await die(`${id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${id}: not the export build on screen`);
  const L = m.petalLobes;
  if (!L || L.noRoom) await die(`${id}: no lobes built`);
  const want = samples === null ? 11 : samples;
  if (L.samplesPerLobe !== want) await die(`${id}: built at ${L.samplesPerLobe} stations a lobe, ${want} asked`);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/LOBES [^\n]+/) || [''])[0];
  if (await settleOnly() < 0) await die(`${id}: never came to rest`);
  if (!m.petalTip || !m.petalMid) await die(`${id}: the app reports no petal tip/mid to frame on`);
  const at = m.petalTip.map((x, i) => x + AIM_BACK * (m.petalMid[i] - x));
  const frame = { r: FRAME_R, at, dir: m.petalNormal };
  const buf = await shoot(path.join(outDir, `${id}.png`), frame);
  return { id, buf, frame, L, line, m,
    asked: { count, depth, q, coverage }, samples: L.samplesPerLobe,
    built: L.countBuilt, rowsPerLobe: L.rowsPerLobe, rowsInWindow: L.rowsInWindow };
}

/* ---- the six cells ---------------------------------------------------- */
const COVER = 1.00;
const CELLS = [
  { id: 'ship-a', row: 'ship', title: 'SERRATION as far as the sliders go',
    count: 8, depth: 0.15, q: 0.50, coverage: COVER, samples: null },
  { id: 'ship-c', row: 'ship', title: 'THE MIDPOINT',
    count: 4, depth: 0.45, q: 1.25, coverage: COVER, samples: null },
  { id: 'ship-b', row: 'ship', title: 'LOBING',
    count: 2, depth: 0.75, q: 2.00, coverage: COVER, samples: null },
  { id: 'desc-a', row: 'desc', title: 'SERRATION as described',
    count: 8, depth: 0.15, q: 0.50, coverage: COVER, samples: 3 },
  { id: 'desc-c', row: 'desc', title: 'THE MIDPOINT as described',
    count: 4, depth: 0.45, q: 1.25, coverage: COVER, samples: 7 },
  { id: 'desc-b', row: 'desc', title: 'LOBING as described',
    count: 2, depth: 0.75, q: 2.00, coverage: COVER, samples: 11 },
];
const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const shots = [];
for (const c of chosen) shots.push({ ...c, ...(await cell(c)) });

/* ---- the same-tree controls, REPORTED never a bar --------------------- */
const controls = {};
for (const id of ['ship-a', 'desc-a']) {
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((c) => c.id === id));
  controls[id] = pixelDiff(s.buf, again.buf);
  fs.writeFileSync(path.join(outDir, `${id}--control.png`), again.buf);
}

/* ---- compose ONE image ------------------------------------------------ */
const capOf = (s) => {
  const a = s.asked;
  const clamp = s.built < a.count ? ` (CLAMPED from ${a.count} — the ladder cannot resolve more)` : '';
  return `count ${s.built}${clamp} · depth ${a.depth.toFixed(2)} · sharpness ${a.q.toFixed(2)} · coverage ${(a.coverage * 100).toFixed(0)}%<br>` +
    `${s.samples} stations a lobe${s.samples < 11 ? ' — <b>UNDER the shipped floor of 11</b>' : ''} · ${s.rowsPerLobe.toFixed(1)} rows per lobe emitted · ${s.rowsInWindow} stations in the window`;
};
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const rowHtml = (row, heading, note) => {
  const rs = shots.filter((s) => s.row === row);
  if (!rs.length) return '';
  return `<div class="rowhead">${heading}</div><div class="note">${note}</div><div class="grid">` +
    rs.map((s) => `<figure><img src="${dataUri(s.buf)}"><figcaption><b>${s.title}</b><br>${capOf(s)}</figcaption></figure>`).join('') +
    '</div>';
};
const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 18px;max-width:1180px}
  .rowhead{font-size:14px;font-weight:600;margin:16px 0 2px;color:#fff}
  .note{color:#9a9a9a;font-size:12px;margin:0 0 10px;max-width:1180px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1180px}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:6px;line-height:1.4}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:20px;max-width:1180px}
  b{color:#e8e8e8}
</style>
<h1>One generator, serration to lobing — the shipping default petal, EXPORT (print preview on)</h1>
<p class="sub">Every cell is the same 35 mm petal at coverage ${(COVER * 100).toFixed(0)}%, framed on its own TIP down its own normal, so the apex is in every crop. Depth is a fraction of the local half-width; sharpness is <code>lobeTipShape</code> (0.50 pointed crest &rarr; 2.00 flat-topped crest).</p>
${rowHtml('ship', 'ROW 1 — what the shipped sliders reach', 'The COUNT axis is inert here: the row placer caps the built count at TWO at every coverage on every petal length in the range, so all three cells are two lobes and only depth and sharpness are varying. Serration is not a slider position on this tree.')}
${rowHtml('desc', 'ROW 2 — the same depth and sharpness at Eva&rsquo;s counts, through the CAPABILITY hook (NOT SHIPPING)', 'The station floor is lowered per cell so the count can be built at all. A shape drawn under the floor of 11 is a polygon rather than the law&rsquo;s curve — that is what the serration cell is showing, and it is the cost of the count, not a property of the shape.')}
<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ') || '(none — --only run)'}. Every cell settled to two byte-identical frames; <code>shownMode</code> asserted &ldquo;export&rdquo; on each.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'serration-range.png'), sheet);

const lines = shots.map((s) => `${s.id}: ${s.title} · asked count ${s.asked.count} depth ${s.asked.depth} sharpness ${s.asked.q} coverage ${s.asked.coverage} · built ${s.built} at ${s.samples} stations a lobe · ${modeTag(s.m)} · ${s.line}`);
lines.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'serration-range.png')}`);
await browser.close(); server.close();
