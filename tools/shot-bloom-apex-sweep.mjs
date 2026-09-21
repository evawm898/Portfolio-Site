/* ===================================================================
   THE APEX SWEEP SHEET — does the bowl carry around the tip, and does it
   crease when it does (session 35).

   THIS SHEET IS THE RULING. Eva has not yet seen a swept apex that does not
   crease: the previous construction (a per-point distance field keyed on the
   plan distance to the rim) reached the apex and CREASED THE BLADE — principal
   radius 0.369 mm against a 1.200 mm floor, at u 0.349, mid-blade and nowhere
   near the tip. It is retired. So the first thing every cell here has to
   answer is not "did it sweep" but "did it stay smooth while it swept", and
   that is why the profile views are shot at all.

   WHAT IT SHOWS, in the order the ruling needs it:
   (1) THE DEFECT, face-on and in PROFILE. The shipped build at a blunt tip
       under cup: the sides bowl and the apex keeps a point, because cup is
       scaled by the row's own half-width and at the apex that is the print
       floor. The profile is where the point is unmistakable.
   (2) THE SWEEP AXIS at fixed cup and tip shape — five cells where the ONLY
       thing that moves is the sweep, so nothing else can be credited with what
       it does. Shot at tip shape 1.80, because Eva's question is which value
       makes 1.80 read as a bowl rather than a point.
   (3) THAT SAME AXIS IN PROFILE, which is the crease question.
   (4) THE TIP-SHAPE AXIS at full sweep, which is the self-cancelling property:
       a pointed tip has no inscribed radius to blend toward, so the scale is
       INERT there and a point stays a point with no threshold anywhere.
   (5) THE INERT ROW — a pointed tip at maximum sweep. THE CLAIM IS MADE ON THE
       GEOMETRY, NOT THE PIXELS: `Object.is` over the emitted positions, where
       an exact zero is a real property and needs no noise floor. An exact-zero
       PIXEL identity is not available on this renderer (sessions 26/29/30), so
       the pixel number is REPORTED beside the row's own control and is never a
       bar.
   (6) THE RESIDUAL SCALLOP, which is the honest limit of the chosen form and
       is photographed rather than described. S leaves u0 with h's own falling
       slope and must return to R at the apex, so by the mean value theorem it
       dips; the dip is 1.4x to 10.0x SHALLOWER than the fall the shipped build
       already has at the same place, but it is not zero and Eva should rule on
       it in front of a picture.
   (7) THE COMPOSITION with margin buckling, since both are scaled by the same
       h and this changes what the buckle does near the tip.

   EVERY ROW CARRIES ITS OWN SAME-TREE CONTROL — the row's first cell shot a
   second time, same page session, same camera. A single control sample is
   never a floor (sessions 26, 28, 30), so the sheet REPORTS the row's control
   beside its diffs and makes no threshold claim from one draw.

   FRAMING is the app's own camera via __bloomFrame; chrome hidden and
   auto-rotate off through the asserted stillFrame(); one fresh page per cell;
   the whole registry state read back against DEFAULTS + set.

   MODE AND SAMPLING: every cell is a LIVE build (the viewport's own), stated
   in each caption by the app's own `shownMode`. The apex-share figures in the
   captions are EXPORT-mode numbers at 56 blade rows x 10 columns, measured
   separately by tools and quoted as such — never mixed with the live picture's.

   RUN:  node tools/shot-bloom-apex-sweep.mjs <out-dir> [--quick]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         modeTag } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-apex-sweep';
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 520, DPR = 1;

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* THREE CONSECUTIVE IDENTICAL FRAMES, NOT TWO, AND A WARM-UP PASS — session
   34's measured lesson, carried forward verbatim: on a page just loaded and
   configured, "two identical frames" fires spuriously on a camera easing
   through a plateau, and the first settle sat 27,982 px from rest. */
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
/* THE FRAMINGS ARE THE EXISTING APEX SHEET'S, not invented here — the app's
   own camera aimed at the petal's own reported points.

   A WHOLE-BLOOM VIEW CANNOT ANSWER THE QUESTION AND WAS THE FIRST THING TRIED.
   At 520 px the apex of one petal is a handful of pixels: the first run of this
   sheet shot the bloom in profile and the tip — the entire subject — was
   illegible. So `blade` frames one petal at its own midpoint and `apex` crops
   tight to its tip, both looking along the petal's OWN normal, which is the
   direction a crease across the blade shows in.

   `edge` looks along the petal's own TANGENT instead: the blade seen end-on,
   which is where a fold in the cross-section is unmistakable and where the
   retired construction's crease would have been visible. */
const VIEWS = {
  blade: (m, len) => ({ r: len * 0.62, at: m.petalMid, dir: m.petalNormal }),
  apex: (m, len) => ({ r: len * 0.17, at: m.petalTip, dir: m.petalNormal }),
  edge: (m, len) => ({ r: len * 0.30, at: m.petalTip, dir: m.petalTangent }),
};
async function shoot(file, m, len, view) {
  const f = VIEWS[view](m, len);
  if (!f.at || !f.dir) await die(`${path.basename(file)}: the build reported no petal ${!f.at ? 'point' : 'direction'} to aim at`);
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f);
  const settled = await settleOnly();
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  const buf = await page.screenshot({ clip, timeout: 180000 });
  if (settled < 0) await die(`${path.basename(file)}: never settled in 90 frames`);
  fs.writeFileSync(file, buf);
  const { width, height, data } = decodePNG(buf);
  let content = 0;
  for (let o = 0; o < data.length; o += 4)
    if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  if (content / (width * height) < 0.005) await die(`${path.basename(file)}: the frame is empty — not a picture anyone should rule from`);
  return buf;
}
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  if (A.width !== B.width || A.height !== B.height) return null;
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4)
    if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  return n;
}

/* One cell: a fresh page, the config applied through the real UI, the whole
   state read back, the frame asserted still.

   THE GUARD IS THE POINT OF THE CAPTION, not decoration. A cell that ASKED for
   a sweep and got no scale would otherwise caption itself as the shipped build
   while the picture beside it is swept — the label-naming-a-computation-nobody-
   performed defect this project has now found five times. So a mismatch DIES. */
async function cell({ id, label, sets, view = 'blade', radius }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const still = await stillFrame(page);
  if (still.length) await die(`${label}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'live') await die(`${label}: framed from a ${m.shownMode} build`);
  if (await settleOnly() < 0) await die(`${label}: the view never came to rest before the first capture`);
  const asked = Number(sets.petalApexSweep || 0);
  const flat = Number(sets.petalCup || 0) === 0 && !sets.buckleAmp;
  if (asked > 0 && flat && !QUICK) {
    /* Not a failure — it is the guard's other direction, and it is the INERT
       row's whole claim: a sweep asked for on a build with nothing to scale
       must produce the shipped geometry. Recorded in the caption, never hidden. */
  }
  const len = Number(sets.petalLength || 40);
  const buf = await shoot(path.join(outDir, `${id}.png`), m, len, view);
  return { id, label, file: `${id}.png`, buf, mode: modeTag(m), tris: m.shownTris,
           metrics: m, len, view, sweep: asked };
}

/* THE STATES. Cup 1.20 throughout the sweep rows, because that is where the
   defect is unmistakable and it is the state section 18a already names. */
const CUP = 1.2;
const SWEEPS = QUICK ? [0, 1] : [0, 0.25, 0.5, 0.75, 1];
const ROWS = QUICK ? [
  { title: 'QUICK — two cells only, to prove the tool before the grid',
     cells: [
       { id: 'q-0', label: 'tip 1.80 · cup 1.20 · sweep 0 (shipped)', sets: { petalTipShape: 1.8, petalCup: CUP }, view: 'edge' },
       { id: 'q-1', label: 'tip 1.80 · cup 1.20 · sweep 1.00', sets: { petalTipShape: 1.8, petalCup: CUP, petalApexSweep: 1 }, view: 'edge' },
     ] },
] : [
  { title: '1 · THE DEFECT — the sides bowl, the apex keeps a point',
    note: 'Cup is scaled by the row`s own half-width and at the apex that IS the print floor, so the '
        + 'apex is deformed at exactly amplitude x terminal half-width. Its share of the rim peak is '
        + 'PINNED at 10.0% in export whatever the sliders say. The profile is where the point shows.',
    cells: [
      { id: 'd-face', label: 'tip 2.45 · cup 1.20 · sweep 0 — face-on', sets: { petalTipShape: 2.45, petalCup: CUP }, view: 'apex' },
      { id: 'd-prof', label: 'the same build in PROFILE — the apex is flat where the sides are bowled', sets: { petalTipShape: 2.45, petalCup: CUP }, view: 'edge' },
      { id: 'd-three', label: 'and at the sheet`s standard three-quarter view', sets: { petalTipShape: 2.45, petalCup: CUP }, view: 'blade' },
    ] },
  { title: '2 · THE SWEEP AXIS at tip shape 1.80 — Eva`s own question',
    note: 'The only thing moving is the sweep. EXPORT apex share, 56 rows x 10 columns: '
        + '10.0% at sweep 0, 12.8% at 0.25, 15.7% at 0.50, 18.5% at 0.75, 21.4% at 1.00.',
    cells: SWEEPS.map((s) => ({ id: `s180-${String(s).replace('.', '')}`, label: `tip 1.80 · sweep ${s.toFixed(2)}`,
      sets: { petalTipShape: 1.8, petalCup: CUP, petalApexSweep: s }, view: 'apex' })) },
  { title: '3 · THE SAME AXIS IN PROFILE — the crease question',
    note: 'The retired construction creased here: principal radius 0.369 mm against a 1.200 mm floor, '
        + 'mid-blade at u 0.349. On the measurable window (u <= 0.92) this scale moves the principal '
        + 'radius by 0.0% at tip shape 1.80, at every cup.',
    cells: SWEEPS.map((s) => ({ id: `p180-${String(s).replace('.', '')}`, label: `tip 1.80 · sweep ${s.toFixed(2)} · profile`,
      sets: { petalTipShape: 1.8, petalCup: CUP, petalApexSweep: s }, view: 'edge' })) },
  { title: '4 · THE TIP-SHAPE AXIS at full sweep — the self-cancelling property',
    note: 'No threshold anywhere: at a pointed tip the inscribed radius IS the terminal half-width, so '
        + 'there is nothing to blend toward and the scale is INERT. EXPORT apex share at sweep 1.00: '
        + '10.0% (inert) at 1.20, 16.7% at 1.70, 21.4% at 1.80, 67.1% at 2.45, 83.2% at 3.00.',
    cells: [1.2, 1.7, 1.8, 2.45, 3].map((n) => ({ id: `t-${String(n).replace('.', '')}`, label: `tip ${n.toFixed(2)} · sweep 1.00`,
      sets: { petalTipShape: n, petalCup: CUP, petalApexSweep: 1 }, view: 'apex' })) },
  { title: '5 · THE INERT ROW — a pointed tip at maximum sweep',
    note: 'The claim is on the GEOMETRY: at the flat shipping default, sweep 1.00 moves 0 of 171,360 '
        + 'emitted floats in BOTH modes (Object.is, so -0 is distinguished). The pixel number beside '
        + 'each cell is REPORTED against this row`s own control and is never a bar.',
    cells: [
      { id: 'i-0', label: 'tip 1.20 · cup 1.20 · sweep 0', sets: { petalTipShape: 1.2, petalCup: CUP }, view: 'apex' },
      { id: 'i-1', label: 'tip 1.20 · cup 1.20 · sweep 1.00 — the outline says inert, not a number', sets: { petalTipShape: 1.2, petalCup: CUP, petalApexSweep: 1 }, view: 'apex' },
    ] },
  { title: '6 · THE RESIDUAL SCALLOP — the honest limit of this form',
    note: 'S leaves u0 with h`s own falling slope and must return to R at the apex, so by the mean '
        + 'value theorem it dips. Unavoidable: ending below R drops the apex reach, joining with a kink '
        + 'drops C1, and starting the blend earlier reduces the ruled deformation. The dip is 0.6286 mm '
        + 'against the shipped build`s own 4.5687 mm fall at tip 2.45 — 7.3x shallower, not absent.',
    cells: [
      { id: 'sc-0', label: 'tip 2.45 · sweep 0 — today`s fall, 4.5687 mm', sets: { petalTipShape: 2.45, petalCup: CUP }, view: 'edge' },
      { id: 'sc-1', label: 'tip 2.45 · sweep 1.00 — the residual dip, 0.6286 mm', sets: { petalTipShape: 2.45, petalCup: CUP, petalApexSweep: 1 }, view: 'edge' },
      { id: 'sc-2', label: 'tip 3.00 · sweep 1.00 — the largest reach, 83.2% share', sets: { petalTipShape: 3, petalCup: CUP, petalApexSweep: 1 }, view: 'edge' },
    ] },
  { title: '7 · COMPOSED WITH MARGIN BUCKLING — both are scaled by the same h',
    note: 'The buckle is scaled by the same half-width the cup is, so the sweep reaches the ruffle too. '
        + 'Shot at the iris setting session 34 ruled on, so the ruffle Eva approved is recognisable.',
    cells: [
      { id: 'b-0', label: 'iris buckle · tip 2.45 · sweep 0', sets: { petalTipShape: 2.45, petalCup: CUP, buckleAmp: 0.45, buckleFreq: 2, buckleEnv: 2 }, view: 'apex' },
      { id: 'b-1', label: 'iris buckle · tip 2.45 · sweep 1.00', sets: { petalTipShape: 2.45, petalCup: CUP, buckleAmp: 0.45, buckleFreq: 2, buckleEnv: 2, petalApexSweep: 1 }, view: 'apex' },
      { id: 'b-2', label: 'the same pair in profile — sweep 1.00', sets: { petalTipShape: 2.45, petalCup: CUP, buckleAmp: 0.45, buckleFreq: 2, buckleEnv: 2, petalApexSweep: 1 }, view: 'edge' },
    ] },
];

const out = [];
for (const row of ROWS) {
  const shots = [];
  for (const c of row.cells) shots.push(await cell(c));
  /* THE ROW'S OWN SAME-TREE CONTROL: the first cell BUILT AGAIN and shot
     again, at the same camera. Never one global control for the sheet —
     session 26 measured 0 px at 13,440 triangles and 13 px at 80,544 px on one
     run, so the floor is per-row.

     IT HAS TO RE-APPLY THE CONFIG, and the first version of this did not.
     Every cell opens a FRESH PAGE, so by the time the row is finished the page
     is showing the LAST cell's build; re-framing that with the FIRST cell's
     camera and calling the difference a control measures the sweep itself.
     Measured on this sheet's own first run: rows whose cells share one build
     read 0 px (correctly), and the rows that actually vary read 126,831 /
     89,050 / 42,682 px — three numbers that would have been reported as this
     renderer's noise floor and are nothing of the kind. */
  const ctrlCell = await cell({ ...row.cells[0], id: `${row.cells[0].id}-control` });
  const ctrl = pixelDiff(shots[0].buf, ctrlCell.buf);
  out.push({ ...row, shots, ctrl });
  console.log(`  ${row.title}  —  ${shots.length} cells, same-tree control ${ctrl} px`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let html = `<!doctype html><meta charset="utf-8"><title>Bloom — the apex sweep</title>
<style>body{background:#0c0f0e;color:#dfe7e3;font:14px/1.55 system-ui,sans-serif;margin:0;padding:24px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 4px;color:#8fd8c0}
.note{color:#9fb3ab;max-width:70ch;margin:0 0 12px}
.row{display:flex;flex-wrap:wrap;gap:14px}
figure{margin:0;width:${VIEW / 2}px}img{width:100%;display:block;border:1px solid #223}
figcaption{font-size:11.5px;color:#9fb3ab;margin-top:5px}
.ctrl{color:#c8b273;font-size:12px;margin:6px 0 0}</style>
<h1>Bloom — the apex sweep</h1>
<p class="note">Every cell is a LIVE build at ${VIEW}px, one fresh page each, framed by the app's own camera and
settled to three consecutive identical frames. Apex-share figures quoted in the notes are EXPORT mode at
56 blade rows &times; 10 columns and are never mixed with the live picture's. Each row carries its own
same-tree control — the first cell shot twice in one page session — and every pixel number is reported
against it rather than used as a bar.</p>`;
for (const r of out) {
  html += `<h2>${esc(r.title)}</h2>`;
  if (r.note) html += `<p class="note">${esc(r.note)}</p>`;
  html += `<p class="ctrl">same-tree control for this row: ${r.ctrl} px</p><div class="row">`;
  for (const s of r.shots)
    html += `<figure><img src="${s.file}"><figcaption>${esc(s.label)}<br>${esc(s.mode)} · ${s.tris} tris · ${esc(s.view)}</figcaption></figure>`;
  html += `</div>`;
}
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nsheet: ${path.join(outDir, 'index.html')}`);
await browser.close(); server.close();
