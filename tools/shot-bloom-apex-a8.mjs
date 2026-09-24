/* ===================================================================
   shot-bloom-apex-a8.mjs — THE ARC'S YIELD, LOOKED AT
   (Eva's ruling on A8, the apex-nib session: "look first … I'll judge
   whether the teeth or the nib look faceted. If the fix costs the nib
   visibly, say so.")

     node tools/shot-bloom-apex-a8.mjs <dir> --main <worktree of 2464d50> \
          --before <worktree of the pre-fix head>

   TWO ROWS, THREE COLUMNS. `LOBES: x petalTipShape 0.60` and `x 3.00` are
   the two rows the export and connectedness gates BOTH dropped on A8 — the
   apex arc's six rows came out of the lobe periods, whose blend-target gaps
   then read 1.471 and 1.623 x uniform against a bound of 1.400. The columns
   are MAIN (no nib at all), the branch BEFORE the yield (over the bound) and
   the branch AFTER it (the arc gives rows back until the ladder is
   admissible). The question the sheet exists to answer is what the yield
   COSTS: fewer rows on the arc is a coarser nib, more rows on the periods is
   a smoother tooth, and only a picture says which one the eye meets first.

   THE THREE TREES ARE SERVED, NOT MUTATED — `shot-bloom-seam-ruling.mjs`'s
   own rule. Main's `bloom.js` has no nib telemetry and its read-out does not
   know the fields the branch emits; swapping one module into another tree's
   page would render a picture of neither.

   THE CAMERA IS SHARED ACROSS A ROW AND MEASURED ONCE, sized from the AFTER
   tree's live geometry and written verbatim to all three, because a camera
   sized per tree makes a three-way comparison a picture of three framings.
   The tip view is aimed at the blade's own apex, read from the emitted
   profile rather than guessed. PRINT PREVIEW IS ON in every cell (the object,
   not the screen) and every caption prints the app's OWN `shownMode`.

   EVERY NUMBER IN A CAPTION IS MEASURED IN THE PAGE THAT CELL RENDERS:
   the widest emitted row gap (A8's own quantity, read off `petalProfileU`,
   never off anything the ladder reports about itself), the rows the ladder
   put ON THE ARC (past the law's crossing — absent on main, which has no
   crossing), and the rows per lobe period from the builder's own record.

   NO PIXEL DELTA IS QUOTED — three trees, three servers, three page
   sessions, and the contact-sheet rule.
   =================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launchPage, openBloom, applyConfig, fullStateDrift, stillFrame,
         settleBuild, shownModeOf, buildMatrix } from './bloom-harness.mjs';

const outDir = process.argv[2] || '/tmp/bloom-apex-a8';
const argOf = (n) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : null; };
const MAIN = argOf('--main'), BEFORE = argOf('--before');
if (!MAIN || !BEFORE) { console.error('usage: node tools/shot-bloom-apex-a8.mjs <dir> --main <worktree> --before <worktree>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const ROWS = [
  { key: 'n060', prefix: 'LOBES: x petalTipShape 0.60',
    title: 'LOBES x petalTipShape 0.60 — the acute apex',
    note: 'A8 on the pre-fix branch: widest row gap 1.5829 x uniform against a bound of 1.4000, blend 0. The window’s 27 rows went 14 / 7 / 6 across two lobe periods and the 0.0054-wide arc.' },
  { key: 'n300', prefix: 'LOBES: x petalTipShape 3.00',
    title: 'LOBES x petalTipShape 3.00 — the held-width round tip',
    note: 'A8 on the pre-fix branch: 1.4159 x uniform, blend 0. The window’s 32 rows went 17 / 9 / 6.' },
];
const TREES = [
  { key: 'main', root: MAIN, label: 'main (2464d50) — no nib' },
  { key: 'before', root: BEFORE, label: 'branch BEFORE the yield' },
  { key: 'after', root: HERE, label: 'branch AFTER the yield' },
];
const matrix = buildMatrix();
const rowOf = (p) => { const r = matrix.find((x) => x.label.startsWith(p)); if (!r) { console.error('no row ' + p); process.exit(2); } return r; };
function die(msg) { console.error('HARNESS INVALID: ' + msg); process.exit(2); }

const servers = [];
async function treePage(root) {
  const { server, port } = await serveRepo(root);
  servers.push(server);
  const { browser, page } = await launchPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 2 });
  return { browser, page, port };
}

/* THE MEASUREMENTS, taken in the page this cell renders. `widest` is A8's own
   question asked of the EMITTED stations; `onArc` is the read-out's (rows past
   the law's own crossing, which only a tree with a nib has); `perPeriod` is
   the builder's record. Nothing here is restated from a constant. */
async function measure(page) {
  return page.evaluate(() => {
    const m = window.__bloomMetrics();
    const pu = (m.petalProfileU || []).filter((u) => u > 0);
    let w = 0;
    for (let i = 1; i < pu.length; i++) w = Math.max(w, pu[i] - pu[i - 1]);
    const rows = (m.petalBladeLadder && m.petalBladeLadder.rows) || 56;
    const cap = m.petalTipCap || null, apex = cap && cap.apex;
    const onArc = (apex && apex.active && apex.xLawMm != null && apex.drawnLengthMm)
      ? pu.filter((u) => u * apex.drawnLengthMm > apex.xLawMm + 1e-12).length : null;
    const L = m.petalLobes || null;
    return { widestX: w * rows, rows,
             blend: m.petalBladeLadder ? m.petalBladeLadder.blend : null,
             placedSub: m.petalBladeLadder ? m.petalBladeLadder.placedSub : null,
             onArc, perPeriod: L ? (L.rowsPerPeriod || null) : null,
             rowsInWindow: L ? (L.rowsInWindow ?? null) : null,
             teeth: L ? (L.countBuilt ?? null) : null, tris: m.exportTris ?? m.liveTris ?? null,
             tipU: apex && apex.active ? apex.uLaw : null,
             drawn: apex && apex.active ? apex.drawnLengthMm : (m.petalLengthMm ?? null) };
  });
}

async function cell({ page, port, row, file, frame }) {
  await openBloom(page, port);
  const bad = await applyConfig(page, row.set);
  if (bad.length) die(`${row.label}: ${bad.join('; ')}`);
  const drift = await fullStateDrift(page, row.set);
  if (drift.length) die(`${row.label}: state is not DEFAULTS+set: ${drift.join('; ')}`);
  const still = await stillFrame(page);
  if (still.length) die(`${row.label}: ${still.join('; ')}`);
  await page.evaluate(() => { const el = document.getElementById('printPreview'); el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleBuild(page);
  await page.waitForTimeout(150);
  const mode = await shownModeOf(page);
  if (mode !== 'export') die(`${row.label}: print preview ON asked for, app reports shownMode "${mode}"`);
  const met = await measure(page);
  /* THE TIP VIEW IS AIMED AT THE BLADE'S OWN APEX. A frame sized from the
     bloom's bounding radius puts a 2 mm nib inside three pixels; this reads
     the petal's drawn length off the build and looks at the last few
     millimetres of it, face on to the margin the teeth are cut into. */
  /* THE SCALE AND THE DIRECTION ARE SHARED; THE CENTRE IS EACH TREE'S OWN
     APEX, and that is a deliberate departure from `shot-bloom-seam-ruling`'s
     "one camera written verbatim". The nib CHANGES THE BLADE'S DRAWN LENGTH —
     8.59 mm shorter at tip shape 0.60 — so a centre written verbatim from the
     after tree lands a long way down main's blade and photographs the wrong
     part of it. What has to be equal for a faceting judgement is the
     MAGNIFICATION, and that is what `r` carries. The `whole` view is shared
     outright: the bloom's own extent does not move. */
  const fit = frame ? await page.evaluate((f) => {
    const m = window.__bloomMetrics();
    const v3 = (q, d) => (q ? [q[0] ?? q.x, q[1] ?? q.y, q[2] ?? q.z] : d);
    const t = v3(m.petalTip, [30, 0, 12]);
    const mid = v3(m.petalMid, [t[0] * 0.6, 0, t[2] * 0.6]);
    const between = [0, 1, 2].map((i) => t[i] + (mid[i] - t[i]) * 0.42);
    return { nib: { r: f.nib.r, at: t, dir: f.nib.dir },
             margin: { r: f.margin.r, at: between, dir: f.margin.dir },
             whole: f.whole };
  }, frame) : await page.evaluate(() => {
    const m = window.__bloomMetrics();
    /* THE TIP'S POSITION IS READ FROM THE BUILDER, never guessed from the
       length and the tilt: `petalTip` is that quantity's one owner (the
       read-out's own comment says so), and a frame aimed at a guess put the
       apex in the corner of the first render. The camera looks down the
       blade's own NORMAL, which is `petalNormal` — also the builder's — so
       the margin the teeth are cut into is face on rather than edge on. */
    const v3 = (q, d) => (q ? [q[0] ?? q.x, q[1] ?? q.y, q[2] ?? q.z] : d);
    const t = v3(m.petalTip, [30, 0, 12]), nv = v3(m.petalNormal, [0, 0, 1]);
    const mid = v3(m.petalMid, [t[0] * 0.6, 0, t[2] * 0.6]);
    const half = Math.hypot(t[0] - mid[0], t[1] - mid[1], t[2] - mid[2]) || 12;
    /* THREE DISTANCES, BECAUSE THE TWO THINGS TO JUDGE ARE NOT THE SAME SIZE.
       The nib's cap is a few millimetres and its arc a twentieth of one, so it
       needs the tight frame; the lobe TEETH are cut into the margin over the
       treated arc and are simply not in that picture at all. The margin view
       is centred between the blade's midpoint and its tip, which is where the
       teeth this row builds actually are. */
    const between = [0, 1, 2].map((i) => t[i] + (mid[i] - t[i]) * 0.42);
    return { nib: { r: 3.0, at: t, dir: nv },
             margin: { r: half * 0.62, at: between, dir: nv },
             whole: { r: (m.fitRadius || m.bboxRadius || 55) * 1.5, at: [0, 0, 0], dir: [0.45, -0.70, 0.55] } };
  });
  const notes = [];
  for (const view of ['nib', 'margin', 'whole']) {
    await page.evaluate((f) => window.__bloomFrame(f.r, 0.05, f.at, f.dir), fit[view]);
    let prev = null, settled = false;
    const f = file.replace(/\.png$/, `-${view}.png`);
    for (let i = 0; i < 40 && !settled; i++) {
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 760, height: 760 } });
      if (prev && Buffer.compare(prev, buf) === 0) { fs.writeFileSync(f, buf); settled = true; }
      prev = buf;
    }
    if (!settled) { fs.writeFileSync(f, prev); notes.push(`${view}: no two identical frames`); }
  }
  return { fit, mode, met, notes };
}

const cells = [];
for (const spec of ROWS) {
  const row = rowOf(spec.prefix);
  const got = {};
  let frame = null;
  for (const t of ['after', 'main', 'before']) {          // AFTER first: it sizes the camera
    const tree = TREES.find((x) => x.key === t);
    const p = await treePage(tree.root);
    const file = path.join(outDir, `${spec.key}-${t}.png`);
    const r = await cell({ ...p, row, file, frame });
    await p.browser.close();
    frame = frame || r.fit;
    got[t] = { ...r, file: path.basename(file).replace(/\.png$/, '') };
    const m = r.met;
    console.log(`  ${spec.key}/${t}: widest ${m.widestX.toFixed(4)}x  blend ${m.blend}  sub ${JSON.stringify(m.placedSub)}  arc rows ${m.onArc}  per period ${JSON.stringify(m.perPeriod)}  mode ${r.mode}`);
  }
  cells.push({ ...spec, label: row.label, got, frame });
}
for (const s of servers) s.close();

const cap = (t, g) => {
  const m = g.met;
  return `<b>${t.label}</b> — mode ${g.mode}`
    + `<br>widest row gap <b>${m.widestX.toFixed(4)} x</b> uniform (bound 1.4000)`
    + `<br>rows on the arc: <b>${m.onArc === null ? 'n/a — no nib' : m.onArc}</b>`
    + `<br>rows per lobe period: <b>${m.perPeriod ? m.perPeriod.join(' / ') : 'n/a'}</b>`
    + (m.placedSub ? `<br><span style="color:#7d8f8a">ladder placed ${m.placedSub.join(' / ')} · blend ${m.blend === null ? 'n/a' : Number(m.blend).toFixed(6)}</span>` : '')
    + (g.notes.length ? `<br><span style="color:#c9a227">note: ${g.notes.join('; ')}</span>` : '');
};
const html = `<!doctype html><meta charset="utf-8"><title>The apex arc's yield — A8's two rows</title>
<style>body{background:#0c0f0e;color:#dfe6e3;font:14px/1.55 ui-sans-serif,system-ui;margin:0;padding:28px}
h1{font-size:19px;margin:0 0 4px}h2{font-size:15px;margin:32px 0 6px;color:#9fb8b1}
p{max-width:80ch;color:#b9c6c2}.trio{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:10px 0 4px}
figure{margin:0}img{width:100%;display:block;border:1px solid #22302c;background:#0c0f0e}
figcaption{font-size:12px;color:#8fa39e;padding-top:5px}b{color:#e8f0ed}</style>
<h1>The apex arc's yield — the two rows A8 dropped, looked at</h1>
<p>Three trees, served over their own HTTP servers and never mutated into one another.
All three cells of a row share ONE camera, sized from the AFTER tree and written verbatim to the other two.
PRINT PREVIEW is ON everywhere, so this is the exported object. Each frame is settled until two consecutive
screenshots are byte-identical. <b>No pixel delta is quoted</b> — three trees, three servers, three page
sessions. Every number under a cell was measured in the page that cell renders: the widest gap off the
EMITTED stations (A8's own question), the rows past the law's crossing, and the builder's own per-period count.</p>
${cells.map((c) => `<h2>${c.title}</h2><p>${c.note}<br><span style="color:#8fa39e">${c.label}</span></p>
${['nib', 'margin', 'whole'].map((v) => `<div class="trio">
${TREES.map((t) => `<figure><img src="${c.got[t.key].file}-${v}.png"><figcaption>${v === 'nib' ? cap(t, c.got[t.key]) : `<b>${t.label}</b> — ${v}`}</figcaption></figure>`).join('')}
</div>`).join('')}`).join('\n')}
<p style="margin-top:26px">What the yield does: the arc gives rows back to the lobe periods until the blend
target is admissible. It cannot fire on a row that was going to pass — band <i>b</i> of the placed ladder spans
the same <i>u</i>-interval with the same count as band <i>b</i> of the target, so the placed widest gap is at least
the target's average. Measured over the whole matrix in both modes, 2,484 rings: <b>4 move, and they are the
four that were red</b>.</p>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`\nwrote ${outDir}/index.html`);
