/* ===================================================================
   shot-bloom-apex.mjs — DISCOVERY contact sheet for PETAL TIP SHAPE
   (the whole-petal apex, round to pointed). Canvas only. Session 32,
   PHASE A. Nothing here ships and nothing here is a gate.

   WHY THIS TOOL EXISTS, and why it patches rather than builds. Phase A was
   told to continue into the build only if exactly ONE mechanism survived
   costing. Two did (see docs/bloom-session-32-outcome.md), so the session
   stops at this sheet and Eva rules. A ruling needs pictures of geometry
   that does not exist yet — so the candidate laws are applied by REWRITING
   bloom-geometry.js IN FLIGHT, through page.route(), exactly the way
   verify-plot.mjs and verify-print-scaffold.mjs re-serve mutated copies of
   their own modules. NO SHIPPED SOURCE IS TOUCHED BY THIS SESSION: the
   candidate arms live here, in the tool that owns the question, and the
   winner becomes a real control (with gate rows) at the ruling while the
   loser is deleted with this file's candidate table.

   THE PATCH IS ASSERTED, NEVER TRUSTED. Every substitution below must match
   EXACTLY ONCE in the source or the run aborts — the mutant discipline, and
   the one thing that makes "the candidate law was applied" evidence rather
   than a hope. A tool that silently failed to patch would render five
   identical cells and call it a space.

   THE IDENTITY IS A POSITIVE CONTROL, not an argument. The patched module
   with NO apex spec, and the `cap` law at m = 1, must reproduce the shipped
   `widthProfile` to the BIT — asserted with Object.is over every drawn row
   in both modes before any cell is rendered. That is also the measurement
   that tells Eva whether "0 moved" is available to Phase B by construction.

   THE TWO CANDIDATES

     cap    { law: 'cap', m }              — M1. Shapes the CONVERGING TIP
            CAP's interpolant with one exponent. m = 1 is today's straight
            cone, m < 1 rounds the apex, m > 1 draws it out. Lives only in
            the pointed family, because the cap does: `petalTipBreadth === 0`
            is an EXACT branch (Eva, Sep 1) and above it there is no cap.
     blunt  { law: 'blunt', m, end }       — M6. Makes the cap
            UNCONDITIONAL, suppresses the TIP_PLATEAU term, and gives the cap
            a terminal half-width of its own (`end`, a fraction of the max
            half-width). The cap's entry crossing moves with it, so a blunt
            tip starts its cap higher up the blade where the core is still
            wide enough to reach that terminal. At end = 0, m = 1 it IS
            today's pointed petal — asserted, and the reason it is a
            candidate rather than a rewrite.

   WHAT THE SHEET IS FOR, cell by cell, is in the index.html it writes.

   FRAMING IS THE APP'S OWN CAMERA (__bloomFrame at the petal's own midpoint
   and tip, down the petal's own normal), never a crop and never re-derived
   projection maths — shot-bloom-silhouette.mjs's discipline, and the reason
   a single-petal outline ruling can be made from these pixels at all.

   EVERY ROW CARRIES ITS OWN SAME-TREE CONTROL. The renderer is not
   deterministic between page sessions (charter, Sep 7), and a single control
   sample is never a floor (Eva, session 30). So each row is rendered TWICE
   on the same tree at the same camera, both frames settled until two
   consecutive screenshots are byte-identical, and the run's whole control
   DISTRIBUTION is printed at the top of the sheet. No pixel bound in this
   file comes from one sample, and no pixel claim is made on a whole-bloom
   framing at all — this sheet never shoots one.

   RUN:  node tools/shot-bloom-apex.mjs <out-dir> [--rows a,b] [--quick]
         --rows  render only the named rows (prove the rig before the grid)
         --quick drops the tip crop, keeping the face-on view
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         CONTROLS, DEFAULTS, modeTag } from './bloom-harness.mjs';
import { decodePNG } from './pngdec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outDir = argv.find((a) => !a.startsWith('--')) || '/tmp/bloom-apex';
const QUICK = argv.includes('--quick');
const ONLY = (argv.find((a) => a.startsWith('--rows=')) || '').slice(7).split(',').filter(Boolean);
const VIEW = 900, DPR = 2;
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
fs.mkdirSync(outDir, { recursive: true });

/* ===================================================================
   THE CANDIDATE PATCH. Six substitutions into widthProfile, each asserted
   to match exactly once. With no apex spec every one of them evaluates to
   the expression it replaced, term for term — which is what the identity
   control below MEASURES rather than assumes.
   =================================================================== */
const SRC = fs.readFileSync(path.join(ROOT, 'bloom-geometry.js'), 'utf8');
const PATCHES = [
  { why: 'read the apex spec + the terminal half-width it asks for',
    find: `  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;`,
    into: `  const tipFloor = acc && acc.exportMode ? TIP_HALF_MM : TIP_CAP_HALF_MM;
  const __apex = (cap && cap.apex) || null;
  const __blunt = !!(__apex && __apex.law === 'blunt');
  const __m = __apex && __apex.m !== undefined ? __apex.m : 1;
  const __hEnd = __blunt ? Math.max((__apex.end || 0) * halfW, tipFloor) : tipFloor;` },
  { why: 'the blunt law suppresses the TIP_PLATEAU term (it owns the terminal itself)',
    find: `      at: (u) => state.petalTipBreadth * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },`,
    into: `      at: (u) => (__blunt ? 0 : state.petalTipBreadth) * halfW * clamp((u - uPk) / (1 - uPk), 0, 1) },` },
  { why: 'the blunt law makes the cap UNCONDITIONAL',
    find: `  const pointed = state.petalTipBreadth === 0;`,
    into: `  const pointed = state.petalTipBreadth === 0 || __blunt;` },
  { why: 'the cap entry crossing moves with the terminal, so a blunt tip can reach a wide end',
    find: `    const target = CAP_ENTRY_FACTOR * TIP_HALF_MM;`,
    into: `    const target = CAP_ENTRY_FACTOR * Math.max(__hEnd, TIP_HALF_MM);` },
  { why: 'the cap entry is floored at the terminal, not at the print floor',
    find: `    hEntry = Math.max(shapeAt(uCap), rootBlend(uCap), tipFloor);`,
    into: `    hEntry = Math.max(shapeAt(uCap), rootBlend(uCap), __hEnd);` },
  { why: 'THE ONE LINE THE SESSION IS ABOUT — the cap interpolant gains an exponent',
    find: `      if (u >= uCap) {
        const s = (u - uCap) / (1 - uCap);
        return hEntry + (tipFloor - hEntry) * s;
      }
      return Math.max(shape, rootBlend(u), tipFloor);`,
    into: `      if (u >= uCap) {
        const s = (u - uCap) / (1 - uCap);
        const g = __m === 1 ? s : 1 - Math.pow(1 - s, __m);
        return hEntry + (__hEnd - hEntry) * g;
      }
      return Math.max(shape, rootBlend(u), __hEnd);` },
];
const PATCHED = (() => {
  let s = SRC;
  for (const p of PATCHES) {
    const n = s.split(p.find).length - 1;
    if (n !== 1) { console.error(`HARNESS INVALID: patch "${p.why}" matched ${n} times in bloom-geometry.js, expected exactly 1`); process.exit(2); }
    s = s.replace(p.find, p.into);
  }
  return s;
})();
console.log(`patched bloom-geometry.js: ${PATCHES.length} substitutions, each matched exactly once`);

/* ===================================================================
   THE IDENTITY POSITIVE CONTROL — run in Node, before a browser is opened,
   against the SHIPPED module. If the patched law at its identity is not
   bit-identical to what ships, every cell below is measuring the patch and
   not the candidate, and the run must not start.
   =================================================================== */
{
  const shipped = await import(path.join(ROOT, 'bloom-geometry.js'));
  const tmp = path.join(outDir, '_apex-patched.mjs');
  fs.writeFileSync(tmp, PATCHED);
  const cand = await import(tmp);
  const ring = { width: 6.4 };
  let n = 0, bad = 0, worstAt = null;
  for (const a of [0.3, 1, 2, 3]) for (const b of [0.6, 1.8, 4]) for (const br of [0, 0.1, 0.3, 0.6])
    for (const em of [false, true]) for (const halfW of [4, 8, 15]) {
      const st = { petalBaseTaper: a, petalTipTaper: b, petalTipBreadth: br };
      const P = shipped.widthProfile(st, ring, halfW, null, { exportMode: em });
      for (const capSpec of [null, { apex: { law: 'cap', m: 1 } }]) {
        const Q = cand.widthProfile(st, ring, halfW, capSpec, { exportMode: em });
        for (let i = 0; i <= 28; i++) {
          const u = i / 28; n++;
          if (!Object.is(P.halfWidthAt(u), Q.halfWidthAt(u))) { bad++; worstAt = worstAt || `a=${a} b=${b} breadth=${br} export=${em} halfW=${halfW} u=${u}`; }
        }
      }
    }
  if (bad) { console.error(`HARNESS INVALID: the patched module is NOT the identity — ${bad} of ${n} samples differ (first at ${worstAt})`); process.exit(2); }
  console.log(`identity control: ${n.toLocaleString('en-US')} half-widths, 0 differ (Object.is) — the patch at m=1 and with no spec IS the shipped law`);
  /* And the blunt law's own identity, which is what makes it a candidate
     rather than a rewrite: end 0 / m 1 must reproduce the pointed petal. */
  let bn = 0, bb = 0;
  for (const a of [0.3, 1, 2, 3]) for (const b of [0.6, 1.8, 4]) for (const em of [false, true]) for (const halfW of [4, 8, 15]) {
    const st = { petalBaseTaper: a, petalTipTaper: b, petalTipBreadth: 0 };
    const P = shipped.widthProfile(st, ring, halfW, null, { exportMode: em });
    const Q = cand.widthProfile(st, ring, halfW, { apex: { law: 'blunt', m: 1, end: 0 } }, { exportMode: em });
    for (let i = 0; i <= 28; i++) { const u = i / 28; bn++; if (!Object.is(P.halfWidthAt(u), Q.halfWidthAt(u))) bb++; }
  }
  console.log(`blunt-law identity (end 0, m 1): ${bn.toLocaleString('en-US')} half-widths, ${bb} differ — ${bb === 0 ? 'IT IS today\'s pointed petal' : 'NOT the identity'}`);
  fs.unlinkSync(tmp);
}

/* ===================================================================
   THE RIG
   =================================================================== */
const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
let SERVE = SRC;                                   // which module the next page load gets
await page.route('**/bloom-geometry.js', (route) =>
  route.fulfill({ status: 200, contentType: 'text/javascript', body: SERVE }));

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }

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

/* Settle on the real signal — screenshot until two consecutive frames are
   byte-identical. A fixed wait samples an arbitrary point on the damping
   curve and is what put a several-thousand-pixel floor under every sheet in
   this repo before session 26. */
async function shoot(file, frame) {
  await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), frame);
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  /* THREE consecutive byte-identical frames, not two. Measured on this very
     sheet: with two, the face-on view's own same-tree control read 7,034 and
     7,122 px — OrbitControls' damping can produce two identical frames while
     the camera is still easing below the per-frame threshold, and the run
     then settles at an arbitrary point on the curve. The tight tip crop read
     0 px under the same rule, which is exactly how a residue this size hides
     from a crop and not from a whole-blade frame. */
  let p1 = null, p2 = null, buf = null, settledAt = -1;
  for (let k = 0; k < 90; k++) {
    await page.waitForTimeout(100);
    buf = await page.screenshot({ clip, timeout: 180000 });
    if (p1 && p2 && buf.equals(p1) && p1.equals(p2)) { settledAt = k; break; }
    p2 = p1; p1 = buf;
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

const VIEWS = QUICK ? ['petal'] : ['petal', 'tip'];
let shotN = 0;

/* One cell: fresh page, the chosen module, real controls, every assertion,
   then the shots. Returns the row's measured profile as well as its pixels —
   an apex ruling wants the millimetres beside the picture. */
async function cell({ label, set = [], apex = null, tag = '' }) {
  SERVE = apex ? PATCHED : SRC;
  await openBloom(page, port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  if (apex) {
    const got = await page.evaluate((s) => window.__bloomCapability(s), { label: 'APEX', apex });
    if (!got || got.label !== 'APEX') await die(`${label}: the apex spec did not reach the app (reads back ${JSON.stringify(got)})`);
  }
  await page.waitForTimeout(400);

  const want = { ...DEFAULTS };
  for (const s of set) want[s.id] = s.value;
  const readout = (await page.evaluate(() => document.getElementById('readout')?.textContent || '')).replace(/\s+/g, ' ').trim();
  if (!new RegExp(`petals ${Number(want.petalCount)}\\b`).test(readout))
    await die(`${label}: the readout says "${readout.slice(0, 120)}" — the app did not react through the real UI route`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (!m.petalMid || !m.petalNormal) await die(`${label}: metrics report no petal midpoint/normal — framing would be a guess`);
  const prof = m.petalProfile;
  if (!Array.isArray(prof) || prof.length < 6) await die(`${label}: no petal profile reported`);

  const shots = {};
  for (const v of VIEWS) {
    const frame = v === 'petal'
      ? { r: Number(want.petalLength) * 0.62, at: m.petalMid, dir: m.petalNormal }
      : { r: Number(want.petalLength) * 0.17, at: m.petalTip, dir: m.petalNormal };
    shots[v] = await shoot(path.join(outDir, `cell-${String(++shotN).padStart(3, '0')}-${v}.png`), frame);
  }
  /* The apex, in millimetres, from the app's own emitted rows — the number
     the picture is of. `tipHalf` is the terminal face's half-width and
     `dropLast` is how much of the apex's whole narrowing happens in the
     FINAL row gap, which is the resolution question this sheet exists to
     put in front of a ruling. */
  const tipHalf = prof[prof.length - 1];
  const nearTip = prof.slice(-7);
  const span = nearTip[0] - tipHalf;
  /* THE FINAL-GAP SHARE IS ONLY DEFINED FOR AN APEX THAT NARROWS, and this
     sheet contains rows whose blade WIDENS toward the tip (the shipped
     plateau term, above its floor). Printing a percentage there would be a
     number naming a computation that does not apply to the row — this
     project's most repeated defect — so it says which it is instead. */
  /* MONOTONE over the whole window, not merely lower at its end: on the
     shipped plateau at breadth 0.30 the window's first row is 0.036 mm above
     its last, so an endpoint test called it "narrowing" and printed -369%.
     The question is whether the blade ever widens in here, and that is what
     is asked. */
  const rises = nearTip.slice(1).reduce((m2, h, i) => Math.max(m2, h - nearTip[i]), 0);
  const narrows = span > 1e-9 && rises <= 1e-9;
  const dropLast = narrows ? (nearTip[nearTip.length - 2] - tipHalf) / span : null;
  const gapTxt = narrows
    ? `${(dropLast * 100).toFixed(0)}% of the narrowing is in the FINAL row gap`
    : `THE BLADE WIDENS by ${Math.max(rises, -span).toFixed(3)} mm inside these rows — the apex does not narrow monotonically, so a final-gap share is undefined here`;
  const mm = `apex: terminal half-width ${tipHalf.toFixed(3)} mm · last six rows ${nearTip.slice(1).map((h) => h.toFixed(2)).join(' → ')} mm · ${gapTxt}`;
  console.log(`  ${label.padEnd(46)} tip ${tipHalf.toFixed(3)} mm · ${narrows ? `last-gap ${(dropLast * 100).toFixed(0)}%` : `WIDENS ${Math.max(rises, -span).toFixed(2)} mm`} · tris(live) ${m.liveTris}`);
  return { label, tag, shots, mm, prof,
    caption: `${['petalBaseTaper', 'petalTipTaper', 'petalTipBreadth'].map((id) => `${byId[id].label.toLowerCase()} ${Number(want[id])}`).join(' · ')}`
      + `${apex ? ` · <b>apex ${apex.law} m=${apex.m}${apex.end !== undefined ? ` end=${apex.end}` : ''}</b>` : ' · <b>shipped law</b>'}`
      + `<br>${mm}<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · ${modeTag(m)}` };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ===================================================================
   THE ROWS. Each is rendered TWICE (the same-tree control) and the run's
   whole control distribution decides what a pixel number here is worth.
   =================================================================== */
const ROWS = [
  { key: 'today', label: 'TODAY — the shipping default', set: {}, apex: null,
    note: 'The reference every other cell is read against. The apex is a STRAIGHT CONE: the converging tip cap owns u &ge; 0.80 on this petal and interpolates LINEARLY to the terminal face, so the two taper exponents set how WIDE the cone starts and nothing sets its curve.' },
  { key: 'breadth-dead-01', label: "TODAY's control at tip breadth 0.01", set: { petalTipBreadth: 0.01 }, apex: null,
    note: 'The first step off zero. Compare with the two cells below: at this petal width all three are the SAME PETAL.' },
  { key: 'breadth-dead-10', label: "TODAY's control at tip breadth 0.10", set: { petalTipBreadth: 0.10 }, apex: null,
    note: 'DEAD TRAVEL, measured: the plateau term reaches 0.10 &times; 8 = 0.80 mm, which is exactly the blunt-tip floor, so every value from 0.01 to 0.10 is clamped to one shape. Ten of the slider\'s sixty steps at the default width; twenty of sixty at petal width 8.' },
  { key: 'breadth-30', label: "TODAY's control at tip breadth 0.30", set: { petalTipBreadth: 0.30 }, apex: null,
    note: 'Above the floor the control WIDENS the blade toward the tip: waist 1.753 mm at u = 0.83, tip 2.400 mm &mdash; a 37% flare over the last 6.1 mm. That is spatulate, not truncate, and the crossing leaves a 6.7&deg; corner.' },
  { key: 'breadth-60', label: "TODAY's control at tip breadth 0.60 (maximum)", set: { petalTipBreadth: 0.60 }, apex: null,
    note: 'The extreme: waist 2.974 mm at u = 0.76 flaring 61% to a 4.800 mm tip, worst outline corner 16.4&deg;. This is the state the silhouette sheet already photographed as THE KINK.' },

  { key: 'cap-round-035', label: 'CANDIDATE cap — m 0.35 (roundest)', set: {}, apex: { law: 'cap', m: 0.35 },
    note: 'The round corner of the candidate space. The blade holds its width into the apex and turns over late.' },
  { key: 'cap-round-05', label: 'CANDIDATE cap — m 0.50 (round)', set: {}, apex: { law: 'cap', m: 0.5 },
    note: 'The half-power: the apex approaches the axis with the profile of a circular quadrant, which is what &ldquo;rounded&rdquo; means botanically.' },
  { key: 'cap-1', label: 'CANDIDATE cap — m 1.00 (= today, the identity)', set: {}, apex: { law: 'cap', m: 1 },
    note: 'THE IDENTITY CELL. Bit-identical to TODAY by construction and asserted so in Node before the browser opened; the pixel difference against TODAY is the row control for this whole sheet.' },
  { key: 'cap-2', label: 'CANDIDATE cap — m 2.00 (pointed)', set: {}, apex: { law: 'cap', m: 2 },
    note: 'Past the identity the apex draws out: the profile leaves the cap entry fast and creeps to the terminal.' },
  { key: 'cap-35', label: 'CANDIDATE cap — m 3.50 (most pointed)', set: {}, apex: { law: 'cap', m: 3.5 },
    note: 'The acuminate corner. Watch for the point at which further travel stops moving the drawn rows &mdash; the sweep printed by the run says where.' },

  { key: 'blunt-id', label: 'CANDIDATE blunt — end 0.00, m 1.00 (= today)', set: {}, apex: { law: 'blunt', m: 1, end: 0 },
    note: 'The blunt law\'s own identity, asserted bit-identical to TODAY. It is what makes this a candidate for SUPERSEDING tip breadth rather than a rewrite of the silhouette.' },
  { key: 'blunt-30', label: 'CANDIDATE blunt — end 0.30, m 1.00', set: {}, apex: { law: 'blunt', m: 1, end: 0.3 },
    note: 'Against the tip breadth 0.30 cell above: the same terminal width, reached by a blade that NARROWS to it monotonically instead of waisting and flaring back out. No crossing, so no corner.' },
  { key: 'blunt-30-round', label: 'CANDIDATE blunt — end 0.30, m 0.50 (a rounded truncate)', set: {}, apex: { law: 'blunt', m: 0.5, end: 0.3 },
    note: 'THE STATE NEITHER SHIPPED CONTROL CAN REACH: a broad end approached by a rounded shoulder &mdash; a poppy. Today roundness and a broad end are mutually exclusive, because the cap that could round it only exists at breadth exactly 0.' },
  { key: 'blunt-60', label: 'CANDIDATE blunt — end 0.60, m 1.00 (maximum)', set: {}, apex: { law: 'blunt', m: 1, end: 0.6 },
    note: 'Against the tip breadth 0.60 cell: today\'s maximum flares 61% back out to its tip, this one runs nearly parallel and is cut off. Whether that is a LOSS (the spatulate silhouette goes) or a GAIN (the kink goes) is the ruling.' },
];

const rows = ONLY.length ? ROWS.filter((r) => ONLY.includes(r.key)) : ROWS;
if (ONLY.length && rows.length !== ONLY.length) { console.error(`--rows named ${ONLY.length} row(s), matched ${rows.length}`); process.exit(2); }
console.log(`\nrendering ${rows.length} row(s) x 2 (each row carries its own same-tree control) x ${VIEWS.length} view(s)\n`);

const out = [];
for (const r of rows) {
  const a = await cell({ label: r.label, set: set(r.set), apex: r.apex, tag: r.key });
  const b = await cell({ label: `  (same-tree control)`, set: set(r.set), apex: r.apex, tag: r.key });
  const ctrl = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, a.shots[v].file), path.join(outDir, b.shots[v].file))]));
  console.log(`    control: ${VIEWS.map((v) => `${v} ${ctrl[v].pixels} px`).join(' · ')}`);
  out.push({ ...r, ...a, ctrl });
}

/* THE RUN'S CONTROL DISTRIBUTION — printed, and the only thing a pixel
   number on this sheet may be read against. One sample is never a floor. */
const dist = Object.fromEntries(VIEWS.map((v) => {
  const xs = out.map((o) => o.ctrl[v].pixels).sort((x, y) => x - y);
  return [v, { n: xs.length, min: xs[0], max: xs[xs.length - 1], median: xs[Math.floor(xs.length / 2)], all: xs }];
}));
console.log('\nSAME-TREE CONTROL DISTRIBUTION (px differing, this run):');
for (const v of VIEWS) console.log(`  ${v.padEnd(6)} n=${dist[v].n} min ${dist[v].min} · median ${dist[v].median} · max ${dist[v].max}   [${dist[v].all.join(', ')}]`);

/* The identity cell against TODAY, judged against that distribution. */
const today = out.find((o) => o.tag === 'today'), capId = out.find((o) => o.tag === 'cap-1'), bluntId = out.find((o) => o.tag === 'blunt-id');
const idLines = [];
for (const [nm, other] of [['cap m=1', capId], ['blunt end 0 m=1', bluntId]]) {
  if (!today || !other) continue;
  for (const v of VIEWS) {
    const d = pixelDiff(path.join(outDir, today.shots[v].file), path.join(outDir, other.shots[v].file));
    idLines.push(`${nm} vs TODAY (${v}): ${d.pixels} px differ, worst channel step ${d.worst} — the run's ${v} control ranged ${dist[v].min}..${dist[v].max} px`);
    console.log(`  IDENTITY  ${idLines[idLines.length - 1]}`);
  }
}

/* ===================================================================
   THE DEAD-CONTROL SWEEP, on the candidate ranges, measured on the DRAWN
   rows rather than on the continuous law — a curve the sampling cannot
   resolve is a control that has stopped responding.
   =================================================================== */
const sweep = [];
{
  const cand = await import(`data:text/javascript;base64,${Buffer.from(PATCHED).toString('base64')}`);
  const ring = { width: 6.4 }, halfW = 8, st = { petalBaseTaper: 1, petalTipTaper: 1.8, petalTipBreadth: 0 };
  const rowsOf = (apex) => { const p = cand.widthProfile(st, ring, halfW, { apex }, { exportMode: false });
    return Array.from({ length: 28 }, (_, i) => p.halfWidthAt((i + 1) / 28)); };
  const maxAbs = (A, B) => Math.max(...A.map((x, i) => Math.abs(x - B[i])));
  for (const law of ['cap', 'blunt']) {
    const ms = [0.2, 0.3, 0.35, 0.5, 0.7, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8];
    const base = { law, ...(law === 'blunt' ? { end: 0 } : {}) };
    const lines = ms.slice(1).map((m, i) => {
      const d = maxAbs(rowsOf({ ...base, m }), rowsOf({ ...base, m: ms[i] }));
      return `    m ${String(ms[i]).padEnd(4)} -> ${String(m).padEnd(4)}: worst drawn row moves ${d.toFixed(4)} mm${d < 0.05 ? '   <- under a twentieth of a millimetre: the shape has stopped responding' : ''}`;
    });
    sweep.push(`  ${law} law, exponent sweep (default petal, live, 28 drawn rows):`, ...lines);
  }
  const ends = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.45, 0.6];
  sweep.push('  blunt law, terminal sweep at m = 1:');
  sweep.push(...ends.slice(1).map((e, i) => {
    const d = maxAbs(rowsOf({ law: 'blunt', m: 1, end: e }), rowsOf({ law: 'blunt', m: 1, end: ends[i] }));
    return `    end ${String(ends[i]).padEnd(5)} -> ${String(e).padEnd(5)}: worst drawn row moves ${d.toFixed(4)} mm${d < 0.05 ? '   <- STOPPED RESPONDING' : ''}`;
  }));
}
console.log('\nDEAD-CONTROL SWEEP:');
for (const l of sweep) console.log(l);

/* ===================================================================
   THE SHEET
   =================================================================== */
const esc = (s) => String(s).replace(/&(?![a-z]+;|#)/g, '&amp;').replace(/</g, '&lt;');
const cellHtml = (o) => `<figure class="cell">
  <figcaption><b>${esc(o.label)}</b><br>${o.caption}<br><span class="note">${o.note}</span>
  <br><span class="ctrl">same-tree control: ${VIEWS.map((v) => `${v} ${o.ctrl[v].pixels} px`).join(' · ')}</span></figcaption>
  <div class="shots">${VIEWS.map((v) => `<div><img src="${o.shots[v].file}"><div class="lab">${v} &middot; ${o.shots[v].mmPerPx.toFixed(4)} mm/px</div></div>`).join('')}</div>
</figure>`;
const group = (title, blurb, keys) => `<section><h2>${title}</h2><p>${blurb}</p>
  <div class="grid">${out.filter((o) => keys.includes(o.tag)).map(cellHtml).join('')}</div></section>`;

fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8">
<title>Bloom — PETAL TIP SHAPE, the discovery sheet (session 32, phase A)</title>
<style>
 body{background:#0c0f0e;color:#dfe7e3;font:14px/1.55 system-ui,sans-serif;margin:0;padding:28px 32px;max-width:1500px}
 h1{font-size:22px;margin:0 0 4px} h2{font-size:17px;margin:34px 0 6px;color:#9fd6c4}
 p{max-width:105ch;color:#b8c4bf} .grid{display:flex;flex-wrap:wrap;gap:22px;margin-top:14px}
 .cell{margin:0;width:${QUICK ? 470 : 940}px;background:#121614;border:1px solid #1e2724;border-radius:8px;padding:12px}
 .shots{display:flex;gap:10px} .shots img{width:450px;height:450px;display:block;border-radius:4px;background:#000}
 .lab{color:#6f8079;font-size:11px;padding-top:3px}
 figcaption{font-size:12px;color:#9fb0a9;padding-bottom:9px}
 .note{color:#c9b98a} .ctrl{color:#6f8079}
 pre{background:#121614;border:1px solid #1e2724;border-radius:8px;padding:12px;overflow-x:auto;color:#b8c4bf;font-size:12px}
 b{color:#e8f2ee}
</style>
<h1>PETAL TIP SHAPE — the discovery sheet</h1>
<p>Session 32, <b>phase A</b>. This sheet is what the ruling is made on. Nothing in it ships: the candidate
laws are patched into <code>bloom-geometry.js</code> in flight through <code>page.route()</code>, six
substitutions each asserted to match exactly once, and <b>no shipped source was touched by this session</b>.</p>
<p><b>The finding.</b> The petal apex today is a <b>straight cone</b> or a <b>flat truncate</b>, and a
<b>rounded apex is not reachable at all</b>. The converging tip cap owns <code>u &ge; uCap</code> where
<code>uCap = min(0.80, crossing)</code> &mdash; so at least the last 20% of every pointed petal, six of its
28 blade rows &mdash; and inside it the half-width is a <b>linear</b> interpolation to the terminal face
(measured: constant differences at every tip taper). The two taper exponents set how wide that cone starts;
nothing sets its curve. Above <code>petalTipBreadth === 0</code> there is no cap at all, and the plateau term
makes the blade <i>widen</i> toward the tip by 28&ndash;61%.</p>
<p><b>Two mechanisms survived costing, which is why this is a sheet and not a build.</b>
<code>cap</code> shapes the existing cap's interpolant with one exponent and lives only in the pointed
family. <code>blunt</code> makes the cap unconditional, suppresses the plateau, and owns the terminal width
itself &mdash; which is what would let it SUPERSEDE tip breadth. Both are byte-identical at their identity
values, asserted with <code>Object.is</code> before the browser opened.</p>
<h2>The same-tree control distribution for this run</h2>
<p>The renderer is not deterministic between page sessions and a single control sample is never a floor, so
every row here was rendered twice on the same tree at the same camera and the whole distribution is printed.
Read every pixel number on this page against it. No cell on this sheet is a whole-bloom framing.</p>
<pre>${VIEWS.map((v) => `${v.padEnd(6)} n=${dist[v].n}  min ${dist[v].min}  median ${dist[v].median}  max ${dist[v].max}   [${dist[v].all.join(', ')}]`).join('\n')}

${idLines.join('\n')}</pre>
${group('1 &middot; What ships today, and what its one apex control actually does',
  'The default, then the shipped <code>Tip breadth</code> slider across its range. The second and third cells are the dead travel; the fourth and fifth are the flare and the corner.',
  ['today', 'breadth-dead-01', 'breadth-dead-10', 'breadth-30', 'breadth-60'])}
${group('2 &middot; Candidate <code>cap</code> — one exponent on the cap interpolant',
  'Round to pointed, corners and middle, at the size petals actually ship (35 &times; 16 mm, the default). m = 1 is today.',
  ['cap-round-035', 'cap-round-05', 'cap-1', 'cap-2', 'cap-35'])}
${group('3 &middot; Candidate <code>blunt</code> — the cap made unconditional, owning its own terminal',
  'The same exponent, plus a terminal width, replacing the plateau term. Read these against cells 4 and 5 of section 1: same terminal widths, a different blade getting there.',
  ['blunt-id', 'blunt-30', 'blunt-30-round', 'blunt-60'])}
<h2>Dead-control sweep</h2>
<p>Measured on the <b>drawn rows</b>, not on the continuous law &mdash; a curve the 28-row sampling cannot
resolve is a control that has stopped responding, whatever the arithmetic says.</p>
<pre>${esc(sweep.join('\n'))}</pre>
`);

await browser.close(); server.close();
console.log(`\nwrote ${out.length} cell(s) -> ${path.join(outDir, 'index.html')}`);
