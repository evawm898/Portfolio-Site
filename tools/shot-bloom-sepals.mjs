/* ===================================================================
   ONE IMAGE — THE SEPAL WHORL: THE FOOT ON THE HUB'S THREE STYLES, AND THE
   ANGLE AT, UNDER AND BEYOND ITS DRAWN LIMIT.

     node tools/shot-bloom-sepals.mjs <out-dir> [--only re]

   FRAMED ON THE SEPALS AND THE HUB JOIN, NOT ON THE BUILD'S OWN SPHERE (the
   brief's ask). Two rows:

   ROW 1 — THE FOOT. The shipped whorl (5 of 8, interleaved, size 0.60) on a
   60 x 6 mm stem, GOBLET / ANGLED / CURVED at MAX amount x MAX length — the
   corner where the blend reaches the rim under the foot — plus GOBLET at its
   default as the control. The camera targets the rim from a low side angle,
   radius read from the build's own hub radius, so the foot leaving the rim
   and the join's flare are the picture.

   ROW 2 — THE ANGLE. The same whorl at 90 asked (CLAMPED to the drawn limit),
   three degrees UNDER the limit, and SIX degrees BEYOND it through the
   capability hook `{ sepalAngleUnclamped: true }` — no control reaches past
   the clamp, which is the point of photographing it: the cell shows what the
   clamp is refusing. Framed on the rim from the side at a radius that keeps
   the sepal blades and the petals they clip in one frame.

   PRINT PREVIEW IS ON in every cell (`shownMode` asserted "export"). Every
   caption carries the SEPALS read-out lines verbatim — the count against its
   ceiling, the foot against the underside (tangent AND chord), the angle
   against its limit with the contact named — which are the geometry's own
   numbers. A same-tree control (one cell per row, shot twice at one camera)
   is REPORTED, never a bar (this repo's rule: a single control is not a floor).
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-sepals';
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

const SIDE_LOW = [1, 0.14, -0.30];  // the foot row: a side elevation a little from below, so the flare, the sepal leaving it and the GAP up to the petal all read
const SIDE = [1, 0.22, -0.18];      // the angle row: a side ELEVATION a little from below, so a sepal's angle against its petal reads as an angle

async function cell(c) {
  await openBloom(page, here.port);
  const bad = await applyConfig(page, set(c.sets));
  if (bad.length) await die(`${c.id}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(c.sets));
  if (drift.length) await die(`${c.id}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (c.capability) {
    const got = await page.evaluate((spec) => { window.__bloomCapability(spec); return window.__bloomMetrics().capability; }, c.capability);
    if (got !== c.capability.label) await die(`${c.id}: capability ${c.capability.label} asked, app reports ${got}`);
    await settleBuild(page);
  }
  await previewOn(c.id);
  const still = await stillFrame(page);
  if (still.length) await die(`${c.id}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'export' || m.liveTris !== null) await die(`${c.id}: not the export build on screen`);
  if (!m.sepal || !m.sepal.built) await die(`${c.id}: no sepals were built`);
  /* THE CAMERA IS THE BUILD'S OWN: the rim's radius from footRing's own
     record, the join's reach from the stem plan where there is one. */
  const hubR = m.hubRadius;
  const A = m.sepal.attachment;
  const zA = A && A.mode === 'HUB' ? A.zAttach : 0;
  /* THE FOOT ROW FRAMES THE GAP: the camera targets half-way between the
     attachment (the builder's own record — 19.4 mm down the deepest flare,
     0.93 mm under the rim on the default stem) and the head's rim, at a
     radius that holds both the sepal leaving the flare and the petal above
     it. The first run of this sheet aimed at the middle of the join's reach
     and photographed a pipe with the foot at its top edge; the second aimed at
     the rim, which is where the foot no longer is. */
  /* A CLOSE CELL frames the RIM itself: on the default stem the flare is
     1.32 mm tall and the gap between a sepal and the petal above it is a third
     of a millimetre, which a whole-head framing cannot show. The target is on
     the rim nearest the camera and the radius a little over the hub's, so the
     sepal leaving the flare and the petal foot above it fill the frame. */
  const at = c.row === 'foot' ? (c.close ? [hubR * 0.8, 0, zA / 2 - 0.4] : [0, 0, zA / 2 - 1]) : [0, 0, 5];
  const r = c.row === 'foot' ? (c.close ? hubR * 1.25 : Math.max(hubR * 2.4, (Math.abs(zA) + 10) * 1.9)) : hubR * 4.4;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null), { r, at, dir: c.row === 'foot' ? SIDE_LOW : SIDE });
  const settled = await settleOnly();
  if (settled < 0) await die(`${c.id}: never came to rest`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  fs.writeFileSync(path.join(outDir, `${c.id}.png`), buf);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const lines = readout.split('\n').filter((l) => /^\s*SEPAL/.test(l)).map((l) => l.trim());
  return { ...c, buf, m, lines };
}

/* EVERY CELL CARRIES THE DEFAULT STEM (60 x 6), because the attachment height
   is a fraction of the HUB's extent and there is no hub without a stem: the
   angle row is then drawn at the attachment, not at the rim. */
const whorl = { sepalCount: 5, stemLength: 60, stemDiameter: 6 };
const CELLS = [
  { id: 'foot-goblet-default', row: 'foot', close: true, title: 'GOBLET at its DEFAULT (amount 1.00, length auto), height 0.75 &mdash; the shipped attachment, CLOSE ON THE RIM: the foot 0.33 mm under the head, 2.9 mm inside the rim', sets: { ...whorl, hubStyle: 'GOBLET' } },
  { id: 'foot-goblet-default-low', row: 'foot', close: true, title: 'The same hub at height 0.25, close on the rim &mdash; the control turned toward the stem end (0.99 mm under the head)', sets: { ...whorl, hubStyle: 'GOBLET', sepalHeight: 0.25 } },
  { id: 'foot-goblet-max', row: 'foot', title: 'GOBLET &middot; MAX amount &times; MAX length, height 0.75 (19.4 mm down a 77.6 mm flare)', sets: { ...whorl, hubStyle: 'GOBLET', hubShapeAmount: 2, hubLength: 40 } },
  { id: 'foot-angled-max', row: 'foot', title: 'ANGLED &middot; MAX &times; MAX &mdash; the foot on the cone&rsquo;s SIDE (a straight face: chord = tangent, no shoulder under it)', sets: { ...whorl, hubStyle: 'ANGLED', hubShapeAmount: 2, hubLength: 40 } },
  { id: 'foot-curved-max', row: 'foot', title: 'CURVED &middot; MAX &times; MAX', sets: { ...whorl, hubStyle: 'CURVED', hubShapeAmount: 2, hubLength: 40 } },
  { id: 'angle-under', row: 'angle', title: 'THREE DEGREES UNDER the drawn limit', sets: { ...whorl, sepalAngle: 'LIMIT-3' } },
  { id: 'angle-at', row: 'angle', title: 'AT the limit (90&deg; asked, CLAMPED)', sets: { ...whorl, sepalAngle: 90 } },
  { id: 'angle-beyond', row: 'angle', title: 'SIX DEGREES BEYOND the limit &mdash; through the capability hook, NOT reachable by a control', sets: { ...whorl, sepalAngle: 'LIMIT+6' }, capability: { label: 'SEPAL_ANGLE_UNCLAMPED', sepalAngleUnclamped: true } },
];
/* THE LIMIT IS READ OFF THE BUILD, never typed: the "under" and "beyond"
   cells resolve their angle from the clamped cell's own record. */
const chosen = ONLY ? CELLS.filter((x) => ONLY.test(x.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }
let limitDeg = null;
const shots = [];
for (const c of chosen) {
  if (typeof c.sets.sepalAngle === 'string') {
    if (limitDeg === null) {
      const probe = await cell({ ...c, id: 'probe', sets: { ...c.sets, sepalAngle: 90 }, capability: null });
      limitDeg = probe.m.sepal.limit.limitDeg;
      if (limitDeg === null) await die('the limit is at the floor — no under/beyond pair to shoot');
    }
    c.sets = { ...c.sets, sepalAngle: c.sets.sepalAngle === 'LIMIT-3' ? limitDeg - 3 : limitDeg + 6 };
    c.title += ` (limit ${limitDeg}&deg;)`;
  }
  shots.push(await cell(c));
}

/* ---- same-tree controls, one per row ---------------------------------- */
const controls = {};
for (const id of ['foot-goblet-max', 'angle-at']) {
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((x) => x.id === id));
  controls[id] = pixelDiff(s.buf, again.buf);
}

/* ---- compose ONE image ----------------------------------------------- */
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const capOf = (s) => `${s.lines.map(esc).join('<br>')}<br>${s.m.sepalTris} sepal tris of ${s.m.shownTris ?? s.m.liveTris} &middot; ${modeTag(s.m)}${s.m.sepal.limit.unclamped ? ' &middot; <b>UNCLAMPED by the capability hook (SP8 fires on this state)</b>' : ''}`;
const dataUri = (b) => `data:image/png;base64,${b.toString('base64')}`;
const rowHtml = (row) => {
  const rs = shots.filter((s) => s.row === row);
  if (!rs.length) return '';
  return `<div class="grid grid-${rs.length}">` + rs.map((s) =>
    `<figure><img src="${dataUri(s.buf)}"><figcaption><b>${s.title}</b><br>${capOf(s)}</figcaption></figure>`).join('') + '</div>';
};
const html = `<style>
  body{margin:0;background:#111;color:#e8e8e8;font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;padding:22px 24px 28px}
  h1{font-size:19px;margin:0 0 4px;font-weight:600}
  h2{font-size:16px;margin:24px 0 3px;font-weight:600;color:#fff}
  .sub{color:#9a9a9a;font-size:12.5px;margin:0 0 16px;max-width:1500px}
  .grid{display:grid;gap:14px;max-width:1500px}
  .grid-4{grid-template-columns:repeat(4,1fr)} .grid-3{grid-template-columns:repeat(3,1fr)} .grid-2{grid-template-columns:repeat(2,1fr)} .grid-1{grid-template-columns:repeat(1,1fr)}
  figure{margin:0}
  img{width:100%;display:block;border-radius:3px;background:#000}
  figcaption{font-size:11px;color:#b9b9b9;margin-top:6px;line-height:1.4;word-break:break-word}
  .foot{color:#8d8d8d;font-size:11.5px;margin-top:20px;max-width:1500px}
  b{color:#e8e8e8}
</style>
<h1>Sepals, part 1 &mdash; the whorl on the hub&rsquo;s rim</h1>
<p class="sub">A sepal IS the petal builder, invoked on a second ring (the hub&rsquo;s rim) against a second parameter set. Row 1 is the FOOT on the three hub styles at the corner where the blend reaches the rim under it (MAX amount &times; MAX length on a 60&thinsp;mm&times;6&thinsp;mm stem), framed on the rim from a low side angle; row 2 is the ANGLE against its DRAWN limit &mdash; three degrees under, at (90&deg; asked, clamped), and six degrees beyond through a capability hook no control can reach. Every cell is EXPORT (print preview on, <code>shownMode</code> asserted) and every caption is the read-out&rsquo;s own SEPALS lines. No pixel delta is quoted as a bar.</p>
<h2>The foot on GOBLET / ANGLED / CURVED</h2>
${rowHtml('foot')}
<h2>The angle: under, at, beyond its limit</h2>
${rowHtml('angle')}
<p class="foot">Same-tree controls (one cell per row, shot twice at one camera): ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none &mdash; --only run)'}. Every cell settled to two byte-identical frames.</p>`;

await page.setViewportSize({ width: 1560, height: 1240 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'sepals.png'), sheet);

const out = shots.map((s) => `${s.id}: ${modeTag(s.m)} · ${s.lines.join(' | ')}`);
out.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'sepals.png')}`);
await browser.close(); here.server.close();
