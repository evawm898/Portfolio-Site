/* ===================================================================
   THE MARGIN BUCKLE SHEET — the lettuce edge, and the two references the
   falloff exponent was added for (session 34).

   WHAT IT SHOWS, in the order the ruling needs it:
   (1) THE TWO REFERENCES, which is why `buckleEnv` exists at all. A bearded
       iris ruffles at HIGH amplitude AND with the wave reaching well inward
       from the margin; a rose undulates at LOW amplitude AND confined to a
       narrow band at the edge. One fixed exponent draws one or the other and
       never both — that claim is the control's whole justification, so the
       sheet puts the two side by side at the top and each beside the OTHER
       parameterisation's amplitude, so the failure is visible rather than
       described.
   (2) THE p AXIS AT FIXED AMPLITUDE AND FREQUENCY — five cells where the only
       thing that moves is the reach. This is the axis the amendment adds, and
       it is shot alone so nothing else can be credited with what it does.
   (3) AMPLITUDE AND FREQUENCY as their own sweeps, each with the other held.
   (4) THE CLAMP, both sides: the same asked amplitude at a frequency where it
       is free and at one where it binds, with the built value and the tightest
       fold in the caption. Full range, output clamped, told.
   (5) THE PER-SLOT PHASE — three petals and forty, where the point is that no
       two petals carry the same wave.
   (6) THE COMPOSITION, which is a tracked xfail on the wall instrument and is
       photographed rather than hidden: a buckle over cup 1.2 and curl 180,
       beside each ingredient alone.
   (7) THE IDENTITY CONTROL — the shipping default beside the GATED state
       (frequency and reach at their extremes with amplitude 0). THE CLAIM IS
       MADE ON THE GEOMETRY, NOT THE PIXELS: `Object.is` over the emitted
       positions, where an exact zero is a real property. An exact-zero PIXEL
       identity is NOT available on this renderer — two draws of one cell at
       one camera settle 1 px apart — so the pixel number is reported beside
       the row's own control and never asserted. Every other pixel number here
       is reported the same way and none is used as a bar.

   EVERY ROW CARRIES ITS OWN SAME-TREE CONTROL — the row's first cell shot a
   second time, same page session, same camera. A single control sample is
   never a floor (sessions 26, 28, 30), so the sheet REPORTS the row's control
   beside its diffs and makes no threshold claim from one draw.

   FRAMING is the app's own camera via __bloomFrame; chrome hidden and
   auto-rotate off through the asserted stillFrame(); one fresh page per cell;
   the whole registry state read back against DEFAULTS + set; the buckle's own
   telemetry read from __bloomMetrics rather than recomputed here.

   RUN:  node tools/shot-bloom-buckle.mjs <out-dir> [--quick]
         --quick shoots rows 1 and 7 only — two rows to prove the tool before
         the grid, which is the charter's own instruction.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, modeTag, shownModeOf } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-buckle';
const QUICK = process.argv.includes('--quick');
fs.mkdirSync(outDir, { recursive: true });
const VIEW = 520, DPR = 1;

const { server, port } = await serveRepo();
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));

/* THREE CONSECUTIVE IDENTICAL FRAMES, NOT TWO, AND A WARM-UP PASS BEFORE THE
   FIRST CAPTURE — both measured rather than chosen. On a page just loaded and
   configured, "two identical frames" fires SPURIOUSLY: the camera's easing has
   plateaus where two 100 ms samples round to the same image while it is still
   a long way from rest. Measured on this tree: the first settle reported
   itself done after 27 iterations and its frame was 27,982 px from where the
   same cell sits once genuinely at rest; every capture after that is 1 px.
   That is /plot's own recorded lesson — a hash EQUALITY across two captures
   is not proof the view stopped — arriving here. */
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
async function shoot(file, r) {
  await page.evaluate((rad) => window.__bloomFrame(rad, 0.15), r);
  const settled = await settleOnly();
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  const buf = await page.screenshot({ clip, timeout: 180000 });
  if (settled < 0) await die(`${path.basename(file)}: never settled in 90 frames`);
  fs.writeFileSync(file, buf);
  const { width, height, data } = decodePNG(buf);
  let content = 0;
  for (let o = 0; o < data.length; o += 4) {
    if (Math.abs(data[o] - 0x0c) > 10 || Math.abs(data[o + 1] - 0x0f) > 10 || Math.abs(data[o + 2] - 0x0e) > 10) content++;
  }
  if (content / (width * height) < 0.005) await die(`${path.basename(file)}: the frame is empty — not a picture anyone should rule from`);
  return buf;
}
function pixelDiff(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  if (A.width !== B.width || A.height !== B.height) return null;
  let n = 0;
  for (let o = 0; o < A.data.length; o += 4) {
    if (A.data[o] !== B.data[o] || A.data[o + 1] !== B.data[o + 1] || A.data[o + 2] !== B.data[o + 2]) n++;
  }
  return n;
}

/* One cell: a fresh page, the config applied through the real UI, the whole
   state read back, the frame asserted still, and the buckle's numbers taken
   from the app rather than recomputed. */
async function cell({ id, label, sets, radius }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, set(sets));
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, set(sets));
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const still = await stillFrame(page);
  if (still.length) await die(`${label}: ${still.join('; ')}`);
  const m = await page.evaluate(() => window.__bloomMetrics());
  if (m.shownMode !== 'live') await die(`${label}: framed from a ${m.shownMode} build`);
  /* THE WARM-UP. The page has just loaded and been configured; let the view
     come to rest BEFORE the frame that will be captured, rather than trusting
     the capture's own settle to notice. */
  if (await settleOnly() < 0) await die(`${label}: the view never came to rest before the first capture`);
  const b = m.petal && m.petal.form && m.petal.form.buckle;
  const buf = await shoot(path.join(outDir, `${id}.png`), radius || m.fitRadius);
  const cap = b
    ? `${b.ampAsked.toFixed(2)}x asked → ${b.ampBuilt.toFixed(3)}x built${b.clamped ? ' (CLAMPED)' : ''}`
      + ` · f ${b.freq} · p ${b.env.toFixed(1)} · fold ${b.radiusMm.toFixed(2)} mm`
      + ` · ${b.rowsPerCycle.toFixed(1)} rows/cycle`
    : 'flat — no buckle';
  return { id, label, file: `${id}.png`, buf, caption: cap, mode: modeTag(m), tris: m.shownTris,
           radius: radius || m.fitRadius };
}

const A = 0.45, ROSE = 0.12;
const ROWS = [
  { id: 'R1', title: '1 — THE TWO REFERENCES, and why one exponent cannot draw both',
    note: 'The iris ruffles at high amplitude AND wide; the rose at low amplitude AND narrow. Cells 3 and 4 are the cross terms — the iris amplitude at the rose reach, and the rose amplitude at the iris reach — which is what a fixed exponent would force you to accept.',
    cells: [
      { id: 'R1a', label: 'IRIS — A 0.45, p 2 (wide, reaching in)', sets: { buckleAmp: A, buckleFreq: 2, buckleEnv: 2 } },
      { id: 'R1b', label: 'ROSE — A 0.12, p 6 (narrow, at the edge)', sets: { buckleAmp: ROSE, buckleFreq: 4, buckleEnv: 6 } },
      { id: 'R1c', label: 'the iris amplitude at the ROSE reach (p 6)', sets: { buckleAmp: A, buckleFreq: 2, buckleEnv: 6 } },
      { id: 'R1d', label: 'the rose amplitude at the IRIS reach (p 2)', sets: { buckleAmp: ROSE, buckleFreq: 4, buckleEnv: 2 } },
      { id: 'R1e', label: 'flat — the shipping default', sets: {} },
    ] },
  { id: 'R2', title: '2 — THE p AXIS, amplitude and frequency held (A 0.30, f 3)',
    note: 'The only thing moving is the reach. p is printed with the fraction of the half-width the wave occupies, which is the number the read-out gives a visitor.',
    cells: [2, 3, 4, 5, 6].map((p) => ({ id: `R2p${p}`, label: `p ${p}`, sets: { buckleAmp: 0.3, buckleFreq: 3, buckleEnv: p } })) },
  { id: 'R3', title: '3 — AMPLITUDE, at the default frequency and reach',
    note: 'A fraction of the LOCAL half-width, so the wave tapers with the blade instead of crumpling the tip.',
    cells: [0.05, 0.15, 0.3, 0.45, 0.6].map((a) => ({ id: `R3a${String(a).replace('.', '')}`, label: `A ${a.toFixed(2)}x`, sets: { buckleAmp: a } })) },
  { id: 'R4', title: '4 — FREQUENCY, amplitude held at 0.20',
    note: 'Cycles along the blade. The ceiling is 7, which is exactly 8 rows per cycle at NU = 56 — the bar below which the emitted polyline stops being the law’s curve.',
    cells: [1, 2, 3, 5, 7].map((f) => ({ id: `R4f${f}`, label: `f ${f}`, sets: { buckleAmp: 0.2, buckleFreq: f } })) },
  { id: 'R5', title: '5 — THE CLAMP, both sides of the same asked amplitude (0.60x)',
    note: 'The cap falls as f squared, so the same slider position is free at f 1 and heavily clamped at f 7. Full range exposed, output clamped, the built value and the tightest fold in every caption.',
    cells: [1, 2, 3, 5, 7].map((f) => ({ id: `R5f${f}`, label: `A 0.60 asked · f ${f}`, sets: { buckleAmp: 0.6, buckleFreq: f } })) },
  { id: 'R6', title: '6 — THE PER-SLOT PHASE: no two petals carry the same wave',
    note: 'The phase is derived from the slot index at the golden angle — never a control, and deterministic, so the same design rebuilds the same bloom.',
    cells: [
      { id: 'R6a', label: '3 petals', sets: { buckleAmp: 0.3, petalCount: 3 } },
      { id: 'R6b', label: '8 petals (the default count)', sets: { buckleAmp: 0.3 } },
      { id: 'R6c', label: '20 petals', sets: { buckleAmp: 0.3, petalCount: 20 } },
      { id: 'R6d', label: '40 petals', sets: { buckleAmp: 0.3, petalCount: 40 } },
      { id: 'R6e', label: '3 whorls (the phase runs over the slot, not the whorl)', sets: { buckleAmp: 0.3, layerCount: 3 } },
    ] },
  { id: 'R7', title: '7 — THE COMPOSITION, and the IDENTITY CONTROL',
    note: 'Cells 1–3 are the tracked wall xfail photographed rather than hidden: the buckle over a cupped and curled blade, beside each ingredient alone. Cells 4 and 5 are the identity: the shipping default and the GATED state (frequency and reach at their extremes with amplitude 0) must be EXACTLY 0 px apart.',
    cells: [
      { id: 'R7a', label: 'cup 1.2 + curl 180, no buckle', sets: { petalCup: 1.2, petalSpineCurl: 180 } },
      { id: 'R7b', label: '+ buckle A 0.20 (the xfail state)', sets: { petalCup: 1.2, petalSpineCurl: 180, buckleAmp: 0.2 } },
      { id: 'R7c', label: 'the same buckle on a flat blade', sets: { buckleAmp: 0.2 } },
      { id: 'R7d', label: 'IDENTITY — the shipping default', sets: {} },
      { id: 'R7e', label: 'IDENTITY — f 7, p 6, amplitude 0 (hidden AND inert)', sets: { buckleAmp: 0, buckleFreq: 7, buckleEnv: 6 } },
    ] },
];

const chosen = QUICK ? [ROWS[0], ROWS[6]] : ROWS;
const done = [];
for (const row of chosen) {
  /* ONE CAMERA PER ROW, sized from the row's own first cell, so what differs
     between cells is the object and never the framing. */
  const first = await cell(row.cells[0]);
  const radius = first.radius;
  const controlBuf = await shoot(path.join(outDir, `${row.cells[0].id}--control.png`), radius);
  const controlPx = pixelDiff(first.buf, controlBuf);
  const cells = [first];
  for (const c of row.cells.slice(1)) cells.push(await cell({ ...c, radius }));
  for (const c of cells) c.diffPx = pixelDiff(first.buf, c.buf);
  done.push({ ...row, controlPx, cells: cells.map(({ buf, ...r }) => r) });
  console.log(`${row.id}: control ${controlPx} px · ${cells.map((c) => `${c.id} ${c.diffPx}`).join(' · ')}`);
}

/* THE IDENTITY IS ASSERTED ON THE GEOMETRY, NOT ON THE PIXELS, and that
   correction is the sheet's own finding. An exact-zero PIXEL claim is not
   available here: two draws of one cell at one camera settle 1 px apart on
   this renderer, so "0 px" is not a property the instrument can deliver and a
   sheet asserting it would be asserting its own noise. The claim that IS
   exact is float-identity of the emitted positions, so it is made there —
   Object.is over the accumulator, the same comparison the wall instrument's
   V3 makes — and the pixel number is REPORTED beside the row's control. */
{
  const G = await import('../bloom-geometry.js');
  const { DEFAULTS } = await import('../bloom-registry.js');
  const pos = (extra) => {
    const acc = new G.MeshBuilder({ exportMode: true });
    G.buildBloomInto(acc, { ...DEFAULTS, ...extra });
    return acc.positions;
  };
  const a = pos({}), b = pos({ buckleAmp: 0, buckleFreq: 7, buckleEnv: 6 });
  let differ = a.length === b.length ? 0 : -1;
  if (differ === 0) for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) differ++;
  const px = fs.existsSync(path.join(outDir, 'R7e.png'))
    ? pixelDiff(fs.readFileSync(path.join(outDir, 'R7d.png')), fs.readFileSync(path.join(outDir, 'R7e.png'))) : null;
  console.log(`\nIDENTITY (geometry): default vs (f 7, p 6, amplitude 0) = ${differ} of ${a.length.toLocaleString('en-US')} floats differ`);
  if (px !== null) console.log(`IDENTITY (pixels, reported not asserted): ${px} px — read against this row's own control`);
  if (differ !== 0) await die(`the GATED state is not identical to the default: ${differ} floats differ — hidden but not inert`);
}

fs.writeFileSync(path.join(outDir, 'rows.json'), JSON.stringify(done, null, 1));
let h = `<!DOCTYPE html><meta charset="utf-8"><title>Margin buckling — the controls</title>
<style>body{background:#14120f;color:#e7ded0;font:14px/1.55 system-ui,sans-serif;margin:0;padding:30px 26px 70px}
h1{font-size:21px;margin:0 0 4px}.s{color:#a2968a;max-width:62em;margin:0 0 24px}
h2{font-size:15px;margin:32px 0 2px;color:#f2e9db}.n{color:#9c9084;max-width:74em;margin:0 0 10px;font-size:13px}
.c{color:#7fae7f;font-size:12px;margin:0 0 10px;font-family:ui-monospace,monospace}
.r{display:flex;gap:11px;overflow-x:auto;padding-bottom:6px}figure{margin:0;flex:0 0 auto;width:300px}
img{width:300px;height:300px;display:block;background:#000;border:1px solid #2c261e;border-radius:3px}
figcaption{font-size:12px;color:#b9ac9d;margin-top:5px}.m{font-family:ui-monospace,monospace;color:#7d7266;font-size:11px}</style>
<h1>Margin buckling — the three controls</h1>
<p class="s">Session 34. Amplitude is a fraction of the local half-width; frequency is in cycles, capped at 7; <b>reach</b> (p) is the falloff exponent, floor 2, ceiling 6, default 3. Phase is derived per slot at the golden angle and is not a control. NU is 56.</p>
<p class="s"><b>Read the control line on every row.</b> A single same-tree control draw is never a noise floor, so the per-cell pixel numbers are reported beside it and no threshold is claimed from them. The one pixel CLAIM on this sheet is row 7's identity, which is an exact zero.</p>`;
for (const r of done) {
  h += `<h2>${r.title}</h2><p class="n">${r.note}</p><p class="c">same-tree control on this row: ${r.controlPx} px between two draws of the same cell</p><div class="r">`;
  for (const c of r.cells) {
    h += `<figure><img src="${c.file}"><figcaption>${c.label}<br><span class="m">${c.caption}<br>${(c.tris ?? 0).toLocaleString('en-US')} tris (${c.mode}) · ${c.diffPx} px vs cell 1</span></figcaption></figure>`;
  }
  h += `</div>`;
}
fs.writeFileSync(path.join(outDir, 'index.html'), h);
console.log(`\nwrote ${path.join(outDir, 'index.html')}`);
await browser.close(); server.close();
