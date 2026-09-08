/* ===================================================================
   shot-bloom-anther.mjs — THE ANTHER'S SEVEN (session 29)

   THE SHEET IS THE POINT OF THIS SESSION and it is the first time the tip's
   parameter space is seen in the real generator rather than in a discovery
   rig. Eva's brief names what it must show: the CORNERS AND THE MIDDLE — a
   sphere, the shipping pill, a triangle, a rounded star — AT THE ANTHER'S
   ACTUAL SIZE, and at BOTH six stamens and 120.

   SO EVERY SHAPE IS SHOT THREE TIMES, at three scales, and each cell carries
   its own mm per pixel:
     - `whole`  the bloom at its own fit radius. This is what "at the anther's
                actual size" means: a 1.92 mm anther on a ~90 mm bloom, not a
                rendering of a pill filling a frame. If a shape is invisible
                here that IS the finding, and it is Q8's whole argument.
     - `lens`   the head at hand-lens scale (16 mm across), where six anthers
                or a 120-anther cushion read as an arrangement.
     - `macro`  ONE anther, framed from its OWN diameter (1.8x it, so the
                7.20 mm anther and the 1.92 mm one are both legible and the
                caption says the scale rather than implying one).

   EVERY ROW CARRIES ITS OWN SAME-TREE RENDERER CONTROL (Eva, Sep 7, from
   session 26's sheet): the same tree, the same camera, shot twice. The noise
   floor here is per ROW, not per sheet — session 26 measured 0 px at 13,440
   triangles and 13 px at 80,544 on one run — so a control taken once for the
   whole sheet would be the wrong number on most of it. A pixel figure printed
   without its control beside it is not a measurement.

   AND THE FRAME SETTLES ON THE REAL SIGNAL: screenshot until two consecutive
   frames are BYTE-IDENTICAL, never a fixed sleep. Orbit damping's half-life
   is seconds at the ~2 fps software GL gives headless, and a fixed 260 ms
   wait samples an arbitrary point on the way in — measured at 4,925-7,426
   pixels of same-tree noise before session 26 changed it.

   THE ASSERTIONS, and the pixel ones are stated against the MEASURED floor
   rather than against zero:
     - EVERY SHAPE MUST DIFFER FROM THE SHIPPING PILL at the same stamen
       count, ON SOME VIEW, by more than ten times that view's own noise.
       Without it a sheet that silently photographed one shape seven times
       would look exactly like this one.
     - THE INERT ROW IS HELD BY TWO EXACT CLAIMS AND ONE BOUNDED ONE. Exact:
       its triangle count and its whole ANTHER read-out line — the lattice,
       the waist, the flags — must be the pill's, character for character.
       Bounded: its pixel difference from the pill must not exceed the two
       rows' own measured controls added together.

       PIXEL-IDENTICAL WAS TRIED FIRST AND IS FALSE, and so is a bound on
       `whole`. Measured across two runs of this sheet: the inert row came
       back 51 px then 10,491 px on `whole`, and the SAME-TREE CONTROL on
       `whole` is BIMODAL — 0, 51, 50, 10,486, 0, 52, 10,635 px across seven
       rows of one run. Two of eight rows' own controls hit the high mode.
       That is not a per-row floor; it is an intermittent renderer state that
       catches some page sessions and not others, and settling on
       byte-identical FRAMES does not remove it (it removes the orbit
       damping, which is a different thing — session 26 measured the same
       phenomenon from the other side: 0 px at 13,440 triangles, 13 px at
       80,544).

       SO THE BOUND IS ASSERTED ON `macro` ALONE, whose control measured 0 px
       on every row of both runs, and `whole` and `lens` are REPORTED beside
       their controls with no claim attached. The exact claims carry the
       weight. That is the charter's own rule — report the residue beside its
       control and assert the property that can actually fail — rather than a
       tolerance chosen to fit the data in hand.

   AND THE PER-VIEW NOISE FLOOR IS PRINTED ON EVERY COMPARISON, because it is
   the finding as much as the pictures are: on `whole` it runs to ~10,500 px
   on this bloom, so a shape difference of the same order at whole-bloom scale
   IS NOT VISIBLE and must not be read as one. That is Q8's argument for the
   size slider, arriving as a measurement.

   WHAT THIS SHEET IS NOT. It is not a byte instrument: 0 moved on the
   shipping default is closed by tools/diff-bloom-bytes.mjs against
   `frozen/phase18`, not here. It is not a print instrument either — the
   0.50 mm waist floor it photographs is MIN_FEATURE_MM / 2 and
   MIN_FEATURE_MM is an assumption; UNMEASURED, no coupon has been printed.

   RUN:  node tools/shot-bloom-anther.mjs <out-dir> [base-tree] [--quick]
         The optional base tree adds ONE before/after pair on the shipping
         pill — the visual half of "0 moved", predeclared to hold.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf, fullStateDrift, stillFrame, settleBuild, modeTag, shownModeOf, CONTROLS } from './bloom-harness.mjs';

const outDir = (process.argv.slice(2).filter((a) => !a.startsWith('--'))[0]) || '/tmp/bloom-anther';
const BASE_ROOT = (process.argv.slice(3).filter((a) => !a.startsWith('--'))[0]) || null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const base = BASE_ROOT && fs.existsSync(path.join(BASE_ROOT, 'bloom.html')) ? await serveRepo(BASE_ROOT) : null;
const baseKinds = base ? await kindsOf(BASE_ROOT) : null;
if (BASE_ROOT && !base) { console.error(`HARNESS INVALID: --base tree named as ${BASE_ROOT} and there is no bloom.html there. A missing base is not a cell to skip.`); process.exit(2); }
const VIEW = 800, DPR = 2;
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); if (base) base.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

async function shoot(file, frame) {
  await page.evaluate((a) => (a.at ? window.__bloomFrame(a.r, 0, a.at, a.dir, a.up || null) : window.__bloomFrame(a.r, 0.15)), frame);
  /* THE 30-SECOND DEFAULT IS NOT ENOUGH HERE, measured: the heaviest cell on
     this sheet — 120 stamens at size 6.00, macro-framed, so 120 seven-
     millimetre anthers fill a 1600x1600 buffer on software GL — timed a
     screenshot out and killed the run at cell 44 of 49. It is fill rate, not
     triangles (77,280 of them). A settle loop that screenshots up to sixty
     times needs each one to be allowed to finish, or the instrument fails on
     its own most interesting row. */
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let prev = null, buf = null, settledAt = -1;
  for (let k = 0; k < 60; k++) {
    await page.waitForTimeout(100);
    buf = await page.screenshot({ clip, timeout: 180000 });
    if (prev && buf.equals(prev)) { settledAt = k; break; }
    prev = buf;
  }
  if (settledAt < 0) await die(`${path.basename(file)}: the view never settled — 60 frames and consecutive screenshots still differ`);
  fs.writeFileSync(file, buf);
  const { width, height, data } = decodePNG(buf);
  let content = 0;
  for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  const frac = content / (width * height);
  if (frac < 0.005) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(2)}% content — not a picture anyone should rule from`);
  return { file: path.basename(file), mmPerPx: (2 * frame.r) / (VIEW * DPR), settledAt };
}

/* TWO NUMBERS, because they answer different questions: how MUCH of the frame
   changed, and how FAR the worst pixel changed. */
function pixelDiff(fa, fb) {
  const A = decodePNG(fs.readFileSync(fa)), B = decodePNG(fs.readFileSync(fb));
  if (A.width !== B.width || A.height !== B.height) return null;
  let n = 0, worst = 0;
  for (let o = 0; o < A.data.length; o += 4) {
    const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
    if (d > 0) { n++; if (d > worst) worst = d; }
  }
  return { pixels: n, frac: n / (A.width * A.height), worst };
}

const VIEWS = ['whole', 'lens', 'macro'];
async function cell({ label, sets, onBase, frames }) {
  await openBloom(page, onBase ? base.port : port);
  const bad = await applyConfig(page, sets, onBase ? baseKinds : null);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  /* THE DRIFT CHECK IS AGAINST THE TREE BEING DRIVEN, not against this one.
     The base commit predates the anther's seven, so every one of them reads
     `undefined` there and a straight comparison against HEAD's DEFAULTS
     reports seven drifts on a page that is behaving perfectly. The seven are
     dropped for a BASE cell — and the drop is CHECKED: exactly the ids the
     base tree does not declare may be dropped, and nothing else, so a real
     drift on a control both trees share still fails. */
  const drift0 = await fullStateDrift(page, sets);
  const drift = onBase ? drift0.filter((d) => baseKinds[d.split(':')[0]] !== undefined) : drift0;
  if (onBase) {
    const dropped = drift0.filter((d) => baseKinds[d.split(':')[0]] === undefined).map((d) => d.split(':')[0]).sort();
    const want = CONTROLS.filter((c) => baseKinds[c.id] === undefined).map((c) => c.id).sort();
    if (dropped.join(',') !== want.join(',')) await die(`${label}: the base tree's missing-control set is ${want.join(', ') || '(none)'} and the drift report dropped ${dropped.join(', ') || '(none)'} — the filter is not the base's own control set`);
  }
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  if (!m0.stamens.length) await die(`${label}: no stamen emitted — every cell on this sheet is about an anther`);
  /* THE MACRO FRAME COMES FROM THE ANTHER'S OWN DIAMETER, so a 7.20 mm tip
     and a 1.92 mm one are both legible and the caption carries the scale. */
  const A = m0.androecium;
  const own = { fit: m0.fitRadius, centre: m0.stamens[0].apex, macro: Math.max(1.2, 1.8 * A.anther.diameter) };
  const fr = frames || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const dir = [0.45, -0.78, 0.44];
  const F = {
    whole: { r: fr.fit },
    lens: { r: 8, at: fr.centre, dir, up: [0, 0, 1] },
    macro: { r: fr.macro, at: fr.centre, dir, up: [0, 0, 1] },
  };
  const shots = {};
  for (const v of VIEWS) shots[v] = await shoot(path.join(outDir, `${slug(label)}-${v}.png`), F[v]);
  await setPreview(false);
  const antherLine = readout.split('\n').find((l) => /^ANTHER /.test(l)) || '';
  console.log(`  ${label.padEnd(70)} ${onBase ? 'BASE ' : 'HEAD '} tris ${m.shownTris} · ${A.anther.sides} sides · ${modeTag(m)}`);
  return { label, onBase, tag: modeTag(m), shots, own, shownTris: m.shownTris, antherLine, anther: A.anther };
}

/* THE SHAPES — Eva's four (a sphere, the shipping pill, a triangle, a rounded
   star), the three the session's own rulings owe a picture (the waist floor
   binding, the lobe count and spread, and Q8's size), and the INERT corner
   that must come back pixel-identical to the pill. */
const SHAPES = [
  { key: 'pill', name: 'THE SHIPPING PILL — the defaults, and every other cell’s reference', sets: {}, hold: 'reference' },
  { key: 'sphere', name: 'A SPHERE — elongation 1.00, the band floored so no triangle has zero area', sets: { antherElongation: 1 } },
  { key: 'triangle', name: 'A TRIANGLE — 3 points, pinch 1.00 (the polygon), roundedness 0 (12 sides)', sets: { antherPoints: 3, antherPinch: 1, antherRoundedness: 0 } },
  { key: 'star', name: 'A ROUNDED STAR — 6 points, pinch 1.00, roundedness 0.35 (12 sides)', sets: { antherPoints: 6, antherPinch: 1, antherRoundedness: 0.35 } },
  { key: 'floor', name: 'THE WAIST FLOOR BINDING — pinch 7.00 asked, CLAMPED at the 0.50 mm waist', sets: { antherPoints: 4, antherPinch: 7, antherRoundedness: 0 } },
  { key: 'trifid', name: 'A TRIFID ANTHER — 3 lobes at 40°, the stigma’s own law on a filament', sets: { antherLumps: 3, antherSpread: 40 } },
  { key: 'big', name: 'SIZE 6.00x — Q8’s argument: a 7.20 mm anther, where a point is reachable', sets: { antherSize: 6, antherPoints: 5, antherPinch: 2.35, antherRoundedness: 0 } },
  { key: 'inert', name: 'INERT — 12 points at pinch 7.00 with roundedness 1: must be PIXEL-IDENTICAL to the pill', sets: { antherPoints: 12, antherPinch: 7 }, hold: 'identical' },
];
const COUNTS = [
  { key: 'ring6', name: '6 on a RING', sets: { stamenCount: 6 } },
  { key: 'disc120', name: '120 on the DISC', sets: { stamenCount: 120, stamenLayout: 'DISC' } },
];

/* --quick (session 31): the pill, the floor cell and the INERT row on six
   stamens only — the charter's "two rows to prove the tool, the grid once". */
const QUICK = process.argv.includes('--quick');
if (QUICK) { COUNTS.splice(1); SHAPES.splice(0, SHAPES.length, ...SHAPES.filter((x) => ['pill', 'floor', 'inert'].includes(x.key))); }
console.log(`THE ANTHER SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.${QUICK ? ' (--quick)' : ''}\n`);
const cells = [];
for (const c of COUNTS) {
  let ref = null;
  for (const sh of SHAPES) {
    const sets = set({ ...c.sets, ...sh.sets });
    const main = await cell({ label: `${c.key} ${sh.key}`, sets });
    /* THE RENDERER CONTROL: same tree, same camera, twice. */
    const again = await cell({ label: `${c.key} ${sh.key} CONTROL`, sets, frames: main.own });
    const twice = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, main.shots[v].file), path.join(outDir, again.shots[v].file))]));
    let vs = null;
    if (sh.hold === 'reference') { ref = main; ref.twice = twice; }
    else {
      if (!ref) await die('the reference cell must be shot first — the pill is what every other shape is measured against');
      /* Re-frame against the PILL's camera so the comparison is of shapes,
         not of two framings. The pill's own frame is the reference. */
      const same = await cell({ label: `${c.key} ${sh.key} vs pill`, sets, frames: ref.own });
      vs = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, ref.shots[v].file), path.join(outDir, same.shots[v].file))]));
      const bar = (v) => Math.max(10 * ((twice[v] && twice[v].pixels) || 0), 100);
      const moved = VIEWS.some((v) => vs[v] && vs[v].pixels > bar(v));
      if (sh.hold === 'identical') {
        /* THE TWO EXACT CLAIMS FIRST — they are what carries this row. */
        if (main.shownTris !== ref.shownTris) await die(`${c.key}/${sh.key}: ${main.shownTris} triangles against the pill's ${ref.shownTris} — hidden is not inert`);
        if (main.antherLine !== ref.antherLine) await die(`${c.key}/${sh.key}: the ANTHER line is not the pill's, character for character\n    pill  ${ref.antherLine}\n    inert ${main.antherLine}`);
        /* AND THE BOUNDED ONE, on `macro` ALONE — the only view whose
           same-tree control is a floor rather than a bimodal state (see the
           header). Against the two rows' own measured controls added
           together: two page sessions, two noise floors. */
        const floor = (v) => ((twice[v] && twice[v].pixels) || 0) + ((ref.twice[v] && ref.twice[v].pixels) || 0);
        if (!vs.macro || vs.macro.pixels > floor('macro')) await die(`${c.key}/${sh.key}: PREDECLARED WITHIN THE RENDERER'S OWN NOISE on the macro view and it differs by ${vs.macro ? vs.macro.pixels : 'a different frame size'} px against a measured floor of ${floor('macro')} px — the two hidden outline controls are reaching the geometry`);
      } else if (!moved) {
        await die(`${c.key}/${sh.key}: PREDECLARED TO DIFFER from the pill and no view moved past its own renderer control — ${VIEWS.map((v) => `${v} ${vs[v].pixels}px vs control ${twice[v].pixels}px`).join(', ')}; this sheet is photographing one shape twice`);
      }
    }
    cells.push({ count: c, shape: sh, main, twice, vs });
    console.log(`   -> ${c.key}/${sh.key}: control ${VIEWS.map((v) => `${v} ${twice[v].pixels}px`).join(' ')}${vs ? ` · vs pill ${VIEWS.map((v) => `${v} ${vs[v].pixels}px`).join(' ')}` : ' (the reference)'}\n`);
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const VIEWNAME = { whole: 'the whole bloom — the anther at its ACTUAL size', lens: 'the head at hand-lens scale (16 mm across)', macro: 'one anther, framed from its own diameter' };
const fig = (c, view) => {
  const s = c.shots[view];
  return `<figure><img src="${s.file}"><figcaption><b>${esc(VIEWNAME[view])}</b><br>${s.mmPerPx.toFixed(4)} mm per pixel · settled after ${s.settledAt + 1} frames</figcaption></figure>`;
};
const dline = (d, t) => d === null ? 'frames differ in size — not comparable'
  : `${d.pixels.toLocaleString()} px (worst channel step ${d.worst}) against this row’s own renderer control of ${t.pixels.toLocaleString()} px (worst ${t.worst})`
    + (d.pixels <= 10 * t.pixels ? ' &mdash; <b>AT OR BELOW THE NOISE: not a visible difference at this scale</b>' : '');

function writeSheet() {
const html = `<title>The anther's seven — the tip's space in the real generator</title>
<style>
 body{background:#0c0f0e;color:#dfe7e4;font:14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:28px 34px;}
 h1{font-size:19px;letter-spacing:.02em;margin:0 0 4px} h2{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#6fd6b4;margin:34px 0 4px;border-top:1px solid #21302b;padding-top:14px}
 h3{font-size:13px;margin:18px 0 6px;color:#dfe7e4}
 p{max-width:78ch;color:#a9b8b3} code{color:#f0c674}
 .row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:8px 0 4px}
 figure{margin:0} img{width:100%;display:block;background:#000;border:1px solid #21302b}
 figcaption{font-size:11px;color:#8a9a95;padding:5px 2px}
 .said{font-size:11px;color:#7f8f8a;font-family:ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;margin:2px 0 0}
 .num{font-size:12px;color:#c8b98a}
</style>
<h1>The anther&rsquo;s seven &mdash; the tip&rsquo;s space in the real generator</h1>
<p>Session 29, tip plan 3b. Seven controls under <code>Androecium &rsaquo; Tip</code>: size, elongation,
points, pinch (session 31: the exponent&rsquo;s slider, retired), roundedness, lobes, lobe spread. <b>The defaults reproduce today&rsquo;s pill exactly</b>,
by construction &mdash; size and elongation default to the two constants themselves, roundedness 1 makes the
blend exactly 1 and the lattice the rod&rsquo;s own ten, and one lobe at a spread of 0 is the Rodrigues
identity. Every cell is print preview ON, chrome hidden, auto-rotate off.</p>
<p><b>Every row carries its own same-tree renderer control</b> &mdash; the same tree, the same camera, shot
twice &mdash; and every frame is settled until two consecutive screenshots are byte-identical rather than
after a fixed wait. A pixel figure without its control beside it is not a measurement.</p>
<p><b>What is asserted here:</b> every shape differs from the shipping pill by more than ten times its own
control on some view (or this sheet is photographing one shape repeatedly); and the INERT row&rsquo;s triangle
count and whole ANTHER read-out line are the pill&rsquo;s <b>character for character</b>, with its <code>macro</code>
pixel difference inside the two rows&rsquo; own measured controls. <b>No pixel claim is made on
<code>whole</code> or <code>lens</code>:</b> the same-tree control there is bimodal (0&ndash;52 px, or ~10,500 px)
&mdash; an intermittent renderer state that settling on byte-identical frames does not remove &mdash; so those
figures are reported beside their controls and nothing is asserted from them. What is <i>not</i> asserted here: 0 moved, which is
<code>tools/diff-bloom-bytes.mjs</code> against <code>frozen/phase18</code>&rsquo;s job; and anything about
printing &mdash; the 0.50 mm waist floor is <code>MIN_FEATURE_MM / 2</code> and nothing in this project has
been printed.</p>
${COUNTS.map((c) => `
<h2>${esc(c.name)}</h2>
${cells.filter((x) => x.count.key === c.key).map((x) => `
<h3>${esc(x.shape.name)}</h3>
<p class="said">${esc(x.main.antherLine)}</p>
<p class="num">${x.main.shownTris.toLocaleString()} triangles (export) &middot; ${x.main.anther.sides} sides &middot;
 renderer control ${VIEWS.map((v) => `${v} ${x.twice[v] ? x.twice[v].pixels : '?'} px`).join(' &middot; ')}
 ${x.vs ? `<br>against the shipping pill: ${VIEWS.map((v) => `${v} ${dline(x.vs[v], x.twice[v])}`).join('<br>')}` : '<br><b>the reference cell</b>'}</p>
<div class="row">${VIEWS.map((v) => fig(x.main, v)).join('')}</div>
`).join('')}`).join('')}
${migration ? `
<h2>The migration &mdash; the shipping pill, before and after</h2>
<p>The old code from a git worktree of the base commit, beside today&rsquo;s, at the same camera. Predeclared
to <b>hold</b>: ${VIEWS.map((v) => `${v} ${dline(migration.diffs[v], migration.twice[v])}`).join('; ')}.
A picture cannot prove byte identity &mdash; this is its visual half only.</p>
<h3>BEFORE (the base tree)</h3><div class="row">${VIEWS.map((v) => fig(migration.before, v)).join('')}</div>
<h3>AFTER (this tree)</h3><div class="row">${VIEWS.map((v) => fig(migration.after, v)).join('')}</div>
` : ''}
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
/* Declared BEFORE the first write: writeSheet() closes over it, and a page
   written while the pair is still to come renders the grid alone. */
let migration = null;
writeSheet();   // the grid alone, before the optional pair below

/* THE PAGE IS WRITTEN TWICE ON PURPOSE — once with the grid alone, then again
   with the migration pair appended. The grid is the sheet Eva rules from; a
   failure in the optional before/after pair at the end of a fifty-minute run
   should not leave the run with no page at all. The assertions still die();
   what changes is that the evidence already gathered survives them. */
/* THE BEFORE/AFTER PAIR, when a base tree is given: the shipping pill on the
   old code beside the new, predeclared to HOLD. It is the visual half of a
   claim the byte instrument owns; a picture cannot prove 0 moved and this
   sheet does not say it does. */
if (base) {
  const sets = set({ stamenCount: 6 });
  const before = await cell({ label: 'migration BEFORE', sets, onBase: true });
  const ctrl = await cell({ label: 'migration BEFORE CONTROL', sets, onBase: true, frames: before.own });
  const twice = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, ctrl.shots[v].file))]));
  const after = await cell({ label: 'migration AFTER', sets, frames: before.own });
  const diffs = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, after.shots[v].file))]));
  if (before.shownTris !== after.shownTris) await die(`the migration pair moved triangles: BEFORE ${before.shownTris}, AFTER ${after.shownTris}`);
  /* ON `macro` ALONE, the same discipline as the INERT row and for the same
     measured reason: `whole`'s same-tree control is bimodal, so a bound there
     is a coin toss rather than a claim. `whole` and `lens` are reported. */
  if (!diffs.macro || diffs.macro.pixels > ((twice.macro && twice.macro.pixels) || 0)) await die(`the shipping pill is PREDECLARED TO HOLD across the migration and its macro view moved ${diffs.macro ? diffs.macro.pixels : 'to a different frame size'} px against a control of ${(twice.macro && twice.macro.pixels) || 0} px`);
  migration = { before, after, twice, diffs };
  console.log(`   -> migration: HELD · ${VIEWS.map((v) => `${v} ${diffs[v].pixels} px vs control ${twice[v].pixels} px`).join(' · ')}\n`);
}

writeSheet();
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); if (base) base.server.close();
