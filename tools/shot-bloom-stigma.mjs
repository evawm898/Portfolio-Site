/* ===================================================================
   shot-bloom-stigma.mjs — THE STIGMA'S SEVEN, AND THE PAIR (session 30;
   re-based on the PINCH in session 31 — `stigmaSharpness` is retired, the
   slider carries k with the exponent s = 2 / (1 + k), and the circle's own
   exponent is no longer on the travel, so the "circle it replaces" cell is
   now the NEAREST REACHABLE cell, pinch 0.05)

   THE SHEET IS THE POINT OF THIS SESSION, and Eva's brief names what it must
   show: the trifid at the NEW SHARPNESS against today's, at both count
   extremes, and the anther and the stigma SIDE BY SIDE so the two tips can
   be read as one family or not.

   WHAT "TODAY'S TRIFID" IS, said before the pictures. The stigma's seven
   default to today's trifid EXACTLY (0 moved is a construction — roundedness
   1, where the blend is exactly 1 and the lattice is the rod's own), and at
   roundedness 1 the pinch is INERT. So the default of 1.00 is INVISIBLE at
   rest, by design, and the first row proves it as a before/after pair from
   a git worktree of the base commit. The pinch only shows once roundedness
   leaves 1, and THAT is where the ruling lives: the second row is the trifid
   at roundedness 0 on the default beside the nearest reachable to the
   circle (pinch 0.05, one step above the singular exponent), and the third
   row is THE SPACE EITHER SIDE — pinch 3.00, 1.65, 1.00, 0.60, 0.35 at
   roundedness 0, on the print preview, where 3.00 is UNDER the 0.50 mm
   waist floor and the read-out says CLAMPED, plus the THIN-SHEET corner
   where the export floor raises the rod to 1.00 mm and 1.65 clamps too. The
   derivation is at TIP_PINCH_DEFAULT in bloom-geometry.js; the sheet is
   where its numbers are seen.

   THREE SCALES, mm per pixel on every cell, the anther sheet's shape:
     - `whole`  the bloom at its own fit radius — the stigma at its ACTUAL size.
     - `lens`   the centre at hand-lens scale (16 mm across): the stigma in
                the anthers, the pair.
     - `macro`  the stigma alone, framed from its OWN lobe diameter and spread.

   EVERY ROW CARRIES ITS OWN SAME-TREE RENDERER CONTROL (Eva, Sep 7): the
   same tree, the same camera, shot twice, on that row. THE WHOLE-BLOOM
   CONTROL IS BIMODAL (0-52 px or ~10,500 px; session 29 measured seven rows
   of one run) and settling on byte-identical frames does not remove it, so
   NO PIXEL CLAIM IS MADE ON `whole` OR `lens`: those figures are reported
   beside their controls. Read the PAIR, not the number. The exact claims
   carry the weight.

   WHAT IS ASSERTED:
     - the BEFORE/AFTER pair holds: identical triangle count, identical STYLE
       line numbers (IDENTITIES, the carrying claims), and the `macro`
       difference inside the run's largest macro control plus the pair's own
       two — a single control sample is not a floor, measured on this sheet's
       first full run (15 px against a 0 px control, on a run whose macro
       controls elsewhere read 12-30 px);
     - every shaped stigma DIFFERS from the trifid at rest on some view by
       more than ten times that view's own control (or this sheet is
       photographing one shape repeatedly);
     - the 3.00 cell and the thin-sheet 1.65 cell report PINCH CLAMPED
       and the 1.65 / 1.00 / 0.60 / 0.35 cells on the default sheet do not —
       the derivation's floor claims, measured on the tree rather than in a
       script;
     - the INERT row's triangle count and STIGMA line are the trifid's,
       character for character, and its macro difference is inside the run's
       largest macro control plus the two rows' own;
     - JS0-JS7 and JG0-JG6 run before every shutter.

   WHAT THIS SHEET IS NOT: a byte instrument (0 moved is diff-bloom-bytes
   against frozen/phase19), or a print instrument (the 0.50 mm floor is
   MIN_FEATURE_MM / 2, UNMEASURED — no coupon has been printed).

   RUN:  node tools/shot-bloom-stigma.mjs <out-dir> [base-tree] [--quick|--ruling]
         --quick runs two cells and the pair, for debugging the instrument
         (the charter's "two rows, not the grid").
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf, fullStateDrift, stillFrame, settleBuild, modeTag, shownModeOf, CONTROLS,
         stamenAssertions, gynoeciumAssertions } from './bloom-harness.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const QUICK = process.argv.includes('--quick');
const outDir = args[0] || '/tmp/bloom-stigma';
const BASE_ROOT = args[1] || null;
fs.mkdirSync(outDir, { recursive: true });
const { server, port } = await serveRepo();
const base = BASE_ROOT && fs.existsSync(path.join(BASE_ROOT, 'bloom.html')) ? await serveRepo(BASE_ROOT) : null;
const baseKinds = base ? await kindsOf(BASE_ROOT) : null;
if (BASE_ROOT && !base) { console.error(`HARNESS INVALID: base tree named as ${BASE_ROOT} and there is no bloom.html there. A missing base is not a cell to skip.`); process.exit(2); }
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
  /* THE DRIFT CHECK IS AGAINST THE TREE BEING DRIVEN (the anther sheet's
     rule): the base predates the stigma's seven, so exactly the ids it does
     not declare may be dropped from a BASE cell's drift, and nothing else. */
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
  if (!m0.styles.length) await die(`${label}: no style emitted — every cell on this sheet is about a stigma`);
  /* THE ASSERTIONS BEFORE THE SHUTTER — on the HEAD tree; the base tree's
     harness is not this one and is not asked. */
  if (!onBase) {
    const fails = [...await stamenAssertions(page, { label }), ...await gynoeciumAssertions(page, { label })];
    if (fails.length) await die(`${label}: ${fails.join('; ')}`);
  }
  const G = m0.gynoecium, lobe = G.lobe;
  /* THE MACRO FRAME COMES FROM THE STIGMA'S OWN EXTENT — the lobes' reach
     across the spread plus a lobe's width, centred half a lobe's height
     above the style's tip, so a 7.20 mm lobe and a 1.92 mm one are both
     legible and the caption carries the scale. Measured before this was
     written: framing from the tip at 1.3x the sum put the default trifid at
     a 10 mm radius, WIDER than the 8 mm lens, and the two views coincided. */
  const st = m0.styles[0], Dd = st.dir, half = (lobe.length * Math.cos(lobe.spreadRad)) / 2;
  const macro = Math.max(1.6, 0.55 * (lobe.length * (1 + Math.sin(lobe.spreadRad)) + lobe.diameter));
  const own = { fit: m0.fitRadius, centre: [st.tip[0] + Dd[0] * half, st.tip[1] + Dd[1] * half, st.tip[2] + Dd[2] * half], macro };
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
  const stigmaLine = readout.split('\n').find((l) => /^STIGMA /.test(l)) || '';
  const styleLine = readout.split('\n').find((l) => /^STYLE /.test(l)) || '';
  const antherLine = readout.split('\n').find((l) => /^ANTHER /.test(l)) || '';
  console.log(`  ${label.padEnd(72)} ${onBase ? 'BASE ' : 'HEAD '} tris ${m.shownTris} · ${m.gynoecium.lobe.sides ?? '?'} sides · ${modeTag(m)}`);
  return { label, onBase, tag: modeTag(m), shots, own, shownTris: m.shownTris, stigmaLine, styleLine, antherLine, lobe: m.gynoecium.lobe, exportLobe: m.gynoecium.lobe };
}

/* THE ROWS. `sets` is on top of a style with six stamens unless it says
   otherwise; `hold` names the exact claim a row carries. */
const STYLE6 = { gynoecium: 'STYLE', stamenCount: 6 };
const GROUPS = [
  { key: 'today', name: 'THE TRIFID AT REST — today’s stigma, and the pinch default is INERT here (roundedness 1)', rows: [
    { key: 'rest6', name: 'the trifid at rest, six stamens — the REFERENCE for every row below', sets: STYLE6, hold: 'reference' },
    { key: 'rest120', name: 'the trifid at rest, 120 on the disc', sets: { gynoecium: 'STYLE', stamenCount: 120, stamenLayout: 'DISC' }, hold: 'reference120' },
  ] },
  { key: 'opened', name: 'THE PINCH OPENED — roundedness 0 at the default 1.00, against the nearest reachable to the circle, at both count extremes', rows: [
    { key: 'open6', name: 'roundedness 0, pinch 1.00 (the default — the polygon), 4 points — six stamens', sets: { ...STYLE6, stigmaRoundedness: 0 } },
    { key: 'open120', name: 'roundedness 0, pinch 1.00, 4 points — 120 on the disc', sets: { gynoecium: 'STYLE', stamenCount: 120, stamenLayout: 'DISC', stigmaRoundedness: 0 }, ref: 'rest120' },
    { key: 'near6', name: 'the NEAREST REACHABLE TO THE CIRCLE — roundedness 0 at pinch 0.05 (every factor 0.983 on 16 sides; the singular exponent is one step below and off the travel)', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 0.05 } },
  ] },
  { key: 'either', name: 'THE SPACE EITHER SIDE OF 1.00 — roundedness 0, print preview, the 0.50 mm waist floor (a CAP on the pinch)', rows: [
    { key: 'k300', name: 'pinch 3.00 — UNDER the 0.50 mm waist floor (0.339 mm asked): CLAMPED to 1.88, told', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 3 }, hold: 'clamped' },
    { key: 'k165', name: 'pinch 1.65 — 8% headroom on this sheet (and CLAMPED on a sheet the export floors to 1.00 mm)', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 1.65 }, hold: 'clear' },
    { key: 'k100', name: 'pinch 1.00 — the default (36% headroom; 13% on the thinnest printable sheet)', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 1 }, hold: 'clear' },
    { key: 'k060', name: 'pinch 0.60 (56% headroom) — a rounded polygon', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 0.6 }, hold: 'clear' },
    { key: 'k035', name: 'pinch 0.35 (70% headroom)', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 0.35 }, hold: 'clear' },
    { key: 'thin165', name: 'the THIN-SHEET corner — sheet 0.60, which the export floors to 1.00 mm: pinch 1.65 CLAMPS here (0.452 mm asked)', sets: { ...STYLE6, sheetThickness: 0.6, stigmaRoundedness: 0, stigmaPinch: 1.65 }, hold: 'clamped' },
  ] },
  { key: 'pair', name: 'THE PAIR — anther and stigma from one table, side by side in the lens view', rows: [
    { key: 'pairstars', name: 'the SAME seven on both tips: 3-point polygons at pinch 1, roundedness 0 — six anthers around the trifid', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPoints: 3, stigmaPinch: 1, antherRoundedness: 0, antherPoints: 3, antherPinch: 1 } },
    { key: 'pairpill', name: 'ONE lobe at 0° on the style — a pill, the anther’s own default shape, beside six pills', sets: { ...STYLE6, stigmaLumps: 1, stigmaSpread: 0 } },
    { key: 'pairsix', name: 'SIX lobes at 90° on the style — the widest fan, beside six pills', sets: { ...STYLE6, stigmaLumps: 6, stigmaSpread: 90 } },
    { key: 'pairtrifid', name: 'TRIFID ANTHERS — 3 lobes at 40° on every filament, the stigma’s own law on the other tip', sets: { ...STYLE6, antherLumps: 3, antherSpread: 40 } },
  ] },
  { key: 'inert', name: 'THE INERT ROW', rows: [
    { key: 'inert', name: 'INERT — 12 points at pinch 7.00 with roundedness 1: the trifid’s triangle count and STIGMA line, character for character', sets: { ...STYLE6, stigmaPoints: 12, stigmaPinch: 7 }, hold: 'identical' },
  ] },
];
/* --ruling (session 31): the four positions of the proposed pinch travel —
   star, polygon, rounded polygon, the nearest reachable to the circle — plus
   the singular point itself, at size 3.00 (a 1.80 mm lobe radius, so the
   star at pinch 3.00 clears the 0.50 mm waist floor rather than clamping to
   it). Shot on TODAY'S control, so each cell carries the old exponent it was
   driven at and the pinch it would map to; a ruling row is shot with its own
   control and is NOT compared against the trifid at rest. */
const RULING = process.argv.includes('--ruling');
if (RULING) { GROUPS.splice(1); GROUPS[0].rows.splice(1); GROUPS.push({ key: 'ruling', name: 'SESSION 31 RULING CELLS — where star, polygon, rounded polygon and the circle land on the pinch travel (size 3.00, roundedness 0, 4 points; the exponent s = 2 / (1 + k) beside each pinch)', rows: [
  { key: 'star', name: 'STAR — pinch 3.00 (s 0.50): waist 35% of the point radius', sets: { ...STYLE6, stigmaSize: 3, stigmaRoundedness: 0, stigmaPinch: 3 }, hold: 'ruling' },
  { key: 'polygon', name: 'POLYGON — pinch 1.00 (s 1.00), the default: waist 71%', sets: { ...STYLE6, stigmaSize: 3, stigmaRoundedness: 0, stigmaPinch: 1 }, hold: 'ruling' },
  { key: 'rounded', name: 'ROUNDED POLYGON — pinch 0.60 (s 1.25): waist 81%', sets: { ...STYLE6, stigmaSize: 3, stigmaRoundedness: 0, stigmaPinch: 0.6 }, hold: 'ruling' },
  { key: 'nearcircle', name: 'THE NEAREST REACHABLE TO THE CIRCLE — pinch 0.05 (s 1.905): waist 98%. The singular exponent (s 2.00, every factor exactly 1) sits one step below and is UNREACHABLE — the ruling’s fifth cell was shot on the base tree and cannot be shot here', sets: { ...STYLE6, stigmaSize: 3, stigmaRoundedness: 0, stigmaPinch: 0.05 }, hold: 'ruling' },
] }); }
if (QUICK) { GROUPS.splice(1); GROUPS[0].rows.splice(1); GROUPS.push({ key: 'either', name: 'QUICK — the two clamped cells', rows: [{ key: 'k300', name: 'pinch 3.00', sets: { ...STYLE6, stigmaRoundedness: 0, stigmaPinch: 3 }, hold: 'clamped' }, { key: 'thin165', name: 'thin sheet, 1.65', sets: { ...STYLE6, sheetThickness: 0.6, stigmaRoundedness: 0, stigmaPinch: 1.65 }, hold: 'clamped' }] }); }

console.log(`THE STIGMA SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, JS0-JS7 and JG0-JG6 before every shutter.${QUICK ? ' (--quick)' : ''}\n`);
const cells = [];
const refs = {};
for (const g of GROUPS) {
  for (const r of g.rows) {
    const sets = set(r.sets);
    const main = await cell({ label: `${g.key} ${r.key}`, sets });
    const again = await cell({ label: `${g.key} ${r.key} CONTROL`, sets, frames: main.own });
    const twice = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, main.shots[v].file), path.join(outDir, again.shots[v].file))]));
    let vs = null;
    if (r.hold === 'reference' || r.hold === 'reference120') { refs[r.key] = main; main.twice = twice; }
    else if (r.hold === 'ruling') { /* its own control only — see --ruling */ }
    else {
      const ref = refs[r.ref || 'rest6'];
      if (!ref) await die(`${r.key}: its reference ${r.ref || 'rest6'} has not been shot — the trifid at rest is what every other cell is measured against`);
      const same = await cell({ label: `${g.key} ${r.key} vs rest`, sets, frames: ref.own });
      vs = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, ref.shots[v].file), path.join(outDir, same.shots[v].file))]));
      const bar = (v) => Math.max(10 * ((twice[v] && twice[v].pixels) || 0), 100);
      const moved = VIEWS.some((v) => vs[v] && vs[v].pixels > bar(v));
      if (r.hold === 'identical') {
        if (main.shownTris !== ref.shownTris) await die(`${r.key}: ${main.shownTris} triangles against the trifid's ${ref.shownTris} — hidden is not inert`);
        if (main.stigmaLine !== ref.stigmaLine) await die(`${r.key}: the STIGMA line is not the trifid's, character for character\n    trifid ${ref.stigmaLine}\n    inert  ${main.stigmaLine}`);
        /* THE FLOOR IS THE RUN'S OWN OBSERVED MACRO NOISE plus both rows'
           controls — not the two controls alone. Measured on this sheet's
           second full run: the INERT row read 15 px on macro against two
           controls summing to 0, while eight other rows' macro controls in
           the same run read 13-30 px. A single sample (or two) is not a
           floor; the two EXACT claims above are what carry this row. */
        const runMacroNoise = Math.max(0, ...cells.map((x) => (x.twice.macro && x.twice.macro.pixels) || 0));
        const floor = (v) => runMacroNoise + ((twice[v] && twice[v].pixels) || 0) + ((ref.twice[v] && ref.twice[v].pixels) || 0);
        if (!vs.macro || vs.macro.pixels > floor('macro')) await die(`${r.key}: PREDECLARED WITHIN THE RENDERER'S OWN NOISE on the macro view and it differs by ${vs.macro ? vs.macro.pixels : 'a different frame size'} px against a floor of ${floor('macro')} px (this run's largest macro control ${runMacroNoise} px plus the two rows' own) — the two hidden outline controls are reaching the geometry`);
      } else if (!moved) {
        await die(`${r.key}: PREDECLARED TO DIFFER from the trifid at rest and no view moved past its own renderer control — ${VIEWS.map((v) => `${v} ${vs[v].pixels}px vs control ${twice[v].pixels}px`).join(', ')}; this sheet is photographing one shape twice`);
      }
      if (r.hold === 'clamped' && !/PINCH CLAMPED to/.test(main.stigmaLine)) await die(`${r.key}: predeclared to be CLAMPED at the waist floor in export mode and the STIGMA line does not say so: ${main.stigmaLine}`);
      if (r.hold === 'clear' && /CLAMPED|UNDER IT/.test(main.stigmaLine)) await die(`${r.key}: predeclared CLEAR of the waist floor in export mode and the STIGMA line says otherwise: ${main.stigmaLine}`);
    }
    cells.push({ group: g, row: r, main, twice, vs });
    console.log(`   -> ${g.key}/${r.key}: control ${VIEWS.map((v) => `${v} ${twice[v].pixels}px`).join(' ')}${vs ? ` · vs rest ${VIEWS.map((v) => `${v} ${vs[v].pixels}px`).join(' ')}` : ' (a reference)'}\n`);
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const VIEWNAME = { whole: 'the whole bloom — the stigma at its ACTUAL size', lens: 'the centre at hand-lens scale (16 mm across) — the pair', macro: 'the stigma, framed from its own lobes' };
const fig = (c, view) => { const s = c.shots[view]; return `<figure><img src="${s.file}"><figcaption><b>${esc(VIEWNAME[view])}</b><br>${s.mmPerPx.toFixed(4)} mm per pixel · settled after ${s.settledAt + 1} frames</figcaption></figure>`; };
const dline = (d, t) => d === null ? 'frames differ in size — not comparable'
  : `${d.pixels.toLocaleString()} px (worst channel step ${d.worst}) against this row’s own renderer control of ${t.pixels.toLocaleString()} px (worst ${t.worst})`
    + (d.pixels <= 10 * t.pixels ? ' &mdash; <b>AT OR BELOW THE NOISE: not a visible difference at this scale</b>' : '');

let migration = null;
function writeSheet() {
const html = `<title>The stigma's seven — the trifid on the pinch, and the pair</title>
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
<h1>The stigma&rsquo;s seven &mdash; the trifid on the pinch, and the pair</h1>
<p>Session 30, re-based on the PINCH in session 31. Seven controls under <code>Gynoecium &rsaquo; Stigma</code>, INSTANCED from the anther&rsquo;s seven through
one descriptor table &mdash; the generator Eva&rsquo;s Q7 asked for. <b>The defaults reproduce today&rsquo;s trifid exactly</b>,
by construction: size and elongation are the two constants, the count and the aim are the trifid&rsquo;s own 3 at 40&deg;,
roundedness 1 makes the blend exactly 1 and the lattice the rod&rsquo;s own ten &mdash; so the pinch default of 1.00 is
<b>inert at rest</b>, and the first group shows a stigma that has not moved. Every cell is print
preview ON, chrome hidden, auto-rotate off; JS0&ndash;JS7 and JG0&ndash;JG6 ran before every shutter.</p>
<p><b>The slider carries the PINCH <code>k</code> and the geometry forms the exponent <code>s = 2 / (1 + k)</code> in one place</b> (session 31, Eva&rsquo;s ruling;
<code>stigmaSharpness</code> is retired). 1.00 is the polygon, below 1 a rounded polygon, above 1 a star, and the waist is
<code>2<sup>&minus;k/2</sup></code> of the point radius. The circle&rsquo;s own exponent (k = 0, where every factor is exactly 1 for every
roundedness) sits one step BELOW the minimum and is unreachable: roundedness 1 is the only producer of the circle. The second group
puts the default beside the nearest reachable cell, pinch 0.05.</p>
<p><b>The floor binds at the same pinch on both tips because a lobe is the anther&rsquo;s size:</b> <code>stigmaSize &times; one sheet</code>
exactly as <code>antherSize &times; one sheet</code> &mdash; 0.96 mm of radius on the default 1.20 mm sheet in both modes &mdash; so the 0.50 mm waist
floor CAPS the pinch at <b>1.88</b> at roundedness 0. 3.00 clamps; 1.65 clears by 8%; 1.00 by 36%. On the thinnest sheets the export floor
raises the rod to 1.00 mm (a lobe radius of 0.80 mm) and the cap moves to <b>1.36</b>, where 1.65 clamps and 1.00 still clears by 13%
&mdash; which is why 1.00 is the largest named value that never meets the floor on any printable sheet. The third group is that space,
on the print preview.</p>
<p><b>Every row carries its own same-tree renderer control</b> &mdash; the same tree, the same camera, shot twice &mdash; and every
frame is settled until two consecutive screenshots are byte-identical. <b>No pixel claim is made on <code>whole</code> or
<code>lens</code>:</b> the control there is bimodal (0&ndash;52 px, or ~10,500 px), so those figures are reported beside their
controls and the pair is what to read. What is asserted: the before/after pair holds on triangle count, on the STYLE
line and on <code>macro</code> inside its controls; every shaped stigma differs from the trifid at rest past ten times its
own control on some view; 3.00 and the thin-sheet 1.65 say CLAMPED and 1.65 / 1.00 / 0.60 / 0.35 on the default sheet do not; the INERT row&rsquo;s count and STIGMA
line are the trifid&rsquo;s character for character. The partition is <code>tools/diff-bloom-bytes.mjs</code> against
<code>frozen/phase20</code>&rsquo;s job, not this sheet&rsquo;s.</p>
${migration ? `
<h2>Before and after &mdash; the trifid at rest on the base commit and on this tree, one camera</h2>
<p>The old code from a git worktree of the base commit beside today&rsquo;s. Predeclared to <b>hold</b>, and it does on the two claims that carry it: <b>the same triangle count (${migration.before.shownTris.toLocaleString()}) and the same numbers on the STYLE line</b>. Pixels, reported: ${VIEWS.map((v) => `${v} ${dline(migration.diffs[v], migration.twice[v])}`).join('; ')}; the AFTER side&rsquo;s own control read ${VIEWS.map((v) => `${v} ${migration.twiceAfter[v].pixels} px`).join(', ')}. The <code>macro</code> bound is against this run&rsquo;s largest macro control anywhere on the sheet (${migration.runMacroNoise} px) plus the pair&rsquo;s own two &mdash; ${migration.floor} px &mdash; because a single control sample is not a floor. A picture cannot prove byte identity; the bytes are the phase20 partition&rsquo;s.</p>
<h3>BEFORE (the base tree)</h3><div class="row">${VIEWS.map((v) => fig(migration.before, v)).join('')}</div>
<h3>AFTER (this tree)</h3><div class="row">${VIEWS.map((v) => fig(migration.after, v)).join('')}</div>
` : ''}
${GROUPS.map((g) => `
<h2>${esc(g.name)}</h2>
${cells.filter((x) => x.group.key === g.key).map((x) => `
<h3>${esc(x.row.name)}</h3>
<p class="said">${esc(x.main.stigmaLine)}</p>
${x.main.antherLine ? `<p class="said">${esc(x.main.antherLine)}</p>` : ''}
<p class="num">${x.main.shownTris.toLocaleString()} triangles (export) &middot; ${x.main.lobe.sides} sides &middot;
 renderer control ${VIEWS.map((v) => `${v} ${x.twice[v] ? x.twice[v].pixels : '?'} px`).join(' &middot; ')}
 ${x.vs ? `<br>against the trifid at rest: ${VIEWS.map((v) => `${v} ${dline(x.vs[v], x.twice[v])}`).join('<br>')}` : '<br><b>a reference cell</b>'}</p>
<div class="row">${VIEWS.map((v) => fig(x.main, v)).join('')}</div>
`).join('')}`).join('')}
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
}
writeSheet();

/* THE BEFORE/AFTER PAIR, when a base tree is given: the trifid at rest on the
   old code beside the new, predeclared to HOLD — the visual half of a claim
   the byte instrument owns. */
if (base) {
  const sets = set(STYLE6);
  const before = await cell({ label: 'migration BEFORE', sets, onBase: true });
  const ctrl = await cell({ label: 'migration BEFORE CONTROL', sets, onBase: true, frames: before.own });
  const twice = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, ctrl.shots[v].file))]));
  const after = await cell({ label: 'migration AFTER', sets, frames: before.own });
  const afterCtrl = await cell({ label: 'migration AFTER CONTROL', sets, frames: before.own });
  const twiceAfter = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, after.shots[v].file), path.join(outDir, afterCtrl.shots[v].file))]));
  const diffs = Object.fromEntries(VIEWS.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, after.shots[v].file))]));
  if (before.shownTris !== after.shownTris) await die(`the migration pair moved triangles: BEFORE ${before.shownTris}, AFTER ${after.shownTris}`);
  /* THE STYLE LINE'S NUMBERS, not its words: the base tree says "stigma
     TRIFID: 3 lobes 1.60 × 4.00 mm at 40°" and this one adds a clause, so
     the millimetres and the degrees are compared, an identity on each. */
  const nums = (l) => (l.replace(' (its own line below)', '').match(/-?\d+(\.\d+)?/g) || []).join(',');
  if (nums(before.styleLine) !== nums(after.styleLine)) await die(`the STYLE line's numbers moved across the migration:\n    BEFORE ${before.styleLine}\n    AFTER  ${after.styleLine}`);
  /* THE MACRO BOUND IS AGAINST THE RUN'S OWN OBSERVED NOISE, not one sample.
     Measured on the first full run: the pair read 15 px on macro against a
     BEFORE control of 0 px, while seven of the grid's sixteen rows had macro
     controls of 12-30 px in the same run — a single control sample is not a
     floor (the charter's rule, and session 29's "the macro control read 0 on
     every row" was an observation, never a guarantee). So the floor here is
     the largest macro control this run produced anywhere, plus both sides'
     own controls; the two IDENTITIES above (triangle count, the STYLE line's
     numbers) are what carry the claim, and the bytes are phase19's. */
  const runMacroNoise = Math.max(0, ...cells.map((x) => (x.twice.macro && x.twice.macro.pixels) || 0));
  const floor = runMacroNoise + ((twice.macro && twice.macro.pixels) || 0) + ((twiceAfter.macro && twiceAfter.macro.pixels) || 0);
  if (!diffs.macro || diffs.macro.pixels > floor) await die(`the trifid at rest is PREDECLARED TO HOLD across the migration and its macro view moved ${diffs.macro ? diffs.macro.pixels : 'to a different frame size'} px against a floor of ${floor} px (this run's largest macro control ${runMacroNoise} px plus the pair's own two controls)`);
  migration = { before, after, twice, twiceAfter, diffs, floor, runMacroNoise };
  console.log(`   -> migration: HELD · ${VIEWS.map((v) => `${v} ${diffs[v].pixels} px vs control ${twice[v].pixels} px`).join(' · ')}\n`);
}

writeSheet();
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); if (base) base.server.close();
