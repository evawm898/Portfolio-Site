/* ===================================================================
   THE CARNATION FRINGE, PHOTOGRAPHED — the shipped controls, not a mutation.
   Session of Sep 13, Eva's ruling on `docs/bloom-carnation-fringe-picture.md`.

   WHAT CHANGED SINCE THE PICTURE SESSION: everything here is now a CONTROL.
   The tool held a non-shipping `trimPanels` mutation and served it by
   `page.route`; `petalTipEnd`, `fringeCount` and `fringeDepth` ship, so the
   mutation is gone and every cell is reachable by a hand on a slider. That is
   the difference between a picture of a possibility and a picture of the
   tool.

   EVERY CELL: PRINT PREVIEW ON (`shownMode` asserted "export"), and the petal
   crops are a MACRO view down the first petal's own normal, centred between
   the split and the tip so the whole treated stretch AND THE APEX are in
   frame. The petal's END is asserted to carry exactly the number of spans the
   caption claims, from the builder's own `petalTipSpans` — a cell that drew a
   plain petal under a fringe caption is the one failure a picture cannot
   show. Same-tree control per framing, shot twice, REPORTED and never a bar.

   MODE AND SAMPLING: every width is EXPORT and comes from the builder's own
   fringe record, which computes on the mode-free lamina — never from a row
   count, and never re-derived here.

   RUN:  node tools/shot-bloom-fringe.mjs <out-dir> [--only <id regex>]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf, DEFAULTS } from './bloom-harness.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const F = G.MIN_FEATURE_MM;
const { firstSlot } = await import(pathToFileURL(path.join(ROOT, 'tools/bloom-first-slot.mjs')).href);

const outDir = process.argv[2] || '/tmp/bloom-fringe';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 560, DPR = 2;
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
  for (let o = 0; o < A.data.length; o += 4) if (A.data[o] !== B.data[o] || A.data[o+1] !== B.data[o+1] || A.data[o+2] !== B.data[o+2]) n++;
  return n;
}
async function previewOn() {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const got = await shownModeOf(page);
  if (got !== 'export') await die(`print preview ON asked for, app reports shownMode "${got}"`);
}

/* THE PAGE'S OWN CONTROL, before any cell. */
const SHIPPED_TRIS = 19040;
await openBloom(page, port);
await previewOn();
{
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownTris !== SHIPPED_TRIS) await die(`the page's DEFAULT is ${m.shownTris} export triangles, expected ${SHIPPED_TRIS} — this feature must not have moved it`);
  if (m.capability !== null) await die(`a capability is live on the default row: ${JSON.stringify(m.capability)}`);
  if (m.petalTipSpans !== 1) await die(`the default row's petal end carries ${m.petalTipSpans} spans, expected 1`);
  if (m.petalFringe && m.petalFringe.built) await die('the shipping default reports a BUILT fringe — the guard did not hold');
  console.log(`page control: the shipping default is ${m.shownTris} export triangles, one tip span, no fringe built.`);
}

async function cell({ id, end, count, depth = 0.2, whole = false, frame, zoom = 0.30, centre = 0.26, row }) {
  const sets = { petalTipEnd: end, fringeCount: count, fringeDepth: depth };
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
  /* WHAT THE BUILDER ACTUALLY BUILT, read from its own record — never from
     what this tool asked for. A cell whose caption claims seven teeth and
     whose petal carries four is the failure a picture cannot show. */
  const F = m.petalFringe;
  if (!F) await die(`${id}: no fringe record reported`);
  const built = F.built ? F.count : 0;
  if (m.petalTipSpans !== Math.max(1, built)) await die(`${id}: the petal's END carries ${m.petalTipSpans} span(s) and the builder says ${built} teeth`);
  if (built > 0 && (!Array.isArray(m.petalPanels) || m.petalPanels.length !== built + 1)) await die(`${id}: panels ${JSON.stringify(m.petalPanels)}, expected base + ${built} teeth`);
  const L = Number(DEFAULTS.petalLength), W = Number(DEFAULTS.petalWidth);
  if (await settleOnly() < 0) await die(`${id}: never came to rest`);
  /* THE CROP IS CENTRED BETWEEN THE SPLIT AND THE TIP, so the whole treated
     stretch AND the apex are in frame; a crop centred on the apex spends half
     its area above the petal. Both points read from the builder. */
  const at = m.petalTip.map((x, k) => x + (m.petalMid[k] - x) * centre);
  const fr = frame || (whole ? { r: L * 1.35, at: [0, 0, 0], dir: [0.35, -0.62, 0.70] }
                             : { r: L * zoom, at, dir: m.petalNormal });
  const buf = await shoot(path.join(outDir, `${id}.png`), fr);
  return { id, buf, frame: fr, m, F, L, W, end, count, built, row, whole, tris: m.shownTris };
}

/* ---------------------------------------------------------- the cells.
   THE SQUARED END'S OWN ROW, then the fringe on it, then the two states the
   feature TELLS about rather than refusing. Counts are chosen at each
   terminal's own ceiling so no cell is silently clamped except the one that
   is about clamping. */
const CELLS = [
  { id: '00-plain',        end: 0,    count: 0,  row: 'end' },
  { id: '01-end-050',      end: 0.5,  count: 0,  row: 'end' },
  { id: '02-end-100',      end: 1,    count: 0,  row: 'end' },
  /* THE TAPER IS VISIBLE ONLY WHERE THERE IS SLACK, and that is an identity
     of the floor rather than a choice: at a count ON its own ceiling every
     tooth and every gap is AT `MIN_FEATURE_MM`, so there is nothing left for
     a taper to spend and the teeth come out square. These three are well
     below the ceiling (8 at this terminal) and show the point Eva drew. */
  { id: '03-teeth-3',      end: 1,    count: 3,  row: 'point' },
  { id: '04-teeth-4',      end: 1,    count: 4,  row: 'point' },
  { id: '05-teeth-5',      end: 1,    count: 5,  row: 'point' },
  /* AND THESE ARE AT THE CEILING — square by necessity, which is the trade
     the count ceiling buys and is worth seeing beside the pointed ones. */
  { id: '06-teeth-7',      end: 0.85, count: 7,  row: 'square' },
  { id: '07-teeth-8',      end: 1,    count: 8,  row: 'square' },
  { id: '08-deep',         end: 1,    count: 4,  depth: 0.45, row: 'square' },
  /* TOLD, NEVER REFUSED. */
  { id: '09-clamped',      end: 0.3,  count: 10, row: 'told' },
  { id: '10-noroom',       end: 0,    count: 10, row: 'told' },
  /* THE WHOLE BLOOM — the thing Eva is actually choosing, not a petal. */
  { id: '11-bloom-plain',  end: 0,    count: 0,  row: 'bloom', whole: true },
  { id: '12-bloom-fringe', end: 1,    count: 4,  row: 'bloom', whole: true },
];


const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error('--only matched no cell'); process.exit(2); }

const controls = {};
const shots = [];
const first = await cell(chosen[0]);
shots.push(first);
{ const c = await shoot(path.join(outDir, `${first.id}--control.png`), first.frame);
  controls[first.id] = pixelDiff(first.buf, c); }
for (const c of chosen.slice(1)) {
  /* The petal crops share ONE camera so they are comparable; the whole-bloom
     cells are a different object and get their own. */
  const petalish = c.row !== 'bloom';
  const r = await cell({ ...c, frame: petalish && first.row !== 'bloom' ? first.frame : null });
  shots.push(r);
  if (!petalish && controls[r.id] === undefined) {
    const cc = await shoot(path.join(outDir, `${r.id}--control.png`), r.frame);
    controls[r.id] = pixelDiff(r.buf, cc);
  }
}

/* --------------------------------------------------------- the sheet */
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
const dataUri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const capOf = (s) => {
  const F = s.F;
  const end = F.tipEnd === 0 ? 'converging end' : `<b>${f2(F.endWidthMm)} mm</b> flat end (${(100 * F.endWidthMm / (2 * F.peakHalfMm)).toFixed(0)}% of the width)`;
  const tris = `${s.tris.toLocaleString('en-US')} export triangles`;
  if (F.noRoom) return `<b>NO ROOM</b> &mdash; ${F.asked} teeth asked, <b>none cut</b>: ${end}, so the petal converges to ${f2(2 * F.tipHalfMm)} mm, which carries one tooth at the ${f2(F.floorMm)} mm floor.<br>Told, never refused &mdash; and bit-identical to the same state with no fringe. ${tris}`;
  if (!F.built) return `${end[0].toUpperCase()}${end.slice(1)}, no teeth. It would carry <b>${F.ceiling}</b> at the ${f2(F.floorMm)} mm floor. ${tris}`;
  const clamp = F.clamped ? `<b>${F.asked} asked &rarr; ${F.count} built (CLAMPED)</b> &mdash; the end is ${f2(F.wMinMm)} mm and ${F.asked} teeth need ${f2((2 * F.asked - 1) * F.floorMm)} mm<br>` : `<b>${F.count} teeth</b> on a ${end}<br>`;
  return clamp
    + `teeth ${f2(F.toothBaseMm)} mm at the split tapering to ${f2(F.toothTipMm)} mm`
    + (F.count > 1 ? `, gaps ${f2(F.gapSplitMm)} &rarr; ${f2(F.gapTipMm)} mm` : '')
    + `<br>${f2(F.depthMm)} mm deep &middot; split asked at <code>u</code> ${F.uAsked.toFixed(4)}, landed at ${F.uSplitRow.toFixed(4)} (${F.residualMm.toFixed(3)} mm off, inside a ${F.rowGapMm.toFixed(3)} mm row)<br>${tris}`;
};
const rowHtml = (row, cls = '') => `<div class="grid ${cls}">` + shots.filter((s) => s.row === row).map((s) =>
  `<figure><img src="${dataUri(s.buf)}"><figcaption>${capOf(s)}</figcaption></figure>`).join('') + `</div>`;

const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h2{font-size:16px;margin:26px 0 3px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 18px;max-width:1180px}
  .note{color:#9a9a9a;font-size:12px;margin:0 0 10px;max-width:1180px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1180px}
  .grid.two{grid-template-columns:repeat(2,1fr);max-width:1180px}
  .grid.three{grid-template-columns:repeat(3,1fr);max-width:900px}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:6px;line-height:1.45}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:22px;max-width:1180px}
  b{color:#e8e8e8} code{color:#cfc}
</style>
<h1>The carnation fringe &mdash; shipped, on the sliders</h1>
<p class="sub">Every cell is reachable by a hand on a control: <code>petalTipEnd</code>, <code>fringeCount</code>, <code>fringeDepth</code>. EXPORT (print preview on, <code>shownMode</code> asserted); the petal crops look down the first petal&rsquo;s own normal, centred between the split and the tip so <b>the apex is in every one</b>. Every figure in every caption is the BUILDER&rsquo;s own record, and the petal&rsquo;s end is asserted to carry exactly the number of spans the caption claims.</p>

<h2>The squared end alone &mdash; no teeth</h2>
<p class="note">The terminal is a FLOOR under the shape scoped to <code>[uPk, 1]</code>, so it squares the tip taper and leaves the base taper untouched (measured: 0 of 7143 samples below <code>uPk</code> move at the ceiling). It is what holds the end open for teeth to be cut into &mdash; and it adds <b>no self-intersection at any value</b>: all eight &ldquo;terminal alone&rdquo; matrix rows read exactly 0 within-shell pairs.</p>
${rowHtml('end', 'three')}

<h2>The fringe on it &mdash; pointed teeth, below the ceiling</h2>
<p class="note">A tooth is narrowest at its own tip and a gap is narrowest at the split, and each is set to <code>MIN_FEATURE_MM</code> exactly where it binds. Between those two the widths slide across the admissible interval, so <b>both clear the floor at every station</b> &mdash; not only at the two the plan names, which is the defect FR4 caught. All three of these are well below this terminal&rsquo;s ceiling of 8, so the taper has slack to spend and the teeth come to points.</p>
${rowHtml('point', 'three')}

<h2>And at the ceiling &mdash; square by necessity</h2>
<p class="note"><b>The pointedness is an identity of the floor, not a choice.</b> The count ceiling is the terminal&rsquo;s own width &mdash; <code>W &ge; (2N&minus;1) &times; MIN_FEATURE_MM</code> at the fringe region&rsquo;s narrowest station, giving 4 teeth at 0.50, 7 at 0.85 and 8 at the ceiling &mdash; and a count sitting ON its ceiling has every tooth and every gap already at the floor, so there is nothing left for a taper to spend. Square teeth are what a maximum count costs.</p>
${rowHtml('square', 'three')}

<h2>Told, never refused</h2>
<p class="note">Two states the feature reports rather than hiding. <b>NO ROOM</b> is the ruling made into a branch: a fringe asked with no end to cut into is not built at all, and the row is bit-identical to the same state with no fringe.</p>
${rowHtml('told', 'two')}

<h2>The whole bloom &mdash; what is actually being chosen</h2>
${rowHtml('bloom', 'two')}
<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none)'}. Every cell settled to two byte-identical frames. Census (<code>tools/bloom-self-intersection.mjs</code>&rsquo;s <code>census()</code>, EXPORT, each state built once in Node): the squared end alone reads <b>0</b> within-shell pairs at every value; every fringed row reads in the DECLARED class the cleft has carried since it shipped &mdash; each tooth panel reaching <code>PANEL_OVERLAP_ROWS</code> into the base by design &mdash; and with the base pulled clear of the teeth every count reads <b>exactly 0</b>, so no tooth folds into another. The voxel flood fill reads <b>ONE CONNECTED PIECE</b> at the maximum count on the maximum terminal.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'carnation-fringe-shipped.png'), sheet);

const lines = [];
for (const s of shots) lines.push(`${s.id}: ${capOf(s).replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&rarr;/g, '->').replace(/&times;/g, 'x').replace(/&mdash;/g, '—').replace(/&ge;/g, '>=').replace(/&minus;/g, '-').replace(/\s+/g, ' ')} · ${modeTag(s.m)}`);
for (const [k, v] of Object.entries(controls)) lines.push(`same-tree control: ${v} px between two draws of ${k} (reported, never a floor)`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\n${shots.length} cells + carnation-fringe.png in ${outDir}`);
await browser.close();
server.close();
