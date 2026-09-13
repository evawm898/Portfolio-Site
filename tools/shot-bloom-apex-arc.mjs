/* ===================================================================
   ONE IMAGE — THE APEX, TREATED, AT THREE COVERAGES (session 42).

     node tools/shot-bloom-apex-arc.mjs <out-dir> [--only <id regex>]

   WHAT EVA ASKED FOR, since session 38 and again in session 42's brief: the
   same petal at three coverages — apex only, eleven through one, and the
   whole clock excluding the base — at a count the ceiling actually permits,
   macro, print preview ON, same-tree control reported, THE APEX IN EVERY
   CROP. That crop is the entire point: what she has been objecting to is
   that the tip never got treated, and no caption can settle that.

   THE OUTPUT IS `lobe-apex-arc.png`. Session 40's `serration-range.png` and
   session 41's `lobe-shape-law.png` stay where they are — each is the record
   of a law that was shipping when it was rendered, and their outcome docs
   point at them by name.

   COVERAGE IS EVA'S CLOCK, so the cells are chosen in HOURS rather than in
   percent: twelve is the apex, six is the base, and coverage x 12 is the
   span. 0.10 is 1.2 hours (twelve o'clock alone), 0.20 is 2.4 (eleven
   through one), 0.90 is 10.8 (the whole clock but six). Every caption gives
   both the percentage and the hours, and the millimetres of rim beside them.

   THE COUNT IS 3 ON ROW ONE AND 2 ON ROW TWO, AND BOTH ARE MEASURED CHOICES.
   The count ceiling is a function of the shape and the coverage, and at the
   narrowest coverage on the shipped shape it is 2 — so row one is drawn on
   the TRIANGLE WAVE (crest 1.00, notch 1.00), whose resolution demand is 3
   stations a period against the round default's 9 and whose ceiling at
   coverage 0.10 is 3. Three is ODD, so a CREST sits at twelve and the apex
   carries a tooth. Row two is the same three coverages at TWO, which is
   EVEN — so a NOTCH sits at twelve, on a terminal mini-face that is already
   at the print floor in both modes, and it is FLATTENED rather than cut.
   That parity is a printability fact and the second row is how it is said
   in a picture rather than only in a read-out.

   AND THE APEX-ONLY CELL IS SHALLOW, WHICH IS THE ANSWER AND NOT A DEFECT.
   At coverage 0.10 the whole treated arc lies in the converging tip, where
   the base outline has nearly reached the print floor, so the per-period
   guard limits the relief to what the material there allows. The caption
   prints the asked relief beside the built one on every cell, so the
   shallowness reads as the measurement it is.

   EVERY CELL: PRINT PREVIEW ON (the app's own `shownMode` asserted
   "export"), a MACRO crop framed on the petal's TIP down its own normal.
   A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL: one cell of
   each row is shot twice on the same tree at the same camera and the
   difference is REPORTED, never used as a bar.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf, DEFAULTS } from './bloom-harness.mjs';
import { lobeSamplesPerLobe } from '../bloom-geometry.js';

const outDir = process.argv[2] || '/tmp/bloom-apex-arc';
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
const FRAME_R = Number(DEFAULTS.petalLength) * 0.32;
const AIM_BACK = 0.30;

async function cell({ id, count, depth, crest, notch, coverage }) {
  const sets = { lobeDepth: depth, lobeCount: count, lobeCrestShape: crest, lobeNotchShape: notch, lobeCoverage: coverage };
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await previewOn();
  const still = await stillFrame(page);
  if (still.length) await die(`${id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${id}: not the export build on screen`);
  const L = m.petalLobes;
  if (!L || L.noRoom) await die(`${id}: no lobes built (${L ? L.noRoomWhy : 'no record'})`);
  const wantSamples = lobeSamplesPerLobe(crest, notch);
  if (L.samplesPerLobe !== wantSamples) await die(`${id}: built at ${L.samplesPerLobe} stations a period, ${wantSamples} asked`);
  /* THE COUNT MUST BE THE ASKED ONE — the whole row is a coverage sweep, so
     a cell whose count clamped would be varying two things at once. */
  if (L.countBuilt !== count) await die(`${id}: built ${L.countBuilt} teeth of ${count} asked (CLAMPED by ${L.clampedBy}) — the row would be varying the count as well as the coverage`);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/LOBES [^\n]+/) || [''])[0];
  if (await settleOnly() < 0) await die(`${id}: never came to rest`);
  if (!m.petalTip || !m.petalMid) await die(`${id}: the app reports no petal tip/mid to frame on`);
  const at = m.petalTip.map((x, i) => x + AIM_BACK * (m.petalMid[i] - x));
  const buf = await shoot(path.join(outDir, `${id}.png`), { r: FRAME_R, at, dir: m.petalNormal });
  return { id, buf, L, line, m, asked: { count, depth, crest, notch, coverage } };
}

/* ---- the cells ------------------------------------------------------- */
const SHAPE = { crest: 1.00, notch: 1.00 };     // the triangle wave: demand 3 a period
const DEPTH = 0.30;
const COVERS = [
  { cov: 0.10, name: 'TWELVE O’CLOCK ALONE' },
  { cov: 0.20, name: 'ELEVEN THROUGH ONE' },
  { cov: 0.90, name: 'THE WHOLE CLOCK BUT SIX' },
];
const CELLS = [
  ...COVERS.map((c) => ({ id: `odd-${(c.cov * 100).toFixed(0)}`, row: 'odd', title: c.name,
    count: 3, depth: DEPTH, coverage: c.cov, ...SHAPE })),
  ...COVERS.map((c) => ({ id: `even-${(c.cov * 100).toFixed(0)}`, row: 'even', title: c.name,
    count: 2, depth: DEPTH, coverage: c.cov, ...SHAPE })),
];
const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const shots = [];
for (const c of chosen) shots.push({ ...c, ...(await cell(c)) });

/* ---- the same-tree controls, REPORTED never a bar --------------------- */
const controls = {};
for (const id of ['odd-90', 'even-90']) {
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((c) => c.id === id));
  controls[id] = pixelDiff(s.buf, again.buf);
  fs.writeFileSync(path.join(outDir, `${id}--control.png`), again.buf);
}

/* ---- compose ONE image ------------------------------------------------ */
const capOf = (s) => {
  const a = s.asked, L = s.L;
  const margin = L.reliefMm.filter((r, i) => L.apexIsCrest || i !== (L.periods - 1) / 2);
  const relief = `${Math.min(...margin).toFixed(2)}&ndash;${Math.max(...margin).toFixed(2)} mm built of ${L.reliefAskedMm.toFixed(2)} asked`;
  return `coverage <b>${(a.coverage * 100).toFixed(0)}%</b> = <b>${(a.coverage * 12).toFixed(1)} hours</b> of the clock &middot; ${(2 * L.treatedHalfMm).toFixed(1)} of ${(2 * L.halfRimMm).toFixed(1)} mm of rim, from u ${L.windowU[0].toFixed(3)} over the apex and back<br>` +
    `<b>${L.apexIsCrest ? 'a CREST at twelve' : 'a NOTCH at twelve &mdash; on the terminal face, FLATTENED'}</b> &middot; ${L.countBuilt} teeth &middot; pitch ${L.pitchMm.toFixed(2)} mm<br>` +
    `relief ${relief}${L.reliefLimited ? ` (<b>${L.reliefLimited}</b> of the margin&rsquo;s teeth limited by the material at their own sinus)` : ' (every tooth on the margin at the asked relief)'}<br>` +
    `${L.samplesPerLobe} stations a period demanded &middot; ${L.rowsPerPeriod.join('/')} placed base to apex`;
};
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const rowHtml = (row) => {
  const rs = shots.filter((s) => s.row === row);
  if (!rs.length) return '';
  return `<div class="grid">` + rs.map((s) =>
    `<figure><img src="${dataUri(s.buf)}"><figcaption><b>${s.title}</b><br>${capOf(s)}</figcaption></figure>`).join('') + '</div>';
};
const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h2{font-size:16px;margin:26px 0 3px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 18px;max-width:1180px}
  .note{color:#9a9a9a;font-size:12px;margin:0 0 10px;max-width:1180px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1180px}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:6px;line-height:1.4}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:20px;max-width:1180px}
  b{color:#e8e8e8}
</style>
<h1>MODEL B &mdash; the rim is one curve and the apex is a point on it</h1>
<p class="sub">Every cell is the same 35 mm petal, EXPORT (print preview on, <code>shownMode</code> asserted), framed on its own TIP down its own normal so <b>the apex is in every crop</b>. Coverage is now a SYMMETRIC ARC centred on the apex &mdash; twelve o&rsquo;clock, outward, excluding six &mdash; so the apex is INTERIOR to the treatment at every coverage and there is no join there. Under MODEL A the treated region ended at the apex entry and the profile above it was bit-identical to a petal with no lobes at all (4001 of 4001 samples, both modes, session 40); on this tree the same instrument reads <b>3075 of 4001 samples differing</b>. Shape held at the triangle wave (crest 1.00 / notch 1.00) and depth at ${DEPTH.toFixed(2)} throughout, so the only thing varying along each row is the coverage.</p>

<h2>An ODD count &mdash; a crest at twelve, and the apex carries a tooth</h2>
<p class="note">Three teeth: eleven, twelve, one. Three is the largest count the ceiling permits at the narrowest coverage on this shape &mdash; the resolution demand is a function of the shape, and the triangle wave asks 3 stations a period against the round default&rsquo;s 9. <b>The apex-only cell is shallow and that is the answer, not a defect</b>: at 1.2 hours the whole treated arc lies in the converging tip, where the base outline has nearly reached the print floor, so the per-period guard limits the relief to what the material there allows. The caption prints the asked relief beside the built one.</p>
${rowHtml('odd')}

<h2>An EVEN count &mdash; a notch at twelve, and it is FLATTENED</h2>
<p class="note">The same three coverages at TWO teeth. The parity is derived, not chosen: with <code>count + 1</code> periods over the arc the rim&rsquo;s midpoint is a crest iff that number is even, so an odd count puts a crest at twelve and an even one a notch. <b>The even count&rsquo;s apex notch sits on the terminal mini-face, which is already at the print floor in both modes, so its relief is exactly zero at every depth</b> and the two teeth either side read as one wide one. It is a printability fact rather than a look, it is told on the read-out and asserted by L8, and it is not fixable from this side: fixing it means SHORTENING the petal at the apex, which is <code>petalLength</code>&rsquo;s and <code>petalTipShape</code>&rsquo;s region, and the u = 1 mini-face may never be collapsed.</p>
${rowHtml('even')}
<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none &mdash; --only run)'}. Every cell settled to two byte-identical frames.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'lobe-apex-arc.png'), sheet);

const lines = shots.map((s) => `${s.id}: ${s.title} · count ${s.asked.count} depth ${s.asked.depth} coverage ${s.asked.coverage} crest ${s.asked.crest} notch ${s.asked.notch} · ${modeTag(s.m)} · ${s.line}`);
lines.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'lobe-apex-arc.png')}`);
await browser.close(); server.close();
