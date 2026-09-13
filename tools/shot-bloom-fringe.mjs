/* ===================================================================
   THE CARNATION FRINGE, PHOTOGRAPHED — the picture that decides the
   feature. Session of Sep 13, the follow-up to
   docs/bloom-squared-tip-discovery.md §6f.

   NOTHING HERE SHIPS AND NOTHING HERE IS A CONTROL. The fringe is a
   NON-SHIPPING mutation of `trimPanels` held in this file and served to the
   page by `page.route`; the repo's bloom-geometry.js is never written, in
   the throwaway-worktree tradition of PANEL_OVERLAP_ROWS's own positive
   control. §6f's claim is that N+1 panels need no rewrite, so the edit is
   ADDITIVE — a `fringe` arm BEFORE the cleft arm — and `emitPanel`, the
   cleft arm and the default arm are untouched. An edit that rewrote the
   emitter could not test the claim.

   THE RIG IS PROVED BEFORE ANY CELL, on controls that must hold:
     - the ANCHOR matches exactly once (a `from` that moved, or that now
       matches twice, disarms the mutation silently);
     - the served module builds the SHIPPING DEFAULT at its own triangle
       count with no capability live — so no cell below is a picture of the
       mutation rather than of the fringe;
     - a same-tree control on the first cell of each framing, shot twice,
       REPORTED and never used as a bar.

   EVERY CELL: PRINT PREVIEW ON (`shownMode` asserted "export"), a MACRO crop
   down the first petal's own normal, centred between the split and the tip
   so the whole treated stretch AND THE APEX are both in frame. The petal's
   END is asserted to carry exactly the number of spans the cell claims,
   read from the builder's own `petalTipSpans` — a cell that drew a plain
   petal under a fringe caption is the one failure a picture cannot show.

   MODE AND SAMPLING: every width is EXPORT and is read from the shipped
   profile as (span in v) x halfWidthAt(u) mm — never from a row count. The
   finger and the gap are equal by the even-division law, so one figure
   carries both.

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

/* ---------------------------------------------------- THE MUTATION */
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const ANCHOR = `  const cleft = (cap && cap.cleft) || null;`;
const hits = SRC.split(ANCHOR).length - 1;
if (hits !== 1) { console.error(`HARNESS INVALID: the fringe mutation's anchor matches ${hits} times, expected exactly 1`); process.exit(2); }
const ARM = `  /* NON-SHIPPING FRINGE (capability only, tools/shot-bloom-fringe.mjs).
     N fingers + (N-1) gaps of equal width in v, evenly dividing [-1, 1];
     every finger runs from the split to the LAST row, so the petal's end
     carries N spans. CONSTANT v — the cleft arm's own law (spanAt is a
     constant), so a finger tapers exactly as the blade does. */
  const fringe = (cap && cap.fringe) || null;
  if (fringe) {
    let mF = rowCount - 1;
    for (let i = 0; i < rowCount; i++) { if (uAt(i) > fringe.from) { mF = i; break; } }
    const N = fringe.count;
    const lF = Math.max(0, mF - PANEL_OVERLAP_ROWS);
    const step = 2 / (2 * N - 1);
    const out = [{ label: 'base', rowFrom: 0, rowTo: mF, spanAt: () => [-1, 1] }];
    for (let k = 0; k < N; k++) {
      const a = -1 + k * 2 * step, b = a + step;
      out.push({ label: \`finger\${k}\`, rowFrom: lF, rowTo: rowCount - 1, spanAt: () => [a, b] });
    }
    return out;
  }
`;
const MUTATED = SRC.replace(ANCHOR, ARM + ANCHOR);

/* ------------------------------------------- THE WIDTHS, from the profile */
function profileFor(L, W) {
  const state = { ...DEFAULTS, petalLength: L, petalWidth: W };
  const acc = new G.MeshBuilder({ exportMode: true });
  const { ring, slot } = firstSlot(state, acc, 0);
  return { p: G.petalSurface(state, ring, slot, null, acc).profile, len: L * slot.scale };
}
function widths(L, W, n, split) {
  const { p, len } = profileFor(L, W);
  const w = (u) => 2 * p.halfWidthAt(u) / (2 * n - 1);
  let uF = 1;
  for (let i = 0; i < 4001; i++) { const u = split + (1 - split) * i / 4000; if (w(u) < F) { uF = u; break; } }
  const fringeMm = (1 - split) * len, printedMm = (uF - split) * len;
  return { atSplit: w(split), atTip: w(1), uFloor: uF, fringeMm, printedMm,
           bladeSplit: 2 * p.halfWidthAt(split), bladeTip: 2 * p.halfWidthAt(1) };
}

/* ---------------------------------------------------------- the cells */
const CELLS = [
  { id: '00-plain', count: null, split: null, row: 'ship' },
  { id: '01-fringe-3', count: 3, split: 0.80, row: 'ship' },
  { id: '02-fringe-4', count: 4, split: 0.80, row: 'ship' },
  { id: '03-fringe-5', count: 5, split: 0.80, row: 'ship' },
  { id: '04-fringe-10-wide', count: 10, split: 0.80, row: 'big',
    sets: { petalWidth: 30, petalLength: 60 } },
];

const outDir = process.argv[2] || '/tmp/bloom-fringe';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 560, DPR = 2;
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
await page.route('**/bloom-geometry.js', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: MUTATED }));
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
  if (m.shownTris !== SHIPPED_TRIS) await die(`the served module moved the DEFAULT: ${m.shownTris} export triangles, expected ${SHIPPED_TRIS}`);
  if (m.capability !== null) await die(`a capability is live on the default row: ${JSON.stringify(m.capability)}`);
  if (m.petalTipSpans !== 1) await die(`the default row's petal end carries ${m.petalTipSpans} spans, expected 1`);
  console.log(`page control: the served module builds the shipping default at ${m.shownTris} export triangles, one tip span, no capability live.`);
}

async function cell({ id, count, split, sets = {}, frame, zoom = 0.30, centre = 0.26, row }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (count !== null) {
    const capName = await page.evaluate((a) => { window.__bloomCapability({ label: 'FRINGE', fringe: { from: a.split, count: a.count } }); return window.__bloomMetrics().capability; }, { split, count });
    if (capName !== 'FRINGE') await die(`${id}: capability reads back ${JSON.stringify(capName)}`);
  }
  await previewOn();
  const still = await stillFrame(page);
  if (still.length) await die(`${id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${id}: not the export build on screen`);
  const wantSpans = count === null ? 1 : count;
  if (m.petalTipSpans !== wantSpans) await die(`${id}: the petal's END carries ${m.petalTipSpans} span(s), ${wantSpans} asked — the domain was not trimmed as this cell claims`);
  if (count !== null && (!Array.isArray(m.petalPanels) || m.petalPanels.length !== count + 1)) await die(`${id}: panels ${JSON.stringify(m.petalPanels)}, expected base + ${count} fingers`);
  const L = Number(sets.petalLength ?? DEFAULTS.petalLength), W = Number(sets.petalWidth ?? DEFAULTS.petalWidth);
  if (await settleOnly() < 0) await die(`${id}: never came to rest`);
  /* THE CROP IS CENTRED BETWEEN THE SPLIT AND THE TIP, so the whole treated
     stretch AND the apex are in frame; a crop centred on the apex spends half
     its area above the petal. Both points read from the builder. */
  const at = m.petalTip.map((x, k) => x + (m.petalMid[k] - x) * centre);
  const fr = frame || { r: L * zoom, at, dir: m.petalNormal };
  const buf = await shoot(path.join(outDir, `${id}.png`), fr);
  return { id, buf, frame: fr, m, L, W, count, split, row, tris: m.shownTris,
           w: count === null ? null : widths(L, W, count, split) };
}

const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error('--only matched no cell'); process.exit(2); }

const controls = {};
const shots = [];
const first = await cell(chosen[0]);
shots.push(first);
{ const c = await shoot(path.join(outDir, `${first.id}--control.png`), first.frame);
  controls[first.id] = pixelDiff(first.buf, c); }
for (const c of chosen.slice(1)) {
  const sameObject = c.row === first.row;
  const r = await cell({ ...c, frame: sameObject ? first.frame : null });
  shots.push(r);
  if (!sameObject && controls[r.id] === undefined) {
    const cc = await shoot(path.join(outDir, `${r.id}--control.png`), r.frame);
    controls[r.id] = pixelDiff(r.buf, cc);
  }
}

/* --------------------------------------------------------- the sheet */
const f3 = (x) => x.toFixed(3);
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const capOf = (s) => {
  if (s.count === null) return `The shipping petal, no fringe. <b>${s.tris.toLocaleString('en-US')}</b> export triangles &middot; the end is ONE span, ${f3(2 * profileFor(s.L, s.W).p.halfWidthAt(1))} mm across.`;
  const w = s.w;
  return `<b>${s.count} fingers</b>, split <code>u</code> = ${s.split.toFixed(2)} &middot; petal ${s.L} &times; ${s.W} mm &middot; ${s.tris.toLocaleString('en-US')} export triangles<br>` +
    `finger = gap: <b>${f3(w.atSplit)} mm</b> at the split &rarr; <b>${f3(w.atTip)} mm</b> at the apex<br>` +
    `blade ${f3(w.bladeSplit)} mm wide at the split, <b>${f3(w.bladeTip)} mm</b> at the apex<br>` +
    `clears the ${F.toFixed(1)} mm floor for <b>${f3(w.printedMm)} mm of ${f3(w.fringeMm)} mm</b> (${(100 * w.printedMm / w.fringeMm).toFixed(0)}%) &mdash; the rest is under it`;
};
const rowHtml = (row) => `<div class="grid">` + shots.filter((s) => s.row === row).map((s) =>
  `<figure><img src="${dataUri(s.buf)}"><figcaption>${capOf(s)}</figcaption></figure>`).join('') + `</div>`;

const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h2{font-size:16px;margin:26px 0 3px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 18px;max-width:1180px}
  .note{color:#9a9a9a;font-size:12px;margin:0 0 10px;max-width:1180px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;max-width:1180px}
  .grid.one{grid-template-columns:1fr;max-width:600px}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:6px;line-height:1.45}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:22px;max-width:1180px}
  b{color:#e8e8e8} code{color:#cfc}
</style>
<h1>The carnation fringe &mdash; tip-confined splits through the cleft machinery</h1>
<p class="sub">NON-SHIPPING. The fringe is an additive <code>fringe</code> arm in <code>trimPanels</code>, served to the page by <code>page.route</code>; no file in the repo is changed and there is no control. Every cell is EXPORT (print preview on, <code>shownMode</code> asserted), cropped down the first petal&rsquo;s own normal and centred between the split and the tip so <b>the apex is in every crop</b>. The petal&rsquo;s end is asserted to carry exactly the number of spans each caption claims, from the builder&rsquo;s own <code>petalTipSpans</code>. Every width is read from the shipped profile as (span in <code>v</code>) &times; <code>halfWidthAt(u)</code> mm &mdash; never from a row count. Finger and gap are equal by the even-division law, so one figure carries both.</p>

<h2>The shipping petal &mdash; 3, 4 and 5 fingers at what the budget allows</h2>
<p class="note">&sect;6f&rsquo;s budget sized the count on the width <b>at the split</b>, where the blade is 10.253 mm across. But a finger runs from the split to <code>u</code> = 1, so the binding station is where it is NARROWEST &mdash; and the blade converges to <b>1.600 mm</b> there (2 &times; <code>TIP_HALF_MM</code>). The floor crossing is therefore <b>independent of the split</b>: measured at four splits from 0.55 to 0.90, every count crosses at the same <code>u</code>. What the pictures show is that consequence &mdash; the fingers pinch shut into one shared spike at the apex, which is the end a carnation&rsquo;s fringe should be most open at.</p>
${rowHtml('ship')}

<h2>A bigger petal &mdash; the largest count the split will take</h2>
<p class="note">Ten fingers on the widest, longest petal the sliders reach. It reads as a carnation over most of the finger&rsquo;s length &mdash; and then all ten converge to one point, because <code>TIP_HALF_MM</code> is an ABSOLUTE constant: the apex is 1.600 mm across at <b>every</b> petal size, so a bigger petal buys nothing at all where the fringe actually ends.</p>
<div class="grid one"><figure><img src="${dataUri(shots.find((s) => s.row === 'big')?.buf ?? shots[0].buf)}"><figcaption>${capOf(shots.find((s) => s.row === 'big') ?? shots[0])}</figcaption></figure></div>

<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none)'}. Every cell settled to two byte-identical frames. Census (<code>tools/bloom-self-intersection.mjs</code>&rsquo;s <code>census()</code>, EXPORT, each state built once in Node, and it reproduces that tool&rsquo;s own two calibration points &mdash; flat default 0, roll-330 18,776 &mdash; and the shipped CLEFT xfail entry 4,629 / 0.8550 mm exactly): the shipping default reads <b>0</b> within-shell pairs and every fringe row reads in the DECLARED cleft class &mdash; with the base panel pulled clear of the fingers, all four counts read <b>exactly 0</b>, so no finger folds into another or into itself. Export contract: <b>boundary edges 0</b> on every row, and <b>9 shells</b>, the plain build&rsquo;s own count, so <code>PANEL_OVERLAP_ROWS = 1</code> still welds every finger at N &gt; 2.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'carnation-fringe.png'), sheet);

const lines = [];
for (const s of shots) lines.push(`${s.id}: ${capOf(s).replace(/<[^>]+>/g, '').replace(/&middot;/g, '·').replace(/&rarr;/g, '->').replace(/&times;/g, 'x').replace(/&mdash;/g, '—')} · ${modeTag(s.m)}`);
for (const [k, v] of Object.entries(controls)) lines.push(`same-tree control: ${v} px between two draws of ${k} (reported, never a floor)`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\n${shots.length} cells + carnation-fringe.png in ${outDir}`);
await browser.close();
server.close();
