/* ===================================================================
   ONE IMAGE — THE HUB'S THREE SHAPES AT THREE AMOUNTS.

     node tools/shot-bloom-hub.mjs <out-dir> [--only re]

   THE HUB is Eva's word for the head-to-stem connector (the code's hub-to-stem
   JOIN). Its SHAPE is now controlled — GOBLET (the rounded flare that ships
   today), ANGLED (a straight cone) and CURVED (a smooth curve into the stem) —
   and this sheet is the 3x3 Eva reads to rule on it: the three styles down, and
   LOW / DEFAULT / HIGH pronouncedness across (amount 0.5 / 1.0 / 2.0), on the
   shipped 60 mm x 6 mm stem.

   FRAMED ON THE HUB, NOT ON THE BLOOM (Eva's ask). A radius read from the
   build's own hub radius, targeted on the middle of the join's own reach
   (between the head's top face and the stem root), from a low side angle so the
   flare's PROFILE is what the eye sees rather than a plan view of the head. The
   petals are still there above; the crop is the join.

   PRINT PREVIEW IS ON in every cell (the app's own `shownMode` asserted
   "export"), because the STL is the object and the floors move the geometry.

   A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL (this repo's rule).
   Each cell carries a SAME-TREE control — shot twice at the same camera on the
   same tree — reported, never a bar; and the geometry's own numbers, which are
   exact: the join's reach, its blend radius and the whole HUB read-out line.
   The GOBLET / DEFAULT cell is today's shape and is labelled so.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-hub';
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 540, DPR = 2;
const here = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); process.exit(2); }); }
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
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4) if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  return n;
}
async function previewOn(id) {
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  const got = await shownModeOf(page);
  if (got !== 'export') await die(`${id}: print preview ON asked for, app reports shownMode "${got}"`);
}

/* FROM A LOW SIDE ANGLE — the flare is a profile against the stem, so a mostly
   sideways eye with a little from below shows the curve, not the underside. */
const SIDE = [1, 0.15, -0.55];

async function cell(c) {
  const sets = { stemLength: 60, stemDiameter: 6, hubStyle: c.style, hubShapeAmount: c.amount, ...(c.extra || {}) };
  await openBloom(page, here.port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${c.id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${c.id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await previewOn(c.id);
  const still = await stillFrame(page);
  if (still.length) await die(`${c.id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${c.id}: not the export build on screen`);
  if (!m.stem) await die(`${c.id}: no stem was built`);
  /* THE CAMERA IS THE BUILD'S OWN — the middle of the join's reach on the axis,
     and a radius a fixed multiple of the hub's own radius, so a wide hub and a
     narrow one are each framed to their own size. */
  const topZ = m.stem.topZ !== undefined ? m.stem.topZ : (m.hubTopFaceZ || 0);
  const rootZ = m.stem.root[2];
  const at = [0, 0, (topZ + rootZ) / 2];
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null),
    { r: (m.stem.hubR || 8.8) * 1.7, at, dir: SIDE });
  const settled = await settleOnly();
  if (settled < 0) await die(`${c.id}: never came to rest`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  fs.writeFileSync(path.join(outDir, `${c.id}.png`), buf);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/HUB [^\n]+/) || [''])[0];
  return { ...c, buf, m, line };
}

/* ---- the cells: 3 styles x 3 amounts --------------------------------- */
const STYLES = ['GOBLET', 'ANGLED', 'CURVED'];
const AMOUNTS = [['low', 0.5], ['default', 1], ['high', 2]];
const CELLS = [];
for (const style of STYLES) for (const [amt, v] of AMOUNTS) {
  CELLS.push({ id: `${style.toLowerCase()}-${amt}`, style, amount: v, amt,
    title: `${style} &middot; ${amt === 'default' ? 'DEFAULT (amount 1.00)' : amt.toUpperCase() + ` (amount ${v.toFixed(2)})`}${style === 'GOBLET' && amt === 'default' ? " &mdash; TODAY'S SHAPE" : ''}` });
}
const chosen = ONLY ? CELLS.filter((x) => ONLY.test(x.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const shots = [];
for (const c of chosen) shots.push(await cell(c));

/* ---- same-tree controls, one per style at DEFAULT -------------------- */
const controls = {};
for (const style of STYLES) {
  const id = `${style.toLowerCase()}-default`;
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((x) => x.id === id));
  controls[id] = pixelDiff(s.buf, again.buf);
}

/* ---- compose ONE image ----------------------------------------------- */
const capOf = (s) => {
  const S = s.m.stem;
  const reach = S.axisDepth !== undefined ? `${S.axisDepth.toFixed(2)} mm reach` : '';
  const blend = s.m.hubJoinActive ? `blend r ${s.m.hubJoinBlendRadius.toFixed(2)} of ${S.hubR.toFixed(2)} mm` : 'straight (no flare)';
  return `${reach} &middot; ${blend}<br>${s.m.stemTris} stem tris &middot; ${modeTag(s.m)}`;
};
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const rowHtml = (style) => {
  const rs = AMOUNTS.map(([amt]) => shots.find((s) => s.id === `${style.toLowerCase()}-${amt}`)).filter(Boolean);
  if (!rs.length) return '';
  return `<div class="grid">` + rs.map((s) =>
    `<figure><img src="${dataUri(s.buf)}"><figcaption><b>${s.title}</b><br>${capOf(s)}</figcaption></figure>`).join('') + '</div>';
};
const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h2{font-size:16px;margin:24px 0 3px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 16px;max-width:1180px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1180px}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11.5px;color:#b9b9b9;margin-top:6px;line-height:1.4}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:20px;max-width:1180px}
  b{color:#e8e8e8}
</style>
<h1>The hub&rsquo;s three shapes, at low / default / high amount</h1>
<p class="sub">The HUB is the head-to-stem connector (the code&rsquo;s join). Each row is a STYLE &mdash; GOBLET the rounded flare that ships today, ANGLED a straight cone, CURVED a smooth curve into the stem &mdash; and each column a pronouncedness: LOW (0.50), DEFAULT (1.00) and HIGH (2.00), on the shipped 60&thinsp;mm&times;6&thinsp;mm stem. Amount 0 is a straight join for all three. Every cell is EXPORT (print preview on, <code>shownMode</code> asserted), framed on the JOIN at a radius read from the build&rsquo;s own hub radius, from a low side angle so the flare&rsquo;s profile shows. <b>GOBLET / DEFAULT is today&rsquo;s shape</b>, byte-for-byte. No pixel delta is quoted; the numbers in the captions are the geometry&rsquo;s own.</p>
<h2>GOBLET &mdash; the rounded flare</h2>
${rowHtml('GOBLET')}
<h2>ANGLED &mdash; a straight cone, hard shoulders</h2>
${rowHtml('ANGLED')}
<h2>CURVED &mdash; a smooth curve into the stem, no shoulder</h2>
${rowHtml('CURVED')}
<p class="foot">Same-tree controls (each style at DEFAULT, shot twice, one camera): ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none &mdash; --only run)'}. Every cell settled to two byte-identical frames.</p>`;

await page.setViewportSize({ width: 1240, height: 1180 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'hub-shape.png'), sheet);

const lines = shots.map((s) => `${s.id}: ${modeTag(s.m)} · ${s.line}`);
lines.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'hub-shape.png')}`);
await browser.close(); here.server.close();
