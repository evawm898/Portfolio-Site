/* ===================================================================
   ONE IMAGE — THE SPHERE'S STEM, AND THE PETALS IT DOES NOT BUILD.

     node tools/shot-bloom-sphere-stem.mjs <out-dir> [--only <id regex>]

   WHAT EVA ASKED FOR: a sphere with a stem at a SMALL and a LARGE diameter,
   FROM BELOW so the omission is legible, the POLE IN FRAME, print preview ON,
   the same-tree control reported, and every cell labelled with the petals
   ASKED and the petals BUILT.

   THE CONTROL CELL IS THE ARGUMENT. A stemmed sphere on its own is just a
   sphere with a stick in it; what the ruling is about is which petals are
   missing, and that is only legible beside the SAME head with no stem. So
   each row opens with the stemless bloom at the identical camera.

   TWO ROWS, because the count changes what the channel has to sort: the
   shipping sphere at 8 petals, where the pole-most two go, and 40 petals in
   one turn, where a handful do and the ones that survive sit visibly clear of
   the stem.

   THE OUTPUT IS `sphere-stem.png`. Every cell: PRINT PREVIEW ON (the app's own
   `shownMode` asserted "export"), framed from BELOW the far pole at a radius
   read from the build's own sphere rather than from a layout guess, settled to
   two byte-identical frames. A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN
   CONTROL: one cell of each row is shot twice on the same tree at the same
   camera and the difference is REPORTED, never used as a bar.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-sphere-stem';
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

/* FROM BELOW, at a low three-quarter rather than straight up the axis: the
   axis view is degenerate against the camera's own +z up vector, and a flat
   plan of the pole hides how far the surviving blades stand off the stem. */
const FROM_BELOW = [0.42, -0.42, -1];

async function cell({ id, petals, layers, stem }) {
  const sets = { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: petals, layerCount: layers,
                 stemLength: 60, stemDiameter: stem === null ? 6 : stem };
  if (stem === null) sets.stemLength = 0;
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
  if (!m.hubDome || !m.hubDome.closed) await die(`${id}: the head is not a closed sphere`);
  if (stem !== null && !m.stemOmission) await die(`${id}: a stem was asked for and the builder reports no stem channel`);
  if (stem === null && m.stemOmission) await die(`${id}: no stem was asked for and the builder reports a channel`);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/STEM CHANNEL [^\n]+/) || [''])[0];
  /* THE FRAME IS READ FROM THE BUILD'S OWN SPHERE, never a layout guess: the
     radius holds the head and the first stretch of stem, and the target sits
     below the equator so the FAR POLE — the one the stem leaves and the one
     the channel is about — is what the eye lands on. */
  const Rd = m.hubDome.Rd;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null),
    { r: Rd * 1.55, at: [0, 0, -Rd * 0.55], dir: FROM_BELOW });
  const settled = await settleOnly();
  if (settled < 0) await die(`${id}: never came to rest`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  fs.writeFileSync(path.join(outDir, `${id}.png`), buf);
  return { id, buf, m, line, asked: { petals, layers, stem } };
}

/* ---- the cells ------------------------------------------------------- */
const CELLS = [
  { id: 'a-none', row: 'a', title: 'NO STEM — the control', petals: 8, layers: 1, stem: null },
  { id: 'a-3mm', row: 'a', title: 'a 3 mm stem (SOLID at Eva’s floor)', petals: 8, layers: 1, stem: 3 },
  { id: 'a-12mm', row: 'a', title: 'a 12 mm stem (the widest)', petals: 8, layers: 1, stem: 12 },
  { id: 'b-none', row: 'b', title: 'NO STEM — the control', petals: 40, layers: 1, stem: null },
  { id: 'b-3mm', row: 'b', title: 'a 3 mm stem (SOLID at Eva’s floor)', petals: 40, layers: 1, stem: 3 },
  { id: 'b-12mm', row: 'b', title: 'a 12 mm stem (the widest)', petals: 40, layers: 1, stem: 12 },
];
const chosen = ONLY ? CELLS.filter((c) => ONLY.test(c.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const shots = [];
for (const c of chosen) shots.push({ ...c, ...(await cell(c)) });

/* ---- the same-tree controls, REPORTED never a bar --------------------- */
const controls = {};
for (const id of ['a-12mm', 'b-12mm']) {
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((c) => c.id === id));
  controls[id] = pixelDiff(s.buf, again.buf);
  fs.writeFileSync(path.join(outDir, `${id}--control.png`), again.buf);
}

/* ---- compose ONE image ------------------------------------------------ */
const runs = (list) => {
  const out = [];
  for (const k of list) { const last = out[out.length - 1]; if (last && last[1] === k - 1) last[1] = k; else out.push([k, k]); }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
};
const capOf = (s) => {
  const O = s.m.stemOmission;
  const asked = s.m.rings.length;
  if (!O) return `<b>${asked} petals asked &middot; ${s.m.petalsBuilt} BUILT</b> &middot; no stem, so nothing is omitted<br>${s.m.shownTris} triangles &middot; ${modeTag(s.m)}`;
  const near = Math.min(O.nearestKeptMm.live, O.nearestKeptMm.export);
  /* THE MERIDIAN PACKING MARGIN ON EVERY CAPTION, because the cell where it
     is exactly exhausted is a cell Eva is being asked to look at, and a number
     that appears only at its own limit reads as an error rather than as a
     measurement. Three decimals: 1.003 rounds to 1.00 at two. */
  const MP = O.meridian;
  const pack = !MP ? '' : MP.margin === null
    ? ` &middot; meridian packing n/a (${MP.why})`
    : ` &middot; meridian packing <b>${MP.margin.toFixed(3)}&times;</b>${MP.exhausted ? ' EXHAUSTED' : ''}`;
  return `<b>${O.asked} petals asked &middot; ${O.built} BUILT</b> &middot; ${O.omitted.length} not (slot${O.omitted.length === 1 ? '' : 's'} ${runs(O.omitted)})<br>` +
    `the stem passes within the ${O.clearanceMm.toFixed(2)} mm printable gap of them; nearest petal KEPT ${Number.isFinite(near) ? near.toFixed(2) + ' mm' : '&mdash;'}${pack}<br>` +
    `${s.m.stemTris} stem triangles &middot; join ${s.m.hubJoinActive ? 'ACTIVE' : 'INERT (a shell)'} &middot; ${modeTag(s.m)}`;
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
<h1>The sphere&rsquo;s stem &mdash; and the petals it does not build</h1>
<p class="sub">Every cell is a SPHERE head seen <b>from below</b>, the far pole (the one the stem leaves) toward the eye, EXPORT (print preview on, <code>shownMode</code> asserted), framed at a radius read from the build&rsquo;s own sphere. On a sphere the stem leaves a pole the petal sequence runs through, and footRing&rsquo;s law sends every blade TOWARD that pole &mdash; so without the channel the stem passes straight through the pole-most petals (session 43 measured their clear radius at exactly 0.00 mm). <b>Petals the stem would pass through are NOT BUILT</b>, in both modes; the sequence, the equal-area law, the golden angle and the one-step reservation are untouched, so no surviving petal moved. The first cell of each row is the SAME head with no stem, at the same camera, which is the only way the omission is legible.</p>

<h2>The shipping sphere &mdash; 8 petals</h2>
<p class="note">The pole-most petals go and the rest stand clear. The caption gives the nearest petal that was KEPT, against the 1.00 mm printable gap the channel clears &mdash; that number is the headroom, and at the widest stem it is the thing to look at.</p>
${rowHtml('a')}

<h2>40 petals in one turn</h2>
<p class="note">More petals reach the pole, so more of them go. The hub is sized from the count that was ASKED for &mdash; the area rule runs before any of this &mdash; so the head is the same size in all three cells of the row.</p>
${rowHtml('b')}
<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none &mdash; --only run)'}. Every cell settled to two byte-identical frames.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'sphere-stem.png'), sheet);

const lines = shots.map((s) => `${s.id}: ${s.title} · ${s.asked.petals} petals x ${s.asked.layers} · stem ${s.asked.stem === null ? 'none' : s.asked.stem + ' mm'} · ${modeTag(s.m)} · ${s.line || '(no channel)'}`);
lines.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'sphere-stem.png')}`);
await browser.close(); server.close();
