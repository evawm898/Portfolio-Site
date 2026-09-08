/* ===================================================================
   shot-bloom-apex.mjs — contact sheet for PETAL TIP SHAPE, the whole-petal
   apex. Canvas only. Session 32.

   THE RULING IT CARRIES. Phase A costed seven mechanisms for a round-to-
   pointed apex and two survived, so it stopped and put both to Eva with a
   sheet. She ruled `blunt` (session 32): the converging tip cap becomes
   UNCONDITIONAL and owns its own terminal, `petalTipBreadth` and its three
   role twins are retired, and the spatulate silhouette moves to its proper
   owner — the two taper exponents, whose widest point a/(a+b) reaches 0.833.
   Her reason was not the row count: `cap`, the cheaper survivor, could not
   deliver a round apex at all. Six rows in the cap is a shoulder turning
   through 0.15 mm, and the phase-A sheet reads it as a faceted gable — a
   control that appears to do a thing and does not, which is the dead
   sharpness slider again.

   THIS TOOL NO LONGER PATCHES ANYTHING. In phase A the candidate laws were
   rewritten into bloom-geometry.js in flight through page.route(), because
   the geometry did not exist yet; the winner shipped, the loser was deleted
   with its candidate table, and every cell below is now the real control set
   driven through the real UI.

   WHAT THE SHEET IS FOR. The space at the size petals actually ship
   (35 x 16 mm, the default), corners and middle on both axes, the states the
   retired control could not reach, and the shipping default rendered on BOTH
   trees — this one and a git worktree of the base commit — because "0 moved"
   is a claim that should be photographed and not only measured.

   FRAMING IS THE APP'S OWN CAMERA (__bloomFrame at the petal's own midpoint
   and tip, down the petal's own normal), never a crop and never re-derived
   projection maths — shot-bloom-silhouette.mjs's discipline.

   EVERY ROW CARRIES ITS OWN SAME-TREE CONTROL, and this sheet is the reason
   that rule now has its sharpest evidence: in phase A the IDENTITY
   comparison, between two builds proved bit-identical to the float in Node
   before any browser opened, read 0 px on one run and 7,036 px on the next.
   The whole-blade framing is bimodal; the TIP CROP read 0 px on all fourteen
   observations. So pixel claims here belong to the tip crop, the run's whole
   control distribution is printed, and no bound comes from one sample.

   RUN:  node tools/shot-bloom-apex.mjs <out-dir> [base-tree] [--rows a,b] [--quick]
         base-tree  a `git worktree` of the base commit; adds the BEFORE cells
                    (the retired control's own states) and the identity pair
         --rows     render only the named rows (prove the rig before the grid)
         --quick    drops the tip crop, keeping the face-on view
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, kindsOf,
         CONTROLS, DEFAULTS, modeTag } from './bloom-harness.mjs';
import { decodePNG } from './pngdec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const outDir = positional[0] || '/tmp/bloom-apex';
const baseTree = positional[1] || null;
const QUICK = argv.includes('--quick');
const ONLY = (argv.find((a) => a.startsWith('--rows=')) || '').slice(7).split(',').filter(Boolean);
const VIEW = 900, DPR = 2;
const byId = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
fs.mkdirSync(outDir, { recursive: true });

/* ===================================================================
   THE RIG
   =================================================================== */
const { server, port } = await serveRepo();
/* THE BASE TREE IS SERVED FROM A `git worktree`, never from a mutated working
   tree — `git checkout <sha> -- <files>` stages the revert, so a stray commit
   pushes the un-fixed code and a container restart leaves the branch reverted. */
const base = baseTree ? await serveRepo(path.resolve(baseTree)) : null;
if (baseTree) console.log(`base tree served from ${path.resolve(baseTree)}`);
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
/* The base tree predates this session's two apex controls and still declares
   the four retired ids, so its OWN control set is what a BASE cell must be
   driven and drift-checked against — read from that tree's registry by the
   harness's one owner, never guessed. */
const baseKinds = base ? await kindsOf(path.resolve(baseTree)) : null;
if (baseTree && !base) { console.error('HARNESS INVALID: a base tree was named and there is no bloom.html there. A missing base is not a cell to skip.'); process.exit(2); }

function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); if (base) base.server.close(); process.exit(2); }); }

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
async function cell({ label, set = [], tag = '', onBase = false }) {
  await openBloom(page, onBase ? base.port : port);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const bad = await applyConfig(page, set, onBase ? baseKinds : null);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  /* THE DRIFT CHECK IS AGAINST THE TREE BEING DRIVEN. The base commit predates
     this session's two apex controls and still declares the four retired ids,
     so a straight comparison against HEAD's DEFAULTS reports drift on a page
     behaving perfectly. The drop is CHECKED: exactly the ids the base tree does
     not declare may be dropped, and nothing else, so a real drift on a control
     both trees share still fails the run. */
  const drift0 = await fullStateDrift(page, set);
  const drift = onBase ? drift0.filter((d) => baseKinds[d.split(':')[0]] !== undefined) : drift0;
  if (onBase) {
    const dropped = drift0.filter((d) => baseKinds[d.split(':')[0]] === undefined).map((d) => d.split(':')[0]).sort();
    const want = CONTROLS.filter((c) => baseKinds[c.id] === undefined).map((c) => c.id).sort();
    if (dropped.join(',') !== want.join(',')) await die(`${label}: the base tree's missing-control set is ${want.join(', ') || '(none)'} and the drift report dropped ${dropped.join(', ') || '(none)'}`);
  }
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  await page.waitForTimeout(400);

  const want = { ...DEFAULTS };
  for (const s2 of set) want[s2.id] = s2.value;
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
  /* THE APEX IN MILLIMETRES, from the app's own emitted rows. `rises` asks the
     question A5 asks — does the blade widen anywhere near the tip — because
     that is what the retired term did on every value above zero and what this
     construction cannot do. */
  const tipHalf = prof[prof.length - 1];
  const nearTip = prof.slice(-7);
  const span = nearTip[0] - tipHalf;
  const rises = nearTip.slice(1).reduce((mx, h, i) => Math.max(mx, h - nearTip[i]), 0);
  const narrows = span > 1e-9 && rises <= 1e-9;
  const dropLast = narrows ? (nearTip[nearTip.length - 2] - tipHalf) / span : null;
  const gapTxt = narrows
    ? `${(dropLast * 100).toFixed(0)}% of the narrowing is in the FINAL row gap`
    : `THE BLADE WIDENS by ${Math.max(rises, -span).toFixed(3)} mm inside these rows — it does not narrow monotonically`;
  const mm = `apex: terminal half-width ${tipHalf.toFixed(3)} mm · last six rows ${nearTip.slice(1).map((h) => h.toFixed(2)).join(' → ')} mm · ${gapTxt}`;
  const shown = ['petalBaseTaper', 'petalTipTaper'].map((id) => `${id === 'petalBaseTaper' ? 'base taper' : 'tip taper'} ${Number(want[id])}`)
    .concat(onBase ? [`tip breadth ${Number(want['petalTipBreadth'] ?? 0)}  (RETIRED)`]
                   : [`tip end ${Number(want.petalTipEnd)}`, `tip shape ${Number(want.petalTipShape)}`]).join(' · ');
  console.log(`  ${label.padEnd(52)} tip ${tipHalf.toFixed(3)} mm · ${narrows ? `last-gap ${(dropLast * 100).toFixed(0)}%` : `WIDENS ${Math.max(rises, -span).toFixed(2)} mm`} · tris(live) ${m.liveTris}`);
  return { label, tag, shots, mm, prof,
    caption: `${shown}${onBase ? ' · <b>THE BASE TREE (b323268)</b>' : ''}<br>${mm}<br>tris (live) ${m.liveTris.toLocaleString('en-US')} · ${modeTag(m)}` };
}

const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* ===================================================================
   THE ROWS. Each is rendered TWICE (the same-tree control) and the run's
   whole control distribution decides what a pixel number here is worth.
   =================================================================== */
const ROWS = [
  { key: 'today', label: 'THE SHIPPING DEFAULT (tip end 0, tip shape 1.00)', set: {},
    note: 'Byte-identical to the tree before this session, by construction rather than by tolerance: <code>Math.max(0 &times; halfW, tipFloor)</code> IS the floor, and the interpolant\'s <code>m === 1</code> arm returns <code>s</code> itself rather than <code>1 - (1-s)^1</code>, which is not <code>s</code> in IEEE-754. Measured in Node against a worktree of b323268: 12,180 half-widths and every cap field, 0 differ under <code>Object.is</code>; 522 more on the claw capability rows.' },

  { key: 'shape-035', label: 'TIP SHAPE 0.35 — the roundest, at the fine end', set: { petalTipShape: 0.35 },
    note: 'The blade holds its width into the apex and turns over late. At a 0.15 mm terminal this is the state Eva ruled reads as a faceted gable rather than a curve &mdash; the sheet keeps it because that reading is the reason the ruling went the way it did.' },
  { key: 'shape-05', label: 'TIP SHAPE 0.50 — rounded (obtuse)', set: { petalTipShape: 0.5 }, note: 'The half-power: the apex approaches the axis with the profile of a circular quadrant.' },
  { key: 'shape-2', label: 'TIP SHAPE 2.00 — drawn out', set: { petalTipShape: 2 }, note: 'Past the identity the apex leaves the cap entry fast and creeps to the terminal.' },
  { key: 'shape-35', label: 'TIP SHAPE 3.50 — the most drawn out (acuminate)', set: { petalTipShape: 3.5 }, note: 'The other corner of the shape axis. Note where the narrowing sits: 0% of it in the final row gap, against 49% at 0.35 &mdash; the pointed half is the well-resolved half.' },

  { key: 'end-15', label: 'TIP END 0.15 — a narrow truncate', set: { petalTipEnd: 0.15 }, note: 'The first end that clears the export floor at every shipped petal width.' },
  { key: 'end-30', label: 'TIP END 0.30 — a broad truncate', set: { petalTipEnd: 0.3 },
    note: 'Read this against the retired control at the same 0.30 below: the same terminal width, reached by a blade that NARROWS to it monotonically instead of waisting and flaring back out. No crossing, so no corner.' },
  { key: 'end-60', label: 'TIP END 0.60 — the maximum', set: { petalTipEnd: 0.6 }, note: 'The broad extreme. The cap starts higher up the blade, where the core is still wide enough to reach this terminal.' },

  { key: 'poppy', label: 'THE POPPY — end 0.30 &times; shape 0.50, a ROUNDED TRUNCATE', set: { petalTipEnd: 0.3, petalTipShape: 0.5 },
    note: '<b>THE STATE NO SHIPPED CONTROL COULD REACH.</b> A broad end approached by a rounded shoulder. Before this session roundness and a broad end were mutually exclusive, because the cap that could round an apex existed only at tip breadth exactly 0. This is the cell the ruling turns on: a shoulder turning through 2.4 mm of half-width can be drawn at this row count, one turning through 0.15 mm cannot.' },
  { key: 'corner-round', label: 'CORNER — end 0.60 &times; shape 0.35', set: { petalTipEnd: 0.6, petalTipShape: 0.35 }, note: 'Both axes at their round/broad extremes at once.' },
  { key: 'corner-drawn', label: 'CORNER — end 0.60 &times; shape 3.50', set: { petalTipEnd: 0.6, petalTipShape: 3.5 }, note: 'Broad end, drawn-out approach: the cap runs long into a wide terminal.' },
  { key: 'spatulate', label: 'SPATULATE — base taper 3.00 / tip taper 0.60 &times; end 0.60', set: { petalBaseTaper: 3, petalTipTaper: 0.6, petalTipEnd: 0.6 },
    note: '<b>THE SILHOUETTE THE RETIRED TERM PRODUCED BY WAISTING THE BLADE, made here by its proper owners.</b> The widest point is a/(a+b) = 0.833, so the blade is broad in its upper fifth and narrow at the base &mdash; measured widest/base 4.94x, against 1.00x if the terminal had been allowed to floor the whole blade (a defect this session found and fixed while confirming the ruling\'s premise). It narrows monotonically, which the retired construction never did.' },
];

/* THE BASE-TREE CELLS — what the retirement actually removed, rendered from a
   git worktree of b323268 by the same browser and camera rather than
   remembered. The identity pair is first: the same default on both trees.

   THE RETIRED ID IS QUOTED IN THESE ROWS, deliberately. It names a control
   that exists on the OLD tree and nowhere else, so it is row DATA rather than
   a reference to anything live — and the panel gate's retired-id scanner
   exempts literals for exactly that reason, which is also how the frozen
   matrices keep naming the ids their rows were defined with. */
const BASE_ROWS = [
  { key: 'base-today', label: 'BASE TREE — the shipping default', set: {}, onBase: true,
    note: 'The identity pair with the first cell above. Any difference on the TIP CROP is a difference in the geometry, because that framing\'s same-tree control read 0 px on every observation of the phase-A run.' },
  { key: 'base-breadth-01', label: 'BASE TREE — the retired control at 0.01', set: { 'petalTipBreadth': 0.01 }, onBase: true,
    note: 'The first step off zero on the retired control. The live terminal jumped 0.150 &rarr; 0.800 mm here &mdash; a 5.3x discontinuity on the first step, and then ten of sixty steps drew this same tip.' },
  { key: 'base-breadth-30', label: 'BASE TREE — the retired control at 0.30', set: { 'petalTipBreadth': 0.3 }, onBase: true,
    note: 'Against TIP END 0.30 above. Waist 1.753 mm at u = 0.83 flaring 37% to a 2.400 mm tip, with a 6.7&deg; corner at the crossing. This is what "widens toward the tip" actually looked like.' },
  { key: 'base-breadth-60', label: 'BASE TREE — the retired control at 0.60 (maximum)', set: { 'petalTipBreadth': 0.6 }, onBase: true,
    note: 'The extreme: waist 2.974 mm at u = 0.76 flaring 61% to 4.800 mm, worst outline corner 16.4&deg;. The state the silhouette sheet photographed as THE KINK.' },
];

const ALL = baseTree ? ROWS.concat(BASE_ROWS) : ROWS;
const rows = ONLY.length ? ALL.filter((r) => ONLY.includes(r.key)) : ALL;
if (ONLY.length && rows.length !== ONLY.length) { console.error(`--rows named ${ONLY.length} row(s), matched ${rows.length}`); process.exit(2); }
console.log(`\nrendering ${rows.length} row(s) x 2 (each row carries its own same-tree control) x ${VIEWS.length} view(s)\n`);

const out = [];
for (const r of rows) {
  const a = await cell({ label: r.label, set: set(r.set), tag: r.key, onBase: !!r.onBase });
  const b = await cell({ label: `  (same-tree control)`, set: set(r.set), tag: r.key, onBase: !!r.onBase });
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

/* THE IDENTITY PAIR — the shipping default on THIS tree against the SAME
   default on a worktree of the base commit, judged against the run's own
   control distribution. It is the picture of the claim Node already measured
   to the bit. */
const today = out.find((o) => o.tag === 'today'), baseToday = out.find((o) => o.tag === 'base-today');
const idLines = [];
if (today && baseToday) for (const v of VIEWS) {
  const d = pixelDiff(path.join(outDir, today.shots[v].file), path.join(outDir, baseToday.shots[v].file));
  idLines.push(`the shipping default, this tree vs b323268 (${v}): ${d.pixels} px differ, worst channel step ${d.worst} — the run's ${v} control ranged ${dist[v].min}..${dist[v].max} px`);
  console.log(`  IDENTITY  ${idLines[idLines.length - 1]}`);
}
if (!baseToday) console.log('  IDENTITY  (no base tree given — pass one as the second argument to render the pair)');

/* ===================================================================
   THE DEAD-CONTROL SWEEP, on the SHIPPED ranges, every step, measured on the
   DRAWN rows rather than on the continuous law — a curve the 28-row sampling
   cannot resolve is a control that has stopped responding whatever the
   arithmetic says. Both directions of the question Eva set: does each control
   move the shape across its WHOLE declared range, and does its default sit
   anywhere the OTHER control goes inert.
   =================================================================== */
const sweep = [];
{
  const geo = await import('../bloom-geometry.js');
  const byIdR = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
  const ring = { width: 6.4 };
  const rowsOf = (st, halfW, em) => { const p = geo.widthProfile(st, ring, halfW, null, { exportMode: em });
    return Array.from({ length: 28 }, (_, i) => p.halfWidthAt((i + 1) / 28)); };
  const maxAbs = (A, B) => Math.max(...A.map((x, i) => Math.abs(x - B[i])));
  const stAt = (o) => ({ petalBaseTaper: 1, petalTipTaper: 1.8, petalTipEnd: 0, petalTipShape: 1, ...o });
  const stepsOf = (id) => { const c = byIdR[id], o = []; for (let v = c.min; v <= c.max + 1e-9; v += c.step) o.push(+v.toFixed(4)); return o; };
  for (const [id, other] of [['petalTipEnd', 'petalTipShape'], ['petalTipShape', 'petalTipEnd']]) {
    const c = byIdR[id], vals = stepsOf(id);
    sweep.push(`  ${id}  (${c.min}..${c.max} step ${c.step}, ${vals.length} steps, default ${DEFAULTS[id]}):`);
    for (const [pw, em] of [[16, false], [16, true], [8, false], [8, true], [30, false]]) {
      const halfW = pw / 2; let dead = [], run = [], minStep = Infinity;
      for (let k = 1; k < vals.length; k++) {
        const d = maxAbs(rowsOf(stAt({ [id]: vals[k] }), halfW, em), rowsOf(stAt({ [id]: vals[k - 1] }), halfW, em));
        if (d < 1e-9) run.push(vals[k]);
        else { if (run.length) { dead.push([run[0], run[run.length - 1]]); run = []; } if (d < minStep) minStep = d; }
      }
      if (run.length) dead.push([run[0], run[run.length - 1]]);
      const nDead = dead.reduce((n, [x, y]) => n + Math.round((y - x) / c.step) + 1, 0);
      sweep.push(`    width ${String(pw).padStart(2)} ${em ? 'export' : 'live  '}: ${nDead === 0 ? 'NO DEAD STEPS' : `${nDead} DEAD ${dead.map(([x, y]) => `${x}..${y}`).join(', ')}`}`
        + ` · smallest live step ${minStep === Infinity ? 'n/a' : minStep.toFixed(4) + ' mm'}`);
    }
    const oc = byIdR[other], inertAt = [];
    for (const [pw, em] of [[16, false], [8, false], [8, true], [30, false]]) {
      const halfW = pw / 2, inert = [];
      for (const v of vals) if (maxAbs(rowsOf(stAt({ [id]: v, [other]: oc.min }), halfW, em), rowsOf(stAt({ [id]: v, [other]: oc.max }), halfW, em)) < 1e-9) inert.push(v);
      inertAt.push(`    width ${String(pw).padStart(2)} ${em ? 'export' : 'live  '}: ${inert.length ? `${other} INERT at ${id} = ${inert[0]}..${inert[inert.length - 1]} (${inert.length} of ${vals.length})${inert.includes(Number(DEFAULTS[id])) ? '  <-- INCLUDES THE DEFAULT' : ''}` : `${other} is never inert on this travel`}`);
    }
    sweep.push(`    --- does ${other} go inert anywhere on ${id}'s travel? ---`, ...inertAt);
  }
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
<title>Bloom — PETAL TIP SHAPE, the apex (session 32)</title>
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
<h1>PETAL TIP SHAPE — the whole-petal apex</h1>
<p>Session 32, <b>phase B</b>: Eva ruled <code>blunt</code> and this is the build. The converging tip cap
is now <b>unconditional</b> and owns its own terminal; <code>petalTipBreadth</code> and its three role twins
are retired; the spatulate silhouette moved to its proper owner, the two taper exponents, whose widest point
<code>a/(a+b)</code> reaches 0.833.</p>
<p><b>Two controls, two quantities.</b> <code>Tip end</code> is how BROAD the blade ends; <code>Tip shape</code>
is HOW it gets there &mdash; 1.00 the straight cone, below it rounded, above it drawn out. They are separate
rows rather than one dial because the ruling rests on the combination: a rounded shoulder is only legible at a
broad end, so &ldquo;round&rdquo; and &ldquo;broad&rdquo; have to be reachable together and apart.</p>
<p><b>The shipping default is byte-identical to the tree before this session</b>, by construction rather than
tolerance: <code>Math.max(0 &times; halfW, tipFloor)</code> IS the floor and the interpolant&rsquo;s
<code>m === 1</code> arm returns <code>s</code> itself. Measured in Node against a worktree of b323268:
12,180 half-widths and every cap field, 0 differ under <code>Object.is</code>.</p>
<h2>The same-tree control distribution for this run</h2>
<p>The renderer is not deterministic between page sessions and a single control sample is never a floor, so
every row here was rendered twice on the same tree at the same camera and the whole distribution is printed.
Read every pixel number on this page against it &mdash; and note that the whole-blade framing is bimodal
(in phase A the identity comparison, between builds proved bit-identical to the float, read 0 px on one run
and 7,036 px on the next), so the pixel claim belongs to the <b>tip crop</b>. No cell here is a whole-bloom
framing.</p>
<pre>${VIEWS.map((v) => `${v.padEnd(6)} n=${dist[v].n}  min ${dist[v].min}  median ${dist[v].median}  max ${dist[v].max}   [${dist[v].all.join(', ')}]`).join('\n')}

${idLines.join('\n')}</pre>
${group('1 &middot; The shipping default, and the space the two controls open',
  'At the size petals actually ship (35 &times; 16 mm). The first cell is unchanged from before this session; everything after it was unreachable.',
  ['today', 'shape-035', 'shape-05', 'shape-2', 'shape-35'])}
${group('2 &middot; The terminal — how broad the blade ends',
  'The <code>Tip end</code> axis at the straight-cone shape. Every one of these narrows monotonically to its terminal, which is what A5 asserts on every gate row.',
  ['end-15', 'end-30', 'end-60'])}
${group('3 &middot; The corners, and the state no shipped control could reach',
  'Both axes together. The poppy is the cell the ruling turns on.',
  ['poppy', 'corner-round', 'corner-drawn', 'spatulate'])}
${group('4 &middot; The base tree — what the retirement removed',
  'Rendered from a git worktree of b323268 by the same browser and the same camera, so this is a real render of the old code rather than a remembered one. The first cell is the identity pair with section 1; the rest are the retired control\'s own states.',
  ['base-today', 'base-breadth-01', 'base-breadth-30', 'base-breadth-60'])}
<h2>Dead-control sweep</h2>
<p>Every step of both shipped ranges, at five petal-width &times; mode combinations, measured on the
<b>drawn rows</b> rather than on the continuous law &mdash; a curve the 28-row sampling cannot resolve is a
control that has stopped responding whatever the arithmetic says. Both directions of the question: does each
control move the shape across its whole declared range, and does its default sit anywhere the other control
goes inert.</p>
<pre>${esc(sweep.join('\n'))}</pre>
`);

await browser.close(); server.close(); if (base) base.server.close();
console.log(`\nwrote ${out.length} cell(s) -> ${path.join(outDir, 'index.html')}`);
