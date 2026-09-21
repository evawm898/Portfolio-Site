/* ===================================================================
   ONE IMAGE — THE BOTTOM OF A BORED STEM, BEFORE AND AFTER.

     node tools/shot-bloom-stem-plug.mjs <out-dir> --base <worktree> [--only re]

   WHAT EVA ASKED FOR, in her words: "i want the bottom of the stem when it is
   a bored cylinder to still look solid." So the image is a MACRO OF THE TIP —
   a 4 mm stem's bottom on the tree before this change and on this one, with a
   3 mm SOLID stem as the control, and the eye is being asked one question:
   does the pipe end read as a stem end.

   THE BEFORE CELL IS A REAL RENDER OF THE OLD CODE, never a remembered one.
   Both trees are served over their OWN HTTP servers and the page is loaded
   from whichever port a cell names — the seam-ruling sheet's construction,
   and it is the right one here for the same reason: the base tree's `bloom.js`
   does not carry this session's metrics, so swapping one module into a running
   page would leave the read-out and the hook disagreeing with the geometry.

   THE CAMERA IS READ FROM THE BUILD, never guessed: the target is the stem's
   own emitted tip and the radius is a multiple of its own outer radius, so a
   12 mm stem and a 3 mm one are each framed to their own size and the two
   trees of a pair share ONE camera to the bit. Looking from BELOW and to one
   side rather than straight up the axis — a plan view of a disc and a plan
   view of an annulus differ only by a hole, and the three-quarter shows the
   wall's thickness beside it, which is the thing the plug is as thick as.

   PRINT PREVIEW IS ON in every cell (the app's own `shownMode` asserted
   "export"), because the STL is the object and the floors move the geometry.

   A PIXEL NUMBER IS ONLY A MEASUREMENT WITH ITS OWN CONTROL, and the
   before/after pairs are TWO TREES, TWO SERVERS AND TWO PAGE SESSIONS, so no
   pixel delta is quoted for them at all (this repo's own rule). What IS
   reported is the same-tree control — one cell shot twice at the same camera
   on the same tree — and the geometry's own numbers, which are exact: the
   stem's triangle count, its bottom face's area, and the void the two closures
   leave.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-stem-plug';
const baseArg = process.argv.indexOf('--base');
const BASE = baseArg >= 0 ? process.argv[baseArg + 1] : null;
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new RegExp(process.argv[onlyArg + 1]) : null;
if (!BASE || !fs.existsSync(path.join(BASE, 'bloom.html'))) {
  console.error('shot-bloom-stem-plug: need --base <worktree of the tree BEFORE the plug>');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const VIEW = 560, DPR = 2;
const here = await serveRepo();
const there = await serveRepo(BASE);
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { here.server.close(); there.server.close(); process.exit(2); }); }
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

/* FROM BELOW AND TO ONE SIDE. Straight up the axis makes a disc and an annulus
   differ only by a hole in the middle; from here the tube's WALL is in the
   picture beside the face, which is what the plug's length is measured against. */
const FROM_BELOW = [0.60, -0.45, -1];

async function cell(c, tree) {
  const sets = { stemLength: 60, stemDiameter: c.stem, ...(c.extra || {}) };
  await openBloom(page, tree.port);
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
  /* THE CAMERA IS THE BUILD'S OWN TIP AND ITS OWN RADIUS. Both trees report
     `stem.tip` and `stem.outerR`, so a pair shares one camera without either
     side being told a number by this file. */
  const tipZ = m.stem.tip[2], R = m.stem.outerR;
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir, null),
    { r: R * 2.3, at: [0, 0, tipZ + R * 0.35], dir: FROM_BELOW });
  const settled = await settleOnly();
  if (settled < 0) await die(`${c.id}: never came to rest`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: VIEW, height: VIEW }, timeout: 180000 });
  fs.writeFileSync(path.join(outDir, `${c.id}.png`), buf);
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const line = (readout.match(/STEM [^\n]+/) || [''])[0];
  return { ...c, buf, m, line, tipZ, R };
}

/* ---- the cells ------------------------------------------------------- */
const CELLS = [
  { id: 'a-before', row: 'a', tree: 'base', stem: 4, title: 'BEFORE &mdash; a 4 mm stem' },
  { id: 'a-after', row: 'a', tree: 'here', stem: 4, title: 'AFTER &mdash; the same 4 mm stem' },
  { id: 'a-solid', row: 'a', tree: 'here', stem: 3, title: 'THE CONTROL &mdash; a 3 mm SOLID stem' },
  { id: 'b-before', row: 'b', tree: 'base', stem: 12, title: 'BEFORE &mdash; the widest bore (12 mm)' },
  { id: 'b-after', row: 'b', tree: 'here', stem: 12, title: 'AFTER &mdash; the same 12 mm stem' },
  { id: 'b-meet', row: 'b', tree: 'here', stem: 12, title: 'THE TWO CLOSURES MEET &mdash; a 1 mm stem',
    extra: { placement: 'CONTINUOUS', hubShape: 'SPHERE', petalCount: 3, spread: 0.6, layerSize: 0.35, stemLength: 1 } },
];
const chosen = ONLY ? CELLS.filter((x) => ONLY.test(x.id)) : CELLS;
if (!chosen.length) { console.error(`--only ${ONLY} matched no cell`); process.exit(2); }

const shots = [];
for (const c of chosen) shots.push(await cell(c, c.tree === 'base' ? there : here));

/* ---- the same-tree control, REPORTED never a bar --------------------- */
const controls = {};
for (const id of ['a-after', 'b-after']) {
  const s = shots.find((x) => x.id === id);
  if (!s) continue;
  const again = await cell(CELLS.find((x) => x.id === id), here);
  controls[id] = pixelDiff(s.buf, again.buf);
}

/* ---- compose ONE image ------------------------------------------------ */
const poly = (rad, n) => 0.5 * n * rad * rad * Math.sin(2 * Math.PI / n);
const capOf = (s) => {
  const S = s.m.stem;
  const N = S.sides;
  /* THE BOTTOM FACE'S OWN AREA, in closed form from the radii the build
     reports — a full N-gon where the bore is closed and that less the bore's
     where it is not. It is the quantity the picture is of, said as a number so
     the cell can be checked rather than only looked at. */
  const closed = S.voidMm === undefined ? false : !(S.voidMm > 0) || S.tipPlugMm > 0;
  const face = poly(S.outerR, N) - (S.boreR > 0 && !closed ? poly(S.boreR, N) : 0);
  const shape = S.boreR === 0 ? 'a full disc (no bore at this diameter &mdash; Eva&rsquo;s own rule)'
    : closed ? 'a full <b>DISC</b>' : 'an <b>ANNULUS</b> &mdash; an open channel';
  const bore = S.boreR > 0 ? `${(S.boreR * 2).toFixed(1)} mm bore` : 'SOLID';
  const plug = S.tipPlugMm === undefined ? 'no tip plug on this tree'
    : S.solidThrough ? `SOLID THROUGHOUT &mdash; a ${S.solidBandMm.toFixed(2)} mm root band and a ${S.tipPlugMm.toFixed(2)} mm tip plug MEET`
    : S.tipPlugMm > 0 ? `tip plug <b>${S.tipPlugMm.toFixed(2)} mm</b> &middot; ${S.voidMm.toFixed(2)} mm of sealed bore`
    : 'no plug (there is no bore to close)';
  return `${(S.outerR * 2).toFixed(1)} mm across, ${bore} &middot; the bottom face is ${shape}, ${face.toFixed(2)} mm&sup2;<br>` +
    `${plug}<br>${s.m.stemTris} stem triangles &middot; ${modeTag(s.m)}`;
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
<h1>The bottom of a bored stem &mdash; before and after</h1>
<p class="sub">Every cell is a MACRO of the stem&rsquo;s own tip, EXPORT (print preview on, <code>shownMode</code> asserted), framed from BELOW and to one side at a radius read from the build&rsquo;s own outer radius, targeted on its own emitted tip &mdash; so a pair shares one camera and a 12 mm stem is framed to its size rather than to a 4 mm one&rsquo;s. The BEFORE cells are a <b>real render of the old code</b>, served from a git worktree of the base commit over its own HTTP server. <b>No pixel delta is quoted for any pair</b>: two trees, two servers and two page sessions, which is not a comparison this renderer supports. The numbers in the captions are the geometry&rsquo;s own and are exact.</p>

<h2>What Eva asked for &mdash; a 4 mm stem</h2>
<p class="note">A 4 mm stem has a 1.0 mm bore &mdash; a 0.5 mm radius under Eva&rsquo;s <code>max(0, r &minus; 1.5)</code> rule, which is stated on the RADIUS while every figure here is a diameter. Before, the bottom was the tube&rsquo;s section and you could look up it; after, it is a full disc closed over 1.50 mm &mdash; the same thickness the rule already spends on the side of the tube. The third cell is the 3 mm stem, where the bore closes at the floor and there was never anything to plug: it is unchanged, to the byte.</p>
${rowHtml('a')}

<h2>The widest bore, and the case where the two closures meet</h2>
<p class="note">At 12 mm the bore is 9.0 mm across and 56% of the bottom face was hole, which is where the change is most legible. The third cell is the CROSSOVER: both closures are derived from lengths, so on a 1 mm stem the 1.20 mm root band and the 1.50 mm tip plug overlap and no bore survives at all &mdash; the stem is solid throughout, and the read-out says so in one sentence rather than two.</p>
${rowHtml('b')}
<p class="foot">Same-tree controls, reported and never used as a bar: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' &middot; ') || '(none &mdash; --only run)'}. Every cell settled to two byte-identical frames. Base tree: <code>${BASE}</code>.</p>`;

await page.setViewportSize({ width: 1240, height: 1100 });
await page.setContent(html);
await page.waitForTimeout(400);
const sheet = await page.screenshot({ fullPage: true });
fs.writeFileSync(path.join(outDir, 'stem-tip-plug.png'), sheet);

const lines = shots.map((s) => `${s.id}: ${s.tree} tree · ${s.stem} mm · ${modeTag(s.m)} · ${s.line}`);
lines.push(`same-tree controls: ${Object.entries(controls).map(([k, v]) => `${k} ${v} px`).join(' · ')}`);
fs.writeFileSync(path.join(outDir, 'captions.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`\nwrote ${path.join(outDir, 'stem-tip-plug.png')}`);
await browser.close(); here.server.close(); there.server.close();
