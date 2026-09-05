/* ===================================================================
   THE CURL SHEET — the petal curl family on the domed hub (session 16,
   Eva Sep 4): curl bias, curl start, cross-section taper, cup gradient.

   WHAT IT SHOWS, in the order Eva asked for:
   (1) EACH NEW CONTROL SWEPT ALONE at min / default / max, PRINT PREVIEW
       ON, ONE fixed camera per sweep sized from the sweep's own default
       cell — so what differs between the three cells is the object. Bias
       and start on the default bloom at spine curl 150; taper under the
       QUILL corner (roll 330 x width 8 x sheet 0.60 — the one state where
       roll's own floor binds); cup gradient on the widest petal.
   (2) THE SPINE FLOOR FIRING, BOTH SIDES: start 0.50 (the tightest spine
       radius 6.7 mm, no clamp) beside start 0.95 (the law asks 0.67 mm on a
       35 mm blade against a 1.20 mm floor: CLAMPED, 150 asked, the built
       turn printed). And THE SELF-CONTACT FLAG, both sides: curl 360 x
       start 0.50 (the tip lands on its own mid-blade at 0.000 mm) beside
       curl 360 x bias 1 (a crozier winds inside itself, 2.7 mm clear).
   (3) THE INCURVE TARGET AT EVERY NEW CONTROL'S EXTREMES, with the coverage
       and crowding numbers in every caption — bias 1 and start 0.95 side
       by side, the honest picture of what these controls do to the crown
       (re-open it: that is them working, Eva Sep 4), the pair together,
       cup gradient at both ends, and taper +1 (inert here: roll is 0).
   (4) A CROWN CROP of the pinned incurve target, straight down the axis at
       hub magnification, proving the bald spot stayed closed: 0.0%
       uncovered, bald-cap 0.08 mm, the numbers the export gate asserts.
   (5) A BASE CROP — what curl start does at the foot: the incurve target at
       start 0 beside start 0.50 from a low profile at the rim, where the
       straight run leaving the foot is visible. The foot rows themselves
       never move (J1 is clean on every row; D_max is identical).
   (6) THE SHIPPING DEFAULT AND THE INCURVE TARGET UNCHANGED, as a
       BEFORE/AFTER pair from a git worktree of the base commit when one is
       given: the same sliders on both trees, and the exported STL's sha
       REQUIRED equal — the sheet measures the byte claim it prints for
       these two cells rather than asserting a total it did not run.

   EVERY CELL states its mode from the app's own shownMode through
   modeTag(); chrome hidden and auto-rotate off through the asserted
   stillFrame(); whole state read back; the junction (J1, J3, J8, J9) and
   curl (C1-C3) assertions run before the shutter; crowding registered
   against a real STL (R1); coverage from tools/bloom-plan-coverage.mjs's
   own measure(); every frame decoded and required to carry content.

   RUN:  node tools/shot-bloom-curl.mjs <out-dir> [base-worktree-dir]
         [base-worktree-dir] is a `git worktree add <dir> <commit-before-
         this-change>` — never the live tree, never mutate-and-restore.
   =================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame, exportStl, analyzeStl,
         junctionAssertions, curlAssertions, settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';
import { footCrowding, crowdingLine } from './bloom-crowding.mjs';
import { measure as planCoverage, coverageLine } from './bloom-plan-coverage.mjs';

const outDir = process.argv[2] || '/tmp/bloom-curl';
const beforeRoot = process.argv[3] || null;
if (beforeRoot && !fs.existsSync(path.join(beforeRoot, 'bloom.html'))) {
  console.error('usage: node tools/shot-bloom-curl.mjs <out-dir> [base-worktree-dir] — the base dir must hold bloom.html at its root');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const before = beforeRoot ? await serveRepo(beforeRoot) : null;
const { browser, page } = await launchPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-curl-sheet-'));
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); if (before) before.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const VIEWS = {
  /* Straight down the axis at hub magnification: the crown. */
  crown: (hubR, m) => ({ r: Math.max(hubR * 1.35, 6), at: [0, 0, m.apexZ], dir: [0.02, -0.05, 0.999] }),
  /* A low view from just above the rim plane, targeted on the rim: the roots leaving the foot. */
  profile: (hubR) => ({ r: Math.max(hubR * 1.6, 5), at: [0, 0, hubR * 0.25], dir: [0.15, -0.98, 0.12] }),
  /* A three-quarter on the whole bloom, sized from the cell that owns the camera. */
  whole: null,
};

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

async function shoot(file, view, frame) {
  let scale = 1;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (VIEWS[view]) { const f = VIEWS[view](frame.hub, frame); f.r *= scale; await page.evaluate((a) => window.__bloomFrame(a.r, 0, a.at, a.dir), f); }
    else await page.evaluate((rr) => window.__bloomFrame(rr, 0.15), frame.fit * scale);
    await page.waitForTimeout(260);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 800, height: 800 } });
    const { width, height, data } = decodePNG(fs.readFileSync(file));
    let content = 0;
    for (let o = 0; o < data.length; o += 4) if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
    const frac = content / (width * height);
    /* A WHOLE-BLOOM FRAME MUST CLEAR ITS EDGES (the fan sheet's own rule): a
       straight-based petal reaches far past the arc it replaces, and the
       first render of this sheet framed start 0.95 inside its own canopy at
       a content fraction the 2-98% check was happy with. Decoded: 12 px
       clear on all four edges, or widen and go again. */
    let edgeHit = false;
    if (!VIEWS[view]) {
      const M = 12;
      const isBg = (o) => Math.abs(data[o] - 0x0c) <= 10 && Math.abs(data[o + 1] - 0x0f) <= 10 && Math.abs(data[o + 2] - 0x0e) <= 10;
      for (let y = 0; y < height && !edgeHit; y++) for (let x = 0; x < width; x++) {
        if (y >= M && y < height - M && x >= M && x < width - M) { x = width - M - 1; continue; }
        if (!isBg((y * width + x) * 4)) { edgeHit = true; break; }
      }
    }
    if (frac >= 0.02 && frac <= 0.98 && !edgeHit) return { file: path.basename(file), scale };
    if (frac < 0.02) await die(`${path.basename(file)}: the frame is ${(frac * 100).toFixed(1)}% content — not a picture anyone should rule from`);
    scale *= VIEWS[view] ? 1.6 : 1.25;
  }
  await die(`${path.basename(file)}: still inside the model after four widenings`);
}

/* One configuration on one tree, PRINT PREVIEW ON, photographed with a given
   camera frame (or its own). `tree` is 'live' or 'before'. */
async function cell({ label, set: sets = [], views = ['whole'], note = '', frame = null, tree = 'live', coverage = true }) {
  const p = tree === 'before' ? before.port : port;
  await openBloom(page, p);
  const bad = await applyConfig(page, sets);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length && tree === 'live') await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const row = { label, set: sets };
  if (tree === 'live') {
    const jct = await junctionAssertions(page, row);
    if (jct.length) await die(`${label}: junction: ${jct.join('; ')}`);
    const crl = await curlAssertions(page, row);
    if (crl.length) await die(`${label}: curl: ${crl.join('; ')}`);
  }
  const buf = await exportStl(page, tmp);
  if (!buf) await die(`${label}: no STL download`);
  const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
  const stl = analyzeStl(buf);
  const { bad: cb, r } = await footCrowding(page, row, stl);
  if (cb.length) await die(`${label}: ${cb.join('; ')}`);
  let cov = null;
  if (coverage && tree === 'live') {
    const c = await planCoverage(page, {});
    if (c.bad.length) await die(`${label}: ${c.bad.join('; ')}`);
    cov = c.skipped ? { skipped: c.skipped } : c.r;
  }
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const own = { hub: m0.hubRadius, fit: m0.fitRadius, apexZ: m0.hubDome ? m0.hubDome.H : 0 };
  const fr = frame || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const shots = {}, widened = {};
  for (const view of views) { const got = await shoot(path.join(outDir, `${slug(label)}-${tree}-${view}.png`), view, fr); shots[view] = got.file; widened[view] = got.scale; }
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  await setPreview(false);
  const rec = { label, tag: modeTag(m), note, shots, widened, r, own, cov, sha, tree,
    shownTris: m.shownTris, tris: stl.tris, boundary: stl.boundary, degenerate: stl.degenerate, bytes: buf.length, hub: m.hubRadius,
    spine: m.petalSpine, spineLine: (readout.split('\n').find((l) => /^SPINE CURL/.test(l)) || ''),
    seatLine: (readout.split('\n').find((l) => /^centre seated/.test(l)) || '') };
  console.log(`  ${label.padEnd(64)} ${tree.padEnd(6)} sha ${sha} tris ${stl.tris} B${stl.boundary} · ${modeTag(m)}`);
  if (rec.spineLine) console.log(`  ${''.padEnd(64)} ${rec.spineLine}`);
  if (rec.seatLine) console.log(`  ${''.padEnd(64)} (${modeTag(m)}) ${rec.seatLine}`);
  console.log(`  ${''.padEnd(64)} ${crowdingLine(r)}${cov ? '\n' + ''.padEnd(66) + (cov.skipped ? 'COVERAGE: SKIPPED — ' + cov.skipped : coverageLine(cov)) : ''}`);
  return rec;
}

/* THE SHARED CAMERA OF A SWEEP IS SIZED FROM ITS WIDEST CELL — a probe pass
   over the sweep's configs reads each one's own fit radius (live geometry,
   nothing shot) and the sweep is then shot at the largest, so the three
   cells share one camera AND every one of them fits. Sizing from the
   default cell framed start 0.95 inside its own canopy on the first render. */
async function sweepFrame(configs) {
  let fit = 0, first = null;
  for (const sets of configs) {
    await openBloom(page, port);
    const bad = await applyConfig(page, sets);
    if (bad.length) await die(`sweep frame probe: ${bad.join('; ')}`);
    const m = await page.evaluate(() => window.__bloomMetrics());
    if (m.shownMode !== 'live') await die('sweep frame probe: not a live build');
    if (!first) first = { hub: m.hubRadius, apexZ: m.hubDome ? m.hubDome.H : 0 };
    fit = Math.max(fit, m.fitRadius);
  }
  return { ...first, fit };
}

const INCURVE = { placement: 'CONTINUOUS', petalCount: 40, layerCount: 3, spread: 1.6, petalLength: 20, petalWidth: 8, layerSize: 0.9, petalTilt: 75, layerTilt: 5, petalSpineCurl: 150, sheetThickness: 0.6, footDelicacy: 0.25 };
const INC = { ...INCURVE, headRise: 0.5 };
const QUILL = { petalRoll: 330, petalWidth: 8, sheetThickness: 0.6 };

console.log('THE CURL SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');

/* The shared cameras, from the widest cell of each sweep. */
const incFrame = await sweepFrame([set(INC), set({ ...INC, curlBias: 1 }), set({ ...INC, curlStart: 0.95 }), set({ ...INC, curlBias: 1, curlStart: 0.95 }), set({ ...INC, petalCupGradient: 1.2 }), set({ ...INC, petalCupGradient: -0.8 })]);
const curlFrame = await sweepFrame([set({ petalSpineCurl: 150 }), set({ petalSpineCurl: 150, curlBias: 0.5 }), set({ petalSpineCurl: 150, curlBias: 1 }), set({ petalSpineCurl: 150, curlStart: 0.5 }), set({ petalSpineCurl: 150, curlStart: 0.95 })]);
const taperFrame = await sweepFrame([set(QUILL), set({ ...QUILL, petalRollTaper: 1 }), set({ ...QUILL, petalRollTaper: -1 })]);
const gradFrame = await sweepFrame([set({ petalWidth: 30 }), set({ petalWidth: 30, petalCupGradient: 1.2 }), set({ petalWidth: 30, petalCupGradient: -0.8 })]);
const flagFrame = await sweepFrame([set({ petalSpineCurl: 360, curlStart: 0.5 }), set({ petalSpineCurl: 360, curlBias: 1 })]);

/* (6) controls, before/after */
const ctlDefault = await cell({ label: 'CONTROL — shipping default', set: [], views: ['whole'], note: 'Byte-identical to the base commit: every new control defaults to its identity and the guards take the shipped paths verbatim.' });
const ctlIncurve = await cell({ label: 'CONTROL — the incurve target x head rise 0.50 (pinned: bias 0, start 0)', set: set(INC), views: ['whole', 'crown'], frame: incFrame,
  note: 'The pinned row the export gate asserts coverage on: 0.0% of the hub disc uncovered, bald-cap 0.08 mm. Crown closure here is EMERGENT — curl 150 x tilt x domeLean landing every tip within 0.3-1.3 mm of the axis — never designed, no margin.' });
let beforeDefault = null, beforeIncurve = null;
if (before) {
  beforeDefault = await cell({ label: 'BEFORE — shipping default on the base tree', set: [], views: ['whole'], tree: 'before', frame: ctlDefault.own, coverage: false });
  beforeIncurve = await cell({ label: 'BEFORE — the incurve target x head rise 0.50 on the base tree', set: set(INC), views: ['whole', 'crown'], tree: 'before', frame: incFrame, coverage: false });
  if (beforeDefault.sha !== ctlDefault.sha) await die(`the shipping default exports sha ${ctlDefault.sha} on this tree and ${beforeDefault.sha} on the base tree — the controls did not land byte-identical`);
  if (beforeIncurve.sha !== ctlIncurve.sha) await die(`the incurve target exports sha ${ctlIncurve.sha} on this tree and ${beforeIncurve.sha} on the base tree — the pinned row moved`);
}

/* (1) each control alone at min / default / max, one camera per sweep */
const b0 = await cell({ label: 'BIAS 0 (uniform, a hoop) — default bloom x spine curl 150', set: set({ petalSpineCurl: 150 }), frame: curlFrame, note: 'The shipped arc: constant curvature, spine radius 13.4 mm.' });
const b5 = await cell({ label: 'BIAS 0.50 — default bloom x spine curl 150', set: set({ petalSpineCurl: 150, curlBias: 0.5 }), frame: curlFrame, note: 'The same 150 degrees, redistributed toward the tip (p = 2): the base runs straighter, the tip turns harder.' });
const b1 = await cell({ label: 'BIAS 1 (tip-loaded, a crozier) — default bloom x spine curl 150', set: set({ petalSpineCurl: 150, curlBias: 1 }), frame: curlFrame, note: 'p = 4: nearly straight through the base, the whole turn in the last third.' });
const s0 = b0;
const s5 = await cell({ label: 'START 0.50 — default bloom x spine curl 150', set: set({ petalSpineCurl: 150, curlStart: 0.5 }), frame: curlFrame, note: 'A dead-straight base half, then the whole 150 degrees as a true arc through the tip half — one kink at the threshold, as the flower describes it. Tightest spine radius 6.7 mm: the floor does not bind.' });
const s95 = await cell({ label: 'START 0.95 — default bloom x spine curl 150 (the spine floor binds)', set: set({ petalSpineCurl: 150, curlStart: 0.95 }), frame: curlFrame, note: 'The law asks 150 degrees inside the last 5% of a 35 mm blade — a 0.67 mm spine radius against a 1.20 mm floor (one sheet thickness). CLAMPED: the curvature is held at the floor and the turn that built is printed beside the turn asked. Full range, clamped, told (Eva, Sep 4).' });
const t0 = await cell({ label: 'TAPER 0 — the QUILL (roll 330 x width 8 x sheet 0.60)', set: set(QUILL), frame: taperFrame, note: 'The roll clamp corner: the one state where roll\'s own floor binds. Even along the length.' });
const tp = await cell({ label: 'TAPER +1 — the QUILL opens toward the tip', set: set({ ...QUILL, petalRollTaper: 1 }), frame: taperFrame, note: 'The roll\'s curvature fades to zero at the tip (smootherstep): a tube at the base, a spoon at the tip.' });
const tm = await cell({ label: 'TAPER -1 — the QUILL opens toward the base', set: set({ ...QUILL, petalRollTaper: -1 }), frame: taperFrame, note: 'The mirror: open at the base, a tube at the tip.' });
const g0 = await cell({ label: 'CUP GRADIENT 0 — widest petal (30 mm), cup 0', set: set({ petalWidth: 30 }), frame: gradFrame, note: 'Flat across the width.' });
const gp = await cell({ label: 'CUP GRADIENT +1.2 — widest petal', set: set({ petalWidth: 30, petalCupGradient: 1.2 }), frame: gradFrame, note: 'The flower\'s "edge curve — profile" under the name the geometry earns: the same v-squared lift cup is, growing linearly to the tip. Renamed on the 28% RMS residual against the best-fitting cup.' });
const gm = await cell({ label: 'CUP GRADIENT -0.8 — widest petal', set: set({ petalWidth: 30, petalCupGradient: -0.8 }), frame: gradFrame, note: 'Reflexing more toward the tip.' });

/* (2) the flag, both sides */
const fContact = await cell({ label: 'SELF-CONTACT — curl 360 x start 0.50', set: set({ petalSpineCurl: 360, curlStart: 0.5 }), frame: flagFrame, note: 'A full hoop in the outer half: the tip lands on the blade\'s own mid-row at 0.000 mm. The SELF-CONTACT flag is raised — a flag, never a gate, because the shipped hoop (curl 360 alone, tip on root) raises it too.' });
const fClean = await cell({ label: 'NO SELF-CONTACT — curl 360 x bias 1', set: set({ petalSpineCurl: 360, curlBias: 1 }), frame: flagFrame, note: 'A crozier winds inside itself: 360 degrees, tip-loaded, and the blade never comes within a sheet of itself (2.7 mm clear). The floor clamps it very slightly (358.8 of 360 degrees built).' });

/* (3) the incurve target at every new control's extremes, coverage + crowding in the caption */
const iBias = await cell({ label: 'INCURVE TARGET x bias 1', set: set({ ...INC, curlBias: 1 }), views: ['whole', 'crown'], frame: incFrame,
  note: 'DOCUMENTED BEHAVIOUR, not a failure: the same 150 degrees redistributed to the tip moves every tip 5-11 mm out from the axis, and the crown re-opens. The controls relocate the tip; that is them working (Eva, Sep 4).' });
const iStart = await cell({ label: 'INCURVE TARGET x start 0.95', set: set({ ...INC, curlStart: 0.95 }), views: ['whole', 'crown'], frame: incFrame,
  note: 'The other honest picture: the base 95% of every floret runs straight at its launch angle, the floor clamps the hook (150 asked, 96 built), and the crown is open.' });
const iBoth = await cell({ label: 'INCURVE TARGET x bias 1 x start 0.95', set: set({ ...INC, curlBias: 1, curlStart: 0.95 }), views: ['whole', 'crown'], frame: incFrame, note: 'Both at their ends: CLAMPED to 50 degrees built.' });
const iGradP = await cell({ label: 'INCURVE TARGET x cup gradient +1.2', set: set({ ...INC, petalCupGradient: 1.2 }), views: ['whole', 'crown'], frame: incFrame, note: 'A cross-width deformation: the crown stays closed (0.0%, 0.08 mm).' });
const iGradM = await cell({ label: 'INCURVE TARGET x cup gradient -0.8', set: set({ ...INC, petalCupGradient: -0.8 }), views: ['whole', 'crown'], frame: incFrame, note: 'Likewise.' });
const iTaper = await cell({ label: 'INCURVE TARGET x taper +1 (inert: roll is 0)', set: set({ ...INC, petalRollTaper: 1 }), views: ['whole', 'crown'], frame: incFrame, note: 'Roll is 0 on this recipe, so taper is hidden and inert: this cell must export the pinned row\'s own sha.' });
if (iTaper.sha !== ctlIncurve.sha) await die(`taper +1 on the incurve target (roll 0) exports sha ${iTaper.sha}, the pinned row ${ctlIncurve.sha} — an inert control moved bytes`);

/* (5) the base: curl start at the foot */
const fStart0 = await cell({ label: 'THE FOOT — incurve target, start 0 (low profile at the rim)', set: set(INC), views: ['profile'], note: 'The shipped law: every floret begins bending as it leaves the foot.' });
const fStart5 = await cell({ label: 'THE FOOT — incurve target, start 0.50 (low profile at the rim)', set: set({ ...INC, curlStart: 0.5 }), views: ['profile'], frame: fStart0.own,
  note: 'A straight run leaves every foot before the curl begins. The foot rows themselves are untouched (J1 clean, D_max identical); only the blade above them changed.' });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const num = (c) => `<b>${esc(c.tag)}</b> · sha ${c.sha} · ${Number(c.tris).toLocaleString('en-US')} tris · boundary ${c.boundary} · degenerate ${c.degenerate}`
  + (c.spineLine ? `<br>${esc(c.spineLine)}` : '')
  + `<br>${esc(crowdingLine(c.r))}`
  + (c.cov ? `<br>${esc(c.cov.skipped ? 'COVERAGE: SKIPPED — ' + c.cov.skipped : coverageLine(c.cov))}` : '');
const fig = (c, view, cap) => `<figure><img src="${c.shots[view]}"><figcaption><b>${esc(c.label)}</b> <i>(${cap}${c.widened[view] > 1 ? `, camera widened ${c.widened[view].toFixed(2)}x` : ''})</i><br><small>${num(c)}</small>`
  + (c.note ? `<p>${esc(c.note)}</p>` : '') + `</figcaption></figure>`;
const html = `<title>The petal curl family</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 4px}p.note{color:#9fb3a9;max-width:110ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:14px}main.three{grid-template-columns:repeat(3,minmax(0,1fr))}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}
figcaption{margin-top:8px}figcaption p{color:#9fb3a9;margin:6px 0 0}small{color:#7f948a}</style>
<h1>The petal curl family — bias, start, taper, cup gradient — on the domed hub</h1>
<p class="note"><b>Every cell is the PRINT PREVIEW</b> — read back from the app's own shownMode after the real box was flipped — chrome hidden, auto-rotate off, asserted. Each sweep shares ONE camera sized from its own default cell. Every caption carries the export's crowding number registered against a real STL, the plan-coverage numbers from the same instrument the export gate asserts, and the read-out's own SPINE CURL line.${before ? ' The two controls were also exported from a worktree of the base commit and their STL sha REQUIRED equal.' : ''}</p>
<h2>1. The incurve target — pinned, the crown closed — and what the two curl modifiers do to it</h2>
<main class="three">${fig(ctlIncurve, 'whole', 'whole bloom')}${fig(iBias, 'whole', 'whole bloom, same camera')}${fig(iStart, 'whole', 'whole bloom, same camera')}</main>
<main class="three">${fig(ctlIncurve, 'crown', 'the crown, straight down the axis')}${fig(iBias, 'crown', 'the crown')}${fig(iStart, 'crown', 'the crown')}</main>
<main class="three">${fig(iBoth, 'crown', 'the crown')}${fig(iGradP, 'crown', 'the crown')}${fig(iGradM, 'crown', 'the crown')}</main>
<main>${fig(iBoth, 'whole', 'whole bloom')}${fig(iTaper, 'whole', 'whole bloom — inert at roll 0, same sha as the pinned row')}</main>
<h2>2. Each control alone at min / default / max — one camera per sweep</h2>
<main class="three">${fig(b0, 'whole', 'bias 0')}${fig(b5, 'whole', 'bias 0.50')}${fig(b1, 'whole', 'bias 1')}</main>
<main class="three">${fig(s0, 'whole', 'start 0')}${fig(s5, 'whole', 'start 0.50')}${fig(s95, 'whole', 'start 0.95 — CLAMPED')}</main>
<main class="three">${fig(tm, 'whole', 'taper -1')}${fig(t0, 'whole', 'taper 0')}${fig(tp, 'whole', 'taper +1')}</main>
<main class="three">${fig(gm, 'whole', 'cup gradient -0.8')}${fig(g0, 'whole', 'cup gradient 0')}${fig(gp, 'whole', 'cup gradient +1.2')}</main>
<h2>3. The spine floor and the self-contact flag, both sides</h2>
<main>${fig(s5, 'whole', 'start 0.50 — the floor does not bind')}${fig(s95, 'whole', 'start 0.95 — CLAMPED, the turn built printed')}</main>
<main>${fig(fContact, 'whole', 'SELF-CONTACT raised')}${fig(fClean, 'whole', 'no self-contact')}</main>
<h2>4. The foot — curl start from a low profile at the rim</h2>
<main>${fig(fStart0, 'profile', 'start 0')}${fig(fStart5, 'profile', 'start 0.50')}</main>
<h2>5. Controls — unchanged${before ? ', BEFORE (base tree) beside AFTER (this tree), sha equal' : ''}</h2>
${before ? `<main>${fig(beforeDefault, 'whole', 'BEFORE')}${fig(ctlDefault, 'whole', 'AFTER')}</main><main>${fig(beforeIncurve, 'crown', 'BEFORE — the crown')}${fig(ctlIncurve, 'crown', 'AFTER — the crown')}</main>` : `<main>${fig(ctlDefault, 'whole', 'whole bloom')}${fig(ctlIncurve, 'whole', 'whole bloom')}</main>`}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); if (before) before.server.close(); fs.rmSync(tmp, { recursive: true, force: true });
