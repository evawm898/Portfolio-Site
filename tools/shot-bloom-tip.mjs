/* ===================================================================
   THE TIP SHEET (session 26) — the anther unchanged, the trifid moved.
   Merge is released by Eva's ruling on it.

   THE QUESTION IT EXISTS TO ANSWER, in her words: whether 0.047 mm of
   surface is visible. Session 24's ruling Q2 took RODRIGUES AND NO GUARD on
   the grounds that a slider which jumps is a defect a user meets and a
   predeclared partition is an accounting entry — so the whole argument rests
   on the trifid's move being invisible at the size the thing ships. That is
   an aesthetic judgement and it is Eva's, but it should be made in front of a
   picture with a SCALE on it rather than a picture alone.

   SO EVERY CELL CARRIES ITS OWN mm PER PIXEL, and every pair carries a
   measured PIXEL DIFFERENCE — how many pixels changed and by how much. `Is
   it visible` stops being a question about eyesight and becomes a number
   beside the picture; the ruling is still Eva's, and the numbers are what
   she rules on.

   WHAT IT SHOOTS. Five rows, each a BEFORE / AFTER pair rendered from a git
   worktree of the base commit — a superseded law is photographed, never only
   recorded (the per-petal sheet's pattern):
     (A) 6 stamens on a RING          — THE ANTHER, which must not move. The
                                        pair must come back PIXEL-IDENTICAL.
     (B) 120 on the DISC x rise 0.5   — the anther again, on a cap, at the
                                        count ceiling. Also pixel-identical.
     (C) a style on the bare apex     — THE TRIFID, at the shipping sheet of
                                        1.20 mm. Three framings: the whole
                                        bloom, the centre at hand-lens scale,
                                        and the stigma magnified.
     (D) a style x sheet 2.40         — THE WORST CASE. The deviation is the
                                        emitted polygon's sagitta, which is
                                        proportional to the tip radius and so
                                        to the sheet: twice the sheet is twice
                                        the move.
     (E) the bare bloom               — THE CONTROL. Nothing about a bloom
                                        with no centre may move, and a sheet
                                        of only movers cannot show that
                                        something held.

   AND A RENDERER CONTROL, because `0 pixels differ` is worth nothing if the
   renderer is not deterministic to begin with: row (A) is additionally shot
   TWICE ON THE BASE TREE, and that pair's pixel difference is reported
   beside the real one. Run the same tree twice before concluding anything
   about two trees.

   WHAT THE SHEET ASSERTS from the two trees' own numbers rather than from a
   caption: identical triangle counts on every pair (the tip primitive moves
   no triangle and adds none); an identical STYLE read-out line on the trifid
   rows (the stigma stands where it stood); the anther and control pairs
   pixel-identical; and the trifid pairs NOT pixel-identical, which is the
   vacuity guard — a sheet whose before and after agree everywhere is a sheet
   photographing one tree twice.

   The deviation numbers in the captions come from tools/verify-bloom-tip-
   bytes.mjs, imported rather than restated, so the sheet and the rig quote
   one computation.

   Every cell is the PRINT PREVIEW (the export-floored geometry, read back
   from the app's own shownMode), chrome hidden and auto-rotate off through
   the asserted stillFrame(), whole state read back, one camera per pair
   sized from the BEFORE cell's live geometry.

   RUN:  node tools/shot-bloom-tip.mjs <out-dir> [base-tree]
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePNG } from './pngdec.mjs';
import { serveRepo, launchPage, openBloom, applyConfig, kindsOf, fullStateDrift, stillFrame, settleBuild, modeTag, shownModeOf, ROOT } from './bloom-harness.mjs';
import { build, deviation } from './verify-bloom-tip-bytes.mjs';

const outDir = process.argv[2] || '/tmp/bloom-tip';
const BASE_ROOT = process.argv[3] || '/tmp/base-main';
fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(path.join(BASE_ROOT, 'bloom.html'))) {
  console.error(`HARNESS INVALID: no base tree at ${BASE_ROOT} — this sheet IS the before/after pair, so a missing base is not a cell to skip. Create it with: git worktree add ${BASE_ROOT} 2fee2c2`);
  process.exit(2);
}
const { server, port } = await serveRepo();
const base = await serveRepo(BASE_ROOT);
const baseKinds = await kindsOf(BASE_ROOT);
const NEWG = await import(pathToFileURL(path.join(ROOT, 'bloom-geometry.js')).href);
const OLDG = await import(pathToFileURL(path.join(path.resolve(BASE_ROOT), 'bloom-geometry.js')).href);
const { DEFAULTS } = await import(pathToFileURL(path.join(ROOT, 'bloom-registry.js')).href);
const VIEW = 800, DPR = 2;
const { browser, page } = await launchPage({ viewport: { width: VIEW, height: VIEW }, deviceScaleFactor: DPR });
function die(msg) { console.error('HARNESS INVALID: ' + msg); return browser.close().then(() => { server.close(); base.server.close(); process.exit(2); }); }
const set = (o) => Object.entries(o).map(([id, value]) => ({ id, value: String(value) }));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

async function setPreview(on) {
  await page.evaluate((v) => { const el = document.getElementById('printPreview'); el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, on);
  await settleBuild(page);
  await page.waitForTimeout(120);
  const got = await shownModeOf(page);
  if (got !== (on ? 'export' : 'live')) await die(`print preview ${on ? 'ON' : 'OFF'} asked for, app reports shownMode "${got}"`);
}

/* A cell records its own SCALE: the frame radius is half the visible extent,
   so mm per pixel is 2r / (VIEW * DPR) and 0.047 mm is that many pixels. A
   caption that says `magnified` without saying by how much is decoration.

   AND IT WAITS ON THE REAL SIGNAL, NOT A FIXED SLEEP. Measured on the first
   run of this sheet: with a 260 ms wait, THE SAME TREE SHOT TWICE differed by
   4,925-7,426 pixels at worst channel steps of 82-88, spread over the whole
   frame — the orbit damping still easing, whose half-life is seconds at the
   ~2 fps software GL gives headless. That is the flower project's own
   recorded lesson ("the camera did not move" is not observable here) arriving
   again, and it made a pixel-identity assertion impossible to state. So the
   frame is screenshotted repeatedly until TWO CONSECUTIVE SHOTS ARE
   BYTE-IDENTICAL, which is the convergence criterion the question actually
   needs; a view that never settles fails the run rather than being sampled. */
async function shoot(file, frame) {
  await page.evaluate((a) => (a.at ? window.__bloomFrame(a.r, 0, a.at, a.dir, a.up || null) : window.__bloomFrame(a.r, 0.15)), frame);
  const clip = { x: 0, y: 0, width: VIEW, height: VIEW };
  let prev = null, buf = null, settledAt = -1;
  for (let k = 0; k < 60; k++) {
    await page.waitForTimeout(100);
    buf = await page.screenshot({ clip });
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

/* THE PIXEL DIFFERENCE — the visibility measurement. Two numbers, because
   they answer different questions: how MUCH of the frame changed, and how
   FAR the worst pixel changed. A move that shifts a thousand pixels by one
   level of grey and one that shifts ten pixels from black to white are both
   `some pixels differ`. */
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

async function cell({ label, sets, onBase, frames, views }) {
  await openBloom(page, onBase ? base.port : port);
  const bad = await applyConfig(page, sets, onBase ? baseKinds : null);
  if (bad.length) await die(`${label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, sets);
  if (drift.length) await die(`${label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const bad0 = await stillFrame(page);
  if (bad0.length) await die(`${label}: ${bad0.join('; ')}`);
  const m0 = await page.evaluate(() => window.__bloomMetrics());
  if (m0.shownMode !== 'live') await die(`${label}: the frame was about to be sized from a ${m0.shownMode} build`);
  const centre = m0.styles.length ? m0.styles[0].tip : (m0.stamens.length ? m0.stamens[0].apex : [0, 0, 0]);
  const own = { fit: m0.fitRadius, centre, hub: m0.hubRadius };
  const fr = frames || own;
  await setPreview(true);
  const m = await page.evaluate(() => window.__bloomMetrics());
  const readout = await page.evaluate(() => document.getElementById('readout').textContent);
  const dir = [0.45, -0.78, 0.44];
  const F = {
    whole: { r: fr.fit },
    lens: { r: 8, at: fr.centre, dir, up: [0, 0, 1] },
    macro: { r: 2.6, at: fr.centre, dir, up: [0, 0, 1] },
    tip: { r: 4.5, at: fr.centre, dir, up: [0, 0, 1] },
  };
  const shots = {};
  for (const v of views) shots[v] = await shoot(path.join(outDir, `${slug(label)}-${v}.png`), F[v]);
  await setPreview(false);
  const styleLine = readout.split('\n').find((l) => /^STYLE /.test(l)) || '';
  const stamenLine = readout.split('\n').find((l) => /^STAMENS /.test(l)) || '';
  console.log(`  ${label.padEnd(64)} ${onBase ? 'BASE ' : 'HEAD '} tris ${m.shownTris} · ${modeTag(m)}`);
  return { label, onBase, tag: modeTag(m), shots, own, shownTris: m.shownTris, styleLine, stamenLine, lobes: m.styles.length ? m.styles[0].lobes.length : 0 };
}

console.log('THE TIP SHEET — every cell PRINT PREVIEW ON, chrome hidden, auto-rotate off, asserted.\n');
const ROWS = [
  { key: 'anther-ring', name: '6 stamens on a RING — THE ANTHER, which must not move', sets: set({ stamenCount: 6 }), views: ['whole', 'lens', 'macro'], hold: true, control: true },
  { key: 'anther-disc', name: '120 on the DISC x Head rise 0.5 — the anther on a cap, at the count ceiling', sets: set({ stamenCount: 120, stamenLayout: 'DISC', headRise: 0.5 }), views: ['whole', 'lens'], hold: true },
  { key: 'trifid', name: 'a style on the bare apex — THE TRIFID at the shipping 1.20 mm sheet', sets: set({ gynoecium: 'STYLE' }), views: ['whole', 'lens', 'macro'], hold: false },
  { key: 'trifid-fat', name: 'a style x sheet 2.40 — THE WORST CASE: the sagitta scales with the tip radius', sets: set({ gynoecium: 'STYLE', sheetThickness: 2.4 }), views: ['whole', 'tip', 'macro'], hold: false },
  { key: 'bare', name: 'the bare bloom — THE CONTROL: no centre, nothing to move', sets: [], views: ['whole'], hold: true },
];

const pairs = [];
for (const row of ROWS) {
  const before = await cell({ label: `BEFORE — ${row.name}`, sets: row.sets, onBase: true, views: row.views });
  let twice = null;
  if (row.control) {
    const again = await cell({ label: `CONTROL — ${row.name} (the base tree, shot twice)`, sets: row.sets, onBase: true, frames: before.own, views: row.views });
    twice = Object.fromEntries(row.views.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, again.shots[v].file))]));
  }
  const after = await cell({ label: `AFTER — ${row.name}`, sets: row.sets, onBase: false, frames: before.own, views: row.views });
  if (before.shownTris !== after.shownTris) await die(`${row.name}: BEFORE ${before.shownTris} tris, AFTER ${after.shownTris} — the tip primitive moves no triangle and adds none`);
  if (before.styleLine !== after.styleLine) await die(`${row.name}: the STYLE read-out moved\n    BEFORE ${before.styleLine}\n    AFTER  ${after.styleLine}`);
  if (before.stamenLine !== after.stamenLine) await die(`${row.name}: the STAMENS read-out moved\n    BEFORE ${before.stamenLine}\n    AFTER  ${after.stamenLine}`);
  const diffs = Object.fromEntries(row.views.map((v) => [v, pixelDiff(path.join(outDir, before.shots[v].file), path.join(outDir, after.shots[v].file))]));
  const anyMoved = Object.values(diffs).some((d) => d && d.pixels > 0);
  if (row.hold && anyMoved) await die(`${row.name}: PREDECLARED TO HOLD and the render moved — ${Object.entries(diffs).map(([v, d]) => `${v} ${d.pixels}px`).join(', ')}`);
  if (!row.hold && !anyMoved) await die(`${row.name}: PREDECLARED TO MOVE and every view is pixel-identical — this sheet is photographing one tree twice`);
  /* The measured surface deviation, from the rig, for this row's own state. */
  const st = { ...DEFAULTS, ...Object.fromEntries(row.sets.map((kv) => [kv.id, isNaN(Number(kv.value)) ? kv.value : Number(kv.value)])) };
  const dev = deviation(build(OLDG, st, true), build(NEWG, st, true));
  pairs.push({ row, before, after, diffs, twice, dev });
  console.log(`   -> ${row.hold ? 'HELD' : 'MOVED'}: ${Object.entries(diffs).map(([v, d]) => `${v} ${d.pixels} px (worst level ${d.worst})`).join(' · ')}${dev ? ` · surface deviation ${dev.surfaceMax.toFixed(4)} mm` : ''}\n`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const VIEWNAME = { whole: 'the whole bloom', lens: 'the centre at hand-lens scale (16 mm across)', macro: 'the stigma magnified (5.2 mm across)', tip: 'the stigma (9 mm across)' };
const fig = (c, view, dev) => {
  const s = c.shots[view];
  const px = dev ? dev / s.mmPerPx : null;
  return `<figure class="${c.onBase ? 'base' : 'head'}"><img src="${s.file}"><figcaption><b>${esc(c.onBase ? 'BEFORE — 2fee2c2, the pill' : 'AFTER — the tip primitive')}</b> <i>(${VIEWNAME[view]})</i><br><small>${s.mmPerPx.toFixed(5)} mm per pixel${px !== null ? ` — <b>0.047 mm is ${px.toFixed(1)} px here</b>` : ''}</small><br><small>${esc(c.tag)} · ${Number(c.shownTris).toLocaleString('en-US')} tris (print preview)</small></figcaption></figure>`;
};
const diffLine = (d, twice) => d === null ? 'frames differ in size — not comparable' :
  `<b>${d.pixels.toLocaleString('en-US')} pixels differ</b> (${(d.frac * 100).toFixed(3)}% of the frame), worst channel step <b>${d.worst}</b> of 255${twice ? ` · <span class="ctl">renderer control, the same tree shot twice: ${twice.pixels} px</span>` : ''}`;
const html = `<title>The tip primitive — the anther unchanged, the trifid moved</title>
<style>body{background:#0c0f0e;color:#dfe9e3;font:14px/1.55 system-ui,sans-serif;margin:24px}
h1{font-size:22px;margin:0 0 6px}h2{font-size:17px;margin:30px 0 4px}h3{font-size:14px;margin:16px 0 2px;color:#9fb3a9;font-weight:600}
p.note{color:#9fb3a9;max-width:112ch}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:10px}
figure{margin:0}img{width:100%;border:1px solid #26302b;border-radius:6px;background:#0c0f0e}figure.base img{border-color:#6b4b2a}
figcaption{margin-top:8px}small{color:#7f948a;display:block}.ctl{color:#6b8a7a}
p.diff{margin:6px 0 0;font-family:ui-monospace,monospace;font-size:12px;color:#c9d8d0}
p.ro{font-family:ui-monospace,monospace;font-size:11px;color:#7f948a;max-width:120ch}</style>
<h1>The tip primitive — the anther unchanged, the trifid moved (session 26)</h1>
<p class="note"><b>The question this sheet is for:</b> ruling Q2 took <i>Rodrigues, and no guard</i> because a slider that jumps is a defect a user meets and a predeclared partition is an accounting entry. That argument holds only if the trifid's move is invisible at the size the bloom ships. <b>The move is measured at 0.047 mm of surface</b> on the shipping 1.20 mm sheet — the sagitta of the emitted ten-sided polygon rotated on its own axis, <i>r</i>(1&nbsp;&minus;&nbsp;cos&nbsp;18&deg;) — against a <b>1.855 mm</b> maximum vertex displacement, which is the same solid moving its vertices around it. Every cell says its own mm per pixel, and every pair carries a measured pixel difference; the ruling is Eva's, the numbers are not.</p>
<p class="note">LEFT (amber border): the base tree at <b>2fee2c2</b>, where the anther and each stigma lobe are <code>pillInto</code> about an arbitrary perpendicular. RIGHT: this tree, where both are <code>tipInto</code> — one owner, the one-exponent outline law fixed at today's circle, and the tip frame the minimal rotation of the rod's own frame onto the tip's axis. Each pair shares one camera sized from the BEFORE cell. <b>Asserted from the two trees' numbers:</b> identical triangle counts on every pair, identical STAMENS and STYLE read-out lines, the anther and control pairs pixel-identical, the trifid pairs not.</p>
${pairs.map((p) => `<h2>${esc(p.row.name)}</h2>
<p class="ro">${esc(p.after.styleLine || p.after.stamenLine || 'no centre on this row')}</p>
${p.row.views.map((v) => `<h3>${VIEWNAME[v]}</h3><main>${fig(p.before, v, p.dev ? p.dev.surfaceMax : null)}${fig(p.after, v, p.dev ? p.dev.surfaceMax : null)}</main><p class="diff">${diffLine(p.diffs[v], p.twice && p.twice[v])}</p>`).join('')}`).join('')}`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
await browser.close(); server.close(); base.server.close();
